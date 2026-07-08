import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBookingPassengersDto } from './dto/update-booking-passengers.dto';
import type { PassengerReminderChannel, PassengerReminderEntry } from './types';
import { MailService } from '../mail/mail.service';
import { BookingCancellationService } from './booking-cancellation.service';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';
import { SettingsService } from '../settings/settings.service';
import {
  asPassengerInputs,
  countIncompletePassengers,
  isPassengerComplete,
  normalizePassengerType,
  validatePassengerAgeVsType,
  formatVnDate,
} from './helpers/booking-helpers';

@Injectable()
export class BookingPassengerService {
  private readonly logger = new Logger(BookingPassengerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly cancellationService: BookingCancellationService,
    private readonly adminNotifications: AdminNotificationService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Khách tự bổ sung/cập nhật thông tin hành khách cho booking của mình
   * (luồng "bổ sung sau"). Không đổi giá/ghế/thành phần đoàn.
   */
  async updateMyBookingPassengers(
    bookingId: number,
    userId: number,
    dto: UpdateBookingPassengersDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId, deletedAt: null },
      select: {
        id: true,
        status: true,
        passengers: true,
        departureId: true,
        tour: { select: { startDate: true } },
      },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt tour');
    return this.applyPassengerUpdate(booking, dto);
  }

  /**
   * Nhân viên/Admin điền hộ thông tin hành khách cho một đơn (không cần là chủ đơn).
   */
  async updateBookingPassengersByStaff(
    bookingId: number,
    dto: UpdateBookingPassengersDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: {
        id: true,
        status: true,
        passengers: true,
        departureId: true,
        tour: { select: { startDate: true } },
      },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt tour');
    return this.applyPassengerUpdate(booking, dto);
  }

  private async applyPassengerUpdate(
    booking: {
      id: number;
      status: string;
      passengers: Prisma.JsonValue;
      departureId: number | null;
      tour: { startDate: Date };
    },
    dto: UpdateBookingPassengersDto,
  ) {
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException(
        'Đơn đã huỷ, không thể cập nhật thông tin hành khách',
      );
    }

    const departureDate =
      await this.cancellationService.resolveBookingDepartureDate({
        departureId: booking.departureId,
        tour: booking.tour,
      });
    if (departureDate.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Tour đã khởi hành, không thể cập nhật thông tin hành khách',
      );
    }

    const existing = asPassengerInputs(booking.passengers);
    const incoming = asPassengerInputs(dto.passengers);
    if (!existing?.length || !incoming?.length) {
      throw new BadRequestException(
        'Đơn này không có danh sách hành khách để cập nhật',
      );
    }
    // Khoá thành phần đoàn: số lượng & loại từng vị trí phải khớp đơn gốc
    // (chống forge để hạ giá / chiếm ghế).
    if (incoming.length !== existing.length) {
      throw new BadRequestException('Không được thay đổi số lượng hành khách');
    }
    for (let i = 0; i < existing.length; i++) {
      if (
        normalizePassengerType(incoming[i].type) !==
        normalizePassengerType(existing[i].type)
      ) {
        throw new BadRequestException('Không được thay đổi loại hành khách');
      }
    }

    // Người đại diện (vị trí 0) luôn bắt buộc đủ thông tin.
    if (!isPassengerComplete(incoming[0])) {
      throw new BadRequestException('Người đại diện phải có đủ thông tin');
    }

    // Validate tuổi vs loại cho slot đã điền (slot rỗng tự được bỏ qua).
    for (const p of incoming) {
      const dob = typeof p['dob'] === 'string' ? p['dob'] : null;
      validatePassengerAgeVsType(p.type ?? 'Adult (12+)', dob, departureDate);
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { passengers: dto.passengers ?? Prisma.JsonNull },
    });

    return {
      passengers: dto.passengers,
      incompletePassengerCount: countIncompletePassengers(dto.passengers),
    };
  }

  /**
   * [PHASE 3] Quét đơn đã thanh toán, sắp khởi hành mà còn thiếu thông tin hành khách
   * → gửi 1 email nhắc bổ sung. Chống spam bằng passengerReminderSentAt (gửi 1 lần).
   */
  async sendPassengerInfoReminders(): Promise<{
    batchSize: number;
    sentCount: number;
    notifiedCount: number;
  }> {
    const { passengerInfoDeadlineDays } =
      await this.settingsService.getBookingPolicy();
    const leadDays = 2;
    const now = new Date();
    const windowEnd = new Date(
      now.getTime() + (passengerInfoDeadlineDays + leadDays) * 24 * 60 * 60 * 1000,
    );

    // Chỉ xét các chuyến sắp khởi hành trong cửa sổ → giới hạn phạm vi quét.
    const upcomingDepartures = await this.prisma.tourDeparture.findMany({
      where: { departureDate: { gte: now, lte: windowEnd } },
      select: { id: true, departureDate: true },
    });
    if (upcomingDepartures.length === 0) {
      return { batchSize: 0, sentCount: 0, notifiedCount: 0 };
    }

    const departureDateById = new Map(
      upcomingDepartures.map((d) => [d.id, d.departureDate]),
    );

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        deletedAt: null,
        departureId: { in: upcomingDepartures.map((d) => d.id) },
      },
      select: {
        id: true, bookingCode: true, departureId: true,
        passengers: true, contactInfo: true,
        passengerReminderSentAt: true, passengerInfoNotifiedAt: true, passengerReminders: true,
        user: { select: { email: true, fullName: true } },
        tour: { select: { name: true } },
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    let sentCount = 0;
    let notifiedCount = 0;
    for (const booking of bookings) {
      const incompleteCount = countIncompletePassengers(booking.passengers);
      if (incompleteCount === 0) continue;

      const departureDate = booking.departureId
        ? departureDateById.get(booking.departureId)
        : undefined;
      if (!departureDate) continue;
      const deadline = new Date(departureDate);
      deadline.setDate(deadline.getDate() - passengerInfoDeadlineDays);

      // 1) Thông báo cho staff (1 lần) → đẩy vào worklist, không lệ thuộc email tới khách.
      if (!booking.passengerInfoNotifiedAt) {
        await this.adminNotifications.createSafe({
          type: 'passenger_info_missing',
          resourceType: 'Booking',
          resourceId: booking.id,
          title: 'Đơn sắp khởi hành còn thiếu thông tin hành khách',
          body: `Đơn ${booking.bookingCode} còn ${incompleteCount} hành khách chưa có thông tin — cần đôn đốc/điền hộ trước ${formatVnDate(deadline)}.`,
          href: '/admin/bookings',
          severity: 'warning',
          targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
          metadata: { bookingCode: booking.bookingCode, incompleteCount },
        });
        await this.prisma.booking
          .update({ where: { id: booking.id }, data: { passengerInfoNotifiedAt: now } })
          .catch(() => {});
        notifiedCount += 1;
      }

      // 2) Email nhắc khách (1 lần) — lưới an toàn nền.
      if (!booking.passengerReminderSentAt) {
        try {
          const contact = booking.contactInfo as
            | { email?: string; fullName?: string }
            | null;
          const email = contact?.email?.trim() || booking.user.email;
          if (!email) continue;
          await this.mailService.sendPassengerInfoReminder({
            to: email,
            customerName: contact?.fullName?.trim() || booking.user.fullName || 'Quy khach',
            bookingCode: booking.bookingCode,
            tourName: booking.tour.name,
            startDate: formatVnDate(departureDate),
            incompleteCount,
            deadlineText: formatVnDate(deadline),
            bookingUrl: `${frontendUrl}/vi/my-bookings/${booking.id}#passenger-details`,
          });
          const sentNow = new Date();
          const existing: PassengerReminderEntry[] = Array.isArray(booking.passengerReminders)
            ? (booking.passengerReminders as unknown as PassengerReminderEntry[])
            : [];
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              passengerReminderSentAt: sentNow,
              passengerReminderChannel: 'EMAIL',
              passengerReminders: [
                ...existing,
                { channel: 'EMAIL', at: sentNow.toISOString(), byId: null, source: 'AUTO' },
              ] as unknown as Prisma.InputJsonValue,
            },
          });
          sentCount += 1;
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `[CRON] Failed passenger reminder bookingId=${booking.id}: ${msg}`,
          );
        }
      }
    }

    return { batchSize: bookings.length, sentCount, notifiedCount };
  }

  /**
   * [PHASE 3] Nhân viên chủ động nhắc bổ sung thông tin HK theo kênh chọn.
   * EMAIL → gửi email rồi ghi log; ZALO/CALL → chỉ ghi log (staff thao tác ngoài hệ thống).
   */
  async sendPassengerReminderByStaff(
    bookingId: number,
    staffId: number,
    channel: PassengerReminderChannel,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: {
        id: true, bookingCode: true, status: true, departureId: true,
        passengers: true, passengerReminders: true, contactInfo: true,
        user: { select: { email: true, fullName: true } },
        tour: { select: { name: true, startDate: true } },
      },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt tour');
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Đơn đã huỷ, không thể nhắc');
    }

    const incompleteCount = countIncompletePassengers(booking.passengers);
    if (incompleteCount === 0) {
      throw new BadRequestException('Đơn đã đủ thông tin hành khách, không cần nhắc');
    }

    if (channel === 'EMAIL') {
      const contact = booking.contactInfo as
        | { email?: string; fullName?: string }
        | null;
      const email = contact?.email?.trim() || booking.user.email;
      if (!email) {
        throw new BadRequestException('Đơn không có email để gửi nhắc');
      }
      const { passengerInfoDeadlineDays } =
        await this.settingsService.getBookingPolicy();
      const departureDate =
        await this.cancellationService.resolveBookingDepartureDate({
          departureId: booking.departureId,
          tour: booking.tour,
        });
      const deadline = new Date(departureDate);
      deadline.setDate(deadline.getDate() - passengerInfoDeadlineDays);
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
      await this.mailService.sendPassengerInfoReminder({
        to: email,
        customerName: contact?.fullName?.trim() || booking.user.fullName || 'Quy khach',
        bookingCode: booking.bookingCode,
        tourName: booking.tour.name,
        startDate: formatVnDate(departureDate),
        incompleteCount,
        deadlineText: formatVnDate(deadline),
        bookingUrl: `${frontendUrl}/vi/my-bookings/${booking.id}#passenger-details`,
      });
    }

    const now = new Date();
    const existing: PassengerReminderEntry[] = Array.isArray(booking.passengerReminders)
      ? (booking.passengerReminders as unknown as PassengerReminderEntry[])
      : [];
    const reminders: PassengerReminderEntry[] = [
      ...existing,
      { channel, at: now.toISOString(), byId: staffId, source: 'MANUAL' },
    ];

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        passengerReminders: reminders as unknown as Prisma.InputJsonValue,
        passengerReminderSentAt: now,
        passengerReminderChannel: channel,
      },
    });

    return {
      passengerReminders: reminders,
      passengerReminderSentAt: now.toISOString(),
      passengerReminderChannel: channel,
    };
  }
}

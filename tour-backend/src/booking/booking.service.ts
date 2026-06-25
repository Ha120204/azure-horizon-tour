import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type TourDeparture } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingPassengersDto } from './dto/update-booking-passengers.dto';
import type { PassengerReminderChannel } from './types';
import { PaymentService } from '../payment/payment.service';
import { VoucherService } from '../voucher/voucher.service';
import { MailService } from '../mail/mail.service';
import { HttpService } from '@nestjs/axios';
import type { Response } from 'express';
import { CreateAssistedBookingDraftDto } from './dto/create-assisted-booking-draft.dto';
import { AssistedDraftService } from './assisted-draft.service';
import { BookingCancellationService } from './booking-cancellation.service';
import { BookingQueryService } from './booking-query.service';
import { BookingStatsService } from './booking-stats.service';
import { BookingPassengerService } from './booking-passenger.service';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';
import { SettingsService } from '../settings/settings.service';
import {
  asPassengerInputs,
  assertVoucherAllowedForDeparture,
  calculateBookingHoldExpiresAt,
  calcSeatCount,
  generateBookingCode,
  getErrorMessage,
  getPassengerTotal,
  IN_STORE_MAX_HOLD_HOURS,
  isPayosDuplicateError,
  normalizePassengers,
  PAYOS_HOLD_MINUTES,
  reserveSeatsAtomically,
  SeatsUnavailableException,
  validatePassengerAgeVsType,
} from './helpers/booking-helpers';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly voucherService: VoucherService,
    private readonly mailService: MailService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly assistedDraftService: AssistedDraftService,
    private readonly cancellationService: BookingCancellationService,
    private readonly queryService: BookingQueryService,
    private readonly adminNotifications: AdminNotificationService,
    private readonly settingsService: SettingsService,
    private readonly statsService: BookingStatsService,
    private readonly passengerService: BookingPassengerService,
  ) {}

  // Báo Next.js xóa cache trang tour ngay khi số ghế thay đổi (giữ chỗ / hoàn chỗ),
  // để trang public hiển thị đúng số chỗ còn lại thay vì số cũ bị cache (ISR 1 giờ).
  // Cùng cơ chế với TourQueryService.revalidateTourCache.
  private revalidateTourCache(tourId: number): void {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const secret = this.configService.get<string>('REVALIDATION_SECRET');
    if (!frontendUrl || !secret) return;

    void fetch(`${frontendUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tag: `tour-${tourId}` }),
    }).catch((err: unknown) => {
      this.logger.warn(`[Revalidate] tour-${tourId} failed: ${getErrorMessage(err)}`);
    });
  }

  async createAssistedDraft(
    actorUserId: number,
    dto: CreateAssistedBookingDraftDto,
  ) {
    return this.assistedDraftService.createAssistedDraft(actorUserId, dto);
  }

  async updateAssistedDraft(
    id: number,
    actorUserId: number,
    actorRole: string,
    dto: CreateAssistedBookingDraftDto,
  ) {
    return this.assistedDraftService.updateAssistedDraft(
      id,
      actorUserId,
      actorRole,
      dto,
    );
  }

  async getAssistedDrafts(
    actorUserId: number,
    actorRole: string,
    status?: string,
    search?: string,
  ) {
    return this.assistedDraftService.getAssistedDrafts(
      actorUserId,
      actorRole,
      status,
      search,
    );
  }

  async deleteAssistedDraft(
    id: number,
    actorUserId: number,
    actorRole: string,
  ) {
    return this.assistedDraftService.deleteAssistedDraft(
      id,
      actorUserId,
      actorRole,
    );
  }

  async submitAssistedDraft(
    id: number,
    actorUserId: number,
    actorRole: string,
  ) {
    return this.assistedDraftService.submitAssistedDraft(
      id,
      actorUserId,
      actorRole,
    );
  }

  async requestRevisionAssistedDraft(
    id: number,
    adminId: number,
    reason: string,
  ) {
    return this.assistedDraftService.requestRevisionAssistedDraft(
      id,
      adminId,
      reason,
    );
  }

  async rejectAssistedDraft(id: number, adminId: number, reason: string) {
    return this.assistedDraftService.rejectAssistedDraft(id, adminId, reason);
  }

  async approveAssistedDraft(id: number, adminId: number, note?: string) {
    return this.assistedDraftService.approveAssistedDraft(id, adminId, note);
  }

  async resendPaymentRequest(
    bookingId: number,
    actorUserId: number,
    forceEmail = false,
  ) {
    return this.assistedDraftService.resendPaymentRequest(
      bookingId,
      actorUserId,
      forceEmail,
    );
  }

  private async markVoucherAsUsed(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    userId: number,
    voucherCode?: string | null,
  ) {
    return this.assistedDraftService.markVoucherAsUsed(tx, userId, voucherCode);
  }

  async create(userId: number | null, dto: CreateBookingDto, ip: string) {
    void ip;
    const finalUserId = Number(userId);
    if (!Number.isInteger(finalUserId) || finalUserId <= 0) {
      throw new UnauthorizedException('Bạn cần đăng nhập để đặt tour');
    }

    // Chính sách đặt tour (số khách & thời gian giữ chỗ) lấy từ Cài đặt hệ thống.
    // Đọc ngoài transaction để không giữ kết nối lâu hơn cần thiết.
    const policy = await this.settingsService.getBookingPolicy();
    if (dto.numberOfPeople < policy.minPeople) {
      throw new BadRequestException(
        `Số khách tối thiểu cho một lượt đặt là ${policy.minPeople}`,
      );
    }
    if (dto.numberOfPeople > policy.maxPeople) {
      throw new BadRequestException(
        `Số khách tối đa cho một lượt đặt là ${policy.maxPeople}`,
      );
    }

    // ============== INTERACTIVE TRANSACTION ==============
    // Wrap everything in a transaction to guarantee atomicity:
    // If ANY step inside fails -> rollback EVERYTHING, no seats are lost.
    const booking = await this.prisma.$transaction(async (tx) => {
      const tour = await tx.tour.findUnique({
        where: { id: dto.tourId, deletedAt: null },
      });

      if (!tour) {
        throw new NotFoundException('Tour not found');
      }

      let selectedDeparture: TourDeparture | null = null;

      // seatCount = số ghế thực cần giữ (adult + child, KHÔNG tính infant).
      // Infant ngồi lòng người lớn nên không chiếm ghế tồn kho.
      // Fallback về numberOfPeople nếu client cũ không gửi seatCount.
      const seatCount = dto.seatCount ?? dto.numberOfPeople;

      if (dto.departureId) {
        selectedDeparture = await tx.tourDeparture.findUnique({
          where: { id: dto.departureId },
        });
        if (
          !selectedDeparture ||
          selectedDeparture.tourId !== tour.id ||
          !selectedDeparture.isActive
        ) {
          throw new BadRequestException('Invalid departure');
        }
        if (selectedDeparture.availableSeats < seatCount) {
          throw new SeatsUnavailableException(
            'Not enough seats for this departure',
            selectedDeparture.availableSeats,
          );
        }
      } else {
        if (tour.availableSeats < seatCount) {
          throw new SeatsUnavailableException(
            'Not enough seats available',
            tour.availableSeats,
          );
        }
      }

      // Kiểm tra ngày khởi hành: dùng departure date nếu có, fallback về tour.startDate.
      const effectiveStartDate = selectedDeparture?.departureDate ?? tour.startDate;
      if (effectiveStartDate < new Date()) {
        throw new BadRequestException('Tour has already started and cannot be booked');
      }

      // Package là bắt buộc — giá package là giá toàn phần (mô hình Klook/Viator).
      // packageId luôn phải có; DTO đã enforce ở tầng validation.
      const selectedPackage = await tx.tourPackage.findUnique({
        where: { id: dto.packageId },
      });
      if (
        !selectedPackage ||
        selectedPackage.tourId !== tour.id ||
        !selectedPackage.isActive
      ) {
        throw new BadRequestException('Gói dịch vụ không hợp lệ hoặc đã ngừng cung cấp');
      }
      // basePrice = giá toàn phần của gói (không cộng thêm departure.price).
      // departure.price vẫn được dùng để fallback cho các flow cũ nếu cần,
      // nhưng với mô hình package-first, package.price là giá cuối cùng.
      const basePrice = selectedPackage.price;

      let totalPrice = getPassengerTotal(
        basePrice,
        dto.numberOfPeople,
        asPassengerInputs(dto.passengers),
      );

      let discountAmount = 0;
      let voucherCode: string | null = null;

      if (dto.voucherCode) {
        assertVoucherAllowedForDeparture(
          selectedDeparture,
          dto.voucherCode,
          tour.price,
        );
        const voucherResult = await this.voucherService.validateVoucher(
          dto.voucherCode,
          totalPrice,
          {
            userId: finalUserId,
            tourId: tour.id,
            departureId: selectedDeparture?.id ?? null,
          },
        );
        discountAmount = voucherResult.discountAmount;
        totalPrice = voucherResult.finalPrice;
        voucherCode = dto.voucherCode.trim().toUpperCase();
        // Atomic claim ngay trong transaction — ngăn 2 request đồng thời dùng cùng voucher
        await this.voucherService.claimVoucherInTx(tx, voucherCode, finalUserId);
      }

      // ── Validate DOB vs passenger type (security: chống payload forge) ──────
      // Lấy ngày khởi hành để tính tuổi đúng tại thời điểm đi tour.
      // Nếu không có departure cụ thể, dùng tour.startDate.
      const departureDate = selectedDeparture?.departureDate ?? tour.startDate;

      const passengersToValidate = normalizePassengers(
        dto.passengers,
        dto.numberOfPeople,
      );
      for (const p of passengersToValidate) {
        const dobValue = typeof p['dob'] === 'string' ? p['dob'] : null;
        validatePassengerAgeVsType(
          p.type ?? 'ADULT',
          dobValue,
          departureDate,
        );
      }
      // ─────────────────────────────────────────────────────────────────────────

      await reserveSeatsAtomically(tx, {
        tourId: tour.id,
        departureId: dto.departureId,
        seats: seatCount,
      });

      const newBookingCode = generateBookingCode();
      const paymentMethod =
        dto.paymentMethod === 'IN_STORE' ? 'IN_STORE' : 'PAYOS';
      // departureDate đã được khai báo ở trên (dùng chung cho validation + holdExpiresAt)
      const holdExpiresAt = calculateBookingHoldExpiresAt({
        paymentMethod,
        departureDate,
        holdMinutes: policy.holdMinutes,
      });
      const newBooking = await tx.booking.create({
        data: {
          bookingCode: newBookingCode,
          userId: finalUserId,
          tourId: dto.tourId,
          numberOfPeople: dto.numberOfPeople,
          totalPrice,
          unitPriceAtBooking: basePrice,
          voucherCode,
          discountAmount,
          departureId: dto.departureId,
          packageId: dto.packageId,
          contactInfo: dto.contactInfo ?? Prisma.JsonNull,
          passengers: dto.passengers ?? Prisma.JsonNull,
          staffAssistRequested: dto.staffAssistRequested ?? false,
          paymentMethod,
          holdExpiresAt,
        },
      });

      return newBooking;
    });

    // Ghế vừa bị giữ trong transaction — bust cache trang tour để khách khác
    // thấy ngay số chỗ còn lại đã giảm (giảm cả xác suất gặp race "hết chỗ").
    this.revalidateTourCache(booking.tourId);

    if (booking.paymentMethod === 'IN_STORE') {
      await this.prisma.paymentTransaction.create({
        data: {
          bookingId: booking.id,
          gateway: 'MANUAL',
          amount: Math.round(booking.totalPrice),
          status: 'PENDING',
        },
      });

      await this.notifyBookingCreated(booking.id, booking.bookingCode, dto);

      return {
        message: 'Booking successful, please pay at the store',
        booking,
        paymentUrl: null,
      };
    }

    // ============== PAYOS INTEGRATION ==============
    const amountVND = Math.round(booking.totalPrice);

    const description = `AH ${booking.bookingCode}`;

    // orderCode = bookingId + 6 chữ số hậu tố thời gian → duy nhất mỗi lần tạo link PayOS,
    // đồng thời nhúng bookingId để return/webhook giải mã ngược (chia 1000000). Xem buildPayosOrderCode().
    const timeSuffix = (Date.now() % 1000000).toString().padStart(6, '0');
    const orderCode = Number(booking.id.toString() + timeSuffix);

    let checkoutUrl: string;
    try {
      checkoutUrl = await this.paymentService.createPaymentLink(
        orderCode,
        amountVND,
        description,
      );
    } catch (payosError: unknown) {
      if (isPayosDuplicateError(payosError)) {
        this.logger.warn(
          '[BOOKING] PayOS order already exists, reusing checkout URL.',
        );
        const existing = await this.paymentService.getPaymentInfo(orderCode);
        if (!existing?.id) {
          // Không lấy được link cũ → hủy ngay booking và hoàn ghế thay vì
          // để khách giữ chỗ "treo" cho tới khi cron dọn sau 15 phút.
          await this.rollbackUnpaidBooking(booking);
          throw new BadRequestException(
            'Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.',
          );
        }
        checkoutUrl = `https://pay.payos.vn/web/${existing.id}`;
      } else {
        // PayOS lỗi khi tạo link → booking đã giữ ghế/voucher trong transaction
        // ở trên. Hoàn trả ngay để không khóa ghế của khách khác.
        this.logger.error(
          `[BOOKING] PayOS createPaymentLink failed for ${booking.bookingCode}: ${getErrorMessage(payosError)}`,
        );
        await this.rollbackUnpaidBooking(booking);
        throw new BadRequestException(
          'Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.',
        );
      }
    }

    await this.prisma.paymentTransaction.create({
      data: {
        bookingId: booking.id,
        gateway: 'PAYOS',
        transactionRef: String(orderCode),
        amount: amountVND,
        status: 'PENDING',
      },
    });

    await this.notifyBookingCreated(booking.id, booking.bookingCode, dto);

    return {
      message: 'Booking successful, please proceed to payment',
      booking,
      paymentUrl: checkoutUrl,
    };
  }

  /**
   * Xử lý khi người dùng quay về từ trang PayOS (hoặc Webhook gọi)
   * Gọi thẳng API PayOS để xác nhận trạng thái thực tế, không tin query params
   */
  async handlePayosReturn(orderCode: number) {
    const paymentInfo = await this.paymentService.getPaymentInfo(orderCode);

    // Bỏ 6 chữ số hậu tố thời gian để khôi phục bookingId (xem buildPayosOrderCode).
    // Nhánh < 1000000: tương thích ngược với orderCode cũ chưa có hậu tố (chính là bookingId).
    const bookingId =
      orderCode >= 1000000 ? Math.floor(orderCode / 1000000) : orderCode;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'CONFIRMED' || booking.status === 'CANCELLED') {
      return paymentInfo;
    }

    if (paymentInfo.status === 'PAID') {
      const txnRef =
        paymentInfo.transactions?.[0]?.reference || `PAYOS-${orderCode}`;

      // updateMany với điều kiện status — atomic idempotency guard.
      // Nếu webhook và return URL đến đồng thời, chỉ một request thắng (count=1),
      // request kia nhận count=0 và bỏ qua toàn bộ side-effects.
      let processed = false;
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.booking.updateMany({
          where: { id: bookingId, status: { notIn: ['CONFIRMED', 'CANCELLED'] } },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            paymentGatewayTxnRef: txnRef,
          },
        });

        if (result.count === 0) return; // Đã được xử lý bởi request song song
        processed = true;

        // Voucher đã được claimed lúc tạo booking (create()).
        // Với assisted booking, claim tại thời điểm này (không đi qua create()).
        if (booking.isAssistedBooking) {
          await this.markVoucherAsUsed(tx, booking.userId, booking.voucherCode);
        }
      });

      if (!processed) return paymentInfo;

      await this.prisma.paymentTransaction.create({
        data: {
          bookingId: bookingId,
          gateway: 'PAYOS',
          transactionRef: txnRef,
          amount: paymentInfo.amount || 0,
          status: 'SUCCESS',
          rawPayload: JSON.stringify(paymentInfo),
          confirmedSource: 'PAYOS_RETURN_SYNC',
          confirmedAt: new Date(),
          confirmedNote: 'PayOS xac nhan qua return URL / webhook',
        },
      });

      await this.adminNotifications.createSafe({
        type: 'booking_confirmed',
        resourceType: 'Booking',
        resourceId: bookingId,
        title: 'Booking đã thanh toán thành công',
        body: `Booking ${booking.bookingCode} đã được PayOS xác nhận thanh toán.`,
        href: '/admin/bookings?status=CONFIRMED',
        severity: 'info',
        targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
        metadata: {
          bookingCode: booking.bookingCode,
          orderCode,
          transactionRef: txnRef,
        },
      });

      // Khách chủ động nhờ nhân viên nhập hộ → tạo việc cho staff ngay khi đã thanh toán.
      if (booking.staffAssistRequested) {
        await this.adminNotifications.createSafe({
          type: 'staff_assist_requested',
          resourceType: 'Booking',
          resourceId: bookingId,
          title: 'Khách yêu cầu nhân viên nhập hộ thông tin',
          body: `Đơn ${booking.bookingCode} cần nhân viên liên hệ khách để nhập thông tin hành khách.`,
          href: `/admin/bookings?bookingCode=${booking.bookingCode}`,
          severity: 'urgent',
          targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
          metadata: { bookingCode: booking.bookingCode },
        });
      }

      try {
        const fullBooking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
          include: { user: true, tour: true, assistedDraft: true },
        });

        const ticketEmail =
          fullBooking?.assistedDraft?.emailForTicket ||
          fullBooking?.user?.email;
        if (fullBooking && ticketEmail) {
          await this.mailService.sendBookingConfirmation({
            to: ticketEmail,
            customerName: fullBooking.user.fullName,
            bookingCode: fullBooking.bookingCode,
            tourName: fullBooking.tour.name,
            startDate: fullBooking.tour.startDate.toLocaleDateString('vi-VN'),
            duration: fullBooking.tour.duration,
            numberOfPeople: fullBooking.numberOfPeople,
            totalPrice: `${fullBooking.totalPrice.toLocaleString('vi-VN')}₫`,
            discountAmount:
              fullBooking.discountAmount > 0
                ? `${fullBooking.discountAmount.toLocaleString('vi-VN')}₫`
                : undefined,
          });
        }
      } catch (emailError) {
        this.logger.error(
          '[EMAIL] Failed to send confirmation email:',
          getErrorMessage(emailError),
        );
      }
    } else if (
      paymentInfo.status === 'CANCELLED' ||
      paymentInfo.status === 'EXPIRED'
    ) {
      await this.cancelAndRestoreSeats(
        booking.id,
        booking.tourId,
        calcSeatCount(booking.passengers, booking.numberOfPeople),
        booking.departureId,
        booking.voucherCode,
        booking.userId,
      );

      await this.prisma.paymentTransaction.create({
        data: {
          bookingId: bookingId,
          gateway: 'PAYOS',
          amount: paymentInfo.amount || 0,
          status: 'FAILED',
          rawPayload: JSON.stringify(paymentInfo),
        },
      });
    }

    return paymentInfo;
  }

  /**
   * Tìm booking theo ID (orderCode của PayOS)
   */
  async findByOrderCode(orderCode: number) {
    // Bỏ 6 chữ số hậu tố thời gian để khôi phục bookingId (xem buildPayosOrderCode).
    // Nhánh < 1000000: tương thích ngược với orderCode cũ chưa có hậu tố.
    const bookingId =
      orderCode >= 1000000 ? Math.floor(orderCode / 1000000) : orderCode;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async updateMyBookingPassengers(
    bookingId: number,
    userId: number,
    dto: UpdateBookingPassengersDto,
  ) {
    return this.passengerService.updateMyBookingPassengers(
      bookingId,
      userId,
      dto,
    );
  }

  async updateBookingPassengersByStaff(
    bookingId: number,
    dto: UpdateBookingPassengersDto,
  ) {
    return this.passengerService.updateBookingPassengersByStaff(bookingId, dto);
  }

  /**
   * Cancel a specific booking and restore seats to the tour.
   * Shared by: PayOS cancel, Webhook cancel, and Cron job auto-cancel.
   */
  private async cancelAndRestoreSeats(
    bookingId: number,
    tourId: number,
    numberOfPeople: number,
    departureId?: number | null,
    voucherCode?: string | null,
    userId?: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // updateMany với điều kiện status — ngăn double-cancel khi cron + webhook đến cùng lúc
      const result = await tx.booking.updateMany({
        where: { id: bookingId, status: { notIn: ['CONFIRMED', 'CANCELLED'] } },
        data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
      });
      if (result.count === 0) return; // Đã xử lý rồi, bỏ qua để tránh double-restore

      // Tour có chuyến: chỉ hoàn ghế cho chuyến, không cộng vào tour tổng
      // (đối xứng với reserveSeatsAtomically / releaseSeats).
      if (departureId) {
        await tx.tourDeparture.updateMany({
          where: { id: departureId },
          data: { availableSeats: { increment: numberOfPeople } },
        });
      } else {
        await tx.tour.update({
          where: { id: tourId },
          data: { availableSeats: { increment: numberOfPeople } },
        });
      }
      if (voucherCode && userId) {
        await this.voucherService.releaseVoucherInTx(tx, voucherCode, userId);
      }
    });

    // Ghế vừa được hoàn — bust cache để trang tour hiển thị lại đúng số chỗ trống.
    this.revalidateTourCache(tourId);
  }

  /**
   * Hoàn trả một booking PENDING vừa tạo khi không lấy được link thanh toán PayOS.
   * Lỗi rollback (hiếm) không được ném tiếp — cron sẽ dọn ở lần quét sau.
   */
  private async rollbackUnpaidBooking(booking: {
    id: number;
    tourId: number;
    passengers: Prisma.JsonValue;
    numberOfPeople: number;
    departureId: number | null;
    voucherCode: string | null;
    userId: number;
  }) {
    try {
      await this.cancelAndRestoreSeats(
        booking.id,
        booking.tourId,
        calcSeatCount(booking.passengers, booking.numberOfPeople),
        booking.departureId,
        booking.voucherCode,
        booking.userId,
      );
    } catch (rollbackError) {
      this.logger.error(
        `[BOOKING] Rollback ghế thất bại cho booking ${booking.id}: ${getErrorMessage(rollbackError)}`,
      );
    }
  }

  private async notifyBookingCreated(
    bookingId: number,
    bookingCode: string,
    dto: CreateBookingDto,
  ) {
    const contactInfo = dto.contactInfo as
      | { fullName?: string; email?: string }
      | undefined;
    const customerName =
      contactInfo?.fullName?.trim() ||
      contactInfo?.email?.trim() ||
      'Khách hàng';

    await this.adminNotifications.createSafe({
      type: 'booking_pending',
      resourceType: 'Booking',
      resourceId: bookingId,
      title: 'Đơn đặt tour mới cần xử lý',
      body: `${customerName} vừa tạo booking ${bookingCode}.`,
      href: '/admin/bookings?status=PENDING',
      severity: 'urgent',
      targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      metadata: {
        bookingCode,
        tourId: dto.tourId,
        departureId: dto.departureId ?? null,
        paymentMethod: dto.paymentMethod ?? 'PAYOS',
      },
    });
  }

  /**
   * CRON JOB: Quét đơn hàng PENDING quá 15 phút và tự động hủy + hoàn trả ghế.
   * Được gọi bởi @nestjs/schedule mỗi 5 phút.
   */
  async cancelExpiredBookings(): Promise<{
    batchSize: number;
    processedCount: number;
  }> {
    const now = new Date();
    const payosFallbackExpiryTime = new Date(
      now.getTime() - PAYOS_HOLD_MINUTES * 60 * 1000,
    );
    const instoreFallbackExpiryTime = new Date(
      now.getTime() - IN_STORE_MAX_HOLD_HOURS * 60 * 60 * 1000,
    );

    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        deletedAt: null,
        OR: [
          {
            holdExpiresAt: { lte: now },
          },
          {
            holdExpiresAt: null,
            paymentMethod: 'PAYOS',
            createdAt: { lt: payosFallbackExpiryTime },
          },
          {
            holdExpiresAt: null,
            paymentMethod: 'IN_STORE',
            createdAt: { lt: instoreFallbackExpiryTime },
          },
        ],
      },
    });

    if (expiredBookings.length === 0) {
      return { batchSize: 0, processedCount: 0 };
    }

    this.logger.log(
      `[CRON] Found ${expiredBookings.length} expired PENDING bookings. Cancelling...`,
    );

    let processedCount = 0;
    for (const booking of expiredBookings) {
      try {
        const seatsToRestore = calcSeatCount(booking.passengers, booking.numberOfPeople);
        await this.cancelAndRestoreSeats(
          booking.id,
          booking.tourId,
          seatsToRestore,
          booking.departureId,
          booking.voucherCode,
          booking.userId,
        );
        processedCount += 1;
        this.logger.log(
          `[CRON] Cancelled bookingId=${booking.id}, restored ${seatsToRestore} seats (total people=${booking.numberOfPeople}) for tourId=${booking.tourId}`,
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[CRON] Failed to cancel bookingId=${booking.id}: ${msg}`,
        );
      }
    }

    this.logger.log(
      `[CRON] Hoàn tất dọn dẹp ${processedCount}/${expiredBookings.length} đơn hàng.`,
    );
    return { batchSize: expiredBookings.length, processedCount };
  }

  async sendPassengerInfoReminders(): Promise<{
    batchSize: number;
    sentCount: number;
    notifiedCount: number;
  }> {
    return this.passengerService.sendPassengerInfoReminders();
  }

  async sendPassengerReminderByStaff(
    bookingId: number,
    staffId: number,
    channel: PassengerReminderChannel,
  ) {
    return this.passengerService.sendPassengerReminderByStaff(
      bookingId,
      staffId,
      channel,
    );
  }

  /**
   * Admin: Xác nhận thủ công booking PENDING
   * Dùng khi khách đã thanh toán ngoài hệ thống (chuyển khoản sai nội dung, tiền mặt, v.v.)
   */
  async updatePaymentMethod(
    bookingId: number,
    paymentMethod: 'PAYOS' | 'IN_STORE',
    userId: number,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { tour: { select: { startDate: true } } },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa booking này');
    if (booking.status !== 'PENDING' || booking.paymentStatus !== 'UNPAID') {
      throw new BadRequestException(
        'Chỉ có thể thay đổi phương thức thanh toán cho đơn hàng chưa thanh toán',
      );
    }

    const now = new Date();
    const departure = booking.departureId
      ? await this.prisma.tourDeparture.findUnique({
          where: { id: booking.departureId },
          select: { departureDate: true },
        })
      : null;
    const { holdMinutes } = await this.settingsService.getBookingPolicy();
    const holdExpiresAt = calculateBookingHoldExpiresAt({
      paymentMethod,
      departureDate: departure?.departureDate ?? booking.tour.startDate,
      now,
      holdMinutes,
    });

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentMethod, holdExpiresAt },
    });

    if (paymentMethod === 'IN_STORE') {
      await this.prisma.paymentTransaction.updateMany({
        where: { bookingId, gateway: 'PAYOS', status: 'PENDING' },
        data: {
          status: 'FAILED',
          confirmedNote: 'Khach chuyen sang thanh toan tai cua hang',
        },
      });
      await this.prisma.bookingNotification.updateMany({
        where: {
          bookingId,
          type: 'PAYMENT_REQUEST',
          status: { in: ['PENDING', 'SENT'] },
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Don da chuyen sang thanh toan tai quay',
        },
      });

      const existingTx = await this.prisma.paymentTransaction.findFirst({
        where: { bookingId, gateway: 'MANUAL' },
      });
      if (!existingTx) {
        await this.prisma.paymentTransaction.create({
          data: {
            bookingId,
            gateway: 'MANUAL',
            amount: Math.round(Number(booking.totalPrice)),
            status: 'PENDING',
          },
        });
      }
    } else {
      await this.prisma.paymentTransaction.updateMany({
        where: { bookingId, gateway: 'MANUAL', status: 'PENDING' },
        data: {
          status: 'FAILED',
          confirmedNote: 'Khach chuyen sang thanh toan PayOS',
        },
      });
    }

    return {
      message: 'Cập nhật phương thức thanh toán thành công',
      booking: updated,
    };
  }

  async updateAdminNote(bookingId: number, adminId: number, note: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      select: { id: true },
    });
    if (!booking) throw new NotFoundException('Booking khong ton tai');

    const trimmed = note.trim();
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        adminNote: trimmed || null,
        adminNoteById: trimmed ? adminId : null,
        adminNoteUpdatedAt: trimmed ? new Date() : null,
      },
    });
  }

  async adminCancelBooking(bookingId: number, adminId: number, reason: string) {
    return this.cancellationService.adminCancelBooking(
      bookingId,
      adminId,
      reason,
    );
  }
  // --- Query --- delegated to BookingQueryService -------------------------

  async getMyBookings(userId: number) {
    return this.queryService.getMyBookings(userId);
  }
  async getMyBookingById(bookingId: number, userId: number) {
    return this.queryService.getMyBookingById(bookingId, userId);
  }
  async findMyByBookingCode(bookingCode: string, userId: number) {
    return this.queryService.findMyByBookingCode(bookingCode, userId);
  }
  async getAllBookings(
    status?: string,
    paymentStatus?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string,
    page = 1,
    limit = 10,
    paymentMethod?: 'PAYOS' | 'IN_STORE',
    needsReconciliation = false,
    departureFrom?: string,
    departureTo?: string,
    needsCustomerCall = false,
    needsPassengerInfo = false,
  ) {
    return this.queryService.getAllBookings(
      status,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      page,
      limit,
      paymentMethod,
      needsReconciliation,
      departureFrom,
      departureTo,
      needsCustomerCall,
      needsPassengerInfo,
    );
  }

  async getRecentBookings(limit = 5) {
    return this.queryService.getRecentBookings(limit);
  }

  async retryPayment(bookingId: number, userId: number) {
    return this.queryService.retryPayment(bookingId, userId);
  }
  async findPublicByBookingCode(bookingCode: string, email: string) {
    return this.queryService.findPublicByBookingCode(bookingCode, email);
  }
  async publicRetryPayment(bookingCode: string, email: string) {
    return this.queryService.publicRetryPayment(bookingCode, email);
  }
  async getBookingById(bookingId: number) {
    return this.queryService.getBookingById(bookingId);
  }
  async findByBookingCode(bookingCode: string) {
    return this.queryService.findByBookingCode(bookingCode);
  }
  async proxyImage(imageUrl: string, res: import('express').Response) {
    return this.queryService.proxyImage(imageUrl, res);
  }

  async requestCancellation(
    bookingId: number,
    userId: number,
    reason: string,
    bankDetails?: import('@prisma/client').Prisma.InputJsonValue,
  ) {
    return this.cancellationService.requestCancellation(
      bookingId,
      userId,
      reason,
      bankDetails,
    );
  }

  async approveCancellation(bookingId: number, adminNote?: string) {
    return this.cancellationService.approveCancellation(bookingId, adminNote);
  }

  async rejectCancellation(bookingId: number, rejectReason: string) {
    return this.cancellationService.rejectCancellation(bookingId, rejectReason);
  }

  async confirmRefund(
    bookingId: number,
    actorId: number,
    dto: { note?: string; evidenceUrl?: string },
  ) {
    return this.cancellationService.confirmRefund(bookingId, actorId, dto);
  }

  async getCancelRequests() {
    return this.cancellationService.getCancelRequests();
  }

  async getAdminQuickStats() {
    return this.statsService.getAdminQuickStats();
  }

  async getOperationalStats() {
    return this.statsService.getOperationalStats();
  }
}

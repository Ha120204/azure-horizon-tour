import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  type TourDeparture,
  type TourPackage,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PaymentService } from '../payment/payment.service';
import { VoucherService } from '../voucher/voucher.service';
import { MailService } from '../mail/mail.service';
import { HttpService } from '@nestjs/axios';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { CreateAssistedBookingDraftDto } from './dto/create-assisted-booking-draft.dto';
import { AssistedDraftService } from './assisted-draft.service';
import { BookingCancellationService } from './booking-cancellation.service';
import { BookingQueryService } from './booking-query.service';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';
import {
  asPassengerInputs,
  assertVoucherAllowedForDeparture,
  calculateBookingHoldExpiresAt,
  generateBookingCode,
  getErrorMessage,
  getPassengerTotal,
  IN_STORE_MAX_HOLD_HOURS,
  isPayosDuplicateError,
  PAYOS_HOLD_MINUTES,
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
  ) {}

  // Cleaned comment

  async createAssistedDraft(actorUserId: number, dto: CreateAssistedBookingDraftDto) {
    return this.assistedDraftService.createAssistedDraft(actorUserId, dto);
  }

  async updateAssistedDraft(id: number, actorUserId: number, actorRole: string, dto: CreateAssistedBookingDraftDto) {
    return this.assistedDraftService.updateAssistedDraft(id, actorUserId, actorRole, dto);
  }

  async getAssistedDrafts(actorUserId: number, actorRole: string, status?: string, search?: string) {
    return this.assistedDraftService.getAssistedDrafts(actorUserId, actorRole, status, search);
  }

  async deleteAssistedDraft(id: number, actorUserId: number, actorRole: string) {
    return this.assistedDraftService.deleteAssistedDraft(id, actorUserId, actorRole);
  }

  async submitAssistedDraft(id: number, actorUserId: number, actorRole: string) {
    return this.assistedDraftService.submitAssistedDraft(id, actorUserId, actorRole);
  }

  async requestRevisionAssistedDraft(id: number, adminId: number, reason: string) {
    return this.assistedDraftService.requestRevisionAssistedDraft(id, adminId, reason);
  }

  async rejectAssistedDraft(id: number, adminId: number, reason: string) {
    return this.assistedDraftService.rejectAssistedDraft(id, adminId, reason);
  }

  async approveAssistedDraft(id: number, adminId: number, note?: string) {
    return this.assistedDraftService.approveAssistedDraft(id, adminId, note);
  }

  async resendPaymentRequest(bookingId: number, actorUserId: number, forceEmail = false) {
    return this.assistedDraftService.resendPaymentRequest(bookingId, actorUserId, forceEmail);
  }

  private async markVoucherAsUsed(tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0], userId: number, voucherCode?: string | null) {
    return this.assistedDraftService.markVoucherAsUsed(tx, userId, voucherCode);
  }

  // Cleaned comment

  async create(userId: number | null, dto: CreateBookingDto, ip: string) {
    void ip;
    // ============== INTERACTIVE TRANSACTION ==============
    // Wrap everything in a transaction to guarantee atomicity:
    // If ANY step inside fails -> rollback EVERYTHING, no seats are lost.
    const booking = await this.prisma.$transaction(async (tx) => {
      let finalUserId = userId;
      if (!finalUserId || isNaN(finalUserId)) {
        const contactEmail = typeof dto.contactInfo?.email === 'string' ? dto.contactInfo.email : null;
        if (!contactEmail) {
          throw new BadRequestException('Email lien he la bat buoc khi dat tour vang lai');
        }

        let guestUser = await tx.user.findUnique({
          where: { email: contactEmail },
        });
        if (!guestUser) {
          const contactName = typeof dto.contactInfo?.fullName === 'string' ? dto.contactInfo.fullName : 'Guest';
          const contactPhone = typeof dto.contactInfo?.phone === 'string' ? dto.contactInfo.phone : (typeof dto.contactInfo?.phone === 'number' ? String(dto.contactInfo.phone) : null);
          const contactGender = typeof dto.contactInfo?.gender === 'string' ? dto.contactInfo.gender : null;
          const contactDob = typeof dto.contactInfo?.dob === 'string' ? dto.contactInfo.dob : null;
          const contactIdentityType = typeof dto.contactInfo?.identityType === 'string' ? dto.contactInfo.identityType : null;
          const contactIdentityNo = typeof dto.contactInfo?.identityNo === 'string' ? dto.contactInfo.identityNo : (typeof dto.contactInfo?.identityNo === 'number' ? String(dto.contactInfo.identityNo) : null);

          const randomPassword = Math.random().toString(36).slice(-8) + Date.now().toString().slice(-4);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          guestUser = await tx.user.create({
            data: {
              email: contactEmail,
              password: hashedPassword,
              fullName: contactName,
              phone: contactPhone,
              gender: contactGender,
              dob: contactDob,
              identityType: contactIdentityType,
              identityNo: contactIdentityNo,
              role: 'CUSTOMER',
            },
          });
        }
        finalUserId = guestUser.id;
      }
      // Cleaned comment
      const tour = await tx.tour.findUnique({
        where: { id: dto.tourId, deletedAt: null }, // Cleaned comment
      });

      if (!tour) {
        throw new NotFoundException('Tour not found');
      }

      // Cleaned comment
      if (tour.startDate < new Date()) {
        throw new BadRequestException('Tour này đã diễn ra, không thể đặt');
      }

      // Cleaned comment
      let selectedDeparture: TourDeparture | null = null;
      if (dto.departureId) {
        selectedDeparture = await tx.tourDeparture.findUnique({
          where: { id: dto.departureId },
        });
        if (!selectedDeparture || selectedDeparture.tourId !== tour.id) {
          throw new BadRequestException('Invalid departure');
        }
        if (selectedDeparture.availableSeats < dto.numberOfPeople) {
          throw new BadRequestException('Not enough seats for this departure');
        }
      } else {
        // Cleaned comment
        if (tour.availableSeats < dto.numberOfPeople) {
          throw new BadRequestException('Not enough seats available');
        }
      }

      let basePrice = selectedDeparture?.price ?? tour.price;
      let selectedPackage: TourPackage | null = null;
      if (dto.packageId) {
        selectedPackage = await tx.tourPackage.findUnique({
          where: { id: dto.packageId },
        });
        if (!selectedPackage || selectedPackage.tourId !== tour.id) {
          throw new BadRequestException('Invalid tour package');
        }
        // Cleaned comment
        basePrice += selectedPackage.price;
      }

      // Cleaned comment
      let totalPrice = getPassengerTotal(
        basePrice,
        dto.numberOfPeople,
        asPassengerInputs(dto.passengers),
      );

      let discountAmount = 0;
      let voucherCode: string | null = null;

      // Cleaned comment
      if (dto.voucherCode) {
        assertVoucherAllowedForDeparture(selectedDeparture, dto.voucherCode, tour.price);
        const voucherResult = await this.voucherService.validateVoucher(
          dto.voucherCode,
          totalPrice,
          { tourId: tour.id, departureId: selectedDeparture?.id ?? null },
        );
        discountAmount = voucherResult.discountAmount;
        totalPrice = voucherResult.finalPrice;
        voucherCode = dto.voucherCode.trim().toUpperCase();
      }

      // Cleaned comment
      await tx.tour.update({
        where: { id: tour.id },
        data: { availableSeats: { decrement: dto.numberOfPeople } },
      });

      // Cleaned comment
      if (dto.departureId) {
        await tx.tourDeparture.update({
          where: { id: dto.departureId },
          data: { availableSeats: { decrement: dto.numberOfPeople } },
        });
      }

      // Cleaned comment
      const newBookingCode = generateBookingCode();
      const paymentMethod = dto.paymentMethod === 'IN_STORE' ? 'IN_STORE' : 'PAYOS';
      const departureDate = selectedDeparture?.departureDate ?? tour.startDate;
      const holdExpiresAt = calculateBookingHoldExpiresAt({
        paymentMethod,
        departureDate,
      });

      // Cleaned comment
      const newBooking = await tx.booking.create({
        data: {
          bookingCode: newBookingCode,
          userId: finalUserId,
          tourId: dto.tourId,
          numberOfPeople: dto.numberOfPeople,
          totalPrice,
          unitPriceAtBooking: basePrice, // Cleaned comment
          voucherCode,
          discountAmount,
          departureId: dto.departureId,
          packageId: dto.packageId,
          contactInfo: dto.contactInfo ?? Prisma.JsonNull,
          passengers: dto.passengers ?? Prisma.JsonNull,
          paymentMethod,
          holdExpiresAt,
        },
      });

      return newBooking;
    }); // Cleaned comment

    // Cleaned comment
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
    // Cleaned comment
    // Cleaned comment
    const amountVND = Math.round(booking.totalPrice);

    // Cleaned comment
    const description = `AH ${booking.bookingCode}`;

    // Cleaned comment
    // Cleaned comment
    // Cleaned comment
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
      // Cleaned comment
      if (isPayosDuplicateError(payosError)) {
        this.logger.warn('[BOOKING] PayOS order already exists, reusing checkout URL.');
        const existing = await this.paymentService.getPaymentInfo(orderCode);
        if (!existing?.id) {
          throw new BadRequestException(
            'Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.',
          );
        }
        // Cleaned comment
        checkoutUrl = `https://pay.payos.vn/web/${existing.id}`;
      } else {
        throw payosError;
      }
    }

    // Cleaned comment
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
    // Cleaned comment
    const paymentInfo = await this.paymentService.getPaymentInfo(orderCode);

    // Cleaned comment
    // Cleaned comment
    const bookingId =
      orderCode >= 1000000 ? Math.floor(orderCode / 1000000) : orderCode;

    // Cleaned comment
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Cleaned comment
    if (booking.status === 'CONFIRMED' || booking.status === 'CANCELLED') {
      return paymentInfo;
    }

    // Cleaned comment
    if (paymentInfo.status === 'PAID') {
      const txnRef =
        paymentInfo.transactions?.[0]?.reference || `PAYOS-${orderCode}`;

      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            // Cleaned comment
            vnpayTxnRef: txnRef,
          },
        });

        await this.markVoucherAsUsed(tx, booking.userId, booking.voucherCode);
      });

      // Cleaned comment
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

      // Cleaned comment
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
        this.logger.error('[EMAIL] Failed to send confirmation email:', getErrorMessage(emailError));
        // Cleaned comment
      }
    } else if (
      paymentInfo.status === 'CANCELLED' ||
      paymentInfo.status === 'EXPIRED'
    ) {
      // Cleaned comment
      await this.cancelAndRestoreSeats(
        booking.id,
        booking.tourId,
        booking.numberOfPeople,
        booking.departureId,
      );

      // Cleaned comment
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
    // Cleaned comment

    return paymentInfo;
  }

  /**
   * Tìm booking theo ID (orderCode của PayOS)
   */
  async findByOrderCode(orderCode: number) {
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

  // Cleaned comment

  /**
   * Cancel a specific booking and restore seats to the tour.
   * Shared by: PayOS cancel, Webhook cancel, and Cron job auto-cancel.
   */
  private async cancelAndRestoreSeats(
    bookingId: number,
    tourId: number,
    numberOfPeople: number,
    departureId?: number | null,
  ) {
    const updates: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
        },
      }),
      this.prisma.tour.update({
        where: { id: tourId },
        data: {
          availableSeats: { increment: numberOfPeople },
        },
      }),
    ];

    if (departureId) {
      updates.push(
        this.prisma.tourDeparture.update({
          where: { id: departureId },
          data: {
            availableSeats: { increment: numberOfPeople },
          },
        }),
      );
    }

    await this.prisma.$transaction(updates);
  }

  private async notifyBookingCreated(
    bookingId: number,
    bookingCode: string,
    dto: CreateBookingDto,
  ) {
    const contactInfo = dto.contactInfo as { fullName?: string; email?: string } | undefined;
    const customerName = contactInfo?.fullName?.trim() || contactInfo?.email?.trim() || 'Khách hàng';

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
    const payosFallbackExpiryTime = new Date(now.getTime() - PAYOS_HOLD_MINUTES * 60 * 1000);
    const instoreFallbackExpiryTime = new Date(now.getTime() - IN_STORE_MAX_HOLD_HOURS * 60 * 60 * 1000);

    // Cleaned comment
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        deletedAt: null, // Cleaned comment
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
      await this.cancelAndRestoreSeats(
        booking.id,
        booking.tourId,
        booking.numberOfPeople,
        booking.departureId,
      );
      processedCount += 1;
      this.logger.log(
        `[CRON] Cancelled bookingId=${booking.id} and restored ${booking.numberOfPeople} seats for tourId=${booking.tourId}`,
      );
    }

    this.logger.log(
      `[CRON] Hoàn tất dọn dẹp ${processedCount}/${expiredBookings.length} đơn hàng.`,
    );
    return { batchSize: expiredBookings.length, processedCount };
  }

  // Cleaned comment

  /**
   * Admin: Xác nhận thủ công booking PENDING
   * Dùng khi khách đã thanh toán ngoài hệ thống (chuyển khoản sai nội dung, tiền mặt, v.v.)
   */
  async confirmManual(bookingId: number, adminId?: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        tour: { select: { id: true, name: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.status === 'CONFIRMED')
      throw new BadRequestException('Đơn hàng đã được xác nhận trước đó');
    if (booking.status === 'CANCELLED')
      throw new BadRequestException('Không thể xác nhận đơn hàng đã hủy');

    const updated = await this.prisma.$transaction(async (tx) => {
      const confirmed = await tx.booking.update({
        where: { id: bookingId },
        data: { 
          status: 'CONFIRMED', 
          paymentStatus: 'PAID',
          confirmedById: adminId || null,
        },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
          tour: {
            select: { id: true, name: true, imageUrl: true, tourCode: true },
          },
        },
      });

      await this.markVoucherAsUsed(tx, booking.userId, booking.voucherCode);
      return confirmed;
    });

    this.logger.log(
      `[ADMIN MANUAL] Booking confirmed manually bookingId=${bookingId} adminId=${adminId ?? 'system'}`,
    );

    return {
      ...updated,
      totalPrice: Number(updated.totalPrice),
      unitPriceAtBooking: Number(updated.unitPriceAtBooking),
      discountAmount: Number(updated.discountAmount),
    };
  }

  async updatePaymentMethod(bookingId: number, paymentMethod: 'PAYOS' | 'IN_STORE', userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { tour: { select: { startDate: true } } },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.userId !== userId) throw new ForbiddenException('Bạn không có quyền chỉnh sửa booking này');
    if (booking.status !== 'PENDING' || booking.paymentStatus !== 'UNPAID') {
      throw new BadRequestException('Chỉ có thể thay đổi phương thức thanh toán cho đơn hàng chưa thanh toán');
    }

    const now = new Date();
    if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException('Booking da het han giu cho. Vui long dat tour moi.');
    }

    const departure = booking.departureId
      ? await this.prisma.tourDeparture.findUnique({
          where: { id: booking.departureId },
          select: { departureDate: true },
        })
      : null;
    const holdExpiresAt = calculateBookingHoldExpiresAt({
      paymentMethod,
      departureDate: departure?.departureDate ?? booking.tour.startDate,
      now,
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


  // --- Query --- delegated to BookingQueryService -------------------------

  async getMyBookings(userId: number) { return this.queryService.getMyBookings(userId); }
  async getMyBookingById(bookingId: number, userId: number) { return this.queryService.getMyBookingById(bookingId, userId); }
  async findMyByBookingCode(bookingCode: string, userId: number) { return this.queryService.findMyByBookingCode(bookingCode, userId); }
  async getAllBookings(status?: string, paymentStatus?: string, search?: string, dateFrom?: string, dateTo?: string, page = 1, limit = 10, paymentMethod?: 'PAYOS' | 'IN_STORE', needsReconciliation = false) { return this.queryService.getAllBookings(status, paymentStatus, search, dateFrom, dateTo, page, limit, paymentMethod, needsReconciliation); }

  async retryPayment(bookingId: number, userId: number) { return this.queryService.retryPayment(bookingId, userId); }
  async findPublicByBookingCode(bookingCode: string, email: string) { return this.queryService.findPublicByBookingCode(bookingCode, email); }
  async publicRetryPayment(bookingCode: string, email: string) { return this.queryService.publicRetryPayment(bookingCode, email); }
  async getBookingById(bookingId: number) { return this.queryService.getBookingById(bookingId); }
  async findByBookingCode(bookingCode: string) { return this.queryService.findByBookingCode(bookingCode); }
  async proxyImage(imageUrl: string, res: import('express').Response) { return this.queryService.proxyImage(imageUrl, res); }

  // Cleaned comment

  async requestCancellation(bookingId: number, userId: number, reason: string, bankDetails?: import('@prisma/client').Prisma.InputJsonValue) {
    return this.cancellationService.requestCancellation(bookingId, userId, reason, bankDetails);
  }

  async approveCancellation(bookingId: number, adminNote?: string) {
    return this.cancellationService.approveCancellation(bookingId, adminNote);
  }

  async rejectCancellation(bookingId: number, rejectReason: string) {
    return this.cancellationService.rejectCancellation(bookingId, rejectReason);
  }

  async getCancelRequests() {
    return this.cancellationService.getCancelRequests();
  }

  async getAdminQuickStats() {
    const [grouped, paymentGrouped, myToursCount, assistedDraftGrouped] = await Promise.all([
      this.prisma.booking.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { status: true } }),
      this.prisma.booking.groupBy({ by: ['paymentStatus'], where: { deletedAt: null }, _count: { paymentStatus: true } }),
      this.prisma.tour.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      this.prisma.assistedBookingDraft.groupBy({ by: ['status'], _count: { status: true } }),
    ]);
    const map: Record<string, number> = {};
    for (const row of grouped) map[row.status] = row._count.status;
    const paymentMap: Record<string, number> = {};
    for (const row of paymentGrouped) paymentMap[row.paymentStatus] = row._count.paymentStatus;
    const assistedDraftMap: Record<string, number> = {};
    for (const row of assistedDraftGrouped) assistedDraftMap[row.status] = row._count.status;
    return {
      pending: map['PENDING'] || 0, confirmed: map['CONFIRMED'] || 0,
      cancelRequested: map['CANCEL_REQUESTED'] || 0, cancelled: map['CANCELLED'] || 0,
      total: Object.values(map).reduce((a, b) => a + b, 0),
      publishedTours: myToursCount,
      unpaidCount: paymentMap['UNPAID'] || 0, processingCount: paymentMap['PROCESSING'] || 0,
      failedPaymentCount: paymentMap['FAILED'] || 0,
      assistedDraftPending: assistedDraftMap['PENDING_APPROVAL'] || 0,
      assistedDraftNeedsRevision: assistedDraftMap['NEEDS_REVISION'] || 0,
    };
  }

  findAll() { return `This action returns all booking`; }
  findOne(id: number) { return `This action returns a #${id} booking`; }
  update(id: number, updateBookingDto: UpdateBookingDto) { void updateBookingDto; return `This action updates a #${id} booking`; }
  remove(id: number) { return `This action removes a #${id} booking`; }
}



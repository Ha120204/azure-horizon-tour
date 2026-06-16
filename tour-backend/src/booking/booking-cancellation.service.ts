import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import moment from 'moment';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentService } from '../payment/payment.service';
import type { CancellationPolicy, CancellationPolicyTier, TripLifecycle } from './types';
import { calcSeatCount, getErrorMessage, releaseSeats } from './helpers/booking-helpers';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';

@Injectable()
export class BookingCancellationService {
  private readonly logger = new Logger(BookingCancellationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly paymentService: PaymentService,
    private readonly adminNotifications: AdminNotificationService,
  ) {}

  // ─── Policy calculation ────────────────────────────────────────────────────

  async resolveBookingDepartureDate(booking: {
    departureId?: number | null;
    tour: { startDate: Date };
  }): Promise<Date> {
    if (!booking.departureId) return booking.tour.startDate;
    const departure = await this.prisma.tourDeparture.findUnique({
      where: { id: booking.departureId },
      select: { departureDate: true },
    });
    return departure?.departureDate ?? booking.tour.startDate;
  }

  buildCancellationPolicy(booking: {
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    totalPrice: number | Prisma.Decimal;
    createdAt: Date;
    departureDate: Date;
  }): CancellationPolicy {
    const today = moment().startOf('day');
    const departureDay = moment(booking.departureDate).startOf('day');
    const daysUntilDeparture = departureDay.diff(today, 'days');
    const tripLifecycle: TripLifecycle =
      daysUntilDeparture < 0 ? 'COMPLETED'
      : daysUntilDeparture === 0 ? 'DEPARTING_TODAY'
      : 'UPCOMING';
    const totalPrice = Number(booking.totalPrice);

    if (booking.status === 'CANCELLED') {
      return { canCancel: false, tripLifecycle, cancelUnavailableReason: 'Đơn đặt tour đã được hủy.', refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Đơn đặt tour đã được hủy.', policyTier: 'NOT_CANCELABLE', departureDate: booking.departureDate, daysUntilDeparture };
    }
    if (booking.status === 'CANCEL_REQUESTED') {
      return { canCancel: false, tripLifecycle, cancelUnavailableReason: 'Yêu cầu hủy đang chờ xử lý.', refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Yêu cầu hủy đang chờ admin xử lý.', policyTier: 'NOT_CANCELABLE', departureDate: booking.departureDate, daysUntilDeparture };
    }
    if (tripLifecycle === 'DEPARTING_TODAY') {
      return { canCancel: false, tripLifecycle, cancelUnavailableReason: 'Tour khởi hành hôm nay, không thể hủy online.', refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Không hỗ trợ hủy online vào ngày khởi hành.', policyTier: 'NOT_CANCELABLE', departureDate: booking.departureDate, daysUntilDeparture };
    }
    if (tripLifecycle === 'COMPLETED') {
      return { canCancel: false, tripLifecycle, cancelUnavailableReason: 'Chuyến đi đã hoàn thành.', refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Chuyến đi đã hoàn thành, không thể hủy booking.', policyTier: 'NOT_CANCELABLE', departureDate: booking.departureDate, daysUntilDeparture };
    }
    if (booking.paymentStatus !== 'PAID') {
      return { canCancel: true, tripLifecycle, refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Chưa thanh toán – không có khoản hoàn tiền.', policyTier: 'UNPAID', departureDate: booking.departureDate, daysUntilDeparture };
    }

    const hoursSinceBooking = moment().diff(moment(booking.createdAt), 'hours', true);
    let refundPercent = 0;
    let refundNote = 'Không hoàn tiền (hủy dưới 3 ngày trước khởi hành).';
    let policyTier: CancellationPolicyTier = 'NO_REFUND';

    if (hoursSinceBooking <= 24) {
      refundPercent = 100; refundNote = 'Hoàn 100% do hủy trong 24h sau khi đặt.'; policyTier = 'FULL_REFUND_24H';
    } else if (daysUntilDeparture >= 7) {
      refundPercent = 80; refundNote = 'Hoàn 80% do hủy trước ngày khởi hành từ 7 ngày trở lên.'; policyTier = 'EIGHTY_REFUND';
    } else if (daysUntilDeparture >= 3) {
      refundPercent = 50; refundNote = 'Hoàn 50% do hủy trước ngày khởi hành từ 3 đến dưới 7 ngày.'; policyTier = 'HALF_REFUND';
    }

    return { canCancel: true, tripLifecycle, refundPercent, estimatedRefundAmount: Math.round((totalPrice * refundPercent) / 100), refundNote, policyTier, departureDate: booking.departureDate, daysUntilDeparture };
  }

  async getCancellationPolicyForBooking(booking: {
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    totalPrice: number | Prisma.Decimal;
    createdAt: Date;
    departureId?: number | null;
    tour: { startDate: Date };
  }): Promise<CancellationPolicy> {
    const departureDate = await this.resolveBookingDepartureDate(booking);
    return this.buildCancellationPolicy({ ...booking, departureDate });
  }

  // ─── Public methods ────────────────────────────────────────────────────────

  async requestCancellation(
    bookingId: number,
    userId: number,
    reason: string,
    bankDetails?: Prisma.InputJsonValue,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.userId !== userId) throw new BadRequestException('Không có quyền hủy booking này');
    if (booking.status === 'CANCELLED') throw new BadRequestException('Booking này đã được hủy trước đó');
    if (booking.status === 'CANCEL_REQUESTED') throw new BadRequestException('Yêu cầu hủy của bạn đang chờ xử lý');

    const cancellationPolicy = await this.getCancellationPolicyForBooking(booking);
    if (!cancellationPolicy.canCancel) throw new BadRequestException(cancellationPolicy.cancelUnavailableReason ?? 'Không thể hủy booking này.');

    const refundAmount = cancellationPolicy.estimatedRefundAmount;
    const refundNote = cancellationPolicy.refundNote;

    if (booking.status === 'PENDING') {
      await this.prisma.$transaction(async (tx) => {
        const updateResult = await tx.booking.updateMany({
          where: { id: bookingId, status: 'PENDING' },
          data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date(), cancelledBy: 'CUSTOMER', refundAmount: 0, refundNote: 'Huy truoc khi thanh toan' },
        });
        if (updateResult.count === 0) throw new BadRequestException('Trang thai don hang da thay doi, khong the huy tu dong.');
        await releaseSeats(tx, {
          tourId: booking.tourId,
          departureId: booking.departureId,
          seats: calcSeatCount(booking.passengers, booking.numberOfPeople),
        });
      });

      try {
        await this.paymentService.cancelPaymentLink(bookingId, 'Khach hang chu dong huy don');
      } catch {
        this.logger.warn(`[PAYOS] Khong the huy link PayOS cho booking #${bookingId}.`);
      }

      await this.adminNotifications.createSafe({
        type: 'booking_cancelled',
        resourceType: 'Booking',
        resourceId: bookingId,
        title: 'Khách hàng đã hủy booking',
        body: `Booking ${booking.bookingCode} đã được khách hủy trước khi thanh toán.`,
        href: '/admin/bookings?status=CANCELLED',
        severity: 'warning',
        targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
        metadata: { bookingCode: booking.bookingCode, reason },
      });

      this.logger.log(`[CANCEL] Khach huy booking PENDING #${bookingId} truoc khi thanh toan`);
      return { message: 'Da huy dat tour thanh cong', refundAmount: 0, refundNote: 'Chua thanh toan - khong co hoan tien' };
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCEL_REQUESTED', cancelReason: reason, cancelRequestedAt: new Date(),
        refundAmount, refundNote,
        refundBankDetails: bankDetails === undefined ? Prisma.JsonNull : bankDetails,
      },
    });

    try {
      if (booking.user?.email) {
        await this.mailService.sendCancelRequestConfirmation({
          to: booking.user.email, customerName: booking.user.fullName,
          bookingCode: booking.bookingCode, tourName: booking.tour.name,
          cancelReason: reason, refundAmount, refundNote,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Failed to send cancel request email:', getErrorMessage(emailError));
    }

    this.logger.log(`[CANCEL] Booking moved to CANCEL_REQUESTED bookingId=${bookingId}`);
    await this.adminNotifications.createSafe({
      type: 'booking_cancel_requested',
      resourceType: 'Booking',
      resourceId: bookingId,
      title: 'Yêu cầu hủy booking mới',
      body: `${booking.user?.fullName ?? 'Khách hàng'} đã gửi yêu cầu hủy booking ${booking.bookingCode}.`,
      href: '/admin/bookings?status=CANCEL_REQUESTED',
      severity: 'urgent',
      targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      metadata: {
        bookingCode: booking.bookingCode,
        reason,
        refundAmount,
      },
    });
    return { message: 'Yeu cau huy da duoc ghi nhan, dang cho xu ly', refundAmount, refundNote };
  }

  async approveCancellation(bookingId: number, adminNote?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });
    if (!booking) throw new NotFoundException('Booking khong ton tai');
    if (booking.status !== 'CANCEL_REQUESTED') throw new BadRequestException('Booking nay khong o trang thai cho duyet huy');

    const refundAmount = Number(booking.refundAmount ?? 0);

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        // refundedAt chỉ set khi tiền THỰC SỰ đã chuyển cho khách (admin xác nhận
        // qua confirmRefund). Đơn không phát sinh hoàn tiền (refundAmount = 0) coi
        // như đã xử lý xong ngay tại bước duyệt.
        data: { status: 'CANCELLED', paymentStatus: 'FAILED', cancelledAt: new Date(), cancelledBy: 'ADMIN', refundNote: adminNote || booking.refundNote, refundedAt: refundAmount > 0 ? null : new Date() },
      });
      await releaseSeats(tx, {
        tourId: booking.tourId,
        departureId: booking.departureId,
        seats: calcSeatCount(booking.passengers, booking.numberOfPeople),
      });
      if (refundAmount > 0) {
        await tx.paymentTransaction.create({
          data: { bookingId, gateway: 'MANUAL', amount: refundAmount, status: 'PENDING', transactionRef: `REFUND-${bookingId}-${Date.now()}` },
        });
      }
    });

    try {
      if (booking.user?.email) {
        await this.mailService.sendCancellationApproved({
          to: booking.user.email, customerName: booking.user.fullName,
          bookingCode: booking.bookingCode, tourName: booking.tour.name,
          refundAmount, adminNote,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Failed to send cancellation approval email:', getErrorMessage(emailError));
    }

    this.logger.log(`[ADMIN] Cancellation approved for bookingId=${bookingId}`);
    return { message: 'Da duyet huy booking va hoan tra ghe', refundAmount };
  }

  /**
   * [ADMIN] Xác nhận đã CHUYỂN KHOẢN hoàn tiền cho khách (thủ công).
   * PayOS không hỗ trợ refund qua API nên khoản hoàn được chuyển ngoài hệ thống;
   * bước này chốt giao dịch refund PENDING → SUCCESS và đánh dấu booking.refundedAt.
   */
  async confirmRefund(
    bookingId: number,
    actorId: number,
    dto: { note?: string; evidenceUrl?: string },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });
    if (!booking) throw new NotFoundException('Booking khong ton tai');
    if (booking.status !== 'CANCELLED') {
      throw new BadRequestException('Chi xac nhan hoan tien cho don da huy');
    }
    const refundAmount = Number(booking.refundAmount ?? 0);
    if (refundAmount <= 0) {
      throw new BadRequestException('Don nay khong phat sinh khoan hoan tien');
    }
    if (booking.refundedAt) {
      throw new BadRequestException('Khoan hoan tien da duoc xac nhan truoc do');
    }

    const now = new Date();
    const note = dto.note?.trim();

    await this.prisma.$transaction(async (tx) => {
      // updateMany + điều kiện refundedAt: null — idempotency guard, chặn double-confirm
      const updated = await tx.booking.updateMany({
        where: { id: bookingId, status: 'CANCELLED', refundedAt: null },
        data: { refundedAt: now, ...(note ? { refundNote: note } : {}) },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Khoan hoan tien da duoc xac nhan truoc do');
      }

      const refundTxnData = {
        status: 'SUCCESS',
        confirmedSource: 'REFUND_MANUAL',
        confirmedById: actorId,
        confirmedAt: now,
        confirmedNote: note ?? null,
        evidenceUrl: dto.evidenceUrl ?? null,
      };

      const pendingRefund = await tx.paymentTransaction.findFirst({
        where: {
          bookingId,
          gateway: 'MANUAL',
          status: 'PENDING',
          transactionRef: { startsWith: 'REFUND-' },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (pendingRefund) {
        await tx.paymentTransaction.update({
          where: { id: pendingRefund.id },
          data: refundTxnData,
        });
      } else {
        await tx.paymentTransaction.create({
          data: {
            bookingId,
            gateway: 'MANUAL',
            amount: Math.round(refundAmount),
            transactionRef: `REFUND-${bookingId}-${Date.now()}`,
            ...refundTxnData,
          },
        });
      }
    });

    try {
      if (booking.user?.email) {
        await this.mailService.sendRefundCompleted({
          to: booking.user.email,
          customerName: booking.user.fullName,
          bookingCode: booking.bookingCode,
          tourName: booking.tour.name,
          refundAmount,
          note,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Failed to send refund completed email:', getErrorMessage(emailError));
    }

    this.logger.log(
      `[REFUND] Confirmed refund for bookingId=${bookingId} amount=${refundAmount} actorId=${actorId}`,
    );
    return { message: 'Da xac nhan hoan tien cho khach', refundAmount };
  }

  async rejectCancellation(bookingId: number, rejectReason: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });
    if (!booking) throw new NotFoundException('Booking khong ton tai');
    if (booking.status !== 'CANCEL_REQUESTED') throw new BadRequestException('Booking nay khong o trang thai cho duyet huy');

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', cancelReason: null, cancelRequestedAt: null, refundAmount: null, refundNote: rejectReason },
    });

    try {
      if (booking.user?.email) {
        await this.mailService.sendCancellationRejected({
          to: booking.user.email, customerName: booking.user.fullName,
          bookingCode: booking.bookingCode, tourName: booking.tour.name, rejectReason,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Failed to send cancellation rejection email:', getErrorMessage(emailError));
    }

    this.logger.log(`[ADMIN] Cancellation rejected for bookingId=${bookingId}`);
    return { message: 'Da tu choi yeu cau huy, booking tiep tuc hieu luc' };
  }

  async adminCancelBooking(bookingId: number, adminId: number, reason: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.status === 'CANCELLED') throw new BadRequestException('Booking này đã được hủy trước đó');

    const cancellationPolicy = await this.getCancellationPolicyForBooking(booking);
    if (!cancellationPolicy.canCancel) {
      throw new BadRequestException(cancellationPolicy.cancelUnavailableReason ?? 'Không thể hủy booking này.');
    }

    const refundAmount = cancellationPolicy.estimatedRefundAmount;
    const refundNote = booking.paymentStatus === 'PAID'
      ? cancellationPolicy.refundNote
      : 'Admin huy truoc khi thanh toan - khong co hoan tien';

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          cancelReason: reason,
          cancelledAt: new Date(),
          cancelledBy: 'ADMIN',
          refundAmount,
          refundNote,
        },
      });
      await releaseSeats(tx, {
        tourId: booking.tourId,
        departureId: booking.departureId,
        seats: calcSeatCount(booking.passengers, booking.numberOfPeople),
      });
      // Khoản hoàn tiền chờ admin chuyển khoản thủ công — ghi nhận PENDING để
      // hiển thị minh bạch và để confirmRefund chốt sau khi đã chuyển.
      if (refundAmount > 0) {
        await tx.paymentTransaction.create({
          data: { bookingId, gateway: 'MANUAL', amount: Math.round(refundAmount), status: 'PENDING', transactionRef: `REFUND-${bookingId}-${Date.now()}` },
        });
      }
    });

    if (booking.paymentMethod === 'PAYOS' && booking.paymentStatus !== 'PAID') {
      try {
        await this.paymentService.cancelPaymentLink(bookingId, 'Admin huy don');
      } catch {
        this.logger.warn(`[PAYOS] Khong the huy link PayOS cho booking #${bookingId}.`);
      }
    }

    await this.adminNotifications.createSafe({
      type: 'booking_cancelled',
      resourceType: 'Booking',
      resourceId: bookingId,
      title: 'Admin da huy booking',
      body: `Booking ${booking.bookingCode} da duoc admin huy.`,
      href: '/admin/bookings?status=CANCELLED',
      severity: 'warning',
      targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      metadata: { bookingCode: booking.bookingCode, reason, adminId, refundAmount },
    });

    this.logger.log(`[ADMIN] Booking cancelled bookingId=${bookingId} adminId=${adminId}`);
    return { message: 'Da huy booking va hoan tra ghe', refundAmount, refundNote };
  }

  async getCancelRequests() {
    const requests = await this.prisma.booking.findMany({
      where: { status: 'CANCEL_REQUESTED', deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        tour: { select: { id: true, name: true, imageUrl: true, tourCode: true, startDate: true } },
      },
      orderBy: { cancelRequestedAt: 'asc' },
    });

    const formattedRequests = requests.map((b) => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      unitPriceAtBooking: Number(b.unitPriceAtBooking),
      discountAmount: Number(b.discountAmount),
      refundAmount: Number(b.refundAmount ?? 0),
    }));

    const pendingCancelCount = formattedRequests.length;
    const pendingRefundAmount = formattedRequests.reduce((sum, r) => sum + r.refundAmount, 0);

    const refundedAgg = await this.prisma.booking.aggregate({
      where: { status: 'CANCELLED', refundedAt: { not: null }, deletedAt: null },
      _sum: { refundAmount: true },
    });

    return {
      requests: formattedRequests,
      stats: { pendingCancelCount, pendingRefundAmount, totalRefundedAmount: Number(refundedAgg._sum.refundAmount ?? 0) },
    };
  }
}

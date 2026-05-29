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
import { getErrorMessage, releaseSeats } from './helpers/booking-helpers';
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

  private buildCancellationPolicy(booking: {
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
      return { canCancel: false, tripLifecycle, cancelUnavailableReason: 'Don dat tour da duoc huy.', refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Don dat tour da duoc huy.', policyTier: 'NOT_CANCELABLE', departureDate: booking.departureDate, daysUntilDeparture };
    }
    if (booking.status === 'CANCEL_REQUESTED') {
      return { canCancel: false, tripLifecycle, cancelUnavailableReason: 'Yeu cau huy dang cho xu ly.', refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Yeu cau huy dang cho admin xu ly.', policyTier: 'NOT_CANCELABLE', departureDate: booking.departureDate, daysUntilDeparture };
    }
    if (tripLifecycle === 'DEPARTING_TODAY') {
      return { canCancel: false, tripLifecycle, cancelUnavailableReason: 'Tour khoi hanh hom nay, khong the huy online.', refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Khong ho tro huy online vao ngay khoi hanh.', policyTier: 'NOT_CANCELABLE', departureDate: booking.departureDate, daysUntilDeparture };
    }
    if (tripLifecycle === 'COMPLETED') {
      return { canCancel: false, tripLifecycle, cancelUnavailableReason: 'Chuyen di da hoan thanh.', refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Chuyen di da hoan thanh, khong the huy booking.', policyTier: 'NOT_CANCELABLE', departureDate: booking.departureDate, daysUntilDeparture };
    }
    if (booking.paymentStatus !== 'PAID') {
      return { canCancel: true, tripLifecycle, refundPercent: 0, estimatedRefundAmount: 0, refundNote: 'Chua thanh toan - khong co khoan hoan tien.', policyTier: 'UNPAID', departureDate: booking.departureDate, daysUntilDeparture };
    }

    const hoursSinceBooking = moment().diff(moment(booking.createdAt), 'hours', true);
    let refundPercent = 0;
    let refundNote = 'Khong hoan tien (huy duoi 3 ngay truoc khoi hanh).';
    let policyTier: CancellationPolicyTier = 'NO_REFUND';

    if (hoursSinceBooking <= 24) {
      refundPercent = 100; refundNote = 'Hoan 100% do huy trong 24h sau khi dat.'; policyTier = 'FULL_REFUND_24H';
    } else if (daysUntilDeparture >= 7) {
      refundPercent = 80; refundNote = 'Hoan 80% do huy truoc ngay khoi hanh tu 7 ngay tro len.'; policyTier = 'EIGHTY_REFUND';
    } else if (daysUntilDeparture >= 3) {
      refundPercent = 50; refundNote = 'Hoan 50% do huy truoc ngay khoi hanh tu 3 den duoi 7 ngay.'; policyTier = 'HALF_REFUND';
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
    if (!booking) throw new NotFoundException('Booking khong ton tai');
    if (booking.userId !== userId) throw new BadRequestException('Khong co quyen huy booking nay');
    if (booking.status === 'CANCELLED') throw new BadRequestException('Booking nay da duoc huy truoc do');
    if (booking.status === 'CANCEL_REQUESTED') throw new BadRequestException('Yeu cau huy cua ban dang cho xu ly');

    const cancellationPolicy = await this.getCancellationPolicyForBooking(booking);
    if (!cancellationPolicy.canCancel) throw new BadRequestException(cancellationPolicy.cancelUnavailableReason ?? 'Khong the huy booking nay.');

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
          seats: booking.numberOfPeople,
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
        data: { status: 'CANCELLED', paymentStatus: 'FAILED', cancelledAt: new Date(), cancelledBy: 'ADMIN', refundNote: adminNote || booking.refundNote, refundedAt: new Date() },
      });
      await releaseSeats(tx, {
        tourId: booking.tourId,
        departureId: booking.departureId,
        seats: booking.numberOfPeople,
      });
    });

    if (refundAmount > 0) {
      await this.prisma.paymentTransaction.create({
        data: { bookingId, gateway: 'MANUAL', amount: refundAmount, status: 'PENDING', transactionRef: `REFUND-${bookingId}-${Date.now()}` },
      });
    }

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

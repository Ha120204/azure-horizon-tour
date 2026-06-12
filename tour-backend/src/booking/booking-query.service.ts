import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { BookingCancellationService } from './booking-cancellation.service';
import {
  calculateBookingHoldExpiresAt,
  getErrorMessage,
  isBookingStatus,
  isPaymentStatus,
  isPayosDuplicateError,
  PAYOS_HOLD_MINUTES,
} from './helpers/booking-helpers';
import type { CancellationPolicy } from './types';

// Stream type for image proxy
type ProxiedStream = Readable & { pipe(destination: Response): Response };
type CustomerVoucherStatus = 'PENDING_PAYMENT' | 'ISSUED' | 'CANCELLED' | 'NOT_AVAILABLE';
type CustomerRefundStatus = 'NONE' | 'NOT_REQUIRED' | 'REQUESTED' | 'PROCESSING' | 'REFUNDED';

@Injectable()
export class BookingQueryService {
  private readonly logger = new Logger(BookingQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly httpService: HttpService,
    private readonly cancellationService: BookingCancellationService,
  ) {}

  private getCustomerVoucherStatus(booking: {
    status: BookingStatus;
    paymentStatus: PaymentStatus;
  }): CustomerVoucherStatus {
    if (booking.status === 'CANCELLED' || booking.status === 'CANCEL_REQUESTED') {
      return 'CANCELLED';
    }
    if (booking.status === 'CONFIRMED' && booking.paymentStatus === 'PAID') {
      return 'ISSUED';
    }
    if (booking.status === 'PENDING') {
      return 'PENDING_PAYMENT';
    }
    return 'NOT_AVAILABLE';
  }

  private getCustomerRefundStatus(booking: {
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    refundAmount?: number | Prisma.Decimal | null;
    refundedAt?: Date | null;
  }): CustomerRefundStatus {
    if (booking.refundedAt) return 'REFUNDED';
    if (booking.status === 'CANCEL_REQUESTED') return 'REQUESTED';
    if (booking.status !== 'CANCELLED') return 'NONE';

    const refundAmount =
      booking.refundAmount == null ? 0 : Number(booking.refundAmount);
    if (refundAmount > 0) return 'PROCESSING';
    return 'NOT_REQUIRED';
  }

  private async replacePendingPayosTransaction(
    bookingId: number,
    transactionRef: string,
    amount: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const reusablePending = await tx.paymentTransaction.findFirst({
        where: {
          bookingId,
          gateway: 'PAYOS',
          status: 'PENDING',
          transactionRef,
        },
        select: { id: true },
      });

      await tx.paymentTransaction.updateMany({
        where: {
          bookingId,
          gateway: 'PAYOS',
          status: 'PENDING',
          ...(reusablePending ? { id: { not: reusablePending.id } } : {}),
        },
        data: {
          status: 'FAILED',
          confirmedNote: 'Superseded by a newer PayOS payment link',
        },
      });

      if (reusablePending) return;

      await tx.paymentTransaction.create({
        data: {
          bookingId,
          gateway: 'PAYOS',
          transactionRef,
          amount,
          status: 'PENDING',
        },
      });
    });
  }

  // ─── Private formatting helpers ────────────────────────────────────────────

  private toCustomerBookingDetail(
    booking: {
      id: number; bookingCode: string; status: BookingStatus; paymentStatus: PaymentStatus;
      paymentMethod: string; createdAt: Date; numberOfPeople: number;
      holdExpiresAt?: Date | null;
      totalPrice: number | Prisma.Decimal; cancelReason?: string | null;
      cancelRequestedAt?: Date | null; cancelledAt?: Date | null;
      refundAmount?: number | Prisma.Decimal | null; refundNote?: string | null;
      unitPriceAtBooking?: number | null;
      discountAmount?: number | Prisma.Decimal | null;
      voucherCode?: string | null;
      departureId?: number | null;
      tour: { id: number; name: string; tourCode: string; imageUrl?: string | null; duration?: string | null; startDate: Date };
    },
    cancellationPolicy: CancellationPolicy,
  ) {
    return {
      id: booking.id, bookingCode: booking.bookingCode, status: booking.status,
      paymentStatus: booking.paymentStatus, paymentMethod: booking.paymentMethod,
      createdAt: booking.createdAt, holdExpiresAt: booking.holdExpiresAt ?? null,
      numberOfPeople: booking.numberOfPeople,
      totalPrice: Number(booking.totalPrice),
      unitPriceAtBooking: booking.unitPriceAtBooking == null ? null : Number(booking.unitPriceAtBooking),
      discountAmount: Number(booking.discountAmount ?? 0),
      voucherCode: booking.voucherCode ?? null,
      cancelReason: booking.cancelReason ?? null,
      cancelRequestedAt: booking.cancelRequestedAt ?? null,
      cancelledAt: booking.cancelledAt ?? null,
      refundAmount: booking.refundAmount == null ? null : Number(booking.refundAmount),
      refundNote: booking.refundNote ?? null,
      cancellationPolicy,
      tour: {
        id: booking.tour.id, name: booking.tour.name, tourCode: booking.tour.tourCode,
        imageUrl: booking.tour.imageUrl ?? null, duration: booking.tour.duration ?? null,
        startDate: booking.tour.startDate,
      },
    };
  }

  async toETicketDto(booking: {
    id: number; bookingCode: string; status: BookingStatus; paymentStatus: PaymentStatus;
    paymentMethod: string; createdAt: Date; numberOfPeople: number;
    holdExpiresAt?: Date | null;
    totalPrice: number | Prisma.Decimal; departureId?: number | null;
    user: { fullName: string };
    tour: { id: number; name: string; imageUrl?: string | null; startDate: Date; duration?: string | null };
  }) {
    const departureDate = await this.cancellationService.resolveBookingDepartureDate(booking);
    return {
      id: booking.id, bookingCode: booking.bookingCode, status: booking.status,
      paymentStatus: booking.paymentStatus, paymentMethod: booking.paymentMethod,
      createdAt: booking.createdAt, holdExpiresAt: booking.holdExpiresAt ?? null,
      numberOfPeople: booking.numberOfPeople,
      totalPrice: Number(booking.totalPrice),
      leadTravelerName: booking.user.fullName, user: { fullName: booking.user.fullName },
      tour: {
        id: booking.tour.id, name: booking.tour.name,
        imageUrl: booking.tour.imageUrl ?? null,
        startDate: departureDate, duration: booking.tour.duration ?? null,
      },
    };
  }

  // ─── Customer-facing queries ───────────────────────────────────────────────

  async getMyBookings(userId: number) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true, bookingCode: true, status: true, paymentStatus: true,
        paymentMethod: true, holdExpiresAt: true,
        createdAt: true, numberOfPeople: true, totalPrice: true,
        departureId: true,
        cancelRequestedAt: true, cancelledAt: true,
        refundAmount: true, refundNote: true, refundedAt: true,
        tour: {
          select: {
            id: true,
            name: true,
            tourCode: true,
            imageUrl: true,
            startDate: true,
            departurePoint: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const departureIds = bookings
      .map((booking) => booking.departureId)
      .filter((id): id is number => typeof id === 'number');
    const departures =
      departureIds.length > 0
        ? await this.prisma.tourDeparture.findMany({
            where: { id: { in: departureIds } },
            select: {
              id: true,
              departureDate: true,
              transport: {
                select: {
                  boardingPoint: true,
                  boardingTime: true,
                  departureTime: true,
                },
              },
            },
          })
        : [];
    const departureMap = new Map(
      departures.map((departure) => [departure.id, departure]),
    );

    return bookings.map((b) => {
      const departure = b.departureId
        ? departureMap.get(b.departureId)
        : undefined;
      return {
        ...b,
        departureDate: departure?.departureDate ?? b.tour.startDate,
        meetingTime:
          departure?.transport?.boardingTime ??
          departure?.transport?.departureTime ??
          null,
        pickupLocation:
          departure?.transport?.boardingPoint ?? b.tour.departurePoint ?? null,
        voucherStatus: this.getCustomerVoucherStatus(b),
        refundStatus: this.getCustomerRefundStatus(b),
        totalPrice: Number(b.totalPrice),
        refundAmount:
          b.refundAmount == null ? null : Number(b.refundAmount),
      };
    });
  }

  async getMyBookingById(bookingId: number, userId: number) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId, deletedAt: null },
      select: {
        id: true, bookingCode: true, status: true, paymentStatus: true, paymentMethod: true,
        holdExpiresAt: true,
        createdAt: true, numberOfPeople: true, totalPrice: true, cancelReason: true,
        cancelRequestedAt: true, cancelledAt: true, refundAmount: true, refundNote: true,
        unitPriceAtBooking: true, discountAmount: true, voucherCode: true,
        departureId: true, contactInfo: true, passengers: true,
        user: { select: { fullName: true, email: true, phone: true } },
        tour: { select: { id: true, name: true, tourCode: true, imageUrl: true, duration: true, startDate: true, departurePoint: true } },
        transactions: {
          select: { id: true, gateway: true, transactionRef: true, amount: true, status: true, confirmedSource: true, confirmedAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' }, take: 5,
        },
        supportTickets: {
          where: { category: 'payment' },
          select: { id: true, status: true, subject: true, createdAt: true },
          orderBy: { createdAt: 'desc' }, take: 3,
        },
        transportAssignment: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const cancellationPolicy = await this.cancellationService.getCancellationPolicyForBooking(booking);
    const base = this.toCustomerBookingDetail(booking, cancellationPolicy);
    const departure = booking.departureId
      ? await this.prisma.tourDeparture.findUnique({
          where: { id: booking.departureId },
          select: {
            departureDate: true,
            transport: {
              select: {
                type: true,
                airline: true,
                flightCode: true,
                departureAirport: true,
                arrivalAirport: true,
                boardingPoint: true,
                boardingTime: true,
                departureTime: true,
                arrivalTime: true,
                vehicleType: true,
                operator: true,
                notes: true,
              },
            },
          },
        })
      : null;
    return {
      ...base,
      departureDate: departure?.departureDate ?? booking.tour.startDate,
      meetingTime:
        departure?.transport?.boardingTime ??
        departure?.transport?.departureTime ??
        null,
      pickupLocation:
        departure?.transport?.boardingPoint ?? booking.tour.departurePoint ?? null,
      departureTransport: departure?.transport ?? null,
      contactInfo: booking.contactInfo ?? null,
      passengers: booking.passengers ?? null,
      user: booking.user,
      transactions: booking.transactions.map(t => ({ ...t, amount: Number(t.amount) })),
      supportTickets: booking.supportTickets,
      transportAssignment: booking.transportAssignment ?? null,
    };
  }

  async findMyByBookingCode(bookingCode: string, userId: number) {
    const booking = await this.prisma.booking.findFirst({
      where: { bookingCode, userId, deletedAt: null },
      select: {
        id: true, bookingCode: true, status: true, paymentStatus: true, paymentMethod: true,
        holdExpiresAt: true,
        createdAt: true, numberOfPeople: true, totalPrice: true, departureId: true,
        user: { select: { fullName: true } },
        tour: { select: { id: true, name: true, imageUrl: true, startDate: true, duration: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.toETicketDto(booking);
  }

  async retryPayment(bookingId: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { tour: true } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Khong co quyen truy cap booking nay');
    if (booking.status !== 'PENDING' || booking.paymentStatus !== 'UNPAID')
      throw new BadRequestException('Booking nay khong o trang thai cho thanh toan');

    const now = new Date();
    let expiryTime = booking.holdExpiresAt ?? new Date(booking.createdAt.getTime() + PAYOS_HOLD_MINUTES * 60 * 1000);
    if (expiryTime.getTime() <= now.getTime())
      throw new BadRequestException('Booking da het han thanh toan. Vui long dat tour moi.');
    if (booking.paymentMethod !== 'PAYOS') {
      const departureDate = await this.cancellationService.resolveBookingDepartureDate(booking);
      expiryTime = calculateBookingHoldExpiresAt({
        paymentMethod: 'PAYOS',
        departureDate,
        now,
      });
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { paymentMethod: 'PAYOS', holdExpiresAt: expiryTime },
      });
    }

    const amountVND = Math.round(booking.totalPrice);
    const description = `AH ${booking.bookingCode}`;
    const timeSuffix = (Date.now() % 1000000).toString().padStart(6, '0');
    const orderCode = Number(booking.id.toString() + timeSuffix);

    let paymentData: { checkoutUrl: string; qrCode?: string; accountNumber?: string; accountName?: string; bin?: string };
    try {
      paymentData = await this.paymentService.createPaymentRequest(orderCode, amountVND, description);
    } catch (payosError: unknown) {
      if (isPayosDuplicateError(payosError)) {
        this.logger.warn('[RETRY] PayOS order already exists, reusing checkout URL.');
        const existing = await this.paymentService.getPaymentInfo(orderCode);
        if (!existing?.id) throw new BadRequestException('Khong the lay lien ket thanh toan. Vui long dat tour moi.');
        paymentData = { checkoutUrl: `https://pay.payos.vn/web/${existing.id}` };
      } else {
        throw payosError;
      }
    }

    await this.replacePendingPayosTransaction(booking.id, String(orderCode), amountVND);

    this.logger.log(`[RETRY] Payment link recreated for bookingId=${booking.id}`);
    return {
      checkoutUrl: paymentData.checkoutUrl,
      qrCode: paymentData.qrCode,
      accountNumber: paymentData.accountNumber,
      accountName: paymentData.accountName,
      description,
      amount: amountVND,
      expiresAt: expiryTime.toISOString(),
    };
  }

  async findPublicByBookingCode(bookingCode: string, email: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { bookingCode, deletedAt: null },
      select: {
        id: true, bookingCode: true, status: true, paymentStatus: true,
        paymentMethod: true, holdExpiresAt: true,
        numberOfPeople: true, totalPrice: true, departureId: true,
        contactInfo: true, passengers: true, discountAmount: true, voucherCode: true, createdAt: true,
        user: { select: { fullName: true, email: true } },
        tour: { select: { id: true, name: true, imageUrl: true, startDate: true, duration: true, tourCode: true, departurePoint: true } },
      },
    });
    if (!booking) throw new NotFoundException('Khong tim thay don dat tour');

    const contactInfo = booking.contactInfo as { email?: string } | null;
    const contactEmail = contactInfo?.email ? String(contactInfo.email) : null;
    const userEmail = booking.user?.email;

    if (
      (!contactEmail || contactEmail.toLowerCase() !== email.toLowerCase()) &&
      (!userEmail || userEmail.toLowerCase() !== email.toLowerCase())
    ) {
      throw new ForbiddenException('Thong tin xac thuc khong chinh xac');
    }

    const departure = booking.departureId
      ? await this.prisma.tourDeparture.findUnique({
          where: { id: booking.departureId },
          select: {
            departureDate: true,
            transport: {
              select: {
                type: true,
                airline: true,
                flightCode: true,
                departureAirport: true,
                arrivalAirport: true,
                boardingPoint: true,
                boardingTime: true,
                departureTime: true,
                arrivalTime: true,
                vehicleType: true,
                operator: true,
                notes: true,
              },
            },
          },
        })
      : null;

    return {
      ...booking,
      departureDate: departure?.departureDate ?? booking.tour.startDate,
      meetingTime:
        departure?.transport?.boardingTime ??
        departure?.transport?.departureTime ??
        null,
      pickupLocation:
        departure?.transport?.boardingPoint ?? booking.tour.departurePoint ?? null,
      departureTransport: departure?.transport ?? null,
    };
  }

  async publicRetryPayment(bookingCode: string, email: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { bookingCode, deletedAt: null },
      include: { user: true, tour: { select: { startDate: true } } },
    });
    if (!booking) throw new NotFoundException('Khong tim thay don dat tour');

    const contactInfo = booking.contactInfo as { email?: string } | null;
    const contactEmail = contactInfo?.email ? String(contactInfo.email) : null;
    const userEmail = booking.user?.email;

    if (
      (!contactEmail || contactEmail.toLowerCase() !== email.toLowerCase()) &&
      (!userEmail || userEmail.toLowerCase() !== email.toLowerCase())
    ) {
      throw new ForbiddenException('Thong tin xac thuc khong chinh xac');
    }

    if (booking.status !== 'PENDING' || booking.paymentStatus !== 'UNPAID')
      throw new BadRequestException('Booking nay khong o trang thai cho thanh toan');

    const now = new Date();
    let expiryTime = booking.holdExpiresAt ?? new Date(booking.createdAt.getTime() + PAYOS_HOLD_MINUTES * 60 * 1000);
    if (expiryTime.getTime() <= now.getTime())
      throw new BadRequestException('Booking da het han thanh toan. Vui long dat tour moi.');
    if (booking.paymentMethod !== 'PAYOS') {
      const departureDate = await this.cancellationService.resolveBookingDepartureDate(booking);
      expiryTime = calculateBookingHoldExpiresAt({
        paymentMethod: 'PAYOS',
        departureDate,
        now,
      });
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { paymentMethod: 'PAYOS', holdExpiresAt: expiryTime },
      });
    }

    const amountVND = Math.round(booking.totalPrice);
    const description = `AH ${booking.bookingCode}`;
    const timeSuffix = (Date.now() % 1000000).toString().padStart(6, '0');
    const orderCode = Number(booking.id.toString() + timeSuffix);

    let checkoutUrl: string;
    try {
      checkoutUrl = await this.paymentService.createPaymentLink(orderCode, amountVND, description);
    } catch (payosError: unknown) {
      if (isPayosDuplicateError(payosError)) {
        this.logger.warn('[PUBLIC-RETRY] PayOS order already exists, reusing checkout URL.');
        const existing = await this.paymentService.getPaymentInfo(orderCode);
        if (!existing?.id) throw new BadRequestException('Khong the lay lien ket thanh toan. Vui long dat tour moi.');
        checkoutUrl = `https://pay.payos.vn/web/${existing.id}`;
      } else {
        throw payosError;
      }
    }

    await this.replacePendingPayosTransaction(booking.id, String(orderCode), amountVND);

    this.logger.log(`[PUBLIC-RETRY] Payment link recreated for bookingId=${booking.id}`);
    return { checkoutUrl, expiresAt: expiryTime.toISOString() };
  }

  // ─── Admin queries ─────────────────────────────────────────────────────────

  async getAllBookings(
    status?: string, paymentStatus?: string, search?: string,
    dateFrom?: string, dateTo?: string, page = 1, limit = 10,
    paymentMethod?: 'PAYOS' | 'IN_STORE',
    needsReconciliation = false,
    departureFrom?: string,
    departureTo?: string,
    needsCustomerCall = false,
  ) {
    const where: Prisma.BookingWhereInput = { deletedAt: null };
    const andFilters: Prisma.BookingWhereInput[] = [];

    if (status && status !== 'ALL') {
      const normalizedStatus = status.toUpperCase();
      if (!isBookingStatus(normalizedStatus)) throw new BadRequestException('Invalid booking status');
      where.status = normalizedStatus as BookingStatus;
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      const normalizedPaymentStatus = paymentStatus.toUpperCase();
      if (!isPaymentStatus(normalizedPaymentStatus)) throw new BadRequestException('Invalid payment status');
      where.paymentStatus = normalizedPaymentStatus as PaymentStatus;
    }
    // ── Filter mới: phương thức thanh toán ────────────────────────────────────
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }
    // ── Filter mới: chỉ đơn PayOS đang chờ đối soát (có support ticket payment open) ─
    if (needsReconciliation) {
      where.paymentMethod = 'PAYOS';
      where.paymentStatus = { in: ['UNPAID', 'PROCESSING'] };
      where.supportTickets = {
        some: {
          category: 'payment',
          status: { in: ['NEW', 'IN_PROGRESS'] },
        },
      };
    }
    if (needsCustomerCall) {
      where.status = 'PENDING';
      where.paymentStatus = 'UNPAID';
    }
    // ────────────────────────────────────────────────────────────────────────
    if (search) {
      where.OR = [
        { bookingCode: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { tour: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (dateFrom || dateTo) {
      const createdAt: Prisma.DateTimeFilter<'Booking'> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); createdAt.lte = end; }
      where.createdAt = createdAt;
    }
    if (departureFrom || departureTo) {
      const departureDate: Prisma.DateTimeFilter<'TourDeparture'> = {};
      const tourStartDate: Prisma.DateTimeFilter<'Tour'> = {};
      if (departureFrom) {
        const start = new Date(departureFrom);
        departureDate.gte = start;
        tourStartDate.gte = start;
      }
      if (departureTo) {
        const end = new Date(departureTo);
        end.setHours(23, 59, 59, 999);
        departureDate.lte = end;
        tourStartDate.lte = end;
      }
      const matchingDepartures = await this.prisma.tourDeparture.findMany({
        where: { departureDate },
        select: { id: true },
      });
      const departureIds = matchingDepartures.map(departure => departure.id);
      andFilters.push({
        OR: [
          ...(departureIds.length > 0 ? [{ departureId: { in: departureIds } }] : []),
          { departureId: null, tour: { startDate: tourStartDate } },
        ],
      });
    }
    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          tour: { select: { id: true, name: true, imageUrl: true, tourCode: true, startDate: true, destination: { select: { name: true } } } },
          user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
          notifications: { where: { type: 'PAYMENT_REQUEST' }, orderBy: { createdAt: 'desc' }, take: 1 },
          transactions: {
            select: {
              id: true, gateway: true, transactionRef: true, amount: true, status: true,
              confirmedSource: true, confirmedById: true, confirmedAt: true,
              confirmedNote: true, evidenceUrl: true, createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          supportTickets: {
            where: { category: 'payment' },
            select: { id: true, status: true, category: true, subject: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          transportAssignment: true,
        },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    const [globalStats, paymentStats, revenueResult, assistedDraftStats] = await Promise.all([
      this.prisma.booking.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { status: true } }),
      this.prisma.booking.groupBy({ by: ['paymentStatus'], where: { deletedAt: null }, _count: { paymentStatus: true } }),
      this.prisma.booking.aggregate({ where: { deletedAt: null, paymentStatus: 'PAID' }, _sum: { totalPrice: true }, _count: { id: true } }),
      this.prisma.assistedBookingDraft.groupBy({ by: ['status'], _count: { status: true } }),
    ]);

    const statsMap: Record<string, number> = {};
    for (const s of globalStats) statsMap[s.status] = s._count.status;
    const paymentMap: Record<string, number> = {};
    for (const s of paymentStats) paymentMap[s.paymentStatus] = s._count.paymentStatus;
    const assistedDraftMap: Record<string, number> = {};
    for (const s of assistedDraftStats) assistedDraftMap[s.status] = s._count.status;
    const departureIds = bookings
      .map(booking => booking.departureId)
      .filter((id): id is number => typeof id === 'number');
    const departures = departureIds.length > 0
      ? await this.prisma.tourDeparture.findMany({
          where: { id: { in: departureIds } },
          select: { id: true, departureDate: true },
        })
      : [];
    const departureMap = new Map(departures.map(departure => [departure.id, departure.departureDate]));

    return {
      bookings: bookings.map((b) => {
        const contactInfo = b.contactInfo && typeof b.contactInfo === 'object' && !Array.isArray(b.contactInfo)
          ? b.contactInfo as Record<string, unknown>
          : {};
        return {
          ...b,
          contactPhone: typeof contactInfo.phone === 'string' ? contactInfo.phone : b.user.phone ?? null,
          adminNote: typeof contactInfo.adminNote === 'string' ? contactInfo.adminNote : null,
          departureDate: b.departureId ? departureMap.get(b.departureId) ?? b.tour.startDate : b.tour.startDate,
          totalPrice: Number(b.totalPrice),
          unitPriceAtBooking: Number(b.unitPriceAtBooking),
          discountAmount: Number(b.discountAmount),
        };
      }),
      stats: {
        pending: statsMap['PENDING'] || 0, confirmed: statsMap['CONFIRMED'] || 0,
        cancelRequested: statsMap['CANCEL_REQUESTED'] || 0, cancelled: statsMap['CANCELLED'] || 0,
        total: Object.values(statsMap).reduce((a, b) => a + b, 0),
        totalRevenue: Number(revenueResult._sum.totalPrice || 0), paidCount: revenueResult._count.id,
        unpaidCount: paymentMap['UNPAID'] || 0, processingCount: paymentMap['PROCESSING'] || 0,
        failedPaymentCount: paymentMap['FAILED'] || 0,
        assistedDraftPending: assistedDraftMap['PENDING_APPROVAL'] || 0,
        assistedDraftNeedsRevision: assistedDraftMap['NEEDS_REVISION'] || 0,
      },
      meta: { totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, itemsPerPage: limit },
    };
  }

  async getBookingById(bookingId: number) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, tour: true },
    });
  }

  async findByBookingCode(bookingCode: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: { tour: true, user: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private static readonly ALLOWED_IMAGE_HOSTS = new Set([
    'images.unsplash.com',
    'res.cloudinary.com',
    'flagcdn.com',
    'api.vietqr.io',
    'i.pravatar.cc',
    'lh3.googleusercontent.com',
  ]);

  async proxyImage(imageUrl: string, res: Response) {
    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      throw new BadRequestException('URL ảnh không hợp lệ');
    }

    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('Chỉ hỗ trợ URL https');
    }

    if (!BookingQueryService.ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
      throw new BadRequestException('Domain ảnh không được phép');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<ProxiedStream>(imageUrl, { responseType: 'stream' }),
      );
      res.setHeader('Access-Control-Allow-Origin', '*');
      const contentType: unknown = response.headers['content-type'];
      res.setHeader('Content-Type', typeof contentType === 'string' ? contentType : 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      response.data.pipe(res);
    } catch (error) {
      this.logger.error('Loi khi proxy anh:', getErrorMessage(error));
      throw new NotFoundException('Failed to proxy image');
    }
  }
}

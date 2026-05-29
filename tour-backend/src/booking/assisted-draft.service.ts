import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  AssistedDraftStatus,
  Prisma,
  type TourDeparture,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { VoucherService } from '../voucher/voucher.service';
import { MailService } from '../mail/mail.service';
import { PaymentService, type PaymentLinkResult } from '../payment/payment.service';
import { CreateAssistedBookingDraftDto } from './dto/create-assisted-booking-draft.dto';
import type {
  TransactionClient,
  AssistedQuoteDto,
  AssistedQuote,
  AssistedDraftRecord,
  AssistedCustomerDraft,
  PaymentNotificationPayload,
} from './types';
import {
  asPassengerInputs,
  normalizePassengers,
  isAssistedDraftStatus,
  getPassengerTotal,
  formatMoney,
  getPassengerBreakdown,
  generateBookingCode,
  generateAssistedDraftCode,
  buildPayosOrderCode,
  buildPaymentRequestContent,
  calculateBookingHoldExpiresAt,
  assertVoucherAllowedForDeparture,
  getErrorMessage,
  PAYOS_HOLD_MINUTES,
  reserveSeatsAtomically,
} from './helpers/booking-helpers';

type AssistedDraftValidationSource = {
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerIdentityNo?: string | null;
  confirmationChannel?: string | null;
  emailForTicket?: string | null;
  tourId?: number | null;
  departureId?: number | null;
  numberOfPeople?: number | null;
  tour?: { departures?: Array<{ id: number }> | null } | null;
};

@Injectable()
export class AssistedDraftService {
  private readonly logger = new Logger(AssistedDraftService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly voucherService: VoucherService,
    private readonly mailService: MailService,
    private readonly paymentService: PaymentService,
  ) {}

  // ─── Private helpers ───────────────────────────────────────────────────────

  private assistedDraftInclude(): Prisma.AssistedBookingDraftInclude {
    return {
      tour: {
        select: {
          id: true, name: true, imageUrl: true, tourCode: true,
          destination: { select: { name: true } },
        },
      },
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      createdByStaff: { select: { id: true, fullName: true, email: true, role: true } },
      reviewedByAdmin: { select: { id: true, fullName: true, email: true, role: true } },
      convertedBooking: { select: { id: true, bookingCode: true, status: true, paymentStatus: true } },
      sourceTicket: { select: { id: true, subject: true, customerName: true, customerEmail: true } },
    };
  }

  private formatAssistedDraft<T extends AssistedDraftRecord>(draft: T) {
    return {
      ...draft,
      quotedPrice: Number(draft.quotedPrice),
      unitPriceAtDraft: draft.unitPriceAtDraft == null ? null : Number(draft.unitPriceAtDraft),
      discountAmount: Number(draft.discountAmount || 0),
    };
  }

  private assertAssistedDraftReadyForApproval(draft: AssistedDraftValidationSource) {
    if (!draft.customerName?.trim()) throw new BadRequestException('Customer name is required before approval');
    if (!draft.customerEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.customerEmail))
      throw new BadRequestException('Valid customer email is required');
    if (!draft.customerPhone?.trim()) throw new BadRequestException('Customer phone is required');
    if (!/^(0|\+84)(\d{9})$/.test(draft.customerPhone.trim().replace(/\s+/g, '')))
      throw new BadRequestException('Valid Vietnamese customer phone is required');
    if (!draft.customerIdentityNo?.trim()) throw new BadRequestException('Customer CCCD is required');
    if (!/^\d{12}$/.test(draft.customerIdentityNo.trim())) throw new BadRequestException('Customer CCCD must be 12 digits');
    const confirmationChannel = String(draft.confirmationChannel || 'ZALO').toUpperCase();
    if (!['ZALO', 'EMAIL', 'PHONE', 'MANUAL'].includes(confirmationChannel))
      throw new BadRequestException('Invalid confirmation channel');
    if (confirmationChannel === 'EMAIL' && !draft.emailForTicket?.trim() && !draft.customerEmail?.trim())
      throw new BadRequestException('Email is required when confirmation channel is email');
    if (!draft.tourId) throw new BadRequestException('Tour is required before approval');
    if (!draft.numberOfPeople || draft.numberOfPeople < 1) throw new BadRequestException('Number of people must be at least 1');
    if ((draft.tour?.departures?.length ?? 0) > 0 && !draft.departureId)
      throw new BadRequestException('Departure is required before approval');
  }

  async calculateAssistedQuote(tx: TransactionClient, dto: AssistedQuoteDto): Promise<AssistedQuote> {
    const tour = await tx.tour.findUnique({ where: { id: dto.tourId, deletedAt: null } });
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.startDate < new Date()) throw new BadRequestException('Tour nay da dien ra, khong the tao dat ho');

    let selectedDeparture: TourDeparture | null = null;
    if (dto.departureId) {
      selectedDeparture = await tx.tourDeparture.findUnique({ where: { id: dto.departureId } });
      if (!selectedDeparture || selectedDeparture.tourId !== tour.id || !selectedDeparture.isActive)
        throw new BadRequestException('Invalid departure');
      if (selectedDeparture.availableSeats < dto.numberOfPeople)
        throw new BadRequestException('Not enough seats for this departure');
    } else if (tour.availableSeats < dto.numberOfPeople) {
      throw new BadRequestException('Not enough seats available');
    }

    let basePrice = selectedDeparture?.price ?? tour.price;
    if (dto.packageId) {
      const pkg = await tx.tourPackage.findUnique({ where: { id: dto.packageId } });
      if (!pkg || pkg.tourId !== tour.id || !pkg.isActive) throw new BadRequestException('Invalid tour package');
      basePrice += pkg.price;
    }

    let totalPrice = getPassengerTotal(basePrice, dto.numberOfPeople, dto.passengers);
    let discountAmount = 0;
    let voucherCode: string | null = null;

    if (dto.voucherCode) {
      assertVoucherAllowedForDeparture(selectedDeparture, dto.voucherCode, tour.price);
      const result = await this.voucherService.validateVoucher(
        dto.voucherCode, totalPrice,
        { tourId: tour.id, departureId: selectedDeparture?.id ?? null },
      );
      discountAmount = result.discountAmount;
      totalPrice = result.finalPrice;
      voucherCode = dto.voucherCode.trim().toUpperCase();
    }

    return { tour, basePrice, totalPrice, discountAmount, voucherCode };
  }

  /**
   * Chạy TRƯỚC transaction — kiểm tra xem có cần tạo guest user mới không.
   * Nếu cần, hash password ngay ở đây để bcrypt.hash() không chiếm giờ DB transaction.
   *
   * @returns hash chuẩn bị sẵn nếu cần tạo user mới, hoặc `null` nếu không cần.
   */
  private async prepareGuestPassword(
    draft: Pick<AssistedCustomerDraft, 'customerId' | 'customerEmail'>,
  ): Promise<string | null> {
    // Trường hợp 1: đã có customerId — không tạo user mới
    if (draft.customerId) return null;

    const email = String(draft.customerEmail || '').trim().toLowerCase();

    // Trường hợp 2: email đã tồn tại — sẽ update, không tạo mới
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) return null;

    // Trường hợp 3: cần tạo guest user mới — hash người gưới NGOÀI transaction
    const password = randomBytes(24).toString('hex');
    return bcrypt.hash(password, 10);
  }

  /**
   * Tìm hoặc tạo customer cho assisted booking — CHẠY TRONG transaction.
   *
   * Nhận `prehashedPassword` đã được tính sẵn từ trước để tránh gọi bcrypt
   * bên trong transaction (bcrypt là CPU-intensive, giữ DB connection lâu không cần thiết).
   */
  private async findOrCreateAssistedCustomer(
    tx: TransactionClient,
    draft: AssistedCustomerDraft,
    prehashedPassword: string | null,
  ) {
    if (draft.customerId) {
      const user = await tx.user.findUnique({ where: { id: draft.customerId } });
      if (!user) throw new NotFoundException('Customer not found');
      return user;
    }
    const email = String(draft.customerEmail || '').trim().toLowerCase();
    const existing = await tx.user.findFirst({ where: { email } });
    if (existing) {
      return tx.user.update({
        where: { id: existing.id },
        data: {
          phone: draft.customerPhone || existing.phone,
          identityType: draft.customerIdentityNo ? 'CCCD' : existing.identityType,
          identityNo: draft.customerIdentityNo || existing.identityNo,
        },
      });
    }

    // Tại đây prehashedPassword được đảm bảo không null vì prepareGuestPassword()
    // đã được gọi trước với cùng điều kiện. Nếu vì lý do bất thường null được truyền vào,
    // fallback về tạo hash tại chỗ để không crash.
    const hashedPassword = prehashedPassword ?? await bcrypt.hash(randomBytes(24).toString('hex'), 10);

    return tx.user.create({
      data: {
        email, password: hashedPassword,
        fullName: draft.customerName ?? email,
        phone: draft.customerPhone || null,
        identityType: draft.customerIdentityNo ? 'CCCD' : null,
        identityNo: draft.customerIdentityNo || null,
        role: 'CUSTOMER',
      },
    });
  }

  async markVoucherAsUsed(tx: TransactionClient, userId: number, voucherCode?: string | null) {
    const code = voucherCode?.trim().toUpperCase();
    if (!code) return;
    const voucher = await tx.voucher.findUnique({ where: { code } });
    if (!voucher) return;
    const result = await tx.voucher.updateMany({
      where: { id: voucher.id, usedCount: { lt: voucher.maxUses } },
      data: { usedCount: { increment: 1 } },
    });
    if (result.count === 0) {
      this.logger.warn(`[VOUCHER] Voucher ${code} da het luot khi booking thanh toan thanh cong.`);
      return;
    }
    await tx.userVoucher.updateMany({
      where: { userId, voucherId: voucher.id, isUsed: false },
      data: { isUsed: true },
    });
  }

  private async replacePendingPayosTransaction(
    bookingId: number,
    transactionRef: string,
    amount: number,
    rawPayload?: string,
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
          confirmedNote: 'Superseded by a newer PayOS payment request',
        },
      });

      if (reusablePending) {
        await tx.paymentTransaction.update({
          where: { id: reusablePending.id },
          data: { amount, rawPayload },
        });
        return;
      }

      await tx.paymentTransaction.create({
        data: {
          bookingId,
          gateway: 'PAYOS',
          transactionRef,
          amount,
          status: 'PENDING',
          rawPayload,
        },
      });
    });
  }

  async createPaymentRequestForBooking(bookingId: number, actorUserId?: number, forceEmail = false) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        tour: { select: { id: true, name: true, startDate: true, duration: true } },
        assistedDraft: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.paymentStatus === 'PAID') throw new BadRequestException('Booking da thanh toan');
    if (booking.paymentMethod !== 'PAYOS') {
      throw new BadRequestException('Don tai quay khong tao link PayOS. Hay doi phuong thuc sang PayOS truoc khi gui lai yeu cau thanh toan.');
    }
    const holdExpiresAt = booking.holdExpiresAt ?? new Date(Date.now() + PAYOS_HOLD_MINUTES * 60 * 1000);
    if (holdExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Booking da het han thanh toan. Vui long tao booking moi.');
    }

    const channel = forceEmail ? 'EMAIL' : String(booking.assistedDraft?.confirmationChannel || 'ZALO').toUpperCase();
    const normalizedChannel = ['EMAIL', 'ZALO', 'PHONE', 'MANUAL'].includes(channel) ? channel : 'MANUAL';
    const emailRecipient = booking.assistedDraft?.emailForTicket || booking.assistedDraft?.customerEmail || booking.user.email;
    const recipient = normalizedChannel === 'EMAIL'
      ? emailRecipient
      : booking.assistedDraft?.customerPhone || booking.user.phone || null;
    const amountVND = Math.round(booking.totalPrice);
    const description = `AH ${booking.bookingCode}`;

    const payload: PaymentNotificationPayload = {
      bookingCode: booking.bookingCode,
      customerName: booking.assistedDraft?.customerName || booking.user.fullName,
      tourName: booking.tour.name,
      startDate: booking.tour.startDate.toLocaleDateString('vi-VN'),
      duration: booking.tour.duration,
      passengerBreakdown: getPassengerBreakdown(booking.passengers, booking.numberOfPeople),
      totalPrice: formatMoney(amountVND),
      discountAmount: booking.discountAmount > 0 ? formatMoney(booking.discountAmount) : undefined,
      deadlineText: `truoc ${holdExpiresAt.toLocaleString('vi-VN')}`,
    };

    let paymentRequest: PaymentLinkResult;
    try {
      paymentRequest = await this.paymentService.createPaymentRequest(buildPayosOrderCode(booking.id), amountVND, description);
    } catch (error) {
      const notification = await this.prisma.bookingNotification.create({
        data: {
          bookingId: booking.id, type: 'PAYMENT_REQUEST', channel: normalizedChannel, recipient,
          status: 'FAILED', subject: `Yeu cau thanh toan ${booking.bookingCode}`,
          content: buildPaymentRequestContent(payload, 'Khong tao duoc link thanh toan.'),
          errorMessage: getErrorMessage(error), createdById: actorUserId,
        },
      });
      this.logger.error(`[ASSISTED PAYMENT] Khong tao duoc PayOS link cho booking #${booking.id}: ${getErrorMessage(error)}`);
      return { notification, paymentRequest: null };
    }

    await this.replacePendingPayosTransaction(
      booking.id,
      String(paymentRequest.orderCode),
      amountVND,
      JSON.stringify({ ...paymentRequest, assistedDraftId: booking.assistedDraftId }),
    );

    const content = buildPaymentRequestContent(payload, paymentRequest.checkoutUrl);
    let notification = await this.prisma.bookingNotification.create({
      data: {
        bookingId: booking.id, type: 'PAYMENT_REQUEST', channel: normalizedChannel, recipient,
        status: 'PENDING', subject: `Yeu cau thanh toan ${booking.bookingCode}`, content,
        paymentUrl: paymentRequest.checkoutUrl,
        qrCodeUrl: paymentRequest.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentRequest.checkoutUrl)}`,
        createdById: actorUserId,
      },
    });

    if (normalizedChannel === 'EMAIL') {
      if (!emailRecipient) {
        notification = await this.prisma.bookingNotification.update({
          where: { id: notification.id }, data: { status: 'FAILED', errorMessage: 'Missing email recipient' },
        });
      } else {
        try {
          await this.mailService.sendPaymentRequestEmail({
            ...payload, to: emailRecipient,
            paymentUrl: paymentRequest.checkoutUrl,
            qrCodeUrl: paymentRequest.qrCode || notification.qrCodeUrl || undefined,
          });
          notification = await this.prisma.bookingNotification.update({
            where: { id: notification.id }, data: { status: 'SENT', sentAt: new Date() },
          });
        } catch (error) {
          notification = await this.prisma.bookingNotification.update({
            where: { id: notification.id }, data: { status: 'FAILED', errorMessage: getErrorMessage(error) },
          });
        }
      }
    }
    return { notification, paymentRequest };
  }

  // ─── Public CRUD methods ───────────────────────────────────────────────────

  async createAssistedDraft(actorUserId: number, dto: CreateAssistedBookingDraftDto) {
    const payload = {
      ...dto,
      customerName: dto.customerName?.trim(),
      customerEmail: dto.customerEmail?.trim().toLowerCase(),
      customerPhone: dto.customerPhone?.trim() || null,
      customerIdentityNo: dto.customerIdentityNo?.trim() || null,
      sourceChannel: dto.sourceChannel?.trim() || 'LIVE_CHAT',
      confirmationChannel: dto.confirmationChannel?.trim().toUpperCase() || 'ZALO',
      emailForTicket: dto.emailForTicket?.trim().toLowerCase() || dto.customerEmail?.trim().toLowerCase() || null,
      voucherCode: dto.voucherCode?.trim() || undefined,
      specialRequests: dto.specialRequests?.trim() || null,
      internalNote: dto.internalNote?.trim() || null,
      passengers: normalizePassengers(dto.passengers, Number(dto.numberOfPeople) || 1),
    };
    const numberOfPeople = payload.passengers.length;

    const draft = await this.prisma.$transaction(async (tx) => {
      const quote = payload.tourId
        ? await this.calculateAssistedQuote(tx, { ...payload, tourId: payload.tourId, numberOfPeople })
        : { basePrice: null, totalPrice: 0, discountAmount: 0, voucherCode: null };

      return tx.assistedBookingDraft.create({
        data: {
          draftCode: generateAssistedDraftCode(),
          customerId: payload.customerId || null,
          customerName: payload.customerName || null,
          customerEmail: payload.customerEmail || null,
          customerPhone: payload.customerPhone,
          customerIdentityNo: payload.customerIdentityNo,
          sourceChannel: payload.sourceChannel,
          confirmationChannel: payload.confirmationChannel,
          emailForTicket: payload.emailForTicket,
          sourceTicketId: payload.sourceTicketId || null,
          tourId: payload.tourId || null,
          packageId: payload.packageId || null,
          departureId: payload.departureId || null,
          numberOfPeople,
          passengers: payload.passengers,
          quotedPrice: quote.totalPrice,
          unitPriceAtDraft: quote.basePrice,
          voucherCode: quote.voucherCode,
          discountAmount: quote.discountAmount,
          specialRequests: payload.specialRequests,
          internalNote: payload.internalNote,
          createdByStaffId: actorUserId,
        },
        include: this.assistedDraftInclude(),
      });
    });
    return this.formatAssistedDraft(draft);
  }

  async updateAssistedDraft(id: number, actorUserId: number, actorRole: string, dto: CreateAssistedBookingDraftDto) {
    const existing = await this.prisma.assistedBookingDraft.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Draft not found');
    if (actorRole === 'STAFF' && existing.createdByStaffId !== actorUserId)
      throw new ForbiddenException('Ban khong co quyen sua ban nhap nay');
    if (!['DRAFT', 'NEEDS_REVISION'].includes(existing.status))
      throw new BadRequestException('Chi co the sua ban nhap hoac ban can chinh sua');

    const payload = {
      ...dto,
      customerName: dto.customerName?.trim(),
      customerEmail: dto.customerEmail?.trim().toLowerCase(),
      customerPhone: dto.customerPhone?.trim() || null,
      customerIdentityNo: dto.customerIdentityNo?.trim() || null,
      sourceChannel: dto.sourceChannel?.trim() || existing.sourceChannel || 'LIVE_CHAT',
      confirmationChannel: dto.confirmationChannel?.trim().toUpperCase() || existing.confirmationChannel || 'ZALO',
      emailForTicket: dto.emailForTicket?.trim().toLowerCase() || dto.customerEmail?.trim().toLowerCase() || existing.emailForTicket || null,
      voucherCode: dto.voucherCode?.trim() || undefined,
      specialRequests: dto.specialRequests?.trim() || null,
      internalNote: dto.internalNote?.trim() || null,
      passengers: normalizePassengers(dto.passengers, Number(dto.numberOfPeople) || existing.numberOfPeople || 1),
    };
    const numberOfPeople = payload.passengers.length;

    const draft = await this.prisma.$transaction(async (tx) => {
      const quote = payload.tourId
        ? await this.calculateAssistedQuote(tx, { ...payload, tourId: payload.tourId, numberOfPeople })
        : { basePrice: null, totalPrice: 0, discountAmount: 0, voucherCode: null };

      return tx.assistedBookingDraft.update({
        where: { id },
        data: {
          customerId: payload.customerId || null,
          customerName: payload.customerName || null,
          customerEmail: payload.customerEmail || null,
          customerPhone: payload.customerPhone,
          customerIdentityNo: payload.customerIdentityNo,
          sourceChannel: payload.sourceChannel,
          confirmationChannel: payload.confirmationChannel,
          emailForTicket: payload.emailForTicket,
          sourceTicketId: payload.sourceTicketId || null,
          tourId: payload.tourId || null,
          packageId: payload.packageId || null,
          departureId: payload.departureId || null,
          numberOfPeople,
          passengers: payload.passengers,
          quotedPrice: quote.totalPrice,
          unitPriceAtDraft: quote.basePrice,
          voucherCode: quote.voucherCode,
          discountAmount: quote.discountAmount,
          specialRequests: payload.specialRequests,
          internalNote: payload.internalNote,
        },
        include: this.assistedDraftInclude(),
      });
    });
    return this.formatAssistedDraft(draft);
  }

  async getAssistedDrafts(actorUserId: number, actorRole: string, status?: string, search?: string) {
    const where: Prisma.AssistedBookingDraftWhereInput = {};
    if (actorRole === 'STAFF') where.createdByStaffId = actorUserId;
    if (status && status !== 'ALL') {
      const normalizedStatus = status.toUpperCase();
      if (!isAssistedDraftStatus(normalizedStatus)) throw new BadRequestException('Invalid assisted draft status');
      where.status = normalizedStatus as AssistedDraftStatus;
    }
    if (search) {
      where.OR = [
        { draftCode: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { tour: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const drafts = await this.prisma.assistedBookingDraft.findMany({
      where, include: this.assistedDraftInclude(), orderBy: { createdAt: 'desc' }, take: 100,
    });
    return drafts.map((d) => this.formatAssistedDraft(d));
  }

  async deleteAssistedDraft(id: number, actorUserId: number, actorRole: string) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({
      where: { id },
      include: { convertedBooking: { select: { id: true, bookingCode: true } } },
    });
    if (!draft) throw new NotFoundException('Draft not found');
    if (actorRole === 'STAFF' && draft.createdByStaffId !== actorUserId) {
      throw new ForbiddenException('Ban khong co quyen xoa ban nhap nay');
    }
    if (draft.convertedBooking || draft.status === 'CONVERTED') {
      throw new BadRequestException('Ban nhap da tao booking, khong the xoa');
    }
    if (!['DRAFT', 'NEEDS_REVISION', 'REJECTED'].includes(draft.status)) {
      throw new BadRequestException('Chi co the xoa ban nhap, ban can sua hoac ban da tu choi');
    }

    await this.prisma.$transaction([
      this.prisma.systemLog.create({
        data: {
          action: 'DELETE',
          resource: 'AssistedBookingDraft',
          resourceId: String(draft.id),
          targetName: draft.draftCode,
          description: `Deleted assisted draft ${draft.draftCode}`,
          userId: actorUserId,
          oldData: {
            draftCode: draft.draftCode,
            status: draft.status,
            customerName: draft.customerName,
            customerEmail: draft.customerEmail,
            quotedPrice: draft.quotedPrice,
          },
        },
      }),
      this.prisma.assistedBookingDraft.delete({ where: { id } }),
    ]);

    return {
      message: 'Da xoa ban nhap dat ho',
      data: { id: draft.id, draftCode: draft.draftCode },
    };
  }

  async submitAssistedDraft(id: number, actorUserId: number, actorRole: string) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({
      where: { id },
      include: { tour: { include: { departures: { where: { isActive: true }, select: { id: true } } } } },
    });
    if (!draft) throw new NotFoundException('Draft not found');
    const normalizedRole = actorRole.toUpperCase();
    if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN') {
      return this.approveAssistedDraft(id, actorUserId, 'Admin duyet truc tiep tu thao tac submit');
    }
    if (normalizedRole === 'STAFF' && draft.createdByStaffId !== actorUserId)
      throw new ForbiddenException('Ban khong co quyen gui ban nhap nay');
    if (!['DRAFT', 'NEEDS_REVISION'].includes(draft.status))
      throw new BadRequestException('Chi co the gui ban nhap hoac ban can chinh sua');
    this.assertAssistedDraftReadyForApproval(draft);

    const quote = await this.prisma.$transaction((tx) =>
      this.calculateAssistedQuote(tx, {
        tourId: draft.tourId!,
        departureId: draft.departureId || undefined,
        packageId: draft.packageId || undefined,
        numberOfPeople: draft.numberOfPeople,
        passengers: asPassengerInputs(draft.passengers),
        voucherCode: draft.voucherCode || undefined,
      }),
    );

    const updated = await this.prisma.assistedBookingDraft.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL', quotedPrice: quote.totalPrice, unitPriceAtDraft: quote.basePrice,
        discountAmount: quote.discountAmount, voucherCode: quote.voucherCode,
        rejectionReason: null, reviewedByAdminId: null, reviewedAt: null,
      },
      include: this.assistedDraftInclude(),
    });
    return this.formatAssistedDraft(updated);
  }

  async requestRevisionAssistedDraft(id: number, adminId: number, reason: string) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.status !== 'PENDING_APPROVAL') throw new BadRequestException('Chi ban nhap dang cho duyet moi co the yeu cau chinh sua');
    const updated = await this.prisma.assistedBookingDraft.update({
      where: { id },
      data: { status: 'NEEDS_REVISION', reviewedByAdminId: adminId, reviewedAt: new Date(), rejectionReason: reason },
      include: this.assistedDraftInclude(),
    });
    return this.formatAssistedDraft(updated);
  }

  async rejectAssistedDraft(id: number, adminId: number, reason: string) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.status !== 'PENDING_APPROVAL') throw new BadRequestException('Chi ban nhap dang cho duyet moi co the bi tu choi');
    const updated = await this.prisma.assistedBookingDraft.update({
      where: { id },
      data: { status: 'REJECTED', reviewedByAdminId: adminId, reviewedAt: new Date(), rejectionReason: reason },
      include: this.assistedDraftInclude(),
    });
    return this.formatAssistedDraft(updated);
  }

  async approveAssistedDraft(id: number, adminId: number, note?: string) {
    // ── Phần chuẩn bị TRƯỚC transaction ──────────────────────────────────
    // Đọc draft sơ bộ chỉ để xác định có cần hash password hay không.
    // Thiếu một lần read này đổi lấy việc giải phóng DB connection khỏi bị giữ
    // trong suốt ~100ms bcrypt.hash() — xứng đáng với transaction có nhiều bước.
    const draftPreview = await this.prisma.assistedBookingDraft.findUnique({
      where: { id },
      select: { customerId: true, customerEmail: true },
    });
    const prehashedPassword = draftPreview
      ? await this.prepareGuestPassword(draftPreview)
      : null;
    // ─────────────────────────────────────────────────────────────────────────

    const result = await this.prisma.$transaction(async (tx) => {
      const draft = await tx.assistedBookingDraft.findUnique({
        where: { id },
        include: {
          convertedBooking: true,
          tour: { include: { departures: { where: { isActive: true }, select: { id: true } } } },
        },
      });
      if (!draft) throw new NotFoundException('Draft not found');
      if (!['DRAFT', 'PENDING_APPROVAL', 'NEEDS_REVISION'].includes(draft.status))
        throw new BadRequestException('Chi ban nhap, ban can sua hoac ban dang cho duyet moi co the duyet');
      if (draft.convertedBooking) throw new BadRequestException('Ban nhap nay da tao booking');
      this.assertAssistedDraftReadyForApproval(draft);

      const tourId = draft.tourId!;
      const quote = await this.calculateAssistedQuote(tx, {
        tourId, departureId: draft.departureId || undefined, packageId: draft.packageId || undefined,
        numberOfPeople: draft.numberOfPeople, passengers: asPassengerInputs(draft.passengers),
        voucherCode: draft.voucherCode || undefined,
      });
      const customer = await this.findOrCreateAssistedCustomer(tx, draft, prehashedPassword);

      await reserveSeatsAtomically(tx, {
        tourId,
        departureId: draft.departureId,
        seats: draft.numberOfPeople,
      });

      const departure = draft.departureId
        ? await tx.tourDeparture.findUnique({
            where: { id: draft.departureId },
            select: { departureDate: true },
          })
        : null;
      const holdExpiresAt = calculateBookingHoldExpiresAt({
        paymentMethod: 'PAYOS',
        departureDate: departure?.departureDate ?? quote.tour.startDate,
      });

      const booking = await tx.booking.create({
        data: {
          bookingCode: generateBookingCode(), userId: customer.id, tourId,
          departureId: draft.departureId, packageId: draft.packageId,
          numberOfPeople: draft.numberOfPeople, totalPrice: quote.totalPrice,
          unitPriceAtBooking: quote.basePrice, voucherCode: quote.voucherCode,
          discountAmount: quote.discountAmount,
          contactInfo: {
            name: draft.customerName, email: draft.customerEmail, phone: draft.customerPhone,
            identityType: 'CCCD', identityNo: draft.customerIdentityNo,
            sourceChannel: draft.sourceChannel, confirmationChannel: draft.confirmationChannel,
            emailForTicket: draft.emailForTicket, specialRequests: draft.specialRequests,
          },
          passengers: draft.passengers ?? Prisma.JsonNull,
          status: 'PENDING', paymentStatus: 'UNPAID', isAssistedBooking: true, assistedDraftId: draft.id,
          holdExpiresAt,
        },
      });

      const updatedDraft = await tx.assistedBookingDraft.update({
        where: { id },
        data: {
          status: 'CONVERTED', customerId: customer.id, quotedPrice: quote.totalPrice,
          unitPriceAtDraft: quote.basePrice, discountAmount: quote.discountAmount,
          voucherCode: quote.voucherCode, reviewedByAdminId: adminId,
          reviewedAt: new Date(), approvalNote: note?.trim() || null, rejectionReason: null,
        },
        include: this.assistedDraftInclude(),
      });

      await tx.systemLog.create({
        data: {
          action: 'APPROVE', resource: 'AssistedBookingDraft', resourceId: String(draft.id),
          targetName: draft.draftCode,
          description: `Approved assisted draft ${draft.draftCode} and created booking ${booking.bookingCode}`,
          userId: adminId, newData: { bookingId: booking.id, bookingCode: booking.bookingCode },
        },
      });

      return { draft: updatedDraft, booking };
    });

    const paymentRequestResult = await this.createPaymentRequestForBooking(result.booking.id, adminId);
    return { draft: this.formatAssistedDraft(result.draft), booking: result.booking, paymentRequest: paymentRequestResult };
  }

  async resendPaymentRequest(bookingId: number, actorUserId: number, forceEmail = false) {
    return this.createPaymentRequestForBooking(bookingId, actorUserId, forceEmail);
  }
}

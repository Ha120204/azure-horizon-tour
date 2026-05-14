import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssistedDraftStatus,
  BookingStatus,
  PaymentStatus,
  Prisma,
  type AssistedBookingDraft,
  type Tour,
  type TourDeparture,
  type TourPackage,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PaymentService, type PaymentLinkResult } from '../payment/payment.service';
import { VoucherService } from '../voucher/voucher.service';
import { MailService } from '../mail/mail.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { Response } from 'express';
import { Readable } from 'stream';
import moment from 'moment';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CreateAssistedBookingDraftDto } from './dto/create-assisted-booking-draft.dto';

type TransactionClient = Prisma.TransactionClient;

type PassengerInput = {
  type?: string;
  [key: string]: Prisma.JsonValue | undefined;
};

const PASSENGER_TYPE_ALIASES: Record<string, string> = {
  ADULT: 'Adult (12+)',
  CHILD: 'Child (4-11)',
  INFANT: 'Infant (<4)',
  'ADULT (12+)': 'Adult (12+)',
  'CHILD (4-11)': 'Child (4-11)',
  'INFANT (<4)': 'Infant (<4)',
};

type AssistedQuoteDto = {
  tourId: number;
  departureId?: number;
  packageId?: number;
  numberOfPeople: number;
  passengers?: PassengerInput[];
  voucherCode?: string;
};

type AssistedQuote = {
  tour: Tour;
  basePrice: number;
  totalPrice: number;
  discountAmount: number;
  voucherCode: string | null;
};

type AssistedDraftRecord = AssistedBookingDraft & Record<string, unknown>;

type AssistedCustomerDraft = Pick<
  AssistedBookingDraft,
  'customerId' | 'customerEmail' | 'customerPhone' | 'customerIdentityNo' | 'customerName'
>;

type PayosError = {
  code?: string;
};

type ProxiedStream = Readable & {
  pipe(destination: Response): Response;
};

type PaymentNotificationPayload = {
  bookingCode: string;
  customerName: string;
  tourName: string;
  startDate: string;
  duration: string;
  passengerBreakdown: string;
  totalPrice: string;
  discountAmount?: string;
  deadlineText: string;
};

function isAssistedDraftStatus(value: string): value is AssistedDraftStatus {
  return Object.values(AssistedDraftStatus).includes(value as AssistedDraftStatus);
}

function isBookingStatus(value: string): value is BookingStatus {
  return Object.values(BookingStatus).includes(value as BookingStatus);
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value as PaymentStatus);
}

function isPassengerInput(value: unknown): value is PassengerInput {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asPassengerInputs(value: unknown): PassengerInput[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isPassengerInput);
}

function normalizePassengerType(type: unknown): string {
  const raw = typeof type === 'string' ? type.trim() : 'Adult (12+)';
  return PASSENGER_TYPE_ALIASES[raw.toUpperCase()] ?? raw;
}

function normalizePassengers(value: unknown, fallbackPeople: number): PassengerInput[] {
  const inputs = asPassengerInputs(value);
  if (inputs?.length) {
    return inputs.map((passenger) => {
      const normalized: PassengerInput = {};
      for (const [key, entryValue] of Object.entries(passenger)) {
        if (entryValue !== undefined) normalized[key] = entryValue;
      }
      normalized.type = normalizePassengerType(passenger.type);
      return normalized;
    });
  }

  const people = Math.max(1, Math.floor(Number(fallbackPeople) || 1));
  return Array.from({ length: people }, () => ({ type: 'Adult (12+)' }));
}

function isPayosDuplicateError(error: unknown): error is PayosError {
  return typeof error === 'object' && error !== null && 'code' in error && (error as PayosError).code === '231';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
  ) { }

  // Hàm hỗ trợ tạo mã Booking chuyên nghiệp
  private generateBookingCode(): string {
    const prefix = 'BKG';

    // Lấy ngày tháng năm hiện tại (VD: 290326)
    const date = new Date();
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    const dateString = `${d}${m}${y}`;

    // Tạo 4 ký tự ngẫu nhiên (Chữ in hoa + Số)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomString = '';
    for (let i = 0; i < 4; i++) {
      randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}-${dateString}-${randomString}`;
  }

  private generateAssistedDraftCode(): string {
    const date = new Date();
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomString = '';
    for (let i = 0; i < 4; i++) {
      randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ABD-${d}${m}${y}-${randomString}`;
  }

  private getPassengerTotal(basePrice: number, people: number, passengers?: PassengerInput[]): number {
    const multipliers: Record<string, number> = {
      'Adult (12+)': 1,
      'Child (4-11)': 0.7,
      'Infant (<4)': 0.1,
      ADULT: 1,
      CHILD: 0.7,
      INFANT: 0.1,
    };

    if (Array.isArray(passengers) && passengers.length > 0) {
      return passengers.reduce((sum, p) => {
        const type = String(p?.type ?? 'ADULT');
        return sum + basePrice * (multipliers[type] ?? 1);
      }, 0);
    }

    return basePrice * people;
  }

  private buildPayosOrderCode(bookingId: number): number {
    const timeSuffix = (Date.now() % 1000000).toString().padStart(6, '0');
    return Number(bookingId.toString() + timeSuffix);
  }

  private formatMoney(amount: number): string {
    return `${Math.round(amount).toLocaleString('vi-VN')} đ`;
  }

  private getPassengerBreakdown(passengers: unknown, fallbackPeople: number): string {
    const counts: Record<string, number> = {
      'Adult (12+)': 0,
      'Child (4-11)': 0,
      'Infant (<4)': 0,
    };

    const normalized = normalizePassengers(passengers, fallbackPeople);
    normalized.forEach((passenger) => {
      const type = normalizePassengerType(passenger.type);
      counts[type] = (counts[type] ?? 0) + 1;
    });

    const parts = [
      counts['Adult (12+)'] ? `${counts['Adult (12+)']} nguoi lon` : '',
      counts['Child (4-11)'] ? `${counts['Child (4-11)']} tre em` : '',
      counts['Infant (<4)'] ? `${counts['Infant (<4)']} em be` : '',
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : `${fallbackPeople} khach`;
  }

  private buildPaymentRequestContent(payload: PaymentNotificationPayload, paymentUrl: string): string {
    return [
      'Azure Horizon xac nhan thong tin dat tour cua anh/chi:',
      '',
      `Ma dat tour: ${payload.bookingCode}`,
      `Khach hang: ${payload.customerName}`,
      `Tour: ${payload.tourName}`,
      `Khoi hanh: ${payload.startDate}`,
      `Thoi gian: ${payload.duration}`,
      `Hanh khach: ${payload.passengerBreakdown}`,
      payload.discountAmount ? `Giam gia: -${payload.discountAmount}` : '',
      `Tong thanh toan: ${payload.totalPrice}`,
      `Han thanh toan: ${payload.deadlineText}`,
      '',
      'Vui long kiem tra thong tin. Neu dung, anh/chi thanh toan tai:',
      paymentUrl,
      '',
      'Neu thong tin chua dung, vui long phan hoi voi nhan vien tu van truoc khi thanh toan.',
    ].filter(Boolean).join('\n');
  }

  private async createPaymentRequestForBooking(bookingId: number, actorUserId?: number, forceEmail = false) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        tour: { select: { id: true, name: true, startDate: true, duration: true } },
        assistedDraft: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.paymentStatus === 'PAID') {
      throw new BadRequestException('Booking da thanh toan, khong the gui yeu cau thanh toan');
    }

    const channel = forceEmail ? 'EMAIL' : String(booking.assistedDraft?.confirmationChannel || 'ZALO').toUpperCase();
    const normalizedChannel = ['EMAIL', 'ZALO', 'PHONE', 'MANUAL'].includes(channel) ? channel : 'MANUAL';
    const emailRecipient = booking.assistedDraft?.emailForTicket || booking.assistedDraft?.customerEmail || booking.user.email;
    const recipient = normalizedChannel === 'EMAIL'
      ? emailRecipient
      : booking.assistedDraft?.customerPhone || booking.user.phone || null;
    const amountVND = Math.round(booking.totalPrice);
    const description = `AH ${booking.bookingCode}`;
    const deadlineText = '15 phut ke tu khi nhan yeu cau';

    const payload: PaymentNotificationPayload = {
      bookingCode: booking.bookingCode,
      customerName: booking.assistedDraft?.customerName || booking.user.fullName,
      tourName: booking.tour.name,
      startDate: booking.tour.startDate.toLocaleDateString('vi-VN'),
      duration: booking.tour.duration,
      passengerBreakdown: this.getPassengerBreakdown(booking.passengers, booking.numberOfPeople),
      totalPrice: this.formatMoney(amountVND),
      discountAmount: booking.discountAmount > 0 ? this.formatMoney(booking.discountAmount) : undefined,
      deadlineText,
    };

    let paymentRequest: PaymentLinkResult;
    try {
      paymentRequest = await this.paymentService.createPaymentRequest(
        this.buildPayosOrderCode(booking.id),
        amountVND,
        description,
      );
    } catch (error) {
      const content = this.buildPaymentRequestContent(payload, 'Khong tao duoc link thanh toan. Vui long gui lai.');
      const notification = await this.prisma.bookingNotification.create({
        data: {
          bookingId: booking.id,
          type: 'PAYMENT_REQUEST',
          channel: normalizedChannel,
          recipient,
          status: 'FAILED',
          subject: `Yeu cau thanh toan ${booking.bookingCode}`,
          content,
          errorMessage: getErrorMessage(error),
          createdById: actorUserId,
        },
      });
      this.logger.error(`[ASSISTED PAYMENT] Khong tao duoc PayOS link cho booking #${booking.id}: ${getErrorMessage(error)}`);
      return { notification, paymentRequest: null };
    }

    await this.prisma.paymentTransaction.create({
      data: {
        bookingId: booking.id,
        gateway: 'PAYOS',
        transactionRef: String(paymentRequest.orderCode),
        amount: amountVND,
        status: 'PENDING',
        rawPayload: JSON.stringify({
          ...paymentRequest,
          assistedDraftId: booking.assistedDraftId,
          sourceChannel: booking.assistedDraft?.sourceChannel,
          notificationChannel: normalizedChannel,
        }),
      },
    });

    const content = this.buildPaymentRequestContent(payload, paymentRequest.checkoutUrl);
    let notification = await this.prisma.bookingNotification.create({
      data: {
        bookingId: booking.id,
        type: 'PAYMENT_REQUEST',
        channel: normalizedChannel,
        recipient,
        status: normalizedChannel === 'EMAIL' ? 'PENDING' : 'PENDING',
        subject: `Yeu cau thanh toan ${booking.bookingCode}`,
        content,
        paymentUrl: paymentRequest.checkoutUrl,
        qrCodeUrl: paymentRequest.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentRequest.checkoutUrl)}`,
        createdById: actorUserId,
      },
    });

    if (normalizedChannel === 'EMAIL') {
      if (!emailRecipient) {
        notification = await this.prisma.bookingNotification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Missing email recipient',
          },
        });
      } else {
        try {
          await this.mailService.sendPaymentRequestEmail({
            ...payload,
            to: emailRecipient,
            paymentUrl: paymentRequest.checkoutUrl,
            qrCodeUrl: paymentRequest.qrCode || notification.qrCodeUrl || undefined,
          });
          notification = await this.prisma.bookingNotification.update({
            where: { id: notification.id },
            data: { status: 'SENT', sentAt: new Date() },
          });
        } catch (error) {
          notification = await this.prisma.bookingNotification.update({
            where: { id: notification.id },
            data: {
              status: 'FAILED',
              errorMessage: getErrorMessage(error),
            },
          });
        }
      }
    }

    return { notification, paymentRequest };
  }

  private async calculateAssistedQuote(tx: TransactionClient, dto: AssistedQuoteDto): Promise<AssistedQuote> {
    const tour = await tx.tour.findUnique({
      where: { id: dto.tourId, deletedAt: null },
    });
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.startDate < new Date()) {
      throw new BadRequestException('Tour nay da dien ra, khong the tao dat ho');
    }

    let selectedDeparture: TourDeparture | null = null;
    if (dto.departureId) {
      selectedDeparture = await tx.tourDeparture.findUnique({ where: { id: dto.departureId } });
      if (!selectedDeparture || selectedDeparture.tourId !== tour.id || !selectedDeparture.isActive) {
        throw new BadRequestException('Invalid departure');
      }
      if (selectedDeparture.availableSeats < dto.numberOfPeople) {
        throw new BadRequestException('Not enough seats for this departure');
      }
    } else if (tour.availableSeats < dto.numberOfPeople) {
      throw new BadRequestException('Not enough seats available');
    }

    let basePrice = selectedDeparture?.price ?? tour.price;
    if (dto.packageId) {
      const selectedPackage = await tx.tourPackage.findUnique({ where: { id: dto.packageId } });
      if (!selectedPackage || selectedPackage.tourId !== tour.id || !selectedPackage.isActive) {
        throw new BadRequestException('Invalid tour package');
      }
      basePrice += selectedPackage.price;
    }

    let totalPrice = this.getPassengerTotal(basePrice, dto.numberOfPeople, dto.passengers);
    let discountAmount = 0;
    let voucherCode: string | null = null;

    if (dto.voucherCode) {
      const voucherResult = await this.voucherService.validateVoucher(dto.voucherCode, totalPrice);
      discountAmount = voucherResult.discountAmount;
      totalPrice = voucherResult.finalPrice;
      voucherCode = dto.voucherCode.trim().toUpperCase();
    }

    return {
      tour,
      basePrice,
      totalPrice,
      discountAmount,
      voucherCode,
    };
  }

  private formatAssistedDraft<T extends AssistedDraftRecord>(draft: T): T & {
    quotedPrice: number;
    unitPriceAtDraft: number | null;
    discountAmount: number;
  } {
    return {
      ...draft,
      quotedPrice: Number(draft.quotedPrice),
      unitPriceAtDraft: draft.unitPriceAtDraft == null ? null : Number(draft.unitPriceAtDraft),
      discountAmount: Number(draft.discountAmount || 0),
    };
  }

  private async findOrCreateAssistedCustomer(tx: TransactionClient, draft: AssistedCustomerDraft) {
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

    const password = randomBytes(24).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    return tx.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: draft.customerName ?? email,
        phone: draft.customerPhone || null,
        identityType: draft.customerIdentityNo ? 'CCCD' : null,
        identityNo: draft.customerIdentityNo || null,
        role: 'CUSTOMER',
      },
    });
  }

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
          draftCode: this.generateAssistedDraftCode(),
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
    if (actorRole === 'STAFF' && existing.createdByStaffId !== actorUserId) {
      throw new ForbiddenException('Ban khong co quyen sua ban nhap nay');
    }
    if (!['DRAFT', 'NEEDS_REVISION'].includes(existing.status)) {
      throw new BadRequestException('Chi co the sua ban nhap hoac ban can chinh sua');
    }

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

  private assistedDraftInclude(): Prisma.AssistedBookingDraftInclude {
    return {
      tour: { select: { id: true, name: true, imageUrl: true, tourCode: true, destination: { select: { name: true } } } },
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      createdByStaff: { select: { id: true, fullName: true, email: true, role: true } },
      reviewedByAdmin: { select: { id: true, fullName: true, email: true, role: true } },
      convertedBooking: { select: { id: true, bookingCode: true, status: true, paymentStatus: true } },
      sourceTicket: { select: { id: true, subject: true, customerName: true, customerEmail: true } },
    };
  }

  async getAssistedDrafts(actorUserId: number, actorRole: string, status?: string, search?: string) {
    const where: Prisma.AssistedBookingDraftWhereInput = {};
    if (actorRole === 'STAFF') where.createdByStaffId = actorUserId;
    if (status && status !== 'ALL') {
      const normalizedStatus = status.toUpperCase();
      if (!isAssistedDraftStatus(normalizedStatus)) {
        throw new BadRequestException('Invalid assisted draft status');
      }
      where.status = normalizedStatus;
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
      where,
      include: this.assistedDraftInclude(),
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return drafts.map(d => this.formatAssistedDraft(d));
  }

  async submitAssistedDraft(id: number, actorUserId: number, actorRole: string) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({
      where: { id },
      include: { tour: { include: { departures: { where: { isActive: true }, select: { id: true } } } } },
    });
    if (!draft) throw new NotFoundException('Draft not found');
    if (actorRole === 'STAFF' && draft.createdByStaffId !== actorUserId) {
      throw new ForbiddenException('Ban khong co quyen gui ban nhap nay');
    }
    if (!['DRAFT', 'NEEDS_REVISION'].includes(draft.status)) {
      throw new BadRequestException('Chi co the gui ban nhap hoac ban can chinh sua');
    }
    if (!draft.customerName?.trim()) {
      throw new BadRequestException('Customer name is required before submitting for approval');
    }
    if (!draft.customerEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.customerEmail)) {
      throw new BadRequestException('Valid customer email is required before submitting for approval');
    }
    if (!draft.customerPhone?.trim()) {
      throw new BadRequestException('Customer phone is required before submitting for approval');
    }
    if (!/^(0|\+84)(\d{9})$/.test(draft.customerPhone.trim().replace(/\s+/g, ''))) {
      throw new BadRequestException('Valid Vietnamese customer phone is required before submitting for approval');
    }
    if (!draft.customerIdentityNo?.trim()) {
      throw new BadRequestException('Customer CCCD is required before submitting for approval');
    }
    if (!/^\d{12}$/.test(draft.customerIdentityNo.trim())) {
      throw new BadRequestException('Customer CCCD must be exactly 12 digits');
    }
    const confirmationChannel = String(draft.confirmationChannel || 'ZALO').toUpperCase();
    if (!['ZALO', 'EMAIL', 'PHONE', 'MANUAL'].includes(confirmationChannel)) {
      throw new BadRequestException('Invalid confirmation channel');
    }
    if (confirmationChannel === 'EMAIL' && !draft.emailForTicket?.trim() && !draft.customerEmail?.trim()) {
      throw new BadRequestException('Email is required when confirmation channel is email');
    }
    if (!draft.tourId) {
      throw new BadRequestException('Tour is required before submitting for approval');
    }
    if (!draft.numberOfPeople || draft.numberOfPeople < 1) {
      throw new BadRequestException('Number of people must be at least 1');
    }
    if ((draft.tour?.departures?.length ?? 0) > 0 && !draft.departureId) {
      throw new BadRequestException('Departure is required before submitting for approval');
    }

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
        status: 'PENDING_APPROVAL',
        quotedPrice: quote.totalPrice,
        unitPriceAtDraft: quote.basePrice,
        discountAmount: quote.discountAmount,
        voucherCode: quote.voucherCode,
        rejectionReason: null,
        reviewedByAdminId: null,
        reviewedAt: null,
      },
      include: this.assistedDraftInclude(),
    });
    return this.formatAssistedDraft(updated);
  }

  async requestRevisionAssistedDraft(id: number, adminId: number, reason: string) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Chi ban nhap dang cho duyet moi co the yeu cau chinh sua');
    }

    const updated = await this.prisma.assistedBookingDraft.update({
      where: { id },
      data: {
        status: 'NEEDS_REVISION',
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
      include: this.assistedDraftInclude(),
    });
    return this.formatAssistedDraft(updated);
  }

  async rejectAssistedDraft(id: number, adminId: number, reason: string) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Chi ban nhap dang cho duyet moi co the bi tu choi');
    }

    const updated = await this.prisma.assistedBookingDraft.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
      include: this.assistedDraftInclude(),
    });
    return this.formatAssistedDraft(updated);
  }

  async approveAssistedDraft(id: number, adminId: number, note?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const draft = await tx.assistedBookingDraft.findUnique({
        where: { id },
        include: { convertedBooking: true },
      });
      if (!draft) throw new NotFoundException('Draft not found');
      if (draft.status !== 'PENDING_APPROVAL') {
        throw new BadRequestException('Chi ban nhap dang cho duyet moi co the duyet');
      }
      if (draft.convertedBooking) {
        throw new BadRequestException('Ban nhap nay da tao booking');
      }
      if (!draft.tourId || !draft.customerName?.trim() || !draft.customerEmail?.trim() || !draft.customerPhone?.trim() || !draft.customerIdentityNo?.trim()) {
        throw new BadRequestException('Ban nhap chua du thong tin de tao booking');
      }

      const tourId = draft.tourId;

      const quote = await this.calculateAssistedQuote(tx, {
        tourId,
        departureId: draft.departureId || undefined,
        packageId: draft.packageId || undefined,
        numberOfPeople: draft.numberOfPeople,
        passengers: asPassengerInputs(draft.passengers),
        voucherCode: draft.voucherCode || undefined,
      });

      const customer = await this.findOrCreateAssistedCustomer(tx, draft);

      await tx.tour.update({
        where: { id: tourId },
        data: { availableSeats: { decrement: draft.numberOfPeople } },
      });
      if (draft.departureId) {
        await tx.tourDeparture.update({
          where: { id: draft.departureId },
          data: { availableSeats: { decrement: draft.numberOfPeople } },
        });
      }

      const booking = await tx.booking.create({
        data: {
          bookingCode: this.generateBookingCode(),
          userId: customer.id,
          tourId,
          departureId: draft.departureId,
          packageId: draft.packageId,
          numberOfPeople: draft.numberOfPeople,
          totalPrice: quote.totalPrice,
          unitPriceAtBooking: quote.basePrice,
          voucherCode: quote.voucherCode,
          discountAmount: quote.discountAmount,
          contactInfo: {
            name: draft.customerName,
            email: draft.customerEmail,
            phone: draft.customerPhone,
            identityType: 'CCCD',
            identityNo: draft.customerIdentityNo,
            sourceChannel: draft.sourceChannel,
            confirmationChannel: draft.confirmationChannel,
            emailForTicket: draft.emailForTicket,
            specialRequests: draft.specialRequests,
          },
          passengers: draft.passengers ?? Prisma.JsonNull,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          isAssistedBooking: true,
          assistedDraftId: draft.id,
        },
      });

      const updatedDraft = await tx.assistedBookingDraft.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          customerId: customer.id,
          quotedPrice: quote.totalPrice,
          unitPriceAtDraft: quote.basePrice,
          discountAmount: quote.discountAmount,
          voucherCode: quote.voucherCode,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          approvalNote: note?.trim() || null,
          rejectionReason: null,
        },
        include: this.assistedDraftInclude(),
      });

      await tx.systemLog.create({
        data: {
          action: 'APPROVE',
          resource: 'AssistedBookingDraft',
          resourceId: String(draft.id),
          targetName: draft.draftCode,
          description: `Approved assisted draft ${draft.draftCode} and created booking ${booking.bookingCode}`,
          userId: adminId,
          newData: { bookingId: booking.id, bookingCode: booking.bookingCode },
        },
      });

      return { draft: updatedDraft, booking };
    });
    const paymentRequestResult = await this.createPaymentRequestForBooking(result.booking.id, adminId);

    return {
      draft: this.formatAssistedDraft(result.draft),
      booking: result.booking,
      paymentRequest: paymentRequestResult,
    };
  }

  async resendPaymentRequest(bookingId: number, actorUserId: number, forceEmail = false) {
    return this.createPaymentRequestForBooking(bookingId, actorUserId, forceEmail);
  }

  async create(userId: number, dto: CreateBookingDto, ip: string) {
    void ip;
    // ============== INTERACTIVE TRANSACTION ==============
    // Bọc toàn bộ logic trong 1 transaction để đảm bảo tính nguyên tử:
    // Nếu BẤT KỲ bước nào bên trong lỗi → rollback TẤT CẢ, không mất ghế.
    const booking = await this.prisma.$transaction(async (tx) => {
      // 1. Tìm tour và khóa dòng dữ liệu
      const tour = await tx.tour.findUnique({
        where: { id: dto.tourId, deletedAt: null }, // [PHASE 1] Không cho đặt tour đã xóa
      });

      if (!tour) {
        throw new NotFoundException('Tour not found');
      }

      // [FIX] Kiểm tra tour đã qua ngày khởi hành chưa
      if (tour.startDate < new Date()) {
        throw new BadRequestException('Tour này đã diễn ra, không thể đặt');
      }

      // 1b. Validate departure (nếu có) và kiểm tra ghế của departure đó
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
        // Fallback: kiểm tra ghế trên tour
        if (tour.availableSeats < dto.numberOfPeople) {
          throw new BadRequestException('Not enough seats available');
        }
      }

      let basePrice = selectedDeparture?.price ?? tour.price;
      let selectedPackage: TourPackage | null = null;
      if (dto.packageId) {
        selectedPackage = await tx.tourPackage.findUnique({ where: { id: dto.packageId } });
        if (!selectedPackage || selectedPackage.tourId !== tour.id) {
          throw new BadRequestException('Invalid tour package');
        }
        // [PHASE 2] Phụ thu giá gói vào giá gốc của ngày khởi hành
        basePrice += selectedPackage.price;
      }

      // [FIX] Tính giá dựa trên loại hành khách (Adult / Child / Infant)
      let totalPrice = this.getPassengerTotal(basePrice, dto.numberOfPeople, asPassengerInputs(dto.passengers));

      let discountAmount = 0;
      let voucherCode: string | null = null;

      // 2. Xác thực Voucher (nếu có)
      if (dto.voucherCode) {
        const voucherResult = await this.voucherService.validateVoucher(
          dto.voucherCode,
          totalPrice,
        );
        discountAmount = voucherResult.discountAmount;
        totalPrice = voucherResult.finalPrice;
        voucherCode = dto.voucherCode;
      }

      // 3. Trừ ghế bằng Atomic Decrement
      await tx.tour.update({
        where: { id: tour.id },
        data: { availableSeats: { decrement: dto.numberOfPeople } },
      });

      // Trừ ghế trên TourDeparture nếu có chọn ngày khởi hành
      if (dto.departureId) {
        await tx.tourDeparture.update({
          where: { id: dto.departureId },
          data: { availableSeats: { decrement: dto.numberOfPeople } },
        });
      }

      // 4. Tạo mã Booking chuyên nghiệp
      const newBookingCode = this.generateBookingCode();

      // 5. Tạo record Booking
      const newBooking = await tx.booking.create({
        data: {
          bookingCode: newBookingCode,
          userId,
          tourId: dto.tourId,
          numberOfPeople: dto.numberOfPeople,
          totalPrice,
          unitPriceAtBooking: basePrice, // [PHASE 1] Đóng băng giá vé tại thời điểm đặt
          voucherCode,
          discountAmount,
          departureId: dto.departureId,
          packageId: dto.packageId,
          contactInfo: dto.contactInfo ?? Prisma.JsonNull,
          passengers: dto.passengers ?? Prisma.JsonNull,
        },
      });

      // 6. Cập nhật lượt dùng Voucher & ví trực tiếp trong Transaction để chống Race Condition
      if (voucherCode) {
        const voucherToUpdate = await tx.voucher.findUnique({
          where: { code: voucherCode },
        });

        if (voucherToUpdate) {
          // Tăng lượt sử dụng một cách an toàn
          const updatedVoucher = await tx.voucher.update({
            where: { id: voucherToUpdate.id },
            data: { usedCount: { increment: 1 } },
          });

          // (Tùy chọn nâng cao): Nếu vượt quá maxUses sau khi increment, ép rollback!
          if (updatedVoucher.usedCount > updatedVoucher.maxUses) {
            throw new BadRequestException('Voucher đã hết lượt sử dụng ngay khoảnh khắc bạn đặt hàng!');
          }

          // Cập nhật trong ví của user (nếu đã lưu)
          const userVoucher = await tx.userVoucher.findUnique({
            where: { userId_voucherId: { userId, voucherId: voucherToUpdate.id } },
          });

          if (userVoucher) {
            await tx.userVoucher.update({
              where: { id: userVoucher.id },
              data: { isUsed: true },
            });
          }
        }
      }

      return newBooking;
    }); // ← Nếu có exception → toàn bộ rollback tự động

    // ============== PAYOS INTEGRATION ==============
    // totalPrice đã là VNĐ (frontend gửi VNĐ, DB lưu VNĐ)
    // PayOS yêu cầu số nguyên VNĐ — làm tròn để loại bỏ số thập phân nếu có
    const amountVND = Math.round(booking.totalPrice);

    // Mô tả hiển thị trên mã QR ngân hàng (tối đa 25 ký tự)
    const description = `AH ${booking.bookingCode}`;

    // Dùng booking.id kết hợp thời gian (6 số cuối) để tạo orderCode duy nhất.
    // Điều này tránh lỗi "Link thanh toán đã tồn tại" nếu DB bị reset.
    // Ví dụ: booking.id = 12, timeSuffix = 123456 => orderCode = 12123456
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
      // PayOS lỗi 231: Link thanh toán đã tồn tại → lấy lại link cũ thay vì tạo mới
      if (isPayosDuplicateError(payosError)) {
        this.logger.warn(`[BOOKING] PayOS order #${orderCode} đã tồn tại, lấy lại checkout URL.`);
        const existing = await this.paymentService.getPaymentInfo(orderCode);
        if (!existing?.id) {
          throw new BadRequestException('Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.');
        }
        // PaymentLink.id là paymentLinkId, dùng để tạo URL checkout
        checkoutUrl = `https://pay.payos.vn/web/${existing.id}`;
      } else {
        throw payosError;
      }
    }

    // [PHASE 1] Ghi log PaymentTransaction khi tạo link thanh toán
    await this.prisma.paymentTransaction.create({
      data: {
        bookingId: booking.id,
        gateway: 'PAYOS',
        amount: amountVND,
        status: 'PENDING',
      },
    });

    return { message: 'Booking successful, please proceed to payment', booking, paymentUrl: checkoutUrl };
  }

  /**
   * Xử lý khi người dùng quay về từ trang PayOS (hoặc Webhook gọi)
   * Gọi thẳng API PayOS để xác nhận trạng thái thực tế, không tin query params
   */
  async handlePayosReturn(orderCode: number) {
    // 1. Gọi PayOS API để lấy trạng thái thanh toán thực
    const paymentInfo = await this.paymentService.getPaymentInfo(orderCode);

    // Phục hồi booking.id từ orderCode (cắt bỏ 6 số cuối)
    // Nếu orderCode nhỏ (cũ) thì dùng chính orderCode.
    const bookingId = orderCode >= 1000000 ? Math.floor(orderCode / 1000000) : orderCode;

    // 2. Tìm booking theo ID (orderCode = booking.id)
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Nếu booking đã xử lý rồi (CONFIRMED hoặc CANCELLED) → bỏ qua, tránh xử lý trùng
    if (booking.status === 'CONFIRMED' || booking.status === 'CANCELLED') {
      return paymentInfo;
    }

    // 3. Cập nhật trạng thái dựa vào kết quả từ PayOS
    if (paymentInfo.status === 'PAID') {
      const txnRef = paymentInfo.transactions?.[0]?.reference || `PAYOS-${orderCode}`;

      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          // Lưu mã tham chiếu giao dịch ngân hàng từ PayOS
          vnpayTxnRef: txnRef,
        },
      });

      // [PHASE 1] Ghi log thanh toán thành công vào PaymentTransaction
      await this.prisma.paymentTransaction.create({
        data: {
          bookingId: bookingId,
          gateway: 'PAYOS',
          transactionRef: txnRef,
          amount: paymentInfo.amount || 0,
          status: 'SUCCESS',
          rawPayload: JSON.stringify(paymentInfo),
        },
      });

      // ── GỬI EMAIL XÁC NHẬN ──
      try {
        const fullBooking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
          include: { user: true, tour: true, assistedDraft: true },
        });

        const ticketEmail = fullBooking?.assistedDraft?.emailForTicket || fullBooking?.user?.email;
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
            discountAmount: fullBooking.discountAmount > 0 ? `${fullBooking.discountAmount.toLocaleString('vi-VN')}₫` : undefined,
          });
        }
      } catch (emailError) {
        this.logger.error('[EMAIL] Lỗi gửi email xác nhận:', emailError);
        // Không throw — email lỗi không ảnh hưởng luồng thanh toán chính
      }
    } else if (paymentInfo.status === 'CANCELLED' || paymentInfo.status === 'EXPIRED') {
      // Hủy booking + hoàn trả ghế cho Tour
      await this.cancelAndRestoreSeats(booking.id, booking.tourId, booking.numberOfPeople);

      // [PHASE 1] Ghi log thanh toán thất bại
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
    // Nếu status === 'PENDING' → Chưa thanh toán, không thay đổi gì

    return paymentInfo;
  }

  /**
   * Tìm booking theo ID (orderCode của PayOS)
   */
  async findByOrderCode(orderCode: number) {
    const bookingId = orderCode >= 1000000 ? Math.floor(orderCode / 1000000) : orderCode;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  // ============ HELPER: Hủy Booking + Hoàn Trả Ghế ============

  /**
   * Hủy 1 booking cụ thể và cộng lại số ghế vào Tour.
   * Dùng chung cho: PayOS cancel, Webhook cancel, và Cron job tự hủy.
   */
  private async cancelAndRestoreSeats(bookingId: number, tourId: number, numberOfPeople: number) {
    await this.prisma.$transaction([
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
    ]);
  }

  /**
   * CRON JOB: Quét đơn hàng PENDING quá 15 phút và tự động hủy + hoàn trả ghế.
   * Được gọi bởi @nestjs/schedule mỗi 5 phút.
   */
  async cancelExpiredBookings(): Promise<{ batchSize: number; processedCount: number }> {
    const EXPIRY_MINUTES = 15;
    const expiryTime = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);

    // Tìm tất cả đơn PENDING đã tạo quá 15 phút
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        deletedAt: null, // [PHASE 1] Bỏ qua booking đã xóa mềm
        createdAt: { lt: expiryTime },
      },
    });

    if (expiredBookings.length === 0) {
      return { batchSize: 0, processedCount: 0 };
    }

    this.logger.log(`[CRON] Tìm thấy ${expiredBookings.length} đơn hàng PENDING quá hạn. Đang hủy...`);

    let processedCount = 0;
    for (const booking of expiredBookings) {
      await this.cancelAndRestoreSeats(booking.id, booking.tourId, booking.numberOfPeople);
      processedCount += 1;
      this.logger.log(`[CRON] Đã hủy booking #${booking.id} (${booking.bookingCode}) và hoàn ${booking.numberOfPeople} ghế cho tour #${booking.tourId}`);
    }

    this.logger.log(`[CRON] Hoàn tất dọn dẹp ${processedCount}/${expiredBookings.length} đơn hàng.`);
    return { batchSize: expiredBookings.length, processedCount };
  }

  // ============ CÁC HÀM CŨ GIỮ NGUYÊN ============

  /**
   * Admin: Xác nhận thủ công booking PENDING
   * Dùng khi khách đã thanh toán ngoài hệ thống (chuyển khoản sai nội dung, tiền mặt, v.v.)
   */
  async confirmManual(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        tour: { select: { id: true, name: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.status === 'CONFIRMED') throw new BadRequestException('Đơn hàng đã được xác nhận trước đó');
    if (booking.status === 'CANCELLED') throw new BadRequestException('Không thể xác nhận đơn hàng đã hủy');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        tour: { select: { id: true, name: true, imageUrl: true, tourCode: true } },
      },
    });

    this.logger.log(`[ADMIN MANUAL] Đã xác nhận thủ công booking #${bookingId} (${booking.bookingCode})`);

    return {
      ...updated,
      totalPrice: Number(updated.totalPrice),
      unitPriceAtBooking: Number(updated.unitPriceAtBooking),
      discountAmount: Number(updated.discountAmount),
    };
  }

  async getMyBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: {
        userId,
        deletedAt: null,
        // Hiện tất cả trạng thái, kể cả CANCELLED và CANCEL_REQUESTED
      },
      include: { tour: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin: Lấy toàn bộ danh sách booking (có filter tùy chọn)
   */
  async getAllBookings(
    status?: string,
    paymentStatus?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string,
    page = 1,
    limit = 10,
  ) {
    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
    };

    // Không ẩn cancelled nữa ở admin — admin cần thấy để quản lý
    if (status && status !== 'ALL') {
      const normalizedStatus = status.toUpperCase();
      if (!isBookingStatus(normalizedStatus)) {
        throw new BadRequestException('Invalid booking status');
      }
      where.status = normalizedStatus;
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      const normalizedPaymentStatus = paymentStatus.toUpperCase();
      if (!isPaymentStatus(normalizedPaymentStatus)) {
        throw new BadRequestException('Invalid payment status');
      }
      where.paymentStatus = normalizedPaymentStatus;
    }
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
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          tour: { select: { id: true, name: true, imageUrl: true, tourCode: true, destination: { select: { name: true } } } },
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          notifications: {
            where: { type: 'PAYMENT_REQUEST' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    // Thống kê tổng hợp (toàn bộ, không bị ảnh hưởng bởi filter)
    const [globalStats, paymentStats, revenueResult, assistedDraftStats] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
      this.prisma.booking.groupBy({
        by: ['paymentStatus'],
        where: { deletedAt: null },
        _count: { paymentStatus: true },
      }),
      this.prisma.booking.aggregate({
        where: { deletedAt: null, paymentStatus: 'PAID' },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
      this.prisma.assistedBookingDraft.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const statsMap: Record<string, number> = {};
    for (const s of globalStats) {
      statsMap[s.status] = s._count.status;
    }
    const paymentMap: Record<string, number> = {};
    for (const s of paymentStats) {
      paymentMap[s.paymentStatus] = s._count.paymentStatus;
    }
    const assistedDraftMap: Record<string, number> = {};
    for (const s of assistedDraftStats) {
      assistedDraftMap[s.status] = s._count.status;
    }

    return {
      bookings: bookings.map(b => ({
        ...b,
        totalPrice: Number(b.totalPrice),
        unitPriceAtBooking: Number(b.unitPriceAtBooking),
        discountAmount: Number(b.discountAmount),
      })),
      stats: {
        pending: statsMap['PENDING'] || 0,
        confirmed: statsMap['CONFIRMED'] || 0,
        cancelRequested: statsMap['CANCEL_REQUESTED'] || 0,
        cancelled: statsMap['CANCELLED'] || 0,
        total: Object.values(statsMap).reduce((a, b) => a + b, 0),
        totalRevenue: Number(revenueResult._sum.totalPrice || 0),
        paidCount: revenueResult._count.id,
        unpaidCount: paymentMap['UNPAID'] || 0,
        processingCount: paymentMap['PROCESSING'] || 0,
        failedPaymentCount: paymentMap['FAILED'] || 0,
        assistedDraftPending: assistedDraftMap['PENDING_APPROVAL'] || 0,
        assistedDraftNeedsRevision: assistedDraftMap['NEEDS_REVISION'] || 0,
      },
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  /**
   * Khách hàng thanh toán lại booking PENDING (chưa quá 15 phút)
   * Tạo lại PayOS payment link và trả về checkoutUrl
   */
  async retryPayment(bookingId: number, userId: number) {
    const EXPIRY_MINUTES = 15;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tour: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Chỉ cho phép chủ booking thực hiện
    if (booking.userId !== userId) {
      throw new BadRequestException('Không có quyền truy cập booking này');
    }

    // Chỉ cho retry nếu booking vẫn PENDING và chưa thanh toán
    if (booking.status !== 'PENDING' || booking.paymentStatus !== 'UNPAID') {
      throw new BadRequestException('Booking này không ở trạng thái chờ thanh toán');
    }

    // Kiểm tra xem booking đã quá 15 phút chưa
    const expiryTime = new Date(booking.createdAt.getTime() + EXPIRY_MINUTES * 60 * 1000);
    if (new Date() > expiryTime) {
      throw new BadRequestException('Booking đã hết hạn thanh toán (quá 15 phút). Vui lòng đặt tour mới.');
    }

    // Lấy lại checkout URL từ PayOS thay vì tạo mới (tránh lỗi 231 "order đã tồn tại")
    const amountVND = Math.round(booking.totalPrice);
    const description = `AH ${booking.bookingCode}`;

    // Tạo orderCode MỚI cho mỗi lần retry để tránh trùng lặp
    const timeSuffix = (Date.now() % 1000000).toString().padStart(6, '0');
    const orderCode = Number(booking.id.toString() + timeSuffix);

    let checkoutUrl: string;
    try {
      // Thử tạo mới trước
      checkoutUrl = await this.paymentService.createPaymentLink(
        orderCode,
        amountVND,
        description,
      );
    } catch (payosError: unknown) {
      // PayOS lỗi 231: đã tồn tại PayOS order này → lấy lại link cũ
      if (isPayosDuplicateError(payosError)) {
        this.logger.warn(`[RETRY] PayOS order #${orderCode} đã tồn tại, lấy lại checkout URL.`);
        const existing = await this.paymentService.getPaymentInfo(orderCode);
        if (!existing?.id) {
          throw new BadRequestException(
            'Không thể lấy liên kết thanh toán. Link có thể đã hết hạn. Vui lòng đặt tour mới.'
          );
        }
        // PaymentLink.id là paymentLinkId, dùng để tạo URL checkout
        checkoutUrl = `https://pay.payos.vn/web/${existing.id}`;
      } else {
        throw payosError;
      }
    }

    this.logger.log(`[RETRY] Tạo lại link thanh toán cho booking #${booking.id} (${booking.bookingCode})`);

    return { checkoutUrl, expiresAt: expiryTime.toISOString() };
  }

  async getBookingById(bookingId: number) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true, // Lấy fullName từ bảng User
        tour: true, // Lấy name, startDate, imageUrl từ bảng Tour
      },
    });
  }

  async findByBookingCode(bookingCode: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: bookingCode },
      include: {
        tour: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Bọc trong object { data: ... } để khớp 100% với Frontend của em
    return { data: booking };
  }

  async proxyImage(imageUrl: string, res: Response) {
    try {
      // Gọi sang Unsplash để lấy ảnh dưới dạng luồng dữ liệu (Stream)
      const response = await firstValueFrom(
        this.httpService.get<ProxiedStream>(imageUrl, {
          responseType: 'stream',
        }),
      );

      // Đặt thẻ tiêu đề cho phép CORS để Frontend chụp ảnh được
      res.setHeader('Access-Control-Allow-Origin', '*');
      const contentType: unknown = response.headers['content-type'];
      res.setHeader('Content-Type', typeof contentType === 'string' ? contentType : 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache ảnh để tăng tốc

      // Stream dữ liệu ảnh về cho Frontend
      response.data.pipe(res);

    } catch (error) {
      this.logger.error('Lỗi khi proxy ảnh:', getErrorMessage(error));
      throw new NotFoundException('Failed to proxy image');
    }
  }

  // ============ CANCELLATION FLOW ============

  /**
   * Tính số tiền hoàn theo chính sách 3 tier:
   * >= 7 ngày trước khởi hành → hoàn 100%
   * 3-6 ngày → hoàn 50%
   * < 3 ngày hoặc đã qua → không hoàn
   * PENDING (chưa thanh toán) → hoàn 100% ngay
   */
  calculateRefund(booking: {
    paymentStatus: string;
    totalPrice: number;
    tour: { startDate: Date };
  }): { refundAmount: number; refundNote: string; policyTier: string } {
    if (booking.paymentStatus !== 'PAID') {
      return {
        refundAmount: Number(booking.totalPrice),
        refundNote: 'Hoàn 100% — chưa thanh toán',
        policyTier: 'FULL_UNPAID',
      };
    }

    // [FIX] Sử dụng moment để tính toán số ngày lịch (tính từ đầu ngày) để tránh sai số múi giờ và sai số giờ lẻ.
    const today = moment().startOf('day');
    const tourStartDate = moment(booking.tour.startDate).startOf('day');
    const daysUntilTour = tourStartDate.diff(today, 'days');

    if (daysUntilTour >= 7) {
      return {
        refundAmount: Number(booking.totalPrice),
        refundNote: 'Hoàn 100% (hủy trước 7 ngày khởi hành)',
        policyTier: 'FULL_REFUND',
      };
    } else if (daysUntilTour >= 3) {
      return {
        refundAmount: Number(booking.totalPrice) * 0.5,
        refundNote: 'Hoàn 50% (hủy trong vòng 3-6 ngày trước khởi hành)',
        policyTier: 'HALF_REFUND',
      };
    } else {
      return {
        refundAmount: 0,
        refundNote: 'Không hoàn tiền (hủy dưới 3 ngày hoặc sau ngày khởi hành)',
        policyTier: 'NO_REFUND',
      };
    }
  }

  /**
   * Khách hàng gửi yêu cầu hủy booking.
   * - PENDING (chưa thanh toán): hủy ngay, không cần admin duyệt.
   * - CONFIRMED (đã thanh toán): chuyển sang CANCEL_REQUESTED, chờ admin.
   */
  async requestCancellation(bookingId: number, userId: number, reason: string, bankDetails?: Prisma.InputJsonValue) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.userId !== userId) throw new BadRequestException('Không có quyền hủy booking này');

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking này đã được hủy trước đó');
    }
    if (booking.status === 'CANCEL_REQUESTED') {
      throw new BadRequestException('Yêu cầu hủy của bạn đang chờ xử lý');
    }

    const { refundAmount, refundNote } = this.calculateRefund({
      paymentStatus: booking.paymentStatus,
      totalPrice: Number(booking.totalPrice),
      tour: booking.tour,
    });

    // PENDING = chưa thanh toán → hủy ngay, hoàn ghế
    if (booking.status === 'PENDING') {
      // [FIX] Optimistic Concurrency Control: Đảm bảo status vẫn là PENDING lúc update
      await this.prisma.$transaction(async (tx) => {
        const updateResult = await tx.booking.updateMany({
          where: { id: bookingId, status: 'PENDING' },
          data: {
            status: 'CANCELLED',
            cancelReason: reason,
            cancelledAt: new Date(),
            cancelledBy: 'CUSTOMER',
            refundAmount: 0,
            refundNote: 'Hủy trước khi thanh toán',
          },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException('Trạng thái đơn hàng đã thay đổi, không thể hủy tự động. Vui lòng tải lại trang.');
        }

        await tx.tour.update({
          where: { id: booking.tourId },
          data: { availableSeats: { increment: booking.numberOfPeople } },
        });
      });

      // [FIX] Hủy link thanh toán bên PayOS để khách không thanh toán nhầm vào đơn đã hủy
      try {
        await this.paymentService.cancelPaymentLink(bookingId, 'Khách hàng chủ động hủy đơn');
      } catch {
        this.logger.warn(`[PAYOS] Không thể hủy link PayOS cho booking #${bookingId} (có thể link đã hết hạn).`);
      }

      this.logger.log(`[CANCEL] Khách hủy booking PENDING #${bookingId} trước khi thanh toán`);
      return { message: 'Đã hủy đặt tour thành công', refundAmount: 0, refundNote: 'Chưa thanh toán — không có hoàn tiền' };
    }

    // CONFIRMED = đã thanh toán → chuyển sang CANCEL_REQUESTED, chờ admin
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCEL_REQUESTED',
        cancelReason: reason,
        cancelRequestedAt: new Date(),
        refundAmount,
        refundNote,
        refundBankDetails: bankDetails === undefined ? Prisma.JsonNull : bankDetails, // Luu thong tin ngan hang neu co
      },
    });

    // Gửi email xác nhận cho khách
    try {
      if (booking.user?.email) {
        await this.mailService.sendCancelRequestConfirmation({
          to: booking.user.email,
          customerName: booking.user.fullName,
          bookingCode: booking.bookingCode,
          tourName: booking.tour.name,
          cancelReason: reason,
          refundAmount,
          refundNote,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Lỗi gửi email yêu cầu hủy:', emailError);
    }

    this.logger.log(`[CANCEL] Booking #${bookingId} chuyển sang CANCEL_REQUESTED. Dự kiến hoàn: ${refundAmount}đ`);
    return { message: 'Yêu cầu hủy đã được ghi nhận, đang chờ xử lý', refundAmount, refundNote };
  }

  /**
   * Admin duyệt yêu cầu hủy → CANCELLED + hoàn ghế
   */
  async approveCancellation(bookingId: number, adminNote?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.status !== 'CANCEL_REQUESTED') {
      throw new BadRequestException('Booking này không ở trạng thái chờ duyệt hủy');
    }

    const refundAmount = Number(booking.refundAmount ?? 0);

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          cancelledAt: new Date(),
          cancelledBy: 'ADMIN',
          refundNote: adminNote || booking.refundNote,
          refundedAt: new Date(), // Ghi nhận thời điểm thực sự hoàn tiền
        },
      }),
      this.prisma.tour.update({
        where: { id: booking.tourId },
        data: { availableSeats: { increment: booking.numberOfPeople } },
      }),
    ]);

    // Ghi log PaymentTransaction REFUND nếu có hoàn tiền
    if (refundAmount > 0) {
      await this.prisma.paymentTransaction.create({
        data: {
          bookingId,
          gateway: 'MANUAL',
          amount: refundAmount,
          // [FIX] Trạng thái PENDING vì kế toán còn phải duyệt lệnh chuyển tiền thực tế
          status: 'PENDING',
          transactionRef: `REFUND-${bookingId}-${Date.now()}`,
        },
      });
    }

    // Gửi email thông báo cho khách
    try {
      if (booking.user?.email) {
        await this.mailService.sendCancellationApproved({
          to: booking.user.email,
          customerName: booking.user.fullName,
          bookingCode: booking.bookingCode,
          tourName: booking.tour.name,
          refundAmount,
          adminNote,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Lỗi gửi email duyệt hủy:', emailError);
    }

    this.logger.log(`[ADMIN] Đã duyệt hủy booking #${bookingId}. Hoàn tiền: ${refundAmount}đ`);
    return { message: 'Đã duyệt hủy booking và hoàn trả ghế', refundAmount };
  }

  /**
   * Admin từ chối yêu cầu hủy → CONFIRMED trở lại
   */
  async rejectCancellation(bookingId: number, rejectReason: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.status !== 'CANCEL_REQUESTED') {
      throw new BadRequestException('Booking này không ở trạng thái chờ duyệt hủy');
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        cancelReason: null,
        cancelRequestedAt: null,
        refundAmount: null,
        refundNote: rejectReason,
      },
    });

    // Gửi email thông báo từ chối cho khách
    try {
      if (booking.user?.email) {
        await this.mailService.sendCancellationRejected({
          to: booking.user.email,
          customerName: booking.user.fullName,
          bookingCode: booking.bookingCode,
          tourName: booking.tour.name,
          rejectReason,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Lỗi gửi email từ chối hủy:', emailError);
    }

    this.logger.log(`[ADMIN] Đã từ chối hủy booking #${bookingId}. Lý do: ${rejectReason}`);
    return { message: 'Đã từ chối yêu cầu hủy, booking tiếp tục hiệu lực' };
  }

  /**
   * Admin lấy danh sách yêu cầu hủy đang chờ xử lý và thống kê hoàn tiền
   */
  async getCancelRequests() {
    // 1. Lấy danh sách yêu cầu đang chờ
    const requests = await this.prisma.booking.findMany({
      where: { status: 'CANCEL_REQUESTED', deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        tour: { select: { id: true, name: true, imageUrl: true, tourCode: true, startDate: true } },
      },
      orderBy: { cancelRequestedAt: 'asc' }, // Xử lý theo thứ tự gửi
    });

    const formattedRequests = requests.map(b => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      unitPriceAtBooking: Number(b.unitPriceAtBooking),
      discountAmount: Number(b.discountAmount),
      refundAmount: Number(b.refundAmount ?? 0),
    }));

    // 2. Tính toán thống kê hoàn tiền
    const pendingCancelCount = formattedRequests.length;
    const pendingRefundAmount = formattedRequests.reduce((sum, r) => sum + r.refundAmount, 0);

    // Lấy tổng tiền đã hoàn (những booking đã CANCELLED và có refundedAt)
    const refundedAgg = await this.prisma.booking.aggregate({
      where: { status: 'CANCELLED', refundedAt: { not: null }, deletedAt: null },
      _sum: { refundAmount: true },
    });
    const totalRefundedAmount = Number(refundedAgg._sum.refundAmount ?? 0);

    return {
      requests: formattedRequests,
      stats: {
        pendingCancelCount,
        pendingRefundAmount,
        totalRefundedAmount,
      }
    };
  }

  /**
   * Quick stats for Staff Dashboard (no revenue, just booking counts).
   * Accessible by STAFF | ADMIN | SUPER_ADMIN.
   */
  async getAdminQuickStats() {
    const [grouped, paymentGrouped, myToursCount, assistedDraftGrouped] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
      this.prisma.booking.groupBy({
        by: ['paymentStatus'],
        where: { deletedAt: null },
        _count: { paymentStatus: true },
      }),
      this.prisma.tour.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      this.prisma.assistedBookingDraft.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const map: Record<string, number> = {};
    for (const row of grouped) map[row.status] = row._count.status;
    const paymentMap: Record<string, number> = {};
    for (const row of paymentGrouped) paymentMap[row.paymentStatus] = row._count.paymentStatus;
    const assistedDraftMap: Record<string, number> = {};
    for (const row of assistedDraftGrouped) assistedDraftMap[row.status] = row._count.status;

    return {
      pending: map['PENDING'] || 0,
      confirmed: map['CONFIRMED'] || 0,
      cancelRequested: map['CANCEL_REQUESTED'] || 0,
      cancelled: map['CANCELLED'] || 0,
      total: Object.values(map).reduce((a, b) => a + b, 0),
      publishedTours: myToursCount,
      unpaidCount: paymentMap['UNPAID'] || 0,
      processingCount: paymentMap['PROCESSING'] || 0,
      failedPaymentCount: paymentMap['FAILED'] || 0,
      assistedDraftPending: assistedDraftMap['PENDING_APPROVAL'] || 0,
      assistedDraftNeedsRevision: assistedDraftMap['NEEDS_REVISION'] || 0,
    };
  }

  findAll() {
    return `This action returns all booking`;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    void updateBookingDto;
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}


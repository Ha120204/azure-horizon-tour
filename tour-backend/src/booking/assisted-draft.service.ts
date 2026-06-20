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
import { SettingsService } from '../settings/settings.service';
import {
  PaymentService,
  type PaymentLinkResult,
} from '../payment/payment.service';
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
  passengers?: unknown;
  tour?: { departures?: Array<{ id: number }> | null } | null;
};

const ASSISTED_SOURCE_CHANNELS = [
  'LIVE_CHAT',
  'ZALO',
  'FACEBOOK',
  'PHONE',
  'WEBSITE',
  'WALK_IN',
  'PARTNER',
] as const;

const ASSISTED_CONFIRMATION_CHANNELS = [
  'ZALO',
  'EMAIL',
  'SMS',
  'PHONE',
  'MANUAL',
  'NO_SEND',
] as const;

function normalizeAssistedSourceChannel(value?: string | null) {
  const normalized = String(value || 'LIVE_CHAT')
    .trim()
    .toUpperCase();
  return ASSISTED_SOURCE_CHANNELS.includes(
    normalized as (typeof ASSISTED_SOURCE_CHANNELS)[number],
  )
    ? normalized
    : 'LIVE_CHAT';
}

function normalizeAssistedConfirmationChannel(value?: string | null) {
  const normalized = String(value || 'ZALO')
    .trim()
    .toUpperCase();
  return ASSISTED_CONFIRMATION_CHANNELS.includes(
    normalized as (typeof ASSISTED_CONFIRMATION_CHANNELS)[number],
  )
    ? normalized
    : 'MANUAL';
}

@Injectable()
export class AssistedDraftService {
  private readonly logger = new Logger(AssistedDraftService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly voucherService: VoucherService,
    private readonly mailService: MailService,
    private readonly paymentService: PaymentService,
    private readonly settingsService: SettingsService,
  ) {}

  // ─── Private helpers ───────────────────────────────────────────────────────

  private assistedDraftInclude(): Prisma.AssistedBookingDraftInclude {
    return {
      tour: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          tourCode: true,
          destination: { select: { name: true } },
        },
      },
      customer: {
        select: { id: true, fullName: true, email: true, phone: true },
      },
      createdByStaff: {
        select: { id: true, fullName: true, email: true, role: true },
      },
      reviewedByAdmin: {
        select: { id: true, fullName: true, email: true, role: true },
      },
      convertedBooking: {
        select: {
          id: true,
          bookingCode: true,
          status: true,
          paymentStatus: true,
        },
      },
      sourceTicket: {
        select: {
          id: true,
          subject: true,
          customerName: true,
          customerEmail: true,
        },
      },
    };
  }

  private formatAssistedDraft<T extends AssistedDraftRecord>(draft: T) {
    return {
      ...draft,
      quotedPrice: Number(draft.quotedPrice),
      unitPriceAtDraft:
        draft.unitPriceAtDraft == null ? null : Number(draft.unitPriceAtDraft),
      discountAmount: Number(draft.discountAmount || 0),
    };
  }

  private assertAssistedDraftReadyForApproval(
    draft: AssistedDraftValidationSource,
  ) {
    if (!draft.customerName?.trim())
      throw new BadRequestException(
        'Cần nhập tên người đại diện trước khi gửi duyệt',
      );
    if (
      !draft.customerEmail?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.customerEmail)
    )
      throw new BadRequestException('Email người đại diện chưa đúng định dạng');
    if (!draft.customerPhone?.trim())
      throw new BadRequestException('Cần nhập số điện thoại người đại diện');
    if (
      !/^(0\d{9}|\+?84\d{9})$/.test(
        draft.customerPhone.trim().replace(/\s+/g, ''),
      )
    )
      throw new BadRequestException(
        'Số điện thoại người đại diện chưa đúng định dạng Việt Nam',
      );
    if (
      draft.customerIdentityNo?.trim() &&
      !/^\d{12}$/.test(draft.customerIdentityNo.trim())
    )
      throw new BadRequestException(
        'CCCD người đại diện phải gồm đúng 12 chữ số',
      );
    const confirmationChannel = normalizeAssistedConfirmationChannel(
      draft.confirmationChannel,
    );
    if (
      confirmationChannel === 'EMAIL' &&
      !draft.emailForTicket?.trim() &&
      !draft.customerEmail?.trim()
    )
      throw new BadRequestException(
        'Cần email nhận vé hoặc email người đại diện khi chọn kênh Email',
      );
    if (!draft.tourId)
      throw new BadRequestException('Cần chọn tour trước khi gửi duyệt');
    if (!draft.numberOfPeople || draft.numberOfPeople < 1)
      throw new BadRequestException('Số khách phải từ 1 trở lên');
    const passengerInputs = asPassengerInputs(draft.passengers) ?? [];
    if (passengerInputs.length !== draft.numberOfPeople)
      throw new BadRequestException(
        'Danh sách khách đi tour chưa khớp tổng số khách',
      );
    const normalizedPassengers = normalizePassengers(
      draft.passengers,
      draft.numberOfPeople,
    );
    const adultCount = normalizedPassengers.filter(
      (passenger) => passenger.type === 'Adult (12+)',
    ).length;
    const infantCount = normalizedPassengers.filter(
      (passenger) => passenger.type === 'Infant (<4)',
    ).length;
    if (adultCount < 1)
      throw new BadRequestException('Cần ít nhất 1 người lớn trong đoàn');
    if (infantCount > adultCount)
      throw new BadRequestException('Số em bé không vượt quá số người lớn');
    if ((draft.tour?.departures?.length ?? 0) > 0 && !draft.departureId)
      throw new BadRequestException(
        'Cần chọn lịch khởi hành cụ thể trước khi gửi duyệt',
      );
  }

  async calculateAssistedQuote(
    tx: TransactionClient,
    dto: AssistedQuoteDto,
  ): Promise<AssistedQuote> {
    const tour = await tx.tour.findUnique({
      where: { id: dto.tourId, deletedAt: null },
    });
    if (!tour) throw new NotFoundException('Không tìm thấy tour');
    if (tour.startDate < new Date())
      throw new BadRequestException(
        'Tour này đã diễn ra, không thể tạo booking đặt hộ',
      );

    let selectedDeparture: TourDeparture | null = null;
    if (dto.departureId) {
      selectedDeparture = await tx.tourDeparture.findUnique({
        where: { id: dto.departureId },
      });
      if (
        !selectedDeparture ||
        selectedDeparture.tourId !== tour.id ||
        !selectedDeparture.isActive
      )
        throw new BadRequestException('Lịch khởi hành không hợp lệ');
      if (selectedDeparture.availableSeats < dto.numberOfPeople)
        throw new BadRequestException(
          'Lịch khởi hành không còn đủ chỗ cho đoàn này',
        );
    } else if (tour.availableSeats < dto.numberOfPeople) {
      throw new BadRequestException('Tour không còn đủ chỗ cho đoàn này');
    }

    let basePrice = selectedDeparture?.price ?? tour.price;
    if (dto.packageId) {
      const pkg = await tx.tourPackage.findUnique({
        where: { id: dto.packageId },
      });
      if (!pkg || pkg.tourId !== tour.id || !pkg.isActive)
        throw new BadRequestException('Gói tour không hợp lệ');
      basePrice += pkg.price;
    }

    let totalPrice = getPassengerTotal(
      basePrice,
      dto.numberOfPeople,
      dto.passengers,
    );
    let discountAmount = 0;
    let voucherCode: string | null = null;

    if (dto.voucherCode) {
      assertVoucherAllowedForDeparture(
        selectedDeparture,
        dto.voucherCode,
        tour.price,
      );
      const result = await this.voucherService.validateVoucher(
        dto.voucherCode,
        totalPrice,
        {
          userId: dto.customerId ?? null,
          tourId: tour.id,
          departureId: selectedDeparture?.id ?? null,
        },
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

    const email = String(draft.customerEmail || '')
      .trim()
      .toLowerCase();

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
      const user = await tx.user.findUnique({
        where: { id: draft.customerId },
      });
      if (!user) throw new NotFoundException('Không tìm thấy khách hàng');
      return user;
    }
    const email = String(draft.customerEmail || '')
      .trim()
      .toLowerCase();
    const existing = await tx.user.findFirst({ where: { email } });
    if (existing) {
      return tx.user.update({
        where: { id: existing.id },
        data: {
          phone: draft.customerPhone || existing.phone,
          identityType: draft.customerIdentityNo
            ? 'CCCD'
            : existing.identityType,
          identityNo: draft.customerIdentityNo || existing.identityNo,
        },
      });
    }

    // Tại đây prehashedPassword được đảm bảo không null vì prepareGuestPassword()
    // đã được gọi trước với cùng điều kiện. Nếu vì lý do bất thường null được truyền vào,
    // fallback về tạo hash tại chỗ để không crash.
    const hashedPassword =
      prehashedPassword ??
      (await bcrypt.hash(randomBytes(24).toString('hex'), 10));

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

  async markVoucherAsUsed(
    tx: TransactionClient,
    userId: number,
    voucherCode?: string | null,
  ) {
    const code = voucherCode?.trim().toUpperCase();
    if (!code) return;
    const voucher = await tx.voucher.findUnique({ where: { code } });
    if (!voucher) return;
    const result = await tx.voucher.updateMany({
      where: { id: voucher.id, usedCount: { lt: voucher.maxUses } },
      data: { usedCount: { increment: 1 } },
    });
    if (result.count === 0) {
      this.logger.warn(
        `[VOUCHER] Voucher ${code} da het luot khi booking thanh toan thanh cong.`,
      );
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

  async createPaymentRequestForBooking(
    bookingId: number,
    actorUserId?: number,
    forceEmail = false,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        tour: {
          select: { id: true, name: true, startDate: true, duration: true },
        },
        assistedDraft: true,
      },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    if (booking.paymentStatus === 'PAID')
      throw new BadRequestException('Booking đã thanh toán');
    if (booking.paymentMethod !== 'PAYOS') {
      throw new BadRequestException(
        'Đơn tại quầy không tạo link PayOS. Hãy đổi phương thức sang PayOS trước khi gửi lại yêu cầu thanh toán.',
      );
    }
    const holdExpiresAt =
      booking.holdExpiresAt ??
      new Date(Date.now() + PAYOS_HOLD_MINUTES * 60 * 1000);
    if (holdExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Booking đã hết hạn thanh toán. Vui lòng tạo booking mới.',
      );
    }

    const channel = forceEmail
      ? 'EMAIL'
      : booking.assistedDraft?.confirmationChannel;
    const normalizedChannel = normalizeAssistedConfirmationChannel(channel);
    const emailRecipient =
      booking.assistedDraft?.emailForTicket ||
      booking.assistedDraft?.customerEmail ||
      booking.user.email;
    const recipient =
      normalizedChannel === 'EMAIL'
        ? emailRecipient
        : normalizedChannel === 'NO_SEND'
          ? null
          : booking.assistedDraft?.customerPhone || booking.user.phone || null;
    const amountVND = Math.round(booking.totalPrice);
    const description = `AH ${booking.bookingCode}`;

    const payload: PaymentNotificationPayload = {
      bookingCode: booking.bookingCode,
      customerName:
        booking.assistedDraft?.customerName || booking.user.fullName,
      tourName: booking.tour.name,
      startDate: booking.tour.startDate.toLocaleDateString('vi-VN'),
      duration: booking.tour.duration,
      passengerBreakdown: getPassengerBreakdown(
        booking.passengers,
        booking.numberOfPeople,
      ),
      totalPrice: formatMoney(amountVND),
      discountAmount:
        booking.discountAmount > 0
          ? formatMoney(booking.discountAmount)
          : undefined,
      deadlineText: `truoc ${holdExpiresAt.toLocaleString('vi-VN')}`,
    };

    let paymentRequest: PaymentLinkResult;
    try {
      paymentRequest = await this.paymentService.createPaymentRequest(
        buildPayosOrderCode(booking.id),
        amountVND,
        description,
      );
    } catch (error) {
      const notification = await this.prisma.bookingNotification.create({
        data: {
          bookingId: booking.id,
          type: 'PAYMENT_REQUEST',
          channel: normalizedChannel,
          recipient,
          status: 'FAILED',
          subject: `Yeu cau thanh toan ${booking.bookingCode}`,
          content: buildPaymentRequestContent(
            payload,
            'Khong tao duoc link thanh toan.',
          ),
          errorMessage: getErrorMessage(error),
          createdById: actorUserId,
        },
      });
      this.logger.error(
        `[ASSISTED PAYMENT] Khong tao duoc PayOS link cho booking #${booking.id}: ${getErrorMessage(error)}`,
      );
      return { notification, paymentRequest: null };
    }

    await this.replacePendingPayosTransaction(
      booking.id,
      String(paymentRequest.orderCode),
      amountVND,
      JSON.stringify({
        ...paymentRequest,
        assistedDraftId: booking.assistedDraftId,
      }),
    );

    const content = buildPaymentRequestContent(
      payload,
      paymentRequest.checkoutUrl,
    );
    let notification = await this.prisma.bookingNotification.create({
      data: {
        bookingId: booking.id,
        type: 'PAYMENT_REQUEST',
        channel: normalizedChannel,
        recipient,
        status: normalizedChannel === 'NO_SEND' ? 'SKIPPED' : 'PENDING',
        subject: `Yeu cau thanh toan ${booking.bookingCode}`,
        content,
        paymentUrl: paymentRequest.checkoutUrl,
        qrCodeUrl:
          paymentRequest.qrCode ||
          `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentRequest.checkoutUrl)}`,
        createdById: actorUserId,
      },
    });

    if (normalizedChannel === 'EMAIL') {
      if (!emailRecipient) {
        notification = await this.prisma.bookingNotification.update({
          where: { id: notification.id },
          data: { status: 'FAILED', errorMessage: 'Thiếu email người nhận' },
        });
      } else {
        try {
          await this.mailService.sendPaymentRequestEmail({
            ...payload,
            to: emailRecipient,
            paymentUrl: paymentRequest.checkoutUrl,
            qrCodeUrl:
              paymentRequest.qrCode || notification.qrCodeUrl || undefined,
          });
          notification = await this.prisma.bookingNotification.update({
            where: { id: notification.id },
            data: { status: 'SENT', sentAt: new Date() },
          });
        } catch (error) {
          notification = await this.prisma.bookingNotification.update({
            where: { id: notification.id },
            data: { status: 'FAILED', errorMessage: getErrorMessage(error) },
          });
        }
      }
    }
    return { notification, paymentRequest };
  }

  // ─── Public CRUD methods ───────────────────────────────────────────────────

  async createAssistedDraft(
    actorUserId: number,
    dto: CreateAssistedBookingDraftDto,
  ) {
    const payload = {
      ...dto,
      customerName: dto.customerName?.trim(),
      customerEmail: dto.customerEmail?.trim().toLowerCase(),
      customerPhone: dto.customerPhone?.trim() || null,
      customerIdentityNo: dto.customerIdentityNo?.trim() || null,
      sourceChannel: normalizeAssistedSourceChannel(dto.sourceChannel),
      confirmationChannel: normalizeAssistedConfirmationChannel(
        dto.confirmationChannel,
      ),
      emailForTicket:
        dto.emailForTicket?.trim().toLowerCase() ||
        dto.customerEmail?.trim().toLowerCase() ||
        null,
      voucherCode: dto.voucherCode?.trim() || undefined,
      specialRequests: dto.specialRequests?.trim() || null,
      internalNote: dto.internalNote?.trim() || null,
      passengers: normalizePassengers(
        dto.passengers,
        Number(dto.numberOfPeople) || 1,
      ),
    };
    const numberOfPeople = payload.passengers.length;

    const draft = await this.prisma.$transaction(async (tx) => {
      const quote = payload.tourId
        ? await this.calculateAssistedQuote(tx, {
            ...payload,
            tourId: payload.tourId,
            numberOfPeople,
          })
        : {
            basePrice: null,
            totalPrice: 0,
            discountAmount: 0,
            voucherCode: null,
          };

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

  async updateAssistedDraft(
    id: number,
    actorUserId: number,
    actorRole: string,
    dto: CreateAssistedBookingDraftDto,
  ) {
    const existing = await this.prisma.assistedBookingDraft.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException('Không tìm thấy bản nháp đặt hộ');
    if (actorRole === 'STAFF' && existing.createdByStaffId !== actorUserId)
      throw new ForbiddenException('Bạn không có quyền sửa bản nháp này');
    if (!['DRAFT', 'NEEDS_REVISION'].includes(existing.status))
      throw new BadRequestException(
        'Chỉ có thể sửa bản nháp hoặc bản cần chỉnh sửa',
      );

    const payload = {
      ...dto,
      customerName: dto.customerName?.trim(),
      customerEmail: dto.customerEmail?.trim().toLowerCase(),
      customerPhone: dto.customerPhone?.trim() || null,
      customerIdentityNo: dto.customerIdentityNo?.trim() || null,
      sourceChannel:
        dto.sourceChannel !== undefined
          ? normalizeAssistedSourceChannel(dto.sourceChannel)
          : normalizeAssistedSourceChannel(existing.sourceChannel),
      confirmationChannel:
        dto.confirmationChannel !== undefined
          ? normalizeAssistedConfirmationChannel(dto.confirmationChannel)
          : normalizeAssistedConfirmationChannel(existing.confirmationChannel),
      emailForTicket:
        dto.emailForTicket?.trim().toLowerCase() ||
        dto.customerEmail?.trim().toLowerCase() ||
        existing.emailForTicket ||
        null,
      voucherCode: dto.voucherCode?.trim() || undefined,
      specialRequests: dto.specialRequests?.trim() || null,
      internalNote: dto.internalNote?.trim() || null,
      passengers: normalizePassengers(
        dto.passengers,
        Number(dto.numberOfPeople) || existing.numberOfPeople || 1,
      ),
    };
    const numberOfPeople = payload.passengers.length;

    const draft = await this.prisma.$transaction(async (tx) => {
      const quote = payload.tourId
        ? await this.calculateAssistedQuote(tx, {
            ...payload,
            tourId: payload.tourId,
            numberOfPeople,
          })
        : {
            basePrice: null,
            totalPrice: 0,
            discountAmount: 0,
            voucherCode: null,
          };

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

  async getAssistedDrafts(
    actorUserId: number,
    actorRole: string,
    status?: string,
    search?: string,
  ) {
    const where: Prisma.AssistedBookingDraftWhereInput = {};
    if (actorRole === 'STAFF') where.createdByStaffId = actorUserId;
    if (status && status !== 'ALL') {
      const normalizedStatus = status.toUpperCase();
      if (!isAssistedDraftStatus(normalizedStatus))
        throw new BadRequestException('Trạng thái bản nháp không hợp lệ');
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
      where,
      include: this.assistedDraftInclude(),
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return drafts.map((d) => this.formatAssistedDraft(d));
  }

  async deleteAssistedDraft(
    id: number,
    actorUserId: number,
    actorRole: string,
  ) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({
      where: { id },
      include: {
        convertedBooking: { select: { id: true, bookingCode: true } },
      },
    });
    if (!draft) throw new NotFoundException('Không tìm thấy bản nháp đặt hộ');
    if (actorRole === 'STAFF' && draft.createdByStaffId !== actorUserId) {
      throw new ForbiddenException('Bạn không có quyền xóa bản nháp này');
    }
    if (draft.convertedBooking || draft.status === 'CONVERTED') {
      throw new BadRequestException('Bản nháp đã tạo booking, không thể xóa');
    }
    if (!['DRAFT', 'NEEDS_REVISION', 'REJECTED'].includes(draft.status)) {
      throw new BadRequestException(
        'Chỉ có thể xóa bản nháp, bản cần sửa hoặc bản đã từ chối',
      );
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
      message: 'Đã xóa bản nháp đặt hộ',
      data: { id: draft.id, draftCode: draft.draftCode },
    };
  }

  async submitAssistedDraft(
    id: number,
    actorUserId: number,
    actorRole: string,
  ) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({
      where: { id },
      include: {
        tour: {
          include: {
            departures: { where: { isActive: true }, select: { id: true } },
          },
        },
      },
    });
    if (!draft) throw new NotFoundException('Không tìm thấy bản nháp đặt hộ');
    const normalizedRole = actorRole.toUpperCase();
    if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN') {
      return this.approveAssistedDraft(
        id,
        actorUserId,
        'Admin duyệt trực tiếp từ thao tác gửi duyệt',
      );
    }
    if (normalizedRole === 'STAFF' && draft.createdByStaffId !== actorUserId)
      throw new ForbiddenException('Bạn không có quyền gửi bản nháp này');
    if (!['DRAFT', 'NEEDS_REVISION'].includes(draft.status))
      throw new BadRequestException(
        'Chỉ có thể gửi bản nháp hoặc bản cần chỉnh sửa',
      );
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

  async requestRevisionAssistedDraft(
    id: number,
    adminId: number,
    reason: string,
  ) {
    const draft = await this.prisma.assistedBookingDraft.findUnique({
      where: { id },
    });
    if (!draft) throw new NotFoundException('Không tìm thấy bản nháp đặt hộ');
    if (draft.status !== 'PENDING_APPROVAL')
      throw new BadRequestException(
        'Chỉ bản nháp đang chờ duyệt mới có thể yêu cầu chỉnh sửa',
      );
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
    const draft = await this.prisma.assistedBookingDraft.findUnique({
      where: { id },
    });
    if (!draft) throw new NotFoundException('Không tìm thấy bản nháp đặt hộ');
    if (draft.status !== 'PENDING_APPROVAL')
      throw new BadRequestException(
        'Chỉ bản nháp đang chờ duyệt mới có thể bị từ chối',
      );
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
          tour: {
            include: {
              departures: { where: { isActive: true }, select: { id: true } },
            },
          },
        },
      });
      if (!draft) throw new NotFoundException('Không tìm thấy bản nháp đặt hộ');
      if (
        !['DRAFT', 'PENDING_APPROVAL', 'NEEDS_REVISION'].includes(draft.status)
      )
        throw new BadRequestException(
          'Chỉ bản nháp, bản cần sửa hoặc bản đang chờ duyệt mới có thể duyệt',
        );
      if (draft.convertedBooking)
        throw new BadRequestException('Bản nháp này đã tạo booking');
      this.assertAssistedDraftReadyForApproval(draft);

      const tourId = draft.tourId!;
      const quote = await this.calculateAssistedQuote(tx, {
        tourId,
        departureId: draft.departureId || undefined,
        packageId: draft.packageId || undefined,
        numberOfPeople: draft.numberOfPeople,
        passengers: asPassengerInputs(draft.passengers),
        voucherCode: draft.voucherCode || undefined,
      });
      const customer = await this.findOrCreateAssistedCustomer(
        tx,
        draft,
        prehashedPassword,
      );

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
      const { holdMinutes } = await this.settingsService.getBookingPolicy();
      const holdExpiresAt = calculateBookingHoldExpiresAt({
        paymentMethod: 'PAYOS',
        departureDate: departure?.departureDate ?? quote.tour.startDate,
        holdMinutes,
      });
      const booking = await tx.booking.create({
        data: {
          bookingCode: generateBookingCode(),
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
            identityType: draft.customerIdentityNo ? 'CCCD' : null,
            identityNo: draft.customerIdentityNo || null,
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
          holdExpiresAt,
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

    const paymentRequestResult = await this.createPaymentRequestForBooking(
      result.booking.id,
      adminId,
    );
    return {
      draft: this.formatAssistedDraft(result.draft),
      booking: result.booking,
      paymentRequest: paymentRequestResult,
    };
  }

  async resendPaymentRequest(
    bookingId: number,
    actorUserId: number,
    forceEmail = false,
  ) {
    return this.createPaymentRequestForBooking(
      bookingId,
      actorUserId,
      forceEmail,
    );
  }
}

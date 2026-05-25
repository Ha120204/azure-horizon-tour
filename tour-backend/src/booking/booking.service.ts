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
import {
  asPassengerInputs,
  assertVoucherAllowedForDeparture,
  calculateBookingHoldExpiresAt,
  generateBookingCode,
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
        throw new BadRequestException('Tour nÃƒÂ y Ã„â€˜ÃƒÂ£ diÃ¡Â»â€¦n ra, khÃƒÂ´ng thÃ¡Â»Æ’ Ã„â€˜Ã¡ÂºÂ·t');
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
        this.logger.warn(
          `[BOOKING] PayOS order #${orderCode} Ã„â€˜ÃƒÂ£ tÃ¡Â»â€œn tÃ¡ÂºÂ¡i, lÃ¡ÂºÂ¥y lÃ¡ÂºÂ¡i checkout URL.`,
        );
        const existing = await this.paymentService.getPaymentInfo(orderCode);
        if (!existing?.id) {
          throw new BadRequestException(
            'KhÃƒÂ´ng thÃ¡Â»Æ’ tÃ¡ÂºÂ¡o liÃƒÂªn kÃ¡ÂºÂ¿t thanh toÃƒÂ¡n. Vui lÃƒÂ²ng thÃ¡Â»Â­ lÃ¡ÂºÂ¡i sau.',
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
        amount: amountVND,
        status: 'PENDING',
      },
    });

    return {
      message: 'Booking successful, please proceed to payment',
      booking,
      paymentUrl: checkoutUrl,
    };
  }

  /**
   * XÃ¡Â»Â­ lÃƒÂ½ khi ngÃ†Â°Ã¡Â»Âi dÃƒÂ¹ng quay vÃ¡Â»Â tÃ¡Â»Â« trang PayOS (hoÃ¡ÂºÂ·c Webhook gÃ¡Â»Âi)
   * GÃ¡Â»Âi thÃ¡ÂºÂ³ng API PayOS Ã„â€˜Ã¡Â»Æ’ xÃƒÂ¡c nhÃ¡ÂºÂ­n trÃ¡ÂºÂ¡ng thÃƒÂ¡i thÃ¡Â»Â±c tÃ¡ÂºÂ¿, khÃƒÂ´ng tin query params
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
            totalPrice: `${fullBooking.totalPrice.toLocaleString('vi-VN')}Ã¢â€šÂ«`,
            discountAmount:
              fullBooking.discountAmount > 0
                ? `${fullBooking.discountAmount.toLocaleString('vi-VN')}Ã¢â€šÂ«`
                : undefined,
          });
        }
      } catch (emailError) {
        this.logger.error('[EMAIL] LÃ¡Â»â€”i gÃ¡Â»Â­i email xÃƒÂ¡c nhÃ¡ÂºÂ­n:', emailError);
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
   * TÃƒÂ¬m booking theo ID (orderCode cÃ¡Â»Â§a PayOS)
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

  /**
   * CRON JOB: QuÃƒÂ©t Ã„â€˜Ã†Â¡n hÃƒÂ ng PENDING quÃƒÂ¡ 15 phÃƒÂºt vÃƒÂ  tÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng hÃ¡Â»Â§y + hoÃƒÂ n trÃ¡ÂºÂ£ ghÃ¡ÂºÂ¿.
   * Ã„ÂÃ†Â°Ã¡Â»Â£c gÃ¡Â»Âi bÃ¡Â»Å¸i @nestjs/schedule mÃ¡Â»â€”i 5 phÃƒÂºt.
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
        `[CRON] Ã„ÂÃƒÂ£ hÃ¡Â»Â§y booking #${booking.id} (${booking.bookingCode}) vÃƒÂ  hoÃƒÂ n ${booking.numberOfPeople} ghÃ¡ÂºÂ¿ cho tour #${booking.tourId}`,
      );
    }

    this.logger.log(
      `[CRON] HoÃƒÂ n tÃ¡ÂºÂ¥t dÃ¡Â»Ân dÃ¡ÂºÂ¹p ${processedCount}/${expiredBookings.length} Ã„â€˜Ã†Â¡n hÃƒÂ ng.`,
    );
    return { batchSize: expiredBookings.length, processedCount };
  }

  // Cleaned comment

  /**
   * Admin: XÃƒÂ¡c nhÃ¡ÂºÂ­n thÃ¡Â»Â§ cÃƒÂ´ng booking PENDING
   * DÃƒÂ¹ng khi khÃƒÂ¡ch Ã„â€˜ÃƒÂ£ thanh toÃƒÂ¡n ngoÃƒÂ i hÃ¡Â»â€¡ thÃ¡Â»â€˜ng (chuyÃ¡Â»Æ’n khoÃ¡ÂºÂ£n sai nÃ¡Â»â„¢i dung, tiÃ¡Â»Ân mÃ¡ÂºÂ·t, v.v.)
   */
  async confirmManual(bookingId: number, adminId?: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        tour: { select: { id: true, name: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking khÃƒÂ´ng tÃ¡Â»â€œn tÃ¡ÂºÂ¡i');
    if (booking.status === 'CONFIRMED')
      throw new BadRequestException('Ã„ÂÃ†Â¡n hÃƒÂ ng Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c xÃƒÂ¡c nhÃ¡ÂºÂ­n trÃ†Â°Ã¡Â»â€ºc Ã„â€˜ÃƒÂ³');
    if (booking.status === 'CANCELLED')
      throw new BadRequestException('KhÃƒÂ´ng thÃ¡Â»Æ’ xÃƒÂ¡c nhÃ¡ÂºÂ­n Ã„â€˜Ã†Â¡n hÃƒÂ ng Ã„â€˜ÃƒÂ£ hÃ¡Â»Â§y');

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
      `[ADMIN MANUAL] Ã„ÂÃƒÂ£ xÃƒÂ¡c nhÃ¡ÂºÂ­n thÃ¡Â»Â§ cÃƒÂ´ng booking #${bookingId} (${booking.bookingCode}) bÃ¡Â»Å¸i Admin ID #${adminId}`,
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

    if (!booking) throw new NotFoundException('Booking khÃƒÂ´ng tÃ¡Â»â€œn tÃ¡ÂºÂ¡i');
    if (booking.userId !== userId) throw new ForbiddenException('BÃ¡ÂºÂ¡n khÃƒÂ´ng cÃƒÂ³ quyÃ¡Â»Ân chÃ¡Â»â€°nh sÃ¡Â»Â­a booking nÃƒÂ y');
    if (booking.status !== 'PENDING' || booking.paymentStatus !== 'UNPAID') {
      throw new BadRequestException('ChÃ¡Â»â€° cÃƒÂ³ thÃ¡Â»Æ’ thay Ã„â€˜Ã¡Â»â€¢i phÃ†Â°Ã†Â¡ng thÃ¡Â»Â©c thanh toÃƒÂ¡n cho Ã„â€˜Ã†Â¡n hÃƒÂ ng chÃ†Â°a thanh toÃƒÂ¡n');
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
    }

    return {
      message: 'CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t phÃ†Â°Ã†Â¡ng thÃ¡Â»Â©c thanh toÃƒÂ¡n thÃƒÂ nh cÃƒÂ´ng',
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



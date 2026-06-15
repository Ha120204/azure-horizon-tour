import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  isSaleDeparture,
  SALE_TOUR_NO_VOUCHER_MESSAGE,
} from '../tour/promotion-rules';
import type {
  CreateVoucherDto,
  UpdateVoucherDto,
  AdminVoucherQuery,
  VoucherValidationContext,
} from './dto';

// ─── Re-export DTOs for backward compatibility ────────────────────────────────
export type {
  CreateVoucherDto,
  UpdateVoucherDto,
  AdminVoucherQuery,
  VoucherValidationContext,
} from './dto';


// ─── Helper ───────────────────────────────────────────────────────────────────

const FAR_FUTURE = new Date('2099-12-31T23:59:59Z');
const NEVER_YEAR = 2099;
const UNLIMITED_USES = 999_999_999; // maxUses sentinel = "không giới hạn lượt"
const CUSTOMER_SEGMENTS = new Set(['ALL', 'FIRST_TIME', 'RETURNING', 'SAVED_TO_WALLET']);

function resolveExpiresAt(input?: string | null): Date {
  if (!input) return FAR_FUTURE;
  // Ngày dạng YYYY-MM-DD → hết hạn cuối ngày theo giờ VN (UTC+7) để voucher còn
  // hiệu lực trọn ngày được chọn, thay vì hết hiệu lực ngay 00:00.
  const trimmed = input.trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T23:59:59.999+07:00`)
    : new Date(input);
  if (isNaN(d.getTime())) throw new BadRequestException('Ngày hết hạn không hợp lệ');
  return d;
}

function resolveStartsAt(input?: string | null): Date {
  if (!input) return new Date();
  const d = new Date(input);
  if (isNaN(d.getTime())) throw new BadRequestException('Ngày bắt đầu không hợp lệ');
  return d;
}

function normalizeNumberList(input?: number[]) {
  return Array.from(new Set((input ?? []).map(Number).filter((value) => Number.isInteger(value) && value > 0)));
}

function normalizeCustomerSegments(input?: string[]) {
  return Array.from(new Set((input ?? [])
    .map((value) => String(value).trim().toUpperCase())
    .filter((value) => CUSTOMER_SEGMENTS.has(value))));
}

type VoucherComputedStatus = 'active' | 'expired' | 'depleted' | 'inactive' | 'scheduled';

function isNeverExpires(date: Date) {
  return date.getFullYear() >= NEVER_YEAR;
}

function computeVoucherStatus(
  voucher: { isActive: boolean; startsAt: Date; expiresAt: Date; usedCount: number; maxUses: number },
  now: Date,
): VoucherComputedStatus {
  if (!voucher.isActive) return 'inactive';
  if (voucher.startsAt > now) return 'scheduled';
  if (voucher.expiresAt < now && !isNeverExpires(voucher.expiresAt)) return 'expired';
  if (voucher.usedCount >= voucher.maxUses) return 'depleted';
  return 'active';
}

function isInCurrentMonth(date: Date, now: Date) {
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Voucher service section
  // ═══════════════════════════════════════════════════════════════════════════

  /** Voucher service note. */
  async getAllVouchers() {
    const now = new Date();
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        code: true,
        label: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderValue: true,
        expiresAt: true,
        usedCount: true,
        maxUses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return vouchers.map(({ usedCount, maxUses, ...rest }) => ({
      ...rest,
      isDepleted: usedCount >= maxUses,
    }));
  }

  /** Lưu voucher vào ví user */
  async saveToWallet(userId: number, voucherId: number) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    const now = new Date();
    if (!voucher || !voucher.isActive || voucher.startsAt > now || voucher.expiresAt < now) {
      throw new BadRequestException('Voucher không tồn tại hoặc đã hết hạn');
    }

    const existing = await this.prisma.userVoucher.findUnique({
      where: { userId_voucherId: { userId, voucherId } },
    });

    if (existing) {
      throw new ConflictException('Voucher đã có trong ví của bạn');
    }

    return this.prisma.userVoucher.create({
      data: { userId, voucherId },
      include: { voucher: true },
    });
  }

  /** Lấy ví voucher của user */
  async getMyWallet(userId: number) {
    const userVouchers = await this.prisma.userVoucher.findMany({
      where: { userId },
      include: { voucher: true },
      orderBy: { savedAt: 'desc' },
    });

    return userVouchers.map((uv) => {
      let status: 'available' | 'used' | 'expired' | 'scheduled' = 'available';
      if (uv.isUsed) status = 'used';
      else if (uv.voucher.startsAt > new Date()) status = 'scheduled';
      else if (uv.voucher.expiresAt < new Date()) status = 'expired';
      return { ...uv, status };
    });
  }

  /** Validate voucher code + tính tiền giảm.
   *
   * @param tx - Prisma transaction client tùy chọn. Khi truyền vào, query chạy
   * Voucher service note.
   *             validate và increment usedCount.
   */
  async validateVoucher(
    code: string,
    totalPrice: number,
    context: VoucherValidationContext = {},
    tx?: Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  ) {
    const db = tx ?? this.prisma;
    const normalizedCode = code.trim().toUpperCase();
    const now = new Date();
    const voucher = await db.voucher.findUnique({
      where: { code: normalizedCode },
    });

    if (!voucher || !voucher.isActive) {
      throw new BadRequestException('Mã này hiện không còn khả dụng');
    }
    if (voucher.startsAt > now) {
      throw new BadRequestException('Mã này chưa đến thời gian bắt đầu');
    }
    if (voucher.expiresAt < now && !isNeverExpires(voucher.expiresAt)) {
      throw new BadRequestException('Mã đã hết hạn sử dụng');
    }
    if (voucher.usedCount >= voucher.maxUses) {
      throw new BadRequestException('Mã đã được dùng hết');
    }

    if (voucher.eligibleTourIds.length > 0) {
      if (!context.tourId || !voucher.eligibleTourIds.includes(context.tourId)) {
        throw new BadRequestException('Mã này không áp dụng cho tour đang chọn');
      }
    }

    if (voucher.eligibleDestinationIds.length > 0) {
      if (!context.tourId) {
        throw new BadRequestException('Mã này yêu cầu chọn tour hợp lệ');
      }
      const tour = await db.tour.findUnique({
        where: { id: context.tourId },
        select: { destinationId: true },
      });
      if (!tour || !voucher.eligibleDestinationIds.includes(tour.destinationId)) {
        throw new BadRequestException('Mã này không áp dụng cho điểm đến đang chọn');
      }
    }

    const segments = voucher.eligibleCustomerSegments.map((segment) => segment.toUpperCase());
    const hasSegmentRestriction = segments.length > 0 && !segments.includes('ALL');
    if (hasSegmentRestriction || voucher.usageLimitPerUser) {
      const userId = Number(context.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new BadRequestException('Mã này yêu cầu tài khoản khách hàng hợp lệ');
      }

      const [paidBookingCount, savedVoucher, usageCount] = await Promise.all([
        db.booking.count({
          where: { userId, status: 'CONFIRMED', paymentStatus: 'PAID' },
        }),
        db.userVoucher.findUnique({
          where: { userId_voucherId: { userId, voucherId: voucher.id } },
          select: { id: true },
        }),
        db.booking.count({
          where: {
            userId,
            voucherCode: normalizedCode,
            status: { not: 'CANCELLED' },
            paymentStatus: { not: 'FAILED' },
          },
        }),
      ]);

      if (hasSegmentRestriction) {
        const eligible =
          (segments.includes('FIRST_TIME') && paidBookingCount === 0) ||
          (segments.includes('RETURNING') && paidBookingCount > 0) ||
          (segments.includes('SAVED_TO_WALLET') && Boolean(savedVoucher));

        if (!eligible) {
          throw new BadRequestException('Mã này không áp dụng cho nhóm khách hàng của bạn');
        }
      }

      if (voucher.usageLimitPerUser && usageCount >= voucher.usageLimitPerUser) {
        throw new BadRequestException(`Mã này chỉ được dùng tối đa ${voucher.usageLimitPerUser} lần mỗi khách`);
      }
    }

    if (context.departureId) {
      const departure = await db.tourDeparture.findUnique({
        where: { id: context.departureId },
        select: {
          tourId: true,
          category: true,
          note: true,
          flashSaleEndsAt: true,
          price: true,
          tour: { select: { price: true } },
          isActive: true,
        },
      });

      if (!departure || !departure.isActive || (context.tourId && departure.tourId !== context.tourId)) {
        throw new BadRequestException('Invalid departure');
      }

      if (isSaleDeparture(departure)) {
        throw new BadRequestException(SALE_TOUR_NO_VOUCHER_MESSAGE);
      }
    }

    if (totalPrice < voucher.minOrderValue) {
      throw new BadRequestException(`MIN_ORDER:${voucher.minOrderValue}`);
    }

    let discountAmount =
      voucher.discountType === 'PERCENTAGE'
        ? (totalPrice * voucher.discountValue) / 100
        : voucher.discountValue;

    if (voucher.discountType === 'PERCENTAGE' && voucher.maxDiscountAmount && voucher.maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, voucher.maxDiscountAmount);
    }

    discountAmount = Math.min(discountAmount, totalPrice);

    return {
      valid: true,
      code: voucher.code,
      label: voucher.label,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscountAmount: voucher.maxDiscountAmount,
      isStackable: voucher.isStackable,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round((totalPrice - discountAmount) * 100) / 100,
    };
  }

  /**
   * Gọi BÊN TRONG $transaction khi tạo booking.
   * Atomic increment usedCount — throw ConflictException nếu đã hết lượt.
   * Thay thế việc claim voucher tại thời điểm payment confirmed (tránh race condition).
   */
  async claimVoucherInTx(
    tx: Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    code: string,
    userId: number,
  ): Promise<void> {
    const normalizedCode = code.trim().toUpperCase();
    const voucher = await tx.voucher.findUnique({ where: { code: normalizedCode } });
    if (!voucher) return;

    const result = await tx.voucher.updateMany({
      where: { id: voucher.id, usedCount: { lt: voucher.maxUses } },
      data: { usedCount: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new ConflictException('Voucher vừa hết lượt sử dụng. Vui lòng thử mã khác.');
    }

    await tx.userVoucher.updateMany({
      where: { userId, voucherId: voucher.id, isUsed: false },
      data: { isUsed: true },
    });
  }

  /**
   * Gọi BÊN TRONG $transaction khi hủy/hết hạn booking có voucher.
   * Hoàn lại lượt sử dụng và reset trạng thái ví để voucher có thể dùng lại.
   */
  async releaseVoucherInTx(
    tx: Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    code: string,
    userId: number,
  ): Promise<void> {
    const normalizedCode = code.trim().toUpperCase();
    const voucher = await tx.voucher.findUnique({ where: { code: normalizedCode } });
    if (!voucher) return;

    await tx.voucher.updateMany({
      where: { id: voucher.id, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });

    await tx.userVoucher.updateMany({
      where: { userId, voucherId: voucher.id, isUsed: true },
      data: { isUsed: false },
    });
  }

  /**
   * Voucher service note.
   *
   * Voucher service note.
   * Voucher service note.
   * Voucher service note.
   *
   * Voucher service note.
   */
  async markAsUsed(userId: number, voucherCode: string): Promise<boolean> {
    const code = voucherCode.trim().toUpperCase();
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });
    if (!voucher) return false;

    // Voucher service section
    // Voucher service section
    const result = await this.prisma.voucher.updateMany({
      where: { id: voucher.id, usedCount: { lt: voucher.maxUses } },
      data: { usedCount: { increment: 1 } },
    });

    if (result.count === 0) {
      this.logger.warn(
        `[VOUCHER] markAsUsed: voucher "${code}" da het luot (usedCount >= maxUses=${voucher.maxUses}). UserId=${userId}.`,
      );
      return false;
    }

    // Voucher service section
    await this.prisma.userVoucher.updateMany({
      where: { userId, voucherId: voucher.id, isUsed: false },
      data: { isUsed: true },
    });

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Voucher service section
  // ═══════════════════════════════════════════════════════════════════════════

  /** Voucher service note. */
  async adminGetStats() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [allVouchersForStats, totalRedemptions, totalDiscountGiven] =
      await Promise.all([
        this.prisma.voucher.findMany({
          select: { isActive: true, startsAt: true, expiresAt: true, usedCount: true, maxUses: true },
        }),
        // Voucher service section
        this.prisma.voucher.aggregate({ _sum: { usedCount: true } }),
        // Voucher service section
        this.prisma.booking.aggregate({
          where: { deletedAt: null, paymentStatus: 'PAID' },
          _sum: { discountAmount: true },
        }),
      ]);

    const computedStats = allVouchersForStats.map((voucher) => ({
      ...voucher,
      computedStatus: computeVoucherStatus(voucher, now),
    }));

    return {
      totalActive: computedStats.filter((v) => v.computedStatus === 'active').length,
      totalExpiredThisMonth: computedStats.filter((v) => v.computedStatus === 'expired' && isInCurrentMonth(v.expiresAt, now)).length,
      expiringSoon: computedStats.filter((v) =>
        v.computedStatus === 'active' &&
        !isNeverExpires(v.expiresAt) &&
        v.expiresAt > now &&
        v.expiresAt <= sevenDaysLater
      ).length,
      totalRedemptions: totalRedemptions._sum.usedCount ?? 0,
      totalDiscountGiven: totalDiscountGiven._sum.discountAmount ?? 0,
    };
  }

  /** Voucher service note. */
  async adminGetAll(query: AdminVoucherQuery) {
    const {
      search,
      discountType,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(limit) || 10));

    const where: Prisma.VoucherWhereInput = {};

    if (search) {
      where.OR = [
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (discountType) {
      where.discountType = discountType;
    }

    // Voucher service section
    if (status === 'active') {
      where.isActive = true;
      // Voucher service section
    } else if (status === 'scheduled') {
      where.isActive = true;
      where.startsAt = { gt: now };
    } else if (status === 'expired') {
      where.expiresAt = { lte: now };
    } else if (status === 'inactive') {
      where.isActive = false;
    }
    // Voucher service section

    const vouchers = await this.prisma.voucher.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { userVouchers: true } } },
    });

    // Voucher service section
    const data = vouchers.map((v) => {
      const computedStatus = computeVoucherStatus(v, now);

      return {
        ...v,
        discountValue: Number(v.discountValue),
        maxDiscountAmount: v.maxDiscountAmount == null ? null : Number(v.maxDiscountAmount),
        minOrderValue: Number(v.minOrderValue),
        usageLimitPerUser: v.usageLimitPerUser,
        usedCount: Number(v.usedCount),
        maxUses: Number(v.maxUses),
        startsAt: v.startsAt,
        isStackable: v.isStackable,
        eligibleTourIds: v.eligibleTourIds,
        eligibleDestinationIds: v.eligibleDestinationIds,
        eligibleCustomerSegments: v.eligibleCustomerSegments,
        computedStatus,
      };
    });

    // Voucher service section
    const filteredData = status
      ? data.filter((v) => {
          if (status === 'expiringSoon') {
            return (
              v.computedStatus === 'active' &&
              !isNeverExpires(v.expiresAt) &&
              v.expiresAt > now &&
              v.expiresAt <= sevenDaysLater
            );
          }
          if (status === 'expiredThisMonth') {
            return v.computedStatus === 'expired' && isInCurrentMonth(v.expiresAt, now);
          }
          if (status === 'redeemed') {
            return v.usedCount > 0;
          }
          return v.computedStatus === status;
        })
      : data;
    const total = filteredData.length;
    const pagedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return {
      data: pagedData,
      meta: {
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        currentPage,
        itemsPerPage: pageSize,
      },
    };
  }

  /** Voucher service note. */
  async adminCreate(dto: CreateVoucherDto) {
    const code = dto.code.trim().toUpperCase();

    // Kiểm tra code trùng
    const existing = await this.prisma.voucher.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Mã voucher "${code}" đã tồn tại`);

    // Validate
    if (dto.discountType === 'PERCENTAGE' && (dto.discountValue <= 0 || dto.discountValue > 100)) {
      throw new BadRequestException('Giá trị giảm phải lớn hơn 0');
    }
    if (dto.discountValue <= 0) {
      throw new BadRequestException('Giá trị giảm phải lớn hơn 0');
    }

    if (dto.maxDiscountAmount != null && dto.maxDiscountAmount < 0) {
      throw new BadRequestException('Trần giảm giá không hợp lệ');
    }
    if (dto.usageLimitPerUser != null && dto.usageLimitPerUser < 1) {
      throw new BadRequestException('Giới hạn mỗi khách phải lớn hơn 0');
    }

    const startsAt = resolveStartsAt(dto.startsAt);
    const expiresAt = resolveExpiresAt(dto.expiresAt);
    if (!isNeverExpires(expiresAt) && startsAt >= expiresAt) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày hết hạn');
    }

    return this.prisma.voucher.create({
      data: {
        code,
        label: dto.label.trim(),
        description: dto.description?.trim() ?? '',
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.discountType === 'PERCENTAGE' ? (dto.maxDiscountAmount ?? null) : null,
        minOrderValue: dto.minOrderValue ?? 0,
        maxUses: dto.maxUses ?? UNLIMITED_USES,
        usageLimitPerUser: dto.usageLimitPerUser ?? null,
        startsAt,
        expiresAt,
        isActive: dto.isActive ?? true,
        isStackable: dto.isStackable ?? false,
        eligibleTourIds: normalizeNumberList(dto.eligibleTourIds),
        eligibleDestinationIds: normalizeNumberList(dto.eligibleDestinationIds),
        eligibleCustomerSegments: normalizeCustomerSegments(dto.eligibleCustomerSegments),
      },
    });
  }

  /** Voucher service note. */
  async adminUpdate(id: number, dto: UpdateVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    // Voucher service section
    if (dto.code && dto.code.toUpperCase() !== voucher.code && voucher.usedCount > 0) {
      throw new ForbiddenException('Không thể đổi mã khi voucher đã được sử dụng');
    }

    const code = dto.code ? dto.code.trim().toUpperCase() : undefined;

    // Voucher service section
    if (code && code !== voucher.code) {
      const dup = await this.prisma.voucher.findUnique({ where: { code } });
      if (dup) throw new ConflictException(`Mã "${code}" đã tồn tại`);
    }

    const updateData: Prisma.VoucherUpdateInput = {};
    if (code) updateData.code = code;
    if (dto.label !== undefined) updateData.label = dto.label.trim();
    if (dto.description !== undefined) updateData.description = dto.description.trim();
    if (dto.discountType !== undefined) updateData.discountType = dto.discountType;
    if (dto.discountValue !== undefined) {
      if (dto.discountValue <= 0) throw new BadRequestException('Giá trị giảm phải lớn hơn 0');
      updateData.discountValue = dto.discountValue;
    }
    if (dto.maxDiscountAmount !== undefined) {
      if (dto.maxDiscountAmount !== null && dto.maxDiscountAmount < 0) {
        throw new BadRequestException('Trần giảm giá không hợp lệ');
      }
      updateData.maxDiscountAmount = dto.maxDiscountAmount;
    }
    if (dto.discountType === 'FIXED_AMOUNT') updateData.maxDiscountAmount = null;
    if (dto.minOrderValue !== undefined) updateData.minOrderValue = dto.minOrderValue;
    if (dto.maxUses !== undefined) updateData.maxUses = dto.maxUses ?? UNLIMITED_USES;
    if (dto.usageLimitPerUser !== undefined) {
      if (dto.usageLimitPerUser !== null && dto.usageLimitPerUser < 1) {
        throw new BadRequestException('Giới hạn mỗi khách phải lớn hơn 0');
      }
      updateData.usageLimitPerUser = dto.usageLimitPerUser;
    }
    if (dto.startsAt !== undefined) updateData.startsAt = resolveStartsAt(dto.startsAt);
    if (dto.expiresAt !== undefined) updateData.expiresAt = resolveExpiresAt(dto.expiresAt);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isStackable !== undefined) updateData.isStackable = dto.isStackable;
    if (dto.eligibleTourIds !== undefined) updateData.eligibleTourIds = normalizeNumberList(dto.eligibleTourIds);
    if (dto.eligibleDestinationIds !== undefined) updateData.eligibleDestinationIds = normalizeNumberList(dto.eligibleDestinationIds);
    if (dto.eligibleCustomerSegments !== undefined) updateData.eligibleCustomerSegments = normalizeCustomerSegments(dto.eligibleCustomerSegments);

    const nextDiscountType = dto.discountType ?? voucher.discountType;
    const nextDiscountValue = dto.discountValue ?? voucher.discountValue;
    if (nextDiscountType === 'PERCENTAGE' && (nextDiscountValue <= 0 || nextDiscountValue > 100)) {
      throw new BadRequestException('Giá trị giảm theo phần trăm phải nằm trong khoảng 1-100');
    }

    const nextStartsAt = updateData.startsAt instanceof Date ? updateData.startsAt : voucher.startsAt;
    const nextExpiresAt = updateData.expiresAt instanceof Date ? updateData.expiresAt : voucher.expiresAt;
    if (!isNeverExpires(nextExpiresAt) && nextStartsAt >= nextExpiresAt) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày hết hạn');
    }

    return this.prisma.voucher.update({ where: { id }, data: updateData });
  }

  /** Bật / Tắt trạng thái active của voucher */
  async adminToggleActive(id: number) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    const updated = await this.prisma.voucher.update({
      where: { id },
      data: { isActive: !voucher.isActive },
    });

    return { ...updated, computedStatus: computeVoucherStatus(updated, new Date()) };
  }

  /** Bật/tắt hàng loạt — atomic qua một updateMany, không thể fail một phần */
  async adminBulkSetActive(ids: number[], isActive: boolean) {
    const uniqueIds = Array.from(
      new Set((ids ?? []).filter((id) => Number.isInteger(id) && id > 0)),
    );
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Danh sách voucher không hợp lệ');
    }

    const result = await this.prisma.voucher.updateMany({
      where: { id: { in: uniqueIds } },
      data: { isActive },
    });

    return { count: result.count };
  }

  /** Voucher service note. */
  async adminDelete(id: number) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    if (voucher.usedCount > 0) {
      throw new ForbiddenException(
        `Không thể xóa voucher đã được sử dụng ${voucher.usedCount} lần. Hãy vô hiệu hóa thay thế.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userVoucher.deleteMany({ where: { voucherId: id } });
      return tx.voucher.delete({ where: { id } });
    });
  }

  /** Voucher service note. */
  async adminGetDetail(id: number) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: {
        userVouchers: {
          orderBy: { savedAt: 'desc' },
          take: 20,
          include: {
            user: {
              select: { id: true, fullName: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: { select: { userVouchers: true } },
      },
    });

    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    const now = new Date();
    const computedStatus = computeVoucherStatus(voucher, now);
    const voucherBookingWhere: Prisma.BookingWhereInput = {
      deletedAt: null,
      voucherCode: voucher.code,
    };
    const paidVoucherBookingWhere: Prisma.BookingWhereInput = {
      ...voucherBookingWhere,
      paymentStatus: 'PAID',
    };

    const [
      totalBookingCount,
      paidBookingAggregate,
      topTourGroups,
      recentBookings,
    ] = await Promise.all([
      this.prisma.booking.count({ where: voucherBookingWhere }),
      this.prisma.booking.aggregate({
        where: paidVoucherBookingWhere,
        _count: { id: true },
        _sum: { totalPrice: true, discountAmount: true },
      }),
      this.prisma.booking.groupBy({
        by: ['tourId'],
        where: paidVoucherBookingWhere,
        _count: { tourId: true },
        _sum: { totalPrice: true, discountAmount: true },
        orderBy: { _count: { tourId: 'desc' } },
        take: 5,
      }),
      this.prisma.booking.findMany({
        where: voucherBookingWhere,
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          bookingCode: true,
          createdAt: true,
          status: true,
          paymentStatus: true,
          numberOfPeople: true,
          totalPrice: true,
          discountAmount: true,
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          tour: { select: { id: true, name: true, imageUrl: true } },
        },
      }),
    ]);

    const topTourIds = topTourGroups.map((item) => item.tourId);
    const topTours = topTourIds.length > 0
      ? await this.prisma.tour.findMany({
          where: { id: { in: topTourIds } },
          select: { id: true, name: true, imageUrl: true },
        })
      : [];
    const tourMap = new Map(topTours.map((tour) => [tour.id, tour]));
    const paidBookingCount = paidBookingAggregate._count.id;
    const totalRevenue = Number(paidBookingAggregate._sum.totalPrice ?? 0);
    const totalDiscount = Number(paidBookingAggregate._sum.discountAmount ?? 0);

    return {
      ...voucher,
      discountValue: Number(voucher.discountValue),
      maxDiscountAmount: voucher.maxDiscountAmount == null ? null : Number(voucher.maxDiscountAmount),
      minOrderValue: Number(voucher.minOrderValue),
      usageLimitPerUser: voucher.usageLimitPerUser,
      usedCount: Number(voucher.usedCount),
      maxUses: Number(voucher.maxUses),
      startsAt: voucher.startsAt,
      isStackable: voucher.isStackable,
      eligibleTourIds: voucher.eligibleTourIds,
      eligibleDestinationIds: voucher.eligibleDestinationIds,
      eligibleCustomerSegments: voucher.eligibleCustomerSegments,
      analytics: {
        scope: 'paid_bookings_all_time',
        totalBookings: totalBookingCount,
        paidBookings: paidBookingCount,
        totalRevenue: Math.round(totalRevenue),
        totalDiscount: Math.round(totalDiscount),
        averageOrderValue: paidBookingCount > 0 ? Math.round(totalRevenue / paidBookingCount) : 0,
        topTours: topTourGroups.map((item) => {
          const tour = tourMap.get(item.tourId);
          return {
            tourId: item.tourId,
            tourName: tour?.name ?? `Tour #${item.tourId}`,
            imageUrl: tour?.imageUrl ?? null,
            bookingCount: item._count.tourId,
            totalRevenue: Math.round(Number(item._sum.totalPrice ?? 0)),
            totalDiscount: Math.round(Number(item._sum.discountAmount ?? 0)),
          };
        }),
        recentBookings: recentBookings.map((booking) => ({
          id: booking.id,
          bookingCode: booking.bookingCode,
          createdAt: booking.createdAt,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          numberOfPeople: booking.numberOfPeople,
          totalPrice: Number(booking.totalPrice),
          discountAmount: Number(booking.discountAmount),
          customer: booking.user,
          tour: booking.tour,
        })),
      },
      computedStatus,
    };
  }
}

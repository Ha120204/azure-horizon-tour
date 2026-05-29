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

function resolveExpiresAt(input?: string | null): Date {
  if (!input) return FAR_FUTURE;
  const d = new Date(input);
  if (isNaN(d.getTime())) throw new BadRequestException('Ngày hết hạn không hợp lệ');
  return d;
}

type VoucherComputedStatus = 'active' | 'expired' | 'depleted' | 'inactive';

function isNeverExpires(date: Date) {
  return date.getFullYear() >= NEVER_YEAR;
}

function computeVoucherStatus(
  voucher: { isActive: boolean; expiresAt: Date; usedCount: number; maxUses: number },
  now: Date,
): VoucherComputedStatus {
  if (!voucher.isActive) return 'inactive';
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
  // PUBLIC — dành cho customer
  // ═══════════════════════════════════════════════════════════════════════════

  /** Lấy tất cả voucher đang active + chưa hết hạn (public) */
  async getAllVouchers() {
    return this.prisma.voucher.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Lưu voucher vào ví user */
  async saveToWallet(userId: number, voucherId: number) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher || !voucher.isActive || voucher.expiresAt < new Date()) {
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
      let status: 'available' | 'used' | 'expired' = 'available';
      if (uv.isUsed) status = 'used';
      else if (uv.voucher.expiresAt < new Date()) status = 'expired';
      return { ...uv, status };
    });
  }

  /** Validate voucher code + tính tiền giảm.
   *
   * @param tx - Prisma transaction client tùy chọn. Khi truyền vào, query chạy
   *             trong cùng transaction với caller, tránh race condition giữa
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
    const voucher = await db.voucher.findUnique({
      where: { code: normalizedCode },
    });

    if (!voucher || !voucher.isActive)
      throw new BadRequestException('Mã này hiện không còn khả dụng');
    if (voucher.expiresAt < new Date())
      throw new BadRequestException('Mã đã hết hạn sử dụng');
    // So sánh snapshot tại thời điểm query — atomic guard thực sự nằm ở markAsUsed/markVoucherAsUsed.
    if (voucher.usedCount >= voucher.maxUses)
      throw new BadRequestException('Mã đã được dùng hết — bạn đến hơi muộn rồi 😊');
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

      if (
        !departure ||
        !departure.isActive ||
        (context.tourId && departure.tourId !== context.tourId)
      ) {
        throw new BadRequestException('Invalid departure');
      }

      if (isSaleDeparture(departure)) {
        throw new BadRequestException(SALE_TOUR_NO_VOUCHER_MESSAGE);
      }
    }

    if (totalPrice < voucher.minOrderValue)
      throw new BadRequestException(`MIN_ORDER:${voucher.minOrderValue}`);

    let discountAmount =
      voucher.discountType === 'PERCENTAGE'
        ? (totalPrice * voucher.discountValue) / 100
        : voucher.discountValue;

    discountAmount = Math.min(discountAmount, totalPrice);

    return {
      valid: true,
      code: voucher.code,
      label: voucher.label,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round((totalPrice - discountAmount) * 100) / 100,
    };
  }

  /**
   * Đánh dấu voucher đã sử dụng — **atomic, race-condition-safe**.
   *
   * Dùng `updateMany` với điều kiện `usedCount < maxUses` thay vì
   * `update` mù để đảm bảo không vượt quá giới hạn kể cả khi nhiều
   * request đến đồng thời.
   *
   * @returns `true` nếu ghi nhận thành công, `false` nếu voucher đã hết lượt.
   */
  async markAsUsed(userId: number, voucherCode: string): Promise<boolean> {
    const code = voucherCode.trim().toUpperCase();
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });
    if (!voucher) return false;

    // Atomic: chỉ increment khi usedCount vẫn còn dưới maxUses.
    // Nếu 2 request đến cùng lúc, chỉ 1 cái thắng; cái kia nhận count === 0.
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

    // Đánh dấu UserVoucher đã dùng (best-effort, không fail nếu không có trong ví)
    await this.prisma.userVoucher.updateMany({
      where: { userId, voucherId: voucher.id, isUsed: false },
      data: { isUsed: true },
    });

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — yêu cầu role ADMIN | SUPER_ADMIN
  // ═══════════════════════════════════════════════════════════════════════════

  /** Thống kê tổng quan cho KPI cards */
  async adminGetStats() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [allVouchersForStats, totalRedemptions, totalDiscountGiven] =
      await Promise.all([
        this.prisma.voucher.findMany({
          select: { isActive: true, expiresAt: true, usedCount: true, maxUses: true },
        }),
        // Tổng lượt đổi voucher (tổng usedCount)
        this.prisma.voucher.aggregate({ _sum: { usedCount: true } }),
        // Tổng giá trị giảm đã cấp (từ bảng Booking)
        this.prisma.booking.aggregate({ _sum: { discountAmount: true } }),
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

  /** Danh sách tất cả voucher với filter + pagination (Admin) */
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

    // Tính trạng thái động theo DB fields
    if (status === 'active') {
      where.isActive = true;
      where.expiresAt = { gt: now };
      // usedCount < maxUses — filter sau để computedStatus khớp KPI.
    } else if (status === 'expired') {
      where.expiresAt = { lte: now };
    } else if (status === 'inactive') {
      where.isActive = false;
    }
    // Các trạng thái động còn lại được filter sau khi tính computedStatus.

    const vouchers = await this.prisma.voucher.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { userVouchers: true } } },
    });

    // Tính trạng thái cho từng voucher + ép kiểu Decimal → number
    const data = vouchers.map((v) => {
      const computedStatus = computeVoucherStatus(v, now);

      return {
        ...v,
        discountValue: Number(v.discountValue),
        minOrderValue: Number(v.minOrderValue),
        usedCount: Number(v.usedCount),
        maxUses: Number(v.maxUses),
        computedStatus,
      };
    });

    // Filter theo trạng thái động trước rồi mới phân trang để tổng số không bị lệch.
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

  /** Tạo voucher mới (chỉ ADMIN | SUPER_ADMIN) */
  async adminCreate(dto: CreateVoucherDto) {
    const code = dto.code.trim().toUpperCase();

    // Kiểm tra code trùng
    const existing = await this.prisma.voucher.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Mã voucher "${code}" đã tồn tại`);

    // Validate
    if (dto.discountType === 'PERCENTAGE' && (dto.discountValue <= 0 || dto.discountValue > 100)) {
      throw new BadRequestException('Giá trị giảm theo % phải nằm trong khoảng 1–100');
    }
    if (dto.discountValue <= 0) {
      throw new BadRequestException('Giá trị giảm phải lớn hơn 0');
    }

    const expiresAt = resolveExpiresAt(dto.expiresAt);

    return this.prisma.voucher.create({
      data: {
        code,
        label: dto.label.trim(),
        description: dto.description?.trim() ?? '',
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue ?? 0,
        maxUses: dto.maxUses ?? 999_999_999, // "unlimited"
        expiresAt,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /** Cập nhật voucher (chỉ ADMIN | SUPER_ADMIN) */
  async adminUpdate(id: number, dto: UpdateVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    // Không cho phép đổi code nếu đã được dùng
    if (dto.code && dto.code.toUpperCase() !== voucher.code && voucher.usedCount > 0) {
      throw new ForbiddenException('Không thể đổi mã khi voucher đã được sử dụng');
    }

    const code = dto.code ? dto.code.trim().toUpperCase() : undefined;

    // Kiểm tra code mới có trùng không
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
    if (dto.minOrderValue !== undefined) updateData.minOrderValue = dto.minOrderValue;
    if (dto.maxUses !== undefined) updateData.maxUses = dto.maxUses ?? 999_999_999;
    if (dto.expiresAt !== undefined) updateData.expiresAt = resolveExpiresAt(dto.expiresAt);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.voucher.update({ where: { id }, data: updateData });
  }

  /** Bật / Tắt trạng thái active của voucher */
  async adminToggleActive(id: number) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    return this.prisma.voucher.update({
      where: { id },
      data: { isActive: !voucher.isActive },
    });
  }

  /** Xóa voucher (chỉ SUPER_ADMIN, và chỉ khi chưa ai dùng) */
  async adminDelete(id: number) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');

    if (voucher.usedCount > 0) {
      throw new ForbiddenException(
        `Không thể xóa voucher đã được sử dụng ${voucher.usedCount} lần. Hãy vô hiệu hóa thay thế.`,
      );
    }

    await this.prisma.userVoucher.deleteMany({ where: { voucherId: id } });
    return this.prisma.voucher.delete({ where: { id } });
  }

  /** Xem chi tiết + lịch sử dùng của 1 voucher */
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
    let computedStatus: 'active' | 'expired' | 'depleted' | 'inactive';
    if (!voucher.isActive) computedStatus = 'inactive';
    else if (voucher.expiresAt < now && voucher.expiresAt.getFullYear() < 2099) computedStatus = 'expired';
    else if (voucher.usedCount >= voucher.maxUses) computedStatus = 'depleted';
    else computedStatus = 'active';

    // Ép kiểu Decimal → number thuần để JSON serialize đúng
    return {
      ...voucher,
      discountValue: Number(voucher.discountValue),
      minOrderValue: Number(voucher.minOrderValue),
      usedCount: Number(voucher.usedCount),
      maxUses: Number(voucher.maxUses),
      computedStatus,
    };
  }
}

import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateVoucherDto {
  code: string;
  label: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderValue?: number;
  maxUses?: number | null; // null = unlimited
  expiresAt?: string | null; // null = never expires
  isActive?: boolean;
}

export interface UpdateVoucherDto extends Partial<CreateVoucherDto> {}

export interface AdminVoucherQuery {
  search?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  status?: 'active' | 'expired' | 'depleted' | 'inactive' | 'expiringSoon' | 'expiredThisMonth' | 'redeemed';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'expiresAt' | 'usedCount';
  sortOrder?: 'asc' | 'desc';
}

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

  /** Validate voucher code + tính tiền giảm */
  async validateVoucher(code: string, totalPrice: number) {
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });

    if (!voucher || !voucher.isActive)
      throw new BadRequestException('Mã này hiện không còn khả dụng');
    if (voucher.expiresAt < new Date())
      throw new BadRequestException('Mã đã hết hạn sử dụng');
    if (voucher.usedCount >= voucher.maxUses)
      throw new BadRequestException('Mã đã được dùng hết — bạn đến hơi muộn rồi 😊');
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

  /** Đánh dấu voucher đã sử dụng */
  async markAsUsed(userId: number, voucherCode: string) {
    const voucher = await this.prisma.voucher.findUnique({ where: { code: voucherCode } });
    if (!voucher) return;

    await this.prisma.voucher.update({
      where: { id: voucher.id },
      data: { usedCount: { increment: 1 } },
    });

    const userVoucher = await this.prisma.userVoucher.findUnique({
      where: { userId_voucherId: { userId, voucherId: voucher.id } },
    });

    if (userVoucher) {
      await this.prisma.userVoucher.update({
        where: { id: userVoucher.id },
        data: { isUsed: true },
      });
    }
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

    const where: any = {};

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

    const updateData: any = {};
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

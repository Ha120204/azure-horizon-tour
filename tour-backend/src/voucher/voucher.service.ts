import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VoucherService {
  constructor(private readonly prisma: PrismaService) {}

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
    // Kiểm tra voucher có tồn tại + còn hạn không
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher || !voucher.isActive || voucher.expiresAt < new Date()) {
      throw new BadRequestException('Voucher không tồn tại hoặc đã hết hạn');
    }

    // Kiểm tra đã lưu chưa
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

    // Đánh dấu trạng thái: expired / used / available
    return userVouchers.map((uv) => {
      let status: 'available' | 'used' | 'expired' = 'available';
      if (uv.isUsed) status = 'used';
      else if (uv.voucher.expiresAt < new Date()) status = 'expired';
      return { ...uv, status };
    });
  }

  /** Validate voucher code + tính tiền giảm */
  async validateVoucher(code: string, totalPrice: number) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
    });

    if (!voucher) {
      throw new BadRequestException('Mã voucher không tồn tại');
    }

    if (!voucher.isActive) {
      throw new BadRequestException('Voucher đã bị vô hiệu hóa');
    }

    if (voucher.expiresAt < new Date()) {
      throw new BadRequestException('Voucher đã hết hạn');
    }

    if (voucher.usedCount >= voucher.maxUses) {
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    }

    if (totalPrice < voucher.minOrderValue) {
      throw new BadRequestException(`MIN_ORDER:${voucher.minOrderValue}`);
    }

    // Tính discount
    let discountAmount = 0;
    if (voucher.discountType === 'PERCENTAGE') {
      discountAmount = (totalPrice * voucher.discountValue) / 100;
    } else {
      discountAmount = voucher.discountValue;
    }

    // Không giảm vượt quá tổng giá
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
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: voucherCode },
    });

    if (!voucher) return;

    // Cập nhật usedCount trong bảng Voucher
    await this.prisma.voucher.update({
      where: { id: voucher.id },
      data: { usedCount: { increment: 1 } },
    });

    // Đánh dấu trong ví user (nếu đã lưu)
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
}

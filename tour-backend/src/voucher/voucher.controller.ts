import { Controller, Get, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('voucher')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  /** GET /voucher — Lấy danh sách voucher public (không cần đăng nhập) */
  @Get()
  async getAllVouchers() {
    return this.voucherService.getAllVouchers();
  }

  /** POST /voucher/save — Lưu voucher vào ví (cần đăng nhập) */
  @Post('save')
  @UseGuards(AuthGuard('jwt'))
  async saveToWallet(@Req() req, @Body() body: { voucherId: number }) {
    return this.voucherService.saveToWallet(req.user.userId, Number(body.voucherId));
  }

  /** GET /voucher/my-wallet — Lấy ví voucher của user (cần đăng nhập) */
  @Get('my-wallet')
  @UseGuards(AuthGuard('jwt'))
  async getMyWallet(@Req() req) {
    return this.voucherService.getMyWallet(req.user.userId);
  }

  /** POST /voucher/validate — Kiểm tra mã voucher (cần đăng nhập) */
  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  async validateVoucher(@Body() body: { code: string; totalPrice: number }) {
    return this.voucherService.validateVoucher(body.code, body.totalPrice);
  }
}

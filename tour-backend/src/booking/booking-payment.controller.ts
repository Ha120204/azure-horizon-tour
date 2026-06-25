import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { BookingService } from './booking.service';
import { PaymentService } from '../payment/payment.service';
import { BookingPaymentService } from './booking-payment.service';
import { ConfirmInStoreDto, ReconcilePayosDto } from './dto/payment-booking.dto';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import {
  type AuthenticatedRequest,
  getAuthUserId,
  getErrorMessage,
  StaffOrAdminGuard,
  AdminOnlyGuard,
} from './booking.guards';

type PayosReturnQuery = {
  orderCode?: string | number;
  cancel?: string;
  status?: string;
};

@Controller('booking')
export class BookingPaymentController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly bookingPaymentService: BookingPaymentService,
  ) {}

  /**
   * PayOS Return Handler
   * Khi khách hàng quét mã QR xong (hoặc bấm hủy), PayOS sẽ redirect trình duyệt
   * về URL này. Ta gọi PayOS API để xác nhận trạng thái, sau đó đá khách về Frontend.
   */
  @Get('payos-return')
  async payosReturn(@Query() query: PayosReturnQuery, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    try {
      const orderCode = Number(query.orderCode);
      const isCancelled = query.cancel === 'true';
      const status = query.status;

      if (isCancelled || status === 'CANCELLED') {
        return res.redirect(`${frontendUrl}/?error=payment_cancelled`);
      }

      const paymentInfo = await this.bookingService.handlePayosReturn(orderCode);

      if (paymentInfo.status === 'PAID') {
        const booking = await this.bookingService.findByOrderCode(orderCode);
        return res.redirect(`${frontendUrl}/success?bookingId=${booking.bookingCode}`);
      }

      return res.redirect(`${frontendUrl}/?error=payment_failed`);
    } catch (error) {
      console.error('PayOS Return Error:', getErrorMessage(error));
      return res.redirect(`${frontendUrl}/?error=payment_failed`);
    }
  }

  /**
   * PayOS Webhook Handler
   * PayOS server tự động POST dữ liệu tới endpoint này khi có biến động thanh toán.
   * Đây là kênh xác nhận đáng tin cậy nhất (server-to-server, không qua trình duyệt).
   */
  @Post('payos-webhook')
  async payosWebhook(
    @Body() body: Parameters<PaymentService['verifyWebhook']>[0],
    @Res() res: Response,
  ) {
    // Dùng @Res() để bypass TransformInterceptor — PayOS yêu cầu chính xác { success: true }
    // ở root level, không được wrap thêm bất kỳ lớp nào.
    try {
      const webhookData = await this.paymentService.verifyWebhook(body);
      this.bookingService.handlePayosReturn(webhookData.orderCode).catch((err) => {
        console.error('[PAYOS_WEBHOOK] Processing error:', getErrorMessage(err));
      });
    } catch (error) {
      console.error('[PAYOS_WEBHOOK] Signature verification failed:', getErrorMessage(error));
    }
    // PayOS yêu cầu chính xác HTTP 200 — NestJS mặc định trả 201 cho @Post()
    res.status(200).json({ success: true });
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Get('admin/payment-stats')
  async getPaymentStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.bookingPaymentService.getPaymentStats(dateFrom, dateTo);
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Post('admin/:id/payments/in-store/confirm')
  @AuditLog('UPDATE', 'Booking')
  async confirmInStore(
    @Param('id') id: string,
    @Body() body: ConfirmInStoreDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingPaymentService.confirmInStore(Number(id), body, getAuthUserId(req));
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/:id/payments/payos/sync')
  @AuditLog('UPDATE', 'Booking')
  async syncPayosStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingPaymentService.syncPayosStatus(Number(id), getAuthUserId(req));
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/:id/payments/payos/reconcile')
  @AuditLog('UPDATE', 'Booking')
  async reconcilePayosManual(
    @Param('id') id: string,
    @Body() body: ReconcilePayosDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingPaymentService.reconcilePayosManual(Number(id), body, getAuthUserId(req));
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Ip, Query, Req, Res, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PaymentService } from '../payment/payment.service';

@Controller('booking')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) { }

  // ============== PAYOS PAYMENT FLOW ==============

  /**
   * PayOS Return Handler
   * Khi khách hàng quét mã QR xong (hoặc bấm hủy), PayOS sẽ redirect trình duyệt
   * về URL này. Ta gọi PayOS API để xác nhận trạng thái, sau đó đá khách về Frontend.
   */
  @Get('payos-return')
  async payosReturn(@Query() query: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    try {
      const orderCode = Number(query.orderCode);
      const isCancelled = query.cancel === 'true';
      const status = query.status;

      // Nếu khách bấm "Hủy" trên trang PayOS → Hoàn trả ghế rồi redirect
      if (isCancelled || status === 'CANCELLED') {
        if (orderCode) {
          try {
            await this.bookingService.handlePayosReturn(orderCode);
          } catch (e) {
            console.error('Lỗi hoàn trả ghế khi hủy thanh toán:', e);
          }
        }
        return res.redirect(`${frontendUrl}/checkout?error=payment_cancelled`);
      }

      // Gọi PayOS API xác nhận trạng thái thanh toán thực tế
      const paymentInfo = await this.bookingService.handlePayosReturn(orderCode);

      if (paymentInfo.status === 'PAID') {
        // Thanh toán thành công → Lấy bookingCode để hiển thị vé điện tử
        const booking = await this.bookingService.findByOrderCode(orderCode);
        return res.redirect(`${frontendUrl}/success?bookingId=${booking.bookingCode}`);
      }

      // Thanh toán thất bại hoặc chưa hoàn tất
      return res.redirect(`${frontendUrl}/checkout?error=payment_failed`);

    } catch (error) {
      console.error('PayOS Return Error:', error);
      return res.redirect(`${frontendUrl}/checkout?error=payment_failed`);
    }
  }

  /**
   * PayOS Webhook Handler
   * PayOS server tự động POST dữ liệu tới endpoint này khi có biến động thanh toán.
   * Đây là kênh xác nhận đáng tin cậy nhất (server-to-server, không qua trình duyệt).
   * Lưu ý: Cần expose port 3000 ra internet (Ngrok) để PayOS gọi được.
   */
  @Post('payos-webhook')
  async payosWebhook(@Body() body: any) {
    try {
      // Xác thực chữ ký webhook từ PayOS
      const webhookData = await this.paymentService.verifyWebhook(body);

      // Cập nhật trạng thái đơn hàng trong Database
      await this.bookingService.handlePayosReturn(webhookData.orderCode);

      return { success: true };
    } catch (error) {
      console.error('PayOS Webhook Error:', error);
      return { success: false };
    }
  }

  // ============== BOOKING CRUD ==============

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req, @Body() createBookingDto: CreateBookingDto, @Ip() ip: string) {
    return this.bookingService.create(req.user.userId, createBookingDto, ip);
  }

  @UseGuards(AuthGuard('jwt')) // Bắt buộc đăng nhập
  @Get('history/my-bookings')
  async getMyBookings(@Req() req: any) {
    // Lấy danh sách booking của đúng user đang đăng nhập
    const bookings = await this.bookingService.getMyBookings(req.user.userId);
    return { message: 'Success', data: bookings };
  }

  @Get('code/:bookingCode')
  findByBookingCode(@Param('bookingCode') bookingCode: string) {
    return this.bookingService.findByBookingCode(bookingCode);
  }

  @Get(':id')
  async getBookingById(@Param('id') id: string) {
    // Gọi Service tìm đúng đơn hàng theo ID
    const booking = await this.bookingService.getBookingById(Number(id));

    if (!booking) {
      return { message: 'Booking not found' };
    }

    return {
      message: 'Success',
      data: booking
    };
  }

  @Get('proxy-image')
  async getProxiedImage(
    @Query('imageUrl') imageUrl: string, // Nhận link Unsplash từ Query String
    @Res() res: Response // Dùng Response của Express để stream dữ liệu
  ) {
    if (!imageUrl) {
      throw new BadRequestException('Please provide an image URL');
    }
    return this.bookingService.proxyImage(imageUrl, res);
  }

  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingService.update(+id, updateBookingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(+id);
  }
}

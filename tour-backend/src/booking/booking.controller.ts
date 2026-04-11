import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Ip, Query, Req, Res, BadRequestException } from '@nestjs/common';
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
  ) { }

  @Get('vnpay-return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const isValid = this.paymentService.verifyReturnUrl(query);

    // 1. Chữ ký sai -> Đá về trang checkout kèm báo lỗi
    if (!isValid) {
      return res.redirect('http://localhost:3001/checkout?error=invalid_signature');
    }

    // LẤY MÃ BOOKING CODE (Cắt bỏ phần giờ phút giây bị dư)
    const bookingCode = query.vnp_TxnRef.split('_')[0];

    // 2. Chữ ký đúng -> Cập nhật DB (Truyền bookingCode vào đây)
    await this.bookingService.updatePaymentStatus(
      bookingCode,
      query.vnp_ResponseCode,
      query.vnp_TransactionNo
    );

    // 3. Trạng thái thành công ('00') -> Đá sang trang Vé điện tử
    if (query.vnp_ResponseCode === '00') {
      return res.redirect(`http://localhost:3001/success?bookingId=${bookingCode}`);
    }

    // 4. Thanh toán thất bại -> Đá về trang Checkout báo lỗi
    return res.redirect('http://localhost:3001/checkout?error=payment_failed');
  }

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
    return { message: 'Thành công', data: bookings };
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
      return { message: 'Không tìm thấy đơn đặt tour' };
    }

    return {
      message: 'Thành công',
      data: booking
    };
  }

  @Get('proxy-image')
  async getProxiedImage(
    @Query('imageUrl') imageUrl: string, // Nhận link Unsplash từ Query String
    @Res() res: Response // Dùng Response của Express để stream dữ liệu
  ) {
    if (!imageUrl) {
      throw new BadRequestException('Vui lòng cung cấp link ảnh');
    }
    return this.bookingService.proxyImage(imageUrl, res);
  }

  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(+id);
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

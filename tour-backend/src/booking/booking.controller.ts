import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Ip,
  Req,
  Res,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingPassengersDto } from './dto/update-booking-passengers.dto';
import { RequestCancellationDto } from './dto/cancel-booking.dto';
import { UpdatePaymentMethodDto, ReportPaymentIssueDto } from './dto/payment-booking.dto';
import { BookingPaymentService } from './booking-payment.service';
import { BookingTransportService } from './booking-transport.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { type AuthenticatedRequest, getAuthUserId, getAuthRole } from './booking.guards';

@Controller('booking')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly bookingPaymentService: BookingPaymentService,
    private readonly bookingTransportService: BookingTransportService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createBookingDto: CreateBookingDto,
    @Ip() ip: string,
  ) {
    return this.bookingService.create(getAuthUserId(req), createBookingDto, ip);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history/my-bookings')
  async getMyBookings(@Req() req: AuthenticatedRequest) {
    const bookings = await this.bookingService.getMyBookings(getAuthUserId(req));
    return { message: 'Success', data: bookings };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my/code/:bookingCode')
  async getMyBookingByCode(
    @Param('bookingCode') bookingCode: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const booking = await this.bookingService.findMyByBookingCode(bookingCode, getAuthUserId(req));
    return { message: 'Success', data: booking };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my/:id')
  async getMyBookingById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const booking = await this.bookingService.getMyBookingById(Number(id), getAuthUserId(req));
    return { message: 'Success', data: booking };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('my/:id/passengers')
  async updateMyBookingPassengers(
    @Param('id') id: string,
    @Body() dto: UpdateBookingPassengersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.bookingService.updateMyBookingPassengers(
      Number(id),
      getAuthUserId(req),
      dto,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cancel-request')
  @AuditLog('CANCEL_BOOKING', 'Booking')
  async requestCancellation(
    @Param('id') id: string,
    @Body() dto: RequestCancellationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingService.requestCancellation(
      Number(id),
      getAuthUserId(req),
      dto.reason.trim(),
      dto.bankDetails as Prisma.InputJsonValue | undefined,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/retry-payment')
  async retryPayment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingService.retryPayment(Number(id), getAuthUserId(req));
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/payment-method')
  async updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingService.updatePaymentMethod(
      Number(id),
      dto.paymentMethod,
      getAuthUserId(req),
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/check-payment')
  async checkPayment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingPaymentService.customerCheckPayment(Number(id), getAuthUserId(req));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/payment-issue')
  async reportPaymentIssue(
    @Param('id') id: string,
    @Body() body: ReportPaymentIssueDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // class-validator kiểm tra amount ≥ 1000, transferredAt / transactionRef / senderBank /
    // senderAccountName bắt buộc, message ≥ 5 ký tự (nếu có). Chỉ cần parse date ở đây.
    const transferredAt = new Date(body.transferredAt);
    if (Number.isNaN(transferredAt.getTime())) {
      throw new BadRequestException('Thời gian chuyển khoản không hợp lệ');
    }
    const message =
      body.message?.trim() ||
      `Khách báo đã chuyển ${body.amount.toLocaleString('vi-VN')}đ nhưng hệ thống chưa ghi nhận.`;

    return this.bookingPaymentService.reportPaymentIssue(
      Number(id),
      getAuthUserId(req),
      {
        ...body,
        transferredAt: transferredAt.toISOString(),
        transactionRef: body.transactionRef.trim(),
        senderBank: body.senderBank.trim(),
        senderAccountName: body.senderAccountName.trim(),
        message,
      },
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/transport')
  getTransportAssignment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingTransportService.getTransportAssignment(
      Number(id),
      getAuthUserId(req),
      getAuthRole(req),
    );
  }
}

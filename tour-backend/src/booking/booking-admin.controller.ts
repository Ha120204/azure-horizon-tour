import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { BookingService } from './booking.service';
import { UpdateBookingPassengersDto } from './dto/update-booking-passengers.dto';
import { SendPassengerReminderDto } from './dto/send-passenger-reminder.dto';
import { CreateAssistedBookingDraftDto } from './dto/create-assisted-booking-draft.dto';
import { ReviewAssistedBookingDraftDto } from './dto/review-assisted-booking-draft.dto';
import {
  ApproveCancellationDto,
  RejectCancellationDto,
  AdminCancelBookingDto,
  ConfirmRefundDto,
  UpdateBookingNoteDto,
} from './dto/cancel-booking.dto';
import { ResendPaymentRequestDto } from './dto/payment-booking.dto';
import { BookingTransportService, AssignBookingTransportDto } from './booking-transport.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import {
  type AuthenticatedRequest,
  getAuthUserId,
  getAuthRole,
  StaffOrAdminGuard,
  AdminOnlyGuard,
} from './booking.guards';

@Controller('booking')
export class BookingAdminController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly bookingTransportService: BookingTransportService,
  ) {}

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/stats')
  async getAdminQuickStats() {
    const data = await this.bookingService.getAdminQuickStats();
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/operational-stats')
  async getOperationalStats() {
    const data = await this.bookingService.getOperationalStats();
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/recent')
  async getRecentBookings(@Query('limit') limit?: string) {
    const data = await this.bookingService.getRecentBookings(limit ? Number(limit) : 5);
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/all')
  async getAllBookings(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('needsReconciliation') needsReconciliation?: string,
    @Query('departureFrom') departureFrom?: string,
    @Query('departureTo') departureTo?: string,
    @Query('needsCustomerCall') needsCustomerCall?: string,
    @Query('needsPassengerInfo') needsPassengerInfo?: string,
  ) {
    const validPaymentMethod =
      paymentMethod === 'PAYOS' || paymentMethod === 'IN_STORE' ? paymentMethod : undefined;
    const result = await this.bookingService.getAllBookings(
      status,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      validPaymentMethod,
      needsReconciliation === 'true',
      departureFrom,
      departureTo,
      needsCustomerCall === 'true',
      needsPassengerInfo === 'true',
    );

    // Doanh thu chỉ dành cho Admin/Super Admin — không trả số tiền cho STAFF.
    const role = getAuthRole(req);
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      result.stats.totalRevenue = 0;
    }

    return { message: 'Success', ...result };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/assisted-drafts')
  async getAssistedDrafts(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.bookingService.getAssistedDrafts(
      getAuthUserId(req),
      getAuthRole(req),
      status,
      search,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Post('admin/assisted-drafts')
  @AuditLog('CREATE', 'AssistedBookingDraft')
  async createAssistedDraft(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAssistedBookingDraftDto,
  ) {
    const data = await this.bookingService.createAssistedDraft(getAuthUserId(req), dto);
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Patch('admin/assisted-drafts/:id')
  @AuditLog('UPDATE', 'AssistedBookingDraft')
  async updateAssistedDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CreateAssistedBookingDraftDto,
  ) {
    const data = await this.bookingService.updateAssistedDraft(
      Number(id),
      getAuthUserId(req),
      getAuthRole(req),
      dto,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Delete('admin/assisted-drafts/:id')
  @AuditLog('DELETE', 'AssistedBookingDraft')
  async deleteAssistedDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingService.deleteAssistedDraft(Number(id), getAuthUserId(req), getAuthRole(req));
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Post('admin/assisted-drafts/:id/submit')
  @AuditLog('UPDATE', 'AssistedBookingDraft')
  async submitAssistedDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const data = await this.bookingService.submitAssistedDraft(
      Number(id),
      getAuthUserId(req),
      getAuthRole(req),
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/assisted-drafts/:id/approve')
  @AuditLog('UPDATE', 'AssistedBookingDraft')
  async approveAssistedDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReviewAssistedBookingDraftDto,
  ) {
    const data = await this.bookingService.approveAssistedDraft(
      Number(id),
      getAuthUserId(req),
      dto.note,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/assisted-drafts/:id/reject')
  @AuditLog('UPDATE', 'AssistedBookingDraft')
  async rejectAssistedDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReviewAssistedBookingDraftDto,
  ) {
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 3) {
      throw new BadRequestException('Vui long nhap ly do tu choi');
    }
    const data = await this.bookingService.rejectAssistedDraft(
      Number(id),
      getAuthUserId(req),
      reason,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/assisted-drafts/:id/request-revision')
  @AuditLog('UPDATE', 'AssistedBookingDraft')
  async requestRevisionAssistedDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReviewAssistedBookingDraftDto,
  ) {
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 3) {
      throw new BadRequestException('Vui long nhap noi dung can chinh sua');
    }
    const data = await this.bookingService.requestRevisionAssistedDraft(
      Number(id),
      getAuthUserId(req),
      reason,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Post('admin/:id/resend-payment-request')
  @AuditLog('UPDATE', 'Booking')
  async resendPaymentRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ResendPaymentRequestDto,
  ) {
    const data = await this.bookingService.resendPaymentRequest(
      Number(id),
      getAuthUserId(req),
      dto.forceEmail ?? false,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Patch('admin/:id/note')
  @AuditLog('UPDATE', 'Booking')
  async updateAdminNote(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBookingNoteDto,
  ) {
    const data = await this.bookingService.updateAdminNote(Number(id), getAuthUserId(req), dto.note);
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Patch('admin/:id/passengers')
  @AuditLog('UPDATE', 'Booking')
  async updateBookingPassengersByStaff(
    @Param('id') id: string,
    @Body() dto: UpdateBookingPassengersDto,
  ) {
    const data = await this.bookingService.updateBookingPassengersByStaff(Number(id), dto);
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Patch('admin/:id/passenger-reminder')
  @AuditLog('UPDATE', 'Booking')
  async sendPassengerReminder(
    @Param('id') id: string,
    @Body() dto: SendPassengerReminderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.bookingService.sendPassengerReminderByStaff(
      Number(id),
      getAuthUserId(req),
      dto.channel,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Post('admin/:id/cancel')
  @AuditLog('CANCEL_BOOKING', 'Booking')
  async adminCancelBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AdminCancelBookingDto,
  ) {
    return this.bookingService.adminCancelBooking(
      Number(id),
      getAuthUserId(req),
      dto.reason.trim(),
    );
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Get('admin/cancel-requests')
  async getCancelRequests() {
    const data = await this.bookingService.getCancelRequests();
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/:id/approve-cancel')
  @AuditLog('UPDATE', 'Booking')
  async approveCancellation(
    @Param('id') id: string,
    @Body() dto: ApproveCancellationDto,
  ) {
    return this.bookingService.approveCancellation(Number(id), dto.adminNote);
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/:id/reject-cancel')
  @AuditLog('UPDATE', 'Booking')
  async rejectCancellation(
    @Param('id') id: string,
    @Body() dto: RejectCancellationDto,
  ) {
    return this.bookingService.rejectCancellation(Number(id), dto.rejectReason.trim());
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/:id/confirm-refund')
  @AuditLog('UPDATE', 'Booking')
  async confirmRefund(
    @Param('id') id: string,
    @Body() dto: ConfirmRefundDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingService.confirmRefund(Number(id), getAuthUserId(req), dto);
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/code/:bookingCode')
  async adminFindByBookingCode(@Param('bookingCode') bookingCode: string) {
    const booking = await this.bookingService.findByBookingCode(bookingCode);
    return { message: 'Success', data: booking };
  }

  @Get('proxy-image')
  async getProxiedImage(
    @Query('imageUrl') imageUrl: string,
    @Res() res: Response,
  ) {
    if (!imageUrl) {
      throw new BadRequestException('Please provide an image URL');
    }
    return this.bookingService.proxyImage(imageUrl, res);
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Get(':id')
  async getBookingById(@Param('id') id: string) {
    const booking = await this.bookingService.getBookingById(Number(id));
    if (!booking) {
      return { message: 'Booking not found' };
    }
    return { message: 'Success', data: booking };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Put(':id/transport')
  @AuditLog('UPDATE', 'Booking')
  assignTransport(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AssignBookingTransportDto,
  ) {
    return this.bookingTransportService.assignTransport(Number(id), dto, getAuthUserId(req));
  }
}

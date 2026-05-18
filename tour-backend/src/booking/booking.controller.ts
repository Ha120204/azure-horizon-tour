import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Ip,
  Query,
  Req,
  Res,
  BadRequestException,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateAssistedBookingDraftDto } from './dto/create-assisted-booking-draft.dto';
import { ReviewAssistedBookingDraftDto } from './dto/review-assisted-booking-draft.dto';
import { PaymentService } from '../payment/payment.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';

type AuthenticatedRequest = {
  user?: {
    userId?: number;
    id?: number;
    role?: string;
  };
};

type PayosReturnQuery = {
  orderCode?: string | number;
  cancel?: string;
  status?: string;
};

const getAuthUserId = (req: AuthenticatedRequest): number =>
  Number(req.user?.userId ?? req.user?.id);
const getAuthRole = (req: AuthenticatedRequest): string =>
  String(req.user?.role ?? '');

// ─── Guards ───────────────────────────────────────────────────────────────────

/** Cho phép STAFF, ADMIN, SUPER_ADMIN — chặn CUSTOMER */
@Injectable()
class StaffOrAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const role = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
      .user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'STAFF') {
      throw new ForbiddenException('Bạn không có quyền truy cập tính năng này');
    }
    return true;
  }
}

/** Chỉ cho phép ADMIN và SUPER_ADMIN — chặn STAFF và CUSTOMER */
@Injectable()
class AdminOnlyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const role = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
      .user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Chỉ Admin mới có quyền thực hiện thao tác này',
      );
    }
    return true;
  }
}

@Controller('booking')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  // ============== PAYOS PAYMENT FLOW ==============

  /**
   * PayOS Return Handler
   * Khi khách hàng quét mã QR xong (hoặc bấm hủy), PayOS sẽ redirect trình duyệt
   * về URL này. Ta gọi PayOS API để xác nhận trạng thái, sau đó đá khách về Frontend.
   */
  @Get('payos-return')
  async payosReturn(@Query() query: PayosReturnQuery, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );

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
      const paymentInfo =
        await this.bookingService.handlePayosReturn(orderCode);

      if (paymentInfo.status === 'PAID') {
        // Thanh toán thành công → Lấy bookingCode để hiển thị vé điện tử
        const booking = await this.bookingService.findByOrderCode(orderCode);
        return res.redirect(
          `${frontendUrl}/success?bookingId=${booking.bookingCode}`,
        );
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
  async payosWebhook(
    @Body() body: Parameters<PaymentService['verifyWebhook']>[0],
  ) {
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
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createBookingDto: CreateBookingDto,
    @Ip() ip: string,
  ) {
    return this.bookingService.create(getAuthUserId(req), createBookingDto, ip);
  }

  @UseGuards(AuthGuard('jwt')) // Bắt buộc đăng nhập
  @Get('history/my-bookings')
  async getMyBookings(@Req() req: AuthenticatedRequest) {
    // Lấy danh sách booking của đúng user đang đăng nhập
    const bookings = await this.bookingService.getMyBookings(
      getAuthUserId(req),
    );
    return { message: 'Success', data: bookings };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my/code/:bookingCode')
  async getMyBookingByCode(
    @Param('bookingCode') bookingCode: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const booking = await this.bookingService.findMyByBookingCode(
      bookingCode,
      getAuthUserId(req),
    );
    return { message: 'Success', data: booking };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my/:id')
  async getMyBookingById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const booking = await this.bookingService.getMyBookingById(
      Number(id),
      getAuthUserId(req),
    );
    return { message: 'Success', data: booking };
  }

  /**
   * Staff + Admin: Quick stats (số lượng booking theo status, không có doanh thu)
   * GET /booking/admin/stats
   */
  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/stats')
  async getAdminQuickStats() {
    const data = await this.bookingService.getAdminQuickStats();
    return { message: 'Success', data };
  }

  /**
   * Staff + Admin: Lấy toàn bộ booking (có filter) — Staff chỉ đọc
   * GET /booking/admin/all?status=PENDING&paymentStatus=UNPAID&search=BKG
   */
  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/all')
  async getAllBookings(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.bookingService.getAllBookings(
      status,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
    return { message: 'Success', ...result };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/assisted-drafts')
  async getAssistedDrafts(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const userId = getAuthUserId(req);
    const role = getAuthRole(req);
    const data = await this.bookingService.getAssistedDrafts(
      userId,
      role,
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
    const userId = getAuthUserId(req);
    const data = await this.bookingService.createAssistedDraft(userId, dto);
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
    const userId = getAuthUserId(req);
    const role = getAuthRole(req);
    const data = await this.bookingService.updateAssistedDraft(
      Number(id),
      userId,
      role,
      dto,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Post('admin/assisted-drafts/:id/submit')
  @AuditLog('UPDATE', 'AssistedBookingDraft')
  async submitAssistedDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = getAuthUserId(req);
    const role = getAuthRole(req);
    const data = await this.bookingService.submitAssistedDraft(
      Number(id),
      userId,
      role,
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
    const userId = getAuthUserId(req);
    const data = await this.bookingService.approveAssistedDraft(
      Number(id),
      userId,
      dto.note,
    );
    return { message: 'Success', data };
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Post('admin/:id/resend-payment-request')
  @AuditLog('UPDATE', 'Booking')
  async resendPaymentRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('forceEmail') forceEmail?: boolean,
  ) {
    const userId = getAuthUserId(req);
    const data = await this.bookingService.resendPaymentRequest(
      Number(id),
      userId,
      Boolean(forceEmail),
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
    const userId = getAuthUserId(req);
    const data = await this.bookingService.rejectAssistedDraft(
      Number(id),
      userId,
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
    const userId = getAuthUserId(req);
    const data = await this.bookingService.requestRevisionAssistedDraft(
      Number(id),
      userId,
      reason,
    );
    return { message: 'Success', data };
  }

  /**
   * Khách hàng thanh toán lại booking PENDING chưa hết hạn 15 phút
   * POST /booking/:id/retry-payment
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/retry-payment')
  async retryPayment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingService.retryPayment(Number(id), getAuthUserId(req));
  }

  /**
   * Khách hàng gửi yêu cầu hủy booking
   * POST /booking/:id/cancel-request
   * Body: { reason: string }
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cancel-request')
  @AuditLog('CANCEL_BOOKING', 'Booking')
  async requestCancellation(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('bankDetails') bankDetails: Prisma.InputJsonValue | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException('Vui lòng cung cấp lý do hủy hợp lệ');
    }
    return this.bookingService.requestCancellation(
      Number(id),
      getAuthUserId(req),
      reason.trim(),
      bankDetails,
    );
  }

  /**
   * Admin lấy danh sách yêu cầu hủy đang chờ
   * GET /booking/admin/cancel-requests
   */
  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Get('admin/cancel-requests')
  async getCancelRequests() {
    const data = await this.bookingService.getCancelRequests();
    return { message: 'Success', data };
  }

  /**
   * Admin duyệt yêu cầu hủy
   * POST /booking/admin/:id/approve-cancel
   * Body: { adminNote?: string }
   */
  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/:id/approve-cancel')
  @AuditLog('UPDATE', 'Booking')
  async approveCancellation(
    @Param('id') id: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.bookingService.approveCancellation(Number(id), adminNote);
  }

  /**
   * Admin từ chối yêu cầu hủy
   * POST /booking/admin/:id/reject-cancel
   * Body: { rejectReason: string }
   */
  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/:id/reject-cancel')
  @AuditLog('UPDATE', 'Booking')
  async rejectCancellation(
    @Param('id') id: string,
    @Body('rejectReason') rejectReason: string,
  ) {
    if (!rejectReason || rejectReason.trim().length < 3) {
      throw new BadRequestException('Vui lòng cung cấp lý do từ chối');
    }
    return this.bookingService.rejectCancellation(
      Number(id),
      rejectReason.trim(),
    );
  }

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/code/:bookingCode')
  async adminFindByBookingCode(@Param('bookingCode') bookingCode: string) {
    const booking = await this.bookingService.findByBookingCode(bookingCode);
    return { message: 'Success', data: booking };
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Get(':id')
  async getBookingById(@Param('id') id: string) {
    // Gọi Service tìm đúng đơn hàng theo ID (Admin only — chứa PII của khách)
    const booking = await this.bookingService.getBookingById(Number(id));

    if (!booking) {
      return { message: 'Booking not found' };
    }

    return {
      message: 'Success',
      data: booking,
    };
  }

  @Get('proxy-image')
  async getProxiedImage(
    @Query('imageUrl') imageUrl: string, // Nhận link Unsplash từ Query String
    @Res() res: Response, // Dùng Response của Express để stream dữ liệu
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

  /**
   * Admin: Xác nhận thủ công booking PENDING khi khách đã thanh toán ngoài hệ thống
   * PATCH /booking/admin/:id/confirm-manual
   */
  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Patch('admin/:id/confirm-manual')
  @AuditLog('UPDATE', 'Booking')
  async confirmManual(@Param('id') id: string) {
    return this.bookingService.confirmManual(Number(id));
  }

  // NOTE: Generic PATCH/DELETE được bảo vệ bởi AdminOnlyGuard.
  // Các thao tác cụ thể (confirm, approve-cancel...) đã có endpoint riêng ở trên.
  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Patch(':id')
  @AuditLog('UPDATE', 'Booking')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingService.update(+id, updateBookingDto);
  }

  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Delete(':id')
  @AuditLog('DELETE', 'Booking')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(+id);
  }
}

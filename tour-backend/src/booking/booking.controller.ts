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
import {
  RequestCancellationDto,
  ApproveCancellationDto,
  RejectCancellationDto,
  AdminCancelBookingDto,
  UpdateBookingNoteDto,
} from './dto/cancel-booking.dto';
import {
  ConfirmInStoreDto,
  ReconcilePayosDto,
  ReportPaymentIssueDto,
  UpdatePaymentMethodDto,
  ResendPaymentRequestDto,
} from './dto/payment-booking.dto';
import { PaymentService } from '../payment/payment.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { BookingPaymentService } from './booking-payment.service';
import { BookingTransportService, AssignBookingTransportDto } from './booking-transport.service';

type AuthenticatedRequest = {
  user?: {
    userId?: number;
    id?: number;
    role?: string;
  };
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown booking error';
}

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
    private readonly bookingPaymentService: BookingPaymentService,
    private readonly bookingTransportService: BookingTransportService,
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

      // Nếu khách bấm "Hủy" trên trang PayOS → redirect về trang chủ và giữ trạng thái PENDING
      if (isCancelled || status === 'CANCELLED') {
        return res.redirect(`${frontendUrl}/?error=payment_cancelled`);
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
      console.error('PayOS Webhook Error:', getErrorMessage(error));
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
   * Staff + Admin: Operational stats — gộm booking/tour/article/support vào 1 call.
   * Cache 30s in-memory. Frontend chỉ cần gọi endpoint này thay vì 4 endpoint riêng.
   * GET /booking/admin/operational-stats
   */
  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Get('admin/operational-stats')
  async getOperationalStats() {
    const data = await this.bookingService.getOperationalStats();
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
    @Query('paymentMethod') paymentMethod?: string,
    @Query('needsReconciliation') needsReconciliation?: string,
    @Query('departureFrom') departureFrom?: string,
    @Query('departureTo') departureTo?: string,
    @Query('needsCustomerCall') needsCustomerCall?: string,
  ) {
    const validPaymentMethod =
      paymentMethod === 'PAYOS' || paymentMethod === 'IN_STORE'
        ? paymentMethod
        : undefined;
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
  @Delete('admin/assisted-drafts/:id')
  @AuditLog('DELETE', 'AssistedBookingDraft')
  async deleteAssistedDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = getAuthUserId(req);
    const role = getAuthRole(req);
    return this.bookingService.deleteAssistedDraft(Number(id), userId, role);
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
    @Body() dto: ResendPaymentRequestDto,
  ) {
    const userId = getAuthUserId(req);
    const data = await this.bookingService.resendPaymentRequest(
      Number(id),
      userId,
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
    const data = await this.bookingService.updateAdminNote(
      Number(id),
      getAuthUserId(req),
      dto.note,
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
   * Khách hàng chủ động hỏi PayOS đã nhận tiền chưa — dùng cho inline QR modal.
   * POST /booking/:id/check-payment
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/check-payment')
  async checkPayment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingPaymentService.customerCheckPayment(Number(id), getAuthUserId(req));
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

  /**
   * Khách hàng gửi yêu cầu hủy booking
   * POST /booking/:id/cancel-request
   * Body: { reason: string, bankDetails?: RefundBankDetailsDto }
   */
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
    @Body() dto: ApproveCancellationDto,
  ) {
    return this.bookingService.approveCancellation(Number(id), dto.adminNote);
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
    @Body() dto: RejectCancellationDto,
  ) {
    return this.bookingService.rejectCancellation(
      Number(id),
      dto.rejectReason.trim(),
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
   * [ADMIN] Thống kê doanh thu theo nguồn thanh toán (confirmedSource)
   * GET /booking/admin/payment-stats
   * Query: dateFrom?, dateTo?
   */
  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Get('admin/payment-stats')
  async getPaymentStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.bookingPaymentService.getPaymentStats(dateFrom, dateTo);
    return { message: 'Success', data };
  }

  // ─── Phân luồng thanh toán mới [PHASE 1] ─────────────────────────────────

  /**
   * [STAFF + ADMIN] Ghi nhận thu tiền tại cửa hàng
   * POST /booking/admin/:id/payments/in-store/confirm
   * Body: { collectionMethod: 'CASH'|'BANK_TRANSFER'|'CARD_POS', amount?, receiptRef?, note? }
   */
  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Post('admin/:id/payments/in-store/confirm')
  @AuditLog('UPDATE', 'Booking')
  async confirmInStore(
    @Param('id') id: string,
    @Body() body: ConfirmInStoreDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingPaymentService.confirmInStore(
      Number(id),
      body,
      getAuthUserId(req),
    );
  }

  /**
   * [ADMIN] Gọi lại PayOS API để đồng bộ trạng thái thực tế
   * POST /booking/admin/:id/payments/payos/sync
   */
  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/:id/payments/payos/sync')
  @AuditLog('UPDATE', 'Booking')
  async syncPayosStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingPaymentService.syncPayosStatus(
      Number(id),
      getAuthUserId(req),
    );
  }

  /**
   * [ADMIN] Xác nhận đối soát thủ công khi khách gửi ảnh CK
   * POST /booking/admin/:id/payments/payos/reconcile
   * Body: { transactionRef, amount, note, evidenceUrl? }
   */
  @UseGuards(AuthGuard('jwt'), AdminOnlyGuard)
  @Post('admin/:id/payments/payos/reconcile')
  @AuditLog('UPDATE', 'Booking')
  async reconcilePayosManual(
    @Param('id') id: string,
    @Body() body: ReconcilePayosDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingPaymentService.reconcilePayosManual(
      Number(id),
      body,
      getAuthUserId(req),
    );
  }

  /**
   * [CUSTOMER] Yêu cầu kiểm tra thanh toán — tạo support ticket gắn booking
   * POST /booking/:id/payment-issue
   * Body: { amount, transferredAt, transactionRef, senderBank, senderAccountName, message?, evidenceUrl? }
   */
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

  // ============== TRANSPORT ASSIGNMENT ==============

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

  @UseGuards(AuthGuard('jwt'), StaffOrAdminGuard)
  @Put(':id/transport')
  @AuditLog('UPDATE', 'Booking')
  assignTransport(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AssignBookingTransportDto,
  ) {
    return this.bookingTransportService.assignTransport(
      Number(id),
      dto,
      getAuthUserId(req),
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupportService } from './support.service';
import {
  UpdateTicketStatusDto,
  AssignTicketDto,
  CreateTicketReplyDto,
  CustomerReplyDto,
  RateTicketDto,
  LookupQueryDto,
} from './dto/support.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// ─── Guard không bắt buộc (soft auth) ────────────────────────────────────────
// Dùng cho các endpoint customer không bắt auth cứng nhắc
class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user ?? null; // Không ném lỗi nếu không có token
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN / STAFF ENDPOINTS (yêu cầu JWT + role)
// ═══════════════════════════════════════════════════════════════════════════════
@Controller('support')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // GET /support/tickets?status=NEW&category=booking&search=...&page=1&limit=20
  @Get('tickets')
  async getTickets(
    @Query('status')   status?:   string,
    @Query('category') category?: string,
    @Query('search')   search?:   string,
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
  ) {
    return this.supportService.getTickets({
      status,
      category,
      search,
      page:  page  ? parseInt(page)  : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // GET /support/tickets/:id
  @Get('tickets/:id')
  async getTicket(@Param('id', ParseIntPipe) id: number) {
    const ticket = await this.supportService.getTicketById(id);
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    return ticket;
  }

  // PATCH /support/tickets/:id/status
  @Patch('tickets/:id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.supportService.updateStatus(id, dto.status);
  }

  // PATCH /support/tickets/:id/assign
  @Patch('tickets/:id/assign')
  async assignTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
    @Request() req: any,
  ) {
    const staffId = dto.staffId ?? req.user?.sub ?? req.user?.id;
    return this.supportService.assignTicket(id, staffId);
  }

  // POST /support/tickets/:id/reply  (staff reply)
  @Post('tickets/:id/reply')
  async replyTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTicketReplyDto,
    @Request() req: any,
  ) {
    const staffName = req.user?.fullName ?? req.user?.name ?? 'Nhân viên';
    return this.supportService.replyTicket(id, dto.content, staffName);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER ENDPOINTS (công khai hoặc soft-auth)
// Xác minh quyền truy cập qua email + ticketId (không cần login)
// ═══════════════════════════════════════════════════════════════════════════════
@Controller('support/customer')
export class SupportCustomerController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * GET /support/customer/my-tickets
   * - Nếu có JWT: dùng userId từ token
   * - Nếu không: dùng query ?email=... (khách vãng lai)
   */
  @UseGuards(OptionalJwtGuard)
  @Get('my-tickets')
  async getMyTickets(
    @Query() query: LookupQueryDto,
    @Request() req: any,
  ) {
    const userId: number | undefined = req.user?.sub ?? req.user?.id;
    const email: string = query.email ?? req.user?.email ?? '';
    return this.supportService.getMyTickets({ email, userId });
  }

  /**
   * GET /support/customer/ticket/:id
   * - Xem chi tiết ticket; verify bằng email query param hoặc JWT userId
   */
  @UseGuards(OptionalJwtGuard)
  @Get('ticket/:id')
  async getTicketDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: LookupQueryDto,
    @Request() req: any,
  ) {
    const userId: number | undefined = req.user?.sub ?? req.user?.id;
    const email: string = query.email ?? req.user?.email ?? '';
    return this.supportService.getTicketDetailForCustomer(id, { email, userId });
  }

  /**
   * POST /support/customer/ticket/:id/reply
   * - Khách bổ sung thông tin khi ticket đang IN_PROGRESS
   */
  @UseGuards(OptionalJwtGuard)
  @Post('ticket/:id/reply')
  async customerReply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CustomerReplyDto,
    @Request() req: any,
  ) {
    const userId: number | undefined = req.user?.sub ?? req.user?.id;
    const email: string = dto.email ?? req.user?.email ?? '';
    const name:  string = dto.senderName ?? req.user?.fullName ?? 'Khách hàng';
    return this.supportService.customerReply(id, dto.content, { email, userId, name });
  }

  /**
   * PATCH /support/customer/ticket/:id/rate
   * - Đánh giá sau khi RESOLVED (1-5 sao)
   */
  @UseGuards(OptionalJwtGuard)
  @Patch('ticket/:id/rate')
  async rateTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RateTicketDto,
    @Request() req: any,
  ) {
    const userId: number | undefined = req.user?.sub ?? req.user?.id;
    const email: string = dto.email ?? req.user?.email ?? '';
    return this.supportService.rateTicket(id, dto.rating, { email, userId });
  }

  /**
   * PATCH /support/customer/ticket/:id/reopen
   * - Mở lại ticket đã RESOLVED nếu vấn đề chưa thực sự giải quyết
   */
  @UseGuards(OptionalJwtGuard)
  @Patch('ticket/:id/reopen')
  async reopenTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LookupQueryDto,
    @Request() req: any,
  ) {
    const userId: number | undefined = req.user?.sub ?? req.user?.id;
    const email: string = dto.email ?? req.user?.email ?? '';
    return this.supportService.reopenTicket(id, { email, userId });
  }
}

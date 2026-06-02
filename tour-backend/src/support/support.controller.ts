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
  UnauthorizedException,
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
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';

type AuthUser = {
  id?: number | string;
  userId?: number | string;
  sub?: number | string;
  fullName?: string;
  name?: string;
};

type AuthenticatedRequest = {
  user?: AuthUser;
};

const toNumberOrUndefined = (
  value: number | string | undefined,
): number | undefined => {
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getAuthUserId = (req: AuthenticatedRequest): number | undefined =>
  toNumberOrUndefined(req.user?.userId ?? req.user?.sub ?? req.user?.id);

const getRequiredAuthUserId = (req: AuthenticatedRequest): number => {
  const userId = getAuthUserId(req);
  if (userId == null) {
    throw new UnauthorizedException('Invalid authenticated user');
  }
  return userId;
};

const getAuthDisplayName = (
  req: AuthenticatedRequest,
  fallback: string,
): string => req.user?.fullName ?? req.user?.name ?? fallback;

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN / STAFF ENDPOINTS (yêu cầu JWT + role)
// ═══════════════════════════════════════════════════════════════════════════════
@Controller('support')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('stats')
  async getStats(@Request() req: AuthenticatedRequest) {
    return this.supportService.getStats(getAuthUserId(req));
  }

  // GET /support/tickets?status=NEW&category=booking&search=...&page=1&limit=20
  @Get('tickets')
  async getTickets(
    @Query('status')   status?:   string,
    @Query('category') category?: string,
    @Query('search')   search?:   string,
    @Query('view')     view?:     string,
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
  ) {
    return this.supportService.getTickets({
      status,
      category,
      search,
      view,
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
    @Request() req: AuthenticatedRequest,
  ) {
    const staffId = dto.staffId ?? getRequiredAuthUserId(req);
    return this.supportService.assignTicket(id, staffId);
  }

  // POST /support/tickets/:id/reply  (staff reply)
  @Post('tickets/:id/reply')
  async replyTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTicketReplyDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const staffName = getAuthDisplayName(req, 'Nhân viên');
    const staffId = getRequiredAuthUserId(req);
    return this.supportService.replyTicket(id, dto.content, staffName, staffId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER ENDPOINTS (công khai hoặc soft-auth)
// Guest dùng accessCode; khách đã đăng nhập dùng userId từ JWT.
// ═══════════════════════════════════════════════════════════════════════════════
@Controller('support/customer')
export class SupportCustomerController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * GET /support/customer/my-tickets
   * - Chỉ trả danh sách ticket của user đã đăng nhập.
   * - Guest xem từng ticket qua link có accessCode trong email xác nhận.
   */
  @UseGuards(OptionalJwtGuard)
  @Get('my-tickets')
  async getMyTickets(@Request() req: AuthenticatedRequest) {
    const userId = getAuthUserId(req);
    return this.supportService.getMyTickets({ userId });
  }

  /**
   * GET /support/customer/ticket/:id
   * - Xem chi tiết ticket; verify bằng accessCode hoặc JWT userId.
   */
  @UseGuards(OptionalJwtGuard)
  @Get('ticket/:id')
  async getTicketDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: LookupQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = getAuthUserId(req);
    const accessCode: string | undefined = query.accessCode;
    return this.supportService.getTicketDetailForCustomer(id, { accessCode, userId });
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
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = getAuthUserId(req);
    const accessCode: string | undefined = dto.accessCode;
    const name = dto.senderName ?? getAuthDisplayName(req, 'Khách hàng');
    return this.supportService.customerReply(id, dto.content, { accessCode, userId, name });
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
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = getAuthUserId(req);
    const accessCode: string | undefined = dto.accessCode;
    return this.supportService.rateTicket(id, dto.rating, { accessCode, userId });
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
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = getAuthUserId(req);
    const accessCode: string | undefined = dto.accessCode;
    return this.supportService.reopenTicket(id, { accessCode, userId });
  }
}

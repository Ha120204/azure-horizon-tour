import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VoucherService } from './voucher.service';
import {
  AdminVoucherQuery,
  BulkVoucherActiveDto,
  CreateVoucherDto,
  SaveVoucherDto,
  UpdateVoucherDto,
  ValidateVoucherDto,
} from './dto';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { superAdminCanAccessArea } from '../auth/decorators/super-admin-area.decorator';

type AuthUser = {
  id?: number | string;
  userId?: number | string;
  sub?: number | string;
  role?: string;
};

type AuthenticatedRequest = {
  user?: AuthUser;
};

function getAuthenticatedUserId(req: AuthenticatedRequest): number {
  const rawId = req.user?.userId ?? req.user?.id ?? req.user?.sub;
  const userId = Number(rawId);
  if (!Number.isInteger(userId)) {
    throw new ForbiddenException('Không xác định được người dùng');
  }
  return userId;
}

@Injectable()
class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = req.user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Chỉ Admin và Super Admin mới có quyền thực hiện thao tác này');
    }
    if (role === 'SUPER_ADMIN' && !superAdminCanAccessArea(req, 'vouchers')) {
      throw new ForbiddenException('Chỉ Admin và Super Admin mới có quyền thực hiện thao tác này');
    }
    return true;
  }
}

@Injectable()
class StaffReadGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = req.user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'STAFF') {
      throw new ForbiddenException('Bạn không có quyền truy cập trang này');
    }
    if (role === 'SUPER_ADMIN' && !superAdminCanAccessArea(req, 'vouchers')) {
      throw new ForbiddenException('Bạn không có quyền truy cập trang này');
    }
    return true;
  }
}

@Controller('voucher')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get()
  async getAllVouchers() {
    return this.voucherService.getAllVouchers();
  }

  @Post('save')
  @UseGuards(AuthGuard('jwt'))
  async saveToWallet(@Req() req: AuthenticatedRequest, @Body() dto: SaveVoucherDto) {
    return this.voucherService.saveToWallet(getAuthenticatedUserId(req), dto.voucherId);
  }

  @Get('my-wallet')
  @UseGuards(AuthGuard('jwt'))
  async getMyWallet(@Req() req: AuthenticatedRequest) {
    return this.voucherService.getMyWallet(getAuthenticatedUserId(req));
  }

  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  async validateVoucher(@Req() req: AuthenticatedRequest, @Body() dto: ValidateVoucherDto) {
    return this.voucherService.validateVoucher(dto.code, dto.totalPrice, {
      userId: getAuthenticatedUserId(req),
      tourId: dto.tourId ?? null,
      departureId: dto.departureId ?? null,
    });
  }

  @Get('admin/stats')
  @UseGuards(AuthGuard('jwt'), StaffReadGuard)
  async adminGetStats() {
    return this.voucherService.adminGetStats();
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), StaffReadGuard)
  async adminGetAll(@Query() query: AdminVoucherQuery) {
    return this.voucherService.adminGetAll(query);
  }

  @Get('admin/:id')
  @UseGuards(AuthGuard('jwt'), StaffReadGuard)
  async adminGetDetail(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.adminGetDetail(id);
  }

  @Post('admin')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @AuditLog('CREATE', 'Voucher')
  async adminCreate(@Body() dto: CreateVoucherDto) {
    return this.voucherService.adminCreate(dto);
  }

  @Patch('admin/bulk-active')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @AuditLog('UPDATE', 'Voucher')
  async adminBulkSetActive(@Body() dto: BulkVoucherActiveDto) {
    return this.voucherService.adminBulkSetActive(dto.ids, dto.isActive);
  }

  @Patch('admin/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @AuditLog('UPDATE', 'Voucher')
  async adminUpdate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVoucherDto) {
    return this.voucherService.adminUpdate(id, dto);
  }

  @Patch('admin/:id/toggle')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @AuditLog('UPDATE', 'Voucher')
  async adminToggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.adminToggleActive(id);
  }

  @Delete('admin/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @AuditLog('DELETE', 'Voucher')
  async adminDelete(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.adminDelete(id);
  }
}

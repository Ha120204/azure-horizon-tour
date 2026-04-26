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
  BadRequestException,
  ParseIntPipe,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VoucherService } from './voucher.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';

// ─── Guards ───────────────────────────────────────────────────────────────────

@Injectable()
class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const role = req.user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Chỉ Admin và Super Admin mới có quyền thực hiện thao tác này');
    }
    return true;
  }
}

// Staff + Admin đều đọc được, nhưng chỉ Admin mới sửa/tạo/xóa
@Injectable()
class StaffReadGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const role = req.user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'STAFF') {
      throw new ForbiddenException('Bạn không có quyền truy cập trang này');
    }
    return true;
  }
}

@Injectable()
class SuperAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Chỉ Super Admin mới có quyền xóa voucher');
    }
    return true;
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('voucher')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  // ══════════════════════════════════════
  // PUBLIC routes (không cần đăng nhập)
  // ══════════════════════════════════════

  /** GET /voucher — Danh sách voucher public */
  @Get()
  async getAllVouchers() {
    return this.voucherService.getAllVouchers();
  }

  // ══════════════════════════════════════
  // AUTH routes (cần đăng nhập)
  // ══════════════════════════════════════

  /** POST /voucher/save — Lưu vào ví */
  @Post('save')
  @UseGuards(AuthGuard('jwt'))
  async saveToWallet(@Req() req, @Body() body: Record<string, any>) {
    return this.voucherService.saveToWallet(req.user.userId, Number(body.voucherId));
  }

  /** GET /voucher/my-wallet — Ví voucher của user */
  @Get('my-wallet')
  @UseGuards(AuthGuard('jwt'))
  async getMyWallet(@Req() req) {
    return this.voucherService.getMyWallet(req.user.userId);
  }

  /** POST /voucher/validate — Kiểm tra mã */
  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  async validateVoucher(@Body() body: Record<string, any>) {
    if (!body.code || body.totalPrice === undefined) {
      throw new BadRequestException('Thiếu thông tin code hoặc totalPrice');
    }
    return this.voucherService.validateVoucher(body.code, Number(body.totalPrice));
  }

  // ══════════════════════════════════════
  // ADMIN routes (ADMIN | SUPER_ADMIN)
  // ══════════════════════════════════════

  /** GET /voucher/admin/stats — KPI tổng quan */
  @Get('admin/stats')
  @UseGuards(AuthGuard('jwt'), StaffReadGuard)
  async adminGetStats() {
    return this.voucherService.adminGetStats();
  }

  /** GET /voucher/admin — Danh sách có filter + pagination */
  @Get('admin')
  @UseGuards(AuthGuard('jwt'), StaffReadGuard)
  async adminGetAll(@Query() query: Record<string, any>) {
    return this.voucherService.adminGetAll({
      search: query.search,
      discountType: query.discountType,
      status: query.status,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
    });
  }

  /** GET /voucher/admin/:id — Chi tiết + lịch sử dùng */
  @Get('admin/:id')
  @UseGuards(AuthGuard('jwt'), StaffReadGuard)
  async adminGetDetail(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.adminGetDetail(id);
  }

  /** POST /voucher/admin — Tạo voucher mới */
  @Post('admin')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @AuditLog('CREATE', 'Voucher')
  async adminCreate(@Body() body: Record<string, any>) {
    return this.voucherService.adminCreate({
      code: body.code,
      label: body.label,
      description: body.description ?? '',
      discountType: body.discountType,
      discountValue: Number(body.discountValue),
      minOrderValue: body.minOrderValue !== undefined ? Number(body.minOrderValue) : 0,
      maxUses: body.maxUses !== null && body.maxUses !== undefined ? Number(body.maxUses) : null,
      expiresAt: body.expiresAt ?? null,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });
  }

  /** PATCH /voucher/admin/:id — Cập nhật voucher */
  @Patch('admin/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @AuditLog('UPDATE', 'Voucher')
  async adminUpdate(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    return this.voucherService.adminUpdate(id, {
      code: body.code,
      label: body.label,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue !== undefined ? Number(body.discountValue) : undefined,
      minOrderValue: body.minOrderValue !== undefined ? Number(body.minOrderValue) : undefined,
      maxUses: body.maxUses !== undefined ? (body.maxUses !== null ? Number(body.maxUses) : null) : undefined,
      expiresAt: body.expiresAt,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });
  }

  /** PATCH /voucher/admin/:id/toggle — Bật/tắt isActive */
  @Patch('admin/:id/toggle')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @AuditLog('UPDATE', 'Voucher')
  async adminToggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.adminToggleActive(id);
  }

  /** DELETE /voucher/admin/:id — Xóa (chỉ SUPER_ADMIN) */
  @Delete('admin/:id')
  @UseGuards(AuthGuard('jwt'), SuperAdminGuard)
  @AuditLog('DELETE', 'Voucher')
  async adminDelete(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.adminDelete(id);
  }
}

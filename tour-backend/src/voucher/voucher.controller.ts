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
import {
  type AdminVoucherQuery,
  type CreateVoucherDto,
  type UpdateVoucherDto,
  VoucherService,
} from './voucher.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';

type AuthUser = {
  id?: number | string;
  userId?: number | string;
  sub?: number | string;
  role?: string;
};

type AuthenticatedRequest = {
  user?: AuthUser;
};

type RawInput = Record<string, unknown>;

type DiscountType = CreateVoucherDto['discountType'];
type VoucherStatus = NonNullable<AdminVoucherQuery['status']>;
type VoucherSortBy = NonNullable<AdminVoucherQuery['sortBy']>;
type SortOrder = NonNullable<AdminVoucherQuery['sortOrder']>;

const DISCOUNT_TYPES: readonly DiscountType[] = ['PERCENTAGE', 'FIXED_AMOUNT'];
const VOUCHER_STATUSES: readonly VoucherStatus[] = [
  'active',
  'expired',
  'depleted',
  'inactive',
  'expiringSoon',
  'expiredThisMonth',
  'redeemed',
];
const VOUCHER_SORT_FIELDS: readonly VoucherSortBy[] = [
  'createdAt',
  'expiresAt',
  'usedCount',
];
const SORT_ORDERS: readonly SortOrder[] = ['asc', 'desc'];

function hasOwn(input: RawInput, key: string): boolean {
  return Object.hasOwn(input, key);
}

function firstScalar(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const values = value as unknown[];
  return values[0];
}

function optionalString(value: unknown): string | undefined {
  const scalar = firstScalar(value);
  if (scalar == null) return undefined;
  if (typeof scalar === 'string') {
    const trimmed = scalar.trim();
    return trimmed || undefined;
  }
  if (typeof scalar === 'number' || typeof scalar === 'boolean') {
    return String(scalar);
  }
  return undefined;
}

function requiredString(value: unknown, fieldName: string): string {
  const result = optionalString(value);
  if (!result) throw new BadRequestException(`${fieldName} khong hop le`);
  return result;
}

function optionalNumber(value: unknown, fieldName: string): number | undefined {
  const scalar = firstScalar(value);
  if (scalar == null || scalar === '') return undefined;
  const numberValue = Number(scalar);
  if (!Number.isFinite(numberValue)) {
    throw new BadRequestException(`${fieldName} khong hop le`);
  }
  return numberValue;
}

function requiredNumber(value: unknown, fieldName: string): number {
  const result = optionalNumber(value, fieldName);
  if (result === undefined) {
    throw new BadRequestException(`${fieldName} khong hop le`);
  }
  return result;
}

function optionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  const scalar = firstScalar(value);
  if (scalar == null || scalar === '') return undefined;
  if (typeof scalar === 'boolean') return scalar;
  if (typeof scalar === 'string') {
    const normalized = scalar.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  throw new BadRequestException(`${fieldName} khong hop le`);
}

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T | undefined {
  const result = optionalString(value);
  if (!result) return undefined;
  if ((allowed as readonly string[]).includes(result)) return result as T;
  throw new BadRequestException(`${fieldName} khong hop le`);
}

function requiredEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T {
  const result = optionalEnum(value, allowed, fieldName);
  if (!result) throw new BadRequestException(`${fieldName} khong hop le`);
  return result;
}

function getRequestUser(ctx: ExecutionContext): AuthUser | undefined {
  return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
}

function getRequestUserRole(ctx: ExecutionContext): string | undefined {
  return getRequestUser(ctx)?.role;
}

function getAuthenticatedUserId(req: AuthenticatedRequest): number {
  const rawId = req.user?.userId ?? req.user?.id ?? req.user?.sub;
  const userId = Number(rawId);
  if (!Number.isInteger(userId)) {
    throw new ForbiddenException('Khong xac dinh duoc nguoi dung');
  }
  return userId;
}

// ─── Guards ───────────────────────────────────────────────────────────────────

@Injectable()
class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const role = getRequestUserRole(ctx);
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
    const role = getRequestUserRole(ctx);
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'STAFF') {
      throw new ForbiddenException('Bạn không có quyền truy cập trang này');
    }
    return true;
  }
}

@Injectable()
class SuperAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    if (getRequestUserRole(ctx) !== 'SUPER_ADMIN') {
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
  async saveToWallet(@Req() req: AuthenticatedRequest, @Body() body: RawInput) {
    return this.voucherService.saveToWallet(
      getAuthenticatedUserId(req),
      requiredNumber(body.voucherId, 'voucherId'),
    );
  }

  /** GET /voucher/my-wallet — Ví voucher của user */
  @Get('my-wallet')
  @UseGuards(AuthGuard('jwt'))
  async getMyWallet(@Req() req: AuthenticatedRequest) {
    return this.voucherService.getMyWallet(getAuthenticatedUserId(req));
  }

  /** POST /voucher/validate — Kiểm tra mã */
  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  async validateVoucher(@Body() body: RawInput) {
    if (!body.code || body.totalPrice === undefined) {
      throw new BadRequestException('Thiếu thông tin code hoặc totalPrice');
    }
    return this.voucherService.validateVoucher(
      requiredString(body.code, 'code'),
      requiredNumber(body.totalPrice, 'totalPrice'),
      {
        tourId: optionalNumber(body.tourId, 'tourId') ?? null,
        departureId: optionalNumber(body.departureId, 'departureId') ?? null,
      },
    );
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
  async adminGetAll(@Query() query: RawInput) {
    return this.voucherService.adminGetAll({
      search: optionalString(query.search),
      discountType: optionalEnum(query.discountType, DISCOUNT_TYPES, 'discountType'),
      status: optionalEnum(query.status, VOUCHER_STATUSES, 'status'),
      page: optionalNumber(query.page, 'page') ?? 1,
      limit: optionalNumber(query.limit, 'limit') ?? 10,
      sortBy: optionalEnum(query.sortBy, VOUCHER_SORT_FIELDS, 'sortBy') ?? 'createdAt',
      sortOrder: optionalEnum(query.sortOrder, SORT_ORDERS, 'sortOrder') ?? 'desc',
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
  async adminCreate(@Body() body: RawInput) {
    return this.voucherService.adminCreate({
      code: requiredString(body.code, 'code'),
      label: requiredString(body.label, 'label'),
      description: optionalString(body.description) ?? '',
      discountType: requiredEnum(body.discountType, DISCOUNT_TYPES, 'discountType'),
      discountValue: requiredNumber(body.discountValue, 'discountValue'),
      minOrderValue: optionalNumber(body.minOrderValue, 'minOrderValue') ?? 0,
      maxUses: optionalNumber(body.maxUses, 'maxUses') ?? null,
      expiresAt: optionalString(body.expiresAt) ?? null,
      isActive: optionalBoolean(body.isActive, 'isActive') ?? true,
    });
  }

  /** PATCH /voucher/admin/:id — Cập nhật voucher */
  @Patch('admin/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @AuditLog('UPDATE', 'Voucher')
  async adminUpdate(@Param('id', ParseIntPipe) id: number, @Body() body: RawInput) {
    const dto: UpdateVoucherDto = {};
    if (hasOwn(body, 'code')) dto.code = optionalString(body.code);
    if (hasOwn(body, 'label')) dto.label = optionalString(body.label);
    if (hasOwn(body, 'description')) {
      dto.description = optionalString(body.description) ?? '';
    }
    if (hasOwn(body, 'discountType')) {
      dto.discountType = optionalEnum(body.discountType, DISCOUNT_TYPES, 'discountType');
    }
    if (hasOwn(body, 'discountValue')) {
      dto.discountValue = optionalNumber(body.discountValue, 'discountValue');
    }
    if (hasOwn(body, 'minOrderValue')) {
      dto.minOrderValue = optionalNumber(body.minOrderValue, 'minOrderValue');
    }
    if (hasOwn(body, 'maxUses')) {
      dto.maxUses = optionalNumber(body.maxUses, 'maxUses') ?? null;
    }
    if (hasOwn(body, 'expiresAt')) {
      dto.expiresAt = optionalString(body.expiresAt) ?? null;
    }
    if (hasOwn(body, 'isActive')) {
      dto.isActive = optionalBoolean(body.isActive, 'isActive');
    }

    return this.voucherService.adminUpdate(id, dto);
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

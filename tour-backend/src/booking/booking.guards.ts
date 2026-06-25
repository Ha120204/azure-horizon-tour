import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { superAdminCanAccessArea } from '../auth/decorators/super-admin-area.decorator';

export type AuthenticatedRequest = {
  user?: {
    userId?: number;
    id?: number;
    role?: string;
  };
};

export const getAuthUserId = (req: AuthenticatedRequest): number =>
  Number(req.user?.userId ?? req.user?.id);

export const getAuthRole = (req: AuthenticatedRequest): string =>
  String(req.user?.role ?? '');

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown booking error';
}

@Injectable()
export class StaffOrAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = req.user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'STAFF') {
      throw new ForbiddenException('Bạn không có quyền truy cập tính năng này');
    }
    if (role === 'SUPER_ADMIN' && !superAdminCanAccessArea(req, 'bookings')) {
      throw new ForbiddenException('Bạn không có quyền truy cập tính năng này');
    }
    return true;
  }
}

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = req.user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Chỉ Admin mới có quyền thực hiện thao tác này');
    }
    if (role === 'SUPER_ADMIN' && !superAdminCanAccessArea(req, 'bookings')) {
      throw new ForbiddenException('Chỉ Admin mới có quyền thực hiện thao tác này');
    }
    return true;
  }
}

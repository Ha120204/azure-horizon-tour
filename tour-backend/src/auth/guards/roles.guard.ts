import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SUPER_ADMIN_AREA_KEY,
  superAdminCanAccessArea,
  type SuperAdminArea,
} from '../decorators/super-admin-area.decorator';

type AuthenticatedRequest = {
  method?: string;
  user?: {
    role?: unknown;
    superAdminViewGrants?: unknown;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;
    if (typeof role !== 'string') {
      return false;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // [AUTH - PHÒNG THỦ 2 LỚP cho SUPER_ADMIN]
    //   Khu VẬN HÀNH (controller gắn @SuperAdminArea): return SỚM tại đây.
    //     → superAdminCanAccessArea() chỉ cho GET + đã tự bật quyền → ghi thì false → 403.
    //     → KHÔNG chạy xuống roles.includes() dù @Roles có liệt kê SUPER_ADMIN.
    //   Khu GOVERNANCE (user/settings/audit — không gắn area): rơi xuống roles.includes()
    //     → SUPER_ADMIN ghi được (quản lý admin, audit... là việc đúng của nó).
    // ════════════════════════════════════════════════════════════════════════════
    if (role === 'SUPER_ADMIN') {
      const area = this.reflector.getAllAndOverride<SuperAdminArea>(
        SUPER_ADMIN_AREA_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (area) {
        return superAdminCanAccessArea(request, area);
      }
    }

    return roles.includes(role);
  }
}

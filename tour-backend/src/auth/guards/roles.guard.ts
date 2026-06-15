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

    // SUPER_ADMIN bị giới hạn ở các khu vận hành (controller gắn @SuperAdminArea):
    // chỉ được XEM (GET) và chỉ khi đã tự bật quyền cho khu đó. Các route governance
    // (không gắn area) giữ nguyên hành vi cũ.
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

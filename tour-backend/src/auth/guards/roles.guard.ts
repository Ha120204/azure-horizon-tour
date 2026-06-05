import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

type AuthenticatedRequest = {
  user?: {
    role?: unknown;
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
    return typeof role === 'string' && roles.includes(role);
  }
}

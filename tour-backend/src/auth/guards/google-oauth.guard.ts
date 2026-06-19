import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/**
 * Truyền query `?from=` vào tham số OAuth `state` để Google echo lại ở callback.
 * Nhờ đó backend biết người dùng bấm "đăng nhập Google" từ trang nào (admin/khách)
 * và điều hướng về đúng nơi sau khi xác thực.
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const from = req.query.from;
    return { state: typeof from === 'string' ? from : undefined };
  }
}

import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard cho phép cả request có token lẫn không có token.
 * - Có token hợp lệ → req.user được populate
 * - Không có token / token hết hạn → req.user = undefined (không throw lỗi)
 *
 * Dùng cho các endpoint cần hành xử khác nhau theo role nhưng vẫn public:
 * VD: GET /tour → Public thấy PUBLISHED, Staff thấy tour của mình, Admin thấy tất cả
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | null | undefined,
    _info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    // Không throw lỗi dù không có user
    return (user ?? undefined) as TUser;
  }
}

import 'dotenv/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Request } from 'express';

function extractJwtFromCookie(req: Request | undefined): string | null {
  const cookies = (req as { cookies?: unknown } | undefined)?.cookies;
  if (!cookies || typeof cookies !== 'object') return null;

  const token = (cookies as Record<string, unknown>).accessToken;
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [AUTH - XÁC THỰC MỖI REQUEST] Passport gọi validate() sau khi giải mã JWT thành công.
  // 3 bước kiểm tra bắt buộc (thiếu 1 bước là hở bảo mật):
  //   BƯỚC 1 — user còn tồn tại & chưa bị xóa mềm? → ngăn tài khoản đã khoá tiếp tục dùng token.
  //   BƯỚC 2 — tokenVersion trong token === authTokenVersion trong DB? → phát hiện token cũ bị
  //             thu hồi sau khi đổi/reset mật khẩu (cơ chế stateless thay cho blacklist).
  //   BƯỚC 3 — giá trị return được Passport gán vào req.user → RolesGuard đọc tiếp.
  // ════════════════════════════════════════════════════════════════════════════
  async validate(payload: { sub: number; email?: string; role?: string; tokenVersion?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        superAdminViewGrants: true,
        deletedAt: true,
        authTokenVersion: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Account is inactive or does not exist');
    }

    const tokenVersion = payload.tokenVersion ?? 0;
    if (tokenVersion !== user.authTokenVersion) {
      throw new UnauthorizedException('Session has been revoked');
    }

    return {
      id: user.id,
      userId: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      superAdminViewGrants: user.superAdminViewGrants,
    };
  }
}

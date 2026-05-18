import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';

type AuthenticatedSettingsRequest = {
  user: {
    userId: number;
    role: string;
  };
};

// ── Guard: chỉ SUPER_ADMIN mới sửa được cấu hình hệ thống ───────────────────
@Injectable()
class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthenticatedSettingsRequest>();
    const role = req.user?.role;
    if (role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Chỉ Super Admin mới có quyền chỉnh sửa cài đặt hệ thống');
    }
    return true;
  }
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /settings — Grouped settings (tất cả roles đều đọc được sau khi đăng nhập)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getAll() {
    const data = await this.settingsService.getAll();
    return { message: 'Success', data };
  }

  /**
   * GET /settings/public — Public website settings
   */
  @Get('public')
  async getPublic() {
    const data = await this.settingsService.getPublic();
    return { message: 'Success', data };
  }

  /**
   * GET /settings/flat — Object phẳng key→value (dùng nhanh cho frontend)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('flat')
  async getFlat() {
    const data = await this.settingsService.getFlat();
    return { message: 'Success', data };
  }

  /**
   * PATCH /settings — Cập nhật settings
   * Body: { "company_name": "Azure Horizon", "booking_hold_minutes": "20" }
   * Chỉ SUPER_ADMIN
   */
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch()
  async updateMany(
    @Body() body: Record<string, string>,
    @Request() req: AuthenticatedSettingsRequest,
  ) {
    const adminId = req.user.userId;
    const data = await this.settingsService.updateMany(body, adminId);
    return { message: 'Success', data };
  }
}

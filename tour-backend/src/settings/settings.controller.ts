import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

type AuthenticatedSettingsRequest = {
  user: {
    userId: number;
    role: string;
  };
};

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /settings/health - Runtime health checks for the admin settings page
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('health')
  async getHealth() {
    const data = await this.settingsService.getHealth();
    return { message: 'Success', data };
  }

  /**
   * GET /settings/security-info — Giá trị JWT/rate-limit thật từ process.env
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('security-info')
  getSecurityInfo() {
    return { message: 'Success', data: this.settingsService.getSecurityInfo() };
  }

  /**
   * GET /settings/meta — Validation constraints per key (type, min, max, maxLength, required)
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('meta')
  getMeta() {
    return { message: 'Success', data: this.settingsService.getMeta() };
  }

  /**
   * GET /settings — Grouped settings (chỉ Admin và Super Admin)
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
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

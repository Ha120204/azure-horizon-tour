import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { SuperAdminService } from './super-admin.service';
import { UpdateViewGrantsDto } from './dto/update-view-grants.dto';

@Controller('admin/super')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('overview')
  async getOverview() {
    const data = await this.superAdminService.getOverview();
    return { data };
  }

  @Get('view-grants')
  async getViewGrants(@Request() req: { user?: { userId?: number; id?: number } }) {
    const data = await this.superAdminService.getViewGrants(
      req.user?.userId ?? req.user?.id,
    );
    return { data };
  }

  @Patch('view-grants')
  @AuditLog('UPDATE', 'SuperAdminViewGrants')
  async updateViewGrants(
    @Body() dto: UpdateViewGrantsDto,
    @Request() req: { user?: { userId?: number; id?: number } },
  ) {
    const data = await this.superAdminService.updateViewGrants(
      req.user?.userId ?? req.user?.id,
      dto.grants,
    );
    return { data };
  }

  @Patch('risks/:key')
  @AuditLog('UPDATE', 'SuperRiskReview')
  async updateRiskReview(
    @Param('key') key: string,
    @Body() body: { status?: string; note?: string },
    @Request() req: { user?: { userId?: number; id?: number } },
  ) {
    const data = await this.superAdminService.updateRiskReview(
      key,
      body.status ?? 'REVIEWED',
      body.note,
      req.user?.userId ?? req.user?.id,
    );
    return { data };
  }
}

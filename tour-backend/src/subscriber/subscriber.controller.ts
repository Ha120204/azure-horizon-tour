import {
  Controller, Post, Get, Delete, Patch,
  Body, Param, Query, Req, ParseIntPipe,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriberService } from './subscriber.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuperAdminArea } from '../auth/decorators/super-admin-area.decorator';
import {
  SubscribeDto,
  SetSubscriberStatusDto,
  CampaignTestDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  ScheduleCampaignDto,
} from './dto';

type AuthenticatedRequest = {
  user?: {
    userId?: number;
    id?: number;
  };
};

const getAuthUserId = (req: AuthenticatedRequest): number | undefined => {
  const id = Number(req.user?.userId ?? req.user?.id);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

@SuperAdminArea('marketing')
@Controller('subscriber')
export class SubscriberController {
  constructor(private readonly subscriberService: SubscriberService) {}

  // Public: POST /subscriber/subscribe — khách đăng ký email
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto) {
    return this.subscriberService.subscribe(dto.email);
  }

  // Public: GET /subscriber/unsubscribe — xem thông tin liên kết hủy đăng ký
  @Get('unsubscribe')
  async getUnsubscribeDetails(@Query('token') token?: string) {
    if (!token?.trim()) throw new BadRequestException('Token hủy đăng ký là bắt buộc');
    return this.subscriberService.getUnsubscribeDetails(token.trim());
  }

  // Public: POST /subscriber/unsubscribe — xác nhận hủy đăng ký
  @Post('unsubscribe')
  async unsubscribe(@Body() body: { token?: string; reason?: string }) {
    if (!body.token?.trim()) throw new BadRequestException('Token hủy đăng ký là bắt buộc');
    return this.subscriberService.unsubscribe(body.token.trim(), body.reason);
  }

  // Admin/Super Admin: GET /subscriber — danh sách subscribers
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAll(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
  ) {
    return this.subscriberService.getAll({
      page:   page  ? parseInt(page)  : 1,
      limit:  limit ? parseInt(limit) : 20,
      search,
      status: status ?? 'all',
    });
  }

  // Admin/Super Admin: GET /subscriber/stats
  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getStats() {
    return this.subscriberService.getStats();
  }

  // Admin/Super Admin: GET /subscriber/campaigns — bản nháp + chiến dịch
  @Get('campaigns')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getCampaigns(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('filter') filter?: 'active' | 'sent' | 'closed' | 'all',
  ) {
    return this.subscriberService.getCampaigns({
      page:   page  ? parseInt(page)  : 1,
      limit:  limit ? parseInt(limit) : 5,
      filter: filter ?? 'active',
    });
  }

  // Admin/Super Admin: POST /subscriber/campaigns — tạo bản nháp
  @Post('campaigns')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createCampaign(@Body() dto: CreateCampaignDto, @Req() req: AuthenticatedRequest) {
    return this.subscriberService.createDraft(dto, getAuthUserId(req));
  }

  // Admin/Super Admin: PATCH /subscriber/campaigns/:id — cập nhật bản nháp
  @Patch('campaigns/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    if (!id.trim()) throw new BadRequestException('ID chiến dịch là bắt buộc');
    return this.subscriberService.updateDraft(id.trim(), dto);
  }

  // Admin/Super Admin: PATCH /subscriber/campaigns/:id/schedule — lên lịch gửi
  @Patch('campaigns/:id/schedule')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async scheduleCampaign(@Param('id') id: string, @Body() dto: ScheduleCampaignDto) {
    if (!id.trim()) throw new BadRequestException('ID chiến dịch là bắt buộc');
    return this.subscriberService.scheduleCampaign(id.trim(), dto.scheduledAt);
  }

  // Admin/Super Admin: PATCH /subscriber/campaigns/:id/cancel — hủy lịch gửi
  @Patch('campaigns/:id/cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async cancelCampaign(@Param('id') id: string) {
    if (!id.trim()) throw new BadRequestException('ID chiến dịch là bắt buộc');
    return this.subscriberService.cancelCampaign(id.trim());
  }

  // Admin/Super Admin: DELETE /subscriber/campaigns/:id — xóa bản nháp
  @Delete('campaigns/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteCampaign(@Param('id') id: string) {
    if (!id.trim()) throw new BadRequestException('ID chiến dịch là bắt buộc');
    return this.subscriberService.deleteDraft(id.trim());
  }

  // Admin/Super Admin: POST /subscriber/campaign/test — gửi thử nội bộ
  @Post('campaign/test')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async sendCampaignTest(@Body() dto: CampaignTestDto) {
    return this.subscriberService.sendCampaignTest({
      to: dto.to,
      subject: dto.subject,
      previewText: dto.previewText,
      body: dto.body,
      campaignName: dto.campaignName,
    });
  }

  // Admin/Super Admin: PATCH /subscriber/:id/status — bật/tắt nhận tin
  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetSubscriberStatusDto,
  ) {
    return this.subscriberService.setActive(id, dto.isActive);
  }

  // Admin/Super Admin: DELETE /subscriber/:id — xóa subscriber
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.subscriberService.remove(id);
  }
}

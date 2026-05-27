import {
  Controller, Post, Get, Delete, Patch,
  Body, Param, Query, ParseIntPipe,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriberService } from './subscriber.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('subscriber')
export class SubscriberController {
  constructor(private readonly subscriberService: SubscriberService) {}

  // Public: POST /subscriber/subscribe — khách đăng ký email
  @Post('subscribe')
  async subscribe(@Body() body: { email: string }) {
    if (!body.email || !body.email.includes('@')) {
      throw new BadRequestException('Email không hợp lệ');
    }
    return this.subscriberService.subscribe(body.email.trim().toLowerCase());
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

  @Get('campaigns')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getCampaigns() {
    return this.subscriberService.getCampaigns();
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive?: boolean },
  ) {
    if (typeof body.isActive !== 'boolean') {
      throw new BadRequestException('isActive phải là boolean');
    }
    return this.subscriberService.setActive(id, body.isActive);
  }

  @Post('campaign/test')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async sendCampaignTest(@Body() body: {
    to?: string;
    subject?: string;
    previewText?: string;
    body?: string;
    campaignName?: string;
  }) {
    if (!body.to || !body.to.includes('@')) {
      throw new BadRequestException('Email gửi thử không hợp lệ');
    }
    if (!body.subject?.trim() || !body.body?.trim()) {
      throw new BadRequestException('Tiêu đề và nội dung email là bắt buộc');
    }
    return this.subscriberService.sendCampaignTest({
      to: body.to.trim().toLowerCase(),
      subject: body.subject.trim(),
      previewText: body.previewText?.trim(),
      body: body.body.trim(),
      campaignName: body.campaignName?.trim(),
    });
  }

  @Post('campaign/schedule')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async scheduleCampaign(@Body() body: {
    campaignName?: string;
    type?: string;
    subject?: string;
    previewText?: string;
    body?: string;
    audience?: 'ALL_ACTIVE' | 'CURRENT_FILTER' | 'MANUAL_SELECTION';
    audienceFilter?: { status?: 'active' | 'inactive' | 'all'; search?: string; recipientIds?: number[] };
    recipientIds?: number[];
    scheduledAt?: string;
  }) {
    if (!body.campaignName?.trim() || !body.subject?.trim() || !body.body?.trim()) {
      throw new BadRequestException('Tên chiến dịch, tiêu đề và nội dung email là bắt buộc');
    }
    if (!body.scheduledAt) {
      throw new BadRequestException('Thời gian gửi là bắt buộc');
    }
    const scheduledDate = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Thời gian gửi không hợp lệ');
    }
    if (scheduledDate.getTime() < Date.now() + 30_000) {
      throw new BadRequestException('Thời gian gửi phải sau hiện tại ít nhất 30 giây');
    }
    return this.subscriberService.scheduleCampaign({
      campaignName: body.campaignName.trim(),
      type: body.type?.trim(),
      subject: body.subject.trim(),
      previewText: body.previewText?.trim(),
      body: body.body.trim(),
      audience: body.audience ?? 'ALL_ACTIVE',
      audienceFilter: body.audienceFilter,
      recipientIds: body.recipientIds,
      scheduledAt: scheduledDate.toISOString(),
    });
  }

  // Admin: DELETE /subscriber/:id — xóa subscriber
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.subscriberService.remove(id);
  }
}

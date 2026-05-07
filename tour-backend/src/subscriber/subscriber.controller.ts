import {
  Controller, Post, Get, Delete,
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

  // Admin/Staff: GET /subscriber — danh sách subscribers
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  async getAll(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('search') search?: string,
  ) {
    return this.subscriberService.getAll({
      page:   page  ? parseInt(page)  : 1,
      limit:  limit ? parseInt(limit) : 20,
      search,
    });
  }

  // Admin/Staff: GET /subscriber/stats
  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  async getStats() {
    return this.subscriberService.getStats();
  }

  // Admin: DELETE /subscriber/:id — xóa subscriber
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.subscriberService.remove(id);
  }
}

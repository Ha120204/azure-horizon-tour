import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';

@Controller('subscriber')
export class SubscriberController {
  constructor(private readonly subscriberService: SubscriberService) {}

  @Post('subscribe')
  async subscribe(@Body() body: { email: string }) {
    if (!body.email || !body.email.includes('@')) {
      throw new BadRequestException('Email không hợp lệ');
    }
    return this.subscriberService.subscribe(body.email.trim().toLowerCase());
  }
}

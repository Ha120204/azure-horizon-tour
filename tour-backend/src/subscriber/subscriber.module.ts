import { Module } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';
import { SubscriberController } from './subscriber.controller';

@Module({
  providers: [SubscriberService],
  controllers: [SubscriberController]
})
export class SubscriberModule {}

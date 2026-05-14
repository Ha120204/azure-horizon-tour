import { Module } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';
import { SubscriberController } from './subscriber.controller';
import { SubscriberCronService } from './subscriber-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [SubscriberService, SubscriberCronService],
  controllers: [SubscriberController],
})
export class SubscriberModule {}

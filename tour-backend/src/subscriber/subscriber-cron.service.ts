import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriberService } from './subscriber.service';

@Injectable()
export class SubscriberCronService {
  private readonly logger = new Logger(SubscriberCronService.name);

  constructor(private readonly subscriberService: SubscriberService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    try {
      await this.subscriberService.processDueCampaigns();
    } catch (error) {
      this.logger.error('Failed to process scheduled marketing campaigns', error);
    }
  }
}

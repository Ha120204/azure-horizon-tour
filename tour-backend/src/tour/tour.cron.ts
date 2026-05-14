import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TourStatus } from '@prisma/client';

@Injectable()
export class TourCronService {
  private readonly logger = new Logger(TourCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run every day at midnight (00:00:00)
   * Auto-update PUBLISHED tours to COMPLETED if their startDate is in the past.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredTours() {
    this.logger.log('Starting daily check for expired tours...');
    try {
      const now = new Date();

      // Find and update tours that have already started/expired
      const result = await this.prisma.tour.updateMany({
        where: {
          status: TourStatus.PUBLISHED,
          startDate: {
            lt: now, // startDate is strictly before current date
          },
        },
        data: {
          status: TourStatus.COMPLETED,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Successfully moved ${result.count} expired tour(s) to COMPLETED status.`);
      } else {
        this.logger.log('No expired tours found to process today.');
      }
    } catch (error) {
      this.logger.error('Failed to process expired tours', error);
    }
  }
}

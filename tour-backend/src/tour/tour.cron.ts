import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TourStatus } from '@prisma/client';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown tour cron error';
}

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
      const minBookableDate = new Date();
      minBookableDate.setDate(minBookableDate.getDate() + 1);
      const minBookableDateStart = new Date(
        `${minBookableDate.toISOString().slice(0, 10)}T00:00:00.000Z`,
      );

      const departureResult = await this.prisma.tourDeparture.updateMany({
        where: {
          isActive: true,
          departureDate: { lt: minBookableDateStart },
        },
        data: { isActive: false },
      });

      if (departureResult.count > 0) {
        this.logger.log(`Archived ${departureResult.count} expired tour departure(s).`);
      }

      // Complete a tour only when it has no active upcoming departures left.
      // Tours without departure rows keep the legacy startDate-based behavior.
      const result = await this.prisma.tour.updateMany({
        where: {
          status: TourStatus.PUBLISHED,
          OR: [
            {
              AND: [
                { departures: { some: {} } },
                {
                  departures: {
                    none: {
                      isActive: true,
                      departureDate: { gte: minBookableDateStart },
                    },
                  },
                },
              ],
            },
            {
              AND: [
                { departures: { none: {} } },
                { startDate: { lt: now } },
              ],
            },
          ],
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
      this.logger.error('Failed to process expired tours', getErrorMessage(error));
    }
  }
}

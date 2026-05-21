import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatisticsService } from './statistics.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * GET /statistics/overview?dateFrom=2026-03-01&dateTo=2026-03-31
   * KPI tổng hợp + so sánh với kỳ trước tương đương
   */
  @Get('overview')
  async getOverview(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.statisticsService.getOverview(dateFrom, dateTo);
    return { message: 'Success', data };
  }

  /**
   * GET /statistics/revenue?dateFrom=...&dateTo=...&granularity=weekly
   * Doanh thu theo granularity: daily | weekly | monthly
   */
  @Get('revenue')
  async getRevenueChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('granularity') granularity?: 'daily' | 'weekly' | 'monthly',
  ) {
    const data = await this.statisticsService.getRevenueChart(dateFrom, dateTo, granularity);
    return { message: 'Success', data };
  }

  /**
   * GET /statistics/bookings/status?dateFrom=...&dateTo=...
   * Phân bổ trạng thái + payment + trend trong kỳ
   */
  @Get('bookings/status')
  async getBookingStatus(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.statisticsService.getBookingStatusDistribution(dateFrom, dateTo);
    return { message: 'Success', data };
  }

  /**
   * GET /statistics/destinations/revenue?dateFrom=...&dateTo=...&limit=8
   * Doanh thu theo điểm đến (horizontal bar chart)
   */
  @Get('destinations/revenue')
  async getDestinationRevenue(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.statisticsService.getRevenueByDestination(
      dateFrom,
      dateTo,
      limit ? Number(limit) : 8,
    );
    return { message: 'Success', data };
  }

  /**
   * GET /statistics/tours/top?limit=5&dateFrom=...&dateTo=...
   * Top tour bán chạy trong kỳ
   */
  @Get('tours/top')
  async getTopTours(
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.statisticsService.getTopTours(
      limit ? Number(limit) : 5,
      dateFrom,
      dateTo,
    );
    return { message: 'Success', data };
  }

  /**
   * GET /statistics/customers/top?limit=5&dateFrom=...&dateTo=...
   * Top khách hàng chi tiêu nhiều nhất trong kỳ
   */
  @Get('customers/top')
  async getTopCustomers(
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.statisticsService.getTopCustomers(
      limit ? Number(limit) : 5,
      dateFrom,
      dateTo,
    );
    return { message: 'Success', data };
  }

  /**
   * GET /statistics/vouchers/summary
   * Tổng hợp voucher (không filter theo kỳ)
   */
  @Get('vouchers/summary')
  async getVoucherStats() {
    const data = await this.statisticsService.getVoucherStats();
    return { message: 'Success', data };
  }
}

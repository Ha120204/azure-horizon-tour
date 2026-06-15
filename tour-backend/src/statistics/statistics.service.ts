import { Injectable, HttpException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════

  /** Parse date range, mặc định = N ngày gần nhất — biên kỳ và bucket đều dùng UTC */
  private parseDateRange(dateFrom?: string, dateTo?: string, defaultDays = 30) {
    const todayUtc = new Date().toISOString().split('T')[0];
    const toStr = dateTo ?? todayUtc;
    const toMs = new Date(toStr + 'T00:00:00.000Z').getTime();
    const fromStr = dateFrom
      ? dateFrom
      : new Date(toMs - defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return {
      from: new Date(fromStr + 'T00:00:00.000Z'),
      to: new Date(toStr + 'T23:59:59.999Z'),
    };
  }

  /** Tính kỳ trước tương đương (cùng độ dài) để so sánh */
  private getPreviousPeriod(from: Date, to: Date) {
    const duration = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - duration);
    return { prevFrom, prevTo };
  }

  /** % thay đổi */
  private calcChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  // ══════════════════════════════════════════════════════
  // 1. KPI OVERVIEW — so sánh với kỳ trước tương đương
  // ══════════════════════════════════════════════════════
  async getOverview(dateFrom?: string, dateTo?: string) {
    try {
    const { from, to } = this.parseDateRange(dateFrom, dateTo, 30);
    const { prevFrom, prevTo } = this.getPreviousPeriod(from, to);

    const [
      currentRevAgg,
      previousRevAgg,
      currentBookingGroups,
      previousBookingsCount,
      activeTours,
      currentNewCustomers,
      previousNewCustomers,
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { deletedAt: null, paymentStatus: 'PAID', status: { not: 'CANCELLED' }, createdAt: { gte: from, lte: to } },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
      this.prisma.booking.aggregate({
        where: { deletedAt: null, paymentStatus: 'PAID', status: { not: 'CANCELLED' }, createdAt: { gte: prevFrom, lte: prevTo } },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { deletedAt: null, createdAt: { gte: from, lte: to } },
        _count: { status: true },
      }),
      this.prisma.booking.count({
        where: { deletedAt: null, createdAt: { gte: prevFrom, lte: prevTo } },
      }),
      this.prisma.tour.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: from, lte: to } },
      }),
      this.prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: prevFrom, lte: prevTo } },
      }),
    ]);

    const currentRev = Number(currentRevAgg._sum.totalPrice ?? 0);
    const previousRev = Number(previousRevAgg._sum.totalPrice ?? 0);

    const statusMap: Record<string, number> = {};
    let totalBookings = 0;
    for (const s of currentBookingGroups) {
      statusMap[s.status] = s._count.status;
      totalBookings += s._count.status;
    }

    const confirmedCount = statusMap['CONFIRMED'] || 0;
    const cancelledCount = statusMap['CANCELLED'] || 0;

    // AOV = Revenue(PAID) / Bookings(PAID) — mẫu số thống nhất cả hai kỳ
    const aov = currentRevAgg._count.id > 0 ? Math.round(currentRev / currentRevAgg._count.id) : 0;
    const prevAov =
      previousRevAgg._count.id > 0
        ? Math.round(previousRev / previousRevAgg._count.id)
        : 0;
    const cancellationRate =
      totalBookings > 0
        ? Math.round((cancelledCount / totalBookings) * 1000) / 10
        : 0;

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      revenue: {
        current: currentRev,
        previous: previousRev,
        changePercent: this.calcChange(currentRev, previousRev),
      },
      bookings: {
        total: totalBookings,
        previous: previousBookingsCount,
        confirmed: confirmedCount,
        cancelled: cancelledCount,
        cancellationRate,
        changePercent: this.calcChange(totalBookings, previousBookingsCount),
      },
      aov: {
        current: aov,
        previous: prevAov,
        changePercent: this.calcChange(aov, prevAov),
      },
      tours: { active: activeTours },
      customers: {
        newInPeriod: currentNewCustomers,
        previousNewInPeriod: previousNewCustomers,
        changePercent: this.calcChange(currentNewCustomers, previousNewCustomers),
      },
    };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể tải dữ liệu tổng quan');
    }
  }

  // ══════════════════════════════════════════════════════
  // 2. REVENUE CHART — hỗ trợ granularity day/week/month
  // ══════════════════════════════════════════════════════
  async getRevenueChart(
    dateFrom?: string,
    dateTo?: string,
    granularity: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ) {
    try {
    const { from, to } = this.parseDateRange(dateFrom, dateTo, 30);

    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        paymentStatus: 'PAID',
        status: { not: 'CANCELLED' },
        createdAt: { gte: from, lte: to },
      },
      select: { createdAt: true, totalPrice: true },
      orderBy: { createdAt: 'asc' },
    });

    const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
    const multiYear = from.getUTCFullYear() !== to.getUTCFullYear();
    const grouped: Record<string, { revenue: number; bookings: number; label: string }> = {};

    for (const b of bookings) {
      let key: string;
      let label: string;

      if (granularity === 'daily') {
        const d = b.createdAt;
        key = d.toISOString().split('T')[0];
        label = `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
      } else if (granularity === 'weekly') {
        const d = b.createdAt;
        const dayOfWeek = d.getUTCDay();
        const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
        key = monday.toISOString().split('T')[0];
        label = `${monday.getUTCDate()}/${monday.getUTCMonth() + 1}`;
      } else {
        const d = b.createdAt;
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        label = multiYear
          ? `${MONTHS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`
          : MONTHS[d.getUTCMonth()];
      }

      if (!grouped[key]) grouped[key] = { revenue: 0, bookings: 0, label };
      grouped[key].revenue += Number(b.totalPrice);
      grouped[key].bookings += 1;
    }

    const data = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => ({
        key,
        label: values.label,
        revenue: Math.round(values.revenue),
        bookings: values.bookings,
      }));

    return { granularity, from: from.toISOString(), to: to.toISOString(), data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể tải dữ liệu biểu đồ doanh thu');
    }
  }

  // ══════════════════════════════════════════════════════
  // 3. BOOKING STATUS — filter theo khoảng thời gian
  // ══════════════════════════════════════════════════════
  async getBookingStatusDistribution(dateFrom?: string, dateTo?: string) {
    try {
    const { from, to } = this.parseDateRange(dateFrom, dateTo, 30);

    const [statusGroups, paymentGroups, trendBookings] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { deletedAt: null, createdAt: { gte: from, lte: to } },
        _count: { status: true },
      }),
      this.prisma.booking.groupBy({
        by: ['paymentStatus'],
        where: { deletedAt: null, createdAt: { gte: from, lte: to } },
        _count: { paymentStatus: true },
      }),
      this.prisma.booking.findMany({
        where: { deletedAt: null, createdAt: { gte: from, lte: to } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const total = statusGroups.reduce((acc, s) => acc + s._count.status, 0);
    const statusMap: Record<string, number> = {};
    for (const s of statusGroups) statusMap[s.status] = s._count.status;

    const trendMap: Record<string, number> = {};
    for (const b of trendBookings) {
      const key = b.createdAt.toISOString().split('T')[0];
      trendMap[key] = (trendMap[key] || 0) + 1;
    }

    return {
      total,
      distribution: [
        { name: 'Đã xác nhận', value: statusMap['CONFIRMED'] || 0, key: 'CONFIRMED' },
        { name: 'Chờ xử lý', value: statusMap['PENDING'] || 0, key: 'PENDING' },
        { name: 'Yêu cầu hủy', value: statusMap['CANCEL_REQUESTED'] || 0, key: 'CANCEL_REQUESTED' },
        { name: 'Đã hủy', value: statusMap['CANCELLED'] || 0, key: 'CANCELLED' },
      ],
      paymentStatus: [
        { name: 'Đã thanh toán', value: paymentGroups.find(p => p.paymentStatus === 'PAID')?._count.paymentStatus || 0, key: 'PAID' },
        { name: 'Chưa thanh toán', value: paymentGroups.find(p => p.paymentStatus === 'UNPAID')?._count.paymentStatus || 0, key: 'UNPAID' },
        { name: 'Đang xử lý', value: paymentGroups.find(p => p.paymentStatus === 'PROCESSING')?._count.paymentStatus || 0, key: 'PROCESSING' },
        { name: 'Thanh toán lỗi', value: paymentGroups.find(p => p.paymentStatus === 'FAILED')?._count.paymentStatus || 0, key: 'FAILED' },
      ],
      recentTrend: Object.entries(trendMap).map(([date, count]) => ({ date, count })),
    };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể tải phân bố trạng thái booking');
    }
  }

  // ══════════════════════════════════════════════════════
  // 4. REVENUE BY DESTINATION — biểu đồ ngang
  // ══════════════════════════════════════════════════════
  async getRevenueByDestination(dateFrom?: string, dateTo?: string, limit = 8) {
    try {
    const { from, to } = this.parseDateRange(dateFrom, dateTo, 365);

    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        paymentStatus: 'PAID',
        status: { not: 'CANCELLED' },
        createdAt: { gte: from, lte: to },
      },
      select: {
        totalPrice: true,
        tour: { select: { destination: { select: { id: true, name: true } } } },
      },
    });

    const destMap: Record<number, { name: string; revenue: number; bookings: number }> = {};
    for (const b of bookings) {
      const dest = b.tour?.destination;
      if (!dest) continue;
      if (!destMap[dest.id]) destMap[dest.id] = { name: dest.name, revenue: 0, bookings: 0 };
      destMap[dest.id].revenue += Number(b.totalPrice);
      destMap[dest.id].bookings += 1;
    }

    return Object.values(destMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map(d => ({ ...d, revenue: Math.round(d.revenue) }));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể tải doanh thu theo điểm đến');
    }
  }

  // ══════════════════════════════════════════════════════
  // 5. TOP TOURS — filter theo kỳ
  // ══════════════════════════════════════════════════════
  async getTopTours(limit = 5, dateFrom?: string, dateTo?: string) {
    try {
    const { from, to } = this.parseDateRange(dateFrom, dateTo, 365);

    const topByBookings = await this.prisma.booking.groupBy({
      by: ['tourId'],
      where: { deletedAt: null, paymentStatus: 'PAID', status: { not: 'CANCELLED' }, createdAt: { gte: from, lte: to } },
      _count: { tourId: true },
      _sum: { totalPrice: true, numberOfPeople: true },
      orderBy: { _count: { tourId: 'desc' } },
      take: limit,
    });

    const tourIds = topByBookings.map(t => t.tourId);
    const tours = await this.prisma.tour.findMany({
      where: { id: { in: tourIds } },
      select: {
        id: true, name: true, imageUrl: true, price: true, tourCode: true,
        destination: { select: { name: true } }, availableSeats: true,
      },
    });

    const tourMap = new Map(tours.map(t => [t.id, t]));
    return topByBookings.map(item => {
      const tour = tourMap.get(item.tourId);
      return {
        tourId: item.tourId,
        name: tour?.name ?? 'Unknown',
        destination: tour?.destination?.name ?? '',
        imageUrl: tour?.imageUrl ?? '',
        tourCode: tour?.tourCode ?? '',
        totalBookings: item._count.tourId,
        totalRevenue: Math.round(Number(item._sum.totalPrice ?? 0)),
        totalPeople: item._sum.numberOfPeople ?? 0,
        availableSeats: tour?.availableSeats ?? 0,
      };
    });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể tải top tours');
    }
  }

  // ══════════════════════════════════════════════════════
  // 6. TOP CUSTOMERS — filter theo kỳ
  // ══════════════════════════════════════════════════════
  async getTopCustomers(limit = 5, dateFrom?: string, dateTo?: string) {
    try {
    const { from, to } = this.parseDateRange(dateFrom, dateTo, 365);

    const topBySpending = await this.prisma.booking.groupBy({
      by: ['userId'],
      where: { deletedAt: null, paymentStatus: 'PAID', status: { not: 'CANCELLED' }, createdAt: { gte: from, lte: to } },
      _count: { userId: true },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit,
    });

    const userIds = topBySpending.map(u => u.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true, avatarUrl: true, createdAt: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    return topBySpending.map(item => {
      const user = userMap.get(item.userId);
      return {
        userId: item.userId,
        fullName: user?.fullName ?? 'Unknown',
        email: user?.email ?? '',
        avatarUrl: user?.avatarUrl ?? null,
        totalBookings: item._count.userId,
        totalSpent: Math.round(Number(item._sum.totalPrice ?? 0)),
        memberSince: user?.createdAt ?? null,
      };
    });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể tải top khách hàng');
    }
  }

  // ══════════════════════════════════════════════════════
  // 7. VOUCHER STATS — không filter theo kỳ (tổng quan)
  // ══════════════════════════════════════════════════════
  async getVoucherStats() {
    try {
    const [totalVouchers, activeVouchers, totalDiscountResult, bookingsWithVoucher, mostUsedVouchers] =
      await Promise.all([
        this.prisma.voucher.count(),
        this.prisma.voucher.count({ where: { isActive: true } }),
        this.prisma.booking.aggregate({
          where: { deletedAt: null, paymentStatus: 'PAID', status: { not: 'CANCELLED' }, discountAmount: { gt: 0 } },
          _sum: { discountAmount: true },
          _count: { id: true },
        }),
        this.prisma.booking.count({ where: { deletedAt: null, voucherCode: { not: null } } }),
        this.prisma.voucher.findMany({
          where: { usedCount: { gt: 0 } },
          orderBy: { usedCount: 'desc' },
          take: 5,
          select: {
            id: true, code: true, discountValue: true, discountType: true,
            usedCount: true, maxUses: true, isActive: true,
          },
        }),
      ]);

    const totalBookings = await this.prisma.booking.count({ where: { deletedAt: null } });
    const voucherUsageRate =
      totalBookings > 0
        ? Math.round((bookingsWithVoucher / totalBookings) * 1000) / 10
        : 0;

    return {
      overview: {
        totalVouchers,
        activeVouchers,
        totalDiscountGiven: Math.round(Number(totalDiscountResult._sum.discountAmount ?? 0)),
        bookingsWithVoucher,
        voucherUsageRate,
      },
      topVouchers: mostUsedVouchers.map(v => ({
        ...v,
        usageRate: v.maxUses > 0 ? Math.round((v.usedCount / v.maxUses) * 100) : 0,
      })),
    };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể tải thống kê voucher');
    }
  }
}

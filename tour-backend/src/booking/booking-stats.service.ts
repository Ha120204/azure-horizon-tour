import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingStatsService {
  // --- In-memory TTL cache --------------------------------------------------
  // Không dùng Redis: số liệu dashboard chấp nhận trễ 30s,
  // và project chưa tích hợp @nestjs/cache-manager.
  private readonly _statsCache = new Map<
    string,
    { data: unknown; expiresAt: number }
  >();

  constructor(private readonly prisma: PrismaService) {}

  private cacheGet<T>(key: string): T | null {
    const entry = this._statsCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._statsCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private cacheSet(key: string, data: unknown, ttlMs: number): void {
    this._statsCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  /** Xóa cache thủ công khi có mutation quan trọng nếu cần */
  invalidateDashboardCache(): void {
    this._statsCache.delete('quickStats');
    this._statsCache.delete('operationalStats');
  }

  async getAdminQuickStats() {
    const CACHE_TTL_MS = 30_000;
    const cached =
      this.cacheGet<Awaited<ReturnType<typeof this._computeQuickStats>>>(
        'quickStats',
      );
    if (cached) return cached;
    const result = await this._computeQuickStats();
    this.cacheSet('quickStats', result, CACHE_TTL_MS);
    return result;
  }

  private async _computeQuickStats() {
    // Ngưỡng cảnh báo "quá hạn" cho widget admin (SLA xử lý nội bộ):
    // booking PENDING chưa xử lý quá 24h, và yêu cầu hủy CANCEL_REQUESTED chưa duyệt quá 4h.
    const pendingOverdueSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cancelRequestedOverdueSince = new Date(
      Date.now() - 4 * 60 * 60 * 1000,
    );
    const [
      grouped,
      paymentGrouped,
      myToursCount,
      assistedDraftGrouped,
      pendingOverdue,
      cancelRequestedOverdue,
    ] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
      this.prisma.booking.groupBy({
        by: ['paymentStatus'],
        where: { deletedAt: null },
        _count: { paymentStatus: true },
      }),
      this.prisma.tour.count({
        where: { deletedAt: null, status: 'PUBLISHED' },
      }),
      this.prisma.assistedBookingDraft.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: 'PENDING',
          createdAt: { lt: pendingOverdueSince },
        },
      }),
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: 'CANCEL_REQUESTED',
          cancelRequestedAt: { lt: cancelRequestedOverdueSince },
        },
      }),
    ]);
    const map: Record<string, number> = {};
    for (const row of grouped) map[row.status] = row._count.status;
    const paymentMap: Record<string, number> = {};
    for (const row of paymentGrouped)
      paymentMap[row.paymentStatus] = row._count.paymentStatus;
    const assistedDraftMap: Record<string, number> = {};
    for (const row of assistedDraftGrouped)
      assistedDraftMap[row.status] = row._count.status;
    return {
      pending: map['PENDING'] || 0,
      confirmed: map['CONFIRMED'] || 0,
      cancelRequested: map['CANCEL_REQUESTED'] || 0,
      cancelled: map['CANCELLED'] || 0,
      total: Object.values(map).reduce((a, b) => a + b, 0),
      pendingOverdue,
      cancelRequestedOverdue,
      publishedTours: myToursCount,
      unpaidCount: paymentMap['UNPAID'] || 0,
      processingCount: paymentMap['PROCESSING'] || 0,
      failedPaymentCount: paymentMap['FAILED'] || 0,
      assistedDraftPending: assistedDraftMap['PENDING_APPROVAL'] || 0,
      assistedDraftNeedsRevision: assistedDraftMap['NEEDS_REVISION'] || 0,
    };
  }

  /**
   * Operational Stats — gộm 5 module stats vào 1 call duy nhất.
   *
   * Trước đây frontend phải gọi 4 endpoint riêng (độc lập):
   *   GET /booking/admin/stats          → booking.pending, cancelRequested
   *   GET /tour/admin/stats             → tour.pending
   *   GET /article/admin/stats          → article.pending
   *   GET /support/stats               → support.open
   * Giờ chỉ cần 1 call: GET /booking/admin/operational-stats, cache 30s.
   *
   * Query Prisma trực tiếp để giữ BookingModule độc lập với
   * Tour/Article/SupportModule — không tạo circular dependency.
   */
  async getOperationalStats() {
    const CACHE_TTL_MS = 30_000;
    const cached =
      this.cacheGet<Awaited<ReturnType<typeof this._computeOperationalStats>>>(
        'operationalStats',
      );
    if (cached) return cached;
    const result = await this._computeOperationalStats();
    this.cacheSet('operationalStats', result, CACHE_TTL_MS);
    return result;
  }

  private async _computeOperationalStats() {
    // 5 queries chạy song song — không có dependency giữa chúng
    const [
      bookingPending,
      cancelRequested,
      tourPending,
      articlePending,
      supportOpen,
    ] = await Promise.all([
      this.prisma.booking.count({
        where: { deletedAt: null, status: 'PENDING' },
      }),
      this.prisma.booking.count({
        where: { deletedAt: null, status: 'CANCEL_REQUESTED' },
      }),
      this.prisma.tour.count({
        where: { deletedAt: null, status: 'PENDING_REVIEW' },
      }),
      this.prisma.article.count({
        where: { deletedAt: null, status: 'PENDING_REVIEW' },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['NEW', 'IN_PROGRESS'] } },
      }),
    ]);
    return {
      bookingPending,
      cancelRequested,
      tourPending,
      articlePending,
      supportOpen,
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleStatus, BookingStatus, PaymentStatus, Role, TourStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const HIGH_RISK_ACTIONS = ['DELETE', 'ROLE_CHANGE', 'CANCEL_BOOKING', 'EXPORT', 'REVOKE_SESSION'];
const RISK_STATUSES = ['OPEN', 'REVIEWED', 'RESOLVED'] as const;
type HealthTone = 'emerald' | 'amber' | 'red';
type RawOperationalRisk = {
  key: string;
  severity: string;
  title: string;
  detail: string;
  owner: string;
  due: string;
  icon: string;
  tone: string;
  href: string;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const calculateRiskIndex = (input: {
  failedPayments: number;
  overduePending: number;
  sensitiveActionsToday: number;
  pendingContent: number;
  supportOverdue: number;
}) => Math.min(
  100,
  input.failedPayments * 4
    + input.overduePending * 5
    + input.sensitiveActionsToday * 12
    + input.pendingContent * 2
    + input.supportOverdue * 6,
);

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private hasAllConfig(keys: string[]) {
    return keys.every(key => Boolean(this.configService.get<string>(key) || process.env[key]));
  }

  private async getDatabaseLatencyMs() {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return Date.now() - startedAt;
    } catch {
      return null;
    }
  }

  private buildSystemHealth(input: {
    failedPayments: number;
    auditTotalToday: number;
    databaseLatencyMs: number | null;
  }) {
    const payosReady = this.hasAllConfig(['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY']);
    const mailReady = this.hasAllConfig(['MAIL_USER', 'MAIL_PASS']);
    const databaseTone: HealthTone = input.databaseLatencyMs === null
      ? 'red'
      : input.databaseLatencyMs > 500
        ? 'amber'
        : 'emerald';

    return [
      {
        label: 'API Gateway',
        status: 'Online',
        meta: `${Math.floor(process.uptime() / 60).toLocaleString('vi-VN')} phút uptime`,
        tone: 'emerald' as HealthTone,
      },
      {
        label: 'PayOS / Webhook',
        status: !payosReady ? 'Thiếu cấu hình' : input.failedPayments > 0 ? 'Cần chú ý' : 'Sẵn sàng',
        meta: !payosReady
          ? 'thiếu credential PayOS'
          : input.failedPayments > 0
            ? `${input.failedPayments} thanh toán lỗi`
            : 'credential đủ, không có lỗi hiện tại',
        tone: !payosReady ? 'red' as HealthTone : input.failedPayments > 0 ? 'amber' as HealthTone : 'emerald' as HealthTone,
      },
      {
        label: 'Email Service',
        status: mailReady ? 'Sẵn sàng' : 'Thiếu cấu hình',
        meta: mailReady ? 'SMTP credential đủ' : 'thiếu MAIL_USER hoặc MAIL_PASS',
        tone: mailReady ? 'emerald' as HealthTone : 'red' as HealthTone,
      },
      {
        label: 'Database',
        status: input.databaseLatencyMs === null ? 'Không phản hồi' : input.databaseLatencyMs > 500 ? 'Chậm' : 'Ổn định',
        meta: input.databaseLatencyMs === null ? 'health query lỗi' : `latency ${input.databaseLatencyMs}ms`,
        tone: databaseTone,
      },
      {
        label: 'Audit Logger',
        status: input.auditTotalToday > 0 ? 'Live' : 'Chưa có log hôm nay',
        meta: `${input.auditTotalToday} log hôm nay`,
        tone: input.auditTotalToday > 0 ? 'emerald' as HealthTone : 'amber' as HealthTone,
      },
    ];
  }

  private buildPermissionMatrix() {
    return [
      { capability: 'Toàn quyền Super Overview', description: 'Xem risk index, high-risk audit, health và workflow rủi ro.', superAdmin: true, admin: false, staff: false },
      { capability: 'Chỉnh cài đặt hệ thống', description: 'Thay đổi cấu hình vận hành trong trang Settings.', superAdmin: true, admin: false, staff: false },
      { capability: 'Xuất audit log', description: 'Tải CSV nhật ký hệ thống phục vụ đối soát.', superAdmin: true, admin: false, staff: false },
      { capability: 'Quản trị Admin', description: 'Tạo Admin, đổi role Admin/Staff và khóa tài khoản Admin.', superAdmin: true, admin: false, staff: false },
      { capability: 'Thu hồi phiên đăng nhập', description: 'Buộc Admin/Staff đăng xuất khỏi toàn bộ thiết bị khi có rủi ro tài khoản.', superAdmin: true, admin: false, staff: false },
      { capability: 'Quản trị Staff', description: 'Tạo, chỉnh sửa và khóa tài khoản nhân viên.', superAdmin: true, admin: true, staff: false },
      { capability: 'Duyệt nội dung/tour', description: 'Phê duyệt, từ chối hoặc xuất bản nội dung vận hành.', superAdmin: true, admin: true, staff: false },
      { capability: 'Xử lý booking', description: 'Theo dõi đơn, cập nhật trạng thái và hỗ trợ khách hàng.', superAdmin: true, admin: true, staff: true },
    ];
  }

  async getOverview() {
    const today = startOfToday();
    const monthStart = startOfMonth();
    const pendingOverdueSince = new Date(Date.now() - 30 * 60 * 1000);
    const supportOverdueSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      monthlyRevenue,
      paymentRows,
      overduePendingBookings,
      staffActive,
      staffTotal,
      roleChangesToday,
      auditTotalToday,
      sensitiveActionsToday,
      highRiskLogs,
      pendingTours,
      pendingArticles,
      supportOpen,
      supportOverdue,
      assistedDraftPending,
      databaseLatencyMs,
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          deletedAt: null,
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: monthStart },
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.booking.groupBy({
        by: ['paymentStatus'],
        where: { deletedAt: null },
        _count: { paymentStatus: true },
      }),
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: BookingStatus.PENDING,
          createdAt: { lt: pendingOverdueSince },
        },
      }),
      this.prisma.user.count({
        where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] }, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] } },
      }),
      this.prisma.systemLog.count({
        where: { action: 'ROLE_CHANGE', createdAt: { gte: today } },
      }),
      this.prisma.systemLog.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.systemLog.count({
        where: { action: { in: HIGH_RISK_ACTIONS }, createdAt: { gte: today } },
      }),
      this.prisma.systemLog.findMany({
        where: {
          OR: [
            { action: { in: HIGH_RISK_ACTIONS } },
            { resource: { in: ['User', 'Booking', 'Voucher'] } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
      this.prisma.tour.count({
        where: { status: TourStatus.PENDING_REVIEW, deletedAt: null },
      }),
      this.prisma.article.count({
        where: { status: ArticleStatus.PENDING_REVIEW },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['NEW', 'IN_PROGRESS'] } },
      }),
      this.prisma.supportTicket.count({
        where: {
          status: { in: ['NEW', 'IN_PROGRESS'] },
          createdAt: { lt: supportOverdueSince },
        },
      }),
      this.prisma.assistedBookingDraft.count({
        where: { status: 'PENDING_APPROVAL' },
      }),
      this.getDatabaseLatencyMs(),
    ]);

    const paymentStatus = Object.fromEntries(
      paymentRows.map(row => [row.paymentStatus, row._count.paymentStatus]),
    ) as Partial<Record<PaymentStatus, number>>;

    const failedPayments = paymentStatus.FAILED ?? 0;
    const unpaidPayments = paymentStatus.UNPAID ?? 0;
    const pendingContent = pendingTours + pendingArticles;
    const riskIndex = calculateRiskIndex({
      failedPayments,
      overduePending: overduePendingBookings,
      sensitiveActionsToday,
      pendingContent,
      supportOverdue,
    });

    const rawOperationalRisks = [
      failedPayments > 0 && {
        key: 'failed-payments',
        severity: failedPayments >= 5 ? 'Critical' : 'High',
        title: `${failedPayments} thanh toán thất bại cần đối soát`,
        detail: 'Kiểm tra PayOS/webhook và liên hệ khách nếu booking còn khả năng phục hồi.',
        owner: 'Finance Admin',
        due: 'Hôm nay',
        icon: 'credit_card_off',
        tone: 'red',
        href: '/admin/bookings',
      },
      overduePendingBookings > 0 && {
        key: 'overdue-pending',
        severity: overduePendingBookings >= 5 ? 'Critical' : 'High',
        title: `${overduePendingBookings} booking chờ xác nhận quá SLA`,
        detail: 'Các booking pending quá 30 phút có thể làm khách mất niềm tin hoặc giữ ghế không cần thiết.',
        owner: 'Booking Lead',
        due: 'Trong ca hiện tại',
        icon: 'timer',
        tone: 'amber',
        href: '/admin/bookings',
      },
      sensitiveActionsToday > 0 && {
        key: 'sensitive-actions',
        severity: sensitiveActionsToday >= 3 ? 'Critical' : 'High',
        title: `${sensitiveActionsToday} thao tác nhạy cảm hôm nay`,
        detail: 'Rà soát thay đổi quyền, xóa dữ liệu, hủy booking hoặc xuất dữ liệu.',
        owner: 'Super Admin',
        due: 'Ngay hôm nay',
        icon: 'shield',
        tone: 'red',
        href: '/admin/logs',
      },
      supportOverdue > 0 && {
        key: 'support-overdue',
        severity: 'High',
        title: `${supportOverdue} ticket hỗ trợ quá hạn`,
        detail: 'Ticket mở quá 24 giờ cần được phân công hoặc leo thang.',
        owner: 'Support Lead',
        due: 'Hôm nay',
        icon: 'support_agent',
        tone: 'amber',
        href: '/admin/support',
      },
    ].filter(Boolean) as RawOperationalRisk[];

    const riskKeys = rawOperationalRisks.map(risk => risk.key);
    const riskReviews = riskKeys.length > 0
      ? await this.prisma.superRiskReview.findMany({
          where: { riskKey: { in: riskKeys } },
          include: {
            reviewedBy: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
        })
      : [];
    const reviewMap = new Map(riskReviews.map(review => [review.riskKey, review]));
    const operationalRisks = rawOperationalRisks.map(risk => {
      const review = reviewMap.get(risk.key);
      return {
        ...risk,
        workflow: {
          status: review?.status ?? 'OPEN',
          note: review?.note ?? null,
          reviewedAt: review?.reviewedAt?.toISOString() ?? null,
          resolvedAt: review?.resolvedAt?.toISOString() ?? null,
          reviewer: review?.reviewedBy
            ? {
                id: review.reviewedBy.id,
                name: review.reviewedBy.fullName || review.reviewedBy.email,
                role: review.reviewedBy.role,
              }
            : null,
        },
      };
    });
    const activeRiskCount = operationalRisks.filter(risk => risk.workflow.status !== 'RESOLVED').length;

    return {
      generatedAt: new Date().toISOString(),
      riskIndex,
      status: riskIndex >= 80 ? 'critical' : riskIndex >= 50 ? 'warning' : 'stable',
      kpis: {
        monthlyRevenue: Number(monthlyRevenue._sum.totalPrice || 0),
        activeAdmins: staffActive,
        totalAdminAccounts: staffTotal,
        interventionRequired: activeRiskCount,
        failedPaymentRate: unpaidPayments + failedPayments > 0
          ? Number(((failedPayments / (unpaidPayments + failedPayments)) * 100).toFixed(1))
          : 0,
        auditEventsToday: auditTotalToday,
        highRiskEventsToday: sensitiveActionsToday,
        supportEscalations: supportOpen,
        roleChangesToday,
      },
      alerts: {
        failedPayments,
        overduePendingBookings,
        sensitiveActionsToday,
        pendingContent,
        pendingTours,
        pendingArticles,
        assistedDraftPending,
        supportOverdue,
      },
      systemHealth: this.buildSystemHealth({ failedPayments, auditTotalToday, databaseLatencyMs }),
      permissionMatrix: this.buildPermissionMatrix(),
      operationalRisks,
      riskWorkflow: {
        open: operationalRisks.filter(risk => risk.workflow.status === 'OPEN').length,
        reviewed: operationalRisks.filter(risk => risk.workflow.status === 'REVIEWED').length,
        resolved: operationalRisks.filter(risk => risk.workflow.status === 'RESOLVED').length,
      },
      highRiskActions: highRiskLogs.map(log => ({
        id: log.id,
        actor: log.user?.fullName || 'System',
        actorRole: log.user?.role || 'SYSTEM',
        action: log.action,
        resource: log.targetName || `${log.resource}${log.resourceId ? ` #${log.resourceId}` : ''}`,
        severity: ['DELETE', 'ROLE_CHANGE', 'CANCEL_BOOKING', 'REVOKE_SESSION'].includes(log.action) ? 'Critical' : 'High',
        ip: log.ipAddress || '—',
        time: log.createdAt.toISOString(),
        href: '/admin/logs',
      })),
    };
  }

  async getViewGrants(userId?: number) {
    if (!userId) {
      throw new BadRequestException('Không xác định được người dùng');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { superAdminViewGrants: true },
    });
    return { grants: user?.superAdminViewGrants ?? [] };
  }

  async updateViewGrants(userId: number | undefined, grants: string[]) {
    if (!userId) {
      throw new BadRequestException('Không xác định được người dùng');
    }
    const normalized = Array.from(new Set(grants));
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { superAdminViewGrants: normalized },
      select: { superAdminViewGrants: true },
    });
    return { grants: user.superAdminViewGrants };
  }

  async updateRiskReview(riskKey: string, status: string, note: string | undefined, reviewerId?: number) {
    const normalizedStatus = String(status || '').toUpperCase();
    if (!RISK_STATUSES.includes(normalizedStatus as (typeof RISK_STATUSES)[number])) {
      throw new BadRequestException('Risk status must be OPEN, REVIEWED, or RESOLVED');
    }

    const now = new Date();
    const data = {
      status: normalizedStatus,
      note: note?.trim() || null,
      reviewedById: reviewerId ?? null,
      reviewedAt: normalizedStatus === 'OPEN' ? null : now,
      resolvedAt: normalizedStatus === 'RESOLVED' ? now : null,
    };

    return this.prisma.superRiskReview.upsert({
      where: { riskKey },
      create: { riskKey, ...data },
      update: data,
      include: {
        reviewedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
  }
}

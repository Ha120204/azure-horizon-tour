'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell,
} from 'recharts';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Link, useRouter } from '@/i18n/routing';
import StaffDashboard from '@/components/admin/StaffDashboard';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';

// ─── Preset Config ────────────────────────────────────────────────────────────

const PRESETS = [
    { label: '7 ngày', days: 7 },
    { label: '30 ngày', days: 30 },
    { label: '3 tháng', days: 90 },
    { label: '12 tháng', days: 365 },
] as const;

function getDateRange(days: number) {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
    };
}

function getGranularity(days: number): 'daily' | 'weekly' | 'monthly' {
    if (days <= 14) return 'daily';
    if (days <= 90) return 'weekly';
    return 'monthly';
}

const GRAN_LABEL: Record<string, string> = {
    daily: 'Theo ngày', weekly: 'Theo tuần', monthly: 'Theo tháng',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
    period: { from: string; to: string };
    revenue: { current: number; previous: number; changePercent: number };
    bookings: { total: number; previous: number; confirmed: number; cancelled: number; cancellationRate: number; changePercent: number };
    aov: { current: number; previous: number; changePercent: number };
    tours: { active: number };
    customers: { newInPeriod: number; previousNewInPeriod: number; changePercent: number };
}
interface RevenuePoint { key: string; label: string; revenue: number; bookings: number }
interface BookingStatus {
    total: number;
    distribution: { name: string; value: number; key: string }[];
}
interface RecentBooking {
    id: number; bookingCode: string; totalPrice: number; numberOfPeople: number;
    status: string; createdAt: string;
    user: { fullName: string; email: string; avatarUrl: string | null };
    tour: { name: string; tourCode: string };
}
interface OperationalStats {
    bookingPending: number;
    cancelRequested: number;
    tourPending: number;
    articlePending: number;
    supportOpen: number;
}
const EMPTY_OPERATIONAL_STATS: OperationalStats = {
    bookingPending: 0,
    cancelRequested: 0,
    tourPending: 0,
    articlePending: 0,
    supportOpen: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatVND = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
        .format(Math.round(n))
        .replace('₫', 'đ');

const formatShortVND = (n: number) => {
    return formatVND(n);
};

const formatAxisVND = (n: number) => {
    if (n >= 1_000_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n / 1_000_000_000)} tỷ`;
    if (n >= 1_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n / 1_000_000)} tr`;
    if (n >= 1_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n / 1_000)}k`;
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n);
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('vi-VN');

const getPeriodComparisonLabel = (isCustom: boolean, activeDays: number, from: string, to: string) => {
    if (!isCustom) return `So sánh với ${activeDays} ngày trước đó`;
    const diffDays = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)));
    return `So sánh với ${diffDays} ngày trước kỳ tùy chỉnh`;
};

type TrendMeta = {
    label: string;
    direction: 'up' | 'down' | 'flat' | 'new';
};

const getTrendMeta = (current: number, previous: number, changePercent: number): TrendMeta => {
    if (previous === 0 && current > 0) return { label: 'Mới phát sinh', direction: 'new' };
    if (previous === 0 && current === 0) return { label: 'Chưa có kỳ trước', direction: 'flat' };
    if (changePercent === 0) return { label: 'Không đổi', direction: 'flat' };
    return {
        label: `${changePercent > 0 ? '+' : ''}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(changePercent)}%`,
        direction: changePercent > 0 ? 'up' : 'down',
    };
};

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    CONFIRMED: { label: 'Xác nhận', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    PENDING: { label: 'Chờ xử lý', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    CANCELLED: { label: 'Đã hủy', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
};

const PIE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444'];

type ChartPayload = { value?: number };
type RevenueTooltipProps = {
    active?: boolean;
    payload?: ChartPayload[];
    label?: string;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-slate-200/80 rounded-xl animate-pulse ${className}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
    icon: string; title: string; value: string; trend: TrendMeta;
    sub?: string; gradient?: boolean; href?: string;
}

function KpiCard({ icon, title, value, trend, sub, gradient, href }: KpiCardProps) {
    const tone = trend.direction === 'down'
        ? 'bg-red-50 text-red-600 border border-red-100'
        : trend.direction === 'flat'
            ? 'bg-slate-100 text-slate-500 border border-slate-100'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    const iconName = trend.direction === 'down'
        ? 'trending_down'
        : trend.direction === 'flat'
            ? 'horizontal_rule'
            : 'trending_up';

    const content = (
        <div className={`relative h-full rounded-2xl p-6 overflow-hidden group transition-[transform,box-shadow,border-color] duration-200 ${href ? 'hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-blue-500' : ''} ${gradient
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25'
            : 'bg-white shadow-sm border border-slate-100 hover:shadow-slate-200/80 hover:border-slate-200'}`}>
            <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl ${gradient ? 'bg-white/10' : 'bg-blue-50/60'}`} />
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${gradient ? 'bg-white/20' : 'bg-blue-50'}`}>
                        <span className="material-symbols-outlined text-[22px]"
                            style={{ color: gradient ? '#fff' : '#3B82F6', fontVariationSettings: "'FILL' 1" }}>
                            {icon}
                        </span>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${gradient ? 'bg-white/20 text-white' : tone}`}>
                        <span className="material-symbols-outlined text-[11px]">{iconName}</span>
                        {trend.label}
                    </span>
                </div>
                <p className={`text-sm font-medium mb-1.5 ${gradient ? 'text-white/80' : 'text-slate-500'}`}>{title}</p>
                <h3 className={`text-3xl font-bold tracking-tight font-headline ${gradient ? 'text-white' : 'text-slate-800'}`}>{value}</h3>
                {sub && <p className={`text-xs mt-1.5 ${gradient ? 'text-white/60' : 'text-slate-400'}`}>{sub}</p>}
                {href && <span className={`mt-4 inline-flex items-center gap-1 text-xs font-bold ${gradient ? 'text-white/80' : 'text-blue-600'}`}>Xem chi tiết <span className="material-symbols-outlined text-[13px]">arrow_forward</span></span>}
            </div>
        </div>
    );

    if (!href) return content;

    return (
        <Link href={href} className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {content}
        </Link>
    );
}

// ─── Revenue Tooltip ──────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
                <p className="text-slate-500 font-medium mb-1">{label}</p>
                <p className="text-blue-600 font-bold">{formatVND(payload[0]?.value ?? 0)}</p>
                {payload[1] && <p className="text-slate-400 text-xs mt-0.5">{payload[1].value} booking</p>}
            </div>
        );
    }
    return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
    const router = useRouter();

    // ── Role detection ──
    const [userRole, setUserRole] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [roleLoaded, setRoleLoaded] = useState(false);

    useEffect(() => {
        fetchWithAuth(`${API_BASE_URL}/auth/profile`)
            .then(r => r.json())
            .then(data => {
                const profile = data.data ?? data;
                setUserRole(profile.role ?? '');
                setUserName(profile.fullName ?? 'Nhân viên');
            })
            .catch(() => {})
            .finally(() => setRoleLoaded(true));
    }, []);

    // ── Admin state ──
    const today = new Date().toISOString().split('T')[0];
    const [activeDays, setActiveDays] = useState<number>(30);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [isCustom, setIsCustom] = useState(false);
    const [dateRange, setDateRange] = useState(() => getDateRange(30));

    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
    const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
    const [operationalStats, setOperationalStats] = useState<OperationalStats>(EMPTY_OPERATIONAL_STATS);
    const [loading, setLoading] = useState(true);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [dashboardError, setDashboardError] = useState('');

    const fetchAll = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) setLoading(true);
        if (!options.silent) setDashboardError('');
        const { from, to } = dateRange;
        const diffDays = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
        const gran = getGranularity(diffDays);
        try {
            const [ovRes, revRes, bsRes, rbRes, opStatsRes] = await Promise.all([
                fetchWithAuth(
`${API_BASE_URL}/statistics/overview?dateFrom=${from}&dateTo=${to}`
),
                fetchWithAuth(
`${API_BASE_URL}/statistics/revenue?dateFrom=${from}&dateTo=${to}&granularity=${gran}`
),
                fetchWithAuth(
`${API_BASE_URL}/statistics/bookings/status?dateFrom=${from}&dateTo=${to}`
),
                fetchWithAuth(
`${API_BASE_URL}/booking/admin/all?limit=5&status=ALL`
),
                // 1 call thay cho 4 (booking/stats + tour/stats + article/stats + support/stats)
                // Cache 30s phia server -> khong bao gio hit DB moi autorefresh 60s
                fetchWithAuth(
`${API_BASE_URL}/booking/admin/operational-stats`
),
            ]);
            if (ovRes.ok) { const j = await ovRes.json(); setOverview(j.data); }
            if (revRes.ok) { const j = await revRes.json(); setRevenueData(j.data?.data ?? []); }
            if (bsRes.ok) { const j = await bsRes.json(); setBookingStatus(j.data); }
            if (rbRes.ok) {
                const j = await rbRes.json();
                const payload = j.data ?? j;
                setRecentBookings(payload.bookings ?? []);
            }
            if (opStatsRes.ok) {
                const j = await opStatsRes.json();
                const op = j.data ?? j;
                setOperationalStats({
                    bookingPending:  op.bookingPending  ?? 0,
                    cancelRequested: op.cancelRequested ?? 0,
                    tourPending:     op.tourPending     ?? 0,
                    articlePending:  op.articlePending  ?? 0,
                    supportOpen:     op.supportOpen     ?? 0,
                });
            }
            setLastUpdatedAt(new Date());
        } catch (e) {
            if (options.silent) return;
            console.error('Dashboard error:', e);
            setDashboardError('Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c d\u1eef li\u1ec7u t\u1ed5ng quan. Vui l\u00f2ng th\u1eed l\u00e0m m\u1edbi l\u1ea1i.');
        } finally {
            if (options.silent) return;
            setLoading(false);
        }
    }, [dateRange]);

    const handlePreset = (days: number) => {
        setActiveDays(days);
        setIsCustom(false);
        setDateRange(getDateRange(days));
    };

    const handleCustomApply = () => {
        if (!customFrom || !customTo || customFrom > customTo) return;
        setIsCustom(true);
        setActiveDays(0);
        setDateRange({ from: customFrom, to: customTo });
    };

    useEffect(() => { if (userRole && userRole !== 'STAFF') fetchAll(); }, [fetchAll, userRole]);

    useAdminAutoRefresh({
        enabled: Boolean(userRole && userRole !== 'STAFF'),
        intervalMs: 60 * 1000,
        onRefresh: () => fetchAll({ silent: true }),
    });

    // ── Render Staff view early ──
    if (!roleLoaded) {
        return (
            <main className="flex-1 pt-8 px-8 min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
                    </div>
                    <p className="text-slate-400 text-sm">Đang tải dashboard...</p>
                </div>
            </main>
        );
    }

    if (userRole === 'STAFF') {
        return <StaffDashboard staffName={userName} />;
    }

    const { from, to } = dateRange;
    const diffDays = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
    const gran = getGranularity(diffDays);
    const periodComparisonLabel = getPeriodComparisonLabel(isCustom, activeDays || diffDays, from, to);
    const periodTitle = isCustom ? `${formatDate(from)} - ${formatDate(to)}` : `${activeDays} ngày gần nhất`;
    const nonZeroRevenuePoints = revenueData.filter(point => point.revenue > 0).length;
    const hasRevenueData = revenueData.some(point => point.revenue > 0);

    return (
        <main className="flex-1 pt-8 px-8 pb-16 max-w-[1600px] mx-auto w-full bg-slate-50 min-h-screen">

            {/* ── Header ── */}
            <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
                <div>
                    <h1 className="font-headline text-[2rem] font-bold text-slate-800 leading-tight tracking-tight">
                        Tổng quan hệ thống
                    </h1>
                    <p className="text-slate-500 text-sm mt-1.5">
                        Theo dõi doanh thu đã thanh toán, booking và các việc cần xử lý trong kỳ.
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-400">
                        {lastUpdatedAt
                            ? `Cập nhật lần cuối: ${lastUpdatedAt.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}`
                            : 'Dữ liệu đang được đồng bộ'}
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Link
                        href="/admin/statistics"
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <span className="material-symbols-outlined text-[17px]">bar_chart</span>
                        Thống kê chi tiết
                    </Link>
                    <button
                        onClick={() => fetchAll()}
                        disabled={loading}
                        aria-label="Làm mới dữ liệu tổng quan"
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-white text-slate-500 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-[17px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* ── Preset Filter Bar ── */}
            {dashboardError && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {dashboardError}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Xem dữ liệu</span>
                <div className="flex rounded-2xl bg-slate-100 p-1">
                    {PRESETS.map(p => (
                        <button
                            key={p.days}
                            onClick={() => handlePreset(p.days)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!isCustom && activeDays === p.days
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-white hover:text-slate-700'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                {/* ── Custom date range picker ── */}
                <div className="flex items-center gap-2 pl-0 lg:pl-3 lg:border-l lg:border-slate-200">
                    <span className="text-xs text-slate-400 font-medium hidden lg:block">Tùy chỉnh:</span>
                    <input
                        type="date"
                        value={customFrom}
                        max={customTo || today}
                        onChange={e => setCustomFrom(e.target.value)}
                        className={`text-xs border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer ${
                            isCustom ? 'border-blue-400 text-blue-600 bg-blue-50/30' : 'border-slate-200 text-slate-600'
                        }`}
                    />
                    <span className="text-slate-300 font-bold">→</span>
                    <input
                        type="date"
                        value={customTo}
                        min={customFrom}
                        max={today}
                        onChange={e => setCustomTo(e.target.value)}
                        className={`text-xs border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer ${
                            isCustom ? 'border-blue-400 text-blue-600 bg-blue-50/30' : 'border-slate-200 text-slate-600'
                        }`}
                    />
                    <button
                        onClick={handleCustomApply}
                        disabled={!customFrom || !customTo}
                        className="px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        Áp dụng
                    </button>
                </div>

                <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">date_range</span>
                        {formatDate(from)} - {formatDate(to)}
                    </span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium">
                        {GRAN_LABEL[gran]}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>{periodComparisonLabel}</span>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)
                ) : overview ? (
                    <>
                        <KpiCard
                            icon="payments" title="Doanh thu"
                            value={formatShortVND(overview.revenue.current)}
                            trend={getTrendMeta(overview.revenue.current, overview.revenue.previous, overview.revenue.changePercent)}
                            sub={`Kỳ trước: ${formatShortVND(overview.revenue.previous)}`}
                            gradient
                            href="/admin/statistics"
                        />
                        <KpiCard
                            icon="book_online" title="Tổng booking"
                            value={overview.bookings.total.toLocaleString('vi-VN')}
                            trend={getTrendMeta(overview.bookings.total, overview.bookings.previous, overview.bookings.changePercent)}
                            sub={`Tỷ lệ hủy: ${overview.bookings.cancellationRate}% • Kỳ trước: ${overview.bookings.previous.toLocaleString('vi-VN')}`}
                            href="/admin/bookings"
                        />
                        <KpiCard
                            icon="analytics" title="Giá trị TB/đơn (AOV)"
                            value={formatShortVND(overview.aov.current)}
                            trend={getTrendMeta(overview.aov.current, overview.aov.previous, overview.aov.changePercent)}
                            sub={`Kỳ trước: ${formatShortVND(overview.aov.previous)}`}
                            href="/admin/statistics"
                        />
                        <KpiCard
                            icon="group_add" title="Khách hàng mới"
                            value={overview.customers.newInPeriod.toLocaleString('vi-VN')}
                            trend={getTrendMeta(overview.customers.newInPeriod, overview.customers.previousNewInPeriod, overview.customers.changePercent)}
                            sub={`${overview.tours.active} tours đang hoạt động`}
                            href="/admin/customers"
                        />
                    </>
                ) : null}
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[
                    { href: '/admin/bookings?status=PENDING', icon: 'pending_actions', label: 'Booking chờ xử lý', value: operationalStats.bookingPending, tone: 'bg-amber-50 text-amber-700' },
                    { href: '/admin/bookings?status=CANCEL_REQUESTED', icon: 'assignment_late', label: 'Yêu cầu hủy', value: operationalStats.cancelRequested, tone: 'bg-orange-50 text-orange-700' },
                    { href: '/admin/tours?status=PENDING', icon: 'approval', label: 'Tour chờ duyệt', value: operationalStats.tourPending, tone: 'bg-blue-50 text-blue-700' },
                    { href: '/admin/articles?status=PENDING_REVIEW', icon: 'article', label: 'Bài chờ duyệt', value: operationalStats.articlePending, tone: 'bg-violet-50 text-violet-700' },
                    { href: '/admin/support?view=open', icon: 'support_agent', label: 'Ticket đang mở', value: operationalStats.supportOpen, tone: 'bg-teal-50 text-teal-700' },
                ].map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-black leading-tight text-slate-900">{item.value.toLocaleString('vi-VN')}</p>
                                <p className="truncate text-xs font-semibold text-slate-500">{item.label}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">

                {/* Revenue Chart */}
                <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-5">
                        <div>
                            <h3 className="font-headline text-base font-bold text-slate-800">
                                Doanh thu - {periodTitle}
                            </h3>
                            <p className="text-slate-400 text-xs mt-0.5">
                                Hiển thị {GRAN_LABEL[gran].toLowerCase()} · {revenueData.length} điểm dữ liệu
                                {hasRevenueData && nonZeroRevenuePoints <= 1 ? ' · Dữ liệu còn ít trong kỳ này' : ''}
                            </p>
                        </div>
                        <Link href="/admin/statistics" className="text-blue-500 text-xs font-semibold hover:text-blue-600 flex items-center gap-1">
                            Chi tiết <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </Link>
                    </div>
                    {loading ? (
                        <Skeleton className="h-56 w-full" />
                    ) : !hasRevenueData ? (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-300">
                            <span className="material-symbols-outlined text-5xl mb-2">bar_chart</span>
                            <p className="text-sm font-semibold text-slate-400">Chưa có doanh thu đã thanh toán trong kỳ này</p>
                            <p className="mt-1 text-xs text-slate-300">Thử đổi khoảng thời gian hoặc kiểm tra các đơn chưa thanh toán.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={224}>
                            <BarChart data={revenueData} barSize={Math.max(10, Math.min(38, 240 / Math.max(1, revenueData.length)))} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis tickFormatter={formatAxisVND} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={66} />
                                <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(59,130,246,0.04)' }} />
                                <Bar dataKey="revenue" fill="url(#grad)" radius={[5, 5, 0, 0]} />
                                <defs>
                                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0.5} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Booking Status Donut */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <div className="mb-4">
                        <h3 className="font-headline text-base font-bold text-slate-800">Trạng thái booking</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Phân bổ trong kỳ đã chọn</p>
                    </div>
                    {loading ? (
                        <Skeleton className="h-52 w-full" />
                    ) : bookingStatus && bookingStatus.total > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={bookingStatus.distribution} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3} stroke="none">
                                        {bookingStatus.distribution.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2.5 mt-2">
                                {bookingStatus.distribution.map((item, i) => {
                                    const pct = bookingStatus.total > 0 ? ((item.value / bookingStatus.total) * 100).toFixed(1) : '0';
                                    return (
                                        <div key={item.key} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                                                <span className="text-slate-600 font-medium">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400 text-xs">{item.value}</span>
                                                <span className="font-bold text-slate-700 w-10 text-right">{pct}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="pt-2 border-t border-slate-100 flex justify-between">
                                    <span className="text-slate-400 text-xs">Tổng</span>
                                    <span className="text-slate-800 font-bold text-sm">{bookingStatus.total}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-52 flex-col items-center justify-center text-center text-slate-300">
                            <span className="material-symbols-outlined mb-2 text-5xl">donut_large</span>
                            <p className="text-sm font-semibold text-slate-400">Chưa có booking trong kỳ này</p>
                            <p className="mt-1 text-xs">Biểu đồ sẽ xuất hiện khi có đơn phù hợp bộ lọc.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Recent Bookings ── */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-headline text-base font-bold text-slate-800">Booking gần đây</h3>
                        <p className="text-slate-400 text-xs mt-0.5">5 giao dịch mới nhất trong hệ thống</p>
                    </div>
                    <Link href="/admin/bookings" className="text-blue-600 text-sm font-semibold hover:text-blue-500 flex items-center gap-1">
                        Xem tất cả <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-3.5 font-semibold">Mã booking</th>
                                <th className="px-6 py-3.5 font-semibold">Khách hàng</th>
                                <th className="px-6 py-3.5 font-semibold">Tên Tour</th>
                                <th className="px-6 py-3.5 font-semibold text-right">Tổng tiền</th>
                                <th className="px-6 py-3.5 font-semibold">Trạng thái</th>
                                <th className="px-6 py-3.5 font-semibold">Ngày đặt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {[28, 32, 40, 20, 20, 24].map((w, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className={`h-4 bg-slate-100 rounded w-${w}`} style={{ width: `${w * 4}px` }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : recentBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-300">
                                        <span className="material-symbols-outlined text-4xl block mb-2">inbox</span>
                                        Chưa có booking nào
                                    </td>
                                </tr>
                            ) : (
                                recentBookings.map(b => {
                                    const sc = statusConfig[b.status] ?? { label: b.status, bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
                                    const initials = b.user?.fullName ? b.user.fullName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() : '??';
                                    return (
                                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer group" onClick={() => router.push(`/admin/bookings?search=${encodeURIComponent(b.bookingCode)}`)}>
                                            <td className="px-6 py-4 font-mono text-blue-600 font-semibold text-xs">{b.bookingCode}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-700 text-sm">{b.user?.fullName ?? '—'}</p>
                                                        <p className="text-slate-400 text-xs">{b.user?.email ?? ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 max-w-[180px] truncate">{b.tour?.name ?? '—'}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-800">{formatVND(b.totalPrice)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">
                                                {new Date(b.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}

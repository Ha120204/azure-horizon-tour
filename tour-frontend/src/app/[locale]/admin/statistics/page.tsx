'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Link } from '@/i18n/routing';

// ─── Preset & Granularity Config ─────────────────────────────────────────────

const PRESETS = [
    { label: '7 ngày', days: 7 },
    { label: '30 ngày', days: 30 },
    { label: '3 tháng', days: 90 },
    { label: '6 tháng', days: 180 },
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

const GRAN_MAP: Record<string, string> = { daily: 'Theo ngày', weekly: 'Theo tuần', monthly: 'Theo tháng' };

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenuePoint { key: string; label: string; revenue: number; bookings: number }
interface DestRevenue { name: string; revenue: number; bookings: number }
interface BookingStatusDist { name: string; value: number; key: string }
interface BookingStatusData {
    total: number;
    distribution: BookingStatusDist[];
    paymentStatus: { name: string; value: number }[];
    recentTrend: { date: string; count: number }[];
}
interface TopTour {
    tourId: number; name: string; destination: string;
    totalBookings: number; totalRevenue: number;
}
interface TopCustomer {
    userId: number; fullName: string; email: string;
    totalBookings: number; totalSpent: number;
}
interface VoucherOverview {
    totalVouchers: number; activeVouchers: number;
    totalDiscountGiven: number; bookingsWithVoucher: number; voucherUsageRate: number;
}
interface TopVoucher {
    id: number; code: string; discountValue: number; discountType: string;
    usedCount: number; maxUses: number; usageRate: number; isActive: boolean;
}

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

const getPeriodLabel = (isCustom: boolean, activeDays: number, from: string, to: string) => {
    if (!isCustom) return `${activeDays} ngày gần nhất`;
    return `${formatDate(from)} - ${formatDate(to)}`;
};

const PIE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444'];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-slate-100 rounded-xl animate-pulse ${className}`} />;
}

function SectionCard({ title, subtitle, icon, accent = 'blue', children }: {
    title: string; subtitle?: string; icon: string; accent?: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
    children: React.ReactNode;
}) {
    const accents = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
        rose: 'bg-rose-50 text-rose-600',
    };
    return (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${accents[accent]}`}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <div>
                    <h2 className="font-headline text-base font-bold text-slate-800">{title}</h2>
                    {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function StatBadge({ label, value, color = 'blue' }: { label: string; value: string | number; color?: string }) {
    const c: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        rose: 'bg-rose-50 text-rose-700 border-rose-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
    };
    return (
        <div className={`flex flex-col items-center p-4 rounded-xl border ${c[color] || c.blue}`}>
            <span className="text-2xl font-bold font-headline">{value}</span>
            <span className="text-xs font-medium mt-1 opacity-70 text-center leading-tight">{label}</span>
        </div>
    );
}

function InsightNote({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-medium leading-relaxed text-blue-700">
            {children}
        </div>
    );
}

function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
    return (
        <div className="flex h-full min-h-48 flex-col items-center justify-center text-center text-slate-300">
            <span className="material-symbols-outlined mb-2 text-5xl">{icon}</span>
            <p className="text-sm font-semibold text-slate-400">{title}</p>
            {hint && <p className="mt-1 max-w-sm text-xs text-slate-300">{hint}</p>}
        </div>
    );
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────

type ChartPayload = { value?: number };
type ChartTooltipProps = {
    active?: boolean;
    payload?: ChartPayload[];
    label?: string;
};

function RevenueTooltip({ active, payload, label }: ChartTooltipProps) {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
                <p className="text-slate-500 font-semibold mb-1">{label}</p>
                <p className="text-blue-600 font-bold">{formatVND(payload[0]?.value ?? 0)}</p>
                {payload[1] && <p className="text-slate-400 text-xs mt-0.5">{payload[1].value} đơn booking</p>}
            </div>
        );
    }
    return null;
}

function DestTooltip({ active, payload, label }: ChartTooltipProps) {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
                <p className="text-slate-700 font-bold mb-1">{label}</p>
                <p className="text-blue-600 font-semibold">{formatVND(payload[0]?.value ?? 0)}</p>
                {payload[1] && <p className="text-slate-400 text-xs">{payload[1].value} booking</p>}
            </div>
        );
    }
    return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
    const today = new Date().toISOString().split('T')[0];
    const [activeDays, setActiveDays] = useState<number>(30);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [isCustom, setIsCustom] = useState(false);
    const [dateRange, setDateRange] = useState(() => getDateRange(30));

    const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
    const [destRevenue, setDestRevenue] = useState<DestRevenue[]>([]);
    const [bookingStatus, setBookingStatus] = useState<BookingStatusData | null>(null);
    const [topTours, setTopTours] = useState<TopTour[]>([]);
    const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
    const [voucherOverview, setVoucherOverview] = useState<VoucherOverview | null>(null);
    const [topVouchers, setTopVouchers] = useState<TopVoucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [dashboardError, setDashboardError] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setDashboardError('');
        const { from, to } = dateRange;
        const diffDays = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
        const gran = getGranularity(diffDays);
        try {
            const [revRes, destRes, bsRes, toursRes, custRes, vouchRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/statistics/revenue?dateFrom=${from}&dateTo=${to}&granularity=${gran}`),
                fetchWithAuth(`${API_BASE_URL}/statistics/destinations/revenue?dateFrom=${from}&dateTo=${to}&limit=8`),
                fetchWithAuth(`${API_BASE_URL}/statistics/bookings/status?dateFrom=${from}&dateTo=${to}`),
                fetchWithAuth(`${API_BASE_URL}/statistics/tours/top?limit=5&dateFrom=${from}&dateTo=${to}`),
                fetchWithAuth(`${API_BASE_URL}/statistics/customers/top?limit=5&dateFrom=${from}&dateTo=${to}`),
                fetchWithAuth(`${API_BASE_URL}/statistics/vouchers/summary`),
            ]);
            if (revRes.ok) { const j = await revRes.json(); setRevenueData(j.data?.data ?? []); }
            if (destRes.ok) { const j = await destRes.json(); setDestRevenue(j.data ?? []); }
            if (bsRes.ok) { const j = await bsRes.json(); setBookingStatus(j.data); }
            if (toursRes.ok) { const j = await toursRes.json(); setTopTours(j.data ?? []); }
            if (custRes.ok) { const j = await custRes.json(); setTopCustomers(j.data ?? []); }
            if (vouchRes.ok) {
                const j = await vouchRes.json();
                setVoucherOverview(j.data?.overview ?? null);
                setTopVouchers(j.data?.topVouchers ?? []);
            }
            setLastUpdatedAt(new Date());
        } catch (e) {
            console.error('Statistics error:', e);
            setDashboardError('Không tải được dữ liệu thống kê. Vui lòng thử làm mới lại.');
        } finally {
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

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const { from, to } = dateRange;
    const diffDays = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
    const gran = getGranularity(diffDays);
    const maxRevenue = revenueData.length ? Math.max(...revenueData.map(d => d.revenue)) : 1;
    const periodLabel = getPeriodLabel(isCustom, activeDays || diffDays, from, to);
    const totalRevenue = revenueData.reduce((sum, point) => sum + point.revenue, 0);
    const totalTrendBookings = revenueData.reduce((sum, point) => sum + point.bookings, 0);
    const nonZeroRevenuePoints = revenueData.filter(point => point.revenue > 0).length;
    const hasRevenueData = totalRevenue > 0;
    const bestRevenuePoint = revenueData.find(point => point.revenue === maxRevenue);
    const totalDestinationRevenue = destRevenue.reduce((sum, point) => sum + point.revenue, 0);
    const topDestination = destRevenue[0];
    const topDestinationShare = topDestination && totalDestinationRevenue > 0
        ? (topDestination.revenue / totalDestinationRevenue) * 100
        : 0;
    const cancelledStatus = bookingStatus?.distribution.find(item => item.key === 'CANCELLED');
    const cancellationRate = bookingStatus && bookingStatus.total > 0 && cancelledStatus
        ? (cancelledStatus.value / bookingStatus.total) * 100
        : 0;
    const trendHasEnoughData = (bookingStatus?.recentTrend.filter(point => point.count > 0).length ?? 0) > 1;

    return (
        <main className="flex-1 pt-8 px-8 pb-16 max-w-[1600px] mx-auto w-full bg-slate-50 min-h-screen">

            {/* ── Header ── */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
                    </span>
                    <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Analytics</span>
                </div>
                <h1 className="font-headline text-[2rem] font-bold text-slate-800 leading-tight">Thống kê chi tiết</h1>
                <p className="text-slate-500 text-sm mt-1.5">
                    Phân tích toàn diện · dữ liệu từ {formatDate(from)} đến {formatDate(to)}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-400">
                    {lastUpdatedAt
                        ? `Cập nhật lần cuối: ${lastUpdatedAt.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}`
                        : 'Dữ liệu đang được đồng bộ'}
                </p>
            </div>

            {dashboardError && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {dashboardError}
                </div>
            )}

            {/* ── Preset Filter Bar ── */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Kỳ phân tích</span>
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
                <div className="ml-auto flex items-center gap-3">
                    <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-semibold border border-blue-100">
                        {GRAN_MAP[gran]}
                    </span>
                    <span className="hidden text-xs font-medium text-slate-400 xl:inline">{periodLabel}</span>
                    <button
                        onClick={fetchAll}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-500 border border-slate-200 rounded-xl text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        Làm mới
                    </button>
                </div>
            </div>

            {/* ── S1: Revenue Line Chart ── */}
            <div className="mb-5">
                <SectionCard
                    title="Xu hướng doanh thu"
                    subtitle={`${GRAN_MAP[gran]} · ${revenueData.length} điểm dữ liệu trong kỳ đã chọn`}
                    icon="payments"
                >
                    {loading ? <Skeleton className="h-72" /> : !hasRevenueData ? (
                        <EmptyState
                            icon="payments"
                            title="Chưa có doanh thu đã thanh toán trong kỳ này"
                            hint="Thử mở rộng kỳ phân tích hoặc kiểm tra các đơn chưa thanh toán."
                        />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={revenueData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis yAxisId="left" tickFormatter={formatAxisVND} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={66} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                                <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
                                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3.5, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Doanh thu" />
                                <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Booking" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                    {!loading && hasRevenueData && (
                        <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <div className="w-4 h-0.5 bg-blue-500 rounded" />
                                <span>Doanh thu (VNĐ)</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <div className="w-4 h-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(to right, #F59E0B 0, #F59E0B 5px, transparent 5px, transparent 8px)' }} />
                                <span>Số booking (trục phải)</span>
                            </div>
                            <div className="ml-auto text-xs text-slate-400">
                                Cao nhất:{' '}
                                <span className="text-blue-600 font-semibold">
                                    {formatVND(maxRevenue)} ({revenueData.find(d => d.revenue === maxRevenue)?.label})
                                </span>
                            </div>
                        </div>
                    )}
                    {!loading && hasRevenueData && (
                        <InsightNote>
                            Doanh thu trong kỳ là <strong>{formatVND(totalRevenue)}</strong> từ <strong>{totalTrendBookings.toLocaleString('vi-VN')}</strong> booking.
                            {nonZeroRevenuePoints <= 1 && ' Dữ liệu còn ít, nên xem đây là tín hiệu ban đầu thay vì xu hướng ổn định.'}
                            {bestRevenuePoint ? ` Ngày/nhóm cao nhất: ${bestRevenuePoint.label}.` : ''}
                        </InsightNote>
                    )}
                </SectionCard>
            </div>

            {/* ── S2: Revenue by Destination ── */}
            <div className="mb-5">
                <SectionCard
                    title="Doanh thu theo điểm đến"
                    subtitle="Top điểm đến có doanh thu cao nhất trong kỳ (chỉ tính booking đã xác nhận)"
                    icon="map"
                    accent="green"
                >
                    {loading ? <Skeleton className="h-64" /> : destRevenue.length === 0 ? (
                        <EmptyState
                            icon="map"
                            title="Chưa có dữ liệu điểm đến trong kỳ này"
                            hint="Khi có booking đã xác nhận, doanh thu theo điểm đến sẽ được tổng hợp tại đây."
                        />
                    ) : (
                        <>
                            <div className="flex gap-6 items-start">
                                <div className="flex-1 min-w-0">
                                    <ResponsiveContainer width="100%" height={Math.max(200, destRevenue.length * 44)}>
                                        <BarChart
                                            layout="vertical"
                                            data={destRevenue}
                                            margin={{ top: 0, right: 88, left: 0, bottom: 0 }}
                                            barSize={22}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                                            <XAxis type="number" tickFormatter={formatAxisVND} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis type="category" dataKey="name" tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={130} />
                                            <Tooltip content={<DestTooltip />} cursor={{ fill: 'rgba(59,130,246,0.04)' }} />
                                            <Bar dataKey="revenue" fill="url(#destGrad)" radius={[0, 6, 6, 0]}
                                                label={{ position: 'right', formatter: (v: unknown) => formatShortVND(Number(v)), fill: '#64748B', fontSize: 11 }}
                                            />
                                            <defs>
                                                <linearGradient id="destGrad" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
                                                    <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                                                </linearGradient>
                                            </defs>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-52 flex-shrink-0 space-y-2">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Top điểm đến</p>
                                    {destRevenue.slice(0, 5).map((d, i) => (
                                        <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-slate-300 font-bold flex-shrink-0">#{i + 1}</span>
                                                <span className="text-slate-600 truncate font-medium">{d.name}</span>
                                            </div>
                                            <span className="text-emerald-600 font-bold flex-shrink-0">{formatShortVND(d.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {topDestination && (
                                <InsightNote>
                                    <strong>{topDestination.name}</strong> đang dẫn đầu với <strong>{formatVND(topDestination.revenue)}</strong>, chiếm khoảng <strong>{topDestinationShare.toFixed(1)}%</strong> doanh thu điểm đến trong kỳ.
                                    {destRevenue.length === 1 && ' Hiện mới có một điểm đến phát sinh doanh thu nên chưa thể so sánh phân bổ.'}
                                </InsightNote>
                            )}
                        </>
                    )}
                </SectionCard>
            </div>

            {/* ── S3: Booking Status + Payment ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                {/* Booking Status Donut */}
                <SectionCard title="Phân bổ trạng thái booking" subtitle="Tỷ lệ theo trạng thái trong kỳ đã chọn" icon="donut_large">
                    {loading || !bookingStatus ? <Skeleton className="h-64" /> : (
                        bookingStatus.total === 0 ? (
                            <EmptyState icon="donut_large" title="Chưa có booking trong kỳ này" hint="Biểu đồ sẽ xuất hiện khi có đơn phù hợp bộ lọc." />
                        ) : (
                            <>
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <ResponsiveContainer width={180} height={180}>
                                        <PieChart>
                                            <Pie data={bookingStatus.distribution} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={4} stroke="none">
                                                {bookingStatus.distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex-1 space-y-3 w-full">
                                        {bookingStatus.distribution.map((item, i) => {
                                            const pct = bookingStatus.total > 0 ? ((item.value / bookingStatus.total) * 100).toFixed(1) : '0';
                                            return (
                                                <Link key={item.key} href={`/admin/bookings?status=${item.key}`} className="block rounded-lg p-1 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                                    <div className="flex justify-between mb-1.5 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                                                            <span className="text-slate-600 font-medium">{item.name}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-700">{item.value} <span className="text-slate-400 font-normal text-xs">({pct}%)</span></span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: PIE_COLORS[i] }} />
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                        <div className="pt-3 border-t border-slate-100 flex justify-between">
                                            <span className="text-slate-400 text-sm">Tổng trong kỳ</span>
                                            <span className="text-slate-800 font-bold">{bookingStatus.total.toLocaleString('vi-VN')}</span>
                                        </div>
                                    </div>
                                </div>
                                <InsightNote>
                                    Tỷ lệ hủy trong kỳ là <strong>{cancellationRate.toFixed(1)}%</strong>.
                                    {cancellationRate >= 20 ? ' Đây là mức cần kiểm tra nguyên nhân hủy, thanh toán hoặc chất lượng tour.' : ' Chỉ số này đang ở mức có thể theo dõi định kỳ.'}
                                </InsightNote>
                            </>
                        )
                    )}
                </SectionCard>

                {/* Payment + Trend */}
                <SectionCard title="Thanh toán & xu hướng booking" subtitle="Phân bổ thanh toán và booking theo ngày trong kỳ" icon="credit_card" accent="green">
                    {loading || !bookingStatus ? <Skeleton className="h-64" /> : (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                {bookingStatus.paymentStatus.map((ps, i) => {
                                    const s = i === 0
                                        ? { bg: 'bg-emerald-50 border-emerald-100', icon: 'check_circle', ic: '#10B981', tc: 'text-emerald-700', href: '/admin/bookings?paymentStatus=PAID' }
                                        : { bg: 'bg-amber-50 border-amber-100', icon: 'pending_actions', ic: '#F59E0B', tc: 'text-amber-700', href: '/admin/bookings?paymentStatus=UNPAID' };
                                    return (
                                        <Link key={ps.name} href={s.href} className={`block p-4 rounded-xl border transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${s.bg}`}>
                                            <span className="material-symbols-outlined text-xl mb-1.5 block" style={{ color: s.ic, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                            <p className={`text-2xl font-bold font-headline ${s.tc}`}>{ps.value.toLocaleString('vi-VN')}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{ps.name}</p>
                                        </Link>
                                    );
                                })}
                            </div>
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Số booking theo ngày trong kỳ</p>
                                {bookingStatus.recentTrend.length > 0 && trendHasEnoughData ? (
                                    <ResponsiveContainer width="100%" height={85}>
                                        <BarChart data={bookingStatus.recentTrend} barSize={Math.max(4, Math.min(14, 300 / bookingStatus.recentTrend.length))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                            <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                                            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#64748B' }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="py-6 text-center">
                                        <p className="text-sm font-semibold text-slate-400">Dữ liệu booking theo ngày còn ít</p>
                                        <p className="mt-1 text-xs text-slate-300">Biểu đồ xu hướng sẽ rõ hơn khi có booking ở nhiều ngày khác nhau.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* ── S4: Top Tours ── */}
            <div className="mb-5">
                <SectionCard title="Top 5 tour bán chạy nhất" subtitle="Xếp hạng theo booking đã xác nhận trong kỳ đã chọn" icon="explore">
                    {loading ? (
                        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
                    ) : topTours.length === 0 ? (
                        <EmptyState icon="explore" title="Chưa có dữ liệu tour trong kỳ này" hint="Khi có booking đã xác nhận, bảng xếp hạng tour sẽ được cập nhật." />
                    ) : (
                        <div className="space-y-3">
                            {topTours.map((tour, i) => {
                                const maxB = topTours[0]?.totalBookings || 1;
                                const pct = Math.round((tour.totalBookings / maxB) * 100);
                                const rankStyle = [
                                    'bg-amber-50 text-amber-600 border-amber-200',
                                    'bg-slate-50 text-slate-400 border-slate-200',
                                    'bg-orange-50 text-orange-600 border-orange-200',
                                    'bg-slate-50 text-slate-400 border-slate-100',
                                    'bg-slate-50 text-slate-400 border-slate-100',
                                ][i];
                                return (
                                    <div key={tour.tourId} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all group">
                                        <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg border flex-shrink-0 ${rankStyle}`}>
                                            #{i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-slate-700 text-sm truncate group-hover:text-blue-700 transition-colors">{tour.name}</p>
                                                    <p className="text-slate-400 text-xs truncate">{tour.destination}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-4">
                                                    <p className="font-bold text-slate-700 text-sm">{tour.totalBookings} <span className="text-slate-400 font-normal text-xs">đặt</span></p>
                                                    <p className="text-emerald-600 text-xs font-semibold">{formatShortVND(tour.totalRevenue)}</p>
                                                </div>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* ── S5: Top Customers + Vouchers ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top Customers */}
                <SectionCard title="Top 5 khách hàng" subtitle="Xếp hạng theo tổng chi tiêu trong kỳ đã chọn" icon="workspace_premium" accent="purple">
                    {loading ? (
                        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
                    ) : topCustomers.length === 0 ? (
                        <EmptyState icon="group" title="Chưa có dữ liệu khách hàng trong kỳ này" hint="Danh sách sẽ xuất hiện khi khách hàng phát sinh booking đã xác nhận." />
                    ) : (
                        <div className="space-y-1">
                            {topCustomers.map((c, i) => {
                                const initials = c.fullName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
                                return (
                                    <div key={c.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-xs font-bold text-purple-600">#{i + 1}</span>
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {initials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-700 text-sm truncate">{c.fullName}</p>
                                            <p className="text-slate-400 text-xs truncate">{c.email}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-emerald-600 font-bold text-sm">{formatShortVND(c.totalSpent)}</p>
                                            <p className="text-slate-400 text-xs">{c.totalBookings} đặt</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>

                {/* Voucher Stats */}
                <SectionCard title="Thống kê voucher" subtitle="Tổng quan mã giảm giá (không filter theo kỳ)" icon="confirmation_number" accent="amber">
                    {loading || !voucherOverview ? <Skeleton className="h-64" /> : (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <StatBadge label="Tổng voucher" value={voucherOverview.totalVouchers} color="blue" />
                                <StatBadge label="Đang hoạt động" value={voucherOverview.activeVouchers} color="green" />
                                <StatBadge label="Tỷ lệ sử dụng" value={`${voucherOverview.voucherUsageRate}%`} color="purple" />
                                <StatBadge label="Booking dùng voucher" value={voucherOverview.bookingsWithVoucher} color="amber" />
                            </div>
                            <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl">
                                <p className="text-slate-500 text-xs font-medium mb-1">Tổng tiền giảm giá đã phát</p>
                                <p className="text-2xl font-bold text-rose-600 font-headline">{formatVND(voucherOverview.totalDiscountGiven)}</p>
                            </div>
                            {topVouchers.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2.5">Top voucher dùng nhiều nhất</p>
                                    <div className="space-y-2">
                                        {topVouchers.slice(0, 3).map(v => (
                                            <div key={v.id} className="flex items-center justify-between py-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-blue-600 text-sm font-bold bg-blue-50 px-2 py-0.5 rounded-lg">{v.code}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${v.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {v.isActive ? 'Đang bật' : 'Đã tắt'}
                                                    </span>
                                                </div>
                                                <span className="text-slate-600 text-sm font-semibold">{v.usedCount}/{v.maxUses} lượt</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </SectionCard>
            </div>
        </main>
    );
}

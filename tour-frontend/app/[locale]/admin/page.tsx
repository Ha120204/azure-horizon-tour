'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell,
} from 'recharts';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import Link from 'next/link';
import { useRouter } from '@/i18n/routing';
import StaffDashboard from '@/app/components/admin/StaffDashboard';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatVND = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const formatShortVND = (n: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(n));
};

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    CONFIRMED: { label: 'Xác nhận', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    PENDING: { label: 'Chờ xử lý', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    CANCELLED: { label: 'Đã hủy', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
};

const PIE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444'];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-slate-200/80 rounded-xl animate-pulse ${className}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
    icon: string; title: string; value: string; change: number;
    sub?: string; gradient?: boolean;
}

function KpiCard({ icon, title, value, change, sub, gradient }: KpiCardProps) {
    const isUp = change >= 0;
    const isZero = change === 0;
    return (
        <div className={`relative rounded-2xl p-6 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default ${gradient
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
                    {!isZero && (
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${gradient
                            ? 'bg-white/20 text-white'
                            : isUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            <span className="material-symbols-outlined text-[11px]">
                                {isUp ? 'trending_up' : 'trending_down'}
                            </span>
                            {isUp ? '+' : ''}{change}%
                        </span>
                    )}
                    {isZero && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-400 border border-slate-100">
                            So với kỳ trước
                        </span>
                    )}
                </div>
                <p className={`text-sm font-medium mb-1.5 ${gradient ? 'text-white/80' : 'text-slate-500'}`}>{title}</p>
                <h3 className={`text-3xl font-bold tracking-tight font-headline ${gradient ? 'text-white' : 'text-slate-800'}`}>{value}</h3>
                {sub && <p className={`text-xs mt-1.5 ${gradient ? 'text-white/60' : 'text-slate-400'}`}>{sub}</p>}
            </div>
        </div>
    );
}

// ─── Revenue Tooltip ──────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
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
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { from, to } = dateRange;
        const diffDays = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
        const gran = getGranularity(diffDays);
        try {
            const [ovRes, revRes, bsRes, rbRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/statistics/overview?dateFrom=${from}&dateTo=${to}`),
                fetchWithAuth(`${API_BASE_URL}/statistics/revenue?dateFrom=${from}&dateTo=${to}&granularity=${gran}`),
                fetchWithAuth(`${API_BASE_URL}/statistics/bookings/status?dateFrom=${from}&dateTo=${to}`),
                fetchWithAuth(`${API_BASE_URL}/booking/admin/all?limit=5&status=ALL`),
            ]);
            if (ovRes.ok) { const j = await ovRes.json(); setOverview(j.data); }
            if (revRes.ok) { const j = await revRes.json(); setRevenueData(j.data?.data ?? []); }
            if (bsRes.ok) { const j = await bsRes.json(); setBookingStatus(j.data); }
            if (rbRes.ok) { const j = await rbRes.json(); setRecentBookings(j.bookings ?? []); }
        } catch (e) {
            console.error('Dashboard error:', e);
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

    useEffect(() => { if (userRole && userRole !== 'STAFF') fetchAll(); }, [fetchAll, userRole]);

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

    return (
        <main className="flex-1 pt-8 px-8 pb-16 max-w-[1600px] mx-auto w-full bg-slate-50 min-h-screen">

            {/* ── Header ── */}
            <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
                <div>
                    <h1 className="font-headline text-[2rem] font-bold text-slate-800 leading-tight tracking-tight">
                        Tổng Quan Hệ Thống
                    </h1>
                    <p className="text-slate-500 text-sm mt-1.5">
                        Chào mừng trở lại. Đây là những gì đang diễn ra.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Link
                        href="/admin/statistics"
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
                    >
                        <span className="material-symbols-outlined text-[17px]">bar_chart</span>
                        Thống kê Chi tiết
                    </Link>
                    <button
                        onClick={fetchAll}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-white text-slate-500 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-[17px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* ── Preset Filter Bar ── */}
            <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mr-2">Xem dữ liệu:</span>
                {PRESETS.map(p => (
                    <button
                        key={p.days}
                        onClick={() => handlePreset(p.days)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!isCustom && activeDays === p.days
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                    >
                        {p.label}
                    </button>
                ))}
                {/* ── Custom date range picker ── */}
                <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
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
                        {new Date(from).toLocaleDateString('vi-VN')} — {new Date(to).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium">
                        {GRAN_LABEL[gran]}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>So sánh với <strong className="text-slate-500">{activeDays} ngày</strong> trước đó</span>
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
                            change={overview.revenue.changePercent}
                            sub={`Kỳ trước: ${formatShortVND(overview.revenue.previous)}`}
                            gradient
                        />
                        <KpiCard
                            icon="book_online" title="Tổng Booking"
                            value={overview.bookings.total.toLocaleString('vi-VN')}
                            change={overview.bookings.changePercent}
                            sub={`Hủy: ${overview.bookings.cancellationRate}% • Kỳ trước: ${overview.bookings.previous}`}
                        />
                        <KpiCard
                            icon="analytics" title="Giá trị TB/Đơn (AOV)"
                            value={formatShortVND(overview.aov.current)}
                            change={overview.aov.changePercent}
                            sub={`Kỳ trước: ${formatShortVND(overview.aov.previous)}`}
                        />
                        <KpiCard
                            icon="group_add" title="Khách hàng Mới"
                            value={overview.customers.newInPeriod.toLocaleString('vi-VN')}
                            change={overview.customers.changePercent}
                            sub={`${overview.tours.active} tours đang hoạt động`}
                        />
                    </>
                ) : null}
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">

                {/* Revenue Chart */}
                <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-5">
                        <div>
                            <h3 className="font-headline text-base font-bold text-slate-800">
                                Doanh thu — {activeDays} ngày gần nhất
                            </h3>
                            <p className="text-slate-400 text-xs mt-0.5">
                                Hiển thị {GRAN_LABEL[gran].toLowerCase()} · {revenueData.length} điểm dữ liệu
                            </p>
                        </div>
                        <Link href="/admin/statistics" className="text-blue-500 text-xs font-semibold hover:text-blue-600 flex items-center gap-1">
                            Chi tiết <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </Link>
                    </div>
                    {loading ? (
                        <Skeleton className="h-56 w-full" />
                    ) : revenueData.length === 0 ? (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-300">
                            <span className="material-symbols-outlined text-5xl mb-2">bar_chart</span>
                            <p className="text-sm">Chưa có doanh thu trong kỳ này</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={224}>
                            <BarChart data={revenueData} barSize={Math.max(8, Math.min(32, 200 / revenueData.length))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis tickFormatter={formatShortVND} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
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
                        <h3 className="font-headline text-base font-bold text-slate-800">Trạng thái Booking</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Phân bổ trong kỳ đã chọn</p>
                    </div>
                    {loading ? (
                        <Skeleton className="h-52 w-full" />
                    ) : bookingStatus ? (
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
                    ) : null}
                </div>
            </div>

            {/* ── Recent Bookings ── */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-headline text-base font-bold text-slate-800">Booking Gần đây</h3>
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
                                <th className="px-6 py-3.5 font-semibold">Mã Booking</th>
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
                                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer group" onClick={() => router.push('/admin/bookings')}>
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

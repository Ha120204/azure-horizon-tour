'use client';

import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell,
} from 'recharts';
import { Link, useRouter } from '@/i18n/routing';
import StaffDashboard from './_components/StaffDashboard';
import KpiCard from './_components/KpiCard';
import RevenueTooltip from './_components/RevenueTooltip';
import { useAdminDashboard } from './_hooks/useAdminDashboard';
import { formatVND, formatAxisVND, formatDate, getGranularity } from './_lib/helpers';
import { getTrendMeta, STATUS_CONFIG, PIE_COLORS, GRAN_LABEL, PRESETS } from './_lib/dashboard.types';

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-slate-200/80 rounded-xl animate-pulse ${className}`} />;
}

function getPeriodComparisonLabel(isCustom: boolean, activeDays: number, from: string, to: string) {
    if (!isCustom) return `So sánh với ${activeDays} ngày trước đó`;
    const diffDays = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)));
    return `So sánh với ${diffDays} ngày trước kỳ tùy chỉnh`;
}

export default function AdminDashboardPage() {
    const router = useRouter();

    const [userRole, setUserRole] = useState<string>('');
    const [userName, setUserName] = useState<string>('Nhân viên');
    const [roleLoaded, setRoleLoaded] = useState(false);

    // Layout đã xác thực và lưu profile vào localStorage trước khi render children.
    // Đọc trực tiếp từ storage thay vì gọi API lần hai.
    useEffect(() => {
        const role = localStorage.getItem('userRole') ?? '';
        const name = localStorage.getItem('userName') || 'Nhân viên';
        setUserRole(role || '__error__');
        setUserName(name);
        setRoleLoaded(true);
    }, []);

    const isAdminView = roleLoaded && userRole !== '' && userRole !== '__error__' && userRole !== 'STAFF';

    const {
        today, activeDays, customFrom, customTo, isCustom, dateRange,
        setCustomFrom, setCustomTo,
        overview, revenueData, bookingStatus, recentBookings, operationalStats,
        loading, lastUpdatedAt, dashboardError,
        handlePreset, handleCustomApply, fetchAll,
    } = useAdminDashboard(isAdminView);

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

    if (userRole === '__error__') {
        return (
            <main className="flex-1 pt-8 px-8 min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-400 text-[24px]">error</span>
                    </div>
                    <div>
                        <p className="text-slate-700 font-semibold text-sm">Không tải được thông tin tài khoản</p>
                        <p className="text-slate-400 text-xs mt-1">Vui lòng thử làm mới trang.</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Tải lại trang
                    </button>
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
    const nonZeroRevenuePoints = revenueData.filter(p => p.revenue > 0).length;
    const hasRevenueData = revenueData.some(p => p.revenue > 0);

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

            {/* ── Error banner ── */}
            {dashboardError && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {dashboardError}
                </div>
            )}

            {/* ── Filter Bar ── */}
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
                            value={formatVND(overview.revenue.current)}
                            trend={getTrendMeta(overview.revenue.current, overview.revenue.previous, overview.revenue.changePercent)}
                            sub={`Kỳ trước: ${formatVND(overview.revenue.previous)}`}
                            gradient href="/admin/statistics"
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
                            value={formatVND(overview.aov.current)}
                            trend={getTrendMeta(overview.aov.current, overview.aov.previous, overview.aov.changePercent)}
                            sub={`Kỳ trước: ${formatVND(overview.aov.previous)}`}
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

            {/* ── Operational Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[
                    { href: '/admin/bookings?status=PENDING', icon: 'pending_actions', label: 'Booking chờ xử lý', value: operationalStats.bookingPending, tone: 'bg-amber-50 text-amber-700' },
                    { href: '/admin/bookings?status=CANCEL_REQUESTED', icon: 'assignment_late', label: 'Yêu cầu hủy', value: operationalStats.cancelRequested, tone: 'bg-orange-50 text-orange-700' },
                    { href: '/admin/tours?status=PENDING_REVIEW', icon: 'approval', label: 'Tour chờ duyệt', value: operationalStats.tourPending, tone: 'bg-blue-50 text-blue-700' },
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
                                    const pct = ((item.value / bookingStatus.total) * 100).toFixed(1);
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
                                                <div className="h-4 bg-slate-100 rounded" style={{ width: `${w * 4}px` }} />
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
                                    const sc = STATUS_CONFIG[b.status] ?? { label: b.status, bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
                                    const initials = b.user?.fullName
                                        ? b.user.fullName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
                                        : '??';
                                    return (
                                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => router.push(`/admin/bookings?search=${encodeURIComponent(b.bookingCode)}`)}>
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

import { Link } from '@/i18n/routing';
import type { QuickStats } from './types';
import { Skeleton } from './ui';

export default function SlaSection({ loading, stats }: { loading: boolean; stats: QuickStats | null }) {
    const overduePendingBookings = stats?.pendingOverdue ?? 0;
    const overdueCancelRequests = stats?.cancelRequestedOverdue ?? 0;
    const overdueTickets = stats?.supportOverdue ?? 0;
    const totalSlaIssues = overduePendingBookings + overdueCancelRequests + overdueTickets;

    const slaCards = [
        {
            icon: 'schedule',
            label: 'Booking quá 24h',
            value: overduePendingBookings,
            helper: 'Booking PENDING chưa được xác nhận',
            href: '/admin/bookings?status=PENDING',
            tone: overduePendingBookings > 0 ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-700 ring-slate-200',
        },
        {
            icon: 'timer',
            label: 'Hủy quá 4h',
            value: overdueCancelRequests,
            helper: 'Yêu cầu hủy chờ quyết định',
            href: '/admin/bookings?status=CANCEL_REQUESTED',
            tone: overdueCancelRequests > 0 ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-700 ring-slate-200',
        },
        {
            icon: 'support_agent',
            label: 'Ticket quá 2h',
            value: overdueTickets,
            helper: 'Ticket mở chưa được xử lý kịp SLA',
            href: '/admin/support?view=overdue',
            tone: overdueTickets > 0 ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-700 ring-slate-200',
        },
    ];

    return (
        <aside className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-red-600">SLA & cảnh báo</p>
                    <h2 className="mt-1 font-headline text-lg font-bold text-slate-950">Ưu tiên quá hạn</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">Các mục vượt ngưỡng phản hồi cần được kéo lên trước.</p>
                </div>
                {!loading ? (
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        totalSlaIssues > 0
                            ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                    }`}>
                        {totalSlaIssues > 0 ? `${totalSlaIssues.toLocaleString('vi-VN')} quá hạn` : 'Đúng SLA'}
                    </span>
                ) : null}
            </div>

            <div className="space-y-2">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)
                ) : (
                    slaCards.map(item => (
                        <Link
                            key={item.label}
                            href={item.href}
                            aria-label={`${item.label}: ${item.value}. ${item.helper}`}
                            className={`group block rounded-2xl px-4 py-3 ring-1 transition hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${item.tone}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{item.icon}</span>
                                        <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">{item.label}</p>
                                    </div>
                                    <p className="mt-1 truncate text-xs font-medium opacity-80">{item.helper}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <p className="font-headline text-xl font-bold">{item.value.toLocaleString('vi-VN')}</p>
                                    <span className="material-symbols-outlined text-[15px] opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-70" aria-hidden="true">arrow_forward</span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </aside>
    );
}

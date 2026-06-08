import { Link } from '@/i18n/routing';
import type { QuickStats } from './types';
import { Skeleton, WorkQueueRow } from './ui';

export default function WorkQueueSection({ loading, stats }: { loading: boolean; stats: QuickStats | null }) {
    const pendingBookings = stats?.pending ?? 0;
    const overduePendingBookings = stats?.pendingOverdue ?? 0;
    const cancelRequests = stats?.cancelRequested ?? 0;
    const overdueCancelRequests = stats?.cancelRequestedOverdue ?? 0;
    const openTickets = stats?.supportOpen ?? 0;
    const overdueTickets = stats?.supportOverdue ?? 0;
    const ticketsAssignedToMe = stats?.supportAssignedToMeOpen ?? 0;
    const unassignedTickets = stats?.supportUnassignedOpen ?? 0;
    const totalCriticalWork = pendingBookings + cancelRequests + openTickets;

    const workQueueItems = [
        {
            icon: 'pending_actions',
            label: 'Booking chờ xử lý',
            value: pendingBookings,
            helper: overduePendingBookings > 0 ? `${overduePendingBookings.toLocaleString('vi-VN')} quá 24h` : 'Mở danh sách booking đang chờ',
            tone: 'amber' as const,
            href: '/admin/bookings?status=PENDING',
            meta: overduePendingBookings > 0 ? 'Quá hạn' : pendingBookings > 0 ? 'Chờ xử lý' : 'Ổn',
        },
        {
            icon: 'assignment_late',
            label: 'Yêu cầu hủy',
            value: cancelRequests,
            helper: overdueCancelRequests > 0 ? `${overdueCancelRequests.toLocaleString('vi-VN')} quá 4h` : 'Cần kiểm tra điều kiện hoàn hủy',
            tone: 'orange' as const,
            href: '/admin/bookings?status=CANCEL_REQUESTED',
            meta: overdueCancelRequests > 0 ? 'Quá hạn' : cancelRequests > 0 ? 'Cần duyệt' : 'Ổn',
        },
        {
            icon: 'support_agent',
            label: 'Ticket đang mở',
            value: openTickets,
            helper: overdueTickets > 0
                ? `${overdueTickets.toLocaleString('vi-VN')} quá 2h · của tôi ${ticketsAssignedToMe.toLocaleString('vi-VN')}`
                : `Của tôi ${ticketsAssignedToMe.toLocaleString('vi-VN')} · chưa giao ${unassignedTickets.toLocaleString('vi-VN')}`,
            tone: 'teal' as const,
            href: '/admin/support?view=open',
            meta: overdueTickets > 0 ? 'Quá hạn' : openTickets > 0 ? 'Đang mở' : 'Ổn',
        },
    ];

    const supportScope = [
        {
            label: 'Của tôi',
            value: ticketsAssignedToMe,
            helper: 'Ticket đã giao cho bạn',
            tone: 'bg-blue-50 text-blue-700 ring-blue-100',
            href: '/admin/support?view=open&assigned=me',
        },
        {
            label: 'Chưa giao',
            value: unassignedTickets,
            helper: 'Cần điều phối người phụ trách',
            tone: 'bg-amber-50 text-amber-700 ring-amber-100',
            href: '/admin/support?view=open&assigned=none',
        },
        {
            label: 'Toàn hệ thống',
            value: openTickets,
            helper: 'Tất cả ticket NEW/IN_PROGRESS',
            tone: 'bg-slate-100 text-slate-700 ring-slate-200',
            href: '/admin/support?view=open',
        },
    ];

    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-600">Bảng điều phối</p>
                    <h2 className="mt-1 font-headline text-lg font-bold text-slate-950">Việc cần xử lý hôm nay</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">Mở thẳng danh sách đã lọc, xử lý theo thứ tự ưu tiên từ trên xuống.</p>
                </div>
                {!loading ? (
                    <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${
                        totalCriticalWork > 0
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                    }`}>
                        {totalCriticalWork > 0
                            ? `${totalCriticalWork.toLocaleString('vi-VN')} việc đang chờ`
                            : 'Hàng đợi trống'}
                    </span>
                ) : null}
            </div>

            <div className="space-y-2">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[74px]" />)
                ) : (
                    workQueueItems.map(item => <WorkQueueRow key={item.label} {...item} />)
                )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[68px]" />)
                ) : (
                    supportScope.map(item => (
                        <Link
                            key={item.label}
                            href={item.href}
                            aria-label={`${item.label}: ${item.value.toLocaleString('vi-VN')}. ${item.helper}`}
                            className={`group rounded-2xl px-4 py-3 ring-1 transition hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${item.tone}`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-75">{item.label}</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="font-headline text-xl font-bold">{item.value.toLocaleString('vi-VN')}</p>
                                    <span className="material-symbols-outlined text-[14px] opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-70" aria-hidden="true">arrow_forward</span>
                                </div>
                            </div>
                            <p className="mt-1 text-xs font-medium opacity-80">{item.helper}</p>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}

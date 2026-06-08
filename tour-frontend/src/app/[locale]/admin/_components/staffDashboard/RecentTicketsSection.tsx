import { Link } from '@/i18n/routing';
import type { MyTicket } from './types';
import { TICKET_STATUS, formatDate } from './constants';
import { Skeleton, SectionHeader, EmptyState } from './ui';

export default function RecentTicketsSection({
    loading,
    myTickets,
    openTickets,
}: {
    loading: boolean;
    myTickets: MyTicket[];
    openTickets: number;
}) {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:col-span-5">
            <SectionHeader
                title="Ticket hỗ trợ"
                subtitle="Các yêu cầu khách hàng đang cần phản hồi"
                action={(
                    <Link href="/admin/support?view=open" className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                        Tất cả
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                    </Link>
                )}
            />
            <div className="flex-1 divide-y divide-slate-50">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-2 px-6 py-4">
                            <Skeleton className="h-3 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))
                ) : myTickets.length === 0 ? (
                    <EmptyState
                        icon="support_agent"
                        title={openTickets > 0 ? `${openTickets.toLocaleString('vi-VN')} ticket đang mở trong hệ thống` : 'Không có ticket đang mở'}
                        description={openTickets > 0
                            ? 'Có ticket đang mở nhưng danh sách nhanh chưa tải được. Mở hàng đợi hỗ trợ để kiểm tra toàn bộ ticket.'
                            : 'Hàng đợi hỗ trợ đang trống. Khi khách gửi yêu cầu mới, ticket sẽ xuất hiện ở đây.'}
                        href={openTickets > 0 ? '/admin/support?view=open' : '/admin/support'}
                        action={openTickets > 0 ? 'Mở hàng đợi ticket' : 'Xem lịch sử hỗ trợ'}
                    />
                ) : (
                    myTickets.map(ticket => {
                        const status = TICKET_STATUS[ticket.status] ?? { label: ticket.status, cls: 'bg-slate-100 text-slate-600' };
                        return (
                            <Link key={ticket.id} href="/admin/support?view=open" className="block px-6 py-4 transition-colors hover:bg-slate-50/70 focus:outline-none focus-visible:bg-blue-50">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 truncate text-sm font-bold text-slate-800">{ticket.subject}</p>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>{status.label}</span>
                                </div>
                                <p className="mt-1 text-xs font-medium text-slate-500">{ticket.customerName} · {formatDate(ticket.createdAt)}</p>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}

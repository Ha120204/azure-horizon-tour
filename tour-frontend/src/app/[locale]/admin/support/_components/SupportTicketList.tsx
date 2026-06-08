import { AVATAR_COLORS, CAT, STS } from '../_lib/config';
import { calcOverdueSLA, fmtResponse, fmtSyncTime, fmtTime, formatSupportMessageLines, getInitials } from '../_lib/helpers';
import type { Kpi, Ticket, TicketSort, TicketView } from '../_lib/types';

interface SupportTicketListProps {
    tickets: Ticket[];
    kpi: Kpi;
    loading: boolean;
    selectedId: number | null;
    activeView: TicketView;
    lastSyncedAt: Date | null;
    actionError: string;
    actionNotice: string;
    currentPage: number;
    totalPages: number;
    sort: TicketSort;
    onViewToggle: (view: Exclude<TicketView, 'ALL'>) => void;
    onSelect: (ticket: Ticket) => void;
    onPageChange: (page: number) => void;
    onFilterOpen: () => void;
    onSortChange: (sort: TicketSort) => void;
}

export function SupportTicketList({
    tickets,
    kpi,
    loading,
    selectedId,
    activeView,
    lastSyncedAt,
    actionError,
    actionNotice,
    currentPage,
    totalPages,
    sort,
    onViewToggle,
    onSelect,
    onPageChange,
    onFilterOpen,
    onSortChange,
}: SupportTicketListProps) {
    const supportKpis = [
        {
            label: 'Ticket đang mở',
            value: kpi.open.toLocaleString('vi-VN'),
            icon: 'confirmation_number',
            tone: 'text-primary bg-primary/10',
            active: activeView === 'OPEN',
            onClick: () => onViewToggle('OPEN'),
        },
        {
            label: 'Phản hồi trung bình',
            value: fmtResponse(kpi.avgFirstResponseMinutes),
            icon: 'timer',
            tone: 'text-emerald-700 bg-emerald-50',
            active: false,
            onClick: null,
            subtitle: '7 ngày gần nhất',
        },
        {
            label: 'Quá hạn SLA',
            value: kpi.overdue.toLocaleString('vi-VN'),
            icon: 'warning',
            tone: 'text-red-700 bg-red-50',
            active: activeView === 'OVERDUE',
            onClick: () => onViewToggle('OVERDUE'),
        },
    ];

    return (
        <section className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-outline-variant/40 bg-surface">
            <div className="shrink-0 border-b border-outline-variant/30 bg-surface-container-lowest p-4">
                <div className="mb-3 flex items-center justify-between xl:hidden">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Support Desk</p>
                        <h1 className="text-lg font-black tracking-tight text-slate-950">Hỗ trợ khách hàng</h1>
                    </div>
                    <button
                        type="button"
                        onClick={onFilterOpen}
                        className="flex items-center gap-1.5 rounded-xl border border-outline-variant/40 bg-surface px-3 py-2 text-sm font-bold text-on-surface-variant shadow-sm transition hover:bg-surface-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                    >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">tune</span>
                        Bộ lọc
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {supportKpis.map((item) => {
                        const content = (
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold text-on-surface-variant">{item.label}</p>
                                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{item.value}</p>
                                    {'subtitle' in item && item.subtitle && (
                                        <p className="mt-0.5 text-[11px] font-semibold text-outline">{item.subtitle}</p>
                                    )}
                                </div>
                                <span className={`material-symbols-outlined grid h-10 w-10 place-items-center rounded-2xl text-[20px] ${item.tone}`} aria-hidden="true">
                                    {item.icon}
                                </span>
                            </div>
                        );

                        return item.onClick ? (
                            <button
                                key={item.label}
                                type="button"
                                onClick={item.onClick}
                                aria-pressed={item.active}
                                className={`rounded-2xl border bg-surface px-4 py-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
                                    item.active
                                        ? 'border-primary/40 ring-2 ring-primary/10'
                                        : 'border-outline-variant/30 hover:border-primary/30 hover:bg-primary/5'
                                }`}
                            >
                                {content}
                            </button>
                        ) : (
                            <div key={item.label} className="rounded-2xl border border-outline-variant/30 bg-surface px-4 py-3 text-left shadow-sm">
                                {content}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-outline" aria-hidden="true">sort</span>
                        <select
                            value={sort}
                            onChange={(e) => onSortChange(e.target.value as TicketSort)}
                            className="h-8 rounded-xl border border-outline-variant/40 bg-surface px-2 text-xs font-bold text-on-surface-variant outline-none transition hover:border-primary/30 focus-visible:ring-4 focus-visible:ring-primary/10"
                        >
                            <option value="updated">Vừa cập nhật</option>
                            <option value="oldest">Chờ lâu nhất</option>
                            <option value="overdue">Quá SLA trước</option>
                        </select>
                    </label>
                    {lastSyncedAt && (
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-outline">
                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">sync</span>
                            Cập nhật {fmtSyncTime(lastSyncedAt)}
                        </p>
                    )}
                </div>
                {(actionError || actionNotice) && (
                    <div
                        role={actionError ? 'alert' : 'status'}
                        aria-live="polite"
                        className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
                            actionError
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                    >
                        {actionError || actionNotice}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                    {loading && Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="animate-pulse rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4">
                            <div className="flex gap-3">
                                <div className="h-10 w-10 rounded-full bg-surface-container-high" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-3 w-1/3 rounded bg-surface-container-high" />
                                    <div className="h-3 rounded bg-surface-container" />
                                    <div className="h-3 w-2/3 rounded bg-surface-container" />
                                </div>
                            </div>
                        </div>
                    ))}

                    {!loading && tickets.length === 0 && (
                        <div className="grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-lowest text-center">
                            <div>
                                <span className="material-symbols-outlined text-5xl text-outline">inbox</span>
                                <p className="mt-3 text-sm font-bold text-on-surface">Không có ticket phù hợp</p>
                                <p className="mt-1 text-xs text-on-surface-variant">Thử đổi trạng thái, danh mục hoặc từ khóa tìm kiếm.</p>
                            </div>
                        </div>
                    )}

                    {!loading && tickets.map((ticket, index) => (
                        <SupportTicketCard
                            key={ticket.id}
                            ticket={ticket}
                            active={selectedId === ticket.id}
                            avatar={AVATAR_COLORS[index % AVATAR_COLORS.length]}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            </div>

            {totalPages > 1 && (
                <Pagination current={currentPage} total={totalPages} onChange={onPageChange} />
            )}
        </section>
    );
}

function SupportTicketCard({
    ticket,
    active,
    avatar,
    onSelect,
}: {
    ticket: Ticket;
    active: boolean;
    avatar: string;
    onSelect: (ticket: Ticket) => void;
}) {
    const category = CAT[ticket.category] ?? CAT.general;
    const status = STS[ticket.status];
    const resolved = ticket.status === 'RESOLVED';
    const messageLines = formatSupportMessageLines(ticket.message);
    const overdueLabel = calcOverdueSLA(ticket.createdAt, ticket.status);
    const customerJustReplied = ticket.status === 'IN_PROGRESS' && ticket.replies[0]?.senderType === 'customer';

    return (
        <button
            type="button"
            onClick={() => onSelect(ticket)}
            aria-pressed={active}
            className={`w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
                active
                    ? 'border-primary/30 bg-primary/5 shadow-sm ring-2 ring-primary/10'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/20 hover:bg-surface'
            }`}
        >
            <div className="flex items-start gap-3">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatar} text-sm font-black text-white ${resolved ? 'grayscale opacity-60' : ''}`}>
                    {getInitials(ticket.customerName)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className={`truncate text-base font-black ${resolved ? 'text-slate-500' : 'text-slate-950'}`}>{ticket.customerName}</p>
                            <p className="text-xs font-semibold text-outline">#{ticket.id} · {fmtTime(ticket.createdAt)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${category.color}`}>{category.label}</span>
                    </div>
                    <p className={`mt-1.5 truncate text-sm font-semibold leading-5 ${resolved ? 'text-slate-400' : 'text-on-surface'}`}>
                        {ticket.subject}
                    </p>
                    <TicketMessagePreview lines={messageLines} resolved={resolved} />
                    <div className="mt-3 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        <span className={`text-[11px] font-black uppercase tracking-[0.12em] ${status.text}`}>{status.label}</span>
                        {customerJustReplied && (
                            <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-600 ring-1 ring-blue-100">
                                Khách phản hồi
                            </span>
                        )}
                        {overdueLabel && !customerJustReplied && (
                            <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600 ring-1 ring-red-100">
                                Quá hạn {overdueLabel}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}

function Pagination({
    current,
    total,
    onChange,
}: {
    current: number;
    total: number;
    onChange: (page: number) => void;
}) {
    return (
        <div className="shrink-0 flex items-center justify-between border-t border-outline-variant/30 bg-surface px-4 py-3">
            <button
                type="button"
                onClick={() => onChange(current - 1)}
                disabled={current <= 1}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">chevron_left</span>
                Trước
            </button>
            <span className="text-sm font-semibold text-on-surface-variant">
                Trang <span className="font-black text-on-surface">{current}</span> / {total}
            </span>
            <button
                type="button"
                onClick={() => onChange(current + 1)}
                disabled={current >= total}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
                Tiếp
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">chevron_right</span>
            </button>
        </div>
    );
}

function TicketMessagePreview({ lines, resolved }: { lines: string[]; resolved: boolean }) {
    const visibleLines = lines.length > 1 ? lines.slice(0, 2) : lines;
    const textTone = resolved ? 'text-slate-400' : 'text-on-surface-variant';

    if (visibleLines.length <= 1) {
        return (
            <p className={`mt-3 line-clamp-2 text-sm leading-6 ${textTone}`}>
                {visibleLines[0] ?? ''}
            </p>
        );
    }

    return (
        <div className={`mt-3 space-y-1.5 text-sm leading-5 ${textTone}`}>
            {visibleLines.map((line, index) => (
                <div key={`${line}-${index}`} className="flex items-start gap-2">
                    <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${resolved ? 'bg-slate-300' : 'bg-primary'}`} />
                    <span className="min-w-0 flex-1 truncate">{line}</span>
                </div>
            ))}
            {lines.length > visibleLines.length && (
                <div className="pl-3.5 text-[11px] font-bold text-outline">
                    +{lines.length - visibleLines.length} dòng thông tin khác
                </div>
            )}
        </div>
    );
}

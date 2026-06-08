'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AVATAR_COLORS, CAT, STS } from '../_lib/config';
import {
    fmtDate,
    fmtMoney,
    fmtTime,
    formatSupportMessageLines,
    getInitials,
    parseSupportRequestMessage,
    resolveBookingStatus,
    resolvePaymentStatus,
} from '../_lib/helpers';
import type { AuditEvent, Reply, Ticket, TicketStatus } from '../_lib/types';

interface SupportConversationPanelProps {
    selected: Ticket | null;
    reply: string;
    sending: boolean;
    statusUpdatingId: number | null;
    replyError?: string;
    replyIsInternal?: boolean;
    onStatusChange: (id: number, status: TicketStatus) => void;
    onReplyChange: (value: string) => void;
    onSendReply: () => void;
    onAssign: (id: number) => void;
    onSetInternal?: (v: boolean) => void;
    drawer?: boolean;
}

export function SupportConversationPanel({
    selected,
    reply,
    sending,
    statusUpdatingId,
    replyError,
    replyIsInternal = false,
    onStatusChange,
    onReplyChange,
    onSendReply,
    onAssign,
    onSetInternal,
    drawer = false,
}: SupportConversationPanelProps) {
    const threadRef = useRef<HTMLDivElement>(null);
    const sectionClass = drawer
        ? 'flex min-h-0 flex-1 flex-col bg-surface-container-lowest'
        : 'hidden min-h-0 w-[440px] shrink-0 flex-col bg-surface-container-lowest lg:flex';

    useEffect(() => {
        if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }, [selected]);

    if (!selected) {
        return (
            <section className={sectionClass}>
                <div className="grid flex-1 place-items-center text-center">
                    <div>
                        <span className="material-symbols-outlined text-6xl text-outline">forum</span>
                        <p className="mt-3 text-sm font-bold text-on-surface">Chọn một ticket</p>
                        <p className="mt-1 text-xs text-on-surface-variant">Nội dung hội thoại sẽ hiển thị ở đây.</p>
                    </div>
                </div>
            </section>
        );
    }

    const selectedCategory = CAT[selected.category] ?? CAT.general;
    const selectedStatus = STS[selected.status];
    const linkedBooking = selected.linkedBooking ?? null;
    const bookingStatus = linkedBooking ? resolveBookingStatus(linkedBooking.status) : null;
    const paymentStatus = linkedBooking ? resolvePaymentStatus(linkedBooking.paymentStatus) : null;
    const avatarColor = AVATAR_COLORS[selected.id % AVATAR_COLORS.length];

    return (
        <section className={sectionClass}>
            <div className="shrink-0 border-b border-outline-variant/30 bg-surface px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarColor} text-sm font-black text-white`}>
                            {getInitials(selected.customerName)}
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-black text-slate-950">{selected.customerName}</h2>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${selectedCategory.color}`}>{selectedCategory.label}</span>
                                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${selectedStatus.tone}`}>{selectedStatus.label}</span>
                            </div>
                        </div>
                    </div>
                    <select
                        aria-label={`Cập nhật trạng thái ticket #${selected.id}`}
                        value={selected.status}
                        onChange={(event) => onStatusChange(selected.id, event.target.value as TicketStatus)}
                        disabled={statusUpdatingId === selected.id}
                        className="h-9 rounded-xl border border-outline-variant/40 bg-surface px-3 text-xs font-black text-on-surface outline-none transition focus-visible:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-wait disabled:opacity-60"
                    >
                        <option value="NEW">Mới</option>
                        <option value="IN_PROGRESS">Đang xử lý</option>
                        <option value="RESOLVED">Đã giải quyết</option>
                    </select>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                        <p className="font-bold text-outline">Email</p>
                        <p className="mt-1 truncate font-semibold text-on-surface">{selected.customerEmail}</p>
                    </div>
                    <div>
                        <p className="font-bold text-outline">Điện thoại</p>
                        <p className="mt-1 font-semibold text-on-surface">{selected.customerPhone || '—'}</p>
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-outline">Người phụ trách</p>
                            {selected.assignedStaffId != null ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                                    {selected.assignedStaffName ?? 'Đã phân công'}
                                </span>
                            ) : (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">
                                    Chưa phân công
                                </span>
                            )}
                        </div>
                        {selected.assignedStaffId == null && selected.status !== 'RESOLVED' && (
                            <button
                                type="button"
                                onClick={() => onAssign(selected.id)}
                                disabled={statusUpdatingId === selected.id}
                                className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-black text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-wait disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">person_add</span>
                                Nhận ticket
                            </button>
                        )}
                    </div>
                    <BookingSummary
                        selected={selected}
                        linkedBooking={linkedBooking}
                        bookingStatus={bookingStatus}
                        paymentStatus={paymentStatus}
                    />
                </div>
            </div>

            <div ref={threadRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="flex justify-center">
                    <div className="rounded-full border border-outline-variant/30 bg-surface px-3 py-1 text-[11px] font-semibold text-on-surface-variant">
                        Ticket #{selected.id} · {new Date(selected.createdAt).toLocaleString('vi-VN')}
                    </div>
                </div>

                <CustomerMessage selected={selected} avatarColor={avatarColor} />

                {buildTimeline(selected.replies ?? [], selected.auditLogs ?? []).map((item, index) => {
                    if (item.type === 'audit') {
                        return <AuditEventItem key={`audit-${item.data.id}`} event={item.data} />;
                    }
                    const r = item.data;
                    const staff = r.senderType === 'staff';
                    const internal = r.isInternal === true;
                    const bubbleClass = !staff
                        ? 'rounded-bl-md border border-outline-variant/30 bg-surface text-on-surface'
                        : internal
                            ? 'rounded-br-md border border-amber-200 bg-amber-50 text-amber-900'
                            : 'rounded-br-md bg-primary text-on-primary';
                    return (
                        <div key={r.id ?? `reply-${index}`} className={`flex max-w-[92%] gap-3 ${staff ? 'ml-auto justify-end' : ''}`}>
                            {!staff && (
                                <div className={`mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarColor} text-[10px] font-black text-white`}>
                                    {getInitials(selected.customerName)}
                                </div>
                            )}
                            <div className={`flex flex-col gap-1 ${staff ? 'items-end' : 'items-start'}`}>
                                {internal && (
                                    <div className="flex items-center gap-1 text-[10px] font-black text-amber-700">
                                        <span className="material-symbols-outlined text-[12px]" aria-hidden="true">lock</span>
                                        Ghi chú nội bộ
                                    </div>
                                )}
                                <p className="mx-1 text-[11px] font-semibold text-outline">{r.senderName} · {fmtTime(r.createdAt)}</p>
                                <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${bubbleClass}`}>
                                    <FormattedTicketMessage
                                        message={r.content}
                                        bulletClassName={!staff ? 'bg-primary' : internal ? 'bg-amber-400' : 'bg-white/85'}
                                    />
                                </div>
                            </div>
                            {staff && (
                                <div className={`mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black ${internal ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-primary text-on-primary'}`}>NV</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {selected.status === 'RESOLVED' ? (
                <ResolvedBanner
                    ticketId={selected.id}
                    statusUpdatingId={statusUpdatingId}
                    onReopen={() => onStatusChange(selected.id, 'IN_PROGRESS')}
                />
            ) : (
                <ReplyComposer
                    reply={reply}
                    sending={sending}
                    error={replyError}
                    isInternal={replyIsInternal}
                    onSetInternal={onSetInternal}
                    onReplyChange={onReplyChange}
                    onSendReply={onSendReply}
                />
            )}
        </section>
    );
}

function BookingSummary({
    selected,
    linkedBooking,
    bookingStatus,
    paymentStatus,
}: {
    selected: Ticket;
    linkedBooking: NonNullable<Ticket['linkedBooking']> | null;
    bookingStatus: { label: string; tone: string } | null;
    paymentStatus: { label: string; tone: string } | null;
}) {
    return (
        <div className={`col-span-2 rounded-2xl border p-3.5 ${linkedBooking ? 'border-primary/20 bg-primary/5' : selected.bookingRef ? 'border-orange-200 bg-orange-50' : 'border-outline-variant/30 bg-surface-container-low'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">Booking ref</p>
                            <p className="mt-1 font-mono text-sm font-black tracking-wide text-slate-950">{selected.bookingRef || 'Chưa liên kết booking'}</p>
                        </div>
                        {linkedBooking && (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100">
                                Đã khớp
                            </span>
                        )}
                    </div>

                    {linkedBooking && bookingStatus && paymentStatus ? (
                        <div className="mt-4 space-y-3">
                            <div>
                                <p className="line-clamp-2 text-sm font-black leading-5 text-slate-950">{linkedBooking.tourName}</p>
                                <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-semibold text-on-surface-variant">
                                    <span>Khởi hành {fmtDate(linkedBooking.departureDate ?? linkedBooking.tourStartDate)}</span>
                                    <span className="text-outline">·</span>
                                    <span>{linkedBooking.tourDuration}</span>
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-surface/80 p-2.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-outline">Đơn hàng</p>
                                    <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${bookingStatus.tone}`}>
                                        {bookingStatus.label}
                                    </span>
                                </div>
                                <div className="rounded-xl bg-surface/80 p-2.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-outline">Thanh toán</p>
                                    <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${paymentStatus.tone}`}>
                                        {paymentStatus.label}
                                    </span>
                                </div>
                                <div className="rounded-xl bg-surface/80 p-2.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-outline">Số khách</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{linkedBooking.numberOfPeople}</p>
                                </div>
                                <div className="rounded-xl bg-surface/80 p-2.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-outline">Tổng tiền</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{fmtMoney(linkedBooking.totalPrice)}</p>
                                </div>
                            </div>
                            <Link
                                href={`./bookings?search=${encodeURIComponent(linkedBooking.bookingCode)}`}
                                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-black text-on-primary transition hover:bg-primary-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                            >
                                Mở đơn đặt
                                <span className="material-symbols-outlined text-[17px]">open_in_new</span>
                            </Link>
                        </div>
                    ) : selected.bookingRef ? (
                        <div className="mt-3 rounded-xl border border-orange-200 bg-surface/80 p-3 text-xs font-semibold leading-5 text-orange-700">
                            Không tìm thấy đơn đặt tương ứng. Cần hỏi lại khách mã đặt chỗ chính xác.
                        </div>
                    ) : (
                        <p className="mt-2 text-xs font-semibold text-outline">Ticket này không yêu cầu đối soát đơn đặt.</p>
                    )}
                </div>
                <span className="material-symbols-outlined mt-0.5 text-[18px] text-outline">confirmation_number</span>
            </div>
        </div>
    );
}

type TimelineItem =
    | { type: 'reply'; data: Reply }
    | { type: 'audit'; data: AuditEvent };

function buildTimeline(replies: Reply[], audits: AuditEvent[]): TimelineItem[] {
    return [
        ...replies.map(r => ({ type: 'reply' as const, data: r })),
        ...audits.map(a => ({ type: 'audit' as const, data: a })),
    ].sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());
}

const STATUS_LABEL: Record<string, string> = {
    NEW: 'Mới',
    IN_PROGRESS: 'Đang xử lý',
    RESOLVED: 'Đã giải quyết',
};

function AuditEventItem({ event }: { event: AuditEvent }) {
    const meta = (event.meta ?? {}) as Record<string, string>;
    const label = event.eventType === 'ASSIGNED'
        ? `${event.actorName} đã nhận ticket`
        : `${event.actorName} đã chuyển sang ${STATUS_LABEL[meta.to] ?? meta.to ?? ''}`;
    return (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-outline">
            <span className="h-px flex-1 bg-outline-variant/30" />
            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">history</span>
            <span>{label} · {fmtTime(event.createdAt)}</span>
            <span className="h-px flex-1 bg-outline-variant/30" />
        </div>
    );
}

function CustomerMessage({ selected, avatarColor }: { selected: Ticket; avatarColor: string }) {
    const request = parseSupportRequestMessage(selected.message);

    return (
        <div className="flex max-w-[92%] gap-3">
            <div className={`mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarColor} text-[10px] font-black text-white`}>
                {getInitials(selected.customerName)}
            </div>
            <div className="flex flex-col items-start gap-1">
                <p className="ml-1 text-[11px] font-semibold text-outline">{selected.customerName} · {fmtTime(selected.createdAt)}</p>
                <div className="rounded-2xl rounded-bl-md border border-outline-variant/30 bg-surface px-4 py-3 text-sm leading-6 text-on-surface shadow-sm">
                    <FormattedTicketMessage message={request.message} />
                </div>
                {request.details.length > 0 && (
                    <RequestInfoPanel details={request.details} />
                )}
            </div>
        </div>
    );
}

function RequestInfoPanel({ details }: { details: Array<{ label: string; value: string }> }) {
    return (
        <section className="mt-2 w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">fact_check</span>
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-on-surface">Thông tin yêu cầu</h3>
            </div>
            <dl className="divide-y divide-outline-variant/30">
                {details.map((detail, index) => (
                    <div key={`${detail.label}-${index}`} className="grid gap-1 py-2 first:pt-0 last:pb-0">
                        <dt className="text-[11px] font-bold text-outline">{detail.label}</dt>
                        <dd className="break-words text-sm font-semibold leading-5 text-slate-950">{detail.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function FormattedTicketMessage({
    message,
    bulletClassName = 'bg-primary',
}: {
    message: string;
    bulletClassName?: string;
}) {
    const lines = formatSupportMessageLines(message);

    if (lines.length <= 1) {
        return <span>{lines[0] ?? message}</span>;
    }

    return (
        <ul className="space-y-1.5">
            {lines.map((line, index) => (
                <li key={`${line}-${index}`} className="flex items-start gap-2">
                    <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${bulletClassName}`} />
                    <span className="min-w-0 flex-1 break-words">{line}</span>
                </li>
            ))}
        </ul>
    );
}

function ResolvedBanner({
    ticketId,
    statusUpdatingId,
    onReopen,
}: {
    ticketId: number;
    statusUpdatingId: number | null;
    onReopen: () => void;
}) {
    const isUpdating = statusUpdatingId === ticketId;
    return (
        <div className="shrink-0 border-t border-outline-variant/30 bg-surface px-5 py-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-5 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-400" aria-hidden="true">check_circle</span>
                <div>
                    <p className="text-sm font-black text-on-surface">Ticket đã được giải quyết</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Mở lại để tiếp tục hỗ trợ khách hàng.</p>
                </div>
                <button
                    type="button"
                    onClick={onReopen}
                    disabled={isUpdating}
                    className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface px-4 text-sm font-black text-on-surface transition hover:bg-surface-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-wait disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-[17px] ${isUpdating ? 'animate-spin' : ''}`} aria-hidden="true">
                        {isUpdating ? 'progress_activity' : 'refresh'}
                    </span>
                    Mở lại ticket
                </button>
            </div>
        </div>
    );
}

function ReplyComposer({
    reply,
    sending,
    error,
    isInternal = false,
    onSetInternal,
    onReplyChange,
    onSendReply,
}: {
    reply: string;
    sending: boolean;
    error?: string;
    isInternal?: boolean;
    onSetInternal?: (v: boolean) => void;
    onReplyChange: (value: string) => void;
    onSendReply: () => void;
}) {
    const borderClass = isInternal
        ? 'border-amber-300 focus-within:border-amber-400 focus-within:ring-amber-100'
        : 'border-outline-variant/40 focus-within:border-primary/40 focus-within:ring-primary/10';
    const footerClass = isInternal
        ? 'border-amber-200 bg-amber-50'
        : 'border-outline-variant/30 bg-surface-container-low';

    return (
        <div className="shrink-0 border-t border-outline-variant/30 bg-surface px-5 py-4">
            {/* Tab toggle */}
            {onSetInternal && (
                <div className="mb-2 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onSetInternal(false)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
                            !isInternal ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">reply</span>
                        Trả lời khách
                    </button>
                    <button
                        type="button"
                        onClick={() => onSetInternal(true)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                            isInternal ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200' : 'text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">lock</span>
                        Ghi chú nội bộ
                    </button>
                </div>
            )}

            <div className={`overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-sm transition focus-within:ring-4 ${borderClass}`}>
                <label htmlFor="support-reply-content" className="sr-only">
                    {isInternal ? 'Ghi chú nội bộ' : 'Nội dung phản hồi'}
                </label>
                <textarea
                    id="support-reply-content"
                    name="supportReplyContent"
                    value={reply}
                    onChange={(event) => onReplyChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) onSendReply();
                    }}
                    placeholder={isInternal ? 'Ghi chú nội bộ — khách hàng không thấy…' : 'Soạn phản hồi…'}
                    rows={3}
                    className="block w-full resize-none border-none bg-transparent p-4 text-sm font-medium leading-6 text-on-surface outline-none placeholder:text-outline focus:ring-0"
                />
                {error && (
                    <div role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
                        {error}
                    </div>
                )}
                <div className={`flex items-center justify-between border-t px-3 py-2 ${footerClass}`}>
                    <p className="text-[11px] font-semibold text-outline">Ctrl + Enter để gửi</p>
                    {isInternal && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">visibility_off</span>
                            Khách không thấy
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onSendReply}
                        disabled={!reply.trim() || sending}
                        className={`inline-flex min-h-9 items-center gap-2 rounded-xl px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${
                            isInternal
                                ? 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-300'
                                : 'bg-primary text-on-primary hover:bg-primary-container focus-visible:ring-primary/20'
                        }`}
                    >
                        {sending && <span className="material-symbols-outlined text-[17px] animate-spin" aria-hidden="true">progress_activity</span>}
                        {isInternal ? 'Lưu ghi chú' : 'Gửi phản hồi'}
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                            {isInternal ? 'lock' : 'send'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

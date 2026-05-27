'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AVATAR_COLORS, CAT, STS } from '../_lib/config';
import { fmtDate, fmtMoney, fmtTime, formatSupportMessageLines, getInitials, resolveBookingStatus, resolvePaymentStatus } from '../_lib/helpers';
import type { Ticket, TicketStatus } from '../_lib/types';

interface SupportConversationPanelProps {
    selected: Ticket | null;
    reply: string;
    sending: boolean;
    statusUpdatingId: number | null;
    onStatusChange: (id: number, status: TicketStatus) => void;
    onReplyChange: (value: string) => void;
    onSendReply: () => void;
}

export function SupportConversationPanel({
    selected,
    reply,
    sending,
    statusUpdatingId,
    onStatusChange,
    onReplyChange,
    onSendReply,
}: SupportConversationPanelProps) {
    const threadRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }, [selected]);

    if (!selected) {
        return (
            <section className="hidden min-h-0 w-[440px] shrink-0 flex-col bg-surface-container-lowest lg:flex">
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
        <section className="hidden min-h-0 w-[440px] shrink-0 flex-col bg-surface-container-lowest lg:flex">
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

                {(selected.replies ?? []).map((item, index) => {
                    const staff = item.senderType === 'staff';
                    return (
                        <div key={item.id ?? `reply-${index}`} className={`flex max-w-[92%] gap-3 ${staff ? 'ml-auto justify-end' : ''}`}>
                            {!staff && (
                                <div className={`mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarColor} text-[10px] font-black text-white`}>
                                    {getInitials(selected.customerName)}
                                </div>
                            )}
                            <div className={`flex flex-col gap-1 ${staff ? 'items-end' : 'items-start'}`}>
                                <p className="mx-1 text-[11px] font-semibold text-outline">{item.senderName} · {fmtTime(item.createdAt)}</p>
                                <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                                    staff
                                        ? 'rounded-br-md bg-primary text-on-primary'
                                        : 'rounded-bl-md border border-outline-variant/30 bg-surface text-on-surface'
                                }`}>
                                    <FormattedTicketMessage
                                        message={item.content}
                                        bulletClassName={staff ? 'bg-white/85' : 'bg-primary'}
                                    />
                                </div>
                            </div>
                            {staff && (
                                <div className="mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-black text-on-primary">NV</div>
                            )}
                        </div>
                    );
                })}
            </div>

            <ReplyComposer
                reply={reply}
                sending={sending}
                onReplyChange={onReplyChange}
                onSendReply={onSendReply}
            />
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

function CustomerMessage({ selected, avatarColor }: { selected: Ticket; avatarColor: string }) {
    return (
        <div className="flex max-w-[92%] gap-3">
            <div className={`mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarColor} text-[10px] font-black text-white`}>
                {getInitials(selected.customerName)}
            </div>
            <div className="flex flex-col items-start gap-1">
                <p className="ml-1 text-[11px] font-semibold text-outline">{selected.customerName} · {fmtTime(selected.createdAt)}</p>
                <div className="rounded-2xl rounded-bl-md border border-outline-variant/30 bg-surface px-4 py-3 text-sm leading-6 text-on-surface shadow-sm">
                    <FormattedTicketMessage message={selected.message} />
                </div>
            </div>
        </div>
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

function ReplyComposer({
    reply,
    sending,
    onReplyChange,
    onSendReply,
}: {
    reply: string;
    sending: boolean;
    onReplyChange: (value: string) => void;
    onSendReply: () => void;
}) {
    return (
        <div className="shrink-0 border-t border-outline-variant/30 bg-surface px-5 py-4">
            <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm transition focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
                <label htmlFor="support-reply-content" className="sr-only">Nội dung phản hồi</label>
                <textarea
                    id="support-reply-content"
                    name="supportReplyContent"
                    value={reply}
                    onChange={(event) => onReplyChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) onSendReply();
                    }}
                    placeholder="Soạn phản hồi…"
                    rows={3}
                    className="block w-full resize-none border-none bg-transparent p-4 text-sm font-medium leading-6 text-on-surface outline-none placeholder:text-outline focus:ring-0"
                />
                <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container-low px-3 py-2">
                    <p className="text-[11px] font-semibold text-outline">Ctrl + Enter để gửi</p>
                    <button
                        type="button"
                        onClick={onSendReply}
                        disabled={!reply.trim() || sending}
                        className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-on-primary transition hover:bg-primary-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {sending ? <span className="material-symbols-outlined text-[17px] animate-spin" aria-hidden="true">progress_activity</span> : null}
                        Gửi phản hồi
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

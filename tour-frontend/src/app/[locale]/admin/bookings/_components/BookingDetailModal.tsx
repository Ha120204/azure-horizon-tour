'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { API_BASE_URL } from '@/lib/constants';
import {
  AVATAR_COLORS,
  CONFIRMED_SOURCE_LABEL,
  PAYMENT_METHOD_CFG,
  PAY_CFG,
  STATUS_CFG,
} from '../_lib/config';
import { fmt, fmtDateTime, getErrorMessage, getInitials } from '../_lib/helpers';
import type { Booking, PaymentTransaction } from '../_lib/types';

function getVisibleTransactions(
  booking: Booking,
  currentGateway: 'MANUAL' | 'PAYOS',
  hasSuccessfulCurrentGateway: boolean,
): PaymentTransaction[] {
  const seenOpenPayos = new Set<string>();
  return [...(booking.transactions ?? [])]
    .sort((a, b) => {
      const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return createdDiff || b.id - a.id;
    })
    .filter((tx) => {
      if (tx.status === 'SUCCESS') return true;
      if (
        booking.paymentStatus === 'PAID' &&
        tx.gateway === currentGateway &&
        tx.status === 'PENDING' &&
        hasSuccessfulCurrentGateway
      ) {
        return false;
      }
      if (booking.paymentMethod === 'IN_STORE' && tx.gateway !== 'MANUAL') return false;
      if (booking.paymentMethod === 'PAYOS' && tx.gateway !== 'PAYOS') return false;

      if (tx.gateway === 'PAYOS' && tx.status === 'PENDING') {
        const key = `${tx.gateway}:${tx.status}:${Math.round(Number(tx.amount) || 0)}`;
        if (seenOpenPayos.has(key)) return false;
        seenOpenPayos.add(key);
      }

      return true;
    });
}

// ─── Booking Detail Modal ─────────────────────────────────────────────────────

export function BookingDetailModal({
  booking,
  onClose,
  onConfirmSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onConfirmSuccess: (updated: Booking) => void | Promise<void>;
}) {
  const sc = STATUS_CFG[booking.status] ?? STATUS_CFG.PENDING;
  const pc = PAY_CFG[booking.paymentStatus] ?? PAY_CFG.UNPAID;
  const colorIdx = booking.user.id % AVATAR_COLORS.length;
  const latestPaymentRequest = booking.paymentMethod === 'PAYOS' && booking.paymentStatus !== 'PAID'
    ? booking.notifications?.[0]
    : undefined;
  const discountAmount = Math.max(0, Number(booking.discountAmount) || 0);
  const subtotalBeforeDiscount = booking.totalPrice + discountAmount;
  const hasDiscount = discountAmount > 0;

  const mc = PAYMENT_METHOD_CFG[booking.paymentMethod] ?? PAYMENT_METHOD_CFG.PAYOS;

  // ── IN_STORE form state
  const [inStoreMethod, setInStoreMethod] = useState<'CASH'|'BANK_TRANSFER'|'CARD_POS'>('CASH');
  const [inStoreNote, setInStoreNote] = useState('');
  const [inStoreRef, setInStoreRef] = useState('');
  const [isConfirmingInStore, setIsConfirmingInStore] = useState(false);
  const [showInStoreForm, setShowInStoreForm] = useState(false);

  // ── PayOS reconcile form state
  const [showReconcileForm, setShowReconcileForm] = useState(false);
  const [reconcileTxRef, setReconcileTxRef] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [isSyncingPayos, setIsSyncingPayos] = useState(false);

  const [actionError, setActionError] = useState('');

  const isPending = booking.status === 'PENDING';
  const isUnpaidOrProcessing = booking.paymentStatus === 'UNPAID' || booking.paymentStatus === 'PROCESSING';
  const openPaymentTicket = booking.supportTickets?.find(t => t.category === 'payment' && ['NEW','IN_PROGRESS'].includes(t.status));
  const currentGateway = booking.paymentMethod === 'IN_STORE' ? 'MANUAL' : 'PAYOS';
  const hasSuccessfulCurrentGateway = (booking.transactions ?? []).some((tx) =>
    tx.gateway === currentGateway && tx.status === 'SUCCESS',
  );
  const visibleTransactions = getVisibleTransactions(booking, currentGateway, hasSuccessfulCurrentGateway);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showInStoreForm) { setShowInStoreForm(false); return; }
        if (showReconcileForm) { setShowReconcileForm(false); return; }
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose, showInStoreForm, showReconcileForm]);

  const handleConfirmInStore = async () => {
    setIsConfirmingInStore(true); setActionError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/payments/in-store/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionMethod: inStoreMethod, receiptRef: inStoreRef || undefined, note: inStoreNote || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Xác nhận thất bại');
      await onConfirmSuccess({ ...booking, status: 'CONFIRMED', paymentStatus: 'PAID' });
      setShowInStoreForm(false);
    } catch (e: unknown) { setActionError(getErrorMessage(e, 'Có lỗi xảy ra')); }
    finally { setIsConfirmingInStore(false); }
  };

  const handleSyncPayos = async () => {
    setIsSyncingPayos(true); setActionError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/payments/payos/sync`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Sync thất bại');
      const data = json?.data ?? json;
      if (data?.synced) await onConfirmSuccess({ ...booking, status: 'CONFIRMED', paymentStatus: 'PAID' });
      else setActionError(data?.message ?? 'PayOS chưa ghi nhận thanh toán.');
    } catch (e: unknown) { setActionError(getErrorMessage(e, 'Không kết nối được PayOS')); }
    finally { setIsSyncingPayos(false); }
  };

  const handleReconcile = async () => {
    if (!reconcileTxRef.trim()) { setActionError('Mã giao dịch là bắt buộc'); return; }
    if (!reconcileNote.trim() || reconcileNote.trim().length < 5) { setActionError('Ghi chú tối thiểu 5 ký tự'); return; }
    setIsReconciling(true); setActionError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/payments/payos/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionRef: reconcileTxRef.trim(), amount: booking.totalPrice, note: reconcileNote.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Đối soát thất bại');
      await onConfirmSuccess({ ...booking, status: 'CONFIRMED', paymentStatus: 'PAID' });
      setShowReconcileForm(false);
    } catch (e: unknown) { setActionError(getErrorMessage(e, 'Có lỗi xảy ra')); }
    finally { setIsReconciling(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bk-modal-title">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={showInStoreForm || showReconcileForm ? undefined : onClose} />


      <div className="relative bg-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden overscroll-contain animate-fade-slide-up">

        {/* ── Header gradient ── */}
        <div className="relative bg-gradient-to-br from-primary to-secondary p-6 pb-8 shrink-0 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 10% 80%, white 1px, transparent 1px), radial-gradient(circle at 90% 20%, white 1px, transparent 1px)',
            backgroundSize: '45px 45px, 35px 35px',
          }} />
          <button onClick={onClose} aria-label="Đóng"
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors focus-visible:ring-2 focus-visible:ring-white/80">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          <div className="flex flex-col gap-4 pr-12 sm:flex-row sm:items-start">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-2xl">receipt_long</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Chi tiết đơn đặt tour</p>
              <h2 id="bk-modal-title" className="text-xl font-bold text-white font-mono tracking-widest break-words">{booking.bookingCode}</h2>
              <p className="text-white/60 text-xs mt-1.5">{fmtDateTime(booking.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 sm:flex-col sm:items-end">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${sc.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${pc.badge}`}>
                <span className="material-symbols-outlined text-[12px]">{pc.icon}</span>
                {pc.label}
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Khách hàng */}
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[14px]">person</span>
                Thông tin khách hàng
              </h3>
              <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                {booking.user.avatarUrl ? (
                  <Image
                    src={booking.user.avatarUrl}
                    alt={booking.user.fullName}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {getInitials(booking.user.fullName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-on-surface">{booking.user.fullName}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5 break-words">{booking.user.email}</p>
                  <p className="text-xs text-on-surface-variant/50 font-mono mt-0.5">Mã khách hàng #{booking.user.id}</p>
                </div>
              </div>
            </section>

            {/* Tour */}
            {booking.tour && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[14px]">map</span>
                  Tour đã đặt
                </h3>
                <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                  <div className="w-16 h-14 rounded-xl overflow-hidden bg-surface-container shrink-0">
                    {booking.tour.imageUrl
                      ? (
                        <Image
                          src={booking.tour.imageUrl}
                          alt={booking.tour.name}
                          width={64}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      )
                      : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-outline">image</span></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-on-surface truncate">{booking.tour.name}</p>
                    {booking.tour.destination && (
                      <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {booking.tour.destination.name}
                      </p>
                    )}
                    <p className="text-xs font-mono text-on-surface-variant/50 mt-0.5">{booking.tour.tourCode}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Chi tiết giá */}
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[14px]">payments</span>
                Chi tiết thanh toán
              </h3>
              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
                <div className="divide-y divide-outline-variant/10">
                  <div className="flex justify-between items-center px-5 py-3.5">
                    <span className="text-sm text-on-surface-variant">Số người</span>
                    <span className="font-semibold text-on-surface">{booking.numberOfPeople} người</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3.5">
                    <span className="text-sm text-on-surface-variant">Đơn giá tại thời điểm đặt</span>
                    <span className="font-semibold text-on-surface">{fmt(booking.unitPriceAtBooking)}/người</span>
                  </div>
                  {hasDiscount && (
                    <div className="flex justify-between items-center px-5 py-3.5">
                      <span className="text-sm text-on-surface-variant">Tạm tính trước ưu đãi</span>
                      <span className="font-semibold text-on-surface">{fmt(subtotalBeforeDiscount)}</span>
                    </div>
                  )}
                  {(booking.voucherCode || hasDiscount) && (
                    <div className="flex justify-between items-center px-5 py-3.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-sm text-on-surface-variant">Voucher áp dụng</span>
                        {booking.voucherCode && (
                          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold truncate">{booking.voucherCode}</span>
                        )}
                      </div>
                      <span className="font-semibold text-emerald-600 shrink-0">
                        {hasDiscount ? `- ${fmt(discountAmount)}` : 'Không giảm'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-5 py-4 bg-primary/5">
                    <span className="font-bold text-on-surface">Tổng thanh toán</span>
                    <span className="text-xl font-extrabold text-primary">{fmt(booking.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </section>

            {latestPaymentRequest && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[14px]">qr_code_2</span>
                  Yêu cầu thanh toán
                </h3>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-blue-200 bg-white text-blue-700">
                      {latestPaymentRequest.channel}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      latestPaymentRequest.status === 'FAILED'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : latestPaymentRequest.status === 'SENT'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      {latestPaymentRequest.status}
                    </span>
                  </div>
                  {latestPaymentRequest.errorMessage && (
                    <p className="mt-3 text-xs font-semibold text-red-600">{latestPaymentRequest.errorMessage}</p>
                  )}
                  {latestPaymentRequest.paymentUrl && (
                    <a
                      href={latestPaymentRequest.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Mở link thanh toán
                    </a>
                  )}
                  <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 border border-blue-100">
                    {latestPaymentRequest.content}
                  </pre>
                </div>
              </section>
            )}

            {/* ── Payment Timeline ── */}
            {visibleTransactions.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[14px]">timeline</span>
                  Lịch sử giao dịch
                </h3>
                <div className="space-y-2">
                  {visibleTransactions.map((tx) => {
                    const displayStatus = tx.status;
                    const isSuccess = displayStatus === 'SUCCESS';
                    const isFailed = displayStatus === 'FAILED';
                    const srcLabel = CONFIRMED_SOURCE_LABEL[tx.confirmedSource ?? ''] ?? tx.confirmedSource ?? null;
                    const statusLabel = isSuccess ? 'Đã ghi nhận' : isFailed ? 'Không hiệu lực' : 'Chờ thanh toán';
                    return (
                      <div key={tx.id} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${isSuccess ? 'bg-emerald-50 border-emerald-100' : isFailed ? 'bg-red-50 border-red-100' : 'bg-surface-container border-outline-variant/10'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isSuccess ? 'bg-emerald-100' : isFailed ? 'bg-red-100' : 'bg-amber-100'}`}>
                          <span className={`material-symbols-outlined text-[14px] ${isSuccess ? 'text-emerald-600' : isFailed ? 'text-red-500' : 'text-amber-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {isSuccess ? 'check_circle' : isFailed ? 'cancel' : 'pending'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-on-surface">{tx.gateway} · {statusLabel}</span>
                            <span className={`font-bold ${isSuccess ? 'text-emerald-600' : isFailed ? 'text-red-500' : 'text-amber-600'}`}>{fmt(tx.amount)}</span>
                          </div>
                          {tx.transactionRef && <p className="text-on-surface-variant/60 font-mono mt-0.5 truncate">Ref: {tx.transactionRef}</p>}
                          {srcLabel && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-white/70 border border-outline-variant/20 text-on-surface-variant font-medium">
                              <span className="material-symbols-outlined text-[11px]">info</span>{srcLabel}
                            </span>
                          )}
                          {tx.confirmedNote && <p className="mt-1 text-on-surface-variant/70 italic line-clamp-2">{tx.confirmedNote}</p>}
                          <p className="mt-1 text-on-surface-variant/50">{fmtDateTime(tx.confirmedAt ?? tx.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Support Tickets ── */}
            {booking.supportTickets && booking.supportTickets.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[14px]">support_agent</span>
                  Ticket hỗ trợ thanh toán
                </h3>
                <div className="space-y-2">
                  {booking.supportTickets.map((ticket) => {
                    const isOpen = ['NEW', 'IN_PROGRESS'].includes(ticket.status);
                    return (
                      <div key={ticket.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs ${isOpen ? 'bg-purple-50 border-purple-100' : 'bg-surface-container border-outline-variant/10'}`}>
                        <span className={`material-symbols-outlined text-[16px] ${isOpen ? 'text-purple-600 animate-pulse' : 'text-outline'}`}>
                          {isOpen ? 'support_agent' : 'task_alt'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface truncate">{ticket.subject ?? `Ticket #${ticket.id}`}</p>
                          <p className="text-on-surface-variant/50 mt-0.5">{fmtDateTime(ticket.createdAt)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${isOpen ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {ticket.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        </div>


        {/* ── Footer — context-aware theo paymentMethod ── */}
        <div className="px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest/50 shrink-0">

          {/* Error banner */}
          {actionError && (
            <div className="mb-3 px-4 py-2.5 bg-error/10 text-error rounded-xl text-sm font-medium border border-error/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {actionError}
              <button onClick={() => setActionError('')} className="ml-auto opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-sm">close</span></button>
            </div>
          )}

          {/* ── CASE: ĐÃ THANH TOÁN ── */}
          {booking.paymentStatus === 'PAID' ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <div>
                  <p className="text-sm font-bold">Đã thanh toán</p>
                  {booking.transactions?.[0]?.confirmedSource && (
                    <p className="text-xs text-emerald-600/70">
                      {CONFIRMED_SOURCE_LABEL[booking.transactions[0].confirmedSource] ?? booking.transactions[0].confirmedSource}
                      {booking.transactions[0].confirmedAt && ` · ${fmtDateTime(booking.transactions[0].confirmedAt)}`}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
            </div>
          ) : isPending && isUnpaidOrProcessing ? (
            /* ── CASE: PENDING + chờ thanh toán ── */
            <div className="space-y-3">

              {/* Badge phương thức thanh toán */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${mc.badge}`}>
                  <span className="material-symbols-outlined text-[13px]">{mc.icon}</span>
                  {mc.label}
                </span>
                {booking.paymentStatus === 'PROCESSING' && openPaymentTicket && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <span className="material-symbols-outlined text-[13px]">support_agent</span>
                    Ticket #{openPaymentTicket.id} đang mở
                  </span>
                )}
              </div>

              {/* IN_STORE actions */}
              {booking.paymentMethod === 'IN_STORE' && !showInStoreForm && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setShowInStoreForm(true); setActionError(''); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>point_of_sale</span>
                    Ghi nhận thu tại quầy
                  </button>
                  <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
                </div>
              )}

              {/* IN_STORE form */}
              {booking.paymentMethod === 'IN_STORE' && showInStoreForm && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">storefront</span>
                    Ghi nhận thu tại cửa hàng
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-emerald-700 mb-1.5 block">Cách thu tiền</label>
                    <div className="flex gap-2 flex-wrap">
                      {([['CASH','Tiền mặt','payments'],['BANK_TRANSFER','Chuyển khoản','account_balance'],['CARD_POS','Thẻ POS','credit_card']] as const).map(([val,lbl,ico]) => (
                        <button key={val} onClick={() => setInStoreMethod(val)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${inStoreMethod === val ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'}`}>
                          <span className="material-symbols-outlined text-[14px]">{ico}</span>{lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-emerald-700 mb-1 block">Mã biên nhận / ghi chú (tùy chọn)</label>
                    <input value={inStoreRef} onChange={e => setInStoreRef(e.target.value)} placeholder="VD: BILL-2024-001..."
                      className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-emerald-700 mb-1 block">Ghi chú nội bộ (tùy chọn)</label>
                    <input value={inStoreNote} onChange={e => setInStoreNote(e.target.value)} placeholder="Ghi chú thêm..."
                      className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setShowInStoreForm(false); setActionError(''); }}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">
                      Hủy
                    </button>
                    <button onClick={handleConfirmInStore} disabled={isConfirmingInStore}
                      className="flex-1 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none">
                      {isConfirmingInStore ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</> : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>Xác nhận đã thu</>}
                    </button>
                  </div>
                </div>
              )}

              {/* PayOS actions */}
              {booking.paymentMethod === 'PAYOS' && !showReconcileForm && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleSyncPayos} disabled={isSyncingPayos}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-60 transition-colors outline-none">
                      <span className={`material-symbols-outlined text-[16px] ${isSyncingPayos ? 'animate-spin' : ''}`}>sync</span>
                      {isSyncingPayos ? 'Đang kiểm tra…' : 'Kiểm tra PayOS'}
                    </button>
                    <button onClick={() => { setShowReconcileForm(true); setActionError(''); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors outline-none">
                      <span className="material-symbols-outlined text-[16px]">find_in_page</span>
                      Đối soát thủ công
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
                  </div>
                </div>
              )}

              {/* PayOS reconcile form */}
              {booking.paymentMethod === 'PAYOS' && showReconcileForm && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">receipt_long</span>
                    Đối soát thanh toán thủ công
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-1 block">Mã tham chiếu giao dịch <span className="text-error">*</span></label>
                    <input value={reconcileTxRef} onChange={e => setReconcileTxRef(e.target.value)} placeholder="VD: VCB12345678..."
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-1 block">Ghi chú xác nhận <span className="text-error">*</span></label>
                    <textarea value={reconcileNote} onChange={e => setReconcileNote(e.target.value)} rows={2} placeholder="VD: Đã xem ảnh CK khớp với hóa đơn, xác nhận thu đủ 5.500.000đ..."
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 resize-none" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setShowReconcileForm(false); setActionError(''); }}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">
                      Hủy
                    </button>
                    <button onClick={handleReconcile} disabled={isReconciling}
                      className="flex-1 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none">
                      {isReconciling ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</> : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>Xác nhận đối soát</>}
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* ── CASE: Đã xác nhận hoặc huỷ ── */
            <div className="flex justify-end">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

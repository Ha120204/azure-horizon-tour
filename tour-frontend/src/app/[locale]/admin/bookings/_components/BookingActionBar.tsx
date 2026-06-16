'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { CONFIRMED_SOURCE_LABEL } from '../_lib/config';
import { canRemindPayment, fmtDateTime, getErrorMessage, getVisibleTransactions } from '../_lib/helpers';
import type { Booking, BookingConfirmSource } from '../_lib/types';
import { BookingEditForm } from './BookingEditForm';

// ─── Booking Action Bar ───────────────────────────────────────────────────────
// Renders the modal footer: feedback banners, quick-action buttons, and the
// context-aware primary action area (paid confirmation, payment forms, or close).

export function BookingActionBar({
  booking,
  isAdmin,
  canWrite,
  showInStoreForm,
  showReconcileForm,
  onShowInStoreForm,
  onHideInStoreForm,
  onShowReconcileForm,
  onHideReconcileForm,
  onConfirmSuccess,
  onCopyPaymentRequest,
  onResendPaymentRequest,
  onClose,
}: {
  booking: Booking;
  isAdmin: boolean;
  canWrite: boolean;
  showInStoreForm: boolean;
  showReconcileForm: boolean;
  onShowInStoreForm: () => void;
  onHideInStoreForm: () => void;
  onShowReconcileForm: () => void;
  onHideReconcileForm: () => void;
  onConfirmSuccess: (updated: Booking, source?: BookingConfirmSource) => void | Promise<void>;
  onCopyPaymentRequest?: (booking: Booking) => void | Promise<void>;
  onResendPaymentRequest?: (booking: Booking, forceEmail?: boolean) => void | Promise<void>;
  onClose: () => void;
}) {
  const isPending = booking.status === 'PENDING';
  const isUnpaidOrProcessing = booking.paymentStatus === 'UNPAID' || booking.paymentStatus === 'PROCESSING';
  const latestPaymentRequest = booking.paymentMethod === 'PAYOS' && booking.paymentStatus !== 'PAID'
    ? booking.notifications?.[0]
    : undefined;
  const canResendPaymentRequest = canRemindPayment(booking);
  const hasPaymentRequestContent = Boolean(latestPaymentRequest?.content);
  const currentGateway = booking.paymentMethod === 'IN_STORE' ? 'MANUAL' : 'PAYOS';
  const hasSuccessfulCurrentGateway = (booking.transactions ?? []).some(
    tx => tx.gateway === currentGateway && tx.status === 'SUCCESS',
  );
  const visibleTransactions = getVisibleTransactions(booking, currentGateway, hasSuccessfulCurrentGateway);
  const contactPhone = booking.contactPhone ?? booking.user.phone ?? '';

  const refundAmount = Math.max(0, Number(booking.refundAmount) || 0);
  const canConfirmRefund =
    isAdmin && canWrite && booking.status === 'CANCELLED' && refundAmount > 0 && !booking.refundedAt;

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const clearFeedback = () => { setActionError(''); setActionSuccess(''); };

  const handleConfirmRefund = async () => {
    clearFeedback();
    if (!canConfirmRefund) return;
    const ok = window.confirm(
      `Xác nhận ĐÃ chuyển khoản hoàn ${refundAmount.toLocaleString('vi-VN')}đ cho khách?\n` +
      'Thao tác này ghi nhận khoản hoàn đã hoàn tất và không thể hoàn tác.',
    );
    if (!ok) return;
    setIsRefunding(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/confirm-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Không xác nhận được hoàn tiền');
      await onConfirmSuccess(booking, 'REFUND');
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, 'Không xác nhận được hoàn tiền'));
    } finally {
      setIsRefunding(false);
    }
  };

  const handleCopyBookingCode = async () => {
    clearFeedback();
    try {
      await navigator.clipboard.writeText(booking.bookingCode);
      setActionSuccess('Đã sao chép mã đơn.');
    } catch {
      setActionError('Không sao chép được mã đơn. Vui lòng copy thủ công.');
    }
  };

  const handleCopyPaymentRequest = async () => {
    clearFeedback();
    if (onCopyPaymentRequest) { await onCopyPaymentRequest(booking); return; }
    if (!latestPaymentRequest?.content) {
      setActionError('Đơn này chưa có nội dung thanh toán để sao chép.');
      return;
    }
    try {
      await navigator.clipboard.writeText(latestPaymentRequest.content);
      setActionSuccess('Đã sao chép nội dung gửi khách.');
    } catch {
      setActionError('Không sao chép được nội dung thanh toán.');
    }
  };

  const handleResendPaymentRequest = async (forceEmail = false) => {
    clearFeedback();
    if (!canResendPaymentRequest) {
      setActionError('Chỉ có thể gửi lại yêu cầu thanh toán cho đơn PayOS đang chờ thanh toán.');
      return;
    }
    if (onResendPaymentRequest) { await onResendPaymentRequest(booking, forceEmail); return; }
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/resend-payment-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Không gửi lại được yêu cầu thanh toán');
      setActionSuccess(forceEmail ? 'Đã gửi lại email thanh toán.' : 'Đã tạo lại yêu cầu thanh toán.');
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, 'Không gửi lại được yêu cầu thanh toán'));
    }
  };

  const handleViewPaymentHistory = () => {
    document.getElementById('booking-payment-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCreateAgain = () => {
    window.dispatchEvent(new CustomEvent('booking:create-assisted-draft', {
      detail: {
        bookingCode: booking.bookingCode,
        customerName: booking.user.fullName,
        customerEmail: booking.user.email,
        customerPhone: contactPhone,
        tourId: booking.tour?.id,
        numberOfPeople: booking.numberOfPeople,
        voucherCode: booking.voucherCode ?? '',
        internalNote: `Tạo lại từ đơn ${booking.bookingCode}`,
      },
    }));
    onClose();
  };

  return (
    <div className="max-h-[42vh] shrink-0 overflow-y-auto overscroll-contain border-t border-outline-variant/10 bg-surface-container-lowest/50 px-6 py-4">

      {/* Feedback banners */}
      {actionError && (
        <div className="mb-3 px-4 py-2.5 bg-error/10 text-error rounded-xl text-sm font-medium border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {actionError}
          <button onClick={() => setActionError('')} className="ml-auto opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
      )}
      {actionSuccess && (
        <div className="mb-3 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          {actionSuccess}
          <button onClick={() => setActionSuccess('')} className="ml-auto opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
      )}

      {/* Quick action buttons */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopyBookingCode}
          className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/20 bg-white px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="material-symbols-outlined text-[15px]">content_copy</span>
          Sao chép mã đơn
        </button>
        {hasPaymentRequestContent && (
          <button
            type="button"
            onClick={handleCopyPaymentRequest}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <span className="material-symbols-outlined text-[15px]">request_quote</span>
            Copy thanh toán
          </button>
        )}
        {canResendPaymentRequest && canWrite && (
          <>
            <button
              type="button"
              onClick={() => void handleResendPaymentRequest(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <span className="material-symbols-outlined text-[15px]">notifications_active</span>
              Gửi lại thông báo
            </button>
            <button
              type="button"
              onClick={() => void handleResendPaymentRequest(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <span className="material-symbols-outlined text-[15px]">mail</span>
              Gửi email
            </button>
          </>
        )}
        {visibleTransactions.length > 0 && (
          <button
            type="button"
            onClick={handleViewPaymentHistory}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <span className="material-symbols-outlined text-[15px]">manage_search</span>
            Xem lịch sử thanh toán
          </button>
        )}
        {(booking.status === 'CANCELLED' || booking.paymentStatus === 'FAILED') && canWrite && (
          <button
            type="button"
            onClick={handleCreateAgain}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span className="material-symbols-outlined text-[15px]">add_circle</span>
            Tạo lại đơn
          </button>
        )}
      </div>

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
      ) : isPending && isUnpaidOrProcessing && canWrite ? (
        /* ── CASE: PENDING + chờ thanh toán (chỉ người có quyền ghi) ── */
        <BookingEditForm
          booking={booking}
          isAdmin={isAdmin}
          showInStoreForm={showInStoreForm}
          showReconcileForm={showReconcileForm}
          onShowInStoreForm={() => { setActionError(''); onShowInStoreForm(); }}
          onHideInStoreForm={() => { setActionError(''); onHideInStoreForm(); }}
          onShowReconcileForm={() => { setActionError(''); onShowReconcileForm(); }}
          onHideReconcileForm={() => { setActionError(''); onHideReconcileForm(); }}
          onConfirmSuccess={onConfirmSuccess}
          setActionError={setActionError}
          onClose={onClose}
        />
      ) : (
        /* ── CASE: Đã xác nhận hoặc huỷ ── */
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canConfirmRefund && (
            <button
              type="button"
              onClick={() => void handleConfirmRefund()}
              disabled={isRefunding}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[17px]">{isRefunding ? 'progress_activity' : 'assignment_returned'}</span>
              {isRefunding ? 'Đang ghi nhận…' : 'Đánh dấu đã hoàn tiền'}
            </button>
          )}
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
        </div>
      )}

    </div>
  );
}

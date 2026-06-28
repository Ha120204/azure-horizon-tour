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
  canRecordPayment,
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
  canRecordPayment?: boolean;
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
  // STAFF có thể ghi nhận thanh toán tại quầy; fallback về canWrite nếu prop không truyền.
  const effectiveCanRecordPayment = canRecordPayment ?? canWrite;
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
  const canHandleCancelRequest =
    isAdmin && canWrite && booking.status === 'CANCEL_REQUESTED';

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [cancelMode, setCancelMode] = useState<'approve' | 'reject' | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  const clearFeedback = () => { setActionError(''); setActionSuccess(''); };

  const handleConfirmRefund = async () => {
    setShowRefundConfirm(false);
    clearFeedback();
    if (!canConfirmRefund) return;
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

  const handleApproveCancel = async () => {
    clearFeedback();
    setIsProcessingCancel(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/approve-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: cancelNote.trim() || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? 'Không duyệt được yêu cầu hủy');
      setCancelMode(null);
      setCancelNote('');
      await onConfirmSuccess(booking);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, 'Không duyệt được yêu cầu hủy'));
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handleRejectCancel = async () => {
    clearFeedback();
    const reason = cancelNote.trim();
    if (reason.length < 10) {
      setActionError('Lý do từ chối phải có ít nhất 10 ký tự');
      return;
    }
    setIsProcessingCancel(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/reject-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectReason: reason }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? 'Không từ chối được yêu cầu hủy');
      setCancelMode(null);
      setCancelNote('');
      await onConfirmSuccess(booking);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, 'Không từ chối được yêu cầu hủy'));
    } finally {
      setIsProcessingCancel(false);
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
        {canResendPaymentRequest && effectiveCanRecordPayment && (
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
        {(booking.status === 'CANCELLED' || booking.paymentStatus === 'FAILED') && effectiveCanRecordPayment && (
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

      {/* ── CASE: CHỜ DUYỆT HỦY (admin duyệt / từ chối) ── */}
      {canHandleCancelRequest ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-orange-700">
            <span className="material-symbols-outlined text-xl mt-0.5">assignment_late</span>
            <div>
              <p className="text-sm font-bold">Yêu cầu hủy đang chờ xử lý</p>
              <p className="text-xs text-orange-600/80">
                {refundAmount > 0 ? `Khoản hoàn dự kiến: ${refundAmount.toLocaleString('vi-VN')}đ` : 'Không phát sinh hoàn tiền'}
                {booking.cancelReason ? ` · Lý do khách: ${booking.cancelReason}` : ''}
              </p>
            </div>
          </div>

          {!cancelMode ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { clearFeedback(); setCancelNote(''); setCancelMode('reject'); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors outline-none"
              >
                <span className="material-symbols-outlined text-[17px]">cancel</span>
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => { clearFeedback(); setCancelNote(''); setCancelMode('approve'); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors outline-none"
              >
                <span className="material-symbols-outlined text-[17px]">check_circle</span>
                Duyệt hủy
              </button>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
            </div>
          ) : cancelMode === 'approve' ? (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Duyệt sẽ hủy đơn và nhả ghế.{refundAmount > 0 ? ' Sau đó hãy chuyển khoản cho khách rồi bấm "Đánh dấu đã hoàn tiền".' : ''}
              </p>
              <input
                type="text"
                placeholder="Ghi chú duyệt (không bắt buộc)"
                value={cancelNote}
                onChange={e => setCancelNote(e.target.value)}
                className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCancelMode(null)} disabled={isProcessingCancel} className="px-4 py-2 rounded-lg bg-white border text-slate-500 text-sm hover:bg-slate-50 font-medium disabled:opacity-60">Quay lại</button>
                <button type="button" onClick={handleApproveCancel} disabled={isProcessingCancel} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60">
                  {isProcessingCancel ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-base">check</span>}
                  Xác nhận duyệt
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-3">
              <input
                type="text"
                placeholder="Lý do từ chối (ít nhất 10 ký tự) *"
                value={cancelNote}
                onChange={e => setCancelNote(e.target.value)}
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCancelMode(null)} disabled={isProcessingCancel} className="px-4 py-2 rounded-lg bg-white border text-slate-500 text-sm hover:bg-slate-50 font-medium disabled:opacity-60">Quay lại</button>
                <button type="button" onClick={handleRejectCancel} disabled={isProcessingCancel} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60">
                  {isProcessingCancel ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-base">close</span>}
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          )}
        </div>
      ) : booking.paymentStatus === 'PAID' ? (
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
      ) : isPending && isUnpaidOrProcessing && effectiveCanRecordPayment ? (
        /* ── CASE: PENDING + chờ thanh toán (ADMIN hoặc STAFF có thể ghi nhận) ── */
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
              onClick={() => { clearFeedback(); setShowRefundConfirm(true); }}
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

      {/* Modal xác nhận đã hoàn tiền — thay window.confirm */}
      {showRefundConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRefundConfirm(false); }}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-start gap-3 px-6 pt-6">
              <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">assignment_returned</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Xác nhận đã hoàn tiền</h3>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Bạn đã <strong>chuyển khoản hoàn {refundAmount.toLocaleString('vi-VN')}đ</strong> cho khách?
                  Thao tác này ghi nhận khoản hoàn đã hoàn tất và <strong>không thể hoàn tác</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-5">
              <button
                type="button"
                onClick={() => setShowRefundConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRefund()}
                disabled={isRefunding}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRefunding ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[17px]">check</span>}
                Xác nhận đã hoàn
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { PAYMENT_METHOD_CFG } from '../_lib/config';
import { getErrorMessage } from '../_lib/helpers';
import type { Booking } from '../_lib/types';

// ─── Booking Edit Form ────────────────────────────────────────────────────────
// Renders the payment-action section for PENDING + unpaid/processing bookings:
// payment method badge, IN_STORE collection form, PayOS sync + reconcile form.

export function BookingEditForm({
  booking,
  showInStoreForm,
  showReconcileForm,
  onShowInStoreForm,
  onHideInStoreForm,
  onShowReconcileForm,
  onHideReconcileForm,
  onConfirmSuccess,
  setActionError,
  onClose,
}: {
  booking: Booking;
  showInStoreForm: boolean;
  showReconcileForm: boolean;
  onShowInStoreForm: () => void;
  onHideInStoreForm: () => void;
  onShowReconcileForm: () => void;
  onHideReconcileForm: () => void;
  onConfirmSuccess: (updated: Booking) => void | Promise<void>;
  setActionError: (error: string) => void;
  onClose: () => void;
}) {
  const mc = PAYMENT_METHOD_CFG[booking.paymentMethod] ?? PAYMENT_METHOD_CFG.PAYOS;
  const openPaymentTicket = booking.supportTickets?.find(
    t => t.category === 'payment' && ['NEW', 'IN_PROGRESS'].includes(t.status),
  );

  // ── IN_STORE form state
  const [inStoreMethod, setInStoreMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CARD_POS'>('CASH');
  const [inStoreNote, setInStoreNote] = useState('');
  const [inStoreRef, setInStoreRef] = useState('');
  const [isConfirmingInStore, setIsConfirmingInStore] = useState(false);

  // ── PayOS reconcile form state
  const [reconcileTxRef, setReconcileTxRef] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [isSyncingPayos, setIsSyncingPayos] = useState(false);

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
      onHideInStoreForm();
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
      onHideReconcileForm();
    } catch (e: unknown) { setActionError(getErrorMessage(e, 'Có lỗi xảy ra')); }
    finally { setIsReconciling(false); }
  };

  return (
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

      {/* ── IN_STORE: nút mở form ── */}
      {booking.paymentMethod === 'IN_STORE' && !showInStoreForm && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onShowInStoreForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>point_of_sale</span>
            Ghi nhận thu tại quầy
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
        </div>
      )}

      {/* ── IN_STORE: form thu tiền ── */}
      {booking.paymentMethod === 'IN_STORE' && showInStoreForm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">storefront</span>
            Ghi nhận thu tại cửa hàng
          </p>
          <div>
            <label className="text-xs font-semibold text-emerald-700 mb-1.5 block">Cách thu tiền</label>
            <div className="flex gap-2 flex-wrap">
              {([['CASH', 'Tiền mặt', 'payments'], ['BANK_TRANSFER', 'Chuyển khoản', 'account_balance'], ['CARD_POS', 'Thẻ POS', 'credit_card']] as const).map(([val, lbl, ico]) => (
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
            <button onClick={onHideInStoreForm}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">
              Hủy
            </button>
            <button onClick={handleConfirmInStore} disabled={isConfirmingInStore}
              className="flex-1 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none">
              {isConfirmingInStore
                ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</>
                : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>Xác nhận đã thu</>}
            </button>
          </div>
        </div>
      )}

      {/* ── PayOS: nút sync + mở reconcile ── */}
      {booking.paymentMethod === 'PAYOS' && !showReconcileForm && (
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSyncPayos} disabled={isSyncingPayos}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-60 transition-colors outline-none">
            <span className={`material-symbols-outlined text-[16px] ${isSyncingPayos ? 'animate-spin' : ''}`}>sync</span>
            {isSyncingPayos ? 'Đang kiểm tra…' : 'Kiểm tra PayOS'}
          </button>
          <button onClick={onShowReconcileForm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors outline-none">
            <span className="material-symbols-outlined text-[16px]">find_in_page</span>
            Đối soát thủ công
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
        </div>
      )}

      {/* ── PayOS: form đối soát thủ công ── */}
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
            <textarea value={reconcileNote} onChange={e => setReconcileNote(e.target.value)} rows={2}
              placeholder="VD: Đã xem ảnh CK khớp với hóa đơn, xác nhận thu đủ 5.500.000đ..."
              className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onHideReconcileForm}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">
              Hủy
            </button>
            <button onClick={handleReconcile} disabled={isReconciling}
              className="flex-1 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none">
              {isReconciling
                ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</>
                : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>Xác nhận đối soát</>}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

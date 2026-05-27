'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { API_BASE_URL } from '@/lib/constants';
import { AVATAR_COLORS } from '../_lib/config';
import { getInitials } from '../_lib/helpers';

// ─── Cancel Request Panel ─────────────────────────────────────────────────────
interface CancelRequest {
  id: number;
  bookingCode: string;
  cancelReason: string;
  cancelRequestedAt: string;
  refundAmount: number;
  refundNote: string;
  refundBankDetails?: { bankName: string; accountNumber: string; accountName: string };
  totalPrice: number;
  numberOfPeople: number;
  user: { fullName: string; email: string; avatarUrl?: string };
  tour: { name: string; startDate: string; imageUrl?: string } | null;
}

export function CancelRequestPanel({ onActionDone }: { onActionDone: () => void }) {
  const [requests, setRequests] = useState<CancelRequest[]>([]);
  const [refundStats, setRefundStats] = useState<{ pendingCancelCount: number; pendingRefundAmount: number; totalRefundedAmount: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionState, setActionState] = useState<Record<number, { loading: boolean; note: string; mode: 'approve' | 'reject' | null }>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/cancel-requests`);
      const json = await res.json();
      const data = json?.data;
      if (data && data.requests) {
        setRequests(data.requests);
        setRefundStats(data.stats);
      } else {
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch {
      showToast('Lỗi tải danh sách yêu cầu hủy', false);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const initAction = (id: number, mode: 'approve' | 'reject') =>
    setActionState(prev => ({ ...prev, [id]: { loading: false, note: '', mode } }));

  const cancelAction = (id: number) =>
    setActionState(prev => ({ ...prev, [id]: { loading: false, note: '', mode: null } }));

  const handleApprove = async (id: number) => {
    const state = actionState[id];
    setActionState(prev => ({ ...prev, [id]: { ...prev[id], loading: true } }));
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${id}/approve-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: state?.note || undefined }),
      });
      if (!res.ok) throw new Error();
      showToast('✅ Đã duyệt hủy booking và hoàn trả ghế');
      await fetchRequests();
      onActionDone();
    } catch {
      showToast('Lỗi duyệt yêu cầu hủy', false);
    } finally {
      setActionState(prev => ({ ...prev, [id]: { ...prev[id], loading: false, mode: null } }));
    }
  };

  const handleReject = async (id: number) => {
    const state = actionState[id];
    if (!state?.note?.trim()) {
      showToast('Vui lòng nhập lý do từ chối', false);
      return;
    }
    setActionState(prev => ({ ...prev, [id]: { ...prev[id], loading: true } }));
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${id}/reject-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectReason: state.note.trim() }),
      });
      if (!res.ok) throw new Error();
      showToast('ℹ️ Đã từ chối yêu cầu hủy, booking tiếp tục hiệu lực');
      await fetchRequests();
      onActionDone();
    } catch {
      showToast('Lỗi từ chối yêu cầu hủy', false);
    } finally {
      setActionState(prev => ({ ...prev, [id]: { ...prev[id], loading: false, mode: null } }));
    }
  };

  if (isLoading) return (
    <div className="bg-surface-container-lowest rounded-2xl border border-orange-200 p-6 mb-6 animate-pulse">
      <div className="h-5 w-48 bg-surface-container-high rounded mb-4" />
      {[1, 2].map(i => <div key={i} className="h-20 bg-surface-container rounded-xl mb-3" />)}
    </div>
  );

  if (requests.length === 0) return null;

  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 mb-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-white text-sm font-semibold flex items-center gap-2 ${toast.ok ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-orange-600 text-2xl animate-pulse">pending_actions</span>
          </div>
          <div>
            <h2 className="font-bold text-orange-800 text-lg">Yêu Cầu Hủy & Hoàn Tiền</h2>
            <p className="text-sm text-orange-600">{requests.length} yêu cầu đang chờ xử lý</p>
          </div>
        </div>

        {refundStats && (
          <div className="flex gap-4 bg-white/60 p-3 rounded-xl border border-orange-200/50">
            <div className="px-4 border-r border-orange-200/50">
              <p className="text-xs text-slate-500 mb-0.5">Tiền chờ hoàn</p>
              <p className="font-bold text-orange-600">{refundStats.pendingRefundAmount.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="px-2 pr-4">
              <p className="text-xs text-slate-500 mb-0.5">Đã hoàn thành công</p>
              <p className="font-bold text-emerald-600">{refundStats.totalRefundedAmount.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {requests.map(req => {
          const as = actionState[req.id];
          const colorIdx = (req.user.fullName.charCodeAt(0) || 0) % AVATAR_COLORS.length;
          const bank = req.refundBankDetails;
          return (
            <div key={req.id} className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm">
              <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                {/* 1. User & Booking info */}
                <div className="flex gap-4 min-w-[300px] flex-1">
                  <div className="shrink-0 mt-1">
                    {req.user.avatarUrl ? (
                      <Image
                        src={req.user.avatarUrl}
                        alt={req.user.fullName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-sm font-bold`}>
                        {getInitials(req.user.fullName)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm">{req.user.fullName} <span className="font-normal text-slate-500">({req.user.email})</span></p>
                    <p className="font-mono text-sm font-bold text-orange-700">{req.bookingCode}</p>
                    <p className="text-sm text-slate-700 font-medium line-clamp-1">{req.tour?.name ?? '—'}</p>
                    <div className="bg-orange-50 rounded p-2 border border-orange-100 mt-2">
                      <p className="text-xs text-orange-800"><span className="font-semibold">Lý do hủy:</span> {req.cancelReason}</p>
                      <p className="text-[10px] text-orange-600/70 mt-1">Gửi lúc: {req.cancelRequestedAt ? new Date(req.cancelRequestedAt).toLocaleString('vi-VN') : '—'}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Refund Info & Bank Details */}
                <div className="flex-1 min-w-[300px] flex gap-4">
                  {/* Số tiền */}
                  <div className="shrink-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cần Hoàn</p>
                    <p className={`text-xl font-extrabold ${req.refundAmount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {req.refundAmount > 0 ? req.refundAmount.toLocaleString('vi-VN') + 'đ' : 'Không hoàn'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-[150px]">{req.refundNote}</p>
                  </div>

                  {/* Bank Info */}
                  {req.refundAmount > 0 && bank && (
                    <div className="flex-1 bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                      <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">account_balance</span>
                        Thông Tin Nhận Tiền
                      </p>
                      <div className="space-y-1 text-sm text-slate-700">
                        <p><span className="text-slate-500 text-xs">Ngân hàng:</span> <span className="font-semibold">{bank.bankName}</span></p>
                        <p><span className="text-slate-500 text-xs">Số TK:</span> <span className="font-mono font-bold text-blue-700">{bank.accountNumber}</span></p>
                        <p><span className="text-slate-500 text-xs">Chủ TK:</span> <span className="font-semibold uppercase">{bank.accountName}</span></p>
                      </div>
                    </div>
                  )}
                  {req.refundAmount > 0 && !bank && (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-slate-300 rounded-lg p-3">
                      <p className="text-xs text-slate-500 text-center">Chưa có thông tin nhận hoàn tiền</p>
                    </div>
                  )}
                </div>

                {/* 3. Action buttons */}
                <div className="shrink-0 flex items-start justify-end w-full xl:w-auto mt-4 xl:mt-0">
                  {!as?.mode ? (
                    <div className="flex xl:flex-col gap-2">
                      <button
                        onClick={() => initAction(req.id, 'approve')}
                        className="flex items-center justify-center gap-1.5 w-32 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        Duyệt
                      </button>
                      <button
                        onClick={() => initAction(req.id, 'reject')}
                        className="flex items-center justify-center gap-1.5 w-32 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors bg-white"
                      >
                        <span className="material-symbols-outlined text-base">cancel</span>
                        Từ Chối
                      </button>
                    </div>
                  ) : (
                    <div className="w-full sm:w-80 bg-slate-50 rounded-xl p-4 border border-slate-200">
                      {as.mode === 'approve' ? (
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">info</span>
                            Xác nhận đã chuyển khoản
                          </p>
                          <input
                            type="text"
                            placeholder="Ghi chú (VD: Đã CK Vietcombank...)"
                            value={as.note}
                            onChange={e => setActionState(prev => ({ ...prev, [req.id]: { ...prev[req.id], note: e.target.value } }))}
                            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(req.id)} disabled={as.loading}
                              className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 disabled:opacity-60 flex items-center justify-center gap-1">
                              {as.loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-base">check</span>}
                              Duyệt Hoàn Tiền
                            </button>
                            <button onClick={() => cancelAction(req.id)} className="px-4 py-2 rounded-lg bg-white border text-slate-500 text-sm hover:bg-slate-50 font-medium">Hủy</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-red-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">warning</span>
                            Từ chối hủy tour
                          </p>
                          <input
                            type="text"
                            placeholder="Nhập lý do từ chối *"
                            value={as.note}
                            onChange={e => setActionState(prev => ({ ...prev, [req.id]: { ...prev[req.id], note: e.target.value } }))}
                            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleReject(req.id)} disabled={as.loading}
                              className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-1">
                              {as.loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-base">close</span>}
                              Từ Chối
                            </button>
                            <button onClick={() => cancelAction(req.id)} className="px-4 py-2 rounded-lg bg-white border text-slate-500 text-sm hover:bg-slate-50 font-medium">Hủy</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

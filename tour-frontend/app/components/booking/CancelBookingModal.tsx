'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

const CANCEL_REASONS = [
  'Thay đổi kế hoạch cá nhân',
  'Lý do sức khỏe / gia đình',
  'Tìm được lịch trình phù hợp hơn',
  'Lý do tài chính',
  'Khác',
];

interface CancelBookingModalProps {
  bookingId: number;
  bookingCode: string;
  tourName: string;
  tourStartDate: string;
  totalPrice: number;
  paymentStatus: string; // 'UNPAID' | 'PAID'
  bookingStatus: string; // 'PENDING' | 'CONFIRMED'
  onClose: () => void;
  onSuccess: () => void;
}

// Tính hoàn tiền phía client để hiện thị preview (logic giống backend)
function calculateRefundPreview(
  paymentStatus: string,
  totalPrice: number,
  tourStartDate: string,
): { refundAmount: number; refundNote: string; tier: string } {
  if (paymentStatus !== 'PAID') {
    return { refundAmount: 0, refundNote: 'Chưa thanh toán — không có khoản hoàn tiền', tier: 'UNPAID' };
  }
  const now = new Date();
  const tourStart = new Date(tourStartDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilTour = Math.ceil((tourStart.getTime() - now.getTime()) / msPerDay);

  if (daysUntilTour >= 7) {
    return { refundAmount: totalPrice, refundNote: 'Hủy trước 7 ngày — hoàn 100%', tier: 'FULL' };
  } else if (daysUntilTour >= 3) {
    return { refundAmount: totalPrice * 0.5, refundNote: 'Hủy trong 3–6 ngày — hoàn 50%', tier: 'HALF' };
  } else {
    return { refundAmount: 0, refundNote: 'Hủy dưới 3 ngày — không hoàn tiền', tier: 'NONE' };
  }
}

export default function CancelBookingModal({
  bookingId,
  bookingCode,
  tourName,
  tourStartDate,
  totalPrice,
  paymentStatus,
  bookingStatus,
  onClose,
  onSuccess,
}: CancelBookingModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refundPreview = calculateRefundPreview(paymentStatus, totalPrice, tourStartDate);
  const isPaid = paymentStatus === 'PAID';
  const isPending = bookingStatus === 'PENDING';

  // Đóng modal bằng Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const getFinalReason = () =>
    selectedReason === 'Khác' ? customReason.trim() : selectedReason;

  const handleSubmit = async () => {
    const finalReason = getFinalReason();
    if (!finalReason || finalReason.length < 3) {
      setError('Vui lòng chọn hoặc nhập lý do hủy.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetchWithAuth(
        `http://localhost:3000/booking/${bookingId}/cancel-request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: finalReason }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        onSuccess();
      } else {
        setError(result.message ?? 'Không thể gửi yêu cầu hủy. Vui lòng thử lại.');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tierColor = ({
    FULL:   { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', amount: 'text-emerald-700' },
    HALF:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   amount: 'text-amber-700'   },
    NONE:   { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     amount: 'text-red-600'     },
    UNPAID: { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-600',   amount: 'text-slate-600'   },
  } as Record<string, { bg: string; border: string; text: string; amount: string }>)[refundPreview.tier]
    ?? { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', amount: 'text-slate-600' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-8 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">cancel</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {isPaid ? 'Yêu Cầu Hủy Tour' : 'Hủy Đặt Tour'}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">Mã đặt tour: {bookingCode}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Tour Info */}
          <div className="bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Tour</p>
            <p className="font-bold text-slate-800 text-sm leading-snug">{tourName}</p>
            {tourStartDate && (
              <p className="text-xs text-slate-500 mt-1">
                Ngày khởi hành: {new Date(tourStartDate).toLocaleDateString('vi-VN', { dateStyle: 'long' })}
              </p>
            )}
          </div>

          {/* Refund Preview Box */}
          <div className={`rounded-2xl px-5 py-4 border ${tierColor.bg} ${tierColor.border}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${tierColor.text}`}>
              📊 Chính Sách Hoàn Tiền
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tổng đã thanh toán</span>
                <span className="font-semibold">{isPaid ? totalPrice.toLocaleString('vi-VN') + 'đ' : '—'}</span>
              </div>
              {isPaid && refundPreview.refundAmount < totalPrice && (
                <div className="flex justify-between text-red-500">
                  <span>Phí hủy tour</span>
                  <span className="font-semibold">−{(totalPrice - refundPreview.refundAmount).toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className={`flex justify-between font-bold pt-2 border-t ${tierColor.border}`}>
                <span className={tierColor.text}>
                  {isPaid ? '💰 Bạn sẽ được hoàn' : 'Hoàn tiền'}
                </span>
                <span className={`text-lg ${tierColor.amount}`}>
                  {refundPreview.refundAmount > 0
                    ? refundPreview.refundAmount.toLocaleString('vi-VN') + 'đ'
                    : isPaid ? 'Không hoàn' : '—'}
                </span>
              </div>
            </div>
            <p className={`text-xs mt-3 ${tierColor.text} opacity-80`}>{refundPreview.refundNote}</p>
          </div>

          {/* Reason Selection */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">
              📝 Lý Do Hủy <span className="text-red-500">*</span>
            </p>
            <div className="space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    selectedReason === reason
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-slate-200 hover:border-rose-200 hover:bg-rose-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-rose-500"
                  />
                  <span className="text-sm text-slate-700">{reason}</span>
                </label>
              ))}
            </div>

            {/* Custom reason input */}
            {selectedReason === 'Khác' && (
              <textarea
                className="mt-3 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent resize-none transition-all"
                rows={3}
                placeholder="Nhập lý do cụ thể của bạn..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                maxLength={500}
              />
            )}
          </div>

          {/* Warning note for PAID */}
          {isPaid && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-amber-600 text-base mt-0.5 shrink-0">info</span>
              <p className="text-xs text-amber-700 leading-relaxed">
                Yêu cầu hủy sẽ được xem xét trong vòng <strong>1–3 ngày làm việc</strong>.
                Sau khi được duyệt, tiền sẽ được hoàn về phương thức thanh toán ban đầu.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-8 pb-8 pt-2 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm disabled:opacity-50"
          >
            Quay Lại
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason || (selectedReason === 'Khác' && customReason.trim().length < 3)}
            className="py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold hover:opacity-90 transition-all text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">send</span>
                {isPending ? 'Hủy Đặt Tour' : 'Gửi Yêu Cầu Hủy'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

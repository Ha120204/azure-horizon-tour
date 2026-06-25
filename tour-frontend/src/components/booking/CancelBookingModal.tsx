'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { useLocale } from '@/context/LocaleContext';

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
  cancellationPolicy?: {
    canCancel: boolean;
    refundPercent: number;
    estimatedRefundAmount: number;
    refundNote: string;
    policyTier: string;
  };
  onClose: () => void;
  onSuccess: (immediate: boolean) => void;
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
    return { refundAmount: totalPrice * 0.8, refundNote: 'Hủy trước 7 ngày - hoàn 80%', tier: 'EIGHTY_REFUND' };
  } else if (daysUntilTour >= 3) {
    return { refundAmount: totalPrice * 0.5, refundNote: 'Hủy trong 3-6 ngày - hoàn 50%', tier: 'HALF_REFUND' };
  } else {
    return { refundAmount: 0, refundNote: 'Hủy dưới 3 ngày - không hoàn tiền', tier: 'NO_REFUND' };
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
  cancellationPolicy,
  onClose,
  onSuccess,
}: CancelBookingModalProps) {
  const { formatPrice, formatDate } = useLocale();
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [bankName, setBankName] = useState('');
  const [banksList, setBanksList] = useState<{ shortName: string, name: string, logo: string }[]>([]);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = 'cancel-booking-title';
  const errorId = 'cancel-booking-error';
  const bankButtonId = 'cancel-refund-bank-button';
  const bankListboxId = 'cancel-refund-bank-listbox';
  const bankSearchId = 'cancel-refund-bank-search';
  const accountNumberId = 'cancel-refund-account-number';
  const accountNameId = 'cancel-refund-account-name';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const filteredBanks = banksList.filter(b => 
    b.shortName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedBankObj = banksList.find(b => b.shortName === bankName);

  const refundPreview = cancellationPolicy
    ? {
        refundAmount: cancellationPolicy.estimatedRefundAmount,
        refundNote: cancellationPolicy.refundNote,
        tier: cancellationPolicy.policyTier,
      }
    : calculateRefundPreview(paymentStatus, totalPrice, tourStartDate);
  const isPaid = paymentStatus === 'PAID';
  const isPending = bookingStatus === 'PENDING';

  // Đóng modal bằng Escape & Fetch Banks
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', handleKey);
    
    // Gọi API danh sách ngân hàng Việt Nam từ VietQR (Napas)
    fetch('https://api.vietqr.io/v2/banks')
      .then(res => res.json())
      .then(json => {
        if (json.code === '00' && json.data) {
          setBanksList(json.data);
        }
      })
      .catch(err => console.error('Lỗi lấy danh sách ngân hàng:', err));

    return () => window.removeEventListener('keydown', handleKey);
  }, [isDropdownOpen, onClose]);

  const getFinalReason = () =>
    selectedReason === 'Khác' ? customReason.trim() : selectedReason;

  const handleSubmit = async () => {
    const finalReason = getFinalReason();
    if (!finalReason || finalReason.length < 3) {
      setError('Vui lòng chọn hoặc nhập lý do hủy.');
      return;
    }

    if (isPaid && refundPreview.refundAmount > 0) {
      if (!bankName.trim()) { setError('Vui lòng chọn ngân hàng nhận tiền hoàn.'); return; }
      if (!accountNumber.trim()) { setError('Vui lòng nhập số tài khoản.'); return; }
      if (!accountName.trim()) { setError('Vui lòng nhập tên chủ tài khoản.'); return; }
      if (!/^[A-Z\s]+$/.test(accountName.trim())) {
        setError('Tên chủ tài khoản phải viết hoa toàn bộ và không dấu (ví dụ: NGUYEN VAN A).');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/booking/${bookingId}/cancel-request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: finalReason,
            bankDetails: (isPaid && refundPreview.refundAmount > 0) ? {
              bankName: bankName.trim(),
              accountNumber: accountNumber.trim(),
              accountName: accountName.trim()
            } : undefined
          }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        onSuccess(isPending);
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
    FULL_REFUND_24H: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', amount: 'text-emerald-700' },
    EIGHTY_REFUND: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', amount: 'text-emerald-700' },
    HALF:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   amount: 'text-amber-700'   },
    HALF_REFUND: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', amount: 'text-amber-700' },
    NONE:   { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     amount: 'text-red-600'     },
    NO_REFUND: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', amount: 'text-red-600' },
    UNPAID: { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-600',   amount: 'text-slate-600'   },
  } as Record<string, { bg: string; border: string; text: string; amount: string }>)[refundPreview.tier]
    ?? { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', amount: 'text-slate-600' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        tabIndex={-1}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 focus:outline-none"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-8 py-6 relative">
          <button
            type="button"
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
              <h2 id={titleId} className="text-white font-bold text-lg leading-tight">
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
                Ngày khởi hành: {formatDate(tourStartDate, { dateStyle: 'long' })}
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
                <span className="font-semibold">{isPaid ? formatPrice(totalPrice) : '—'}</span>
              </div>
              <div className={`flex justify-between font-bold pt-2 border-t ${tierColor.border}`}>
                <span className={tierColor.text}>
                  {isPaid ? '💰 Bạn sẽ được hoàn' : 'Hoàn tiền'}
                </span>
                <span className={`text-lg ${tierColor.amount}`}>
                  {refundPreview.refundAmount > 0
                    ? formatPrice(refundPreview.refundAmount)
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
            <div role="radiogroup" aria-label="Lý do hủy tour" className="space-y-2">
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
                aria-label="Lý do hủy khác"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                maxLength={500}
              />
            )}
          </div>

          {/* Bank Info for Refund */}
          {isPaid && refundPreview.refundAmount > 0 && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
              <p className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                Thông Tin Nhận Tiền Hoàn <span className="text-red-500">*</span>
              </p>
              <div className="space-y-3">
                <div className="relative" ref={dropdownRef}>
                  <button
                    id={bankButtonId}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isDropdownOpen}
                    aria-controls={isDropdownOpen ? bankListboxId : undefined}
                    aria-label="Tìm hoặc chọn ngân hàng nhận tiền hoàn"
                    className={`w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-all bg-white ${bankName ? 'text-slate-700' : 'text-slate-400'}`}
                    onClick={() => {
                      setIsDropdownOpen(!isDropdownOpen);
                      setSearchQuery('');
                    }}
                  >
                    <span className="truncate pr-4">
                      {banksList.length === 0 ? 'Đang tải danh sách ngân hàng...' : (bankName && selectedBankObj ? `${selectedBankObj.shortName} - ${selectedBankObj.name}` : 'Tìm hoặc chọn ngân hàng...')}
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-lg transition-transform duration-200" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                      expand_more
                    </span>
                  </button>

                  {isDropdownOpen && banksList.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-72 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                          <input
                            id={bankSearchId}
                            type="text"
                            placeholder="Gõ để tìm tên hoặc mã ngân hàng..."
                            aria-label="Tìm ngân hàng nhận tiền hoàn"
                            className="w-full pl-9 pr-4 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div id={bankListboxId} role="listbox" aria-labelledby={bankButtonId} className="overflow-y-auto overflow-x-hidden flex-1">
                        {filteredBanks.length > 0 ? (
                          filteredBanks.map((bank) => (
                            <button
                              key={`${bank.shortName}-${bank.name}`}
                              type="button"
                              role="option"
                              aria-selected={bankName === bank.shortName}
                              className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition-colors last:border-0 hover:bg-blue-50 ${bankName === bank.shortName ? 'bg-blue-50/80 font-medium' : ''}`}
                              onClick={() => {
                                setBankName(bank.shortName);
                                setIsDropdownOpen(false);
                                setSearchQuery('');
                              }}
                            >
                              <div className="w-8 h-8 rounded-full border border-slate-200 bg-white shrink-0 flex items-center justify-center p-1">
                                {bank.logo ? <Image src={bank.logo} alt={bank.shortName} width={32} height={32} sizes="32px" className="max-h-full max-w-full object-contain" unoptimized /> : <span className="material-symbols-outlined text-slate-400 text-xs">account_balance</span>}
                              </div>
                              <span className="truncate">{bank.shortName} - {bank.name}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-sm text-slate-500">
                            Không tìm thấy ngân hàng nào phù hợp
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor={accountNumberId} className="mb-1.5 block text-xs font-bold text-blue-900">
                    Số tài khoản nhận hoàn <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={accountNumberId}
                    type="text"
                    placeholder="Số tài khoản"
                    value={accountNumber}
                    aria-required="true"
                    required
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label htmlFor={accountNameId} className="mb-1.5 block text-xs font-bold text-blue-900">
                    Tên chủ tài khoản <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={accountNameId}
                    type="text"
                    placeholder="NGUYEN VAN A"
                    value={accountName}
                    aria-required="true"
                    required
                    onChange={(e) => {
                      const normalized = e.target.value
                        .replace(/[đĐ]/g, 'D')
                        .normalize('NFD')
                        .replace(/[̀-ͯ]/g, '')
                        .toUpperCase()
                        .replace(/[^A-Z\s]/g, '');
                      setAccountName(normalized);
                    }}
                    className="w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all uppercase"
                  />
                  <p className="mt-1 text-xs text-slate-400">Viết hoa toàn bộ, không dấu — đúng như in trên thẻ ngân hàng</p>
                </div>
              </div>
            </div>
          )}

          {/* Warning note for PAID */}
          {isPaid && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-amber-600 text-base mt-0.5 shrink-0">info</span>
              <p className="text-xs text-amber-700 leading-relaxed">
                Yêu cầu hoàn tiền sẽ được kế toán xử lý trong vòng <strong>1–3 ngày làm việc</strong> kể từ khi Admin duyệt. 
                Tiền sẽ được chuyển khoản trực tiếp vào tài khoản ngân hàng bạn cung cấp ở trên.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div id={errorId} role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-8 pb-8 pt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm disabled:opacity-50"
          >
            Quay Lại
          </button>
          <button
            type="button"
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

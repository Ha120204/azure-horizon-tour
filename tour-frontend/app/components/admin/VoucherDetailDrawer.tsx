'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserVoucherEntry {
  id: number;
  isUsed: boolean;
  savedAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface VoucherDetail {
  id: number;
  code: string;
  label: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  computedStatus: 'active' | 'expired' | 'depleted' | 'inactive';
  userVouchers: UserVoucherEntry[];
  _count: { userVouchers: number };
}

interface VoucherDetailDrawerProps {
  voucherId: number | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (n: number | undefined | null): string => {
  const num = Number(n);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (d?: string | null): string => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dt);
};

const formatDateTime = (d?: string | null): string => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(dt);
};

const NEVER_EXPIRES_YEAR = 2099;

const isNeverExpires = (d?: string | null): boolean => {
  if (!d) return true;
  const dt = new Date(d);
  return isNaN(dt.getTime()) || dt.getFullYear() >= NEVER_EXPIRES_YEAR;
};

const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).filter(Boolean).slice(-2).join('').toUpperCase();
};

const statusConfig = {
  active:   { label: 'Đang hoạt động', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  expired:  { label: 'Đã hết hạn',     bg: 'bg-slate-100',                         text: 'text-slate-500',   dot: 'bg-slate-400',   ring: 'ring-slate-200' },
  depleted: { label: 'Hết lượt dùng',  bg: 'bg-red-50',                            text: 'text-red-500',     dot: 'bg-red-500',     ring: 'ring-red-200' },
  inactive: { label: 'Vô hiệu hóa',   bg: 'bg-amber-50',                          text: 'text-amber-600',   dot: 'bg-amber-500',   ring: 'ring-amber-200' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoucherDetailDrawer({ voucherId, onClose }: VoucherDetailDrawerProps) {
  const [data, setData] = useState<VoucherDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    if (voucherId !== null) {
      setData(null);
      setError('');
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [voucherId]);

  // Lock scroll
  useEffect(() => {
    if (voucherId !== null) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [voucherId]);

  // Fetch
  const fetchDetail = useCallback(async () => {
    if (!voucherId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/${voucherId}`);
      if (!res.ok) throw new Error('Không thể tải chi tiết voucher');
      const json = await res.json();
      // TransformInterceptor wraps response: { statusCode, message, data: VoucherDetail, timestamp }
      const voucher = json?.data ?? json;
      setData(voucher);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  }, [voucherId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  if (voucherId === null) return null;

  // ── Derived ─────────────────────────────────────────────────────────────

  const usedCount    = Number(data?.usedCount) || 0;
  const maxUses      = Number(data?.maxUses)   || 999_999_999;
  const savedCount   = data?._count?.userVouchers ?? 0;
  const userVouchers = data?.userVouchers ?? [];
  const isUnlimited  = maxUses >= 999_999_999;
  const usageRatio   = isUnlimited ? (usedCount > 0 ? 0.06 : 0) : Math.min(usedCount / maxUses, 1);
  const status       = data?.computedStatus ? statusConfig[data.computedStatus] : null;
  const discountValue = Number(data?.discountValue);

  const discountDisplay = data
    ? data.discountType === 'PERCENTAGE'
      ? `Giảm ${isNaN(discountValue) ? '—' : discountValue}%`
      : `Giảm ${formatCurrency(discountValue)}`
    : '';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vd-title"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-[560px] bg-surface rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-250 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* ── Loading / Error overlay ─────────────────────────────── */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface rounded-3xl">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin" aria-hidden="true">progress_activity</span>
              <p className="text-sm text-on-surface-variant font-medium">Đang tải dữ liệu…</p>
            </div>
          </div>
        )}
        {error && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface rounded-3xl">
            <div className="flex flex-col items-center gap-3 px-8 text-center">
              <span className="material-symbols-outlined text-4xl text-error" aria-hidden="true">error</span>
              <p className="text-sm text-error font-semibold">{error}</p>
              <button onClick={fetchDetail} className="text-sm text-primary font-semibold hover:underline">Thử lại</button>
            </div>
          </div>
        )}

        {/* ── Hero Section ─────────────────────────────────────────── */}
        <div className="relative px-7 pt-7 pb-6 bg-gradient-to-br from-primary/8 via-surface to-surface shrink-0">
          {/* Close button */}
          <button
            onClick={handleClose}
            aria-label="Đóng"
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>

          {/* Title row */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">local_activity</span>
            </div>
            <h2 id="vd-title" className="font-semibold text-sm text-on-surface-variant">Chi Tiết Voucher</h2>
          </div>

          {/* Voucher identity */}
          {data && (
            <div className="flex items-start justify-between gap-3">
              <div>
                {/* Code badge */}
                <div className="inline-flex items-center gap-2 bg-primary/10 rounded-xl px-3.5 py-1.5 mb-3">
                  <span className="font-mono font-bold text-primary text-lg tracking-widest">{data.code}</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(data.code)}
                    aria-label="Sao chép mã"
                    title="Sao chép mã"
                    className="text-primary/60 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                  </button>
                </div>

                {/* Discount value — primary focus */}
                <p className="text-3xl font-extrabold text-on-surface leading-none mb-1">
                  {discountDisplay}
                </p>
                <p className="text-sm text-on-surface-variant">
                  {data.label}
                  {data.minOrderValue > 0 && (
                    <span className="ml-1 text-xs text-outline">· Đơn từ {formatCurrency(data.minOrderValue)}</span>
                  )}
                </p>
              </div>

              {/* Status badge */}
              {status && (
                <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${status.bg} ${status.text} ${status.ring}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {data?.description && (
            <p className="mt-3 text-xs text-on-surface-variant/70 italic leading-relaxed border-t border-outline-variant/10 pt-3">
              {data.description}
            </p>
          )}
        </div>

        {/* ── Scrollable Body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-6">

          {/* ── Usage Stats ─── */}
          {data && (
            <div>
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                Thống Kê Sử Dụng
              </p>

              {/* 3 stat tiles */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { value: usedCount.toLocaleString('vi-VN'), label: 'Đã dùng',   accent: 'text-primary' },
                  { value: isUnlimited ? '∞' : maxUses.toLocaleString('vi-VN'), label: 'Tổng lượt', accent: 'text-on-surface' },
                  { value: savedCount.toLocaleString('vi-VN'),                  label: 'Đã lưu ví', accent: 'text-secondary' },
                ].map(({ value, label, accent }) => (
                  <div key={label} className="bg-surface-container-low/60 rounded-2xl p-3.5 border border-outline-variant/10 text-center">
                    <p className={`text-2xl font-extrabold leading-none mb-1 ${accent}`}>{value}</p>
                    <p className="text-[11px] text-on-surface-variant font-medium">{label}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="bg-surface-container-low/40 rounded-2xl p-4 border border-outline-variant/10">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs font-semibold text-on-surface-variant">Tỉ lệ sử dụng</span>
                  <span className="text-xs font-bold text-on-surface">
                    {isUnlimited ? `${usedCount} lượt` : `${Math.round(usageRatio * 100)}%`}
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      usageRatio >= 1 ? 'bg-error' : usageRatio >= 0.8 ? 'bg-amber-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.max(usageRatio * 100, usedCount > 0 ? 3 : 0)}%` }}
                  />
                </div>
                {!isUnlimited && (
                  <p className="text-[10px] text-on-surface-variant mt-1.5 text-right">
                    Còn lại: {Math.max(0, maxUses - usedCount).toLocaleString('vi-VN')} lượt
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Metadata ─── */}
          {data && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low/40 rounded-2xl p-4 border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline text-sm" aria-hidden="true">event</span>
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Hết Hạn</p>
                </div>
                <p className="text-sm font-bold text-on-surface">
                  {isNeverExpires(data.expiresAt) ? (
                    <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-base" aria-hidden="true">all_inclusive</span>
                      Không có ngày hết hạn
                    </span>
                  ) : formatDate(data.expiresAt)}
                </p>
              </div>
              <div className="bg-surface-container-low/40 rounded-2xl p-4 border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline text-sm" aria-hidden="true">calendar_add_on</span>
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ngày Tạo</p>
                </div>
                <p className="text-sm font-bold text-on-surface">{formatDate(data.createdAt)}</p>
              </div>
            </div>
          )}

          {/* ── User Redemptions ─── */}
          {data && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Người Dùng Gần Đây
                </p>
                <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container rounded-full px-2.5 py-1">
                  {savedCount} người đã lưu
                </span>
              </div>

              {userVouchers.length === 0 ? (
                <div className="text-center py-10 bg-surface-container-low/40 rounded-2xl border border-dashed border-outline-variant/20">
                  <span className="material-symbols-outlined text-3xl text-outline/50 mb-2 block" aria-hidden="true">group_off</span>
                  <p className="text-sm font-medium text-on-surface-variant">Chưa có ai lưu voucher này</p>
                  <p className="text-xs text-outline mt-1">Voucher sẽ xuất hiện ở đây khi có người sử dụng</p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {userVouchers.map((uv) => (
                    <li
                      key={uv.id}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-surface-container-low/60 transition-colors"
                    >
                      {/* Avatar */}
                      {uv.user?.avatarUrl ? (
                        <img src={uv.user.avatarUrl} alt={uv.user.fullName} className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-surface" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0 ring-2 ring-surface">
                          <span className="text-primary text-xs font-bold">{getInitials(uv.user?.fullName)}</span>
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{uv.user?.fullName ?? '—'}</p>
                        <p className="text-xs text-on-surface-variant truncate">{uv.user?.email ?? '—'}</p>
                      </div>

                      {/* Status + Time */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          uv.isUsed
                            ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {uv.isUsed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                          {uv.isUsed ? 'Đã dùng' : 'Đã lưu'}
                        </span>
                        <span className="text-[10px] text-outline">{formatDateTime(uv.savedAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {savedCount > 20 && (
                <p className="text-center text-xs text-on-surface-variant mt-3 py-2 bg-surface-container-low/40 rounded-xl">
                  Hiển thị 20/{savedCount} người gần nhất
                </p>
              )}
            </div>
          )}

          {/* Bottom padding */}
          <div className="h-1" />
        </div>
      </div>
    </div>
  );
}

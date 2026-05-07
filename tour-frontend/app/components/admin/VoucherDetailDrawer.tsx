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

// Palette for status: gradient pairs + badge styles
const statusConfig = {
  active:   {
    label: 'Đang hoạt động',
    badgeBg: 'rgba(16,185,129,0.12)',
    badgeText: '#059669',
    dotColor: '#10b981',
    badgeBorder: 'rgba(16,185,129,0.25)',
  },
  expired:  {
    label: 'Đã hết hạn',
    badgeBg: 'rgba(100,116,139,0.1)',
    badgeText: '#64748b',
    dotColor: '#94a3b8',
    badgeBorder: 'rgba(100,116,139,0.2)',
  },
  depleted: {
    label: 'Hết lượt dùng',
    badgeBg: 'rgba(239,68,68,0.1)',
    badgeText: '#dc2626',
    dotColor: '#ef4444',
    badgeBorder: 'rgba(239,68,68,0.2)',
  },
  inactive: {
    label: 'Vô hiệu hóa',
    badgeBg: 'rgba(245,158,11,0.1)',
    badgeText: '#d97706',
    dotColor: '#f59e0b',
    badgeBorder: 'rgba(245,158,11,0.2)',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoucherDetailDrawer({ voucherId, onClose }: VoucherDetailDrawerProps) {
  const [data, setData] = useState<VoucherDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    if (data?.code) {
      navigator.clipboard?.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  const isPercentage = data?.discountType === 'PERCENTAGE';
  const discountDisplay = data
    ? isPercentage
      ? `${isNaN(discountValue) ? '—' : discountValue}%`
      : formatCurrency(discountValue)
    : '';

  // Hero gradient by status
  const heroGradient = data?.computedStatus === 'active'
    ? 'linear-gradient(135deg, #0f4c81 0%, #1565C0 45%, #1E88E5 100%)'
    : data?.computedStatus === 'expired' || data?.computedStatus === 'inactive'
    ? 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
    : data?.computedStatus === 'depleted'
    ? 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #0f4c81 0%, #1565C0 100%)';

  const progressColor = usageRatio >= 1
    ? '#ef4444'
    : usageRatio >= 0.8
    ? '#f59e0b'
    : '#3b82f6';

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
        className={`absolute inset-0 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={handleClose}
      />

      {/* ── Modal Card ── */}
      <div
        className={`relative w-full max-w-[540px] flex flex-col overflow-hidden transition-all duration-250 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
        style={{
          maxHeight: '92vh',
          borderRadius: '24px',
          background: '#ffffff',
          boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* ── Loading / Error overlay ── */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl" style={{ background: '#fff' }}>
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl animate-spin" style={{ color: '#1565C0' }}>progress_activity</span>
              <p className="text-sm font-medium text-gray-500">Đang tải dữ liệu…</p>
            </div>
          </div>
        )}
        {error && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl" style={{ background: '#fff' }}>
            <div className="flex flex-col items-center gap-3 px-8 text-center">
              <span className="material-symbols-outlined text-4xl text-red-500">error</span>
              <p className="text-sm text-red-600 font-semibold">{error}</p>
              <button onClick={fetchDetail} className="text-sm font-semibold hover:underline" style={{ color: '#1565C0' }}>Thử lại</button>
            </div>
          </div>
        )}

        {/* ── Hero Header ── */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{ background: heroGradient, borderRadius: '24px 24px 0 0' }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'white' }} />
          <div className="absolute top-8 -right-4 w-24 h-24 rounded-full opacity-8" style={{ background: 'white' }} />
          <div className="absolute -bottom-6 left-8 w-20 h-20 rounded-full opacity-8" style={{ background: 'white' }} />

          <div className="relative z-[1] px-7 pt-6 pb-7">
            {/* Top row: label + close */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_activity</span>
                </div>
                <h2 id="vd-title" className="text-white/80 text-sm font-semibold tracking-wide">Chi Tiết Voucher</h2>
              </div>
              <button
                onClick={handleClose}
                aria-label="Đóng"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <span className="material-symbols-outlined text-white text-lg">close</span>
              </button>
            </div>

            {/* Code + Discount */}
            {data && (
              <div className="flex items-end justify-between gap-4">
                <div>
                  {/* Code badge */}
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 mb-3 px-3.5 py-1.5 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                    title="Sao chép mã"
                  >
                    <span className="font-mono font-bold text-white text-base tracking-widest">{data.code}</span>
                    <span className="material-symbols-outlined text-white/70 text-sm">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied && <span className="text-white/80 text-xs">Đã sao chép!</span>}
                  </button>

                  {/* Big discount number */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-white/60 text-base font-semibold">Giảm</span>
                    <span className="text-white font-extrabold leading-none" style={{ fontSize: '2.6rem' }}>
                      {discountDisplay}
                    </span>
                  </div>

                  <p className="text-white/70 text-sm mt-1">
                    {data.label}
                    {data.minOrderValue > 0 && (
                      <span className="ml-1.5 text-white/50 text-xs">· Đơn từ {formatCurrency(data.minOrderValue)}</span>
                    )}
                  </p>
                </div>

                {/* Status badge */}
                {status && (
                  <div
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-pulse" />
                    {status.label}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description ribbon */}
          {data?.description && (
            <div
              className="px-7 py-3 text-xs font-medium italic"
              style={{ background: 'rgba(0,0,0,0.18)', color: 'rgba(255,255,255,0.75)' }}
            >
              "{data.description}"
            </div>
          )}
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#f8fafc' }}>
          <div className="p-5 space-y-4">

            {/* ── Usage Stats ── */}
            {data && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]" style={{ color: '#1565C0' }}>bar_chart</span>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Thống Kê Sử Dụng</p>
                </div>

                {/* 3 stat tiles */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
                  {[
                    {
                      value: usedCount.toLocaleString('vi-VN'),
                      label: 'Đã dùng',
                      icon: 'check_circle',
                      color: '#1565C0',
                      bg: '#EFF6FF',
                    },
                    {
                      value: isUnlimited ? '∞' : maxUses.toLocaleString('vi-VN'),
                      label: 'Tổng lượt',
                      icon: 'confirmation_number',
                      color: '#374151',
                      bg: '#F9FAFB',
                    },
                    {
                      value: savedCount.toLocaleString('vi-VN'),
                      label: 'Đã lưu ví',
                      icon: 'bookmark',
                      color: '#7C3AED',
                      bg: '#F5F3FF',
                    },
                  ].map(({ value, label, icon, color, bg }) => (
                    <div key={label} className="flex flex-col items-center py-4 px-2 gap-1.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1" style={{ background: bg }}>
                        <span className="material-symbols-outlined text-[17px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      </div>
                      <p className="text-2xl font-extrabold leading-none" style={{ color }}>{value}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="px-4 pb-4 pt-3 border-t border-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-500">Tỉ lệ sử dụng</span>
                    <span className="text-xs font-bold text-gray-700">
                      {isUnlimited ? `${usedCount} lượt` : `${Math.round(usageRatio * 100)}%`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(usageRatio * 100, usedCount > 0 ? 3 : 0)}%`,
                        background: `linear-gradient(90deg, ${progressColor}aa, ${progressColor})`,
                      }}
                    />
                  </div>
                  {!isUnlimited && (
                    <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                      Còn lại: <strong className="text-gray-600">{Math.max(0, maxUses - usedCount).toLocaleString('vi-VN')}</strong> lượt
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Metadata ── */}
            {data && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: 'event',
                    label: 'Hết hạn',
                    value: isNeverExpires(data.expiresAt)
                      ? 'Không giới hạn'
                      : formatDate(data.expiresAt),
                    iconColor: '#dc2626',
                    iconBg: '#FEF2F2',
                    isInfinite: isNeverExpires(data.expiresAt),
                  },
                  {
                    icon: 'calendar_add_on',
                    label: 'Ngày tạo',
                    value: formatDate(data.createdAt),
                    iconColor: '#1565C0',
                    iconBg: '#EFF6FF',
                    isInfinite: false,
                  },
                ].map(({ icon, label, value, iconColor, iconBg, isInfinite }) => (
                  <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                        <span className="material-symbols-outlined text-[15px]" style={{ color: iconColor }}>{icon}</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                      {isInfinite && (
                        <span className="material-symbols-outlined text-base text-gray-400">all_inclusive</span>
                      )}
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* ── User Redemptions ── */}
            {data && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]" style={{ color: '#1565C0' }}>group</span>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Người Dùng Gần Đây</p>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: '#EFF6FF', color: '#1565C0' }}
                  >
                    {savedCount} người đã lưu
                  </span>
                </div>

                {userVouchers.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: '#F1F5F9' }}
                    >
                      <span className="material-symbols-outlined text-3xl text-gray-300">group_off</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-500">Chưa có ai lưu voucher này</p>
                    <p className="text-xs text-gray-400 mt-1">Voucher sẽ xuất hiện ở đây khi có người sử dụng</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {userVouchers.map((uv) => (
                      <li
                        key={uv.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors"
                      >
                        {/* Avatar */}
                        {uv.user?.avatarUrl ? (
                          <img
                            src={uv.user.avatarUrl}
                            alt={uv.user.fullName}
                            className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #BFDBFE, #C4B5FD)' }}
                          >
                            <span className="text-blue-700 text-xs font-bold">{getInitials(uv.user?.fullName)}</span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{uv.user?.fullName ?? '—'}</p>
                          <p className="text-xs text-gray-400 truncate">{uv.user?.email ?? '—'}</p>
                        </div>

                        {/* Status + Time */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={
                              uv.isUsed
                                ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }
                                : { background: '#F1F5F9', color: '#64748b' }
                            }
                          >
                            {uv.isUsed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                            {uv.isUsed ? 'Đã dùng' : 'Đã lưu'}
                          </span>
                          <span className="text-[10px] text-gray-400">{formatDateTime(uv.savedAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {savedCount > 20 && (
                  <div className="px-4 py-3 border-t border-gray-50 text-center">
                    <p className="text-xs text-gray-400">Hiển thị 20/{savedCount} người gần nhất</p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom padding */}
            <div className="h-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

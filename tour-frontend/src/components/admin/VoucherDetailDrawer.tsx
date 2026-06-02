'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

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

interface VoucherAnalyticsTopTour {
  tourId: number;
  tourName: string;
  imageUrl: string | null;
  bookingCount: number;
  totalRevenue: number;
  totalDiscount: number;
}

interface VoucherAnalyticsBooking {
  id: number;
  bookingCode: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  numberOfPeople: number;
  totalPrice: number;
  discountAmount: number;
  customer: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  tour: {
    id: number;
    name: string;
    imageUrl: string | null;
  };
}

interface VoucherAnalytics {
  scope: 'paid_bookings_all_time';
  totalBookings: number;
  paidBookings: number;
  totalRevenue: number;
  totalDiscount: number;
  averageOrderValue: number;
  topTours: VoucherAnalyticsTopTour[];
  recentBookings: VoucherAnalyticsBooking[];
}

interface VoucherDetail {
  id: number;
  code: string;
  label: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue: number;
  maxUses: number;
  usageLimitPerUser?: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  isStackable: boolean;
  eligibleTourIds: number[];
  eligibleDestinationIds: number[];
  eligibleCustomerSegments: string[];
  createdAt: string;
  computedStatus: 'active' | 'expired' | 'depleted' | 'inactive' | 'scheduled';
  analytics?: VoucherAnalytics;
  userVouchers: UserVoucherEntry[];
  _count: { userVouchers: number };
}

interface VoucherDetailDrawerProps {
  voucherId: number | null;
  onClose: () => void;
}

const NEVER_EXPIRES_YEAR = 2099;

const formatCurrency = (value: number | undefined | null): string => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numberValue);
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const isNeverExpires = (value?: string | null): boolean => {
  if (!value) return true;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getFullYear() >= NEVER_EXPIRES_YEAR;
};

const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase();
};

const formatIdList = (items?: number[] | null): string => (
  items && items.length > 0 ? items.join(', ') : 'Tất cả'
);

const segmentLabels: Record<string, string> = {
  FIRST_TIME: 'Khách mới',
  RETURNING: 'Khách quay lại',
  SAVED_TO_WALLET: 'Đã lưu ví',
  ALL: 'Tất cả',
};

const formatSegments = (items?: string[] | null): string => (
  items && items.length > 0
    ? items.map((item) => segmentLabels[item] ?? item).join(', ')
    : 'Tất cả'
);

const bookingStatusLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã chốt',
  CANCEL_REQUESTED: 'Chờ hủy',
  CANCELLED: 'Đã hủy',
};

const paymentStatusLabels: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  UNPAID: { label: 'Chưa thanh toán', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  PROCESSING: { label: 'Đang xử lý', cls: 'bg-amber-50 text-amber-700 ring-amber-100' },
  FAILED: { label: 'Thất bại', cls: 'bg-red-50 text-red-700 ring-red-100' },
};

const statusConfig = {
  active: {
    label: 'Đang hoạt động',
    gradient: 'linear-gradient(135deg, #0f4c81 0%, #1565C0 45%, #1E88E5 100%)',
  },
  expired: {
    label: 'Đã hết hạn',
    gradient: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
  },
  depleted: {
    label: 'Hết lượt dùng',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  },
  inactive: {
    label: 'Vô hiệu hóa',
    gradient: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
  },
  scheduled: {
    label: 'Chưa bắt đầu',
    gradient: 'linear-gradient(135deg, #0f5a8a 0%, #2563eb 100%)',
  },
};

export default function VoucherDetailDrawer({ voucherId, onClose }: VoucherDetailDrawerProps) {
  const [data, setData] = useState<VoucherDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (voucherId !== null) {
      setData(null);
      setError('');
      const timer = window.setTimeout(() => setVisible(true), 10);
      return () => window.clearTimeout(timer);
    }

    setVisible(false);
    return undefined;
  }, [voucherId]);

  useEffect(() => {
    if (voucherId !== null) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [voucherId]);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, 250);
  }, [onClose]);

  const fetchDetail = useCallback(async () => {
    if (!voucherId) return;

    setIsLoading(true);
    setError('');
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/${voucherId}`);
      if (!response.ok) throw new Error('Không thể tải chi tiết voucher');
      const json = await response.json();
      setData(json?.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  }, [voucherId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const handleCopy = () => {
    if (!data?.code) return;
    navigator.clipboard?.writeText(data.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (voucherId === null) return null;

  const usedCount = Number(data?.usedCount) || 0;
  const maxUses = Number(data?.maxUses) || 999_999_999;
  const savedCount = data?._count?.userVouchers ?? 0;
  const userVouchers = data?.userVouchers ?? [];
  const analytics = data?.analytics;
  const isUnlimited = maxUses >= 999_999_999;
  const usageRatio = isUnlimited ? (usedCount > 0 ? 0.06 : 0) : Math.min(usedCount / maxUses, 1);
  const status = data?.computedStatus ? statusConfig[data.computedStatus] : null;
  const discountValue = Number(data?.discountValue);
  const discountDisplay = data
    ? data.discountType === 'PERCENTAGE'
      ? `${Number.isNaN(discountValue) ? '—' : discountValue}%`
      : formatCurrency(discountValue)
    : '';
  const progressColor = usageRatio >= 1 ? '#ef4444' : usageRatio >= 0.8 ? '#f59e0b' : '#3b82f6';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vd-title"
    >
      <div
        className={`absolute inset-0 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={handleClose}
      />

      <div
        className={`relative w-full max-w-[540px] flex flex-col overflow-hidden transition-[opacity,transform] duration-250 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
        style={{
          maxHeight: '92vh',
          borderRadius: '24px',
          background: '#ffffff',
          boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl animate-spin text-primary" aria-hidden="true">progress_activity</span>
              <p className="text-sm font-medium text-gray-500">Đang tải dữ liệu…</p>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white">
            <div className="flex flex-col items-center gap-3 px-8 text-center">
              <span className="material-symbols-outlined text-4xl text-red-500" aria-hidden="true">error</span>
              <p className="text-sm text-red-600 font-semibold">{error}</p>
              <button onClick={fetchDetail} className="text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-primary/40 rounded outline-none">
                Thử lại
              </button>
            </div>
          </div>
        )}

        <div
          className="relative shrink-0 overflow-hidden"
          style={{ background: status?.gradient ?? statusConfig.active.gradient, borderRadius: '24px 24px 0 0' }}
        >
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white opacity-10" aria-hidden="true" />
          <div className="absolute top-8 -right-4 w-24 h-24 rounded-full bg-white opacity-10" aria-hidden="true" />
          <div className="absolute -bottom-6 left-8 w-20 h-20 rounded-full bg-white opacity-10" aria-hidden="true" />

          <div className="relative z-[1] px-7 pt-6 pb-7">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/20">
                  <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">local_activity</span>
                </div>
                <h2 id="vd-title" className="text-white/80 text-sm font-semibold tracking-wide">Chi Tiết Voucher</h2>
              </div>
              <button
                onClick={handleClose}
                aria-label="Đóng"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70 outline-none"
              >
                <span className="material-symbols-outlined text-white text-lg" aria-hidden="true">close</span>
              </button>
            </div>

            {data && (
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <button
                    onClick={handleCopy}
                    aria-label={`Sao chép mã ${data.code}`}
                    className="inline-flex items-center gap-2 mb-3 px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70 outline-none"
                  >
                    <span className="font-mono font-bold text-white text-base tracking-widest">{data.code}</span>
                    <span className="material-symbols-outlined text-white/70 text-sm" aria-hidden="true">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied && <span className="text-white/80 text-xs">Đã sao chép!</span>}
                  </button>

                  <div className="flex items-baseline gap-2">
                    <span className="text-white/60 text-base font-semibold">Giảm</span>
                    <span className="text-white font-extrabold leading-none text-[2.6rem]">{discountDisplay}</span>
                  </div>

                  <p className="text-white/70 text-sm mt-1 truncate">
                    {data.label}
                    {data.minOrderValue > 0 && (
                      <span className="ml-1.5 text-white/50 text-xs">· Đơn từ {formatCurrency(data.minOrderValue)}</span>
                    )}
                  </p>
                </div>

                {status && (
                  <div className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-white/15 text-white border border-white/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-pulse" aria-hidden="true" />
                    {status.label}
                  </div>
                )}
              </div>
            )}
          </div>

          {data?.description && (
            <div className="px-7 py-3 text-xs font-medium italic bg-black/20 text-white/75">
              &quot;{data.description}&quot;
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-5 space-y-4">
            {data && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">bar_chart</span>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Thống Kê Sử Dụng</p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
                  {[
                    { value: usedCount.toLocaleString('vi-VN'), label: 'Đã dùng', icon: 'check_circle', color: '#1565C0', bg: '#EFF6FF' },
                    { value: isUnlimited ? '∞' : maxUses.toLocaleString('vi-VN'), label: 'Tổng lượt', icon: 'confirmation_number', color: '#374151', bg: '#F9FAFB' },
                    { value: savedCount.toLocaleString('vi-VN'), label: 'Đã lưu ví', icon: 'bookmark', color: '#7C3AED', bg: '#F5F3FF' },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col items-center py-4 px-2 gap-1.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1" style={{ background: item.bg }}>
                        <span className="material-symbols-outlined text-[17px]" style={{ color: item.color, fontVariationSettings: "'FILL' 1" }} aria-hidden="true">{item.icon}</span>
                      </div>
                      <p className="text-2xl font-extrabold leading-none" style={{ color: item.color }}>{item.value}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="px-4 pb-4 pt-3 border-t border-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-500">Tỉ lệ sử dụng</span>
                    <span className="text-xs font-bold text-gray-700">
                      {isUnlimited ? `${usedCount} lượt` : `${Math.round(usageRatio * 100)}%`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full overflow-hidden bg-gray-200">
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out"
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

            {data && analytics && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">query_stats</span>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Hiệu Quả Voucher</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500">Toàn thời gian</span>
                </div>

                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  {[
                    {
                      label: 'Booking dùng mã',
                      value: analytics.totalBookings.toLocaleString('vi-VN'),
                      icon: 'receipt_long',
                      color: '#1565C0',
                      note: `${analytics.paidBookings.toLocaleString('vi-VN')} đã thanh toán`,
                    },
                    { label: 'Doanh thu liên quan', value: formatCurrency(analytics.totalRevenue), icon: 'trending_up', color: '#059669', note: 'Chỉ booking PAID' },
                    { label: 'Tổng tiền giảm', value: formatCurrency(analytics.totalDiscount), icon: 'price_check', color: '#dc2626', note: 'Đã cấp cho booking PAID' },
                    { label: 'AOV', value: formatCurrency(analytics.averageOrderValue), icon: 'shopping_cart_checkout', color: '#7C3AED', note: 'Doanh thu / booking PAID' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white px-4 py-3 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[16px]" style={{ color: item.color }} aria-hidden="true">{item.icon}</span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{item.label}</p>
                      </div>
                      <p className="text-base font-extrabold text-gray-900 truncate">{item.value}</p>
                      <p className="text-[10px] text-gray-400 mt-1 truncate">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data && analytics && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">leaderboard</span>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Top Tour Dùng Voucher</p>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">Top {analytics.topTours.length}</span>
                </div>

                {analytics.topTours.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-gray-500">Chưa có booking đã thanh toán dùng mã này</p>
                    <p className="text-xs text-gray-400 mt-1">Top tour sẽ xuất hiện khi voucher tạo doanh thu thực tế.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {analytics.topTours.map((tour, index) => (
                      <li key={tour.tourId} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                          {tour.imageUrl ? (
                            <Image src={tour.imageUrl} alt={tour.tourName} width={40} height={40} sizes="40px" className="h-full w-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-xl" aria-hidden="true">map</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">
                            <span className="text-gray-400 mr-1">#{index + 1}</span>{tour.tourName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {tour.bookingCount.toLocaleString('vi-VN')} booking · Giảm {formatCurrency(tour.totalDiscount)}
                          </p>
                        </div>
                        <p className="text-xs font-extrabold text-emerald-700 shrink-0">{formatCurrency(tour.totalRevenue)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {data && analytics && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">manage_search</span>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Lịch Sử Booking Dùng Mã</p>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">20 gần nhất</span>
                </div>

                {analytics.recentBookings.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-gray-500">Chưa có booking dùng voucher này</p>
                    <p className="text-xs text-gray-400 mt-1">Khi khách áp dụng mã, lịch sử sẽ hiển thị tại đây.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {analytics.recentBookings.map((booking) => {
                      const payment = paymentStatusLabels[booking.paymentStatus] ?? { label: booking.paymentStatus, cls: 'bg-slate-100 text-slate-600 ring-slate-200' };

                      return (
                        <li key={booking.id} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {booking.customer?.avatarUrl ? (
                              <Image
                                src={booking.customer.avatarUrl}
                                alt={booking.customer.fullName}
                                width={34}
                                height={34}
                                sizes="34px"
                                className="h-[34px] w-[34px] rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                              />
                            ) : (
                              <div className="h-[34px] w-[34px] rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">
                                {getInitials(booking.customer?.fullName)}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="font-mono text-xs font-extrabold text-gray-800 truncate">{booking.bookingCode}</p>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${payment.cls}`}>{payment.label}</span>
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-1">
                                {booking.customer?.fullName ?? '—'} · {booking.tour?.name ?? '—'}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {formatDateTime(booking.createdAt)} · {bookingStatusLabels[booking.status] ?? booking.status} · {booking.numberOfPeople} khách
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs font-extrabold text-gray-900">{formatCurrency(booking.totalPrice)}</p>
                              <p className="text-[10px] text-red-500 mt-1">-{formatCurrency(booking.discountAmount)}</p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {data && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: 'event',
                    label: 'Hết hạn',
                    value: isNeverExpires(data.expiresAt) ? 'Không giới hạn' : formatDate(data.expiresAt),
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
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: item.iconBg }}>
                        <span className="material-symbols-outlined text-[15px]" style={{ color: item.iconColor }} aria-hidden="true">{item.icon}</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                      {item.isInfinite && (
                        <span className="material-symbols-outlined text-base text-gray-400" aria-hidden="true">all_inclusive</span>
                      )}
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {data && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">rule_settings</span>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Điều Kiện Áp Dụng</p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
                  {[
                    { label: 'Bắt đầu', value: formatDate(data.startsAt) },
                    {
                      label: 'Trần giảm',
                      value: data.discountType === 'PERCENTAGE' && data.maxDiscountAmount
                        ? formatCurrency(data.maxDiscountAmount)
                        : 'Không giới hạn',
                    },
                    {
                      label: 'Mỗi khách',
                      value: data.usageLimitPerUser ? `${data.usageLimitPerUser} lần` : 'Không giới hạn',
                    },
                    { label: 'Cộng dồn', value: data.isStackable ? 'Cho phép' : 'Không' },
                    { label: 'Tour ID', value: formatIdList(data.eligibleTourIds) },
                    { label: 'Điểm đến ID', value: formatIdList(data.eligibleDestinationIds) },
                  ].map((item) => (
                    <div key={item.label} className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate" aria-label={`${item.label}: ${item.value}`}>{item.value}</p>
                    </div>
                  ))}
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nhóm khách</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatSegments(data.eligibleCustomerSegments)}</p>
                  </div>
                </div>
              </div>
            )}

            {data && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">group</span>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Người Dùng Gần Đây</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-primary">
                    {savedCount} người đã lưu
                  </span>
                </div>

                {userVouchers.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-slate-100">
                      <span className="material-symbols-outlined text-3xl text-gray-300" aria-hidden="true">group_off</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-500">Chưa có ai lưu voucher này</p>
                    <p className="text-xs text-gray-400 mt-1">Voucher sẽ xuất hiện ở đây khi có người sử dụng</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {userVouchers.map((userVoucher) => (
                      <li key={userVoucher.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors">
                        {userVoucher.user?.avatarUrl ? (
                          <Image
                            src={userVoucher.user.avatarUrl}
                            alt={userVoucher.user.fullName}
                            width={36}
                            height={36}
                            sizes="36px"
                            className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm bg-blue-100">
                            <span className="text-blue-700 text-xs font-bold">{getInitials(userVoucher.user?.fullName)}</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{userVoucher.user?.fullName ?? '—'}</p>
                          <p className="text-xs text-gray-400 truncate">{userVoucher.user?.email ?? '—'}</p>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              userVoucher.isUsed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-transparent'
                            }`}
                          >
                            {userVoucher.isUsed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />}
                            {userVoucher.isUsed ? 'Đã dùng' : 'Đã lưu'}
                          </span>
                          <span className="text-[10px] text-gray-400">{formatDateTime(userVoucher.savedAt)}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}

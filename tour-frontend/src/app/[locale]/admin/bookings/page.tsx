'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import AdminPagination from '@/components/admin/AdminPagination';
import { API_BASE_URL } from '@/lib/constants';


// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingUser {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
}

interface BookingTour {
  id: number;
  name: string;
  imageUrl?: string;
  tourCode: string;
  destination?: { name: string };
}

interface Booking {
  id: number;
  bookingCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCEL_REQUESTED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED';
  numberOfPeople: number;
  totalPrice: number;
  unitPriceAtBooking: number;
  discountAmount: number;
  voucherCode?: string | null;
  createdAt: string;
  user: BookingUser;
  tour: BookingTour | null;
  refundAmount?: number | null;
  refundedAt?: string | null;
  notifications?: BookingNotification[];
}

interface BookingNotification {
  id: number;
  type: string;
  channel: string;
  recipient?: string | null;
  status: string;
  content: string;
  paymentUrl?: string | null;
  qrCodeUrl?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

interface Stats {
  pending: number;
  confirmed: number;
  cancelRequested: number;
  cancelled: number;
  total: number;
  totalRevenue: number;
  paidCount: number;
  unpaidCount: number;
  processingCount?: number;
  failedPaymentCount: number;
  assistedDraftPending?: number;
  assistedDraftNeedsRevision?: number;
}

interface Meta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

type AssistedDraftStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'NEEDS_REVISION' | 'REJECTED' | 'CONVERTED';
type AssistedDraftAction = 'submit' | 'approve' | 'reject' | 'request-revision';
type AssistedDraftReviewAction = Extract<AssistedDraftAction, 'approve' | 'reject' | 'request-revision'>;
type PassengerType = 'Adult (12+)' | 'Child (4-11)' | 'Infant (<4)';

type DraftPassenger = {
  type?: PassengerType | string;
  [key: string]: unknown;
};

interface AssistedDraft {
  id: number;
  draftCode: string;
  status: AssistedDraftStatus;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerIdentityNo?: string | null;
  sourceChannel: string;
  confirmationChannel?: string | null;
  emailForTicket?: string | null;
  tourId?: number | null;
  packageId?: number | null;
  departureId?: number | null;
  numberOfPeople: number;
  quotedPrice: number;
  unitPriceAtDraft?: number | null;
  discountAmount: number;
  passengers?: DraftPassenger[] | null;
  voucherCode?: string | null;
  internalNote?: string | null;
  specialRequests?: string | null;
  rejectionReason?: string | null;
  approvalNote?: string | null;
  createdAt: string;
  tour?: BookingTour | null;
  createdByStaff?: { id: number; fullName: string; email: string; role: string } | null;
  reviewedByAdmin?: { id: number; fullName: string; email: string; role: string } | null;
  convertedBooking?: { id: number; bookingCode: string; status: string; paymentStatus: string } | null;
}

interface TourDepartureOption {
  id?: number;
  departureDate?: string | null;
  price?: number | null;
  availableSeats?: number;
  isActive?: boolean;
}

interface TourOption {
  id: number;
  name: string;
  price: number;
  availableSeats: number;
  imageUrl?: string | null;
  destination?: { name: string };
  packages?: { id: number; name: string; price: number; isActive?: boolean }[];
  departures?: TourDepartureOption[];
}

type AssistedDraftForm = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerIdentityNo: string;
  sourceChannel: string;
  confirmationChannel: string;
  emailForTicket: string;
  tourId: string;
  departureId: string;
  packageId: string;
  adultCount: string;
  childCount: string;
  infantCount: string;
  voucherCode: string;
  specialRequests: string;
  internalNote: string;
};

type AssistedDraftFormErrors = Partial<Record<keyof AssistedDraftForm, string>>;


// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const fmtCompact = (n: number) => fmt(n); // Hiển thị full số cho chuyên nghiệp trên màn hình lớn


const PASSENGER_PRICING: Record<PassengerType, { label: string; age: string; icon: string; multiplier: number }> = {
  'Adult (12+)': { label: 'Người lớn', age: '12+', icon: 'person', multiplier: 1 },
  'Child (4-11)': { label: 'Trẻ em', age: '4-11', icon: 'child_care', multiplier: 0.7 },
  'Infant (<4)': { label: 'Em bé', age: '<4', icon: 'baby_changing_station', multiplier: 0.1 },
};

const passengerTypeOrder: PassengerType[] = ['Adult (12+)', 'Child (4-11)', 'Infant (<4)'];

const parsePassengerCount = (value: string, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

const normalizePassengerTypeLabel = (type?: string): PassengerType => {
  const normalized = String(type ?? '').toUpperCase();
  if (normalized === 'CHILD' || normalized === 'CHILD (4-11)') return 'Child (4-11)';
  if (normalized === 'INFANT' || normalized === 'INFANT (<4)') return 'Infant (<4)';
  return 'Adult (12+)';
};

const getPassengerCounts = (passengers?: DraftPassenger[] | null, fallbackPeople = 1) => {
  const counts: Record<PassengerType, number> = {
    'Adult (12+)': 0,
    'Child (4-11)': 0,
    'Infant (<4)': 0,
  };

  if (Array.isArray(passengers) && passengers.length > 0) {
    passengers.forEach(passenger => {
      counts[normalizePassengerTypeLabel(String(passenger?.type ?? 'Adult (12+)'))] += 1;
    });
  } else {
    counts['Adult (12+)'] = Math.max(1, Number(fallbackPeople) || 1);
  }

  return counts;
};

const formatPassengerBreakdown = (passengers?: DraftPassenger[] | null, fallbackPeople = 1) => {
  const counts = getPassengerCounts(passengers, fallbackPeople);
  const parts = passengerTypeOrder
    .filter(type => counts[type] > 0)
    .map(type => `${counts[type]} ${PASSENGER_PRICING[type].label.toLowerCase()}`);
  return parts.length ? parts.join(' · ') : `${Math.max(1, fallbackPeople)} khách`;
};

const buildPassengerDraftPayload = (form: AssistedDraftForm): DraftPassenger[] => {
  const adultCount = Math.max(1, parsePassengerCount(form.adultCount, 1));
  const childCount = parsePassengerCount(form.childCount);
  const infantCount = parsePassengerCount(form.infantCount);

  return [
    ...Array.from({ length: adultCount }, (_, index) => ({
      type: 'Adult (12+)' as PassengerType,
      ...(index === 0
        ? {
            fullName: form.customerName.trim() || undefined,
            identityType: 'CCCD',
            identityNo: form.customerIdentityNo.trim() || undefined,
          }
        : {}),
    })),
    ...Array.from({ length: childCount }, () => ({ type: 'Child (4-11)' as PassengerType })),
    ...Array.from({ length: infantCount }, () => ({ type: 'Infant (<4)' as PassengerType })),
  ];
};

const toValidDate = (d?: string | null) => {
  if (!d) return null;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const fmtDate = (d?: string | null) => {
  const date = toValidDate(d);
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const fmtDateTime = (d?: string | null) => {
  const date = toValidDate(d);
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
};

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getApiErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== 'object') return fallback;
  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join('\n');
  if (typeof message === 'string') return message;
  return fallback;
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const normalizePhone = (phone: string) => phone.replace(/[\s.-]/g, '');

const isValidVietnamPhone = (phone: string) =>
  /^(0|\+84)\d{9}$/.test(normalizePhone(phone));

const isValidCccd = (value: string) => /^\d{12}$/.test(value.trim());

const hasDetailedDeparture = (departure: TourDepartureOption) =>
  typeof departure.id === 'number' && Boolean(toValidDate(departure.departureDate));

const hasLoadedBookingOptions = (tour?: TourOption) =>
  Boolean(
    tour &&
    Array.isArray(tour.packages) &&
    Array.isArray(tour.departures) &&
    tour.departures.every(hasDetailedDeparture),
  );

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600',
  'from-teal-400 to-cyan-600',   'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500','from-emerald-400 to-green-600',
];

// ─── Config Maps ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string; icon: string }> = {
  PENDING:          { label: 'Chờ xử lý',    dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',         icon: 'schedule'      },
  CONFIRMED:        { label: 'Đã xác nhận',  dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',   icon: 'check_circle'  },
  CANCEL_REQUESTED: { label: 'Chờ Duyệt Hủy', dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-600 border-orange-200',       icon: 'pending'       },
  CANCELLED:        { label: 'Đã hủy',       dot: 'bg-red-400',     badge: 'bg-red-50 text-red-600 border-red-200',                icon: 'cancel'        },
};

const PAY_CFG: Record<string, { label: string; badge: string; icon: string }> = {
  PAID:   { label: 'Đã thanh toán',   badge: 'bg-blue-50 text-blue-700 border-blue-200',       icon: 'paid'            },
  UNPAID: { label: 'Chưa thanh toán', badge: 'bg-orange-50 text-orange-600 border-orange-200', icon: 'pending_actions' },
  FAILED: { label: 'Thất bại',        badge: 'bg-red-50 text-red-600 border-red-200',           icon: 'money_off'       },
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

const ASSISTED_STATUS_CFG: Record<AssistedDraftStatus, { label: string; badge: string; icon: string }> = {
  DRAFT: { label: 'Bản nháp', badge: 'bg-slate-50 text-slate-700 border-slate-200', icon: 'edit_note' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'approval_delegation' },
  NEEDS_REVISION: { label: 'Cần sửa', badge: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'rate_review' },
  REJECTED: { label: 'Từ chối', badge: 'bg-red-50 text-red-700 border-red-200', icon: 'block' },
  CONVERTED: { label: 'Đã tạo đơn', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'task_alt' },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-outline-variant/8 animate-pulse">
      <td className="py-4 px-5"><div className="h-4 w-32 bg-surface-container-high rounded-md" /></td>
      <td className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-surface-container-high shrink-0" />
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-surface-container-high rounded" />
            <div className="h-2.5 w-20 bg-surface-container rounded" />
          </div>
        </div>
      </td>
      <td className="py-4 px-5"><div className="h-3.5 w-36 bg-surface-container-high rounded mb-2" /><div className="h-2.5 w-24 bg-surface-container rounded" /></td>
      <td className="py-4 px-5"><div className="h-4 w-20 bg-surface-container-high rounded" /></td>
      <td className="py-4 px-5"><div className="h-6 w-24 bg-surface-container-high rounded-full" /></td>
      <td className="py-4 px-5"><div className="h-6 w-28 bg-surface-container-high rounded-full" /></td>
      <td className="py-4 px-5"><div className="h-3.5 w-20 bg-surface-container-high rounded" /></td>
      <td className="py-4 px-5 text-right"><div className="h-8 w-20 bg-surface-container-high rounded-lg ml-auto" /></td>
    </tr>
  );
}

// ─── Booking Detail Modal ─────────────────────────────────────────────────────

function BookingDetailModal({
  booking,
  onClose,
  onConfirmSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onConfirmSuccess: (updated: Booking) => void;
}) {
  const sc = STATUS_CFG[booking.status] ?? STATUS_CFG.PENDING;
  const pc = PAY_CFG[booking.paymentStatus] ?? PAY_CFG.UNPAID;
  const colorIdx = booking.user.id % AVATAR_COLORS.length;
  const latestPaymentRequest = booking.paymentStatus === 'PAID' ? undefined : booking.notifications?.[0];
  const discountAmount = Math.max(0, Number(booking.discountAmount) || 0);
  const subtotalBeforeDiscount = booking.totalPrice + discountAmount;
  const hasDiscount = discountAmount > 0;

  // Confirm dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmDialog) setShowConfirmDialog(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose, showConfirmDialog]);

  const handleConfirmManual = async () => {
    setIsConfirming(true);
    setConfirmError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/confirm-manual`, { method: 'PATCH' });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.message ?? 'Xác nhận thất bại';
        throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
      }
      // TransformInterceptor: json.data = updated booking
      const updated = json?.data ?? json;
      onConfirmSuccess({ ...booking, ...updated });
      setShowConfirmDialog(false);
    } catch (e: unknown) {
      setConfirmError(getErrorMessage(e, 'Có lỗi xảy ra'));
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bk-modal-title">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={showConfirmDialog ? undefined : onClose} />

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

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest/50 flex flex-col-reverse items-stretch justify-end shrink-0 gap-3 sm:flex-row sm:items-center">
          {/* Nút xác nhận thủ công — chỉ hiển thị khi đơn PENDING */}
          {booking.status === 'PENDING' && (
            <button
              onClick={() => setShowConfirmDialog(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] transition-[background-color,box-shadow,transform] shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              Xác nhận & Thu tiền thủ công
            </button>
          )}

          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container hover:text-on-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Đóng
          </button>
        </div>
      </div>

      {/* ── Confirm Dialog (overlay on top of modal) ── */}
      {showConfirmDialog && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-3xl" />
          <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-slide-up">

            {/* Warning icon */}
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-amber-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>

            <h3 className="text-lg font-bold text-on-surface text-center mb-2">Xác nhận thủ công?</h3>
            <p className="text-sm text-on-surface-variant text-center leading-relaxed mb-1">
              Thao tác này sẽ đánh dấu đơn
            </p>
            <p className="font-mono text-sm font-bold text-primary text-center mb-3">{booking.bookingCode}</p>
            <p className="text-sm text-on-surface-variant text-center leading-relaxed mb-5">
              là <strong className="text-emerald-600">ĐÃ XÁC NHẬN</strong> và <strong className="text-blue-600">ĐÃ THANH TOÁN</strong>.<br />
              Chỉ thực hiện khi bạn chắc chắn khách hàng đã thanh toán thực tế.
            </p>

            {confirmError && (
              <div className="mb-4 px-4 py-3 bg-error/10 text-error rounded-xl text-sm font-medium border border-error/20">
                {confirmError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirmDialog(false); setConfirmError(''); }}
                disabled={isConfirming}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors disabled:opacity-50 outline-none"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmManual}
                disabled={isConfirming}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {isConfirming ? (
                  <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang xử lý…</>
                ) : (
                  <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span> Xác nhận ngay</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

function CancelRequestPanel({ onActionDone }: { onActionDone: () => void }) {
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

// ─── Main Page ────────────────────────────────────────────────────────────────

function AssistedBookingWorkspace({
  onChanged,
  showToast,
}: {
  onChanged: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const [drafts, setDrafts] = useState<AssistedDraft[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [role, setRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<AssistedDraft | null>(null);
  const [viewingDraft, setViewingDraft] = useState<AssistedDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isTourPickerOpen, setIsTourPickerOpen] = useState(false);
  const [tourQuery, setTourQuery] = useState('');
  const tourPickerRef = useRef<HTMLDivElement | null>(null);
  const [submitErrors, setSubmitErrors] = useState<AssistedDraftFormErrors>({});
  const [draftFormError, setDraftFormError] = useState<string | null>(null);
  const [draftActionDialog, setDraftActionDialog] = useState<{
    draft: AssistedDraft;
    action: AssistedDraftReviewAction;
    reason: string;
    error?: string;
    isSubmitting: boolean;
  } | null>(null);
  const [form, setForm] = useState<AssistedDraftForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerIdentityNo: '',
    sourceChannel: 'LIVE_CHAT',
    confirmationChannel: 'ZALO',
    emailForTicket: '',
    tourId: '',
    departureId: '',
    packageId: '',
    adultCount: '1',
    childCount: '0',
    infantCount: '0',
    voucherCode: '',
    specialRequests: '',
    internalNote: '',
  });

  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const selectedTour = tours.find(t => String(t.id) === form.tourId);
  const selectedTourDepartures = (selectedTour?.departures ?? []).filter(hasDetailedDeparture);
  const selectedDeparture = selectedTourDepartures.find(d => String(d.id) === form.departureId);
  const selectedPackage = selectedTour?.packages?.find(p => String(p.id) === form.packageId);
  const estimatedUnitPrice = (selectedDeparture?.price ?? selectedTour?.price ?? 0) + (selectedPackage?.price ?? 0);
  const adultCount = Math.max(1, parsePassengerCount(form.adultCount, 1));
  const childCount = parsePassengerCount(form.childCount);
  const infantCount = parsePassengerCount(form.infantCount);
  const totalPassengerCount = adultCount + childCount + infantCount;
  const estimatedTotal =
    adultCount * estimatedUnitPrice * PASSENGER_PRICING['Adult (12+)'].multiplier +
    childCount * estimatedUnitPrice * PASSENGER_PRICING['Child (4-11)'].multiplier +
    infantCount * estimatedUnitPrice * PASSENGER_PRICING['Infant (<4)'].multiplier;
  const filteredTours = useMemo(() => {
    const query = tourQuery.trim().toLowerCase();
    if (!query) return tours;
    return tours.filter(t => {
      const haystack = `${t.name} ${t.destination?.name ?? ''} ${t.price}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [tourQuery, tours]);
  const draftInputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
  const draftErrorInputClass = 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-100';
  const draftLabelClass = 'text-[11px] font-black uppercase tracking-[0.14em] text-slate-500';
  const fieldClass = (key: keyof AssistedDraftForm) =>
    `${draftInputClass} ${submitErrors[key] ? draftErrorInputClass : ''}`;
  const requiredMark = <span className="text-red-500">*</span>;
  const fieldError = (key: keyof AssistedDraftForm) =>
    submitErrors[key] ? (
      <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
        <span className="material-symbols-outlined text-[14px]">error</span>
        {submitErrors[key]}
      </p>
    ) : null;
  const draftActionDialogConfig = draftActionDialog?.action === 'reject'
    ? {
        eyebrow: 'Từ chối duyệt',
        title: 'Từ chối bản nháp đặt hộ',
        description: 'Bản nháp sẽ chuyển sang trạng thái từ chối. Staff vẫn xem được lý do để trao đổi lại với khách.',
        icon: 'block',
        iconClass: 'bg-red-50 text-red-700 ring-red-100',
        label: 'Lý do từ chối',
        placeholder: 'Ví dụ: Không đủ thông tin khách hàng, tour đã hết chỗ, giá/voucher không hợp lệ...',
        submitLabel: 'Từ chối bản nháp',
        submitClass: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        hint: 'Viết rõ nguyên nhân nghiệp vụ để staff không phải hỏi lại admin.',
        requiresReason: true,
      }
    : draftActionDialog?.action === 'request-revision'
      ? {
          eyebrow: 'Yêu cầu chỉnh sửa',
          title: 'Gửi yêu cầu sửa cho staff',
          description: 'Bản nháp sẽ quay về trạng thái cần sửa. Staff sẽ dùng nội dung này làm checklist trước khi gửi duyệt lại.',
          icon: 'rate_review',
          iconClass: 'bg-amber-50 text-amber-700 ring-amber-100',
          label: 'Nội dung cần chỉnh sửa',
          placeholder: 'Ví dụ: Bổ sung CCCD khách chính, chọn ngày khởi hành 18/06, xác nhận lại email nhận vé...',
          submitLabel: 'Gửi yêu cầu sửa',
          submitClass: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500',
          hint: 'Ưu tiên gạch đầu dòng các việc cần sửa để staff xử lý nhanh.',
          requiresReason: true,
        }
      : draftActionDialog?.action === 'approve'
        ? {
            eyebrow: 'Xác nhận duyệt',
            title: 'Duyệt bản nháp và tạo booking',
            description: 'Sau khi duyệt, hệ thống sẽ tạo booking thật, giữ chỗ tour và gửi yêu cầu thanh toán cho khách theo kênh đã chọn.',
            icon: 'task_alt',
            iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
            label: 'Ghi chú duyệt',
            placeholder: 'Ví dụ: Đã kiểm tra thông tin khách, lịch khởi hành và giá tour.',
            submitLabel: 'Duyệt và tạo booking',
            submitClass: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
            hint: 'Ghi chú là tùy chọn. Kiểm tra kỹ thông tin trước khi xác nhận vì thao tác này tạo đơn thật.',
            requiresReason: false,
          }
        : null;

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (search) qs.set('search', search);
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/assisted-drafts?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Load failed');
      const payload = json?.data ?? json;
      setDrafts(Array.isArray(payload) ? payload : []);
    } catch {
      showToast('Không tải được danh sách bản nháp đặt hộ', false);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/auth/profile`)
      .then(r => r.json())
      .then(json => {
        const data = json?.data ?? json;
        setRole(String(data?.role ?? ''));
      })
      .catch(() => setRole(''));
  }, []);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/tour?limit=100&sortBy=recommended`)
      .then(r => r.json())
      .then(json => {
        const payload = json?.data ?? json;
        setTours(Array.isArray(payload) ? payload : (payload?.data ?? []));
      })
      .catch(() => showToast('Không tải được danh sách tour', false));
  }, [showToast]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  useEffect(() => {
    if (!isTourPickerOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!tourPickerRef.current?.contains(event.target as Node)) {
        setIsTourPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isTourPickerOpen]);

  useEffect(() => {
    const tourId = Number(form.tourId);
    if (!tourId) return;
    const current = tours.find(t => t.id === tourId);
    if (hasLoadedBookingOptions(current)) return;

    fetchWithAuth(`${API_BASE_URL}/tour/${tourId}`)
      .then(r => r.json())
      .then(json => {
        const detail = json?.data ?? json;
        setTours(prev => prev.map(t => t.id === tourId ? { ...t, ...detail } : t));
      })
      .catch(() => {});
  }, [form.tourId, tours]);

  const validateForApproval = () => {
    const errors: AssistedDraftFormErrors = {};
    const currentAdultCount = parsePassengerCount(form.adultCount, 1);
    const currentChildCount = parsePassengerCount(form.childCount);
    const currentInfantCount = parsePassengerCount(form.infantCount);
    const currentTotalPassengerCount = currentAdultCount + currentChildCount + currentInfantCount;

    if (!form.customerName.trim()) errors.customerName = 'Nhập tên khách trước khi gửi duyệt';
    if (!form.customerEmail.trim()) errors.customerEmail = 'Nhập email để tạo hồ sơ khách';
    else if (!isValidEmail(form.customerEmail)) errors.customerEmail = 'Email chưa đúng định dạng';
    if (form.emailForTicket.trim() && !isValidEmail(form.emailForTicket)) errors.emailForTicket = 'Email nhận vé chưa đúng định dạng';
    if (!form.customerPhone.trim()) errors.customerPhone = 'Nhập số điện thoại để staff/admin liên hệ';
    else if (!isValidVietnamPhone(form.customerPhone)) errors.customerPhone = 'Số điện thoại chưa đúng định dạng Việt Nam';
    if (!form.customerIdentityNo.trim()) errors.customerIdentityNo = 'Nhập CCCD của khách';
    else if (!isValidCccd(form.customerIdentityNo)) errors.customerIdentityNo = 'CCCD phải gồm đúng 12 chữ số';
    if (!form.tourId) errors.tourId = 'Chọn tour cần đặt hộ';
    if (form.confirmationChannel === 'EMAIL' && !form.emailForTicket.trim() && !form.customerEmail.trim()) {
      errors.emailForTicket = 'Cần email để gửi xác nhận thanh toán';
    }
    if (currentAdultCount < 1) errors.adultCount = 'Cần ít nhất 1 người lớn đại diện';
    if (currentInfantCount > currentAdultCount) errors.infantCount = 'Số em bé không vượt quá số người lớn';
    if (currentTotalPassengerCount < 1) errors.adultCount = 'Số khách phải từ 1 trở lên';
    if (selectedTourDepartures.length > 0 && !form.departureId) {
      errors.departureId = 'Chọn lịch khởi hành cụ thể';
    }

    setSubmitErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateForm = (key: keyof AssistedDraftForm, value: string) => {
    if (draftFormError) setDraftFormError(null);
    if (submitErrors[key]) {
      setSubmitErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setForm(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'tourId' ? { departureId: '', packageId: '' } : {}),
    }));
  };

  const updatePassengerCount = (key: 'adultCount' | 'childCount' | 'infantCount', value: string) => {
    if (draftFormError) setDraftFormError(null);
    if (submitErrors[key]) {
      setSubmitErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    setForm(prev => {
      const next = { ...prev };
      const min = key === 'adultCount' ? 1 : 0;
      const cleaned = value.replace(/\D/g, '');
      const parsed = cleaned === '' ? min : Math.max(min, Number(cleaned));
      next[key] = String(parsed);

      if (key === 'adultCount') {
        const adults = Math.max(1, parsed);
        const infants = parsePassengerCount(prev.infantCount);
        if (infants > adults) next.infantCount = String(adults);
      }

      if (key === 'infantCount') {
        const adults = Math.max(1, parsePassengerCount(prev.adultCount, 1));
        next.infantCount = String(Math.min(parsed, adults));
      }

      return next;
    });
  };

  const resetDraftForm = () => {
    setEditingDraft(null);
    setSubmitErrors({});
    setDraftFormError(null);
    setTourQuery('');
    setIsTourPickerOpen(false);
    setForm({
      customerName: '', customerEmail: '', customerPhone: '', customerIdentityNo: '', sourceChannel: 'LIVE_CHAT', confirmationChannel: 'ZALO', emailForTicket: '',
      tourId: '', departureId: '', packageId: '', adultCount: '1', childCount: '0', infantCount: '0',
      voucherCode: '', specialRequests: '', internalNote: '',
    });
  };

  const openCreateDraft = () => {
    resetDraftForm();
    setIsDrawerOpen(true);
  };

  const openEditDraft = (draft: AssistedDraft) => {
    const counts = getPassengerCounts(draft.passengers, draft.numberOfPeople || 1);
    setEditingDraft(draft);
    setSubmitErrors({});
    setDraftFormError(null);
    setTourQuery('');
    setIsTourPickerOpen(false);
    setForm({
      customerName: draft.customerName ?? '',
      customerEmail: draft.customerEmail ?? '',
      customerPhone: draft.customerPhone ?? '',
      customerIdentityNo: draft.customerIdentityNo ?? '',
      sourceChannel: draft.sourceChannel || 'LIVE_CHAT',
      confirmationChannel: draft.confirmationChannel || 'ZALO',
      emailForTicket: draft.emailForTicket ?? draft.customerEmail ?? '',
      tourId: draft.tourId ? String(draft.tourId) : '',
      departureId: draft.departureId ? String(draft.departureId) : '',
      packageId: draft.packageId ? String(draft.packageId) : '',
      adultCount: String(counts['Adult (12+)']),
      childCount: String(counts['Child (4-11)']),
      infantCount: String(counts['Infant (<4)']),
      voucherCode: draft.voucherCode ?? '',
      specialRequests: draft.specialRequests ?? '',
      internalNote: draft.internalNote ?? '',
    });
    setIsDrawerOpen(true);
  };

  const openDraftDetail = (draft: AssistedDraft) => {
    setViewingDraft(draft);
  };

  const createDraft = async (submitAfterCreate: boolean) => {
    setDraftFormError(null);
    if (submitAfterCreate && !validateForApproval()) {
      const msg = 'Vui lòng kiểm tra các trường bắt buộc được đánh dấu bên dưới.';
      setDraftFormError(msg);
      showToast('Vui lòng hoàn tất các trường bắt buộc trước khi gửi duyệt', false);
      return;
    }

    setIsSaving(true);
    try {
      const passengers = buildPassengerDraftPayload(form);
      const body = {
        customerName: form.customerName.trim() || undefined,
        customerEmail: form.customerEmail.trim() || undefined,
        customerPhone: form.customerPhone.trim() || undefined,
        customerIdentityNo: form.customerIdentityNo.trim() || undefined,
        sourceChannel: form.sourceChannel,
        confirmationChannel: form.confirmationChannel,
        emailForTicket: form.emailForTicket.trim() || form.customerEmail.trim() || undefined,
        tourId: form.tourId ? Number(form.tourId) : undefined,
        departureId: form.departureId ? Number(form.departureId) : undefined,
        packageId: form.packageId ? Number(form.packageId) : undefined,
        numberOfPeople: passengers.length,
        passengers,
        voucherCode: form.voucherCode.trim() || undefined,
        specialRequests: form.specialRequests.trim() || undefined,
        internalNote: form.internalNote.trim() || undefined,
      };

      if (submitAfterCreate && (!body.customerName || !body.customerEmail || !body.tourId)) {
        const msg = 'Vui lòng nhập khách hàng và chọn tour';
        setDraftFormError(msg);
        showToast(msg, false);
        return;
      }

      const res = await fetchWithAuth(
        editingDraft
          ? `${API_BASE_URL}/booking/admin/assisted-drafts/${editingDraft.id}`
          : `${API_BASE_URL}/booking/admin/assisted-drafts`,
        {
        method: editingDraft ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(getApiErrorMessage(json, editingDraft ? 'Cập nhật bản nháp thất bại' : 'Tạo bản nháp thất bại'));
      let draft: AssistedDraft = json?.data ?? json;

      if (submitAfterCreate) {
        const submitRes = await fetchWithAuth(`${API_BASE_URL}/booking/admin/assisted-drafts/${draft.id}/submit`, { method: 'POST' });
        const submitJson = await submitRes.json();
        if (!submitRes.ok) throw new Error(getApiErrorMessage(submitJson, 'Gửi duyệt thất bại'));
        draft = submitJson?.data ?? submitJson;
      }

      setDrafts(prev => editingDraft
        ? prev.map(item => item.id === draft.id ? draft : item)
        : [draft, ...prev]);
      setIsDrawerOpen(false);
      resetDraftForm();
      showToast(submitAfterCreate ? 'Đã lưu và gửi duyệt bản nháp' : (editingDraft ? 'Đã cập nhật bản nháp' : 'Đã lưu bản nháp đặt hộ'));
    } catch (e: unknown) {
      const msg = getErrorMessage(e, 'Thao tác thất bại');
      setDraftFormError(msg);
      showToast(msg, false);
    } finally {
      setIsSaving(false);
    }
  };

  const executeDraftAction = async (draft: AssistedDraft, action: AssistedDraftAction, reason = '') => {
    try {
      const body =
        action === 'approve'
          ? { note: reason || 'Approved from admin booking console' }
          : action === 'reject' || action === 'request-revision'
            ? { reason }
            : {};
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/assisted-drafts/${draft.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(String(json?.message ?? 'Thao tác thất bại'));
      const payload = json?.data ?? json;
      const updated = payload?.draft ?? payload;
      setDrafts(prev => prev.map(item => item.id === draft.id ? updated : item));
      if (action === 'approve') onChanged();
      showToast(action === 'approve' ? 'Đã duyệt và tạo booking thật' : 'Đã cập nhật bản nháp');
      return true;
    } catch (e: unknown) {
      showToast(getErrorMessage(e, 'Thao tác thất bại'), false);
      return false;
    }
  };

  const runDraftAction = (draft: AssistedDraft, action: AssistedDraftAction) => {
    if (action === 'approve' || action === 'reject' || action === 'request-revision') {
      setDraftActionDialog({
        draft,
        action,
        reason: '',
        isSubmitting: false,
      });
      return;
    }

    void executeDraftAction(draft, action);
  };

  const closeDraftActionDialog = () => {
    setDraftActionDialog(current => current?.isSubmitting ? current : null);
  };

  const submitDraftActionDialog = async () => {
    if (!draftActionDialog) return;
    const reason = draftActionDialog.reason.trim();
    if ((draftActionDialog.action === 'reject' || draftActionDialog.action === 'request-revision') && !reason) {
      setDraftActionDialog(current => current ? { ...current, error: 'Vui lòng nhập nội dung phản hồi trước khi gửi.' } : current);
      return;
    }

    setDraftActionDialog(current => current ? { ...current, reason, error: undefined, isSubmitting: true } : current);
    const success = await executeDraftAction(draftActionDialog.draft, draftActionDialog.action, reason);
    if (success) {
      setDraftActionDialog(null);
    } else {
      setDraftActionDialog(current => current ? { ...current, isSubmitting: false } : current);
    }
  };

  const pendingCount = drafts.filter(d => d.status === 'PENDING_APPROVAL').length;

  return (
    <section className="mb-8 rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-950 via-blue-800 to-sky-700 px-5 py-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[15px]">support_agent</span>
              Assisted booking
            </div>
            <h2 className="mt-3 text-xl font-extrabold">Đặt tour hộ khách</h2>
            <p className="mt-1 max-w-2xl text-sm text-blue-50/85">
              Staff lưu bản nháp từ chat/Zalo/Facebook, gửi admin hoặc super admin duyệt trước khi tạo đơn thật.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/12 px-4 py-2 text-sm">
              <span className="block text-[11px] uppercase tracking-wider text-blue-100">Chờ duyệt</span>
              <span className="text-lg font-black">{pendingCount}</span>
            </div>
            <button
              onClick={openCreateDraft}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-900 shadow-sm hover:bg-blue-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Tạo bản nháp
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-slate-50/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm draft, khách hàng, email, tên tour..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PENDING_APPROVAL">Chờ duyệt</option>
            <option value="NEEDS_REVISION">Cần sửa</option>
            <option value="REJECTED">Từ chối</option>
            <option value="CONVERTED">Đã tạo đơn</option>
          </select>
          <button onClick={fetchDrafts} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Làm mới
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Đang tải bản nháp...</div>
        ) : drafts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <span className="material-symbols-outlined">edit_document</span>
            </div>
            <p className="font-bold text-slate-800">Chưa có bản nháp đặt hộ</p>
            <p className="mt-1 text-sm text-slate-500">Tạo bản nháp đầu tiên khi khách đặt qua đội hỗ trợ.</p>
          </div>
        ) : drafts.slice(0, 6).map(draft => {
          const cfg = ASSISTED_STATUS_CFG[draft.status] ?? ASSISTED_STATUS_CFG.DRAFT;
          return (
            <div key={draft.id} className="grid gap-4 p-4 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-black text-blue-800">{draft.draftCode}</span>
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${cfg.badge}`}>
                    <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                    {cfg.label}
                  </span>
                  {draft.convertedBooking && <span className="text-xs font-semibold text-emerald-700">{draft.convertedBooking.bookingCode}</span>}
                </div>
                <p className="mt-2 truncate text-sm font-bold text-slate-900">{draft.customerName || 'Chưa nhập tên khách'}</p>
                <p className="truncate text-xs text-slate-500">
                  {draft.customerEmail || 'Chưa nhập email'}{draft.customerPhone ? ` · ${draft.customerPhone}` : ''}{draft.customerIdentityNo ? ` · CCCD ${draft.customerIdentityNo}` : ''}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{draft.tour?.name ?? `Tour #${draft.tourId}`}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatPassengerBreakdown(draft.passengers, draft.numberOfPeople)} · {fmt(draft.quotedPrice)} · {draft.sourceChannel.replace('_', ' ')}
                </p>
                {draft.rejectionReason && <p className="mt-1 line-clamp-1 text-xs font-medium text-orange-700">{draft.rejectionReason}</p>}
              </div>
              <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                {['DRAFT', 'NEEDS_REVISION'].includes(draft.status) && (
                  <>
                    <button onClick={() => openEditDraft(draft)} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      Chỉnh sửa
                    </button>
                    <button onClick={() => runDraftAction(draft, 'submit')} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
                      Gửi duyệt
                    </button>
                  </>
                )}
                <button onClick={() => openDraftDetail(draft)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50">
                  <span className="material-symbols-outlined text-[15px]">visibility</span>
                  Chi tiết
                </button>
                {isAdmin && draft.status === 'PENDING_APPROVAL' && (
                  <>
                    <button onClick={() => runDraftAction(draft, 'approve')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                      Duyệt
                    </button>
                    <button onClick={() => runDraftAction(draft, 'request-revision')} className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100">
                      Yêu cầu sửa
                    </button>
                    <button onClick={() => runDraftAction(draft, 'reject')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {draftActionDialog && draftActionDialogConfig && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="draft-review-dialog-title"
          onMouseDown={closeDraftActionDialog}
        >
          <aside
            className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-white/60"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="px-6 pb-5 pt-6 sm:px-7">
              <div className="flex items-start justify-between gap-5">
                <div className="flex min-w-0 items-start gap-4">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${draftActionDialogConfig.iconClass}`}>
                    <span className="material-symbols-outlined text-[24px]">{draftActionDialogConfig.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                      {draftActionDialogConfig.eyebrow}
                    </p>
                    <h3 id="draft-review-dialog-title" className="mt-1 text-xl font-black leading-tight text-slate-950">
                      {draftActionDialogConfig.title}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      {draftActionDialogConfig.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDraftActionDialog}
                  disabled={draftActionDialog.isSubmitting}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Đóng hộp thoại"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-black text-blue-800">{draftActionDialog.draft.draftCode}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">
                    {draftActionDialog.draft.customerName || 'Chưa nhập tên khách'}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                    {draftActionDialog.draft.tour?.name ?? (draftActionDialog.draft.tourId ? `Tour #${draftActionDialog.draft.tourId}` : 'Chưa chọn tour')}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 text-right ring-1 ring-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tạm tính</p>
                  <p className="text-sm font-black text-slate-950">{fmt(draftActionDialog.draft.quotedPrice)}</p>
                </div>
              </div>

              {draftActionDialog.action === 'approve' && (
                <div className="mt-5 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-emerald-700">fact_check</span>
                    <div>
                      <p className="font-black">Trước khi duyệt, hãy chắc chắn các điểm này đã đúng:</p>
                      <div className="mt-3 grid gap-2 text-sm font-semibold text-emerald-900 sm:grid-cols-2">
                        <span className="inline-flex items-center gap-2">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          Thông tin khách hợp lệ
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          Tour và lịch khởi hành còn chỗ
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          Giá và voucher đã kiểm tra
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          Kênh gửi thanh toán đã chọn
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <label className="mt-5 block space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {draftActionDialogConfig.label}
                  {draftActionDialogConfig.requiresReason ? <span className="text-red-500"> *</span> : null}
                </span>
                <textarea
                  autoFocus
                  value={draftActionDialog.reason}
                  onChange={event => setDraftActionDialog(current => current ? { ...current, reason: event.target.value, error: undefined } : current)}
                  placeholder={draftActionDialogConfig.placeholder}
                  disabled={draftActionDialog.isSubmitting}
                  rows={draftActionDialog.action === 'approve' ? 3 : 6}
                  className={`${draftActionDialog.action === 'approve' ? 'min-h-24' : 'min-h-36'} w-full resize-y rounded-2xl border bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition-all placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                    draftActionDialog.error
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                  }`}
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-h-5">
                  {draftActionDialog.error ? (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {draftActionDialog.error}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-slate-500">{draftActionDialogConfig.hint}</p>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-400">{draftActionDialog.reason.trim().length} ký tự</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-7">
              <button
                type="button"
                onClick={closeDraftActionDialog}
                disabled={draftActionDialog.isSubmitting}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitDraftActionDialog}
                disabled={draftActionDialog.isSubmitting}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black shadow-sm outline-none transition-colors focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${draftActionDialogConfig.submitClass}`}
              >
                {draftActionDialog.isSubmitting ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">{draftActionDialogConfig.icon}</span>
                )}
                {draftActionDialogConfig.submitLabel}
              </button>
            </div>
          </aside>
        </div>
      )}

      {viewingDraft && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6" onMouseDown={() => setViewingDraft(null)}>
          <aside className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-white/50" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Chi tiết booking draft</p>
                <h3 className="mt-1 font-mono text-2xl font-black text-slate-950">{viewingDraft.draftCode}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">Thông tin bản nháp đặt hộ trước khi duyệt thành đơn thật.</p>
              </div>
              <button onClick={() => setViewingDraft(null)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Trạng thái</p>
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${(ASSISTED_STATUS_CFG[viewingDraft.status] ?? ASSISTED_STATUS_CFG.DRAFT).badge}`}>
                    <span className="material-symbols-outlined text-[14px]">{(ASSISTED_STATUS_CFG[viewingDraft.status] ?? ASSISTED_STATUS_CFG.DRAFT).icon}</span>
                    {(ASSISTED_STATUS_CFG[viewingDraft.status] ?? ASSISTED_STATUS_CFG.DRAFT).label}
                  </span>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-700">Tạm tính</p>
                  <p className="mt-2 text-2xl font-black text-blue-950">{fmt(viewingDraft.quotedPrice)}</p>
                  <p className="mt-1 text-xs font-semibold text-blue-700">{formatPassengerBreakdown(viewingDraft.passengers, viewingDraft.numberOfPeople)} · giảm {fmt(viewingDraft.discountAmount)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="space-y-3">
                  <h4 className="text-sm font-black text-slate-950">Khách hàng</h4>
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="font-black text-slate-950">{viewingDraft.customerName || 'Chưa nhập tên khách'}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.customerEmail || 'Chưa nhập email'}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.customerPhone || 'Chưa nhập số điện thoại'}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.customerIdentityNo ? `CCCD: ${viewingDraft.customerIdentityNo}` : 'Chưa nhập CCCD'}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Nguồn</p>
                    <p className="mt-1 font-bold text-slate-800">{viewingDraft.sourceChannel.replace('_', ' ')}</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-sm font-black text-slate-950">Tour đặt hộ</h4>
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="font-black text-slate-950">{viewingDraft.tour?.name ?? (viewingDraft.tourId ? `Tour #${viewingDraft.tourId}` : 'Chưa chọn tour')}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.tour?.destination?.name ?? 'Chưa có điểm đến'}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Số khách</p>
                        <p className="mt-1 font-black text-slate-900">{formatPassengerBreakdown(viewingDraft.passengers, viewingDraft.numberOfPeople)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Voucher</p>
                        <p className="mt-1 font-black text-slate-900">{viewingDraft.voucherCode || 'Không có'}</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Yêu cầu của khách</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{viewingDraft.specialRequests || 'Không có'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Ghi chú nội bộ</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{viewingDraft.internalNote || 'Không có'}</p>
                </div>
              </div>

              {(viewingDraft.rejectionReason || viewingDraft.convertedBooking) && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  {viewingDraft.rejectionReason && (
                    <>
                      <p className="text-xs font-black uppercase tracking-wider text-orange-700">Phản hồi duyệt</p>
                      <p className="mt-2 font-semibold text-orange-800">{viewingDraft.rejectionReason}</p>
                    </>
                  )}
                  {viewingDraft.convertedBooking && (
                    <p className="font-bold text-emerald-700">Đã tạo đơn: {viewingDraft.convertedBooking.bookingCode}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
              {['DRAFT', 'NEEDS_REVISION'].includes(viewingDraft.status) && (
                <button onClick={() => { const draft = viewingDraft; setViewingDraft(null); openEditDraft(draft); }} className="rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-800">
                  Chỉnh sửa bản nháp
                </button>
              )}
              <button onClick={() => setViewingDraft(null)} className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Đóng
              </button>
            </div>
          </aside>
        </div>
      )}

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6" onMouseDown={() => { setIsDrawerOpen(false); resetDraftForm(); }}>
          <aside
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-slate-50 shadow-2xl ring-1 ring-white/50"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20 sm:flex">
                    <span className="material-symbols-outlined text-[24px]">edit_calendar</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">{editingDraft ? 'Chỉnh sửa booking draft' : 'Tạo booking draft'}</p>
                    <h3 className="mt-1 text-2xl font-black leading-tight text-slate-950">{editingDraft ? 'Cập nhật bản nháp đặt hộ' : 'Đặt tour hộ khách'}</h3>
                    <p className="mt-1 max-w-xl text-sm font-medium text-slate-500">{editingDraft ? `Đang chỉnh ${editingDraft.draftCode}. Cập nhật thông tin rồi lưu lại hoặc gửi duyệt khi đã đủ dữ liệu.` : 'Tạo bản nháp từ thông tin tư vấn, kiểm tra tạm tính rồi gửi quản trị duyệt khi đã sẵn sàng.'}</p>
                  </div>
                </div>
                <button onClick={() => { setIsDrawerOpen(false); resetDraftForm(); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {draftFormError && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-red-600">error</span>
                  <div>
                    <p className="font-black">Không thể thực hiện thao tác</p>
                    <p className="mt-0.5 whitespace-pre-line font-semibold">{draftFormError}</p>
                  </div>
                </div>
              )}
              <div className="mb-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="material-symbols-outlined mt-0.5 text-[18px] text-amber-600">info</span>
                <p>
                  Các trường có dấu <span className="font-black text-red-500">*</span> chỉ bắt buộc khi bấm <span className="font-bold">Lưu & gửi duyệt</span>. Khi chỉ lưu nháp, staff có thể lưu lại trước rồi bổ sung sau.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
                <div className="space-y-6">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-700">person</span>
                      <h4 className="text-sm font-black text-slate-950">Thông tin khách</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Tên khách {requiredMark}</span>
                        <input value={form.customerName} onChange={e => updateForm('customerName', e.target.value)} placeholder="VD: Nguyễn Minh An" className={fieldClass('customerName')} aria-invalid={Boolean(submitErrors.customerName)} />
                        {fieldError('customerName')}
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Email {requiredMark}</span>
                        <input type="email" value={form.customerEmail} onChange={e => updateForm('customerEmail', e.target.value)} placeholder="email@domain.com" className={fieldClass('customerEmail')} aria-invalid={Boolean(submitErrors.customerEmail)} />
                        {fieldError('customerEmail')}
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Số điện thoại {requiredMark}</span>
                        <input value={form.customerPhone} onChange={e => updateForm('customerPhone', e.target.value)} placeholder="09xx xxx xxx" className={fieldClass('customerPhone')} aria-invalid={Boolean(submitErrors.customerPhone)} />
                        {fieldError('customerPhone')}
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>CCCD {requiredMark}</span>
                        <input
                          value={form.customerIdentityNo}
                          onChange={e => updateForm('customerIdentityNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                          inputMode="numeric"
                          maxLength={12}
                          placeholder="12 chữ số"
                          className={fieldClass('customerIdentityNo')}
                          aria-invalid={Boolean(submitErrors.customerIdentityNo)}
                        />
                        {fieldError('customerIdentityNo')}
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Nguồn</span>
                        <select value={form.sourceChannel} onChange={e => updateForm('sourceChannel', e.target.value)} className={fieldClass('sourceChannel')}>
                          <option value="LIVE_CHAT">Live chat</option>
                          <option value="ZALO">Zalo</option>
                          <option value="FACEBOOK">Facebook</option>
                          <option value="PHONE">Điện thoại</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Kênh gửi xác nhận</span>
                        <select value={form.confirmationChannel} onChange={e => updateForm('confirmationChannel', e.target.value)} className={fieldClass('confirmationChannel')}>
                          <option value="ZALO">Zalo / copy thủ công</option>
                          <option value="EMAIL">Email tự động</option>
                          <option value="PHONE">Gọi điện</option>
                          <option value="MANUAL">Gửi thủ công</option>
                        </select>
                      </label>
                      <label className="space-y-2 sm:col-span-2">
                        <span className={draftLabelClass}>Email nhận vé điện tử</span>
                        <input type="email" value={form.emailForTicket} onChange={e => updateForm('emailForTicket', e.target.value)} placeholder="Mặc định dùng email khách hàng" className={fieldClass('emailForTicket')} aria-invalid={Boolean(submitErrors.emailForTicket)} />
                        {fieldError('emailForTicket')}
                      </label>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-700">travel_explore</span>
                      <h4 className="text-sm font-black text-slate-950">Tour và lịch trình</h4>
                    </div>
                    <div className="block space-y-2" ref={tourPickerRef}>
                      <span className={draftLabelClass}>Tour {requiredMark}</span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsTourPickerOpen(open => !open)}
                          className={`flex min-h-[72px] w-full items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-3 text-left shadow-sm outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${submitErrors.tourId ? 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-100' : 'border-slate-200'}`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {selectedTour?.imageUrl ? (
                              <span
                                className="h-12 w-12 shrink-0 rounded-2xl bg-cover bg-center"
                                style={{ backgroundImage: `url(${selectedTour.imageUrl})` }}
                                aria-hidden="true"
                              />
                            ) : (
                              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                                <span className="material-symbols-outlined text-[22px]">travel_explore</span>
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-black text-slate-950">
                                {selectedTour?.name ?? 'Chọn tour cần đặt hộ'}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">
                                {selectedTour ? (
                                  <>
                                    <span>{selectedTour.destination?.name ?? 'Chưa có điểm đến'}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{fmt(selectedTour.price)}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{selectedTour.availableSeats ?? 0} ghế</span>
                                  </>
                                ) : (
                                  <span>Tìm theo tên tour, điểm đến hoặc giá</span>
                                )}
                              </span>
                            </span>
                          </span>
                          <span className={`material-symbols-outlined shrink-0 text-slate-500 transition-transform ${isTourPickerOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>

                        {isTourPickerOpen && (
                          <div className="absolute z-[90] mt-3 w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
                            <div className="border-b border-slate-100 p-3">
                              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-blue-200">
                                <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
                                <input
                                  value={tourQuery}
                                  onChange={e => setTourQuery(e.target.value)}
                                  placeholder="Tìm tour hoặc điểm đến..."
                                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto p-2">
                              {filteredTours.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                  <p className="text-sm font-bold text-slate-800">Không tìm thấy tour phù hợp</p>
                                  <p className="mt-1 text-xs text-slate-500">Thử tìm theo điểm đến hoặc rút gọn từ khóa.</p>
                                </div>
                              ) : (
                                filteredTours.map((tour, index) => {
                                  const isSelected = String(tour.id) === form.tourId;
                                  return (
                                    <button
                                      key={`tour-card-${tour.id ?? 'missing'}-${index}`}
                                      type="button"
                                      onClick={() => {
                                        updateForm('tourId', String(tour.id));
                                        setTourQuery('');
                                        setIsTourPickerOpen(false);
                                      }}
                                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
                                    >
                                      {tour.imageUrl ? (
                                        <span
                                          className="h-14 w-14 shrink-0 rounded-2xl bg-cover bg-center"
                                          style={{ backgroundImage: `url(${tour.imageUrl})` }}
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                                          <span className="material-symbols-outlined text-[22px]">image</span>
                                        </span>
                                      )}
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black text-slate-950">{tour.name}</span>
                                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">
                                          <span>{tour.destination?.name ?? 'Chưa có điểm đến'}</span>
                                          <span className="text-slate-300">•</span>
                                          <span>{tour.availableSeats ?? 0} ghế</span>
                                        </span>
                                      </span>
                                      <span className="shrink-0 text-right">
                                        <span className="block text-sm font-black text-blue-800">{fmt(tour.price)}</span>
                                        {isSelected && <span className="mt-1 block text-xs font-bold text-blue-700">Đang chọn</span>}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {fieldError('tourId')}
                    </div>

                    <div className="space-y-2">
                      <span className={draftLabelClass}>Cơ cấu khách {requiredMark}</span>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {passengerTypeOrder.map(type => {
                          const key = type === 'Adult (12+)' ? 'adultCount' : type === 'Child (4-11)' ? 'childCount' : 'infantCount';
                          const value = parsePassengerCount(form[key], key === 'adultCount' ? 1 : 0);
                          const cfg = PASSENGER_PRICING[type];
                          return (
                            <div key={type} className={`rounded-2xl border bg-white p-3 ${submitErrors[key] ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
                              <div className="flex items-center gap-2">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                                  <span className="material-symbols-outlined text-[20px]">{cfg.icon}</span>
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-950">{cfg.label}</p>
                                  <p className="text-xs font-semibold text-slate-500">{cfg.age} tuổi · {Math.round(cfg.multiplier * 100)}%</p>
                                </div>
                              </div>
                              <div className="mt-3 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => updatePassengerCount(key, String(value - 1))}
                                  className="grid h-full w-11 place-items-center text-slate-500 transition-colors hover:text-blue-700 disabled:opacity-35"
                                  disabled={key === 'adultCount' ? value <= 1 : value <= 0}
                                >
                                  <span className="material-symbols-outlined text-[18px]">remove</span>
                                </button>
                                <input
                                  value={form[key]}
                                  onChange={e => updatePassengerCount(key, e.target.value)}
                                  inputMode="numeric"
                                  className="h-full min-w-0 flex-1 bg-transparent text-center text-sm font-black text-slate-950 outline-none"
                                  aria-invalid={Boolean(submitErrors[key])}
                                />
                                <button
                                  type="button"
                                  onClick={() => updatePassengerCount(key, String(value + 1))}
                                  className="grid h-full w-11 place-items-center text-slate-500 transition-colors hover:text-blue-700 disabled:opacity-35"
                                  disabled={key === 'infantCount' && value >= adultCount}
                                >
                                  <span className="material-symbols-outlined text-[18px]">add</span>
                                </button>
                              </div>
                              {fieldError(key)}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Tổng khách</span>
                        <input type="number" min={1} value={totalPassengerCount} readOnly className={fieldClass('adultCount')} aria-invalid={Boolean(submitErrors.adultCount || submitErrors.infantCount)} />
                        {fieldError('adultCount')}
                        {fieldError('infantCount')}
                      </label>
                      <label className="space-y-2 sm:col-span-2">
                        <span className={draftLabelClass}>Lịch khởi hành {selectedTourDepartures.length > 0 ? requiredMark : null}</span>
                        <select value={form.departureId} onChange={e => updateForm('departureId', e.target.value)} className={fieldClass('departureId')} aria-invalid={Boolean(submitErrors.departureId)}>
                          <option value="">Theo ngày mặc định của tour</option>
                          {selectedTour && selectedTourDepartures.length === 0 && (
                            <option value="" disabled>Tour này chưa có lịch khởi hành cụ thể</option>
                          )}
                          {selectedTourDepartures.map((d, index) => (
                            <option key={`departure-${d.id ?? 'missing'}-${index}`} value={d.id}>
                              {fmtDate(d.departureDate)} · {fmt(d.price ?? selectedTour?.price ?? 0)} · còn {d.availableSeats ?? 0} ghế
                            </option>
                          ))}
                        </select>
                        {fieldError('departureId')}
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Gói tour</span>
                        <select value={form.packageId} onChange={e => updateForm('packageId', e.target.value)} className={fieldClass('packageId')}>
                          <option value="">Không chọn gói phụ thu</option>
                          {(selectedTour?.packages ?? []).map((p, index) => <option key={`package-${p.id ?? 'missing'}-${index}`} value={p.id}>{p.name} · +{fmt(p.price)}</option>)}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Voucher</span>
                        <input value={form.voucherCode} onChange={e => updateForm('voucherCode', e.target.value)} placeholder="Nhập mã nếu có" className={fieldClass('voucherCode')} />
                      </label>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block space-y-2">
                      <span className={draftLabelClass}>Yêu cầu của khách</span>
                      <textarea value={form.specialRequests} onChange={e => updateForm('specialRequests', e.target.value)} rows={4} placeholder="Ghế trẻ em, ăn chay, phòng gần nhau..." className={`${fieldClass('specialRequests')} min-h-28 resize-y`} />
                    </label>
                    <label className="block space-y-2">
                      <span className={draftLabelClass}>Ghi chú nội bộ</span>
                      <textarea value={form.internalNote} onChange={e => updateForm('internalNote', e.target.value)} rows={4} placeholder="Thông tin chỉ dành cho staff/admin" className={`${fieldClass('internalNote')} min-h-28 resize-y`} />
                    </label>
                  </section>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
                  <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Tạm tính</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-blue-950">{fmt(estimatedTotal)}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white/75 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700/70">Số khách</p>
                        <p className="mt-1 font-black text-blue-950">{totalPassengerCount}</p>
                      </div>
                      <div className="rounded-2xl bg-white/75 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700/70">Đơn giá</p>
                        <p className="mt-1 font-black text-blue-950">{fmt(estimatedUnitPrice)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-black text-slate-950">Tóm tắt lựa chọn</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Tour</span>
                        <span className="max-w-[180px] text-right font-bold text-slate-900">{selectedTour?.name ?? 'Chưa chọn'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Khởi hành</span>
                        <span className="text-right font-bold text-slate-900">{selectedDeparture ? fmtDate(selectedDeparture.departureDate) : 'Mặc định'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Gói</span>
                        <span className="max-w-[180px] text-right font-bold text-slate-900">{selectedPackage?.name ?? 'Không phụ thu'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Khách</span>
                        <span className="max-w-[180px] text-right font-bold text-slate-900">{adultCount} người lớn{childCount ? ` · ${childCount} trẻ em` : ''}{infantCount ? ` · ${infantCount} em bé` : ''}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Nguồn</span>
                        <span className="text-right font-bold text-slate-900">{form.sourceChannel.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
              <button onClick={() => { setIsDrawerOpen(false); resetDraftForm(); }} className="min-h-11 rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
                Hủy
              </button>
              <button disabled={isSaving} onClick={() => createDraft(false)} className="min-h-11 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-800 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
                {editingDraft ? 'Cập nhật nháp' : 'Lưu nháp'}
              </button>
              <button disabled={isSaving} onClick={() => createDraft(true)} className="min-h-11 rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                Lưu & gửi duyệt
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

export default function BookingManagementPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const initialStatus = searchParams.get('status') ?? '';

  // Data state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    confirmed: 0,
    cancelRequested: 0,
    cancelled: 0,
    total: 0,
    totalRevenue: 0,
    paidCount: 0,
    unpaidCount: 0,
    failedPaymentCount: 0,
  });
  const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filter state
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);


  // UI state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Build query string helper
  const buildQs = useCallback((overrides: Record<string, string> = {}) => {
    const qs = new URLSearchParams();
    if (debouncedSearch) qs.set('search', debouncedSearch);
    if (statusFilter) qs.set('status', statusFilter);
    if (paymentFilter) qs.set('paymentStatus', paymentFilter);
    if (dateFrom) qs.set('dateFrom', dateFrom);
    if (dateTo) qs.set('dateTo', dateTo);
    Object.entries(overrides).forEach(([k, v]) => qs.set(k, v));
    return qs.toString();
  }, [debouncedSearch, statusFilter, paymentFilter, dateFrom, dateTo]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = buildQs({ page: String(page), limit: String(pageSize) });

      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/all?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error();
      const payload = json?.data ?? json;
      setBookings(payload.bookings ?? []);
      if (payload.stats) setStats(payload.stats);
      if (payload.meta) setMeta(payload.meta);
    } catch {
      showToast('Lỗi tải danh sách đặt tour', false);
    } finally {
      setIsLoading(false);
    }
  }, [buildQs, page, pageSize, showToast]);


  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Handle manual confirm success
  const handleConfirmSuccess = (updated: Booking) => {
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
    setSelectedBooking(updated);
    setStats(prev => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      confirmed: prev.confirmed + 1,
      paidCount: prev.paidCount + 1,
      totalRevenue: prev.totalRevenue + updated.totalPrice,
    }));
    showToast(`✓ Đã xác nhận thủ công đơn ${updated.bookingCode}`);
  };

  // Export CSV (Excel-compatible with UTF-8 BOM)
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const qs = buildQs({ page: '1', limit: '99999' });
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/all?${qs}`);
      const json = await res.json();
      const payload = json?.data ?? json;
      const allBookings: Booking[] = payload.bookings ?? [];

      if (allBookings.length === 0) {
        showToast('Không có dữ liệu để xuất', false);
        return;
      }

      // CSV headers
      const headers = [
        'Mã Đặt Tour', 'Khách Hàng', 'Email', 'Tour', 'Điểm Đến',
        'Số Người', 'Đơn Giá (₫)', 'Voucher', 'Giảm Giá (₫)',
        'Tổng Tiền (₫)', 'Trạng Thái', 'Thanh Toán', 'Ngày Đặt',
      ];

      const rows = allBookings.map(b => [
        b.bookingCode,
        b.user.fullName,
        b.user.email,
        b.tour?.name ?? '',
        b.tour?.destination?.name ?? '',
        b.numberOfPeople,
        b.unitPriceAtBooking,
        b.voucherCode ?? '',
        b.discountAmount,
        b.totalPrice,
        STATUS_CFG[b.status]?.label ?? b.status,
        PAY_CFG[b.paymentStatus]?.label ?? b.paymentStatus,
        fmtDate(b.createdAt),
      ]);

      // UTF-8 BOM để Excel đọc tiếng Việt đúng
      const BOM = '\uFEFF';
      const csvContent = BOM + [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `azure-horizon-bookings-${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Đã xuất ${allBookings.length} đơn ra file CSV`);
    } catch {
      showToast('Xuất file thất bại. Vui lòng thử lại.', false);
    } finally {
      setIsExporting(false);
    }
  };

  const resetFilters = () => {
    setSearch(''); setStatusFilter(''); setPaymentFilter('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };
  const hasFilter = !!(search || statusFilter || paymentFilter || dateFrom || dateTo);

  const copyPaymentRequest = async (booking: Booking) => {
    const latest = booking.notifications?.[0];
    if (!latest?.content) {
      showToast('Đơn này chưa có nội dung thanh toán để copy', false);
      return;
    }
    try {
      await navigator.clipboard.writeText(latest.content);
      showToast('Đã copy nội dung gửi khách');
    } catch {
      showToast('Không copy được nội dung. Vui lòng thử lại.', false);
    }
  };

  const resendPaymentRequest = async (booking: Booking, forceEmail = false) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/resend-payment-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(getApiErrorMessage(json, 'Không gửi lại được yêu cầu thanh toán'));
      await fetchBookings();
      showToast(forceEmail ? 'Đã gửi lại email thanh toán' : 'Đã tạo lại yêu cầu thanh toán');
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Không gửi lại được yêu cầu thanh toán'), false);
    }
  };

  const filterByStatus = (status: Booking['status']) => {
    setStatusFilter(current => current === status ? '' : status);
    setPage(1);
  };
  const filterByPayment = (paymentStatus: Booking['paymentStatus']) => {
    setPaymentFilter(current => current === paymentStatus ? '' : paymentStatus);
    setPage(1);
  };

  // KPI config
  const kpis = [
    {
      icon: 'payments', label: 'Tổng doanh thu',
      value: fmtCompact(stats.totalRevenue),
      sub: `${stats.paidCount} đơn đã thanh toán`,
      gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50', ic: 'text-blue-600',
      onClick: () => filterByPayment('PAID'), active: paymentFilter === 'PAID',
    },
    {
      icon: 'check_circle', label: 'Đã xác nhận',
      value: stats.confirmed.toLocaleString('vi-VN'),
      sub: 'đơn thành công',
      gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', ic: 'text-emerald-600',
      onClick: () => filterByStatus('CONFIRMED'), active: statusFilter === 'CONFIRMED',
    },
    {
      icon: 'schedule', label: 'Chờ xử lý',
      value: stats.pending.toLocaleString('vi-VN'),
      sub: 'đơn cần xử lý',
      gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', ic: 'text-amber-600',
      onClick: () => filterByStatus('PENDING'), active: statusFilter === 'PENDING',
    },
    {
      icon: 'cancel', label: 'Đã hủy',
      value: stats.cancelled.toLocaleString('vi-VN'),
      sub: 'đã hủy / quá hạn',
      gradient: 'from-red-400 to-rose-500', bg: 'bg-red-50', ic: 'text-red-500',
      onClick: () => filterByStatus('CANCELLED'), active: statusFilter === 'CANCELLED',
    },
    {
      icon: 'assignment_late', label: 'Chờ duyệt hủy',
      value: stats.cancelRequested.toLocaleString('vi-VN'),
      sub: 'cần admin xử lý',
      gradient: 'from-orange-400 to-amber-500', bg: 'bg-orange-50', ic: 'text-orange-600',
      onClick: () => filterByStatus('CANCEL_REQUESTED'), active: statusFilter === 'CANCEL_REQUESTED',
    },
    {
      icon: 'account_balance_wallet', label: 'Chưa thanh toán',
      value: stats.unpaidCount.toLocaleString('vi-VN'),
      sub: 'đang chờ thanh toán',
      gradient: 'from-violet-400 to-purple-500', bg: 'bg-violet-50', ic: 'text-violet-600',
      onClick: () => filterByPayment('UNPAID'), active: paymentFilter === 'UNPAID',
    },
  ];

  return (
    <main
      className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <a href="#bookings-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
        Nhảy đến bảng dữ liệu
      </a>

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface" style={{ textWrap: 'balance' } as React.CSSProperties}>
            Quản Lý Đặt Tour
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Theo dõi toàn bộ đơn đặt tour, thanh toán và trạng thái xử lý.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export button */}
          <button
            id="export-bookings-btn"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {isExporting ? (
              <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Đang xuất…</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">table_view</span>Xuất Excel</>
            )}
          </button>
          <button
            onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Cancel Requests Panel ────────────────────────────── */}
      <CancelRequestPanel onActionDone={fetchBookings} />

      <AssistedBookingWorkspace onChanged={fetchBookings} showToast={showToast} />

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={k.onClick}
            className={`relative text-left bg-surface-container-lowest rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all active:scale-[0.99] overflow-hidden group outline-none focus-visible:ring-2 focus-visible:ring-primary ${k.active ? 'border-primary/50 ring-2 ring-primary/15' : 'border-outline-variant/10'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-xl ${k.ic}`} style={{ fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
              </div>
              <span className={`material-symbols-outlined text-[18px] ${k.active ? 'text-primary' : 'text-on-surface-variant/40'}`}>filter_alt</span>
            </div>
            <p className="text-2xl font-extrabold text-on-surface leading-tight">{k.value}</p>
            <p className="text-xs font-medium text-on-surface-variant mt-1">{k.label}</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{k.sub}</p>
          </button>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[220px] relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">search</span>
            <label htmlFor="bk-search" className="sr-only">Tìm kiếm đơn đặt tour</label>
            <input
              id="bk-search"
              type="search"
              placeholder="Tìm mã đặt, tên khách hàng, email, tên tour…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
            />
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            {/* Status filter */}
            <label htmlFor="bk-status" className="sr-only">Lọc trạng thái</label>
            <select id="bk-status" value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xử lý</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="CANCEL_REQUESTED">Chờ Duyệt Hủy ⚠️</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            {/* Payment filter */}
            <label htmlFor="bk-payment" className="sr-only">Lọc thanh toán</label>
            <select id="bk-payment" value={paymentFilter}
              onChange={e => { setPaymentFilter(e.target.value); setPage(1); }}
              className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
              <option value="">Tất cả thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="FAILED">Thất bại</option>
            </select>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="bk-from" className="text-xs text-on-surface-variant whitespace-nowrap">Từ ngày</label>
              <input id="bk-from" type="date" value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 px-3 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors" />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="bk-to" className="text-xs text-on-surface-variant whitespace-nowrap">Đến ngày</label>
              <input id="bk-to" type="date" value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 px-3 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors" />
            </div>

            {hasFilter && (
              <button onClick={resetFilters}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-error border border-error/30 hover:bg-error/5 transition-colors outline-none">
                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                Xóa bộ lọc
              </button>
            )}
          </div>

          {!isLoading && (
            <span className="ml-auto text-xs text-on-surface-variant whitespace-nowrap font-medium pl-2">
              {meta.totalItems.toLocaleString('vi-VN')} đơn
            </span>
          )}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div id="bookings-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                {(() => {
                  const baseHeaders = ['Mã Đặt Tour', 'Khách Hàng', 'Tour', 'Giá Trị', 'Trạng Thái'];
                  const tailHeaders = statusFilter === 'CANCELLED' 
                    ? ['Tiền Đã Hoàn', 'Ngày Hoàn', 'Thao Tác'] 
                    : ['Thanh Toán', 'Ngày Đặt', 'Thao Tác'];
                  const allHeaders = [...baseHeaders, ...tailHeaders];
                  return allHeaders.map((h, i) => (
                    <th key={h} className={`py-3.5 px-5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${i === 7 ? 'text-right' : ''}`}>{h}</th>
                  ));
                })()}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/8">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-24 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-outline">receipt_long</span>
                      </div>
                      <p className="font-bold text-on-surface">Không tìm thấy đơn đặt tour nào</p>
                      <p className="text-sm text-on-surface-variant mt-1">
                        {hasFilter ? 'Thử thay đổi bộ lọc để hiển thị kết quả.' : 'Chưa có đơn đặt tour nào trong hệ thống.'}
                      </p>
                      {hasFilter && (
                        <button onClick={resetFilters} className="mt-4 text-sm text-primary font-semibold hover:underline outline-none">
                          Xóa tất cả bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const sc = STATUS_CFG[b.status] ?? STATUS_CFG.PENDING;
                  const pc = PAY_CFG[b.paymentStatus] ?? PAY_CFG.UNPAID;
                  const colorIdx = b.user.id % AVATAR_COLORS.length;
                  const isPending = b.status === 'PENDING';
                  const latestPaymentRequest = b.paymentStatus === 'PAID' ? undefined : b.notifications?.[0];
                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-primary/[0.025] transition-colors group cursor-pointer ${isPending ? 'border-l-2 border-amber-400' : ''}`}
                      onClick={() => setSelectedBooking(b)}
                    >
                      {/* Mã đặt tour */}
                      <td className="py-4 px-5">
                        <span className="font-mono text-sm font-bold text-primary">{b.bookingCode}</span>
                        {b.voucherCode && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-emerald-500 text-[12px]">local_activity</span>
                            <span className="text-[10px] font-mono text-emerald-600 font-bold">{b.voucherCode}</span>
                          </div>
                        )}
                      </td>

                      {/* Khách hàng */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3 min-w-0">
                          {b.user.avatarUrl ? (
                            <Image
                              src={b.user.avatarUrl}
                              alt={b.user.fullName}
                              width={36}
                              height={36}
                              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-outline-variant/10"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                              {getInitials(b.user.fullName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate max-w-[140px] group-hover:text-primary transition-colors">{b.user.fullName}</p>
                            <p className="text-xs text-on-surface-variant/60 truncate max-w-[140px]">{b.user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tour */}
                      <td className="py-4 px-5">
                        {b.tour ? (
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate max-w-[180px]">{b.tour.name}</p>
                            {b.tour.destination && (
                              <p className="text-xs text-on-surface-variant/60 flex items-center gap-0.5 mt-0.5">
                                <span className="material-symbols-outlined text-[12px]">location_on</span>
                                {b.tour.destination.name}
                              </p>
                            )}
                          </div>
                        ) : <span className="text-on-surface-variant/40 text-sm">—</span>}
                      </td>

                      {/* Giá trị */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <p className="font-bold text-on-surface text-sm">{fmt(b.totalPrice)}</p>
                        <p className="text-xs text-on-surface-variant/60 mt-0.5">{b.numberOfPeople} người · {fmt(b.unitPriceAtBooking)}/ng</p>
                        {b.discountAmount > 0 && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">-{fmt(b.discountAmount)}</p>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${sc.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>

                      {/* Thanh toán / Tiền Đã Hoàn */}
                      {statusFilter === 'CANCELLED' ? (
                        <td className="py-4 px-5">
                          {b.refundAmount != null && b.refundAmount > 0 ? (
                            <div>
                              <span className="font-bold text-emerald-600 text-sm">{fmt(b.refundAmount)}</span>
                              {b.refundedAt && (
                                <div className="text-[10px] text-emerald-600/70 mt-0.5 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                  Đã hoàn
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-on-surface-variant/40 text-sm">—</span>
                          )}
                        </td>
                      ) : (
                        <td className="py-4 px-5">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${pc.badge}`}>
                              <span className="material-symbols-outlined text-[12px]">{pc.icon}</span>
                              {pc.label}
                            </span>
                            {latestPaymentRequest && (
                              <p className={`text-[10px] font-bold uppercase tracking-wide ${
                                latestPaymentRequest.status === 'FAILED'
                                  ? 'text-red-600'
                                  : latestPaymentRequest.status === 'SENT'
                                    ? 'text-emerald-600'
                                    : 'text-amber-600'
                              }`}>
                                {latestPaymentRequest.channel} · {latestPaymentRequest.status}
                              </p>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Ngày đặt / Ngày Hoàn */}
                      {statusFilter === 'CANCELLED' ? (
                        <td className="py-4 px-5 text-sm text-on-surface-variant whitespace-nowrap">
                          {b.refundedAt ? fmtDate(b.refundedAt) : <span className="text-on-surface-variant/40 text-sm">—</span>}
                        </td>
                      ) : (
                        <td className="py-4 px-5 text-sm text-on-surface-variant whitespace-nowrap">
                          {fmtDate(b.createdAt)}
                        </td>
                      )}

                      {/* Thao tác */}
                      <td className="py-4 px-5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors outline-none"
                              aria-label="Xác nhận thủ công"
                            >
                              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                              Xác nhận
                            </button>
                          )}
                          {isPending && b.paymentStatus === 'UNPAID' && latestPaymentRequest?.content && (
                            <button
                              onClick={() => copyPaymentRequest(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors outline-none"
                              aria-label={`Copy noi dung thanh toan ${b.bookingCode}`}
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              Copy
                            </button>
                          )}
                          {isPending && b.paymentStatus === 'UNPAID' && (
                            <button
                              onClick={() => resendPaymentRequest(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors outline-none"
                              aria-label={`Tao lai yeu cau thanh toan ${b.bookingCode}`}
                            >
                              <span className="material-symbols-outlined text-[14px]">send</span>
                              Gửi lại
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label={`Xem chi tiết ${b.bookingCode}`}
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="py-3 px-6 border-t border-outline-variant/10 bg-surface-container-lowest">
          <AdminPagination
            currentPage={meta.currentPage}
            totalPages={meta.totalPages}
            totalItems={meta.totalItems}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            itemLabel="đơn"
          />
        </div>
      </div>

      {/* ── Detail Modal ───────────────────────────────────────── */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onConfirmSuccess={handleConfirmSuccess}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────── */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.msg}</div>
      {toast && (
        <div role="status" className={`fixed bottom-6 right-6 z-[120] flex max-w-md items-start gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.ok ? 'bg-tertiary text-on-tertiary' : 'bg-error text-on-error'}`}>
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            {toast.ok ? 'check_circle' : 'error'}
          </span>
          <span className="leading-5">{toast.msg}</span>
        </div>
      )}
    </main>
  );
}

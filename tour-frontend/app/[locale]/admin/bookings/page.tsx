'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import AdminPagination from '@/app/components/admin/AdminPagination';


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
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED';
  numberOfPeople: number;
  totalPrice: number;
  unitPriceAtBooking: number;
  discountAmount: number;
  voucherCode?: string | null;
  createdAt: string;
  user: BookingUser;
  tour: BookingTour | null;
}

interface Stats {
  pending: number;
  confirmed: number;
  cancelled: number;
  total: number;
  totalRevenue: number;
  paidCount: number;
}

interface Meta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = 'http://localhost:3000';

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const fmtCompact = (n: number) => fmt(n); // Hiển thị full số cho chuyên nghiệp trên màn hình lớn


const fmtDate = (d: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

const fmtDateTime = (d: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600',
  'from-teal-400 to-cyan-600',   'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500','from-emerald-400 to-green-600',
];

// ─── Config Maps ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string; icon: string }> = {
  PENDING:   { label: 'Chờ xử lý',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',     icon: 'schedule'      },
  CONFIRMED: { label: 'Đã xác nhận', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'check_circle'  },
  CANCELLED: { label: 'Đã hủy',      dot: 'bg-red-400',     badge: 'bg-red-50 text-red-600 border-red-200',            icon: 'cancel'        },
};

const PAY_CFG: Record<string, { label: string; badge: string; icon: string }> = {
  PAID:   { label: 'Đã thanh toán',   badge: 'bg-blue-50 text-blue-700 border-blue-200',       icon: 'paid'            },
  UNPAID: { label: 'Chưa thanh toán', badge: 'bg-orange-50 text-orange-600 border-orange-200', icon: 'pending_actions' },
  FAILED: { label: 'Thất bại',        badge: 'bg-red-50 text-red-600 border-red-200',           icon: 'money_off'       },
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

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
      const res = await fetchWithAuth(`${API}/booking/admin/${booking.id}/confirm-manual`, { method: 'PATCH' });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.message ?? 'Xác nhận thất bại';
        throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
      }
      // TransformInterceptor: json.data = updated booking
      const updated = json?.data ?? json;
      onConfirmSuccess({ ...booking, ...updated });
      setShowConfirmDialog(false);
    } catch (e: any) {
      setConfirmError(e.message || 'Có lỗi xảy ra');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bk-modal-title">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={showConfirmDialog ? undefined : onClose} />

      <div className="relative bg-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-slide-up">

        {/* ── Header gradient ── */}
        <div className="relative bg-gradient-to-br from-primary to-secondary p-6 pb-8 shrink-0 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 10% 80%, white 1px, transparent 1px), radial-gradient(circle at 90% 20%, white 1px, transparent 1px)',
            backgroundSize: '45px 45px, 35px 35px',
          }} />
          <button onClick={onClose} aria-label="Đóng"
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          <div className="flex items-start gap-4 pr-12">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-2xl">receipt_long</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Chi tiết đơn đặt tour</p>
              <h2 id="bk-modal-title" className="text-xl font-bold text-white font-mono tracking-widest">{booking.bookingCode}</h2>
              <p className="text-white/60 text-xs mt-1.5">{fmtDateTime(booking.createdAt)}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
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
                  <img src={booking.user.avatarUrl} alt={booking.user.fullName} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {getInitials(booking.user.fullName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-on-surface">{booking.user.fullName}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">{booking.user.email}</p>
                  <p className="text-xs text-on-surface-variant/50 font-mono mt-0.5">ID #{booking.user.id}</p>
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
                      ? <img src={booking.tour.imageUrl} alt={booking.tour.name} className="w-full h-full object-cover" />
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
                  {booking.voucherCode && (
                    <div className="flex justify-between items-center px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-on-surface-variant">Voucher áp dụng</span>
                        <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">{booking.voucherCode}</span>
                      </div>
                      <span className="font-semibold text-emerald-600">- {fmt(booking.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-5 py-4 bg-primary/5">
                    <span className="font-bold text-on-surface">Tổng thanh toán</span>
                    <span className="text-xl font-extrabold text-primary">{fmt(booking.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest/50 flex items-center justify-between shrink-0 gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Đóng
          </button>

          {/* Nút xác nhận thủ công — chỉ hiển thị khi đơn PENDING */}
          {booking.status === 'PENDING' && (
            <button
              onClick={() => setShowConfirmDialog(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              Xác nhận & Thu tiền thủ công
            </button>
          )}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookingManagementPage() {
  // Data state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, confirmed: 0, cancelled: 0, total: 0, totalRevenue: 0, paidCount: 0 });
  const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

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

      const res = await fetchWithAuth(`${API}/booking/admin/all?${qs}`);
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
  }, [buildQs, page, pageSize]);


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
      const res = await fetchWithAuth(`${API}/booking/admin/all?${qs}`);
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

  // KPI config
  const kpis = [
    {
      icon: 'payments', label: 'Tổng Doanh Thu',
      value: fmtCompact(stats.totalRevenue),
      sub: `${stats.paidCount} đơn đã thanh toán`,
      gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50', ic: 'text-blue-600',
    },
    {
      icon: 'check_circle', label: 'Đã Xác Nhận',
      value: stats.confirmed.toLocaleString('vi-VN'),
      sub: 'đơn thành công',
      gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', ic: 'text-emerald-600',
    },
    {
      icon: 'schedule', label: 'Chờ Xử Lý',
      value: stats.pending.toLocaleString('vi-VN'),
      sub: 'đơn cần xử lý',
      gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', ic: 'text-amber-600',
    },
    {
      icon: 'cancel', label: 'Đã Hủy',
      value: stats.cancelled.toLocaleString('vi-VN'),
      sub: 'đã hủy / quá hạn',
      gradient: 'from-red-400 to-rose-500', bg: 'bg-red-50', ic: 'text-red-500',
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

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="relative bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-gradient-to-br ${k.gradient} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity`} />
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-xl ${k.ic}`} style={{ fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
              </div>
            </div>
            <p className="text-2xl font-extrabold text-on-surface leading-tight">{k.value}</p>
            <p className="text-xs font-medium text-on-surface-variant mt-1">{k.label}</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{k.sub}</p>
          </div>
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
                {['Mã Đặt Tour', 'Khách Hàng', 'Tour', 'Giá Trị', 'Trạng Thái', 'Thanh Toán', 'Ngày Đặt', 'Thao Tác'].map((h, i) => (
                  <th key={h} className={`py-3.5 px-5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${i === 7 ? 'text-right' : ''}`}>{h}</th>
                ))}
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
                            <img src={b.user.avatarUrl} alt={b.user.fullName} className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-outline-variant/10" />
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

                      {/* Thanh toán */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${pc.badge}`}>
                          <span className="material-symbols-outlined text-[12px]">{pc.icon}</span>
                          {pc.label}
                        </span>
                      </td>

                      {/* Ngày đặt */}
                      <td className="py-4 px-5 text-sm text-on-surface-variant whitespace-nowrap">
                        {fmtDate(b.createdAt)}
                      </td>

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
        <div role="status" className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.ok ? 'bg-tertiary text-on-tertiary' : 'bg-error text-on-error'}`}>
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            {toast.ok ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}
    </main>
  );
}

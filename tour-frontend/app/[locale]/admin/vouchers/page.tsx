'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import VoucherFormModal from '@/app/components/admin/VoucherFormModal';
import VoucherDetailDrawer from '@/app/components/admin/VoucherDetailDrawer';
import AdminPagination from '@/app/components/admin/AdminPagination';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Voucher {
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
}

interface Stats {
  totalActive: number;
  totalExpiredThisMonth: number;
  expiringSoon: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
}

interface Meta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

interface ToastState { message: string; type: 'success' | 'error' }

type ModalMode = 'create' | 'edit' | null;
type VoucherStatusFilter = Voucher['computedStatus'] | 'expiringSoon' | 'expiredThisMonth' | 'redeemed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NEVER_YEAR = 2099;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const formatCurrencyCompact = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ ₫`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr ₫`;
  return formatCurrency(n);
};

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

const isNeverExpires = (d: string) => new Date(d).getFullYear() >= NEVER_YEAR;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getApiMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    return typeof message === 'string' ? message : fallback;
  }
  return fallback;
};

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  active:   { label: 'Hoạt động',    dot: 'bg-tertiary',  text: 'text-tertiary' },
  expired:  { label: 'Hết hạn',      dot: 'bg-outline',   text: 'text-outline' },
  depleted: { label: 'Hết lượt',     dot: 'bg-error',     text: 'text-error' },
  inactive: { label: 'Vô hiệu hóa', dot: 'bg-secondary', text: 'text-secondary' },
};

const typeConfig: Record<string, { label: string; cls: string }> = {
  PERCENTAGE:   { label: 'Phần trăm',  cls: 'bg-primary/10 text-primary' },
  FIXED_AMOUNT: { label: 'Số tiền cố định', cls: 'bg-secondary/10 text-secondary' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VoucherManagementPage() {
  // ── State: data ─────────────────────────────────────────────────────────
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // ── State: filters ───────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState<VoucherStatusFilter | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // ── State: UI ────────────────────────────────────────────────────────────
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Fetch current user role
  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/auth/profile`)
      .then((r: Response) => r.json())
      .then((d: unknown) => {
        const payload = d && typeof d === 'object' && 'data' in d
          ? (d as { data?: unknown }).data
          : d;
        const role = payload && typeof payload === 'object' && 'role' in payload
          ? (payload as { role?: unknown }).role
          : undefined;
        setCurrentUserRole(typeof role === 'string' ? role : '');
      })
      .catch(() => {});
  }, []);

  // ── Toast ────────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // ── Fetch Stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/stats`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      // TransformInterceptor wraps: { statusCode, message, data: Stats, timestamp }
      setStats(json?.data ?? json);
    } catch {
      // stats không critical, fail silently
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // ── Fetch Vouchers ───────────────────────────────────────────────────────
  const fetchVouchers = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.append('search', debouncedSearch);
      if (filterType) qs.append('discountType', filterType);
      if (filterStatus) qs.append('status', filterStatus);
      qs.append('page', String(page));
      qs.append('limit', String(limit));

      const res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin?${qs}`);
      if (!res.ok) throw new Error('Không thể tải danh sách voucher');
      const json = await res.json();
      // TransformInterceptor: service trả { data: Voucher[], meta } → interceptor đã pull data[] lên
      // Nên json.data = Voucher[], json.meta = Meta (flat, không double-nest)
      setVouchers(json.data ?? []);
      if (json.meta) setMeta(json.meta);
    } catch (e: unknown) {
      showToast(getErrorMessage(e, 'Lỗi tải dữ liệu'), 'error');
    } finally {
      setIsLoadingList(false);
    }
  }, [debouncedSearch, filterType, filterStatus, page, limit, showToast]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  // ── Debounced search ─────────────────────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // ── Toggle Active ────────────────────────────────────────────────────────
  const handleToggle = async (v: Voucher) => {
    setToggleLoadingId(v.id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/${v.id}/toggle`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Lỗi cập nhật trạng thái');
      const raw = await res.json();
      // Unwrap nếu có data wrapper { data: {...} }
      const updated = raw?.data ?? raw;
      // Dùng giá trị từ server, fallback sang nghịch đảo isActive hiện tại
      const newIsActive = updated?.isActive !== undefined ? Boolean(updated.isActive) : !v.isActive;
      setVouchers((prev) => prev.map((x) => x.id === v.id ? {
        ...x,
        isActive: newIsActive,
        computedStatus: newIsActive
          ? (x.computedStatus === 'inactive' ? 'active' : x.computedStatus)
          : 'inactive',
      } : x));
      showToast(`${newIsActive ? 'Đã kích hoạt' : 'Đã vô hiệu hóa'} voucher "${v.code}"`);
      fetchStats();
    } catch (e: unknown) {
      showToast(getErrorMessage(e, 'Lỗi cập nhật'), 'error');
    } finally {
      setToggleLoadingId(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(getApiMessage(json, 'Lỗi xóa voucher'));
      showToast(`Đã xóa voucher "${deleteTarget.code}"`);
      setDeleteTarget(null);
      fetchVouchers();
      fetchStats();
    } catch (e: unknown) {
      showToast(getErrorMessage(e, 'Xóa that bại'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── KPI cards data ───────────────────────────────────────────────────────
  const filterByStatus = (status: VoucherStatusFilter) => {
    setFilterStatus((current) => current === status ? '' : status);
    setPage(1);
  };
  const clearVoucherFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setFilterType('');
    setFilterStatus('');
    setPage(1);
  };
  const hasFilter = Boolean(search || debouncedSearch || filterType || filterStatus);

  const kpis = [
    {
      icon: 'local_activity',
      label: 'Đang Hoạt Động',
      value: isLoadingStats ? '…' : (stats?.totalActive ?? 0).toLocaleString('vi-VN'),
      color: 'bg-tertiary/10 text-tertiary',
      onClick: () => filterByStatus('active'),
      active: filterStatus === 'active',
    },
    {
      icon: 'event_busy',
      label: 'Hết Hạn Tháng Này',
      value: isLoadingStats ? '…' : (stats?.totalExpiredThisMonth ?? 0).toLocaleString('vi-VN'),
      color: 'bg-slate-500/10 text-slate-600',
      onClick: () => filterByStatus('expiredThisMonth'),
      active: filterStatus === 'expiredThisMonth',
    },
    {
      icon: 'sell',
      label: 'Tổng Lượt Đổi',
      value: isLoadingStats ? '…' : (stats?.totalRedemptions ?? 0).toLocaleString('vi-VN'),
      color: 'bg-primary/10 text-primary',
      onClick: () => filterByStatus('redeemed'),
      active: filterStatus === 'redeemed',
    },
    {
      icon: 'schedule',
      label: 'Sắp Hết Hạn (7 ngày)',
      value: isLoadingStats ? '…' : (stats?.expiringSoon ?? 0).toLocaleString('vi-VN'),
      color: 'bg-amber-500/10 text-amber-600',
      onClick: () => filterByStatus('expiringSoon'),
      active: filterStatus === 'expiringSoon',
    },
    {
      icon: 'payments',
      label: 'Tổng Giảm Giá Đã Cấp',
      value: isLoadingStats ? '…' : formatCurrencyCompact(stats?.totalDiscountGiven ?? 0),
      color: 'bg-secondary/10 text-secondary',
      active: false,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {/* Skip link */}
      <a href="#vouchers-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
        Nhảy đến bảng dữ liệu
      </a>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface">
            Quản Lý Voucher
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Tạo và quản lý mã khuyến mãi, xem lịch sử đổi thưởng và kiểm soát chiến dịch.
          </p>
        </div>
        {currentUserRole !== null && currentUserRole !== 'STAFF' && (
        <button
          id="btn-create-voucher"
          onClick={() => { setSelectedVoucher(null); setModalMode('create'); }}
          aria-label="Tạo voucher mới"
          className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md hover:opacity-90 transition-all active:scale-[0.98] flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
          Tạo Voucher Mới
        </button>
        )}
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {kpis.map((kpi) => {
          const content = (
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                <span className="material-symbols-outlined text-xl" aria-hidden="true">{kpi.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-on-surface-variant font-medium truncate">{kpi.label}</p>
                <p className="text-xl font-bold text-on-surface leading-tight mt-0.5 truncate">{kpi.value}</p>
              </div>
              <span className={`material-symbols-outlined text-[18px] ${kpi.active ? 'text-primary' : 'text-on-surface-variant/35'}`}>
                {kpi.onClick ? (kpi.active ? 'filter_alt_off' : 'filter_alt') : 'monitoring'}
              </span>
            </div>
          );

          return kpi.onClick ? (
            <button
              key={kpi.label}
              type="button"
              onClick={kpi.onClick}
              aria-pressed={kpi.active}
              className={`bg-surface-container-lowest rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all active:scale-[0.99] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary ${kpi.active ? 'border-primary/50 ring-2 ring-primary/15' : 'border-outline-variant/10'}`}
            >
              {content}
            </button>
          ) : (
            <div
              key={kpi.label}
              className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm text-left"
            >
              {content}
            </div>
          );
        })}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 border border-outline-variant/10 shadow-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none" aria-hidden="true">search</span>
          <label htmlFor="search-vouchers" className="sr-only">Tìm kiếm voucher</label>
          <input
            id="search-vouchers"
            type="search"
            autoComplete="off"
            placeholder="Tìm theo mã hoặc tên chiến dịch…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Type filter */}
          <label htmlFor="filter-type" className="sr-only">Lọc theo loại</label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
          >
            <option value="">Tất cả loại</option>
            <option value="PERCENTAGE">Phần trăm (%)</option>
            <option value="FIXED_AMOUNT">Số tiền cố định (₫)</option>
          </select>

          {/* Status filter */}
          <label htmlFor="filter-status" className="sr-only">Lọc theo trạng thái</label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as VoucherStatusFilter | ''); setPage(1); }}
            className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="expiringSoon">Sắp hết hạn 7 ngày</option>
            <option value="expiredThisMonth">Hết hạn tháng này</option>
            <option value="redeemed">Đã từng được dùng</option>
            <option value="expired">Đã hết hạn</option>
            <option value="depleted">Hết lượt dùng</option>
            <option value="inactive">Đã vô hiệu hóa</option>
          </select>
        </div>

        {/* Summary */}
        {hasFilter && (
          <button
            type="button"
            onClick={clearVoucherFilters}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">filter_alt_off</span>
            Xóa bộ lọc
          </button>
        )}
        {!isLoadingList && (
          <span className="text-xs text-on-surface-variant ml-auto">
            {meta.totalItems} voucher
          </span>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div id="vouchers-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                {['Mã Voucher', 'Loại Giảm', 'Giá Trị', 'Đơn Tối Thiểu', 'Sử Dụng', 'Hết Hạn', 'Trạng Thái', 'Thao Tác'].map((h, i) => (
                  <th
                    key={h}
                    className={`py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${i === 7 ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {isLoadingList ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin block mx-auto mb-3" aria-hidden="true">progress_activity</span>
                    <p className="text-on-surface-variant text-sm">Đang tải dữ liệu…</p>
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2 block" aria-hidden="true">local_activity</span>
                    <p className="font-bold text-on-surface">Không tìm thấy voucher nào</p>
                    <p className="text-on-surface-variant text-sm mt-1">Thử thay đổi bộ lọc hoặc tạo voucher mới.</p>
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const usageRatio = v.maxUses >= 999_999_999 ? 0.06 : Math.min(v.usedCount / v.maxUses, 1);
                  const st = statusConfig[v.computedStatus];
                  const tc = typeConfig[v.discountType];
                  const isInactive = v.computedStatus !== 'active';

                  return (
                    <tr key={v.id} className="hover:bg-surface-container-low/40 transition-colors group">
                      {/* Code + Label */}
                      <td className="py-3.5 px-5">
                        <button
                          onClick={() => setDetailId(v.id)}
                          className="text-left group/code focus-visible:ring-2 focus-visible:ring-primary rounded outline-none"
                          aria-label={`Xem chi tiết voucher ${v.code}`}
                        >
                          <p className={`font-mono font-bold text-sm group-hover/code:text-primary transition-colors ${isInactive ? 'text-on-surface-variant' : 'text-primary'}`}>
                            {v.code}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5 truncate max-w-[160px]">{v.label}</p>
                        </button>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${tc.cls} ${isInactive ? 'opacity-60' : ''}`}>
                          {tc.label}
                        </span>
                      </td>

                      {/* Value */}
                      <td className={`py-3.5 px-5 font-semibold text-sm text-on-surface whitespace-nowrap ${isInactive ? 'opacity-60' : ''}`}>
                        {v.discountType === 'PERCENTAGE'
                          ? `${v.discountValue}%`
                          : formatCurrency(v.discountValue)}
                      </td>

                      {/* Min Order */}
                      <td className={`py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap ${isInactive ? 'opacity-60' : ''}`}>
                        {v.minOrderValue > 0 ? formatCurrency(v.minOrderValue) : '—'}
                      </td>

                      {/* Usage */}
                      <td className={`py-3.5 px-5 min-w-[140px] ${isInactive ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                usageRatio >= 1 ? 'bg-error' : usageRatio >= 0.8 ? 'bg-amber-500' : 'bg-primary'
                              }`}
                              style={{ width: `${Math.max(usageRatio * 100, v.usedCount > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                          <span className="text-xs text-on-surface-variant whitespace-nowrap font-label">
                            {v.usedCount}/{v.maxUses >= 999_999_999 ? '∞' : v.maxUses}
                          </span>
                        </div>
                      </td>

                      {/* Expires */}
                      <td className={`py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap ${isInactive ? 'opacity-60' : ''}`}>
                        {isNeverExpires(v.expiresAt) ? (
                          <span className="inline-flex items-center gap-1 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">all_inclusive</span>
                            Vĩnh viễn
                          </span>
                        ) : (
                          formatDate(v.expiresAt)
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        <div className={`flex items-center gap-1.5 text-sm font-semibold ${st.text}`}>
                          <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                          {st.label}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View details */}
                          <div className="relative group/tip">
                            <button
                              onClick={() => setDetailId(v.id)}
                              aria-label={`Xem chi tiết voucher ${v.code}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                            >
                              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                              Chi tiết
                              <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                            </span>
                          </div>

                          {/* Edit — chỉ ADMIN trở lên */}
                          {currentUserRole !== null && currentUserRole !== 'STAFF' && (
                          <div className="relative group/tip">
                            <button
                              onClick={() => { setSelectedVoucher(v); setModalMode('edit'); }}
                              aria-label={`Sửa voucher ${v.code}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                            >
                              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                              Chỉnh sửa
                              <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                            </span>
                          </div>
                          )}

                          {/* Toggle active — chỉ ADMIN trở lên */}
                          {currentUserRole !== null && currentUserRole !== 'STAFF' && (
                          <div className="relative group/tip">
                            <button
                              onClick={() => handleToggle(v)}
                              disabled={toggleLoadingId === v.id}
                              aria-label={v.isActive ? `Vô hiệu hóa ${v.code}` : `Kích hoạt ${v.code}`}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors focus-visible:ring-2 outline-none disabled:opacity-50 ${
                                v.isActive
                                  ? 'text-on-surface-variant hover:bg-amber-500/10 hover:text-amber-600 focus-visible:ring-amber-500'
                                  : 'text-on-surface-variant hover:bg-tertiary/10 hover:text-tertiary focus-visible:ring-tertiary'
                              }`}
                            >
                              {toggleLoadingId === v.id ? (
                                <span className="material-symbols-outlined text-[18px] animate-spin" aria-hidden="true">progress_activity</span>
                              ) : (
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                  {v.isActive ? 'pause_circle' : 'play_circle'}
                                </span>
                              )}
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                              {v.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                              <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                            </span>
                          </div>
                          )}

                          {/* Delete — chỉ SUPER_ADMIN */}
                          {currentUserRole === 'SUPER_ADMIN' && (
                          <div className="relative group/tip">
                            <button
                              onClick={() => setDeleteTarget(v)}
                              aria-label={`Xóa voucher ${v.code}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors focus-visible:ring-2 focus-visible:ring-error outline-none"
                            >
                              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded-md bg-error px-2 py-1 text-[10px] font-medium text-on-error opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                              Xóa
                              <span className="absolute right-3 top-full border-4 border-transparent border-t-error" />
                            </span>
                          </div>
                          )}
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
        {!isLoadingList && (
          <div className="py-2 px-6 border-t border-outline-variant/10 bg-surface-container-lowest">
            <AdminPagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.totalItems}
              onPageChange={setPage}
              pageSize={limit}
              onPageSizeChange={(newSize) => {
                  setLimit(newSize);
                  setPage(1);
              }}
              itemLabel="voucher"
            />
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      {modalMode && (
        <VoucherFormModal
          mode={modalMode}
          initialData={selectedVoucher ?? undefined}
          onSuccess={(msg) => { showToast(msg); fetchVouchers(); fetchStats(); }}
          onClose={() => { setModalMode(null); setSelectedVoucher(null); }}
        />
      )}

      {/* ── Detail Drawer ───────────────────────────────────────────────── */}
      <VoucherDetailDrawer
        voucherId={detailId}
        onClose={() => setDetailId(null)}
      />

      {/* ── Delete Confirm Dialog ───────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-voucher-title"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-7">
              <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-error text-2xl" aria-hidden="true">delete_forever</span>
              </div>
              <h2 id="delete-voucher-title" className="text-lg font-bold text-on-surface mb-2">Xóa Voucher?</h2>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Bạn sắp xóa voucher{' '}
                <strong className="text-on-surface font-mono">&ldquo;{deleteTarget.code}&rdquo;</strong>.
              </p>
              {deleteTarget.usedCount > 0 && (
                <div className="mt-3 p-3 bg-error/5 border border-error/20 rounded-xl flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-base mt-0.5" aria-hidden="true">warning</span>
                  <p className="text-sm text-error">
                    Voucher này đã được sử dụng <strong>{deleteTarget.usedCount} lần</strong>. Server sẽ từ chối xóa — hãy vô hiệu hóa thay thế.
                  </p>
                </div>
              )}
            </div>
            <div className="px-7 pb-6 flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-error text-on-error rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-error outline-none"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                    Đang xóa…
                  </>
                ) : (
                  'Xóa Voucher'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.message}</div>
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${
            toast.type === 'error' ? 'bg-error text-on-error' : 'bg-tertiary text-on-tertiary'
          }`}
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.message}
        </div>
      )}
    </main>
  );
}

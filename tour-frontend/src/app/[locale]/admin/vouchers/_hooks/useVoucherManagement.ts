'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import {
  formatCurrencyCompact,
  getApiMessage,
  getErrorMessage,
} from '../_lib/helpers';
import type {
  Meta,
  ModalMode,
  Stats,
  ToastState,
  Voucher,
  VoucherKpiItem,
  VoucherSortBy,
  VoucherSortOrder,
  VoucherStatusFilter,
} from '../_lib/types';

const DISCOUNT_TYPES = new Set(['PERCENTAGE', 'FIXED_AMOUNT']);
const VOUCHER_STATUSES = new Set(['active', 'expired', 'depleted', 'inactive', 'scheduled', 'expiringSoon', 'expiredThisMonth', 'redeemed']);
const SORT_FIELDS = new Set(['createdAt', 'startsAt', 'expiresAt', 'usedCount', 'discountValue', 'minOrderValue']);
const SORT_ORDERS = new Set(['asc', 'desc']);

const getQueryString = (params: URLSearchParams) => {
  const nextQuery = params.toString();
  return nextQuery ? `?${nextQuery}` : '';
};

const parsePositiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseDiscountType = (value: string | null) => DISCOUNT_TYPES.has(value ?? '') ? value ?? '' : '';

const parseStatus = (value: string | null): VoucherStatusFilter | '' =>
  VOUCHER_STATUSES.has(value ?? '') ? value as VoucherStatusFilter : '';

const parseSortBy = (value: string | null): VoucherSortBy =>
  SORT_FIELDS.has(value ?? '') ? value as VoucherSortBy : 'createdAt';

const parseSortOrder = (value: string | null): VoucherSortOrder =>
  SORT_ORDERS.has(value ?? '') ? value as VoucherSortOrder : 'desc';

const escapeCsv = (value: string | number | boolean | null | undefined) => {
  const raw = value == null ? '' : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
};

const makeDuplicateCode = (code: string) => {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const suffix = `_C${Date.now().toString().slice(-4)}`;
  const base = (normalized || 'VOUCHER').slice(0, 20 - suffix.length);
  return `${base}${suffix}`;
};

export function useVoucherManagement() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasMountedSearchSync = useRef(false);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => (searchParams.get('search') ?? '').trim());
  const [filterType, setFilterType] = useState(() => parseDiscountType(searchParams.get('discountType')));
  const [filterStatus, setFilterStatus] = useState<VoucherStatusFilter | ''>(() => parseStatus(searchParams.get('status')));
  const [sortBy, setSortBy] = useState<VoucherSortBy>(() => parseSortBy(searchParams.get('sortBy')));
  const [sortOrder, setSortOrder] = useState<VoucherSortOrder>(() => parseSortOrder(searchParams.get('sortOrder')));
  const [page, setPage] = useState(() => parsePositiveInteger(searchParams.get('page'), 1));
  const [limit, setLimit] = useState(() => parsePositiveInteger(searchParams.get('limit'), 10));

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Partial<Voucher> | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<Set<number>>(new Set());

  const updateQuery = useCallback((patch: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    window.history.replaceState(null, '', `${pathname}${getQueryString(params)}`);
  }, [pathname]);

  const clearSelection = useCallback(() => {
    setSelectedVoucherIds(new Set());
  }, []);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/auth/profile`)
      .then((response: Response) => response.json())
      .then((payload: unknown) => {
        const profile = payload && typeof payload === 'object' && 'data' in payload
          ? (payload as { data?: unknown }).data
          : payload;
        const role = profile && typeof profile === 'object' && 'role' in profile
          ? (profile as { role?: unknown }).role
          : undefined;
        setCurrentUserRole(typeof role === 'string' ? role : '');
      })
      .catch(() => {});
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (!hasMountedSearchSync.current) {
      hasMountedSearchSync.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      const nextSearch = search.trim();
      setDebouncedSearch(nextSearch);
      updateQuery({ search: nextSearch || null, page: null });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, updateQuery]);

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/stats`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStats(json?.data ?? json);
    } catch {
      // Stats are supplemental; list operations should remain usable.
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchVouchers = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filterType) params.append('discountType', filterType);
      if (filterStatus) params.append('status', filterStatus);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin?${params}`);
      if (!res.ok) throw new Error('Không thể tải danh sách voucher');
      const json = await res.json();
      setVouchers(json.data ?? []);
      if (json.meta) setMeta(json.meta);
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Lỗi tải dữ liệu'), 'error');
    } finally {
      setIsLoadingList(false);
    }
  }, [debouncedSearch, filterType, filterStatus, sortBy, sortOrder, page, limit, showToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const refreshVoucherData = useCallback(async () => {
    await Promise.all([fetchStats(), fetchVouchers()]);
  }, [fetchStats, fetchVouchers]);

  useAdminAutoRefresh({
    intervalMs: 90 * 1000,
    pause: Boolean(modalMode || detailId || deleteTarget || isDeleting || toggleLoadingId),
    onRefresh: refreshVoucherData,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    clearSelection();
  }, [clearSelection]);

  const changeTypeFilter = useCallback((value: string) => {
    setFilterType(value);
    setPage(1);
    clearSelection();
    updateQuery({ discountType: value || null, page: null });
  }, [clearSelection, updateQuery]);

  const changeStatusFilter = useCallback((value: VoucherStatusFilter | '') => {
    setFilterStatus(value);
    setPage(1);
    clearSelection();
    updateQuery({ status: value || null, page: null });
  }, [clearSelection, updateQuery]);

  const changePage = useCallback((nextPage: number) => {
    setPage(nextPage);
    clearSelection();
    updateQuery({ page: nextPage > 1 ? nextPage : null });
  }, [clearSelection, updateQuery]);

  const changePageSize = useCallback((newSize: number) => {
    setLimit(newSize);
    setPage(1);
    clearSelection();
    updateQuery({ limit: newSize === 10 ? null : newSize, page: null });
  }, [clearSelection, updateQuery]);

  const changeSort = useCallback((key: VoucherSortBy) => {
    const nextOrder = sortBy === key
      ? (sortOrder === 'asc' ? 'desc' : 'asc')
      : (key === 'expiresAt' ? 'asc' : 'desc');

    setSortBy(key);
    setSortOrder(nextOrder);
    setPage(1);
    clearSelection();
    updateQuery({
      sortBy: key === 'createdAt' && nextOrder === 'desc' ? null : key,
      sortOrder: key === 'createdAt' && nextOrder === 'desc' ? null : nextOrder,
      page: null,
    });
  }, [clearSelection, sortBy, sortOrder, updateQuery]);

  const openCreate = useCallback(() => {
    setSelectedVoucher(null);
    setModalMode('create');
  }, []);

  const openEdit = useCallback((voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setModalMode('edit');
  }, []);

  const openDuplicate = useCallback((voucher: Voucher) => {
    setSelectedVoucher({
      ...voucher,
      id: undefined,
      code: makeDuplicateCode(voucher.code),
      label: `${voucher.label} (bản sao)`.slice(0, 60),
      usedCount: 0,
      isActive: false,
      computedStatus: 'inactive',
    });
    setModalMode('create');
  }, []);

  const closeForm = useCallback(() => {
    setModalMode(null);
    setSelectedVoucher(null);
  }, []);

  const handleFormSuccess = useCallback((message: string) => {
    showToast(message);
    fetchVouchers();
    fetchStats();
  }, [fetchStats, fetchVouchers, showToast]);

  const handleToggle = useCallback(async (voucher: Voucher) => {
    setToggleLoadingId(voucher.id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/${voucher.id}/toggle`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Lỗi cập nhật trạng thái');
      const raw = await res.json();
      const updated = raw?.data ?? raw;
      const newIsActive = updated?.isActive !== undefined ? Boolean(updated.isActive) : !voucher.isActive;
      setVouchers((prev) => prev.map((item) => item.id === voucher.id ? {
        ...item,
        isActive: newIsActive,
        computedStatus: newIsActive
          ? (item.computedStatus === 'inactive' ? 'active' : item.computedStatus)
          : 'inactive',
      } : item));
      showToast(`${newIsActive ? 'Đã kích hoạt' : 'Đã vô hiệu hóa'} voucher "${voucher.code}"`);
      fetchStats();
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Lỗi cập nhật'), 'error');
    } finally {
      setToggleLoadingId(null);
    }
  }, [fetchStats, showToast]);

  const selectedVouchers = useMemo(
    () => vouchers.filter((voucher) => selectedVoucherIds.has(voucher.id)),
    [selectedVoucherIds, vouchers],
  );

  const selectedActiveCount = selectedVouchers.filter((voucher) => voucher.isActive).length;
  const selectedInactiveCount = selectedVouchers.length - selectedActiveCount;
  const selectedCount = selectedVouchers.length;
  const allCurrentPageSelected = vouchers.length > 0 && vouchers.every((voucher) => selectedVoucherIds.has(voucher.id));
  const someCurrentPageSelected = vouchers.some((voucher) => selectedVoucherIds.has(voucher.id)) && !allCurrentPageSelected;

  const toggleSelectedVoucher = useCallback((voucherId: number) => {
    setSelectedVoucherIds((current) => {
      const next = new Set(current);
      if (next.has(voucherId)) next.delete(voucherId);
      else next.add(voucherId);
      return next;
    });
  }, []);

  const toggleCurrentPageSelection = useCallback(() => {
    setSelectedVoucherIds((current) => {
      const next = new Set(current);
      const shouldSelectAll = !vouchers.every((voucher) => next.has(voucher.id));
      vouchers.forEach((voucher) => {
        if (shouldSelectAll) next.add(voucher.id);
        else next.delete(voucher.id);
      });
      return next;
    });
  }, [vouchers]);

  const bulkToggleVouchers = useCallback(async (targetActive: boolean) => {
    const targets = selectedVouchers.filter((voucher) => voucher.isActive !== targetActive);
    if (targets.length === 0) return;

    setIsBulkUpdating(true);
    try {
      await Promise.all(targets.map(async (voucher) => {
        const res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/${voucher.id}/toggle`, { method: 'PATCH' });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(getApiMessage(payload, `Không thể cập nhật ${voucher.code}`));
        }
      }));

      showToast(`${targetActive ? 'Đã kích hoạt' : 'Đã vô hiệu hóa'} ${targets.length} voucher`);
      clearSelection();
      await refreshVoucherData();
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Cập nhật hàng loạt thất bại'), 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [clearSelection, refreshVoucherData, selectedVouchers, showToast]);

  const exportSelectedVouchers = useCallback(() => {
    if (selectedVouchers.length === 0) return;

    const headers = [
      'code',
      'label',
      'discountType',
      'discountValue',
      'maxDiscountAmount',
      'minOrderValue',
      'usedCount',
      'maxUses',
      'usageLimitPerUser',
      'startsAt',
      'expiresAt',
      'isActive',
      'isStackable',
      'eligibleTourIds',
      'eligibleDestinationIds',
      'eligibleCustomerSegments',
      'computedStatus',
    ];
    const rows = selectedVouchers.map((voucher) => [
      voucher.code,
      voucher.label,
      voucher.discountType,
      voucher.discountValue,
      voucher.maxDiscountAmount ?? '',
      voucher.minOrderValue,
      voucher.usedCount,
      voucher.maxUses >= 999_999_999 ? 'unlimited' : voucher.maxUses,
      voucher.usageLimitPerUser ?? '',
      voucher.startsAt,
      voucher.expiresAt,
      voucher.isActive,
      voucher.isStackable,
      voucher.eligibleTourIds.join('|'),
      voucher.eligibleDestinationIds.join('|'),
      voucher.eligibleCustomerSegments.join('|'),
      voucher.computedStatus,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `azure-horizon-vouchers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${selectedVouchers.length} voucher ra CSV`);
  }, [selectedVouchers, showToast]);

  const copyText = useCallback(async (text: string, successMessage: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      showToast(successMessage);
    } catch {
      showToast('Không thể sao chép vào clipboard', 'error');
    }
  }, [showToast]);

  const copyVoucherCode = useCallback((voucher: Voucher) => {
    void copyText(voucher.code, `Đã sao chép mã "${voucher.code}"`);
  }, [copyText]);

  const copyVoucherShareLink = useCallback((voucher: Voucher) => {
    const locale = pathname.split('/').filter(Boolean)[0] || 'vi';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/${locale}/promotions?voucher=${encodeURIComponent(voucher.code)}`;
    void copyText(url, `Đã sao chép link chia sẻ "${voucher.code}"`);
  }, [copyText, pathname]);

  const confirmDelete = useCallback(async () => {
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
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Xóa thất bại'), 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, fetchStats, fetchVouchers, showToast]);

  const filterByStatus = useCallback((status: VoucherStatusFilter) => {
    const nextStatus = filterStatus === status ? '' : status;
    setFilterStatus(nextStatus);
    setPage(1);
    clearSelection();
    updateQuery({ status: nextStatus || null, page: null });
  }, [clearSelection, filterStatus, updateQuery]);

  const clearVoucherFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setFilterType('');
    setFilterStatus('');
    setPage(1);
    clearSelection();
    updateQuery({
      search: null,
      discountType: null,
      status: null,
      page: null,
    });
  }, [clearSelection, updateQuery]);

  const kpis: VoucherKpiItem[] = [
    {
      icon: 'local_activity',
      label: 'Đang Hoạt Động',
      value: isLoadingStats ? '…' : (stats?.totalActive ?? 0).toLocaleString('vi-VN'),
      color: 'bg-tertiary/10 text-tertiary',
      hint: 'Bấm để lọc voucher đang bật',
      onClick: () => filterByStatus('active'),
      active: filterStatus === 'active',
    },
    {
      icon: 'event_busy',
      label: 'Hết Hạn Tháng Này',
      value: isLoadingStats ? '…' : (stats?.totalExpiredThisMonth ?? 0).toLocaleString('vi-VN'),
      color: 'bg-slate-500/10 text-slate-600',
      hint: 'Bấm để xem voucher đã hết hạn trong tháng',
      onClick: () => filterByStatus('expiredThisMonth'),
      active: filterStatus === 'expiredThisMonth',
    },
    {
      icon: 'sell',
      label: 'Tổng Lượt Đổi',
      value: isLoadingStats ? '…' : (stats?.totalRedemptions ?? 0).toLocaleString('vi-VN'),
      color: 'bg-primary/10 text-primary',
      hint: 'Bấm để xem voucher đã phát sinh lượt đổi',
      onClick: () => filterByStatus('redeemed'),
      active: filterStatus === 'redeemed',
    },
    {
      icon: 'schedule',
      label: 'Sắp Hết Hạn (7 ngày)',
      value: isLoadingStats ? '…' : (stats?.expiringSoon ?? 0).toLocaleString('vi-VN'),
      color: 'bg-amber-500/10 text-amber-600',
      hint: 'Bấm để xem voucher cần xử lý trước khi hết hạn',
      onClick: () => filterByStatus('expiringSoon'),
      active: filterStatus === 'expiringSoon',
    },
    {
      icon: 'payments',
      label: 'Tổng Giảm Giá Đã Cấp',
      value: isLoadingStats ? '…' : formatCurrencyCompact(stats?.totalDiscountGiven ?? 0),
      color: 'bg-secondary/10 text-secondary',
      hint: 'Toàn thời gian, chỉ tính booking đã thanh toán',
      active: false,
    },
  ];

  const hasFilter = Boolean(search || debouncedSearch || filterType || filterStatus);

  return {
    vouchers,
    meta,
    isLoadingList,
    search,
    filterType,
    filterStatus,
    sortBy,
    sortOrder,
    page,
    limit,
    modalMode,
    selectedVoucher,
    detailId,
    deleteTarget,
    isDeleting,
    isBulkUpdating,
    toggleLoadingId,
    toast,
    currentUserRole,
    selectedVoucherIds,
    selectedCount,
    selectedActiveCount,
    selectedInactiveCount,
    allCurrentPageSelected,
    someCurrentPageSelected,
    kpis,
    hasFilter,
    setDetailId,
    setDeleteTarget,
    clearSelection,
    handleSearchChange,
    changeTypeFilter,
    changeStatusFilter,
    changeSort,
    changePage,
    changePageSize,
    openCreate,
    openEdit,
    openDuplicate,
    closeForm,
    handleFormSuccess,
    handleToggle,
    bulkActivate: () => bulkToggleVouchers(true),
    bulkDeactivate: () => bulkToggleVouchers(false),
    exportSelectedVouchers,
    toggleSelectedVoucher,
    toggleCurrentPageSelection,
    copyVoucherCode,
    copyVoucherShareLink,
    confirmDelete,
    clearVoucherFilters,
  };
}

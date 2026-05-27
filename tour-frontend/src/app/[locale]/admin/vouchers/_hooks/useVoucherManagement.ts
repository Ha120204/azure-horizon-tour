'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import {
  formatCurrencyCompact,
  getApiMessage,
  getErrorMessage,
} from '../_lib/helpers';
import type { Meta, ModalMode, Stats, ToastState, Voucher, VoucherKpiItem, VoucherStatusFilter } from '../_lib/types';

export function useVoucherManagement() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState<VoucherStatusFilter | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

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
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

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
  }, [debouncedSearch, filterType, filterStatus, page, limit, showToast]);

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
  }, []);

  const changeTypeFilter = useCallback((value: string) => {
    setFilterType(value);
    setPage(1);
  }, []);

  const changeStatusFilter = useCallback((value: VoucherStatusFilter | '') => {
    setFilterStatus(value);
    setPage(1);
  }, []);

  const changePageSize = useCallback((newSize: number) => {
    setLimit(newSize);
    setPage(1);
  }, []);

  const openCreate = useCallback(() => {
    setSelectedVoucher(null);
    setModalMode('create');
  }, []);

  const openEdit = useCallback((voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setModalMode('edit');
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
    setFilterStatus((current) => current === status ? '' : status);
    setPage(1);
  }, []);

  const clearVoucherFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setFilterType('');
    setFilterStatus('');
    setPage(1);
  }, []);

  const kpis: VoucherKpiItem[] = [
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

  const hasFilter = Boolean(search || debouncedSearch || filterType || filterStatus);

  return {
    vouchers,
    meta,
    isLoadingList,
    search,
    filterType,
    filterStatus,
    page,
    limit,
    modalMode,
    selectedVoucher,
    detailId,
    deleteTarget,
    isDeleting,
    toggleLoadingId,
    toast,
    currentUserRole,
    kpis,
    hasFilter,
    setPage,
    setDetailId,
    setDeleteTarget,
    handleSearchChange,
    changeTypeFilter,
    changeStatusFilter,
    changePageSize,
    openCreate,
    openEdit,
    closeForm,
    handleFormSuccess,
    handleToggle,
    confirmDelete,
    clearVoucherFilters,
  };
}

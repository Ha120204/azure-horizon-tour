'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { exportBookingsCsv } from '../_lib/exportCsv';
import {
  getApiErrorMessage,
  getErrorMessage,
} from '../_lib/helpers';
import type {
  Booking,
  BookingListPayload,
  Meta,
  PaymentStats,
  Stats,
} from '../_lib/types';

const initialStats: Stats = {
  pending: 0,
  confirmed: 0,
  cancelRequested: 0,
  cancelled: 0,
  total: 0,
  totalRevenue: 0,
  paidCount: 0,
  unpaidCount: 0,
  failedPaymentCount: 0,
};

const initialMeta: Meta = {
  totalItems: 0,
  totalPages: 1,
  currentPage: 1,
  itemsPerPage: 10,
};

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useBookingManagement() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const initialStatus = searchParams.get('status') ?? '';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [needsReconciliation, setNeedsReconciliation] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [hasFreshData, setHasFreshData] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [statsDateFrom, setStatsDateFrom] = useState('');
  const [statsDateTo, setStatsDateTo] = useState(() => getTodayDateInputValue());
  const defaultStatsDateTo = getTodayDateInputValue();

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBookingSignature = useRef('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const buildQs = useCallback((overrides: Record<string, string> = {}) => {
    const qs = new URLSearchParams();
    if (debouncedSearch) qs.set('search', debouncedSearch);
    if (statusFilter) qs.set('status', statusFilter);
    if (paymentFilter) qs.set('paymentStatus', paymentFilter);
    if (paymentMethodFilter) qs.set('paymentMethod', paymentMethodFilter);
    if (needsReconciliation) qs.set('needsReconciliation', 'true');
    if (dateFrom) qs.set('dateFrom', dateFrom);
    if (dateTo) qs.set('dateTo', dateTo);
    Object.entries(overrides).forEach(([key, value]) => qs.set(key, value));
    return qs.toString();
  }, [debouncedSearch, statusFilter, paymentFilter, paymentMethodFilter, needsReconciliation, dateFrom, dateTo]);

  const buildBookingSignature = useCallback((payload: BookingListPayload) => JSON.stringify({
    total: payload.meta?.totalItems ?? 0,
    stats: payload.stats ? {
      pending: payload.stats.pending,
      confirmed: payload.stats.confirmed,
      cancelRequested: payload.stats.cancelRequested,
      cancelled: payload.stats.cancelled,
      unpaidCount: payload.stats.unpaidCount,
      processingCount: payload.stats.processingCount,
    } : null,
    rows: (payload.bookings ?? []).map(booking => ({
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
      latestPaymentRequest: booking.notifications?.[0]
        ? `${booking.notifications[0].id}:${booking.notifications[0].status}`
        : '',
    })),
  }), []);

  const getBookingsPayload = useCallback(async (): Promise<BookingListPayload> => {
    const qs = buildQs({ page: String(page), limit: String(pageSize) });
    const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/all?${qs}`);
    const json = await res.json();
    if (!res.ok) throw new Error();
    return json?.data ?? json;
  }, [buildQs, page, pageSize]);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await getBookingsPayload();
      setBookings(payload.bookings ?? []);
      if (payload.stats) setStats(payload.stats);
      if (payload.meta) setMeta(payload.meta);
      lastBookingSignature.current = buildBookingSignature(payload);
      setHasFreshData(false);
      setLastSyncedAt(new Date());
    } catch {
      showToast('Lỗi tải danh sách đặt tour', false);
    } finally {
      setIsLoading(false);
    }
  }, [buildBookingSignature, getBookingsPayload, showToast]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const checkForFreshData = async () => {
      if (document.visibilityState !== 'visible' || selectedBooking) return;

      try {
        const payload = await getBookingsPayload();
        const nextSignature = buildBookingSignature(payload);
        if (!lastBookingSignature.current) {
          lastBookingSignature.current = nextSignature;
          return;
        }
        if (nextSignature !== lastBookingSignature.current) {
          setHasFreshData(true);
        }
      } catch {
        // Background refresh is best-effort; keep the current table stable.
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') void checkForFreshData();
    };

    const intervalId = window.setInterval(checkForFreshData, 30 * 1000);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [buildBookingSignature, getBookingsPayload, selectedBooking]);

  const fetchPaymentStats = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (statsDateFrom) qs.set('dateFrom', statsDateFrom);
      if (statsDateTo) qs.set('dateTo', statsDateTo);
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/payment-stats?${qs}`);
      const json = await res.json();
      if (res.ok) setPaymentStats(json?.data ?? null);
    } catch {
      // Payment stats are supplementary; keep the booking list usable.
    }
  }, [statsDateFrom, statsDateTo]);

  useEffect(() => {
    void fetchPaymentStats();
  }, [fetchPaymentStats]);

  const refreshBookingsAndPaymentStats = useCallback(async () => {
    await Promise.all([
      fetchBookings(),
      fetchPaymentStats(),
    ]);
  }, [fetchBookings, fetchPaymentStats]);

  const handleConfirmSuccess = useCallback(async (updated: Booking) => {
    try {
      const payload = await getBookingsPayload();
      const refreshedBookings = payload.bookings ?? [];
      const refreshedBooking = refreshedBookings.find(booking => booking.id === updated.id) ?? updated;

      setBookings(refreshedBookings.length > 0
        ? refreshedBookings
        : prev => prev.map(booking => booking.id === updated.id ? refreshedBooking : booking));
      setSelectedBooking(refreshedBooking);
      if (payload.stats) setStats(payload.stats);
      if (payload.meta) setMeta(payload.meta);
      lastBookingSignature.current = buildBookingSignature(payload);
      setHasFreshData(false);
      setLastSyncedAt(new Date());
      await fetchPaymentStats();
    } catch {
      setBookings(prev => prev.map(booking => booking.id === updated.id ? updated : booking));
      setSelectedBooking(updated);
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        confirmed: prev.confirmed + 1,
        paidCount: prev.paidCount + 1,
        totalRevenue: prev.totalRevenue + updated.totalPrice,
      }));
      void fetchPaymentStats();
    }
    showToast(`✓ Đã xác nhận thủ công đơn ${updated.bookingCode}`);
  }, [buildBookingSignature, fetchPaymentStats, getBookingsPayload, showToast]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const exportedCount = await exportBookingsCsv(buildQs({ page: '1', limit: '99999' }));
      if (exportedCount === 0) {
        showToast('Không có dữ liệu để xuất', false);
        return;
      }
      showToast(`Đã xuất ${exportedCount} đơn ra file CSV`);
    } catch {
      showToast('Xuất file thất bại. Vui lòng thử lại.', false);
    } finally {
      setIsExporting(false);
    }
  }, [buildQs, showToast]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setPaymentFilter('');
    setPaymentMethodFilter('');
    setNeedsReconciliation(false);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  const copyPaymentRequest = useCallback(async (booking: Booking) => {
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
  }, [showToast]);

  const resendPaymentRequest = useCallback(async (booking: Booking, forceEmail = false) => {
    if (booking.paymentMethod !== 'PAYOS') {
      showToast('Đơn tại quầy không tạo link PayOS. Hãy xác nhận thu tại quầy hoặc đổi phương thức sang PayOS.', false);
      return;
    }

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
  }, [fetchBookings, showToast]);

  const filterByStatus = useCallback((nextStatus: Booking['status']) => {
    setStatusFilter(current => current === nextStatus ? '' : nextStatus);
    setPage(1);
  }, []);

  const filterByPayment = useCallback((paymentStatus: Booking['paymentStatus']) => {
    setPaymentFilter(current => current === paymentStatus ? '' : paymentStatus);
    setPage(1);
  }, []);

  const changeStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const changePaymentFilter = useCallback((value: string) => {
    setPaymentFilter(value);
    setPage(1);
  }, []);

  const changePaymentMethodFilter = useCallback((value: string) => {
    setPaymentMethodFilter(value);
    setPage(1);
  }, []);

  const changeNeedsReconciliation = useCallback((value: boolean) => {
    setNeedsReconciliation(value);
    setPage(1);
  }, []);

  const changeDateFrom = useCallback((value: string) => {
    setDateFrom(value);
    setPage(1);
  }, []);

  const changeDateTo = useCallback((value: string) => {
    setDateTo(value);
    setPage(1);
  }, []);

  const changePageSize = useCallback((value: number) => {
    setPageSize(value);
    setPage(1);
  }, []);

  const clearStatsDates = useCallback(() => {
    setStatsDateFrom('');
    setStatsDateTo(getTodayDateInputValue());
  }, []);

  const hasFilter = !!(search || statusFilter || paymentFilter || paymentMethodFilter || needsReconciliation || dateFrom || dateTo);

  return {
    bookings,
    stats,
    meta,
    isLoading,
    isExporting,
    search,
    statusFilter,
    paymentFilter,
    paymentMethodFilter,
    needsReconciliation,
    dateFrom,
    dateTo,
    pageSize,
    selectedBooking,
    toast,
    hasFreshData,
    lastSyncedAt,
    paymentStats,
    statsDateFrom,
    statsDateTo,
    defaultStatsDateTo,
    hasFilter,
    setSearch,
    setPage,
    setSelectedBooking,
    setStatsDateFrom,
    setStatsDateTo,
    showToast,
    fetchBookings,
    refreshBookingsAndPaymentStats,
    handleConfirmSuccess,
    handleExport,
    resetFilters,
    copyPaymentRequest,
    resendPaymentRequest,
    filterByStatus,
    filterByPayment,
    changeStatusFilter,
    changePaymentFilter,
    changePaymentMethodFilter,
    changeNeedsReconciliation,
    changeDateFrom,
    changeDateTo,
    changePageSize,
    clearStatsDates,
  };
}

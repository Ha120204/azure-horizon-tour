'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminRealtime } from '@/hooks/admin/useAdminRealtime';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { exportBookingsCsv } from '../_lib/exportCsv';
import {
  canRemindPayment,
  getApiErrorMessage,
  getErrorMessage,
} from '../_lib/helpers';
import type {
  Booking,
  BookingConfirmSource,
  BookingListPayload,
  BookingSavedViewKey,
  Meta,
  PaymentStats,
  Stats,
} from '../_lib/types';

function getConfirmMessage(source: BookingConfirmSource | undefined, bookingCode: string) {
  switch (source) {
    case 'IN_STORE': return `Đã ghi nhận thu tại quầy cho đơn ${bookingCode}`;
    case 'PAYOS_SYNC': return `Đã đồng bộ PayOS — đơn ${bookingCode} đã thanh toán`;
    case 'RECONCILE': return `Đã đối soát thủ công cho đơn ${bookingCode}`;
    case 'REFUND': return `Đã xác nhận hoàn tiền cho đơn ${bookingCode}`;
    default: return `Đã cập nhật đơn ${bookingCode}`;
  }
}

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
  return getDateInputValue(0);
}

function getDateInputValue(offsetDays: number) {
  const today = new Date();
  today.setDate(today.getDate() + offsetDays);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useBookingManagement() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const initialStatus = searchParams.get('status') ?? 'ACTIVE';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [needsReconciliation, setNeedsReconciliation] = useState(false);
  const [needsCustomerCall, setNeedsCustomerCall] = useState(false);
  const [needsPassengerInfo, setNeedsPassengerInfo] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [departureFrom, setDepartureFrom] = useState('');
  const [departureTo, setDepartureTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // SUPER_ADMIN xem read-only: isAdmin vẫn true (layout), canWrite=false để ẩn thao tác
  const [canWrite, setCanWrite] = useState(false);
  // STAFF cũng được ghi nhận thanh toán tại quầy (thu tiền trực tiếp)
  const [canRecordPayment, setCanRecordPayment] = useState(false);
  const [hasFreshData, setHasFreshData] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [isPaymentStatsLoading, setIsPaymentStatsLoading] = useState(true);
  const [paymentStatsError, setPaymentStatsError] = useState('');
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

  useEffect(() => {
    const role = localStorage.getItem('userRole') ?? '';
    setIsAdmin(role === 'ADMIN' || role === 'SUPER_ADMIN');
    setCanWrite(role === 'ADMIN');
    setCanRecordPayment(role === 'ADMIN' || role === 'STAFF');
  }, []);

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
    if (needsCustomerCall) qs.set('needsCustomerCall', 'true');
    if (needsPassengerInfo) qs.set('needsPassengerInfo', 'true');
    if (dateFrom) qs.set('dateFrom', dateFrom);
    if (dateTo) qs.set('dateTo', dateTo);
    if (departureFrom) qs.set('departureFrom', departureFrom);
    if (departureTo) qs.set('departureTo', departureTo);
    Object.entries(overrides).forEach(([key, value]) => qs.set(key, value));
    return qs.toString();
  }, [debouncedSearch, statusFilter, paymentFilter, paymentMethodFilter, needsReconciliation, needsCustomerCall, needsPassengerInfo, dateFrom, dateTo, departureFrom, departureTo]);

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
      departureDate: booking.departureDate,
      latestPaymentRequest: booking.notifications?.[0]
        ? `${booking.notifications[0].id}:${booking.notifications[0].status}`
        : '',
    })),
  }), []);

  const getBookingsPayload = useCallback(async (): Promise<BookingListPayload> => {
    const qs = buildQs({ page: String(page), limit: String(pageSize) });
    const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/all?${qs}`);
    const json = await res.json();
    if (!res.ok) throw new Error(getApiErrorMessage(json, 'Lỗi tải danh sách đặt tour'));
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
      setLoadError('');
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error, 'Lỗi tải danh sách đặt tour'));
    } finally {
      setIsLoading(false);
    }
  }, [buildBookingSignature, getBookingsPayload]);

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
    setIsPaymentStatsLoading(true);
    setPaymentStatsError('');
    try {
      const qs = new URLSearchParams();
      if (statsDateFrom) qs.set('dateFrom', statsDateFrom);
      if (statsDateTo) qs.set('dateTo', statsDateTo);
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/payment-stats?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(getApiErrorMessage(json, 'Không tải được thống kê doanh thu'));
      setPaymentStats(json?.data ?? null);
    } catch (error: unknown) {
      setPaymentStatsError(getErrorMessage(error, 'Không tải được thống kê doanh thu'));
      // Payment stats are supplementary; keep the booking list usable.
    } finally {
      setIsPaymentStatsLoading(false);
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

  // Refresh danh sách và giữ đồng bộ đơn đang mở trong modal chi tiết.
  const refreshDetail = useCallback(async () => {
    const payload = await getBookingsPayload();
    const list = payload.bookings ?? [];
    setBookings(list);
    if (payload.stats) setStats(payload.stats);
    if (payload.meta) setMeta(payload.meta);
    lastBookingSignature.current = buildBookingSignature(payload);
    setSelectedBooking(prev => (prev ? list.find(b => b.id === prev.id) ?? prev : null));
  }, [getBookingsPayload, buildBookingSignature]);
  const shouldRefreshFromRealtime = useCallback((detail: { resourceType: string; href?: string | null }) => (
    detail.resourceType === 'Booking' || detail.href?.startsWith('/admin/bookings') === true
  ), []);

  useAdminRealtime({
    onRefresh: refreshBookingsAndPaymentStats,
    shouldRefresh: shouldRefreshFromRealtime,
  });

  const handleConfirmSuccess = useCallback(async (updated: Booking, source?: BookingConfirmSource) => {
    const successMessage = getConfirmMessage(source, updated.bookingCode);
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
      showToast(successMessage);
    } catch {
      // Backend đã xử lý xong, chỉ là không refetch được danh sách. Không suy đoán
      // số liệu thống kê — chỉ cập nhật đúng đơn vừa thao tác và nhắc người dùng làm mới.
      setBookings(prev => prev.map(booking => booking.id === updated.id ? updated : booking));
      setSelectedBooking(updated);
      setHasFreshData(true);
      showToast(`${successMessage}. Chưa tải lại được danh sách — bấm "Có dữ liệu mới" để cập nhật số liệu.`);
    }
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
    setDebouncedSearch('');
    setStatusFilter('ACTIVE');
    setPaymentFilter('');
    setPaymentMethodFilter('');
    setNeedsReconciliation(false);
    setNeedsCustomerCall(false);
    setNeedsPassengerInfo(false);
    setDateFrom('');
    setDateTo('');
    setDepartureFrom('');
    setDepartureTo('');
    setPage(1);
  }, []);

  const applySavedView = useCallback((view: BookingSavedViewKey) => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ACTIVE');
    setPaymentFilter('');
    setPaymentMethodFilter('');
    setNeedsReconciliation(false);
    setNeedsCustomerCall(false);
    setNeedsPassengerInfo(false);
    setDateFrom('');
    setDateTo('');
    setDepartureFrom('');
    setDepartureTo('');

    if (view === 'pending') setStatusFilter('PENDING');
    if (view === 'unpaid') setPaymentFilter('UNPAID');
    if (view === 'upcoming') {
      setDepartureFrom(getDateInputValue(0));
      setDepartureTo(getDateInputValue(7));
    }
    if (view === 'cancelled') setStatusFilter('CANCELLED');
    if (view === 'needsCall') setNeedsCustomerCall(true);
    if (view === 'needsPassengerInfo') setNeedsPassengerInfo(true);
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

  const bulkResendPaymentRequests = useCallback(async (targets: Booking[]) => {
    const eligibleBookings = targets.filter(canRemindPayment);

    if (eligibleBookings.length === 0) {
      showToast('Không có đơn PayOS chờ thanh toán trong danh sách đã chọn', false);
      return;
    }

    const results = await Promise.allSettled(
      eligibleBookings.map(async (booking) => {
        const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/resend-payment-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceEmail: false }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(getApiErrorMessage(json, `Không gửi được ${booking.bookingCode}`));
        return booking.bookingCode;
      }),
    );

    await fetchBookings();

    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failedCount = results.length - successCount;
    if (failedCount > 0) {
      showToast(`Đã nhắc ${successCount}/${results.length} đơn, ${failedCount} đơn lỗi`, false);
      return;
    }
    showToast(`Đã nhắc thanh toán ${successCount} đơn`);
  }, [fetchBookings, showToast]);

  const cancelBooking = useCallback(async (booking: Booking, reason: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(getApiErrorMessage(json, 'Không hủy được booking'));
      await fetchBookings();
      await fetchPaymentStats();
      showToast(`Đã hủy đơn ${booking.bookingCode}`);
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Không hủy được booking'), false);
      // Đơn có thể đã bị hủy bởi cron (hết hạn giữ chỗ) hoặc luồng khác — refresh để
      // danh sách phản ánh đúng trạng thái thật thay vì kẹt ở trạng thái cũ.
      await fetchBookings().catch(() => {});
      throw error;
    }
  }, [fetchBookings, fetchPaymentStats, showToast]);

  const saveBookingNote = useCallback(async (booking: Booking, note: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(getApiErrorMessage(json, 'Không lưu được ghi chú'));
      setBookings(prev => prev.map(item => item.id === booking.id ? { ...item, adminNote: note.trim() } : item));
      showToast(`Đã lưu ghi chú cho ${booking.bookingCode}`);
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Không lưu được ghi chú'), false);
      throw error;
    }
  }, [showToast]);

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

  const hasFilter = !!(search || (statusFilter && statusFilter !== 'ACTIVE') || paymentFilter || paymentMethodFilter || needsReconciliation || needsCustomerCall || needsPassengerInfo || dateFrom || dateTo || departureFrom || departureTo);
  const activeSavedView: BookingSavedViewKey | null = (() => {
    const noSearch = !search && !debouncedSearch;
    const noCreatedDate = !dateFrom && !dateTo;
    const noPaymentMethod = !paymentMethodFilter;
    const noSpecialFlags = !needsReconciliation && !needsCustomerCall && !needsPassengerInfo;
    const noDeparture = !departureFrom && !departureTo;
    if (noSearch && noCreatedDate && noPaymentMethod && noSpecialFlags && noDeparture && statusFilter === 'ACTIVE' && !paymentFilter) return 'all';
    if (noSearch && noCreatedDate && noPaymentMethod && noSpecialFlags && noDeparture && statusFilter === 'PENDING' && !paymentFilter) return 'pending';
    if (noSearch && noCreatedDate && noPaymentMethod && noSpecialFlags && noDeparture && statusFilter === 'ACTIVE' && paymentFilter === 'UNPAID') return 'unpaid';
    if (noSearch && noCreatedDate && noPaymentMethod && noSpecialFlags && statusFilter === 'ACTIVE' && !paymentFilter && departureFrom === getDateInputValue(0) && departureTo === getDateInputValue(7)) return 'upcoming';
    if (noSearch && noCreatedDate && noPaymentMethod && noSpecialFlags && noDeparture && statusFilter === 'CANCELLED' && !paymentFilter) return 'cancelled';
    if (noSearch && noCreatedDate && noPaymentMethod && needsCustomerCall && !needsReconciliation && !needsPassengerInfo && noDeparture && statusFilter === 'ACTIVE' && !paymentFilter) return 'needsCall';
    if (noSearch && noCreatedDate && noPaymentMethod && needsPassengerInfo && !needsReconciliation && !needsCustomerCall && noDeparture && statusFilter === 'ACTIVE' && !paymentFilter) return 'needsPassengerInfo';
    return null;
  })();

  return {
    bookings,
    stats,
    meta,
    isLoading,
    loadError,
    isExporting,
    search,
    statusFilter,
    paymentFilter,
    paymentMethodFilter,
    needsReconciliation,
    needsCustomerCall,
    needsPassengerInfo,
    dateFrom,
    dateTo,
    departureFrom,
    departureTo,
    pageSize,
    selectedBooking,
    toast,
    isAdmin,
    canWrite,
    canRecordPayment,
    hasFreshData,
    lastSyncedAt,
    paymentStats,
    isPaymentStatsLoading,
    paymentStatsError,
    statsDateFrom,
    statsDateTo,
    defaultStatsDateTo,
    hasFilter,
    activeSavedView,
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
    applySavedView,
    refreshDetail,
    copyPaymentRequest,
    resendPaymentRequest,
    bulkResendPaymentRequests,
    cancelBooking,
    saveBookingNote,
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

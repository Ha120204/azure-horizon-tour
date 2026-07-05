'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import AdminPagination from '@/components/admin/AdminPagination';
import { SkeletonRow } from './SkeletonRow';
import {
  AVATAR_COLORS,
  PAYMENT_METHOD_CFG,
  PAY_CFG,
  STATUS_CFG,
} from '../_lib/config';
import { exportSelectedBookingsCsv } from '../_lib/exportCsv';
import { canRemindPayment, copyPhone, fmt, fmtDate, fmtDateTime, getInitials, toTelHref, toZaloPhone } from '../_lib/helpers';
import type { Booking, Meta } from '../_lib/types';

interface BookingTableProps {
  bookings: Booking[];
  isLoading: boolean;
  loadError: string;
  onRetry: () => void;
  hasFilter: boolean;
  statusFilter: string;
  canWrite: boolean;
  canRecordPayment?: boolean;
  meta: Meta;
  pageSize: number;
  onOpenBooking: (booking: Booking) => void;
  onResetFilters: () => void;
  onCopyPaymentRequest: (booking: Booking) => void;
  onResendPaymentRequest: (booking: Booking) => void;
  onBulkResendPaymentRequests: (bookings: Booking[]) => Promise<void>;
  onCancelBooking: (booking: Booking, reason: string) => void | Promise<void>;
  onSaveBookingNote: (booking: Booking, note: string) => void | Promise<void>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export function BookingTable({
  bookings,
  isLoading,
  loadError,
  onRetry,
  hasFilter,
  statusFilter,
  canWrite,
  canRecordPayment,
  meta,
  pageSize,
  onOpenBooking,
  onResetFilters,
  onCopyPaymentRequest,
  onResendPaymentRequest,
  onBulkResendPaymentRequests,
  onCancelBooking,
  onSaveBookingNote,
  onPageChange,
  onPageSizeChange,
  showToast,
}: BookingTableProps) {
  const [noteTarget, setNoteTarget] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkReminding, setIsBulkReminding] = useState(false);
  const selectedBookings = bookings.filter(booking => selectedIds.has(booking.id));
  const payableSelectedBookings = selectedBookings.filter(canRemindPayment);
  const selectedCount = selectedBookings.length;
  const allCurrentPageSelected = bookings.length > 0 && bookings.every(booking => selectedIds.has(booking.id));

  useEffect(() => {
    const currentIds = new Set(bookings.map(booking => booking.id));
    setSelectedIds(prev => new Set([...prev].filter(id => currentIds.has(id))));
  }, [bookings]);

  const toggleSelected = (bookingId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  };

  const toggleCurrentPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allCurrentPageSelected) bookings.forEach(booking => next.delete(booking.id));
      else bookings.forEach(booking => next.add(booking.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkRemind = async () => {
    if (payableSelectedBookings.length === 0) return;
    setIsBulkReminding(true);
    try {
      await onBulkResendPaymentRequests(payableSelectedBookings);
      clearSelection();
    } finally {
      setIsBulkReminding(false);
    }
  };

  const handleExportSelected = () => {
    const exportedCount = exportSelectedBookingsCsv(selectedBookings);
    if (exportedCount === 0) {
      showToast('Chưa có đơn nào để xuất.', false);
      return;
    }
    showToast(`Đã xuất ${exportedCount} đơn ra CSV.`);
  };

  return (
    <>
      <div id="bookings-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
      {loadError && bookings.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-error/20 bg-error/5 px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-error">
            <span className="material-symbols-outlined text-[18px]">cloud_off</span>
            Không cập nhật được dữ liệu mới nhất — đang hiển thị dữ liệu trước đó.
          </p>
          <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-xl border border-error/30 px-3 py-1.5 text-xs font-bold text-error hover:bg-error/10 outline-none">
            <span className="material-symbols-outlined text-[15px]">refresh</span>
            Thử lại
          </button>
        </div>
      )}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/10 bg-primary/5 px-5 py-3">
          <div>
            <p className="text-sm font-bold text-on-surface">Đã chọn {selectedCount} đơn</p>
            <p className="text-xs text-on-surface-variant">{payableSelectedBookings.length} đơn có thể nhắc thanh toán PayOS</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportSelected}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/20 bg-white px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Xuất CSV ({selectedCount})
            </button>
            <button
              type="button"
              onClick={handleBulkRemind}
              disabled={payableSelectedBookings.length === 0 || isBulkReminding}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${isBulkReminding ? 'animate-spin' : ''}`}>
                {isBulkReminding ? 'progress_activity' : 'notifications_active'}
              </span>
              {isBulkReminding ? 'Đang gửi...' : 'Nhắc thanh toán'}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl border border-outline-variant/20 px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
              <th className="w-11 py-3.5 pl-5 pr-2">
                {canWrite && (
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    disabled={bookings.length === 0 || isLoading}
                    onChange={toggleCurrentPage}
                    className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                    aria-label="Chọn tất cả đơn trên trang hiện tại"
                  />
                )}
              </th>
              {(() => {
                const baseHeaders = ['Mã Đặt Tour', 'Khách Hàng', 'Tour', 'Giá Trị', 'Trạng Thái', 'Phương Thức'];
                const tailHeaders = statusFilter === 'CANCELLED'
                  ? ['Tiền Đã Hoàn', 'Ngày Hoàn', 'Thao Tác']
                  : ['Thanh Toán', 'Ngày Đặt', 'Thao Tác'];
                const allHeaders = [...baseHeaders, ...tailHeaders];
                return allHeaders.map((header, index) => (
                  <th key={header} className={`py-3.5 px-5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${index === allHeaders.length - 1 ? 'w-[168px] text-right' : ''}`}>{header}</th>
                ));
              })()}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : loadError && bookings.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-24 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-3xl text-error">cloud_off</span>
                    </div>
                    <p className="font-bold text-on-surface">Không tải được danh sách đơn đặt tour</p>
                    <p className="text-sm text-on-surface-variant mt-1 max-w-md whitespace-pre-line">{loadError}</p>
                    <button onClick={onRetry} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      Thử lại
                    </button>
                  </div>
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-24 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-3xl text-outline">receipt_long</span>
                    </div>
                    <p className="font-bold text-on-surface">Không tìm thấy đơn đặt tour nào</p>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {hasFilter ? 'Thử thay đổi bộ lọc để hiển thị kết quả.' : 'Chưa có đơn đặt tour nào trong hệ thống.'}
                    </p>
                    {hasFilter && (
                      <button onClick={onResetFilters} className="mt-4 text-sm text-primary font-semibold hover:underline outline-none">
                        Xóa tất cả bộ lọc
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map(booking => (
                <BookingTableRow
                  key={booking.id}
                  booking={booking}
                  statusFilter={statusFilter}
                  canWrite={canWrite}
                  canRecordPayment={canRecordPayment}
                  onOpenBooking={onOpenBooking}
                  onCopyPaymentRequest={onCopyPaymentRequest}
                  onResendPaymentRequest={onResendPaymentRequest}
                  isSelected={selectedIds.has(booking.id)}
                  onToggleSelected={toggleSelected}
                  onOpenNote={setNoteTarget}
                  onOpenCancel={setCancelTarget}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="py-3 px-6 border-t border-outline-variant/10 bg-surface-container-lowest">
        <AdminPagination
          currentPage={meta.currentPage}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel="đơn"
        />
      </div>
      </div>

      {noteTarget && (
        <BookingNoteDialog
          booking={noteTarget}
          onClose={() => setNoteTarget(null)}
          onSave={async (booking, note) => {
            await onSaveBookingNote(booking, note);
            setNoteTarget(null);
          }}
        />
      )}

      {cancelTarget && (
        <BookingCancelDialog
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancel={async (booking, reason) => {
            await onCancelBooking(booking, reason);
            setCancelTarget(null);
          }}
        />
      )}
    </>
  );
}

interface BookingTableRowProps {
  booking: Booking;
  statusFilter: string;
  canWrite: boolean;
  canRecordPayment?: boolean;
  onOpenBooking: (booking: Booking) => void;
  onCopyPaymentRequest: (booking: Booking) => void;
  onResendPaymentRequest: (booking: Booking) => void;
  isSelected: boolean;
  onToggleSelected: (bookingId: number) => void;
  onOpenNote: (booking: Booking) => void;
  onOpenCancel: (booking: Booking) => void;
}

function BookingTableRow({
  booking,
  statusFilter,
  canWrite,
  canRecordPayment,
  onOpenBooking,
  onCopyPaymentRequest,
  onResendPaymentRequest,
  isSelected,
  onToggleSelected,
  onOpenNote,
  onOpenCancel,
}: BookingTableRowProps) {
  const statusConfig = STATUS_CFG[booking.status] ?? STATUS_CFG.PENDING;
  const paymentConfig = PAY_CFG[booking.paymentStatus] ?? PAY_CFG.UNPAID;
  // Chỉ cảnh báo thiếu thông tin HK trên đơn đã thanh toán (đáng quan tâm để đôn đốc).
  const incompletePassengerInfo = booking.paymentStatus === 'PAID' ? (booking.incompletePassengerCount ?? 0) : 0;
  const colorIndex = booking.user.id % AVATAR_COLORS.length;
  const isPending = booking.status === 'PENDING';
  const effectiveCanRecordPayment = canRecordPayment ?? canWrite;
  const latestPaymentRequest = booking.paymentMethod === 'PAYOS' && booking.paymentStatus !== 'PAID'
    ? booking.notifications?.[0]
    : undefined;
  const contactPhone = booking.contactPhone ?? booking.user.phone ?? '';
  const telHref = toTelHref(contactPhone);
  const zaloPhone = toZaloPhone(contactPhone);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  // Menu mở qua portal + fixed để không bị overflow của bảng cắt mất khi danh sách ngắn.
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const openActionMenu = () => {
    const rect = actionMenuRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openUpward = window.innerHeight - rect.bottom < 300;
    setMenuPos({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.right - 208,
      up: openUpward,
    });
    setIsActionMenuOpen(true);
  };

  useEffect(() => {
    if (!isActionMenuOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!actionMenuRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsActionMenuOpen(false);
      }
    };
    const close = () => setIsActionMenuOpen(false);

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isActionMenuOpen]);

  return (
    <tr
      className={`hover:bg-primary/[0.025] transition-colors group cursor-pointer ${isPending ? 'border-l-2 border-amber-400' : ''} ${isSelected ? 'bg-primary/[0.035]' : ''}`}
      onClick={() => onOpenBooking(booking)}
    >
      <td className="py-4 pl-5 pr-2" onClick={event => event.stopPropagation()}>
        {canWrite && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelected(booking.id)}
            className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
            aria-label={`Chọn đơn ${booking.bookingCode}`}
          />
        )}
      </td>
      <td className="py-4 px-5">
        <span className="font-mono text-sm font-bold text-primary">{booking.bookingCode}</span>
        {booking.voucherCode && (
          <div className="flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-emerald-500 text-[12px]">local_activity</span>
            <span className="text-[10px] font-mono text-emerald-600 font-bold">{booking.voucherCode}</span>
          </div>
        )}
      </td>

      <td className="py-4 px-5">
        <div className="flex items-center gap-3 min-w-0">
          {booking.user.avatarUrl ? (
            <Image
              src={booking.user.avatarUrl}
              alt={booking.user.fullName}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-outline-variant/10"
            />
          ) : (
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIndex]} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
              {getInitials(booking.user.fullName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate max-w-[140px] group-hover:text-primary transition-colors">{booking.user.fullName}</p>
            <p className="text-xs text-on-surface-variant/60 truncate max-w-[140px]">{booking.user.email}</p>
          </div>
        </div>
      </td>

      <td className="py-4 px-5">
        {booking.tour ? (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate max-w-[180px]">{booking.tour.name}</p>
            {booking.tour.destination && (
              <p className="text-xs text-on-surface-variant/60 flex items-center gap-0.5 mt-0.5">
                <span className="material-symbols-outlined text-[12px]">location_on</span>
                {booking.tour.destination.name}
              </p>
            )}
            {booking.departureDate && (
              <p className="text-xs text-on-surface-variant/60 flex items-center gap-0.5 mt-0.5">
                <span className="material-symbols-outlined text-[12px]">event</span>
                Khởi hành {fmtDate(booking.departureDate)}
              </p>
            )}
          </div>
        ) : <span className="text-on-surface-variant/40 text-sm">—</span>}
      </td>

      <td className="py-4 px-5 whitespace-nowrap">
        <p className="font-bold text-on-surface text-sm">{fmt(booking.totalPrice)}</p>
        <p className="text-xs text-on-surface-variant/60 mt-0.5">{booking.numberOfPeople} người · {fmt(booking.unitPriceAtBooking)}/ng</p>
        {booking.discountAmount > 0 && (
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">-{fmt(booking.discountAmount)}</p>
        )}
      </td>

      <td className="py-4 px-5">
        <div className="flex flex-col items-start gap-1.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${statusConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
          {incompletePassengerInfo > 0 && (
            <span
              title="Đơn còn thiếu thông tin hành khách — cần đôn đốc/điền hộ trước khởi hành"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${booking.passengerInfoOverdue ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}
            >
              <span className="material-symbols-outlined text-[12px]">badge</span>
              Thiếu {incompletePassengerInfo} HK
            </span>
          )}
          {booking.staffAssistRequested && (
            <span
              title="Khách yêu cầu nhân viên hỗ trợ nhập thông tin hành khách"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 border-rose-200 text-rose-700"
            >
              <span className="material-symbols-outlined text-[12px]">support_agent</span>
              Nhờ NV nhập hộ
            </span>
          )}
          {incompletePassengerInfo > 0 && booking.passengerReminderSentAt && (
            <span
              title={`Đã gửi email nhắc khách lúc ${fmtDateTime(booking.passengerReminderSentAt)}`}
              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600"
            >
              <span className="material-symbols-outlined text-[12px]">mark_email_read</span>
              Đã nhắc
            </span>
          )}
        </div>
      </td>

      <td className="py-4 px-5">
        {(() => {
          const methodConfig = PAYMENT_METHOD_CFG[booking.paymentMethod];
          if (!methodConfig) return <span className="text-on-surface-variant/40 text-sm">—</span>;
          return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${methodConfig.badge}`}>
              <span className="material-symbols-outlined text-[12px]">{methodConfig.icon}</span>
              {methodConfig.label}
            </span>
          );
        })()}
      </td>

      {statusFilter === 'CANCELLED' ? (
        <td className="py-4 px-5">
          {booking.refundAmount != null && booking.refundAmount > 0 ? (
            <div>
              <span className="font-bold text-emerald-600 text-sm">{fmt(booking.refundAmount)}</span>
              {booking.refundedAt && (
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
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${paymentConfig.badge}`}>
              <span className="material-symbols-outlined text-[12px]">{paymentConfig.icon}</span>
              {paymentConfig.label}
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

      {statusFilter === 'CANCELLED' ? (
        <td className="py-4 px-5 text-sm text-on-surface-variant whitespace-nowrap">
          {booking.refundedAt ? fmtDate(booking.refundedAt) : <span className="text-on-surface-variant/40 text-sm">—</span>}
        </td>
      ) : (
        <td className="py-4 px-5 text-sm text-on-surface-variant whitespace-nowrap">
          {fmtDate(booking.createdAt)}
        </td>
      )}

      <td className="w-[168px] min-w-[168px] py-4 pl-3 pr-5 text-right" onClick={e => e.stopPropagation()}>
        <div ref={actionMenuRef} className="relative inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
          <button
            onClick={() => onOpenBooking(booking)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant/20 bg-white px-3 text-xs font-bold text-on-surface-variant outline-none transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Xem chi tiết ${booking.bookingCode}`}
          >
            <span className="material-symbols-outlined text-[15px]">visibility</span>
            Xem
          </button>
          {telHref && (
            <span className="group/tip relative inline-flex">
              <a
                href={`tel:${telHref}`}
                onClick={() => copyPhone(contactPhone)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 outline-none transition-colors hover:bg-sky-100 focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Gọi khách ${booking.bookingCode}`}
              >
                <span className="material-symbols-outlined text-[14px]">call</span>
              </a>
              <span className="pointer-events-none absolute -top-8 right-0 z-[120] whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100">
                Gọi khách
                <span className="absolute right-3 top-full border-4 border-transparent border-t-on-surface" />
              </span>
            </span>
          )}
          <span className="group/tip relative inline-flex">
            <button
              type="button"
              onClick={() => (isActionMenuOpen ? setIsActionMenuOpen(false) : openActionMenu())}
              aria-haspopup="menu"
              aria-expanded={isActionMenuOpen}
              aria-label={`Mở thêm thao tác cho ${booking.bookingCode}`}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                isActionMenuOpen
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-outline-variant/20 bg-white text-on-surface-variant hover:border-primary/30 hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
            {!isActionMenuOpen && (
              <span className="pointer-events-none absolute -top-8 right-0 z-[120] whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100">
                Thêm thao tác
                <span className="absolute right-3 top-full border-4 border-transparent border-t-on-surface" />
              </span>
            )}
          </span>

          {isActionMenuOpen && menuPos && createPortal(
            <div
              ref={menuRef}
              role="menu"
              onClick={event => event.stopPropagation()}
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                transform: menuPos.up ? 'translateY(-100%)' : undefined,
              }}
              className="z-[80] w-52 overflow-hidden rounded-2xl border border-outline-variant/15 bg-white p-1.5 text-left shadow-2xl shadow-slate-900/12"
            >
              {isPending && canWrite && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onOpenBooking(booking);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  Xác nhận thủ công
                </button>
              )}
              {isPending && booking.paymentStatus === 'UNPAID' && booking.paymentMethod === 'PAYOS' && latestPaymentRequest?.content && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onCopyPaymentRequest(booking);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  Copy thanh toán
                </button>
              )}
              {isPending && booking.paymentStatus === 'UNPAID' && booking.paymentMethod === 'PAYOS' && effectiveCanRecordPayment && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onResendPaymentRequest(booking);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
                >
                  <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                  Nhắc thanh toán
                </button>
              )}
              {zaloPhone && (
                <a
                  role="menuitem"
                  href={`https://zalo.me/${zaloPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsActionMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50"
                  aria-label={`Mở Zalo khách ${booking.bookingCode}`}
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  Mở Zalo
                </a>
              )}
              {effectiveCanRecordPayment && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onOpenNote(booking);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                    booking.adminNote
                      ? 'text-amber-700 hover:bg-amber-50'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-label={`Ghi chú nội bộ ${booking.bookingCode}`}
                >
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  {booking.adminNote ? 'Sửa ghi chú' : 'Thêm ghi chú'}
                </button>
              )}
              {booking.status !== 'CANCELLED' && canWrite && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onOpenCancel(booking);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-50"
                  aria-label={`Hủy đơn ${booking.bookingCode}`}
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Hủy đơn
                </button>
              )}
            </div>,
            document.body
          )}
        </div>
      </td>
    </tr>
  );
}

interface BookingNoteDialogProps {
  booking: Booking;
  onClose: () => void;
  onSave: (booking: Booking, note: string) => void | Promise<void>;
}

function BookingNoteDialog({ booking, onClose, onSave }: BookingNoteDialogProps) {
  const [note, setNote] = useState(booking.adminNote ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(booking, note);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl border border-outline-variant/20"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-on-surface">Ghi chú nội bộ</p>
            <p className="mt-1 text-xs text-on-surface-variant">{booking.bookingCode} · {booking.user.fullName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container outline-none"
            aria-label="Đóng ghi chú"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={5}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="Ví dụ: khách cần gọi lại trước ngày khởi hành, ưu tiên ghế đầu..."
          />
          <p className="mt-2 text-right text-[11px] text-on-surface-variant/70">{note.length}/1000</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-variant/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-outline-variant/20 px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu ghi chú'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface BookingCancelDialogProps {
  booking: Booking;
  onClose: () => void;
  onCancel: (booking: Booking, reason: string) => void | Promise<void>;
}

function BookingCancelDialog({ booking, onClose, onCancel }: BookingCancelDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10) {
      setError('Lý do hủy cần ít nhất 10 ký tự.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onCancel(booking, trimmedReason);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl border border-red-200"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-red-700">Hủy đơn đặt tour</p>
            <p className="mt-1 text-xs text-on-surface-variant">{booking.bookingCode} · {booking.user.fullName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container outline-none"
            aria-label="Đóng hủy đơn"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Hệ thống sẽ chuyển đơn sang đã hủy, giải phóng số chỗ và hủy link PayOS nếu đơn chưa thanh toán.
          </div>
          <textarea
            value={reason}
            onChange={event => {
              setReason(event.target.value);
              if (error) setError('');
            }}
            rows={4}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
            placeholder="Nhập lý do hủy để lưu lịch sử xử lý..."
          />
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-variant/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-outline-variant/20 px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Đang hủy...' : 'Xác nhận hủy'}
          </button>
        </div>
      </div>
    </div>
  );
}

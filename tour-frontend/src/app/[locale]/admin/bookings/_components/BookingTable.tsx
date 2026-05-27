'use client';

import Image from 'next/image';
import AdminPagination from '@/components/admin/AdminPagination';
import { SkeletonRow } from './SkeletonRow';
import {
  AVATAR_COLORS,
  PAYMENT_METHOD_CFG,
  PAY_CFG,
  STATUS_CFG,
} from '../_lib/config';
import { fmt, fmtDate, getInitials } from '../_lib/helpers';
import type { Booking, Meta } from '../_lib/types';

interface BookingTableProps {
  bookings: Booking[];
  isLoading: boolean;
  hasFilter: boolean;
  statusFilter: string;
  meta: Meta;
  pageSize: number;
  onOpenBooking: (booking: Booking) => void;
  onResetFilters: () => void;
  onCopyPaymentRequest: (booking: Booking) => void;
  onResendPaymentRequest: (booking: Booking) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function BookingTable({
  bookings,
  isLoading,
  hasFilter,
  statusFilter,
  meta,
  pageSize,
  onOpenBooking,
  onResetFilters,
  onCopyPaymentRequest,
  onResendPaymentRequest,
  onPageChange,
  onPageSizeChange,
}: BookingTableProps) {
  return (
    <div id="bookings-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
              {(() => {
                const baseHeaders = ['Mã Đặt Tour', 'Khách Hàng', 'Tour', 'Giá Trị', 'Trạng Thái', 'Phương Thức'];
                const tailHeaders = statusFilter === 'CANCELLED'
                  ? ['Tiền Đã Hoàn', 'Ngày Hoàn', 'Thao Tác']
                  : ['Thanh Toán', 'Ngày Đặt', 'Thao Tác'];
                const allHeaders = [...baseHeaders, ...tailHeaders];
                return allHeaders.map((header, index) => (
                  <th key={header} className={`py-3.5 px-5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${index === 7 ? 'text-right' : ''}`}>{header}</th>
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
                  onOpenBooking={onOpenBooking}
                  onCopyPaymentRequest={onCopyPaymentRequest}
                  onResendPaymentRequest={onResendPaymentRequest}
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
  );
}

interface BookingTableRowProps {
  booking: Booking;
  statusFilter: string;
  onOpenBooking: (booking: Booking) => void;
  onCopyPaymentRequest: (booking: Booking) => void;
  onResendPaymentRequest: (booking: Booking) => void;
}

function BookingTableRow({
  booking,
  statusFilter,
  onOpenBooking,
  onCopyPaymentRequest,
  onResendPaymentRequest,
}: BookingTableRowProps) {
  const statusConfig = STATUS_CFG[booking.status] ?? STATUS_CFG.PENDING;
  const paymentConfig = PAY_CFG[booking.paymentStatus] ?? PAY_CFG.UNPAID;
  const colorIndex = booking.user.id % AVATAR_COLORS.length;
  const isPending = booking.status === 'PENDING';
  const latestPaymentRequest = booking.paymentMethod === 'PAYOS' && booking.paymentStatus !== 'PAID'
    ? booking.notifications?.[0]
    : undefined;

  return (
    <tr
      className={`hover:bg-primary/[0.025] transition-colors group cursor-pointer ${isPending ? 'border-l-2 border-amber-400' : ''}`}
      onClick={() => onOpenBooking(booking)}
    >
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
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${statusConfig.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dot}`} />
          {statusConfig.label}
        </span>
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

      <td className="py-4 px-5 text-right" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
          {isPending && (
            <button
              onClick={() => onOpenBooking(booking)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors outline-none"
              aria-label="Xác nhận thủ công"
            >
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              Xác nhận
            </button>
          )}
          {isPending && booking.paymentStatus === 'UNPAID' && booking.paymentMethod === 'PAYOS' && latestPaymentRequest?.content && (
            <button
              onClick={() => onCopyPaymentRequest(booking)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors outline-none"
              aria-label={`Copy noi dung thanh toan ${booking.bookingCode}`}
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
              Copy
            </button>
          )}
          {isPending && booking.paymentStatus === 'UNPAID' && booking.paymentMethod === 'PAYOS' && (
            <button
              onClick={() => onResendPaymentRequest(booking)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors outline-none"
              aria-label={`Tao lai yeu cau thanh toan ${booking.bookingCode}`}
            >
              <span className="material-symbols-outlined text-[14px]">send</span>
              Gửi lại
            </button>
          )}
          <button
            onClick={() => onOpenBooking(booking)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Xem chi tiết ${booking.bookingCode}`}
          >
            <span className="material-symbols-outlined text-[15px]">visibility</span>
            Chi tiết
          </button>
        </div>
      </td>
    </tr>
  );
}

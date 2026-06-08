import Image from 'next/image';
import type { VoucherAnalytics } from './types';
import { formatCurrency, formatDateTime, getInitials, bookingStatusLabels, paymentStatusLabels } from './utils';

export default function VoucherBookingsCard({ analytics }: { analytics: VoucherAnalytics }) {
  return (
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
  );
}

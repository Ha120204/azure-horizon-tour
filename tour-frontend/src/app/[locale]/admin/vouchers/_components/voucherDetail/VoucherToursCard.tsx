import Image from 'next/image';
import type { VoucherAnalytics } from './types';
import { formatCurrency } from './utils';

export default function VoucherToursCard({ analytics }: { analytics: VoucherAnalytics }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">leaderboard</span>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Top Tour Dùng Voucher</p>
        </div>
        <span className="text-[11px] font-bold text-gray-400">Top {analytics.topTours.length}</span>
      </div>

      {analytics.topTours.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-semibold text-gray-500">Chưa có booking đã thanh toán dùng mã này</p>
          <p className="text-xs text-gray-400 mt-1">Top tour sẽ xuất hiện khi voucher tạo doanh thu thực tế.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {analytics.topTours.map((tour, index) => (
            <li key={tour.tourId} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                {tour.imageUrl ? (
                  <Image src={tour.imageUrl} alt={tour.tourName} width={40} height={40} sizes="40px" className="h-full w-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-slate-400 text-xl" aria-hidden="true">map</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">
                  <span className="text-gray-400 mr-1">#{index + 1}</span>{tour.tourName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {tour.bookingCount.toLocaleString('vi-VN')} booking · Giảm {formatCurrency(tour.totalDiscount)}
                </p>
              </div>
              <p className="text-xs font-extrabold text-emerald-700 shrink-0">{formatCurrency(tour.totalRevenue)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

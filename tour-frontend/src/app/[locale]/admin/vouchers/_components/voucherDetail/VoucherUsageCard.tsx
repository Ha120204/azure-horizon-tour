import type { VoucherAnalytics } from './types';
import { formatCurrency } from './utils';

export default function VoucherUsageCard({
  usedCount,
  maxUses,
  isUnlimited,
  usageRatio,
  savedCount,
  progressColor,
  analytics,
}: {
  usedCount: number;
  maxUses: number;
  isUnlimited: boolean;
  usageRatio: number;
  savedCount: number;
  progressColor: string;
  analytics?: VoucherAnalytics;
}) {
  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">bar_chart</span>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Thống Kê Sử Dụng</p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
          {[
            { value: usedCount.toLocaleString('vi-VN'), label: 'Đã dùng', icon: 'check_circle', color: '#1565C0', bg: '#EFF6FF' },
            { value: isUnlimited ? '∞' : maxUses.toLocaleString('vi-VN'), label: 'Tổng lượt', icon: 'confirmation_number', color: '#374151', bg: '#F9FAFB' },
            { value: savedCount.toLocaleString('vi-VN'), label: 'Đã lưu ví', icon: 'bookmark', color: '#7C3AED', bg: '#F5F3FF' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center py-4 px-2 gap-1.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1" style={{ background: item.bg }}>
                <span className="material-symbols-outlined text-[17px]" style={{ color: item.color, fontVariationSettings: "'FILL' 1" }} aria-hidden="true">{item.icon}</span>
              </div>
              <p className="text-2xl font-extrabold leading-none" style={{ color: item.color }}>{item.value}</p>
              <p className="text-[11px] text-gray-400 font-medium">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 pt-3 border-t border-gray-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-500">Tỉ lệ sử dụng</span>
            <span className="text-xs font-bold text-gray-700">
              {isUnlimited ? `${usedCount} lượt` : `${Math.round(usageRatio * 100)}%`}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden bg-gray-200">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max(usageRatio * 100, usedCount > 0 ? 3 : 0)}%`,
                background: `linear-gradient(90deg, ${progressColor}aa, ${progressColor})`,
              }}
            />
          </div>
          {!isUnlimited && (
            <p className="text-[10px] text-gray-400 mt-1.5 text-right">
              Còn lại: <strong className="text-gray-600">{Math.max(0, maxUses - usedCount).toLocaleString('vi-VN')}</strong> lượt
            </p>
          )}
        </div>
      </div>

      {analytics && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">query_stats</span>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Hiệu Quả Voucher</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500">Toàn thời gian</span>
          </div>

          <div className="grid grid-cols-2 gap-px bg-gray-100">
            {[
              {
                label: 'Booking dùng mã',
                value: analytics.totalBookings.toLocaleString('vi-VN'),
                icon: 'receipt_long',
                color: '#1565C0',
                note: `${analytics.paidBookings.toLocaleString('vi-VN')} đã thanh toán`,
              },
              { label: 'Doanh thu liên quan', value: formatCurrency(analytics.totalRevenue), icon: 'trending_up', color: '#059669', note: 'Chỉ booking PAID' },
              { label: 'Tổng tiền giảm', value: formatCurrency(analytics.totalDiscount), icon: 'price_check', color: '#dc2626', note: 'Đã cấp cho booking PAID' },
              { label: 'AOV', value: formatCurrency(analytics.averageOrderValue), icon: 'shopping_cart_checkout', color: '#7C3AED', note: 'Doanh thu / booking PAID' },
            ].map((item) => (
              <div key={item.label} className="bg-white px-4 py-3 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[16px]" style={{ color: item.color }} aria-hidden="true">{item.icon}</span>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{item.label}</p>
                </div>
                <p className="text-base font-extrabold text-gray-900 truncate">{item.value}</p>
                <p className="text-[10px] text-gray-400 mt-1 truncate">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

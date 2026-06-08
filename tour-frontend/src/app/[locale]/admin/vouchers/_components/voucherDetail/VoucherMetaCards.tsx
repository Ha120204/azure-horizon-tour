import type { VoucherDetail } from './types';
import { formatDate, formatCurrency, isNeverExpires, formatIdList, formatSegments } from './utils';

export default function VoucherMetaCards({ data }: { data: VoucherDetail }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: 'event',
            label: 'Hết hạn',
            value: isNeverExpires(data.expiresAt) ? 'Không giới hạn' : formatDate(data.expiresAt),
            iconColor: '#dc2626',
            iconBg: '#FEF2F2',
            isInfinite: isNeverExpires(data.expiresAt),
          },
          {
            icon: 'calendar_add_on',
            label: 'Ngày tạo',
            value: formatDate(data.createdAt),
            iconColor: '#1565C0',
            iconBg: '#EFF6FF',
            isInfinite: false,
          },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: item.iconBg }}>
                <span className="material-symbols-outlined text-[15px]" style={{ color: item.iconColor }} aria-hidden="true">{item.icon}</span>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
            </div>
            <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
              {item.isInfinite && (
                <span className="material-symbols-outlined text-base text-gray-400" aria-hidden="true">all_inclusive</span>
              )}
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">rule_settings</span>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Điều Kiện Áp Dụng</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
          {[
            { label: 'Bắt đầu', value: formatDate(data.startsAt) },
            {
              label: 'Trần giảm',
              value: data.discountType === 'PERCENTAGE' && data.maxDiscountAmount
                ? formatCurrency(data.maxDiscountAmount)
                : 'Không giới hạn',
            },
            {
              label: 'Mỗi khách',
              value: data.usageLimitPerUser ? `${data.usageLimitPerUser} lần` : 'Không giới hạn',
            },
            { label: 'Cộng dồn', value: data.isStackable ? 'Cho phép' : 'Không' },
            { label: 'Tour ID', value: formatIdList(data.eligibleTourIds) },
            { label: 'Điểm đến ID', value: formatIdList(data.eligibleDestinationIds) },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate" aria-label={`${item.label}: ${item.value}`}>{item.value}</p>
            </div>
          ))}
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nhóm khách</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatSegments(data.eligibleCustomerSegments)}</p>
          </div>
        </div>
      </div>
    </>
  );
}

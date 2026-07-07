import { fmt } from '../_lib/helpers';

type SummaryChecklistItem = { label: string; value: string; done: boolean; required?: boolean };

function SummaryChecklistRow({
  label,
  value,
  done,
  required = true,
}: {
  label: string;
  value: string;
  done: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl px-3 py-2.5 ring-1 ring-slate-100">
      <span className="flex min-w-0 items-start gap-2">
        <span className={`material-symbols-outlined mt-0.5 text-[17px] ${done ? 'text-emerald-600' : required ? 'text-amber-600' : 'text-slate-400'}`}>
          {done ? 'check_circle' : required ? 'radio_button_unchecked' : 'remove_circle'}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold text-slate-500">{label}</span>
          {!done && required && <span className="mt-0.5 block text-[11px] font-semibold text-amber-700">Cần bổ sung</span>}
        </span>
      </span>
      <span className={`max-w-[180px] text-right text-sm font-black ${done ? 'text-slate-900' : required ? 'text-amber-800' : 'text-slate-500'}`}>
        {value}
      </span>
    </div>
  );
}

interface AssistedBookingSidebarProps {
  estimatedTotal: number;
  totalPassengerCount: number;
  estimatedUnitPrice: number;
  voucherStatus: string;
  hasVoucher: boolean;
  missingSummaryCount: number;
  summaryChecklistItems: SummaryChecklistItem[];
}

export function AssistedBookingSidebar({
  estimatedTotal,
  totalPassengerCount,
  estimatedUnitPrice,
  voucherStatus,
  hasVoucher,
  missingSummaryCount,
  summaryChecklistItems,
}: AssistedBookingSidebarProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
      <div className="rounded-[22px] border border-blue-100 bg-blue-50 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Tạm tính</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-blue-950">{fmt(estimatedTotal)}</p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/80 text-blue-700 ring-1 ring-blue-100">
            <span className="material-symbols-outlined text-[20px]">payments</span>
          </span>
        </div>
        <div className="mt-4 space-y-2 rounded-2xl bg-white/75 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-blue-900/60">Số khách</span>
            <span className="font-black text-blue-950">{totalPassengerCount}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-blue-100 pt-2">
            <span className="font-semibold text-blue-900/60">Đơn giá/người</span>
            <span className="font-black text-blue-950">{fmt(estimatedUnitPrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-blue-900/60">Voucher</span>
            <span className={`font-black ${hasVoucher ? 'text-amber-700' : 'text-blue-950'}`}>{voucherStatus}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">Tóm tắt lựa chọn</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Kiểm tra nhanh trước khi lưu hoặc gửi duyệt.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${missingSummaryCount ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'}`}>
            {missingSummaryCount ? `${missingSummaryCount} mục thiếu` : 'Đủ cơ bản'}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {summaryChecklistItems.map(item => (
            <SummaryChecklistRow
              key={item.label}
              label={item.label}
              value={item.value}
              done={item.done}
              required={item.required}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

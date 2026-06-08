'use client';

import type { SubscriberStats, SubscriberStatus } from '../_lib/types';

interface MarketingKpiGridProps {
  stats: SubscriberStats;
  status: SubscriberStatus;
  onFilterChange: (status: SubscriberStatus) => void;
}

export function MarketingKpiGrid({
  stats,
  status,
  onFilterChange,
}: MarketingKpiGridProps) {
  const filterKpis = [
    { icon: 'groups', label: 'Tổng người đăng ký', value: stats.total, color: 'bg-blue-50 text-blue-700', filter: 'all' as SubscriberStatus },
    { icon: 'mark_email_read', label: 'Đang nhận tin', value: stats.active, color: 'bg-emerald-50 text-emerald-700', filter: 'active' as SubscriberStatus },
    { icon: 'unsubscribe', label: 'Đã tạm dừng', value: stats.inactive, color: 'bg-rose-50 text-rose-700', filter: 'inactive' as SubscriberStatus },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
      {filterKpis.map(kpi => {
        const active = status === kpi.filter;
        return (
          <button
            key={kpi.label}
            type="button"
            onClick={() => onFilterChange(kpi.filter)}
            aria-pressed={active}
            className={`relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 ${active ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-100'}`}
          >
            <KpiContent {...kpi} active={active} />
          </button>
        );
      })}

      <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm">
        <KpiContent
          icon="trending_up"
          label="Mới tháng này"
          value={stats.thisMonth}
          color="bg-amber-50 text-amber-700"
          active={false}
          caption="Số lượt đăng ký từ đầu tháng"
        />
      </article>
    </section>
  );
}

interface KpiContentProps {
  icon: string;
  label: string;
  value: number;
  color: string;
  active: boolean;
  caption?: string;
}

function KpiContent({
  icon,
  label,
  value,
  color,
  active,
  caption,
}: KpiContentProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">{icon}</span>
        </div>
        {active && <span className="material-symbols-outlined text-blue-600 text-[18px]" aria-hidden="true">filter_alt</span>}
      </div>
      <p className="text-3xl font-extrabold text-slate-950 mt-5 tabular-nums">{value.toLocaleString('vi-VN')}</p>
      <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
      {caption && <p className="mt-2 text-xs text-slate-400">{caption}</p>}
    </>
  );
}

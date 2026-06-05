'use client';

import type { ArticleKpiCard, ArticleKpiTone } from '../_lib/types';

const kpiTone: Record<ArticleKpiTone, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
};

interface ArticleKpiGridProps {
  isAdmin: boolean;
  kpiCards: ArticleKpiCard[];
}

export function ArticleKpiGrid({ isAdmin, kpiCards }: ArticleKpiGridProps) {
  return (
    <div className={`grid gap-4 mb-8 ${isAdmin ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 lg:grid-cols-5'}`}>
      {kpiCards.map(card => {
        const borderCls = card.active
          ? 'border-primary/60 ring-2 ring-primary/20 shadow-md'
          : 'border-outline-variant/10 hover:border-outline-variant/25 hover:shadow-md';
        const helperText = card.active
          ? card.resetCard ? 'Đang xem tất cả' : 'Đang lọc · Nhấn để bỏ'
          : card.sub;
        const helperCls = card.active ? 'text-primary font-semibold' : 'text-on-surface-variant/50';

        return (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            aria-pressed={card.active}
            className={`relative bg-surface-container-lowest rounded-2xl p-5 border shadow-sm transition-all text-left ${borderCls} cursor-pointer active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary outline-none`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${kpiTone[card.tone]}`}>
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
              </div>
              <span className={`material-symbols-outlined text-[18px] mt-1 ${card.active ? 'text-primary' : 'text-on-surface-variant/35'}`}>
                {card.resetCard ? 'select_all' : card.active ? 'filter_alt_off' : 'filter_alt'}
              </span>
            </div>
            <p className="text-2xl font-extrabold text-on-surface leading-tight truncate mt-4">{card.value}</p>
            <p className="text-xs font-semibold text-on-surface mt-1">{card.label}</p>
            <p className={`text-[10px] mt-0.5 ${helperCls}`}>{helperText}</p>
          </button>
        );
      })}
    </div>
  );
}

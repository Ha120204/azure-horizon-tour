'use client';

import type { TourKpiItem } from '../_lib/types';

interface TourKpiGridProps {
    isAdmin: boolean;
    filterStatus: string;
    kpis: TourKpiItem[];
}

export function TourKpiGrid({ isAdmin, filterStatus, kpis }: TourKpiGridProps) {
    return (
        <div className={`grid gap-4 mb-8 ${isAdmin ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {kpis.map(kpi => {
                const isActive =
                    (kpi.label === 'Chờ Duyệt' && filterStatus === 'PENDING_REVIEW') ||
                    (kpi.label === 'Bị Từ Chối' && filterStatus === 'REJECTED');
                const Tag = kpi.onClick ? 'button' : 'div';
                return (
                    <Tag
                        key={kpi.label}
                        onClick={kpi.onClick ?? undefined}
                        className={`bg-surface-container-lowest rounded-2xl p-5 border shadow-sm transition-all text-left w-full ${isActive
                            ? 'border-amber-400/60 ring-2 ring-amber-400/40 shadow-md'
                            : kpi.highlight
                                ? 'border-amber-300/60 ring-1 ring-amber-400/30 hover:shadow-md hover:scale-[1.02]'
                                : 'border-outline-variant/10 hover:shadow-md'
                            } ${kpi.onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${kpi.color}`}>
                                <span className="material-symbols-outlined text-xl" aria-hidden="true">{kpi.icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-on-surface-variant font-medium truncate">{kpi.label}</p>
                                <p className="text-xl font-bold text-on-surface leading-tight mt-0.5 truncate">{kpi.value}</p>
                                {kpi.unit && (
                                    <p className="text-[10px] text-on-surface-variant/60 mt-0.5 font-medium tracking-wider">{kpi.unit}</p>
                                )}
                                {kpi.subtitle && (
                                    <p className="text-[10px] text-on-surface-variant/70 mt-0.5 font-medium leading-snug">{kpi.subtitle}</p>
                                )}
                            </div>
                            {kpi.onClick && (
                                <span className={`material-symbols-outlined text-[18px] shrink-0 ${isActive ? 'text-amber-600' : 'text-amber-400'}`}>arrow_forward</span>
                            )}
                        </div>
                        {isActive && (
                            <p className="text-[10px] font-semibold text-amber-600 mt-2">Đang lọc • Nhấn để bỏ lọc</p>
                        )}
                    </Tag>
                );
            })}
        </div>
    );
}

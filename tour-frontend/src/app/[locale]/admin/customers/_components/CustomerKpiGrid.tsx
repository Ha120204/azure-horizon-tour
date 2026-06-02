import type { CustomerKpiItem } from '../_lib/kpis';

interface CustomerKpiGridProps {
    kpis: CustomerKpiItem[];
}

const numberFormatter = new Intl.NumberFormat('vi-VN');

function formatKpiValue(value: CustomerKpiItem['value']) {
    return typeof value === 'number' ? numberFormatter.format(value) : value;
}

export function CustomerKpiGrid({ kpis }: CustomerKpiGridProps) {
    return (
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {kpis.map(kpi => (
                <div
                    key={kpi.label}
                    className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <dt className="truncate text-xs font-semibold text-on-surface-variant">{kpi.label}</dt>
                            <dd className="mt-2 text-2xl font-bold leading-none text-on-surface">
                                {formatKpiValue(kpi.value)}
                            </dd>
                        </div>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kpi.iconColor}`}>
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{kpi.icon}</span>
                        </div>
                    </div>
                    {kpi.helper && (
                        <p className="mt-3 truncate text-[11px] font-medium text-on-surface-variant/70">{kpi.helper}</p>
                    )}
                </div>
            ))}
        </dl>
    );
}

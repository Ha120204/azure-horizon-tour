import type { CustomerKpiItem } from '../_lib/kpis';

interface CustomerKpiGridProps {
    kpis: CustomerKpiItem[];
}

export function CustomerKpiGrid({ kpis }: CustomerKpiGridProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpis.map(kpi => (
                <div key={kpi.label} className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-5 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconColor}`}>
                            <span className="material-symbols-outlined text-xl" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{kpi.icon}</span>
                        </div>
                        {kpi.trend && (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">{kpi.trend}</span>
                        )}
                    </div>
                    <p className="text-2xl font-bold text-on-surface leading-tight">{kpi.value}</p>
                    <p className="text-xs text-on-surface-variant font-medium mt-1">{kpi.label}</p>
                </div>
            ))}
        </div>
    );
}

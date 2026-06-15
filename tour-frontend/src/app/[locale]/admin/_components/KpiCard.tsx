import { Link } from '@/i18n/routing';
import type { TrendMeta } from '../_lib/dashboard.types';

interface KpiCardProps {
    icon: string;
    title: string;
    value: string;
    trend: TrendMeta;
    sub?: string;
    gradient?: boolean;
    href?: string;
}

export default function KpiCard({ icon, title, value, trend, sub, gradient, href }: KpiCardProps) {
    const tone = trend.direction === 'down'
        ? 'bg-red-50 text-red-600 border border-red-100'
        : trend.direction === 'flat'
            ? 'bg-slate-100 text-slate-500 border border-slate-100'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    const iconName = trend.direction === 'down'
        ? 'trending_down'
        : trend.direction === 'flat'
            ? 'horizontal_rule'
            : 'trending_up';

    const content = (
        <div className={`relative h-full rounded-2xl p-6 overflow-hidden group transition-[transform,box-shadow,border-color] duration-200 ${href ? 'hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-blue-500' : ''} ${gradient
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25'
            : 'bg-white shadow-sm border border-slate-100 hover:shadow-slate-200/80 hover:border-slate-200'}`}>
            <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl ${gradient ? 'bg-white/10' : 'bg-blue-50/60'}`} />
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${gradient ? 'bg-white/20' : 'bg-blue-50'}`}>
                        <span className="material-symbols-outlined text-[22px]"
                            style={{ color: gradient ? '#fff' : '#3B82F6', fontVariationSettings: "'FILL' 1" }}>
                            {icon}
                        </span>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${gradient ? 'bg-white/20 text-white' : tone}`}>
                        <span className="material-symbols-outlined text-[11px]">{iconName}</span>
                        {trend.label}
                    </span>
                </div>
                <p className={`text-sm font-medium mb-1.5 ${gradient ? 'text-white/80' : 'text-slate-500'}`}>{title}</p>
                <h3 className={`text-3xl font-bold tracking-tight font-headline ${gradient ? 'text-white' : 'text-slate-800'}`}>{value}</h3>
                {sub && <p className={`text-xs mt-1.5 ${gradient ? 'text-white/60' : 'text-slate-400'}`}>{sub}</p>}
                {href && <span className={`mt-4 inline-flex items-center gap-1 text-xs font-bold ${gradient ? 'text-white/80' : 'text-blue-600'}`}>Xem chi tiết <span className="material-symbols-outlined text-[13px]">arrow_forward</span></span>}
            </div>
        </div>
    );

    if (!href) return content;

    return (
        <Link href={href} className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {content}
        </Link>
    );
}

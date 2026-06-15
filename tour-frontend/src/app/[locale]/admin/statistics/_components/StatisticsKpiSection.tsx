import { getTrendMeta } from '../../_lib/dashboard.types';
import type { OverviewData } from '../../_lib/dashboard.types';
import { formatVND } from '../_lib/helpers';
import { Skeleton } from './Skeleton';

function TrendBadge({ current, previous, changePercent }: { current: number; previous: number; changePercent: number }) {
    const { label, direction } = getTrendMeta(current, previous, changePercent);
    const styles = {
        up: 'bg-emerald-50 text-emerald-600',
        down: 'bg-red-50 text-red-500',
        flat: 'bg-slate-100 text-slate-400',
        new: 'bg-blue-50 text-blue-600',
    };
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${styles[direction]}`}>
            {direction === 'up' && <span className="material-symbols-outlined text-[13px]">trending_up</span>}
            {direction === 'down' && <span className="material-symbols-outlined text-[13px]">trending_down</span>}
            {label}
        </span>
    );
}

interface KpiCardProps {
    icon: string;
    label: string;
    value: string;
    sub: string;
    current: number;
    changePercent: number;
    previous: number;
    accent: string;
}

function KpiCard({ icon, label, value, sub, current, changePercent, previous, accent }: KpiCardProps) {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <TrendBadge current={current} changePercent={changePercent} previous={previous} />
            </div>
            <div>
                <p className="text-2xl font-bold font-headline text-slate-800 leading-tight">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
            <p className="text-xs text-slate-300 border-t border-slate-50 pt-2">Kỳ trước: {sub}</p>
        </div>
    );
}

interface StatisticsKpiSectionProps {
    loading: boolean;
    overview: OverviewData | null;
}

export function StatisticsKpiSection({ loading, overview }: StatisticsKpiSectionProps) {
    if (loading || !overview) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
            </div>
        );
    }

    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <KpiCard
                icon="payments"
                label="Doanh thu"
                value={formatVND(overview.revenue.current)}
                sub={formatVND(overview.revenue.previous)}
                current={overview.revenue.current}
                changePercent={overview.revenue.changePercent}
                previous={overview.revenue.previous}
                accent="bg-blue-50 text-blue-600"
            />
            <KpiCard
                icon="receipt_long"
                label="Tổng booking"
                value={fmt(overview.bookings.total)}
                sub={fmt(overview.bookings.previous)}
                current={overview.bookings.total}
                changePercent={overview.bookings.changePercent}
                previous={overview.bookings.previous}
                accent="bg-indigo-50 text-indigo-600"
            />
            <KpiCard
                icon="shopping_bag"
                label="Giá trị trung bình / đơn"
                value={formatVND(overview.aov.current)}
                sub={formatVND(overview.aov.previous)}
                current={overview.aov.current}
                changePercent={overview.aov.changePercent}
                previous={overview.aov.previous}
                accent="bg-emerald-50 text-emerald-600"
            />
            <KpiCard
                icon="person_add"
                label="Khách hàng mới"
                value={fmt(overview.customers.newInPeriod)}
                sub={fmt(overview.customers.previousNewInPeriod)}
                current={overview.customers.newInPeriod}
                changePercent={overview.customers.changePercent}
                previous={overview.customers.previousNewInPeriod}
                accent="bg-purple-50 text-purple-600"
            />
        </div>
    );
}

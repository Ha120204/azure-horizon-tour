import { formatVND } from '../_lib/helpers';
import type { ChartTooltipProps } from '../_lib/types';

export function RevenueTooltip({ active, payload, label }: ChartTooltipProps) {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
                <p className="text-slate-500 font-semibold mb-1">{label}</p>
                <p className="text-blue-600 font-bold">{formatVND(payload[0]?.value ?? 0)}</p>
                {payload[1] && <p className="text-slate-400 text-xs mt-0.5">{payload[1].value} đơn booking</p>}
            </div>
        );
    }
    return null;
}

export function DestTooltip({ active, payload, label }: ChartTooltipProps) {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
                <p className="text-slate-700 font-bold mb-1">{label}</p>
                <p className="text-blue-600 font-semibold">{formatVND(payload[0]?.value ?? 0)}</p>
                {payload[1] && <p className="text-slate-400 text-xs">{payload[1].value} booking</p>}
            </div>
        );
    }
    return null;
}

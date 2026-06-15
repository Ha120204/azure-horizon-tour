import { formatVND } from '../_lib/helpers';

type ChartPayload = { value?: number };

interface RevenueTooltipProps {
    active?: boolean;
    payload?: ChartPayload[];
    label?: string;
}

export default function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
            <p className="text-slate-500 font-medium mb-1">{label}</p>
            <p className="text-blue-600 font-bold">{formatVND(payload[0]?.value ?? 0)}</p>
            {payload[1] && <p className="text-slate-400 text-xs mt-0.5">{payload[1].value} booking</p>}
        </div>
    );
}

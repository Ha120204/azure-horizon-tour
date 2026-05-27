import { GRAN_MAP, PRESETS } from '../_lib/config';

interface StatisticsDateControlsProps {
    today: string;
    activeDays: number;
    customFrom: string;
    customTo: string;
    isCustom: boolean;
    granularityLabel: string;
    periodLabel: string;
    loading: boolean;
    onPreset: (days: number) => void;
    onCustomFromChange: (value: string) => void;
    onCustomToChange: (value: string) => void;
    onCustomApply: () => void;
    onRefresh: () => void;
}

export function StatisticsDateControls({
    today,
    activeDays,
    customFrom,
    customTo,
    isCustom,
    granularityLabel,
    periodLabel,
    loading,
    onPreset,
    onCustomFromChange,
    onCustomToChange,
    onCustomApply,
    onRefresh,
}: StatisticsDateControlsProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Kỳ phân tích</span>
            <div className="flex rounded-2xl bg-slate-100 p-1">
                {PRESETS.map(preset => (
                    <button
                        key={preset.days}
                        onClick={() => onPreset(preset.days)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!isCustom && activeDays === preset.days
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-white hover:text-slate-700'
                        }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 pl-0 lg:pl-3 lg:border-l lg:border-slate-200">
                <span className="text-xs text-slate-400 font-medium hidden lg:block">Tùy chỉnh:</span>
                <input
                    type="date"
                    value={customFrom}
                    max={customTo || today}
                    onChange={event => onCustomFromChange(event.target.value)}
                    className={`text-xs border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer ${
                        isCustom ? 'border-blue-400 text-blue-600 bg-blue-50/30' : 'border-slate-200 text-slate-600'
                    }`}
                />
                <span className="text-slate-300 font-bold">→</span>
                <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={today}
                    onChange={event => onCustomToChange(event.target.value)}
                    className={`text-xs border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer ${
                        isCustom ? 'border-blue-400 text-blue-600 bg-blue-50/30' : 'border-slate-200 text-slate-600'
                    }`}
                />
                <button
                    onClick={onCustomApply}
                    disabled={!customFrom || !customTo}
                    className="px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    Áp dụng
                </button>
            </div>
            <div className="ml-auto flex items-center gap-3">
                <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-semibold border border-blue-100">
                    {GRAN_MAP[granularityLabel]}
                </span>
                <span className="hidden text-xs font-medium text-slate-400 xl:inline">{periodLabel}</span>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-500 border border-slate-200 rounded-xl text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    Làm mới
                </button>
            </div>
        </div>
    );
}

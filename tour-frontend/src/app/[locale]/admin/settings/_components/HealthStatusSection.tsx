import { HEALTH_TONE } from '../_lib/config';
import { formatSettingDate } from '../_lib/helpers';
import type { SystemHealth, SystemHealthStatus } from '../_lib/types';

export function HealthStatusSection({
    title,
    subtitle,
    icon,
    iconBg,
    iconColor,
    health,
    loading,
    onRefresh,
}: {
    title: string;
    subtitle: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    health: SystemHealth | null;
    loading: boolean;
    onRefresh: () => void;
}) {
    const summary = health?.items.reduce(
        (acc, item) => ({ ...acc, [item.status]: acc[item.status] + 1 }),
        { ok: 0, warning: 0, error: 0 } as Record<SystemHealthStatus, number>,
    ) ?? { ok: 0, warning: 0, error: 0 };
    const overallStatus: SystemHealthStatus = summary.error > 0 ? 'error' : summary.warning > 0 ? 'warning' : 'ok';
    const overallTone = HEALTH_TONE[overallStatus];

    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`material-symbols-outlined text-[20px] ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-60"
                >
                    <span className={`material-symbols-outlined text-[17px] ${loading ? 'animate-spin' : ''}`}>
                        {loading ? 'progress_activity' : 'refresh'}
                    </span>
                    Chạy lại
                </button>
            </div>

            <div className="px-6 py-5 space-y-5">
                <div className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${overallTone.tile}`}>
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${overallTone.iconWrap}`}>
                            <span className={`material-symbols-outlined text-[21px] ${overallTone.iconText}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                {overallTone.icon}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Tổng trạng thái: {overallTone.label}</p>
                            <p className="text-xs text-slate-500">
                                {health?.checkedAt ? `Kiểm tra lúc ${formatSettingDate(health.checkedAt)}` : 'Chưa có dữ liệu kiểm tra.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-lg border border-emerald-200 bg-white/70 px-2.5 py-1 text-emerald-700">{summary.ok} ổn</span>
                        <span className="rounded-lg border border-amber-200 bg-white/70 px-2.5 py-1 text-amber-700">{summary.warning} cảnh báo</span>
                        <span className="rounded-lg border border-red-200 bg-white/70 px-2.5 py-1 text-red-700">{summary.error} lỗi</span>
                    </div>
                </div>

                <div className="grid gap-3">
                    {(health?.items.length ? health.items : [{
                        key: 'empty',
                        label: 'Chưa có dữ liệu',
                        status: 'warning' as SystemHealthStatus,
                        message: loading ? 'Đang kiểm tra trạng thái hệ thống...' : 'Bấm Chạy lại để kiểm tra trạng thái hiện tại.',
                    }]).map(item => {
                        const tone = HEALTH_TONE[item.status];
                        return (
                            <div key={item.key} className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3">
                                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${tone.iconWrap}`}>
                                    <span className={`material-symbols-outlined text-[18px] ${tone.iconText}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {tone.icon}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-slate-800">{item.label}</p>
                                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone.chip}`}>{tone.label}</span>
                                        {item.latencyMs !== undefined && (
                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                                {item.latencyMs} ms
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

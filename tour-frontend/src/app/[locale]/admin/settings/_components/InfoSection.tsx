import { ReadOnlyBadge } from './ReadOnlyBadge';

export function InfoSection({ title, subtitle, icon, iconBg, iconColor, rows }: {
    title: string; subtitle: string; icon: string; iconBg: string; iconColor: string;
    rows: { icon: string; label: string; value: string; hint?: string; mono?: boolean; accent?: string }[];
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`material-symbols-outlined text-[20px] ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <div>
                    <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="px-6 py-2">
                {rows.map(r => (
                    <div key={r.label} className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-slate-500 text-[16px]">{r.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{r.label}</p>
                            <div className={`text-sm font-semibold ${r.accent ?? 'text-slate-800'} ${r.mono ? 'font-mono' : ''} break-all`}>{r.value}</div>
                        </div>
                        {r.hint && <ReadOnlyBadge hint={r.hint} />}
                    </div>
                ))}
            </div>
        </div>
    );
}

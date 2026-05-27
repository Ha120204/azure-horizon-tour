import type { ReactNode } from 'react';

export function SectionCard({ title, subtitle, icon, accent = 'blue', children }: {
    title: string; subtitle?: string; icon: string; accent?: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
    children: ReactNode;
}) {
    const accents = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
        rose: 'bg-rose-50 text-rose-600',
    };
    return (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${accents[accent]}`}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <div>
                    <h2 className="font-headline text-base font-bold text-slate-800">{title}</h2>
                    {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

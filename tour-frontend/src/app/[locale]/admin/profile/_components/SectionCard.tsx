import type { ReactNode } from 'react';

export function SectionCard({ title, subtitle, icon, children }: {
    title: string; subtitle: string; icon: string; children: ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-blue-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <div>
                    <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="px-7 py-6">{children}</div>
        </div>
    );
}

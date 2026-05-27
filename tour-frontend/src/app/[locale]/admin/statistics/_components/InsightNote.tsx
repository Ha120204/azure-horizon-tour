import type { ReactNode } from 'react';

export function InsightNote({ children }: { children: ReactNode }) {
    return (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-medium leading-relaxed text-blue-700">
            {children}
        </div>
    );
}

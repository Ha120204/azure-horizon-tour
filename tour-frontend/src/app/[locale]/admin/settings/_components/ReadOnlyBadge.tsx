'use client';

import { useState } from 'react';

export function ReadOnlyBadge({ hint }: { hint: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-block">
            <button type="button" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500">
                <span className="material-symbols-outlined text-[11px]">lock</span>READ-ONLY
            </button>
            {show && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-800 text-white text-[11px] px-3 py-2 rounded-lg shadow-xl z-20 leading-snug">
                    {hint}
                    <div className="absolute top-full left-3 border-4 border-transparent border-t-slate-800" />
                </div>
            )}
        </div>
    );
}

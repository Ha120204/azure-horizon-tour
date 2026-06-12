'use client';

import { useEffect, useRef, useState } from 'react';

interface SortOption {
    value: string;
    label: string;
}

interface SortDropdownProps {
    value: string;
    options: SortOption[];
    onChange: (value: string) => void;
}

export default function SortDropdown({ value, options, onChange }: SortDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const current = options.find((o) => o.value === value) ?? options[0];

    return (
        <div className="relative w-full sm:w-auto" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-container-high active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 motion-reduce:transform-none sm:w-auto"
            >
                <span className="whitespace-nowrap">{current?.label}</span>
                <span
                    className="material-symbols-outlined text-[20px] text-outline transition-transform duration-200"
                    style={{ transform: open ? 'rotate(180deg)' : 'none' }}
                >
                    expand_more
                </span>
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute right-0 z-50 mt-2 w-full min-w-[200px] overflow-hidden rounded-xl border border-outline-variant/10 bg-surface py-1.5 shadow-xl shadow-slate-900/10 animate-fade-in-up sm:w-auto"
                >
                    {options.map((opt) => {
                        const isActive = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                    isActive
                                        ? 'bg-primary/5 font-bold text-primary'
                                        : 'font-medium text-on-surface hover:bg-surface-container'
                                }`}
                            >
                                <span className="whitespace-nowrap">{opt.label}</span>
                                {isActive && (
                                    <span className="material-symbols-outlined text-[18px] text-primary">check</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

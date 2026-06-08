'use client';

import { useEffect, useRef, useState } from 'react';
import type { SupportSelectOption } from '../_hooks/useContactForm';

export function SupportDropdownSelect({
    id,
    name,
    value,
    options,
    error,
    ariaDescribedBy,
    onChange,
}: {
    id: string;
    name: string;
    value: string;
    options: SupportSelectOption[];
    error?: boolean;
    ariaDescribedBy?: string;
    onChange: (value: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const listboxId = `${id}-listbox`;
    const selectedOption = options.find(option => option.value === value);
    const placeholder = options[0]?.label ?? 'Chọn';
    const choices = options.filter(option => option.value);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    return (
        <div ref={rootRef} className="relative">
            <input type="hidden" name={name} value={value} />
            <button
                id={id}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-describedby={ariaDescribedBy}
                onClick={() => setIsOpen(open => !open)}
                className={`flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl border bg-surface-container-low px-4 py-3 text-left text-sm font-medium outline-none transition-[border-color,background-color,box-shadow] duration-200 hover:bg-white focus-visible:border-primary focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/15 ${
                    error
                        ? 'border-error bg-error/5 focus-visible:border-error focus-visible:ring-error/15'
                        : isOpen
                            ? 'border-primary bg-white ring-2 ring-primary/15'
                            : 'border-outline-variant/20'
                }`}
            >
                <span className={`min-w-0 truncate ${value ? 'font-semibold text-on-surface' : 'text-outline/70'}`}>
                    {selectedOption?.label || placeholder}
                </span>
                <span
                    className={`material-symbols-outlined shrink-0 text-[20px] text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                >
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-[260] w-full overflow-hidden rounded-2xl border border-outline-variant/20 bg-white p-1.5 shadow-2xl shadow-slate-950/12 ring-1 ring-slate-900/5">
                    <ul id={listboxId} role="listbox" aria-labelledby={id} className="max-h-64 overflow-y-auto">
                        {choices.map(option => {
                            const selected = option.value === value;
                            return (
                                <li key={option.value} role="option" aria-selected={selected}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                                            selected
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-on-surface hover:bg-surface-container-low'
                                        }`}
                                    >
                                        <span className="min-w-0 truncate">{option.label}</span>
                                        {selected && (
                                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check</span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

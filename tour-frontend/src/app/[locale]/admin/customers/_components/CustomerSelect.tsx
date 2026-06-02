'use client';

import { useEffect, useRef, useState } from 'react';

export type CustomerSelectOption = {
    value: string;
    label: string;
    description?: string;
    icon?: string;
};

type CustomerSelectProps = {
    value: string;
    options: CustomerSelectOption[];
    onChange: (value: string) => void;
    ariaLabel: string;
    active?: boolean;
    className?: string;
};

export function CustomerSelect({
    value,
    options,
    onChange,
    ariaLabel,
    active = false,
    className = '',
}: CustomerSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement | null>(null);
    const selectedOption = options.find(option => option.value === value);

    useEffect(() => {
        if (!isOpen) return;

        const handleMouseDown = (event: MouseEvent) => {
            if (!selectRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [isOpen]);

    return (
        <div ref={selectRef} className={`relative ${className}`}>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={ariaLabel}
                onClick={() => setIsOpen(open => !open)}
                onKeyDown={event => {
                    if (event.key === 'Escape') setIsOpen(false);
                    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setIsOpen(true);
                    }
                }}
                className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                        ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                        : 'border-outline-variant/20 bg-surface-container-low text-on-surface hover:border-outline-variant/35'
                }`}
            >
                <span className="flex min-w-0 items-center gap-2.5">
                    {selectedOption?.icon && (
                        <span className="material-symbols-outlined text-[17px] text-primary" aria-hidden="true">
                            {selectedOption.icon}
                        </span>
                    )}
                    <span className="truncate">{selectedOption?.label ?? options[0]?.label ?? 'Chọn...'}</span>
                </span>
                <span className={`material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div
                    role="listbox"
                    className="absolute left-0 right-0 z-[95] mt-2 min-w-[260px] overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-1.5 shadow-2xl shadow-slate-900/12"
                >
                    <div className="max-h-72 overflow-y-auto">
                        {options.map(option => {
                            const selected = option.value === value;
                            return (
                                <button
                                    key={`${option.value}-${option.label}`}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                        selected
                                            ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                                            : 'text-on-surface hover:bg-surface-container-low'
                                    }`}
                                >
                                    <span className={`material-symbols-outlined mt-0.5 text-[18px] ${selected ? 'text-primary' : 'text-on-surface-variant/70'}`} aria-hidden="true">
                                        {option.icon ?? (selected ? 'check_circle' : 'radio_button_unchecked')}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block whitespace-normal break-words text-sm font-bold leading-5">{option.label}</span>
                                        {option.description && (
                                            <span className={`mt-0.5 block text-xs font-semibold ${selected ? 'text-primary/70' : 'text-on-surface-variant'}`}>
                                                {option.description}
                                            </span>
                                        )}
                                    </span>
                                    {selected && <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">done</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

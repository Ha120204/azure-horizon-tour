'use client';

import { useEffect, useRef, useState } from 'react';

export interface LogSelectOption {
    value: string;
    label: string;
    icon?: string;
}

interface LogSelectProps {
    value: string;
    options: LogSelectOption[];
    onChange: (value: string) => void;
    ariaLabel: string;
    placeholder?: string;
    className?: string;
    triggerClassName?: string;
    menuClassName?: string;
    align?: 'left' | 'right';
    placement?: 'bottom' | 'top';
}

export function LogSelect({
    value,
    options,
    onChange,
    ariaLabel,
    placeholder = 'Chọn...',
    className = '',
    triggerClassName = '',
    menuClassName = '',
    align = 'left',
    placement = 'bottom',
}: LogSelectProps) {
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
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border px-4 py-2 text-left text-sm outline-none transition-[border-color,box-shadow,background-color] ${
                    isOpen
                        ? 'border-primary/45 bg-surface shadow-[0_0_0_3px_rgba(37,99,235,0.12)]'
                        : 'border-outline-variant/25 bg-surface hover:border-primary/30 hover:bg-surface-container-lowest'
                } ${triggerClassName}`}
            >
                <span className={`min-w-0 flex-1 truncate ${selectedOption ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
                    {selectedOption?.label ?? placeholder}
                </span>
                <span className={`material-symbols-outlined shrink-0 text-[18px] text-outline transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} aria-hidden="true">
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div
                    role="listbox"
                    className={`absolute z-[120] max-h-72 overflow-y-auto rounded-xl border border-outline-variant/25 bg-surface p-1.5 shadow-2xl shadow-slate-900/12 ${
                        align === 'right' ? 'right-0' : 'left-0'
                    } ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${menuClassName || 'min-w-full'}`}
                >
                    {options.map(option => {
                        const active = option.value === value;

                        return (
                            <button
                                key={`${option.value}-${option.label}`}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                                    active
                                        ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[17px] ${active ? 'text-primary' : 'text-outline'}`} aria-hidden="true">
                                    {option.icon ?? (active ? 'check_circle' : 'radio_button_unchecked')}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-semibold">{option.label}</span>
                                {active && <span className="material-symbols-outlined text-[17px] text-primary" aria-hidden="true">done</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

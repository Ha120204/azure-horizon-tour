'use client';

import { useEffect, useRef, useState } from 'react';

interface StaffSelectOption {
    value: string;
    label: string;
}

interface StaffSelectProps {
    id: string;
    label: string;
    value: string;
    options: StaffSelectOption[];
    onChange: (value: string) => void;
    icon?: string;
    className?: string;
    placement?: 'bottom' | 'top';
    size?: 'default' | 'comfortable';
}

export function StaffSelect({
    id,
    label,
    value,
    options,
    onChange,
    icon,
    className = '',
    placement = 'bottom',
    size = 'default',
}: StaffSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(option => option.value === value) ?? options[0];
    const dropdownPlacementClass = placement === 'top'
        ? 'bottom-[calc(100%+0.35rem)]'
        : 'top-[calc(100%+0.35rem)]';
    const buttonSizeClass = size === 'comfortable'
        ? 'rounded-2xl bg-surface-container-lowest py-3.5'
        : 'rounded-xl bg-surface-container-low py-2.5';

    useEffect(() => {
        if (!isOpen) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isOpen]);

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                id={id}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={label}
                onClick={() => setIsOpen(open => !open)}
                className={`flex w-full items-center gap-2 border border-outline-variant/20 px-4 text-left text-sm font-semibold text-on-surface transition-colors hover:border-primary/30 hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${buttonSizeClass}`}
            >
                {icon && (
                    <span className="material-symbols-outlined text-[17px] text-on-surface-variant" aria-hidden="true">{icon}</span>
                )}
                <span className="min-w-0 flex-1 truncate">{selectedOption?.label}</span>
                <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div
                    role="listbox"
                    aria-labelledby={id}
                    className={`absolute left-0 right-0 z-40 max-h-64 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1.5 shadow-xl ${dropdownPlacementClass}`}
                >
                    {options.map(option => {
                        const selected = option.value === value;
                        return (
                            <button
                                key={option.value || 'empty'}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                    setIsOpen(false);
                                    if (option.value !== value) onChange(option.value);
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                                    selected
                                        ? 'bg-primary text-on-primary'
                                        : 'text-on-surface hover:bg-surface-container'
                                }`}
                            >
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                {selected && <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

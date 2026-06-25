'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type CheckoutSelectOption = {
    value: string;
    label: string;
    icon?: string;
};

type CheckoutSelectProps = {
    value: string;
    options: CheckoutSelectOption[];
    onChange: (value: string) => void;
    ariaLabel: string;
    placeholder?: string;
    className?: string;
    buttonClassName?: string;
    menuClassName?: string;
};

type MenuPosition = {
    left: number;
    minWidth: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
};

export function CheckoutSelect({
    value,
    options,
    onChange,
    ariaLabel,
    placeholder = 'Chon...',
    className = '',
    buttonClassName = '',
    menuClassName = '',
}: CheckoutSelectProps) {
    const listboxId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const selectedOption = options.find(option => option.value === value);

    // Định vị menu theo viewport để không bị cắt bởi vùng cuộn của modal/cha overflow.
    const positionMenu = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const gap = 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        // Mở lên trên nếu dưới không đủ chỗ mà trên rộng hơn.
        const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
        setMenuPos({
            left: rect.left,
            minWidth: rect.width,
            top: openUp ? undefined : rect.bottom + gap,
            bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
            maxHeight: Math.max(160, (openUp ? spaceAbove : spaceBelow) - gap - 8),
        });
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        positionMenu();
        const onReposition = () => positionMenu();
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [isOpen, positionMenu]);

    useEffect(() => {
        if (!isOpen) return;
        const handleMouseDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [isOpen]);

    return (
        <div className={`relative ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-label={ariaLabel}
                onClick={() => setIsOpen(open => !open)}
                onKeyDown={event => {
                    if (event.key === 'Escape') {
                        setIsOpen(false);
                    }
                    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setIsOpen(true);
                    }
                }}
                className={`flex min-h-[50px] w-full items-center justify-between gap-2 rounded-lg border border-outline-variant/20 bg-white px-3 py-3 text-left text-sm font-semibold text-on-surface shadow-sm outline-none transition-all hover:border-primary/35 focus-visible:ring-2 focus-visible:ring-primary md:px-4 md:py-4 ${buttonClassName}`}
            >
                <span className="flex min-w-0 items-center gap-2">
                    {selectedOption?.icon && (
                        <span className="material-symbols-outlined text-[17px] text-primary" aria-hidden="true">
                            {selectedOption.icon}
                        </span>
                    )}
                    <span className={`truncate ${selectedOption ? '' : 'text-on-surface-variant/70'}`}>
                        {selectedOption?.label ?? placeholder}
                    </span>
                </span>
                <span
                    className={`material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant/70 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`}
                    aria-hidden="true"
                >
                    expand_more
                </span>
            </button>

            {isOpen && menuPos && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    id={listboxId}
                    role="listbox"
                    style={{
                        position: 'fixed',
                        left: menuPos.left,
                        minWidth: menuPos.minWidth,
                        top: menuPos.top,
                        bottom: menuPos.bottom,
                    }}
                    className={`z-[200] w-max max-w-80 overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-1.5 shadow-2xl shadow-slate-900/12 ${menuClassName}`}
                >
                    <div className="overflow-y-auto" style={{ maxHeight: menuPos.maxHeight }}>
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
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                        selected
                                            ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                                            : 'text-on-surface hover:bg-surface-container-low'
                                    }`}
                                >
                                    <span
                                        className={`material-symbols-outlined text-[18px] ${selected ? 'text-primary' : 'text-on-surface-variant/70'}`}
                                        aria-hidden="true"
                                    >
                                        {option.icon ?? (selected ? 'check_circle' : 'radio_button_unchecked')}
                                    </span>
                                    <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-bold leading-5">
                                        {option.label}
                                    </span>
                                    {selected && (
                                        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
                                            done
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

'use client';

/* useListboxNav trả về ref (dropdownRef/buttonRef/optionRefs) lẫn state trong một object;
   rule react-hooks/refs hiểu nhầm mọi truy cập listbox.* là đọc ref khi render. */
/* eslint-disable react-hooks/refs */

import type { SupportSelectOption } from '../_hooks/useContactForm';
import { useListboxNav } from '../_hooks/useListboxNav';

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
    const selectedOption = options.find(option => option.value === value);
    const placeholder = options[0]?.label ?? '';
    const choices = options.filter(option => option.value);

    const listbox = useListboxNav({
        options: choices,
        selectedValue: value,
        getOptionValue: option => option.value,
        onChange,
    });

    const optionId = (index: number) => `${listbox.listboxId}-${index}`;

    return (
        <div ref={listbox.dropdownRef} className="relative">
            <input type="hidden" name={name} value={value} />
            <button
                id={id}
                ref={listbox.buttonRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={listbox.isOpen}
                aria-controls={listbox.isOpen ? listbox.listboxId : undefined}
                aria-describedby={ariaDescribedBy}
                onClick={listbox.handleButtonClick}
                onKeyDown={listbox.handleButtonKeyDown}
                className={`flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl border bg-surface-container-low px-4 py-3 text-left text-sm font-medium outline-none transition-[border-color,background-color,box-shadow] duration-200 hover:bg-white focus-visible:border-primary focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/15 ${
                    error
                        ? 'border-error bg-error/5 focus-visible:border-error focus-visible:ring-error/15'
                        : listbox.isOpen
                            ? 'border-primary bg-white ring-2 ring-primary/15'
                            : 'border-outline-variant/20'
                }`}
            >
                <span className={`min-w-0 truncate ${value ? 'font-semibold text-on-surface' : 'text-outline/70'}`}>
                    {selectedOption?.label || placeholder}
                </span>
                <span
                    className={`material-symbols-outlined shrink-0 text-[20px] text-primary transition-transform duration-200 ${listbox.isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                >
                    expand_more
                </span>
            </button>

            {listbox.isOpen && (
                <div
                    id={listbox.listboxId}
                    role="listbox"
                    aria-labelledby={id}
                    aria-activedescendant={optionId(listbox.activeIndex)}
                    className="absolute left-0 top-[calc(100%+8px)] z-[260] max-h-64 w-full overflow-y-auto rounded-2xl border border-outline-variant/20 bg-white p-1.5 shadow-2xl shadow-slate-950/12 ring-1 ring-slate-900/5"
                >
                    {choices.map((option, index) => {
                        const selected = option.value === value;
                        const active = index === listbox.activeIndex;

                        return (
                            <button
                                key={option.value}
                                id={optionId(index)}
                                ref={element => { listbox.optionRefs.current[index] = element; }}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                tabIndex={active ? 0 : -1}
                                onClick={() => listbox.commit(option.value)}
                                onFocus={() => listbox.setActiveIndex(index)}
                                onMouseEnter={() => listbox.setActiveIndex(index)}
                                onKeyDown={event => listbox.handleOptionKeyDown(event, option.value)}
                                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 ${
                                    selected
                                        ? 'bg-primary/10 text-primary'
                                        : active
                                            ? 'bg-surface-container-low text-on-surface'
                                            : 'text-on-surface hover:bg-surface-container-low'
                                }`}
                            >
                                <span className="min-w-0 truncate">{option.label}</span>
                                {selected && (
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

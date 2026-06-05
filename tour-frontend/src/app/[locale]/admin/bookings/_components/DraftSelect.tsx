'use client';

import { useEffect, useRef, useState } from 'react';
import type { DraftSelectOption } from '../_lib/types';

export function DraftSelect({
  value,
  options,
  onChange,
  placeholder = 'Chọn...',
  className = '',
  menuClassName = '',
  ariaLabel,
  hasError = false,
}: {
  value: string;
  options: DraftSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  ariaLabel?: string;
  hasError?: boolean;
}) {
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
    <div ref={selectRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        data-invalid={hasError ? 'true' : undefined}
        onClick={() => setIsOpen(open => !open)}
        onKeyDown={event => {
          if (event.key === 'Escape') setIsOpen(false);
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`flex min-h-[48px] w-full items-center justify-between gap-3 text-left ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selectedOption?.icon && (
            <span className="material-symbols-outlined text-[18px] text-blue-600">{selectedOption.icon}</span>
          )}
          <span className={`truncate ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <span className={`material-symbols-outlined shrink-0 text-[18px] text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 z-[95] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/12 ${menuClassName}`}
        >
          <div className="max-h-72 overflow-y-auto">
            {options.map(option => {
              const active = option.value === value;
              return (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-100'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`material-symbols-outlined mt-0.5 text-[18px] ${active ? 'text-blue-700' : 'text-slate-400'}`}>
                    {option.icon ?? (active ? 'check_circle' : 'radio_button_unchecked')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{option.label}</span>
                    {option.description && (
                      <span className={`mt-0.5 block text-xs font-semibold ${active ? 'text-blue-700/70' : 'text-slate-500'}`}>
                        {option.description}
                      </span>
                    )}
                  </span>
                  {active && <span className="material-symbols-outlined text-[18px] text-blue-700">done</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

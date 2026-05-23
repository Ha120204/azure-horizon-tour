'use client';
import { useState } from 'react';
import { INCLUDE_PRESETS, EXCLUDE_PRESETS } from './constants';

interface TagChipFieldProps {
    items: string[];
    presets: string[];
    color: 'emerald' | 'red';
    onChange: (items: string[]) => void;
}

export function TagChipField({ items, presets, color, onChange }: TagChipFieldProps) {
    const [addMode, setAddMode] = useState<'none' | 'custom'>('none');
    const [customValue, setCustomValue] = useState('');

    const available = presets.filter(p => !items.includes(p));
    const chipCls = color === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-600 border-red-200';
    const btnCls = color === 'emerald' ? 'text-emerald-500 hover:text-emerald-700' : 'text-red-400 hover:text-red-600';

    const addItem = (val: string) => {
        const v = val.trim();
        if (v && !items.includes(v)) onChange([...items, v]);
    };
    const removeItem = (val: string) => onChange(items.filter(i => i !== val));

    const confirmCustom = () => {
        if (customValue.trim()) { addItem(customValue); setCustomValue(''); }
        setAddMode('none');
    };

    return (
        <div className="space-y-2">
            {/* Selected chips */}
            {items.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {items.map(item => (
                        <span key={item} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${chipCls}`}>
                            {item}
                            <button type="button" onClick={() => removeItem(item)} className={`ml-0.5 transition-colors ${btnCls}`}>
                                <span className="material-symbols-outlined text-[11px]">close</span>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Add row */}
            {addMode === 'none' ? (
                <div className="relative">
                    <select
                        value=""
                        onChange={e => {
                            const v = e.target.value;
                            if (v === '__custom__') { setAddMode('custom'); }
                            else if (v) { addItem(v); }
                        }}
                        className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-3 pr-8 py-2 text-xs text-on-surface-variant outline-none focus-visible:ring-2 focus-visible:ring-primary appearance-none cursor-pointer"
                    >
                        <option value="">➕ Thêm dịch vụ…</option>
                        {available.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="__custom__">✏️ Nhập tùy chỉnh…</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm pointer-events-none">expand_more</span>
                </div>
            ) : (
                <div className="flex gap-1.5">
                    <input
                        type="text" autoFocus
                        placeholder="Nhập dịch vụ…"
                        value={customValue}
                        onChange={e => setCustomValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); confirmCustom(); }
                            if (e.key === 'Escape') { setAddMode('none'); setCustomValue(''); }
                        }}
                        className="flex-1 bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <button type="button" onClick={confirmCustom}
                        className="px-3 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                        Thêm
                    </button>
                    <button type="button" onClick={() => { setAddMode('none'); setCustomValue(''); }}
                        className="w-8 h-8 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:text-error transition-colors flex-shrink-0">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// Re-export presets for convenience
export { INCLUDE_PRESETS, EXCLUDE_PRESETS };

'use client';
import { useId, useRef, useState } from 'react';
import { INCLUDE_PRESETS, EXCLUDE_PRESETS } from './constants';

interface TagChipFieldProps {
    items: string[];
    presets: string[];
    color: 'emerald' | 'red' | 'indigo';
    canSavePreset?: boolean;
    onCreatePreset?: (label: string) => Promise<string>;
    onChange: (items: string[]) => void;
}

export function TagChipField({ items, presets, color, canSavePreset = false, onCreatePreset, onChange }: TagChipFieldProps) {
    const listboxId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customValue, setCustomValue] = useState('');
    const [savePreset, setSavePreset] = useState(false);
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [presetError, setPresetError] = useState('');

    const available = presets.filter(p => !items.includes(p));
    const normalize = (value: string) =>
        value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const filtered = available
        .filter(item => !query.trim() || normalize(item).includes(normalize(query)))
        .slice(0, 8);
    const chipCls = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        red: 'bg-red-50 text-red-600 border-red-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    }[color];
    const btnCls = {
        emerald: 'text-emerald-500 hover:text-emerald-700',
        red: 'text-red-400 hover:text-red-600',
        indigo: 'text-indigo-500 hover:text-indigo-700',
    }[color];
    const toneCls = {
        emerald: {
            icon: 'text-emerald-600',
            active: 'bg-emerald-600 text-white',
            action: 'text-emerald-700 hover:bg-emerald-50',
        },
        red: {
            icon: 'text-red-500',
            active: 'bg-red-500 text-white',
            action: 'text-red-600 hover:bg-red-50',
        },
        indigo: {
            icon: 'text-indigo-600',
            active: 'bg-indigo-600 text-white',
            action: 'text-indigo-700 hover:bg-indigo-50',
        },
    }[color];

    const focusInputSoon = () => {
        window.requestAnimationFrame(() => inputRef.current?.focus());
    };

    const addItem = (val: string, options?: { keepOpen?: boolean }) => {
        const v = val.trim();
        if (v && !items.includes(v)) onChange([...items, v]);
        setQuery('');
        setCustomValue('');
        setIsAddingCustom(false);
        setSavePreset(false);
        setPresetError('');
        if (options?.keepOpen) {
            setIsOpen(true);
            focusInputSoon();
        } else {
            setIsOpen(false);
        }
    };
    const removeItem = (val: string) => onChange(items.filter(i => i !== val));
    const openCustomForm = () => {
        setCustomValue(query.trim());
        setIsAddingCustom(true);
        setPresetError('');
        setIsOpen(false);
    };
    const confirmCustom = async () => {
        const value = customValue.trim();
        if (!value) return;

        if (savePreset && canSavePreset && onCreatePreset) {
            setIsSavingPreset(true);
            setPresetError('');
            try {
                const savedLabel = await onCreatePreset(value);
                addItem(savedLabel || value, { keepOpen: true });
                return;
            } catch {
                setPresetError('Đã thêm vào gói tour hiện tại, nhưng chưa lưu được vào danh mục dùng chung.');
                addItem(value, { keepOpen: true });
                return;
            } finally {
                setIsSavingPreset(false);
            }
        }

        addItem(value, { keepOpen: true });
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
            <div
                className="relative"
                onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
            >
                <div className="relative">
                    <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] ${toneCls.icon}`}>add_circle</span>
                    <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-expanded={isOpen}
                        aria-controls={listboxId}
                        autoComplete="off"
                        placeholder="Tìm trong danh mục có sẵn..."
                        value={query}
                        onFocus={() => setIsOpen(true)}
                        onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                        onKeyDown={e => {
                            if (e.key === 'Escape') setIsOpen(false);
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (filtered[0]) addItem(filtered[0], { keepOpen: true });
                            }
                        }}
                        className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl py-2.5 pl-9 pr-16 text-xs text-on-surface outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    {query ? (
                        <button
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setQuery(''); setIsOpen(true); }}
                            className="absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-error"
                            aria-label="Xóa nội dung đang nhập"
                        >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => setIsOpen(open => !open)}
                        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-primary"
                        aria-label="Mở danh sách gợi ý"
                    >
                        <span className="material-symbols-outlined text-[15px]">expand_more</span>
                    </button>
                </div>
                {isOpen && (
                    <div id={listboxId} className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl">
                        {filtered.length > 0 ? filtered.map(item => (
                            <button
                                key={item}
                                type="button"
                                role="option"
                                aria-selected={false}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => addItem(item, { keepOpen: true })}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container"
                            >
                                <span className={`material-symbols-outlined text-[15px] ${toneCls.icon}`}>add</span>
                                <span className="line-clamp-2">{item}</span>
                            </button>
                        )) : (
                            <div className="px-3 py-2 text-xs text-on-surface-variant">Không có gợi ý phù hợp.</div>
                        )}
                        {!query.trim() && (
                            <div className="mt-1 rounded-xl bg-surface-container-low px-3 py-2 text-[11px] text-on-surface-variant">
                                Không có trong danh mục? Chọn thêm mục mới bên dưới.
                            </div>
                        )}
                        <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            onMouseDown={e => e.preventDefault()}
                            onClick={openCustomForm}
                            className={`mt-1 flex w-full items-center gap-2 rounded-xl border-t border-outline-variant/10 px-3 py-2.5 text-left text-xs font-bold ${toneCls.action}`}
                        >
                            <span className="material-symbols-outlined text-[15px]">add_circle</span>
                            <span>{query.trim() ? `Thêm mục mới: "${query.trim()}"` : 'Thêm mục mới'}</span>
                        </button>
                    </div>
                )}
            </div>
            {isAddingCustom ? (
                <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-2">
                    <label className="mb-1 block text-[11px] font-bold text-on-surface-variant">Mục mới</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            autoFocus
                            value={customValue}
                            onChange={e => setCustomValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void confirmCustom();
                                }
                                if (e.key === 'Escape') {
                                    setIsAddingCustom(false);
                                    setCustomValue('');
                                }
                            }}
                            placeholder="Nhập tên mục mới..."
                            className="min-w-0 flex-1 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                        <button
                            type="button"
                            onClick={() => void confirmCustom()}
                            disabled={!customValue.trim() || isSavingPreset}
                            className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {isSavingPreset ? 'Đang lưu...' : 'Thêm'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsAddingCustom(false); setCustomValue(''); }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container hover:text-error"
                            aria-label="Hủy thêm mục mới"
                        >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                        </button>
                    </div>
                    {canSavePreset && (
                        <label className="mt-2 flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-[11px] font-semibold text-on-surface-variant">
                            <input
                                type="checkbox"
                                checked={savePreset}
                                onChange={e => setSavePreset(e.target.checked)}
                                className="accent-primary"
                            />
                            Lưu vào danh mục dùng chung
                        </label>
                    )}
                    {presetError && <p className="mt-2 text-[11px] text-amber-700">{presetError}</p>}
                </div>
            ) : (
                <p className="text-[11px] text-on-surface-variant/60">Muốn thêm mục ngoài danh mục? Mở dropdown rồi chọn “Thêm mục mới”.</p>
            )}
        </div>
    );
}

// Re-export presets for convenience
export { INCLUDE_PRESETS, EXCLUDE_PRESETS };

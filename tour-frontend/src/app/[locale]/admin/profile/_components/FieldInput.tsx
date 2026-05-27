import type { ReactNode } from 'react';

export function FieldInput({ label, id, icon, type = 'text', value, onChange, placeholder, disabled, hint, error, children }: {
    label: string; id: string; icon?: string; type?: string; value?: string;
    onChange?: (v: string) => void; placeholder?: string; disabled?: boolean;
    hint?: string; error?: string; children?: ReactNode;
}) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {label}
            </label>
            {children ?? (
                <div className="relative">
                    {icon && (
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                            {icon}
                        </span>
                    )}
                    <input
                        id={id}
                        type={type}
                        value={value}
                        onChange={e => onChange?.(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`w-full border rounded-xl py-3 text-sm font-medium text-slate-800 outline-none transition-all
                            ${icon ? 'pl-11 pr-4' : 'px-4'}
                            ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}
                            ${error ? 'border-red-400 focus:ring-red-100' : ''}`}
                    />
                </div>
            )}
            {error && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">error</span>{error}</p>}
            {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

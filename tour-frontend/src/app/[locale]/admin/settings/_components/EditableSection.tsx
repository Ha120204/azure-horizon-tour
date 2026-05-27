'use client';

import { useState } from 'react';
import { SETTING_META } from '../_lib/config';
import { buildDraft, formatSettingDate } from '../_lib/helpers';
import type { Setting } from '../_lib/types';
import { ReadOnlyBadge } from './ReadOnlyBadge';

export function EditableSection({
    title, subtitle, icon, iconBg, iconColor,
    settings, editable, onSave,
}: {
    title: string; subtitle: string; icon: string; iconBg: string; iconColor: string;
    settings: Setting[]; editable: boolean;
    onSave: (updates: Record<string, string>) => Promise<boolean>;
}) {
    const [draft, setDraft] = useState<Record<string, string>>(() => buildDraft(settings));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const isDirty = settings.some(s => draft[s.key] !== s.value);

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        const changes: Record<string, string> = {};
        settings.forEach(s => { if (draft[s.key] !== s.value) changes[s.key] = draft[s.key]; });

        const hasRiskyChange = Object.keys(changes).some(key => SETTING_META[key]?.risky);
        if (hasRiskyChange && !window.confirm('Các thay đổi này có thể ảnh hưởng trực tiếp tới vận hành đặt tour hoặc website công khai. Bạn chắc chắn muốn lưu?')) {
            setSaving(false);
            return;
        }

        const ok = await onSave(changes);
        setSaving(false);
        if (ok) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        }
    };

    const handleReset = () => {
        setDraft(buildDraft(settings));
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`material-symbols-outlined text-[20px] ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                    </div>
                </div>
                {editable && isDirty && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button type="button" onClick={handleReset}
                            className="px-3 py-1.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                            Hoàn tác
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-60 shadow-sm shadow-blue-200">
                            {saving
                                ? <><span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>Đang lưu...</>
                                : saved
                                    ? <><span className="material-symbols-outlined text-[15px]">check_circle</span>Đã lưu</>
                                    : <><span className="material-symbols-outlined text-[15px]">save</span>Lưu thay đổi</>
                            }
                        </button>
                    </div>
                )}
            </div>

            <div className="px-6 py-2">
                {settings.map(s => {
                    const meta = SETTING_META[s.key] ?? { type: (s.value === 'true' || s.value === 'false') ? 'boolean' : 'text', impact: 'Cấu hình vận hành hệ thống.' };
                    const isBool = meta.type === 'boolean';
                    const fieldId = `setting-${s.key}`;
                    return (
                        <div key={s.key} className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <label htmlFor={fieldId} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</label>
                                    {s.description && (
                                        <span className="text-[11px] text-slate-400">— {s.description}</span>
                                    )}
                                </div>
                                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">conversion_path</span>
                                    {meta.impact}
                                </p>

                                {editable ? (
                                    isBool ? (
                                        <button
                                            id={fieldId}
                                            type="button"
                                            role="switch"
                                            aria-checked={draft[s.key] === 'true'}
                                            aria-label={s.label}
                                            onClick={() => setDraft(d => ({ ...d, [s.key]: d[s.key] === 'true' ? 'false' : 'true' }))}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${draft[s.key] === 'true' ? 'bg-blue-600' : 'bg-slate-200'}`}
                                        >
                                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${draft[s.key] === 'true' ? 'translate-x-5' : ''}`} />
                                        </button>
                                    ) : (
                                        <input
                                            id={fieldId}
                                            name={s.key}
                                            type={meta.type === 'number' ? 'number' : meta.type === 'email' ? 'email' : meta.type === 'tel' ? 'tel' : 'text'}
                                            min={meta.min}
                                            max={meta.max}
                                            maxLength={meta.maxLength}
                                            inputMode={meta.type === 'number' ? 'numeric' : meta.type === 'tel' ? 'tel' : undefined}
                                            value={draft[s.key] ?? ''}
                                            onChange={e => setDraft(d => ({ ...d, [s.key]: e.target.value }))}
                                            className={`w-full max-w-lg text-sm font-semibold text-slate-800 border rounded-xl px-3 py-2 outline-none transition-all ${draft[s.key] !== s.value
                                                    ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/30'
                                                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                                                }`}
                                        />
                                    )
                                ) : (
                                    isBool ? (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${s.value === 'true' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${s.value === 'true' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {s.value === 'true' ? 'Bật' : 'Tắt'}
                                        </span>
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-700">{s.value || <span className="text-slate-400 italic">Chưa cấu hình</span>}</p>
                                    )
                                )}
                                <p className="mt-2 text-[11px] text-slate-400">
                                    Cập nhật lần cuối: {formatSettingDate(s.updatedAt)}
                                    {s.updatedBy ? ` · bởi user #${s.updatedBy}` : ''}
                                </p>
                            </div>
                            {!editable && <ReadOnlyBadge hint="Chỉ Super Admin được thay đổi cài đặt này" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

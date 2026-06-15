'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildDraft, formatSettingDate, validateSettingDraftValue } from '../_lib/helpers';
import type { Setting, SettingMeta } from '../_lib/types';
import { ReadOnlyBadge } from './ReadOnlyBadge';

type ConfirmMode = 'save-risky' | 'reset' | null;

const FALLBACK_META: SettingMeta = { type: 'text', impact: 'Cấu hình vận hành hệ thống.' };

export function EditableSection({
    title, subtitle, icon, iconBg, iconColor,
    settings, editable, onSave, settingMeta,
}: {
    title: string; subtitle: string; icon: string; iconBg: string; iconColor: string;
    settings: Setting[]; editable: boolean;
    onSave: (updates: Record<string, string>) => Promise<boolean>;
    settingMeta: Record<string, SettingMeta>;
}) {
    const [draft, setDraft] = useState<Record<string, string>>(() => buildDraft(settings));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const changes = useMemo(() => settings
        .filter(s => draft[s.key] !== s.value)
        .map(s => ({
            key: s.key,
            label: s.label,
            before: s.value,
            after: draft[s.key] ?? '',
            risky: Boolean(settingMeta[s.key]?.risky),
        })), [draft, settings]);
    const riskyChanges = changes.filter(change => change.risky);
    const isDirty = changes.length > 0;
    const validationErrors = useMemo(() => Object.fromEntries(settings.map(setting => {
        const meta = settingMeta[setting.key] ?? FALLBACK_META;
        return [setting.key, validateSettingDraftValue(setting, draft, meta)];
    })), [draft, settings]);
    const firstInvalidKey = settings.find(setting => validationErrors[setting.key])?.key;

    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const executeSave = async () => {
        if (saving || !isDirty) return;
        setSaving(true);
        setConfirmMode(null);
        const updates = Object.fromEntries(changes.map(change => [change.key, change.after]));

        const ok = await onSave(updates);
        setSaving(false);
        if (ok) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        }
    };

    const handleSave = async () => {
        if (saving || !isDirty) return;
        if (firstInvalidKey) {
            setTouched(Object.fromEntries(settings.map(setting => [setting.key, true])));
            window.requestAnimationFrame(() => document.getElementById(`setting-${firstInvalidKey}`)?.focus());
            return;
        }
        if (riskyChanges.length > 0) {
            setConfirmMode('save-risky');
            return;
        }

        await executeSave();
    };

    const handleReset = () => {
        if (!isDirty) return;
        setConfirmMode('reset');
    };

    const executeReset = () => {
        setDraft(buildDraft(settings));
        setTouched({});
        setConfirmMode(null);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm">
            <div className="sticky top-0 z-20 flex items-start justify-between gap-4 rounded-t-2xl border-b border-slate-100 bg-white/95 px-6 py-5 shadow-[0_1px_0_rgba(226,232,240,0.7)] backdrop-blur">
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
                            className="px-3 py-1.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                            Hoàn tác
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-blue-200">
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
                    const meta = settingMeta[s.key] ?? FALLBACK_META;
                    const isBool = meta.type === 'boolean';
                    const fieldId = `setting-${s.key}`;
                    const error = touched[s.key] ? validationErrors[s.key] : '';
                    const errorId = `${fieldId}-error`;
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
                                            onClick={() => {
                                                setDraft(d => ({ ...d, [s.key]: d[s.key] === 'true' ? 'false' : 'true' }));
                                                setTouched(current => ({ ...current, [s.key]: true }));
                                            }}
                                            className={`relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${draft[s.key] === 'true' ? 'bg-blue-600' : 'bg-slate-200'}`}
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
                                            autoComplete={meta.type === 'email' ? 'email' : meta.type === 'tel' ? 'tel' : undefined}
                                            spellCheck={meta.type === 'email' || meta.type === 'tel' ? false : undefined}
                                            value={draft[s.key] ?? ''}
                                            onChange={e => setDraft(d => ({ ...d, [s.key]: e.target.value }))}
                                            onBlur={() => setTouched(current => ({ ...current, [s.key]: true }))}
                                            aria-invalid={Boolean(error)}
                                            aria-describedby={error ? errorId : undefined}
                                            className={`w-full max-w-lg text-sm font-semibold text-slate-800 border rounded-xl px-3 py-2 outline-none transition-colors ${error
                                                ? 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                                                : draft[s.key] !== s.value
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
                                {editable && error && (
                                    <p id={errorId} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                                        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">error</span>
                                        {error}
                                    </p>
                                )}
                                <p
                                    className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-400"
                                    title="Lần cập nhật gần nhất"
                                >
                                    <span className="material-symbols-outlined text-[13px]" aria-hidden="true">history</span>
                                    <span>{formatSettingDate(s.updatedAt)}</span>
                                    {(s.updatedByName || s.updatedBy) && (
                                        <span>· {s.updatedByName ?? `User #${s.updatedBy}`}</span>
                                    )}
                                </p>
                            </div>
                            {!editable && <ReadOnlyBadge hint="Chỉ Super Admin được thay đổi cài đặt này" />}
                        </div>
                    );
                })}
            </div>

            {confirmMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="settings-confirm-title"
                        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    >
                        <div className="border-b border-slate-100 px-6 py-5">
                            <div className="flex items-start gap-3">
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${confirmMode === 'save-risky' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                    <span className="material-symbols-outlined text-[21px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {confirmMode === 'save-risky' ? 'warning' : 'undo'}
                                    </span>
                                </div>
                                <div>
                                    <h3 id="settings-confirm-title" className="text-base font-bold text-slate-900">
                                        {confirmMode === 'save-risky' ? 'Xác nhận thay đổi quan trọng' : 'Hoàn tác thay đổi?'}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {confirmMode === 'save-risky'
                                            ? 'Các cài đặt này có thể ảnh hưởng trực tiếp tới vận hành đặt tour hoặc website công khai.'
                                            : 'Các chỉnh sửa chưa lưu trong nhóm này sẽ được đưa về giá trị hiện tại.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
                            <div className="space-y-3">
                                {changes.map(change => (
                                    <div key={change.key} className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold text-slate-800">{change.label}</p>
                                            {confirmMode === 'save-risky' && change.risky && (
                                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                                    Quan trọng
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                                            <div>
                                                <p className="font-semibold uppercase tracking-wide text-slate-400">Trước</p>
                                                <p className="mt-1 break-words font-semibold text-slate-600">{change.before || 'Chưa cấu hình'}</p>
                                            </div>
                                            <div>
                                                <p className="font-semibold uppercase tracking-wide text-slate-400">Sau</p>
                                                <p className="mt-1 break-words font-semibold text-slate-900">{change.after || 'Chưa cấu hình'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setConfirmMode(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                            >
                                Hủy
                            </button>
                            {confirmMode === 'save-risky' ? (
                                <button
                                    type="button"
                                    onClick={executeSave}
                                    disabled={saving}
                                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                                >
                                    Xác nhận lưu
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={executeReset}
                                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                                >
                                    Hoàn tác
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

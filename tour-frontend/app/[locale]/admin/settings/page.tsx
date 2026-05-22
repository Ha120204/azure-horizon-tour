'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Setting {
    id: number; key: string; value: string;
    label: string; description?: string; group: string; updatedAt: string; updatedBy?: number | null;
}
type GroupedSettings = Record<string, Setting[]>;
type SettingInputType = 'text' | 'email' | 'tel' | 'number' | 'boolean';
type SettingsPanel = 'company' | 'booking' | 'announcement' | 'runtime' | 'security' | 'payment' | 'email';

interface SettingMeta {
    type: SettingInputType;
    min?: number;
    max?: number;
    maxLength?: number;
    impact: string;
    risky?: boolean;
}
type SystemHealthStatus = 'ok' | 'warning' | 'error';

interface SystemHealthItem {
    key: string;
    label: string;
    status: SystemHealthStatus;
    message: string;
    latencyMs?: number;
}

interface SystemHealth {
    checkedAt: string;
    uptimeSeconds?: number;
    items: SystemHealthItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const canEdit = (role: string) => role === 'SUPER_ADMIN';

const buildDraft = (settings: Setting[]): Record<string, string> =>
    Object.fromEntries(settings.map(s => [s.key, s.value]));

const SETTING_META: Record<string, SettingMeta> = {
    company_name: { type: 'text', maxLength: 120, impact: 'Hiển thị ở header, footer và email hệ thống.' },
    company_address: { type: 'text', maxLength: 250, impact: 'Dùng trong thông tin liên hệ và chứng từ gửi khách.' },
    company_phone: { type: 'tel', maxLength: 32, impact: 'Hiển thị ở email vé và kênh hỗ trợ khách hàng.' },
    company_email: { type: 'email', maxLength: 120, impact: 'Email hỗ trợ khách hàng và biểu mẫu liên hệ.' },
    company_description: { type: 'text', maxLength: 180, impact: 'Ảnh hưởng nội dung giới thiệu thương hiệu.' },
    booking_hold_minutes: { type: 'number', min: 5, max: 120, impact: 'Ảnh hưởng trực tiếp thời gian giữ ghế trước thanh toán.', risky: true },
    booking_max_people: { type: 'number', min: 1, max: 99, impact: 'Giới hạn số khách tối đa trong một lượt đặt.', risky: true },
    booking_min_people: { type: 'number', min: 1, max: 99, impact: 'Giới hạn số khách tối thiểu trong một lượt đặt.', risky: true },
    announcement_enabled: { type: 'boolean', impact: 'Bật/tắt banner thông báo trên website công khai.', risky: true },
    announcement_text: { type: 'text', maxLength: 240, impact: 'Nội dung banner thông báo hiển thị cho khách.' },
};

const PANEL_META: Record<SettingsPanel, { title: string; subtitle: string; icon: string; iconBg: string; iconColor: string; kind: 'editable' | 'info' }> = {
    company: {
        title: 'Thông tin công ty',
        subtitle: 'Hiển thị trên email, vé điện tử và các tài liệu hệ thống.',
        icon: 'business', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', kind: 'editable',
    },
    booking: {
        title: 'Chính sách đặt tour',
        subtitle: 'Các quy tắc kinh doanh áp dụng cho quy trình đặt tour.',
        icon: 'policy', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', kind: 'editable',
    },
    announcement: {
        title: 'Thông báo hệ thống',
        subtitle: 'Banner thông báo hiển thị trên trang chủ khi cần thiết.',
        icon: 'campaign', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', kind: 'editable',
    },
    runtime: {
        title: 'Trạng thái hệ thống',
        subtitle: 'Kiểm tra nhanh API, database, xác thực và các dịch vụ tích hợp.',
        icon: 'cloud_sync', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', kind: 'info',
    },
    security: {
        title: 'Bảo mật & Xác thực',
        subtitle: 'Cấu hình JWT và rate limiting — chỉnh sửa trong file .env.',
        icon: 'security', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', kind: 'info',
    },
    payment: {
        title: 'Cổng thanh toán',
        subtitle: 'API keys lưu trong .env — không hiển thị vì lý do bảo mật.',
        icon: 'payments', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', kind: 'info',
    },
    email: {
        title: 'Hệ thống Email',
        subtitle: 'Cấu hình gửi email tự động cho giao dịch và tài khoản.',
        icon: 'mail', iconBg: 'bg-rose-50', iconColor: 'text-rose-600', kind: 'info',
    },
};

const formatSettingDate = (value?: string) => {
    if (!value) return 'Chưa ghi nhận';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận' : date.toLocaleString('vi-VN');
};

const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return 'Chưa rõ';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return `${seconds}s`;
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours} giờ ${remainingMinutes} phút` : `${hours} giờ`;
};

const HEALTH_TONE: Record<SystemHealthStatus, {
    label: string;
    icon: string;
    chip: string;
    tile: string;
    iconWrap: string;
    iconText: string;
}> = {
    ok: {
        label: 'Ổn định',
        icon: 'check_circle',
        chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        tile: 'bg-emerald-50/60 border-emerald-100',
        iconWrap: 'bg-emerald-100',
        iconText: 'text-emerald-700',
    },
    warning: {
        label: 'Cần chú ý',
        icon: 'warning',
        chip: 'bg-amber-50 text-amber-700 border-amber-200',
        tile: 'bg-amber-50/60 border-amber-100',
        iconWrap: 'bg-amber-100',
        iconText: 'text-amber-700',
    },
    error: {
        label: 'Có lỗi',
        icon: 'error',
        chip: 'bg-red-50 text-red-700 border-red-200',
        tile: 'bg-red-50/70 border-red-100',
        iconWrap: 'bg-red-100',
        iconText: 'text-red-700',
    },
};

function ReadOnlyBadge({ hint }: { hint: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-block">
            <button type="button" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500">
                <span className="material-symbols-outlined text-[11px]">lock</span>READ-ONLY
            </button>
            {show && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-800 text-white text-[11px] px-3 py-2 rounded-lg shadow-xl z-20 leading-snug">
                    {hint}
                    <div className="absolute top-full left-3 border-4 border-transparent border-t-slate-800" />
                </div>
            )}
        </div>
    );
}

// ─── Editable Section ─────────────────────────────────────────────────────────
function EditableSection({
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
            {/* Header */}
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

            {/* Fields */}
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
                                        /* Toggle */
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
                                        /* Text input */
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
                                    /* Read-only display */
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

// ─── Static Info Row ──────────────────────────────────────────────────────────
function InfoSection({ title, subtitle, icon, iconBg, iconColor, rows }: {
    title: string; subtitle: string; icon: string; iconBg: string; iconColor: string;
    rows: { icon: string; label: string; value: string; hint?: string; mono?: boolean; accent?: string }[];
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`material-symbols-outlined text-[20px] ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <div>
                    <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="px-6 py-2">
                {rows.map(r => (
                    <div key={r.label} className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-slate-500 text-[16px]">{r.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{r.label}</p>
                            <div className={`text-sm font-semibold ${r.accent ?? 'text-slate-800'} ${r.mono ? 'font-mono' : ''} break-all`}>{r.value}</div>
                        </div>
                        {r.hint && <ReadOnlyBadge hint={r.hint} />}
                    </div>
                ))}
            </div>
        </div>
    );
}

function HealthStatusSection({
    title,
    subtitle,
    icon,
    iconBg,
    iconColor,
    health,
    loading,
    onRefresh,
}: {
    title: string;
    subtitle: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    health: SystemHealth | null;
    loading: boolean;
    onRefresh: () => void;
}) {
    const summary = health?.items.reduce(
        (acc, item) => ({ ...acc, [item.status]: acc[item.status] + 1 }),
        { ok: 0, warning: 0, error: 0 } as Record<SystemHealthStatus, number>,
    ) ?? { ok: 0, warning: 0, error: 0 };
    const overallStatus: SystemHealthStatus = summary.error > 0 ? 'error' : summary.warning > 0 ? 'warning' : 'ok';
    const overallTone = HEALTH_TONE[overallStatus];

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
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-60"
                >
                    <span className={`material-symbols-outlined text-[17px] ${loading ? 'animate-spin' : ''}`}>
                        {loading ? 'progress_activity' : 'refresh'}
                    </span>
                    Chạy lại
                </button>
            </div>

            <div className="px-6 py-5 space-y-5">
                <div className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${overallTone.tile}`}>
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${overallTone.iconWrap}`}>
                            <span className={`material-symbols-outlined text-[21px] ${overallTone.iconText}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                {overallTone.icon}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Tổng trạng thái: {overallTone.label}</p>
                            <p className="text-xs text-slate-500">
                                {health?.checkedAt ? `Kiểm tra lúc ${formatSettingDate(health.checkedAt)}` : 'Chưa có dữ liệu kiểm tra.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-lg border border-emerald-200 bg-white/70 px-2.5 py-1 text-emerald-700">{summary.ok} ổn</span>
                        <span className="rounded-lg border border-amber-200 bg-white/70 px-2.5 py-1 text-amber-700">{summary.warning} cảnh báo</span>
                        <span className="rounded-lg border border-red-200 bg-white/70 px-2.5 py-1 text-red-700">{summary.error} lỗi</span>
                    </div>
                </div>

                <div className="grid gap-3">
                    {(health?.items.length ? health.items : [{
                        key: 'empty',
                        label: 'Chưa có dữ liệu',
                        status: 'warning' as SystemHealthStatus,
                        message: loading ? 'Đang kiểm tra trạng thái hệ thống...' : 'Bấm Chạy lại để kiểm tra trạng thái hiện tại.',
                    }]).map(item => {
                        const tone = HEALTH_TONE[item.status];
                        return (
                            <div key={item.key} className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3">
                                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${tone.iconWrap}`}>
                                    <span className={`material-symbols-outlined text-[18px] ${tone.iconText}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {tone.icon}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-slate-800">{item.label}</p>
                                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone.chip}`}>{tone.label}</span>
                                        {item.latencyMs !== undefined && (
                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                                {item.latencyMs} ms
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SystemSettingsPage() {
    const [grouped, setGrouped] = useState<GroupedSettings>({});
    const [userRole, setUserRole] = useState('');
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const [activePanel, setActivePanel] = useState<SettingsPanel>('company');

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const [settingsRes, profileRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/settings`),
                fetchWithAuth(`${API_BASE_URL}/auth/profile`),
            ]);
            if (settingsRes.ok) {
                const json = await settingsRes.json();
                setGrouped(json.data ?? {});
            }
            if (profileRes.ok) {
                const json = await profileRes.json();
                const role = json.role ?? json.data?.role ?? '';
                setUserRole(role);
            }
        } catch { }
        finally { setLoading(false); }
    }, []);

    const checkSystemHealth = useCallback(async () => {
        const t0 = performance.now();
        setHealthLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/settings/health`, { signal: AbortSignal.timeout(5000) });
            const latencyMs = Math.round(performance.now() - t0);
            if (!res.ok) throw new Error('Health check failed');
            const json = await res.json();
            const data = (json.data ?? json) as SystemHealth;
            setHealth({
                ...data,
                items: [
                    {
                        key: 'frontend_api',
                        label: 'Frontend → Backend API',
                        status: latencyMs > 500 ? 'warning' : 'ok',
                        latencyMs,
                        message: 'Trình duyệt gọi /settings/health thành công.',
                    },
                    ...(data.items ?? []),
                ],
            });
            return true;
        } catch {
            setHealth({
                checkedAt: new Date().toISOString(),
                items: [{
                    key: 'frontend_api',
                    label: 'Frontend → Backend API',
                    status: 'error',
                    message: 'Không gọi được /settings/health. Kiểm tra backend, token đăng nhập hoặc CORS.',
                }],
            });
            return false;
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); checkSystemHealth(); }, [fetchSettings, checkSystemHealth]);

    const handleManualHealthCheck = useCallback(async () => {
        setActivePanel('runtime');
        const ok = await checkSystemHealth();
        showToast(
            ok ? 'Đã cập nhật trạng thái hệ thống.' : 'Không kiểm tra được trạng thái hệ thống. Hãy restart backend nếu vừa cập nhật code.',
            ok ? 'success' : 'error',
        );
    }, [checkSystemHealth, showToast]);

    const handleSave = async (updates: Record<string, string>) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) {
                const error = await res.json().catch(() => null);
                const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
                throw new Error(message || 'Lưu thất bại. Vui lòng thử lại.');
            }
            showToast('Đã lưu cài đặt thành công!');
            fetchSettings(); // reload để sync với server
            return true;
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Lưu thất bại. Vui lòng thử lại.', 'error');
            return false;
        }
    };

    const editable = canEdit(userRole);
    const visiblePanels = (Object.keys(PANEL_META) as SettingsPanel[])
        .filter(panel => PANEL_META[panel].kind === 'info' || (grouped[panel]?.length ?? 0) > 0);
    const activeMeta = PANEL_META[activePanel];
    const runtimeRows = useMemo(() => [
        { icon: 'api', label: 'Backend API URL', value: API_BASE_URL, mono: true },
        { icon: 'schedule', label: 'Thời gian trình duyệt', value: now.toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'medium' }), mono: true, hint: 'Không phải thời gian server; dùng để đối chiếu phiên làm việc hiện tại' },
        { icon: 'timer', label: 'Backend uptime', value: formatDuration(health?.uptimeSeconds), hint: 'Thời gian tiến trình backend đã chạy tại thời điểm health check gần nhất' },
        { icon: 'language', label: 'Framework', value: 'NestJS 10 · Node.js · TypeScript' },
        { icon: 'storage', label: 'ORM / Database', value: 'Prisma ORM · PostgreSQL' },
    ], [health?.uptimeSeconds, now]);

    if (loading) {
        return (
            <main className="flex-1 pt-8 px-8 pb-16 overflow-y-auto w-full max-w-[1100px] mx-auto">
                <div className="flex items-center justify-center h-64">
                    <span className="material-symbols-outlined text-slate-400 text-[40px] animate-spin">progress_activity</span>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 pt-8 px-8 pb-16 overflow-y-auto w-full max-w-[1100px] mx-auto">
            {/* Toast */}
            {toast && (
                <div className="fixed top-6 right-8 z-50">
                    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <span className={`material-symbols-outlined text-[20px] ${toast.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {toast.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <span className={`text-sm font-semibold ${toast.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>{toast.msg}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-[1.75rem] font-bold text-slate-800 leading-tight">Cài đặt hệ thống</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {editable
                            ? 'Cấu hình thông số vận hành — thay đổi có hiệu lực ngay lập tức.'
                            : 'Xem thông tin cấu hình hệ thống. Chỉ Super Admin được thay đổi.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Role badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${editable ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {userRole === 'SUPER_ADMIN' ? 'admin_panel_settings' : userRole === 'ADMIN' ? 'manage_accounts' : 'badge'}
                        </span>
                        {userRole === 'SUPER_ADMIN' ? 'Super Admin' : userRole === 'ADMIN' ? 'Admin — Chỉ xem' : 'Staff — Chỉ xem'}
                    </span>
                    <button onClick={handleManualHealthCheck} disabled={healthLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-60">
                        <span className={`material-symbols-outlined text-[17px] ${healthLoading ? 'animate-spin' : ''}`}>
                            {healthLoading ? 'progress_activity' : 'refresh'}
                        </span>
                        {healthLoading ? 'Đang kiểm tra' : 'Kiểm tra trạng thái'}
                    </button>
                </div>
            </div>

            {/* Permission banner */}
            {!editable && userRole && (
                <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                    <span className="material-symbols-outlined text-blue-500 text-[20px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                    <div>
                        <p className="text-sm font-bold text-blue-800">Bạn đang ở chế độ chỉ xem</p>
                        <p className="text-sm text-blue-700 mt-0.5">Tài khoản {userRole === 'ADMIN' ? 'Admin' : 'Staff'} không có quyền chỉnh sửa cài đặt hệ thống. Chỉ Super Admin được thực hiện thay đổi.</p>
                    </div>
                </div>
            )}

            <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200/70 bg-white p-2 shadow-sm">
                    <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-7">
                        {visiblePanels.map(panel => {
                            const meta = PANEL_META[panel];
                            const active = activePanel === panel;
                            return (
                                <button
                                    key={panel}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setActivePanel(panel)}
                                    className={`flex min-h-12 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
                                        active
                                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{meta.icon}</span>
                                    <span className="truncate">{meta.title}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeMeta.kind === 'editable' && (
                    <EditableSection
                        key={`${activePanel}:${(grouped[activePanel] ?? []).map(s => `${s.key}:${s.updatedAt}:${s.value}`).join('|')}`}
                        {...activeMeta}
                        settings={grouped[activePanel] ?? []}
                        editable={editable}
                        onSave={handleSave}
                    />
                )}

                {activePanel === 'runtime' && (
                    <div className="space-y-5">
                        <HealthStatusSection
                            {...activeMeta}
                            health={health}
                            loading={healthLoading}
                            onRefresh={handleManualHealthCheck}
                        />
                        <InfoSection
                            title="Thông tin môi trường"
                            subtitle="Các giá trị tham chiếu để đối chiếu khi kiểm tra vận hành."
                            icon="dns"
                            iconBg="bg-slate-100"
                            iconColor="text-slate-600"
                            rows={runtimeRows}
                        />
                    </div>
                )}

                {activePanel === 'security' && (
                    <InfoSection
                        {...activeMeta}
                        rows={[
                            { icon: 'token', label: 'Cơ chế xác thực', value: 'JWT · Passport.js · HttpOnly Cookie' },
                            { icon: 'timer', label: 'Access Token hết hạn', value: '15 phút', hint: 'JWT_EXPIRES_IN trong .env' },
                            { icon: 'lock_clock', label: 'Refresh Token hết hạn', value: '7 ngày', hint: 'JWT_REFRESH_EXPIRES_IN trong .env' },
                            { icon: 'speed', label: 'Rate Limiting', value: '100 req / 60s / IP (auth routes: 5 req/phút)', hint: 'ThrottlerModule trong app.module.ts' },
                            { icon: 'verified_user', label: 'Phân quyền (RBAC)', value: 'SUPER_ADMIN · ADMIN · STAFF · CUSTOMER' },
                        ]}
                    />
                )}

                {activePanel === 'payment' && (
                    <InfoSection
                        {...activeMeta}
                        rows={[
                            { icon: 'account_balance', label: 'Cổng thanh toán', value: 'PayOS (QR Code · Chuyển khoản ngân hàng)' },
                            { icon: 'vpn_key', label: 'Client ID', value: '••••••••••••••••', mono: true, hint: 'PAYOS_CLIENT_ID trong .env' },
                            { icon: 'key', label: 'API Key', value: '••••••••••••••••', mono: true, hint: 'PAYOS_API_KEY trong .env' },
                            { icon: 'webhook', label: 'Webhook endpoint', value: `${API_BASE_URL}/booking/payos-webhook`, mono: true, hint: 'PayOS POST về đây khi có thanh toán' },
                        ]}
                    />
                )}

                {activePanel === 'email' && (
                    <InfoSection
                        {...activeMeta}
                        rows={[
                            { icon: 'alternate_email', label: 'Địa chỉ gửi (from)', value: 'Azure Horizon <••••••••@gmail.com>', hint: 'MAIL_USER trong .env' },
                            { icon: 'mail_lock', label: 'Mật khẩu ứng dụng', value: '•••••••••••••••• (Google App Password)', mono: true, hint: 'MAIL_PASS trong .env' },
                        ]}
                    />
                )}

                {/* Footer */}
                <div className="flex items-center justify-between py-4 px-1 text-xs text-slate-400 border-t border-slate-100">
                    <span>Azure Horizon Admin Console v1.0.0</span>
                    <span className="font-mono">{now.toLocaleString('vi-VN')}</span>
                </div>
            </div>
        </main>
    );
}

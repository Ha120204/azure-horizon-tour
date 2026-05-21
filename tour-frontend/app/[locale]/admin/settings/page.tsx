'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Setting {
    id: number; key: string; value: string;
    label: string; description?: string; group: string; updatedAt: string;
}
type GroupedSettings = Record<string, Setting[]>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const canEdit = (role: string) => role === 'SUPER_ADMIN';

const buildDraft = (settings: Setting[]): Record<string, string> =>
    Object.fromEntries(settings.map(s => [s.key, s.value]));

function ReadOnlyBadge({ hint }: { hint: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-block">
            <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
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
    onSave: (updates: Record<string, string>) => Promise<void>;
}) {
    const [draft, setDraft] = useState<Record<string, string>>(() => buildDraft(settings));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const isDirty = settings.some(s => draft[s.key] !== s.value);

    const handleSave = async () => {
        setSaving(true);
        const changes: Record<string, string> = {};
        settings.forEach(s => { if (draft[s.key] !== s.value) changes[s.key] = draft[s.key]; });
        await onSave(changes);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
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
                        <button onClick={handleReset}
                            className="px-3 py-1.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                            Hoàn tác
                        </button>
                        <button onClick={handleSave} disabled={saving}
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
                    const isBool = s.value === 'true' || s.value === 'false';
                    return (
                        <div key={s.key} className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
                                    {s.description && (
                                        <span className="text-[11px] text-slate-400">— {s.description}</span>
                                    )}
                                </div>

                                {editable ? (
                                    isBool ? (
                                        /* Toggle */
                                        <button
                                            onClick={() => setDraft(d => ({ ...d, [s.key]: d[s.key] === 'true' ? 'false' : 'true' }))}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${draft[s.key] === 'true' ? 'bg-blue-600' : 'bg-slate-200'}`}
                                        >
                                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${draft[s.key] === 'true' ? 'translate-x-5' : ''}`} />
                                        </button>
                                    ) : (
                                        /* Text input */
                                        <input
                                            type="text"
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SystemSettingsPage() {
    const [grouped, setGrouped] = useState<GroupedSettings>({});
    const [userRole, setUserRole] = useState('');
    const [pingMs, setPingMs] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

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

    const pingBackend = useCallback(async () => {
        const t0 = performance.now();
        try {
            const res = await fetch(`${API_BASE_URL}/auth/profile`, { signal: AbortSignal.timeout(3000) });
            setPingMs(Math.round(performance.now() - t0));
            if (res.status >= 500) setPingMs(null);
        } catch {
            setPingMs(null);
        }
    }, []);

    useEffect(() => { fetchSettings(); pingBackend(); }, [fetchSettings, pingBackend]);

    const handleSave = async (updates: Record<string, string>) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error();
            showToast('Đã lưu cài đặt thành công!');
            fetchSettings(); // reload để sync với server
        } catch {
            showToast('Lưu thất bại. Vui lòng thử lại.', 'error');
        }
    };

    const editable = canEdit(userRole);

    const GROUP_META: Record<string, { title: string; subtitle: string; icon: string; iconBg: string; iconColor: string }> = {
        company: {
            title: 'Thông tin công ty',
            subtitle: 'Hiển thị trên email, vé điện tử và các tài liệu hệ thống.',
            icon: 'business', iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
        },
        booking: {
            title: 'Chính sách đặt tour',
            subtitle: 'Các quy tắc kinh doanh áp dụng cho quy trình đặt tour.',
            icon: 'policy', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600',
        },
        announcement: {
            title: 'Thông báo hệ thống',
            subtitle: 'Banner thông báo hiển thị trên trang chủ khi cần thiết.',
            icon: 'campaign', iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
        },
    };

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
                    <button onClick={pingBackend}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                        <span className="material-symbols-outlined text-[17px]">refresh</span>Kiểm tra kết nối
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
                {/* ── Editable sections (từ DB) ── */}
                {Object.entries(GROUP_META).map(([group, meta]) => {
                    const settings = grouped[group] ?? [];
                    if (settings.length === 0) return null;
                    return (
                        <EditableSection
                            key={`${group}:${settings.map(s => `${s.key}:${s.updatedAt}:${s.value}`).join('|')}`}
                            {...meta}
                            settings={settings}
                            editable={editable}
                            onSave={handleSave}
                        />
                    );
                })}

                {/* ── Static: Kết nối & Runtime ── */}
                <InfoSection
                    title="Kết nối & Runtime"
                    subtitle="Trạng thái kết nối giữa Frontend và Backend API."
                    icon="cloud_sync" iconBg="bg-emerald-50" iconColor="text-emerald-600"
                    rows={[
                        { icon: 'api', label: 'Backend API URL', value: API_BASE_URL, mono: true },
                        {
                            icon: 'speed', label: 'Độ trễ API (Ping)',
                            value: pingMs !== null ? `${pingMs} ms` : 'Đang đo...',
                            accent: pingMs !== null ? (pingMs < 150 ? 'text-emerald-600' : pingMs < 400 ? 'text-amber-600' : 'text-red-600') : 'text-slate-500',
                            hint: 'Tự động đo khi tải trang',
                        },
                        { icon: 'schedule', label: 'Thời gian máy chủ', value: now.toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'medium' }), mono: true },
                        { icon: 'language', label: 'Framework', value: 'NestJS 10 · Node.js · TypeScript' },
                        { icon: 'storage', label: 'ORM / Database', value: 'Prisma ORM · PostgreSQL' },
                    ]}
                />

                {/* ── Static: Bảo mật ── */}
                <InfoSection
                    title="Bảo mật & Xác thực"
                    subtitle="Cấu hình JWT và rate limiting — chỉnh sửa trong file .env."
                    icon="security" iconBg="bg-slate-100" iconColor="text-slate-600"
                    rows={[
                        { icon: 'token', label: 'Cơ chế xác thực', value: 'JWT · Passport.js · HttpOnly Cookie' },
                        { icon: 'timer', label: 'Access Token hết hạn', value: '15 phút', hint: 'JWT_EXPIRES_IN trong .env' },
                        { icon: 'lock_clock', label: 'Refresh Token hết hạn', value: '7 ngày', hint: 'JWT_REFRESH_EXPIRES_IN trong .env' },
                        { icon: 'speed', label: 'Rate Limiting', value: '100 req / 60s / IP (auth routes: 5 req/phút)', hint: 'ThrottlerModule trong app.module.ts' },
                        { icon: 'verified_user', label: 'Phân quyền (RBAC)', value: 'SUPER_ADMIN · ADMIN · STAFF · CUSTOMER' },
                    ]}
                />

                {/* ── Static: Thanh toán ── */}
                <InfoSection
                    title="Cổng thanh toán (PayOS)"
                    subtitle="API keys lưu trong .env — không hiển thị vì lý do bảo mật."
                    icon="payments" iconBg="bg-amber-50" iconColor="text-amber-600"
                    rows={[
                        { icon: 'account_balance', label: 'Cổng thanh toán', value: 'PayOS (QR Code · Chuyển khoản ngân hàng)' },
                        { icon: 'vpn_key', label: 'Client ID', value: '••••••••••••••••', mono: true, hint: 'PAYOS_CLIENT_ID trong .env' },
                        { icon: 'key', label: 'API Key', value: '••••••••••••••••', mono: true, hint: 'PAYOS_API_KEY trong .env' },
                        { icon: 'webhook', label: 'Webhook endpoint', value: `${API_BASE_URL}/booking/payos-webhook`, mono: true, hint: 'PayOS POST về đây khi có thanh toán' },
                    ]}
                />

                {/* ── Static: Email ── */}
                <InfoSection
                    title="Hệ thống Email (Nodemailer · Gmail SMTP)"
                    subtitle="Cấu hình gửi email tự động — đặt tour, reset mật khẩu, chào mừng nhân viên."
                    icon="mail" iconBg="bg-rose-50" iconColor="text-rose-600"
                    rows={[
                        { icon: 'alternate_email', label: 'Địa chỉ gửi (from)', value: 'Azure Horizon <••••••••@gmail.com>', hint: 'MAIL_USER trong .env' },
                        { icon: 'mail_lock', label: 'Mật khẩu ứng dụng', value: '•••••••••••••••• (Google App Password)', mono: true, hint: 'MAIL_PASS trong .env' },
                    ]}
                />

                {/* Footer */}
                <div className="flex items-center justify-between py-4 px-1 text-xs text-slate-400 border-t border-slate-100">
                    <span>Azure Horizon Admin Console v1.0.0</span>
                    <span className="font-mono">{now.toLocaleString('vi-VN')}</span>
                </div>
            </div>
        </main>
    );
}

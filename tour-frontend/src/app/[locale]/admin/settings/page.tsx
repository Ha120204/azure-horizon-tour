'use client';

import { API_BASE_URL } from '@/lib/http/constants';
import { EditableSection } from './_components/EditableSection';
import { HealthStatusSection } from './_components/HealthStatusSection';
import { InfoSection } from './_components/InfoSection';
import { PANEL_META } from './_lib/config';
import { useSystemSettings } from './_hooks/useSystemSettings';

export default function SystemSettingsPage() {
    const settings = useSystemSettings();

    if (settings.loading) {
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
            {settings.toast && (
                <div className="fixed top-6 right-8 z-50" role="alert" aria-live="assertive" aria-atomic="true">
                    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border ${settings.toast.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <span className={`material-symbols-outlined text-[20px] ${settings.toast.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {settings.toast.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <span className={`text-sm font-semibold ${settings.toast.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>{settings.toast.msg}</span>
                    </div>
                </div>
            )}

            <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-[1.75rem] font-bold text-slate-800 leading-tight">Cài đặt hệ thống</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {settings.editable
                            ? 'Cấu hình thông số vận hành — thay đổi có hiệu lực ngay lập tức.'
                            : 'Xem thông tin cấu hình hệ thống. Chỉ Super Admin được thay đổi.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${settings.editable ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {settings.userRole === 'SUPER_ADMIN' ? 'admin_panel_settings' : settings.userRole === 'ADMIN' ? 'manage_accounts' : 'badge'}
                        </span>
                        {settings.userRole === 'SUPER_ADMIN' ? 'Super Admin' : settings.userRole === 'ADMIN' ? 'Admin — Chỉ xem' : 'Staff — Chỉ xem'}
                    </span>
                    <button
                        onClick={settings.handleManualHealthCheck}
                        disabled={settings.healthLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
                    >
                        <span className={`material-symbols-outlined text-[17px] ${settings.healthLoading ? 'animate-spin' : ''}`}>
                            {settings.healthLoading ? 'progress_activity' : 'refresh'}
                        </span>
                        {settings.healthLoading ? 'Đang kiểm tra' : 'Kiểm tra trạng thái'}
                    </button>
                </div>
            </div>

            {!settings.editable && settings.userRole && (
                <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                    <span className="material-symbols-outlined text-blue-500 text-[20px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                    <div>
                        <p className="text-sm font-bold text-blue-800">Bạn đang ở chế độ chỉ xem</p>
                        <p className="text-sm text-blue-700 mt-0.5">Tài khoản {settings.userRole === 'ADMIN' ? 'Admin' : 'Staff'} không có quyền chỉnh sửa cài đặt hệ thống. Chỉ Super Admin được thực hiện thay đổi.</p>
                    </div>
                </div>
            )}

            <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200/70 bg-white p-2 shadow-sm">
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                        {settings.visiblePanels.map(panel => {
                            const meta = PANEL_META[panel];
                            const active = settings.activePanel === panel;
                            return (
                                <button
                                    key={panel}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => settings.setActivePanel(panel)}
                                    className={`flex min-h-14 items-start gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
                                        active
                                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="material-symbols-outlined mt-0.5 text-[18px]" aria-hidden="true">{meta.icon}</span>
                                    <span className="min-w-0 whitespace-normal break-words">{meta.title}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {settings.activeMeta.kind === 'editable' && (
                    <EditableSection
                        key={`${settings.activePanel}:${(settings.grouped[settings.activePanel] ?? []).map(s => `${s.key}:${s.updatedAt}:${s.value}`).join('|')}`}
                        {...settings.activeMeta}
                        settings={settings.grouped[settings.activePanel] ?? []}
                        editable={settings.editable}
                        onSave={settings.handleSave}
                    />
                )}

                {settings.activePanel === 'runtime' && (
                    <div className="space-y-5">
                        <HealthStatusSection
                            {...settings.activeMeta}
                            health={settings.health}
                            loading={settings.healthLoading}
                            onRefresh={settings.handleManualHealthCheck}
                        />
                        <InfoSection
                            title="Thông tin môi trường"
                            subtitle="Các giá trị tham chiếu để đối chiếu khi kiểm tra vận hành."
                            icon="dns"
                            iconBg="bg-slate-100"
                            iconColor="text-slate-600"
                            rows={settings.runtimeRows}
                        />
                    </div>
                )}

                {settings.activePanel === 'security' && (
                    <InfoSection
                        {...settings.activeMeta}
                        rows={[
                            { icon: 'token', label: 'Cơ chế xác thực', value: 'JWT · Passport.js · HttpOnly Cookie' },
                            { icon: 'timer', label: 'Access Token hết hạn', value: '15 phút', hint: 'JWT_EXPIRES_IN trong .env' },
                            { icon: 'lock_clock', label: 'Refresh Token hết hạn', value: '7 ngày', hint: 'JWT_REFRESH_EXPIRES_IN trong .env' },
                            { icon: 'speed', label: 'Rate Limiting', value: '100 req / 60s / IP (auth routes: 5 req/phút)', hint: 'ThrottlerModule trong app.module.ts' },
                            { icon: 'verified_user', label: 'Phân quyền (RBAC)', value: 'SUPER_ADMIN · ADMIN · STAFF · CUSTOMER' },
                        ]}
                    />
                )}

                {settings.activePanel === 'payment' && (
                    <InfoSection
                        {...settings.activeMeta}
                        rows={[
                            { icon: 'account_balance', label: 'Cổng thanh toán', value: 'PayOS (QR Code · Chuyển khoản ngân hàng)' },
                            { icon: 'vpn_key', label: 'Client ID', value: '••••••••••••••••', mono: true, hint: 'PAYOS_CLIENT_ID trong .env' },
                            { icon: 'key', label: 'API Key', value: '••••••••••••••••', mono: true, hint: 'PAYOS_API_KEY trong .env' },
                            { icon: 'webhook', label: 'Webhook endpoint', value: `${API_BASE_URL}/booking/payos-webhook`, mono: true, hint: 'PayOS POST về đây khi có thanh toán' },
                        ]}
                    />
                )}

                {settings.activePanel === 'email' && (
                    <InfoSection
                        {...settings.activeMeta}
                        rows={[
                            { icon: 'alternate_email', label: 'Địa chỉ gửi (from)', value: 'Azure Horizon <••••••••@gmail.com>', hint: 'MAIL_USER trong .env' },
                            { icon: 'mail_lock', label: 'Mật khẩu ứng dụng', value: '•••••••••••••••• (Google App Password)', mono: true, hint: 'MAIL_PASS trong .env' },
                        ]}
                    />
                )}

                <div className="flex items-center justify-between py-4 px-1 text-xs text-slate-400 border-t border-slate-100">
                    <span>Azure Horizon Admin Console v1.0.0</span>
                    <span className="font-mono">{settings.now.toLocaleString('vi-VN')}</span>
                </div>
            </div>
        </main>
    );
}

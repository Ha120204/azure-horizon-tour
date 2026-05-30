'use client';

import { useState } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

// ── Google G Logo ─────────────────────────────────────────────
const GoogleLogo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="flex-shrink-0">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

// ── Props ──────────────────────────────────────────────────────
type SecurityCardProps = {
    authProvider?: string;        // 'local' | 'google' | 'both'
    email?: string;

    // Change password (local / both)
    currentPassword: string; setCurrentPassword: (v: string) => void;
    newPassword: string;     setNewPassword: (v: string) => void;
    confirmNewPassword: string; setConfirmNewPassword: (v: string) => void;
    isChangingPassword: boolean;
    onChangePassword: (e: React.FormEvent) => void;

    // Callback to refresh userData after setPassword
    onPasswordSet?: () => void;

    t: (key: string) => string;
};

export default function SecurityCard({
    authProvider = 'local',
    email,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmNewPassword, setConfirmNewPassword,
    isChangingPassword,
    onChangePassword,
    onPasswordSet,
    t,
}: SecurityCardProps) {
    const isGoogleOnly = authProvider === 'google';
    const hasLocalPassword = authProvider === 'local' || authProvider === 'both';

    // UI state
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Set-password state (Google users)
    const [setPassNew, setSetPassNew] = useState('');
    const [passConfirmVal, setPassConfirmVal] = useState('');
    const [showSetNew, setShowSetNew] = useState(false);
    const [showSetConfirm, setShowSetConfirm] = useState(false);
    const [isSettingPassword, setIsSettingPassword] = useState(false);
    const [setPassError, setSetPassError] = useState('');
    const [setPassSuccess, setSetPassSuccess] = useState(false);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setSetPassError('');
        if (setPassNew !== passConfirmVal) {
            setSetPassError('Mật khẩu xác nhận không khớp');
            return;
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(setPassNew)) {
            setSetPassError('Mật khẩu tối thiểu 8 ký tự, có chữ hoa, thường, số và ký tự đặc biệt');
            return;
        }
        setIsSettingPassword(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/set-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: setPassNew }),
            });
            if (res.ok) {
                setSetPassSuccess(true);
                setSetPassNew('');
                setPassConfirmVal('');
                setShowPasswordSection(false);
                onPasswordSet?.(); // Refresh userData để authProvider cập nhật → 'both'
            } else {
                const data = await res.json();
                setSetPassError(data.message || 'Có lỗi xảy ra');
            }
        } catch {
            setSetPassError('Lỗi kết nối');
        } finally {
            setIsSettingPassword(false);
        }
    };

    return (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
            {/* ── Header ── */}
            <div className="px-5 py-3.5 border-b border-outline-variant/10 flex items-center gap-2 bg-surface-container-low/40">
                <span className="material-symbols-outlined text-[18px] text-primary">security</span>
                <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
                    Bảo mật & Đăng nhập
                </h3>
            </div>

            <div className="divide-y divide-outline-variant/10">
                {/* ── Row 1: Google ── */}
                <div className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-white border border-outline-variant/20 flex items-center justify-center shadow-sm flex-shrink-0">
                            <GoogleLogo />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface">Google</p>
                            <p className="text-xs text-on-surface-variant truncate">
                                {authProvider === 'google' || authProvider === 'both' ? email : 'Chưa liên kết'}
                            </p>
                        </div>
                    </div>
                    {authProvider === 'google' || authProvider === 'both' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-shrink-0">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            Đã liên kết
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { window.location.href = `${API_BASE_URL}/auth/google`; }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/10 active:scale-95 transition-all flex-shrink-0"
                        >
                            <span className="material-symbols-outlined text-[13px]">add_link</span>
                            Liên kết
                        </button>
                    )}
                </div>

                {/* ── Row 2: Mật khẩu ── */}
                <div className="px-5 py-4">
                    {/* Header row của password section */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-on-surface">Mật khẩu đăng nhập</p>
                                <p className="text-xs text-on-surface-variant">
                                    {isGoogleOnly
                                        ? (setPassSuccess ? 'Đã thiết lập ✓' : 'Chưa thiết lập')
                                        : '••••••••••'}
                                </p>
                            </div>
                        </div>

                        {/* Action button */}
                        {!showPasswordSection && (
                            <button
                                type="button"
                                onClick={() => setShowPasswordSection(true)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/10 active:scale-95 transition-all flex-shrink-0"
                            >
                                <span className="material-symbols-outlined text-[13px]">
                                    {isGoogleOnly ? 'add' : 'edit'}
                                </span>
                                {isGoogleOnly ? 'Tạo mật khẩu' : (hasLocalPassword ? 'Đổi' : '')}
                            </button>
                        )}
                        {showPasswordSection && (
                            <button type="button" onClick={() => setShowPasswordSection(false)} className="text-outline hover:text-error transition-colors">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        )}
                    </div>

                    {/* Google-only: note giải thích */}
                    {isGoogleOnly && !showPasswordSection && !setPassSuccess && (
                        <p className="mt-2 text-xs text-on-surface-variant/70 ml-12 leading-relaxed">
                            Tuỳ chọn — thêm mật khẩu để có thêm cách đăng nhập bằng email.
                        </p>
                    )}

                    {/* ── Form: Tạo mật khẩu (Google-only) ── */}
                    {showPasswordSection && isGoogleOnly && (
                        <form onSubmit={handleSetPassword} className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            {setPassError && (
                                <div className="text-xs text-error bg-error/5 border border-error/20 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px]">error</span>
                                    {setPassError}
                                </div>
                            )}
                            <div className="flex items-center bg-surface-container-low rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary transition-all">
                                <span className="material-symbols-outlined text-outline text-[18px] mr-2 flex-shrink-0">lock</span>
                                <input
                                    type={showSetNew ? 'text' : 'password'}
                                    className="flex-1 bg-transparent border-none outline-none py-3 text-sm"
                                    placeholder="Mật khẩu mới"
                                    value={setPassNew}
                                    onChange={e => setSetPassNew(e.target.value)}
                                    required
                                />
                                <button type="button" onClick={() => setShowSetNew(v => !v)} className="text-outline hover:text-primary">
                                    <span className="material-symbols-outlined text-[18px]">{showSetNew ? 'visibility' : 'visibility_off'}</span>
                                </button>
                            </div>
                            <div className={`flex items-center rounded-lg px-3 focus-within:ring-1 transition-all border ${passConfirmVal && passConfirmVal !== setPassNew ? 'border-error/50 focus-within:ring-error bg-error/5' : 'border-transparent bg-surface-container-low focus-within:ring-primary'}`}>
                                <span className="material-symbols-outlined text-outline text-[18px] mr-2 flex-shrink-0">lock_reset</span>
                                <input
                                    type={showSetConfirm ? 'text' : 'password'}
                                    className="flex-1 bg-transparent border-none outline-none py-3 text-sm"
                                    placeholder="Xác nhận mật khẩu"
                                    value={passConfirmVal}
                                    onChange={e => setPassConfirmVal(e.target.value)}
                                    required
                                />
                                <button type="button" onClick={() => setShowSetConfirm(v => !v)} className="text-outline hover:text-primary">
                                    <span className="material-symbols-outlined text-[18px]">{showSetConfirm ? 'visibility' : 'visibility_off'}</span>
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={isSettingPassword}
                                className="w-full py-3 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-60"
                            >
                                {isSettingPassword ? 'Đang thiết lập...' : 'Thiết lập mật khẩu'}
                            </button>
                        </form>
                    )}

                    {/* ── Form: Đổi mật khẩu (local / both) ── */}
                    {showPasswordSection && hasLocalPassword && (
                        <form onSubmit={onChangePassword} className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Current */}
                            <div className="flex items-center bg-surface-container-low rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary transition-all">
                                <span className="material-symbols-outlined text-outline text-[18px] mr-2 flex-shrink-0">lock</span>
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    className="flex-1 bg-transparent border-none outline-none py-3 text-sm"
                                    placeholder={t('profile.currentPassword') || 'Mật khẩu hiện tại'}
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    required
                                />
                                <button type="button" onClick={() => setShowCurrent(v => !v)} className="text-outline hover:text-primary">
                                    <span className="material-symbols-outlined text-[18px]">{showCurrent ? 'visibility' : 'visibility_off'}</span>
                                </button>
                            </div>
                            {/* New */}
                            <div className="flex items-center bg-surface-container-low rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary transition-all">
                                <span className="material-symbols-outlined text-outline text-[18px] mr-2 flex-shrink-0">lock_open</span>
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    className="flex-1 bg-transparent border-none outline-none py-3 text-sm"
                                    placeholder={t('profile.newPassword') || 'Mật khẩu mới'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                />
                                <button type="button" onClick={() => setShowNew(v => !v)} className="text-outline hover:text-primary">
                                    <span className="material-symbols-outlined text-[18px]">{showNew ? 'visibility' : 'visibility_off'}</span>
                                </button>
                            </div>
                            {/* Confirm */}
                            <div className={`flex items-center rounded-lg px-3 focus-within:ring-1 transition-all border ${confirmNewPassword && confirmNewPassword !== newPassword ? 'border-error/50 bg-error/5 focus-within:ring-error' : 'border-transparent bg-surface-container-low focus-within:ring-primary'}`}>
                                <span className="material-symbols-outlined text-outline text-[18px] mr-2 flex-shrink-0">lock_reset</span>
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    className="flex-1 bg-transparent border-none outline-none py-3 text-sm"
                                    placeholder={t('profile.confirmNewPassword') || 'Xác nhận mật khẩu mới'}
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(e.target.value)}
                                    required
                                />
                                <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-outline hover:text-primary">
                                    <span className="material-symbols-outlined text-[18px]">{showConfirm ? 'visibility' : 'visibility_off'}</span>
                                </button>
                            </div>
                            {confirmNewPassword && confirmNewPassword !== newPassword && (
                                <p className="text-error text-xs flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">error</span>
                                    Mật khẩu xác nhận không khớp
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={isChangingPassword}
                                className="w-full py-3 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-60"
                            >
                                {isChangingPassword ? 'Đang cập nhật...' : (t('profile.updatePasswordBtn') || 'Cập nhật mật khẩu')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

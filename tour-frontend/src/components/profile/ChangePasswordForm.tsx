'use client';

interface ChangePasswordFormProps {
    isVisible: boolean;
    setIsVisible: (v: boolean) => void;
    currentPassword: string;
    setCurrentPassword: (v: string) => void;
    newPassword: string;
    setNewPassword: (v: string) => void;
    confirmNewPassword: string;
    setConfirmNewPassword: (v: string) => void;
    showCurrentPassword: boolean;
    setShowCurrentPassword: (v: boolean) => void;
    showNewPassword: boolean;
    setShowNewPassword: (v: boolean) => void;
    showConfirmNewPassword: boolean;
    setShowConfirmNewPassword: (v: boolean) => void;
    isChangingPassword: boolean;
    onSubmit: (e: React.FormEvent) => void;
    t: (key: string) => string;
}

export default function ChangePasswordForm({
    isVisible,
    setIsVisible,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmNewPassword, setConfirmNewPassword,
    showCurrentPassword, setShowCurrentPassword,
    showNewPassword, setShowNewPassword,
    showConfirmNewPassword, setShowConfirmNewPassword,
    isChangingPassword,
    onSubmit,
    t,
}: ChangePasswordFormProps) {
    return (
        <div className="space-y-6">
            {!isVisible ? (
                <button
                    onClick={() => setIsVisible(true)}
                    type="button"
                    className="w-full py-3.5 bg-surface-container-low text-on-surface rounded-full font-headline font-bold text-sm hover:bg-outline-variant/20 transition-colors active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">lock</span>
                    {t('profile.changePassword') || 'Thay đổi mật khẩu'}
                </button>
            ) : (
                <form className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300" onSubmit={onSubmit}>
                    <div className="flex items-center justify-between px-1 mb-2">
                        <h3 className="text-[14px] font-headline font-bold text-on-surface uppercase tracking-wider">{t('profile.changePassword') || 'Thay đổi mật khẩu'}</h3>
                        <button type="button" onClick={() => setIsVisible(false)} className="text-outline hover:text-error transition-colors flex items-center">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.currentPassword') || 'Mật khẩu hiện tại'}</label>
                        <div className="flex items-center bg-surface-container-low rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all">
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                className="w-full bg-transparent border-none outline-none py-3 text-sm"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="text-slate-400 hover:text-primary">
                                <span className="material-symbols-outlined text-xl">{showCurrentPassword ? 'visibility' : 'visibility_off'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.newPassword') || 'Mật khẩu mới'}</label>
                        <div className="flex items-center bg-surface-container-low rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                className="w-full bg-transparent border-none outline-none py-3 text-sm"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="text-slate-400 hover:text-primary">
                                <span className="material-symbols-outlined text-xl">{showNewPassword ? 'visibility' : 'visibility_off'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.confirmNewPassword') || 'Xác nhận mật khẩu mới'}</label>
                        <div className={`flex items-center rounded-lg px-3 focus-within:ring-1 transition-all border ${confirmNewPassword && confirmNewPassword !== newPassword ? 'border-error/50 focus-within:ring-error bg-error/5 focus-within:bg-error/10' : 'border-transparent bg-surface-container-low focus-within:ring-primary focus-within:bg-white'}`}>
                            <input
                                type={showConfirmNewPassword ? 'text' : 'password'}
                                className={`w-full bg-transparent border-none outline-none py-3 text-sm ${confirmNewPassword && confirmNewPassword !== newPassword ? 'text-error' : ''}`}
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className={`text-slate-400 hover:text-primary ${confirmNewPassword && confirmNewPassword !== newPassword ? 'text-error/70 hover:text-error' : ''}`}>
                                <span className="material-symbols-outlined text-xl">{showConfirmNewPassword ? 'visibility' : 'visibility_off'}</span>
                            </button>
                        </div>
                        {confirmNewPassword && confirmNewPassword !== newPassword && (
                            <p className="text-error text-xs flex items-center gap-1 mt-1">
                                <span className="material-symbols-outlined text-[14px]">error</span>
                                {t('profile.passwordNotMatch') || 'Passwords do not match'}
                            </p>
                        )}
                    </div>

                    <button disabled={isChangingPassword} type="submit" className={`w-full py-3.5 bg-primary text-white rounded-full font-headline font-bold text-sm shadow-md hover:opacity-90 transition-opacity active:scale-95 ${isChangingPassword ? 'opacity-70 cursor-not-allowed' : ''}`}>
                        {isChangingPassword ? '...' : (t('profile.updatePasswordBtn') || 'Cập nhật mật khẩu')}
                    </button>
                </form>
            )}
        </div>
    );
}

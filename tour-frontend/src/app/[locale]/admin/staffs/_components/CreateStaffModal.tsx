'use client';

import type React from 'react';
import type { StaffCreateForm } from '../_lib/types';

interface CreateStaffModalProps {
    createTitle: string;
    createDescription: string;
    createButtonLabel: string;
    createForm: StaffCreateForm;
    confirmPassword: string;
    showPassword: boolean;
    showConfirmPassword: boolean;
    isCreating: boolean;
    createErrors: Record<string, string>;
    onClose: () => void;
    onCreate: () => void;
    setCreateForm: React.Dispatch<React.SetStateAction<StaffCreateForm>>;
    setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
    setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
    setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
    setCreateErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function CreateStaffModal({
    createTitle,
    createDescription,
    createButtonLabel,
    createForm,
    confirmPassword,
    showPassword,
    showConfirmPassword,
    isCreating,
    createErrors,
    onClose,
    onCreate,
    setCreateForm,
    setConfirmPassword,
    setShowPassword,
    setShowConfirmPassword,
    setCreateErrors,
}: CreateStaffModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="create-dialog-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-slide-up">
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
                    <div className="relative z-[1] px-8 py-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-xl">person_add</span>
                            </div>
                            <div>
                                <h2 id="create-dialog-title" className="text-lg font-bold text-white">{createTitle}</h2>
                                <p className="text-white/60 text-xs mt-0.5">{createDescription}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Đóng form tạo tài khoản"
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
                        </button>
                    </div>
                </div>

                <div className="px-8 py-6 space-y-4">
                    <div>
                        <label htmlFor="create-name" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                            Họ tên <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">badge</span>
                            <input
                                id="create-name"
                                type="text"
                                value={createForm.fullName}
                                onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                                placeholder="Nguyễn Văn A"
                                className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${createErrors.fullName ? 'border-red-400' : 'border-outline-variant/15'}`}
                            />
                        </div>
                        {createErrors.fullName && <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.fullName}</p>}
                    </div>

                    <div>
                        <label htmlFor="create-email" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">mail</span>
                            <input
                                id="create-email"
                                type="email"
                                value={createForm.email}
                                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="email@example.com"
                                className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${createErrors.email ? 'border-red-400' : 'border-outline-variant/15'}`}
                            />
                        </div>
                        {createErrors.email && <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="create-password" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                            Mật khẩu <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">lock</span>
                            <input
                                id="create-password"
                                type={showPassword ? 'text' : 'password'}
                                value={createForm.password}
                                onChange={e => { setCreateForm(f => ({ ...f, password: e.target.value })); setCreateErrors(e2 => ({ ...e2, password: '' })); }}
                                placeholder="Nhập mật khẩu"
                                className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-11 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${createErrors.password ? 'border-red-400' : 'border-outline-variant/15'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{showPassword ? 'visibility' : 'visibility_off'}</span>
                            </button>
                        </div>
                        {createErrors.password && <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.password}</p>}
                        <div className="mt-2 p-3 bg-surface-container-low/50 border border-outline-variant/10 rounded-xl">
                            <p className="text-[11px] font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">info</span>
                                Yêu cầu mật khẩu:
                            </p>
                            <ul className="text-[11px] text-on-surface-variant/80 space-y-0.5 pl-4">
                                <li className={`flex items-center gap-1.5 ${createForm.password.length >= 8 ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]">{createForm.password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    Ít nhất 8 ký tự
                                </li>
                                <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]">{/[A-Z]/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    Ít nhất 1 chữ in hoa (A-Z)
                                </li>
                                <li className={`flex items-center gap-1.5 ${/[a-z]/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]">{/[a-z]/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    Ít nhất 1 chữ in thường (a-z)
                                </li>
                                <li className={`flex items-center gap-1.5 ${/\d/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]">{/\d/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    Ít nhất 1 chữ số (0-9)
                                </li>
                                <li className={`flex items-center gap-1.5 ${/[@$!%*?&]/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]">{/[@$!%*?&]/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    Ít nhất 1 ký tự đặc biệt (@$!%*?&)
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="create-confirm-password" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                            Xác nhận mật khẩu <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className={`material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none ${confirmPassword && confirmPassword !== createForm.password ? 'text-red-500' : 'text-on-surface-variant'}`}>lock_reset</span>
                            <input
                                id="create-confirm-password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => { setConfirmPassword(e.target.value); setCreateErrors(e2 => ({ ...e2, confirmPassword: '' })); }}
                                placeholder="Nhập lại mật khẩu"
                                className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-11 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${(createErrors.confirmPassword || (confirmPassword && confirmPassword !== createForm.password)) ? 'border-red-400' : 'border-outline-variant/15'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(v => !v)}
                                aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{showConfirmPassword ? 'visibility' : 'visibility_off'}</span>
                            </button>
                        </div>
                        {confirmPassword && confirmPassword !== createForm.password && (
                            <p className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">error</span>
                                Mật khẩu xác nhận không khớp
                            </p>
                        )}
                        {confirmPassword && confirmPassword === createForm.password && createForm.password && (
                            <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                Mật khẩu khớp
                            </p>
                        )}
                        {createErrors.confirmPassword && <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.confirmPassword}</p>}
                    </div>

                    <div className="mt-4 pt-4 border-t border-outline-variant/15 flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={createForm.sendEmail}
                                    onChange={(e) => setCreateForm(f => ({ ...f, sendEmail: e.target.checked }))}
                                    className="appearance-none w-5 h-5 border-2 border-outline-variant rounded bg-surface-container-low checked:bg-primary checked:border-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none peer"
                                />
                                <span className="material-symbols-outlined absolute text-[16px] text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                            </div>
                            <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                                Gửi thông tin đăng nhập qua Email này
                            </span>
                        </label>
                    </div>
                </div>

                <div className="px-8 pb-7 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onCreate}
                        disabled={isCreating}
                        className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        {isCreating ? (
                            <>
                                <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                                Đang tạo…
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-base" aria-hidden="true">person_add</span>
                                {createButtonLabel}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

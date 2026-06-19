'use client';

import { useEffect, useRef } from 'react';
import type React from 'react';
import type { StaffCreateForm } from '../_lib/types';
import { useAccessibleDialog } from '../_hooks/useAccessibleDialog';

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
    const nameInputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useAccessibleDialog({
        onClose,
        canClose: !isCreating,
        initialFocusRef: nameInputRef,
    });
    const errorSignature = Object.entries(createErrors)
        .filter(([, message]) => Boolean(message))
        .map(([field]) => field)
        .join(',');

    useEffect(() => {
        const firstInvalidField = dialogRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        firstInvalidField?.focus();
    }, [dialogRef, errorSignature]);

    return (
        <div
            ref={dialogRef}
            data-accessible-dialog="true"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-dialog-title"
            aria-describedby="create-dialog-description"
            aria-busy={isCreating}
        >
            <div className="pointer-events-none absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            <form
                onSubmit={event => {
                    event.preventDefault();
                    onCreate();
                }}
                className="relative max-h-[calc(100dvh-0.75rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-surface-container-lowest shadow-2xl animate-fade-slide-up sm:max-h-[calc(100vh-2rem)] sm:rounded-3xl"
            >
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
                    <div className="relative z-[1] flex items-center justify-between px-4 py-5 sm:px-8 sm:py-6">
                        <div className="flex items-center gap-3">
                            <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm sm:flex">
                                <span className="material-symbols-outlined text-white text-xl" aria-hidden="true">person_add</span>
                            </div>
                            <div>
                                <h2 id="create-dialog-title" className="text-lg font-bold text-white">{createTitle}</h2>
                                <p id="create-dialog-description" className="text-white/60 text-xs mt-0.5">{createDescription}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isCreating}
                            aria-label="Đóng form tạo tài khoản"
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4 px-4 py-5 sm:px-8 sm:py-6">
                    <div>
                        <label htmlFor="create-name" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                            Họ tên <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none" aria-hidden="true">badge</span>
                            <input
                                ref={nameInputRef}
                                id="create-name"
                                name="fullName"
                                type="text"
                                autoComplete="off"
                                required
                                aria-invalid={Boolean(createErrors.fullName)}
                                aria-describedby={createErrors.fullName ? 'create-name-error' : undefined}
                                value={createForm.fullName}
                                onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                                placeholder="Nguyễn Văn A"
                                className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${createErrors.fullName ? 'border-red-400' : 'border-outline-variant/15'}`}
                            />
                        </div>
                        {createErrors.fullName && <p id="create-name-error" role="alert" className="mt-1 text-xs text-red-500 font-medium">{createErrors.fullName}</p>}
                    </div>

                    <div>
                        <label htmlFor="create-email" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none" aria-hidden="true">mail</span>
                            <input
                                id="create-email"
                                name="email"
                                type="email"
                                autoComplete="off"
                                spellCheck={false}
                                required
                                aria-invalid={Boolean(createErrors.email)}
                                aria-describedby={createErrors.email ? 'create-email-error' : undefined}
                                value={createForm.email}
                                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="email@example.com"
                                className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${createErrors.email ? 'border-red-400' : 'border-outline-variant/15'}`}
                            />
                        </div>
                        {createErrors.email && <p id="create-email-error" role="alert" className="mt-1 text-xs text-red-500 font-medium">{createErrors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="create-password" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                            Mật khẩu <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none" aria-hidden="true">lock</span>
                            <input
                                id="create-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                aria-invalid={Boolean(createErrors.password)}
                                aria-describedby={createErrors.password ? 'create-password-error create-password-requirements' : 'create-password-requirements'}
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
                        {createErrors.password && <p id="create-password-error" role="alert" className="mt-1 text-xs text-red-500 font-medium">{createErrors.password}</p>}
                        <div id="create-password-requirements" className="mt-2 p-3 bg-surface-container-low/50 border border-outline-variant/10 rounded-xl">
                            <p className="text-[11px] font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">info</span>
                                Yêu cầu mật khẩu:
                            </p>
                            <ul className="text-[11px] text-on-surface-variant/80 space-y-0.5 pl-4">
                                <li className={`flex items-center gap-1.5 ${createForm.password.length >= 8 ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{createForm.password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    <span className="sr-only">{createForm.password.length >= 8 ? 'Đã đạt: ' : 'Chưa đạt: '}</span>
                                    Ít nhất 8 ký tự
                                </li>
                                <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{/[A-Z]/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    <span className="sr-only">{/[A-Z]/.test(createForm.password) ? 'Đã đạt: ' : 'Chưa đạt: '}</span>
                                    Ít nhất 1 chữ in hoa (A-Z)
                                </li>
                                <li className={`flex items-center gap-1.5 ${/[a-z]/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{/[a-z]/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    <span className="sr-only">{/[a-z]/.test(createForm.password) ? 'Đã đạt: ' : 'Chưa đạt: '}</span>
                                    Ít nhất 1 chữ in thường (a-z)
                                </li>
                                <li className={`flex items-center gap-1.5 ${/\d/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{/\d/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    <span className="sr-only">{/\d/.test(createForm.password) ? 'Đã đạt: ' : 'Chưa đạt: '}</span>
                                    Ít nhất 1 chữ số (0-9)
                                </li>
                                <li className={`flex items-center gap-1.5 ${/[@$!%*?&]/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                    <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{/[@$!%*?&]/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    <span className="sr-only">{/[@$!%*?&]/.test(createForm.password) ? 'Đã đạt: ' : 'Chưa đạt: '}</span>
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
                            <span className={`material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none ${confirmPassword && confirmPassword !== createForm.password ? 'text-red-500' : 'text-on-surface-variant'}`} aria-hidden="true">lock_reset</span>
                            <input
                                id="create-confirm-password"
                                name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                aria-invalid={Boolean(createErrors.confirmPassword || (confirmPassword && confirmPassword !== createForm.password))}
                                aria-describedby={(createErrors.confirmPassword || confirmPassword) ? 'create-confirm-password-status' : undefined}
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
                            <p id="create-confirm-password-status" role="alert" className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">error</span>
                                Mật khẩu xác nhận không khớp
                            </p>
                        )}
                        {confirmPassword && confirmPassword === createForm.password && createForm.password && (
                            <p id="create-confirm-password-status" aria-live="polite" className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">check_circle</span>
                                Mật khẩu khớp
                            </p>
                        )}
                        {createErrors.confirmPassword && !confirmPassword && <p id="create-confirm-password-status" role="alert" className="mt-1 text-xs text-red-500 font-medium">{createErrors.confirmPassword}</p>}
                    </div>

                    <div className="mt-4 pt-4 border-t border-outline-variant/15 flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center justify-center">
                                <input
                                    name="sendEmail"
                                    type="checkbox"
                                    checked={createForm.sendEmail}
                                    onChange={(e) => setCreateForm(f => ({ ...f, sendEmail: e.target.checked }))}
                                    className="appearance-none w-5 h-5 border-2 border-outline-variant rounded bg-surface-container-low checked:bg-primary checked:border-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none peer"
                                />
                                <span className="material-symbols-outlined absolute text-[16px] text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" aria-hidden="true">check</span>
                            </div>
                            <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                                Gửi thông tin đăng nhập qua email này
                            </span>
                        </label>
                    </div>
                </div>

                <div className="sticky bottom-0 flex gap-3 border-t border-outline-variant/10 bg-surface-container-lowest px-4 py-4 sm:static sm:justify-end sm:border-0 sm:px-8 sm:pb-7 sm:pt-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isCreating}
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none sm:px-6"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none sm:px-6"
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
            </form>
        </div>
    );
}

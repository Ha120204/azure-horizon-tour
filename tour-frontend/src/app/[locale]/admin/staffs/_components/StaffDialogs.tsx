'use client';

import { useRef } from 'react';
import { roleConfig } from '../_lib/config';
import type { BulkStatusAction, User } from '../_lib/types';
import { useAccessibleDialog } from '../_hooks/useAccessibleDialog';

interface StaffRoleDialogProps {
    user: User;
    newRole: string;
    isUpdating: boolean;
    onRoleChange: (role: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}

export function StaffRoleDialog({ user, newRole, isUpdating, onRoleChange, onCancel, onConfirm }: StaffRoleDialogProps) {
    const dialogRef = useAccessibleDialog({ onClose: onCancel, canClose: !isUpdating });

    return (
        <div
            ref={dialogRef}
            data-accessible-dialog="true"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-dialog-title"
            aria-describedby="role-dialog-description"
            aria-busy={isUpdating}
            onMouseDown={event => {
                if (event.target === event.currentTarget && !isUpdating) onCancel();
            }}
        >
            <div className="pointer-events-none absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:mx-4 sm:rounded-2xl">
                <div className="p-5 sm:p-7">
                    <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-5">
                        <span className="material-symbols-outlined text-violet-600 text-2xl" aria-hidden="true">admin_panel_settings</span>
                    </div>
                    <h2 id="role-dialog-title" className="text-lg font-bold text-on-surface mb-1">Đổi quyền tài khoản</h2>
                    <p id="role-dialog-description" className="text-on-surface-variant text-sm mb-5">
                        Đổi quyền cho <strong className="text-on-surface">{user.fullName}</strong>
                    </p>

                    <div className="space-y-2">
                        {Object.entries(roleConfig).filter(([key]) => key !== 'SUPER_ADMIN').map(([key, cfg]) => (
                            <label
                                key={key}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border-2 ${newRole === key
                                    ? 'border-primary bg-primary/5'
                                    : 'border-transparent hover:bg-surface-container-low'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value={key}
                                    checked={newRole === key}
                                    onChange={() => onRoleChange(key)}
                                    className="accent-primary w-4 h-4"
                                />
                                <span className={`material-symbols-outlined text-lg ${cfg.text}`} aria-hidden="true">{cfg.icon}</span>
                                <span className="text-sm font-medium text-on-surface">{cfg.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex gap-3 px-5 pb-5 sm:justify-end sm:px-7 sm:pb-6">
                    <button
                        onClick={onCancel}
                        disabled={isUpdating}
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none sm:px-6"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isUpdating || newRole === user.role}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none sm:px-6"
                    >
                        {isUpdating ? (
                            <>
                                <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                                Đang cập nhật…
                            </>
                        ) : (
                            'Xác nhận'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface StaffToggleStatusDialogProps {
    user: User;
    isToggling: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export function StaffToggleStatusDialog({ user, isToggling, onCancel, onConfirm }: StaffToggleStatusDialogProps) {
    const isActive = user.status === 'Active';
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useAccessibleDialog({
        onClose: onCancel,
        canClose: !isToggling,
        initialFocusRef: cancelButtonRef,
    });

    return (
        <div
            ref={dialogRef}
            data-accessible-dialog="true"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="toggle-dialog-title"
            aria-describedby="toggle-dialog-description"
            aria-busy={isToggling}
            onMouseDown={event => {
                if (event.target === event.currentTarget && !isToggling) onCancel();
            }}
        >
            <div className="pointer-events-none absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:mx-4 sm:rounded-2xl">
                <div className="p-5 sm:p-7">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${isActive ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                        <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-red-600' : 'text-emerald-600'}`} aria-hidden="true">
                            {isActive ? 'person_off' : 'how_to_reg'}
                        </span>
                    </div>
                    <h2 id="toggle-dialog-title" className="text-lg font-bold text-on-surface mb-2">
                        {isActive ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?'}
                    </h2>
                    <p id="toggle-dialog-description" className="text-on-surface-variant text-sm leading-relaxed">
                        {isActive ? (
                            <>Tài khoản <strong className="text-on-surface">&quot;{user.fullName}&quot;</strong> sẽ bị vô hiệu hóa và không thể đăng nhập cho đến khi được kích hoạt lại.</>
                        ) : (
                            <>Tài khoản <strong className="text-on-surface">&quot;{user.fullName}&quot;</strong> sẽ được kích hoạt lại và có thể đăng nhập bình thường.</>
                        )}
                    </p>
                </div>
                <div className="flex gap-3 px-5 pb-5 sm:justify-end sm:px-7 sm:pb-6">
                    <button
                        ref={cancelButtonRef}
                        onClick={onCancel}
                        disabled={isToggling}
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none sm:px-6"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isToggling}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 sm:flex-none sm:px-6 ${isActive
                            ? 'bg-red-600 text-white hover:opacity-90 focus-visible:ring-red-500'
                            : 'bg-emerald-600 text-white hover:opacity-90 focus-visible:ring-emerald-500'
                            }`}
                    >
                        {isToggling ? (
                            <>
                                <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                                Đang xử lý…
                            </>
                        ) : (
                            isActive ? 'Vô hiệu hóa' : 'Kích hoạt'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface StaffBulkStatusDialogProps {
    status: BulkStatusAction;
    count: number;
    itemLabel: string;
    isUpdating: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export function StaffBulkStatusDialog({
    status,
    count,
    itemLabel,
    isUpdating,
    onCancel,
    onConfirm,
}: StaffBulkStatusDialogProps) {
    const isActivating = status === 'active';
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useAccessibleDialog({
        onClose: onCancel,
        canClose: !isUpdating,
        initialFocusRef: cancelButtonRef,
    });

    return (
        <div
            ref={dialogRef}
            data-accessible-dialog="true"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bulk-status-dialog-title"
            aria-describedby="bulk-status-dialog-description"
            aria-busy={isUpdating}
            onMouseDown={event => {
                if (event.target === event.currentTarget && !isUpdating) onCancel();
            }}
        >
            <div className="pointer-events-none absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:mx-4 sm:rounded-2xl">
                <div className="p-5 sm:p-7">
                    <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${isActivating ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        <span className={`material-symbols-outlined text-2xl ${isActivating ? 'text-emerald-600' : 'text-red-600'}`} aria-hidden="true">
                            {isActivating ? 'how_to_reg' : 'person_off'}
                        </span>
                    </div>
                    <h2 id="bulk-status-dialog-title" className="mb-2 text-lg font-bold text-on-surface">
                        {isActivating ? `Kích hoạt ${count} ${itemLabel}?` : `Vô hiệu hóa ${count} ${itemLabel}?`}
                    </h2>
                    <p id="bulk-status-dialog-description" className="text-sm leading-relaxed text-on-surface-variant">
                        {isActivating
                            ? `Các tài khoản đã chọn sẽ có thể đăng nhập trở lại.`
                            : `Các tài khoản đã chọn sẽ bị vô hiệu hóa và phiên đăng nhập hiện tại sẽ bị thu hồi.`}
                    </p>
                </div>
                <div className="flex gap-3 px-5 pb-5 sm:justify-end sm:px-7 sm:pb-6">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        onClick={onCancel}
                        disabled={isUpdating}
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none sm:px-6"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isUpdating}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 sm:flex-none sm:px-6 ${
                            isActivating
                                ? 'bg-emerald-600 text-white hover:opacity-90 focus-visible:ring-emerald-500'
                                : 'bg-red-600 text-white hover:opacity-90 focus-visible:ring-red-500'
                        }`}
                    >
                        {isUpdating ? (
                            <>
                                <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                                Đang xử lý…
                            </>
                        ) : (
                            isActivating ? 'Kích hoạt' : 'Vô hiệu hóa'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

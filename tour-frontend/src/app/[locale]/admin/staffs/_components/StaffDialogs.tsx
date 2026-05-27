'use client';

import { roleConfig } from '../_lib/config';
import type { User } from '../_lib/types';

interface StaffRoleDialogProps {
    user: User;
    newRole: string;
    isUpdating: boolean;
    onRoleChange: (role: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}

export function StaffRoleDialog({ user, newRole, isUpdating, onRoleChange, onCancel, onConfirm }: StaffRoleDialogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-7">
                    <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-5">
                        <span className="material-symbols-outlined text-violet-600 text-2xl" aria-hidden="true">admin_panel_settings</span>
                    </div>
                    <h2 id="role-dialog-title" className="text-lg font-bold text-on-surface mb-1">Đổi Role</h2>
                    <p className="text-on-surface-variant text-sm mb-5">
                        Đổi quyền cho <strong className="text-on-surface">{user.fullName}</strong>
                    </p>

                    <div className="space-y-2">
                        {Object.entries(roleConfig).filter(([key]) => key !== 'SUPER_ADMIN').map(([key, cfg]) => (
                            <label
                                key={key}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${newRole === key
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
                                <span className={`material-symbols-outlined text-lg ${cfg.text}`}>{cfg.icon}</span>
                                <span className="text-sm font-medium text-on-surface">{cfg.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="px-7 pb-6 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isUpdating || newRole === user.role}
                        className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="alertdialog" aria-modal="true" aria-labelledby="toggle-dialog-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-7">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${isActive ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                        <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-red-600' : 'text-emerald-600'}`} aria-hidden="true">
                            {isActive ? 'person_off' : 'how_to_reg'}
                        </span>
                    </div>
                    <h2 id="toggle-dialog-title" className="text-lg font-bold text-on-surface mb-2">
                        {isActive ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?'}
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                        {isActive ? (
                            <>Tài khoản <strong className="text-on-surface">&quot;{user.fullName}&quot;</strong> sẽ bị vô hiệu hóa và không thể đăng nhập cho đến khi được kích hoạt lại.</>
                        ) : (
                            <>Tài khoản <strong className="text-on-surface">&quot;{user.fullName}&quot;</strong> sẽ được kích hoạt lại và có thể đăng nhập bình thường.</>
                        )}
                    </p>
                </div>
                <div className="px-7 pb-6 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isToggling}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 outline-none ${isActive
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

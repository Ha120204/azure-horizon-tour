import type { User } from '../_lib/types';

interface ToggleStatusDialogProps {
    user: User;
    isToggling: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export function ToggleStatusDialog({ user, isToggling, onCancel, onConfirm }: ToggleStatusDialogProps) {
    const isActive = user.status === 'Active';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" role="alertdialog" aria-modal="true" aria-labelledby="toggle-dialog-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-slide-up">
                <div className="p-7">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${isActive ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                        <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-red-600' : 'text-emerald-600'}`} aria-hidden="true">
                            {isActive ? 'block' : 'lock_open'}
                        </span>
                    </div>
                    <h2 id="toggle-dialog-title" className="text-lg font-bold text-on-surface mb-2">
                        {isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                        {isActive ? (
                            <>Tài khoản <strong className="text-on-surface">&quot;{user.fullName}&quot;</strong> sẽ bị khóa và không thể đăng nhập cho đến khi được mở khóa lại.</>
                        ) : (
                            <>Tài khoản <strong className="text-on-surface">&quot;{user.fullName}&quot;</strong> sẽ được mở khóa và có thể đăng nhập bình thường.</>
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
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 outline-none ${
                            isActive
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
                            isActive ? 'Khóa tài khoản' : 'Mở khóa'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

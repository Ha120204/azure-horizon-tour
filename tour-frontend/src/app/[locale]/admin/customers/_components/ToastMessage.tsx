import type { ToastState } from '../_lib/types';

export function ToastMessage({ toast }: { toast: ToastState }) {
    return (
        <div
            role="status"
            className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
        >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
            {toast.message}
        </div>
    );
}

import type { ToastState } from '../_lib/types';

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const colors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };
    const iconColors = { success: 'text-emerald-500', error: 'text-red-500', info: 'text-blue-500' };
    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl shadow-slate-200/50 animate-in slide-in-from-bottom-4 duration-300 max-w-sm ${colors[toast.type]}`}>
            <span className={`material-symbols-outlined text-xl flex-shrink-0 ${iconColors[toast.type]}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {icons[toast.type]}
            </span>
            <p className="text-sm font-semibold flex-1">{toast.message}</p>
            <button onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity ml-1">
                <span className="material-symbols-outlined text-base">close</span>
            </button>
        </div>
    );
}

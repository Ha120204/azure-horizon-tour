import { useEffect, useState } from 'react';
import type { ToastState } from '../_lib/types';

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // trigger entrance animation
        const tid = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(tid);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        setTimeout(onDismiss, 250);
    };

    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const styles = {
        success: {
            wrap: 'bg-white border-emerald-200 shadow-emerald-100',
            icon: 'text-emerald-500',
            bar: 'bg-emerald-500',
            text: 'text-slate-800',
        },
        error: {
            wrap: 'bg-white border-red-200 shadow-red-100',
            icon: 'text-red-500',
            bar: 'bg-red-500',
            text: 'text-slate-800',
        },
        info: {
            wrap: 'bg-white border-blue-200 shadow-blue-100',
            icon: 'text-blue-500',
            bar: 'bg-blue-500',
            text: 'text-slate-800',
        },
    };

    const s = styles[toast.type];

    return (
        <div
            className={`fixed bottom-6 right-6 z-[100] max-w-sm w-full transition-all duration-250 ease-out ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
        >
            <div
                className={`relative flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-xl overflow-hidden ${s.wrap}`}
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
            >
                {/* Accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${s.bar}`} />

                <span
                    className={`material-symbols-outlined text-xl flex-shrink-0 mt-0.5 ${s.icon}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    {icons[toast.type]}
                </span>
                <p className={`text-sm font-semibold flex-1 ${s.text}`}>{toast.message}</p>
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors ml-1"
                >
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            </div>
        </div>
    );
}

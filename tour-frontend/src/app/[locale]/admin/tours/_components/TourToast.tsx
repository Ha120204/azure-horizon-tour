'use client';

import type { ToastState } from '../_lib/types';

interface TourToastProps {
    toast: ToastState | null;
}

export function TourToast({ toast }: TourToastProps) {
    return (
        <>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {toast?.message}
            </div>
            {toast && (
                <div
                    role="status"
                    className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.type === 'error' ? 'bg-error text-on-error' : 'bg-tertiary text-on-tertiary'}`}
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                    {toast.message}
                </div>
            )}
        </>
    );
}

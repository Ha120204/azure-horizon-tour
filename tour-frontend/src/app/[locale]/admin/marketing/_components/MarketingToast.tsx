import type { ToastState } from '../_lib/types';

interface MarketingToastProps {
  toast: ToastState | null;
}

export function MarketingToast({ toast }: MarketingToastProps) {
  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.message}</div>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-5 py-4 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-3 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          {toast.message}
        </div>
      )}
    </>
  );
}

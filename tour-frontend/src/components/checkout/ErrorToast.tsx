'use client';

interface ErrorToastProps {
    message: string;
    onClose: () => void;
    t: (key: string) => string;
    title?: string;
}

export default function ErrorToast({ message, onClose, t, title }: ErrorToastProps) {
    if (!message) return null;

    return (
        <div className="fixed top-24 left-4 right-4 sm:left-auto sm:right-8 z-[100] animate-modalSlideUp">
            <div className="bg-white border-l-4 border-error shadow-2xl rounded-xl px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 sm:max-w-md ml-auto">
                <div className="w-10 h-10 shrink-0 rounded-full bg-error/10 flex items-center justify-center text-error border-2 border-error/20">
                    <span className="material-symbols-outlined text-2xl">priority_high</span>
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-800 font-headline uppercase tracking-wide">{title || t('checkout.infoError')}</h4>
                    <p className="text-[13px] text-slate-500 mt-1 leading-snug">{message}</p>
                </div>
                <button onClick={onClose} className="ml-1 shrink-0 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors w-9 h-9 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm font-bold">close</span>
                </button>
            </div>
        </div>
    );
}

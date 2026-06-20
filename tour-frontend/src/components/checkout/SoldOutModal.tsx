'use client';

interface SoldOutModalProps {
    isOpen: boolean;
    availableSeats: number;
    onChooseOther: () => void;
    onClose: () => void;
    t: (key: string, params?: Record<string, string | number | Date>) => string;
}

export default function SoldOutModal({
    isOpen,
    availableSeats,
    onChooseOther,
    onClose,
    t,
}: SoldOutModalProps) {
    if (!isOpen) return null;

    const description =
        availableSeats > 0
            ? t('checkout.soldOut.descRemaining', { seats: availableSeats })
            : t('checkout.soldOut.descZero');

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[3px] sm:p-4">
            <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/80 bg-surface-container-lowest shadow-[0_28px_80px_rgba(15,23,42,0.28)] animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200">
                <div className="px-6 py-7 text-center sm:px-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error ring-1 ring-error/15">
                        <span className="material-symbols-outlined text-[30px]">event_busy</span>
                    </div>
                    <h3 className="mt-5 font-headline text-xl font-extrabold tracking-tight text-on-surface sm:text-2xl">
                        {t('checkout.soldOut.title')}
                    </h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-on-surface-variant">
                        {description}
                    </p>

                    <div className="mt-7 grid gap-3">
                        <button
                            type="button"
                            onClick={onChooseOther}
                            className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-container active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                            <span>{t('checkout.soldOut.chooseOther')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-outline-variant/30 bg-white px-6 py-3 text-sm font-extrabold text-on-surface transition-all hover:bg-surface-container active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {t('checkout.soldOut.close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

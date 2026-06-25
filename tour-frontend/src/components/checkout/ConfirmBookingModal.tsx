'use client';

import { useLocale } from '@/context/LocaleContext';

interface Passenger {
    type: string;
    fullName: string;
}

interface ContactInfo {
    fullName: string;
    email: string;
    phone: string;
    identityType: string;
    identityNo: string;
}

interface LeadTraveler {
    fullName: string;
}

interface ConfirmTourData {
    name: string;
    startDate: string;
    duration: string;
}

interface ConfirmPackage {
    name: string;
}

interface ConfirmBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    contactInfo: ContactInfo;
    leadTraveler: LeadTraveler;
    passengers: Passenger[];
    tourData: ConfirmTourData | null;
    selectedPackage: ConfirmPackage | null;
    departureDate?: string | null;
    adultCount: number;
    childCount: number;
    infantCount: number;
    prices: { 'Adult (12+)': number; 'Child (4-11)': number; 'Infant (<4)': number };
    subtotal: number;
    discountAmount: number;
    totalPrice: number;
    t: (key: string, params?: Record<string, string | number | Date>) => string;
}

function getPassengerTypeLabel(type: string, t: ConfirmBookingModalProps['t']) {
    if (type === 'Adult (12+)') return t('checkout.adultLabel');
    if (type === 'Child (4-11)') return t('checkout.childLabel');
    return t('checkout.infantLabel');
}

export default function ConfirmBookingModal({
    isOpen,
    onClose,
    onConfirm,
    contactInfo,
    leadTraveler,
    passengers,
    tourData,
    selectedPackage,
    departureDate,
    adultCount,
    childCount,
    infantCount,
    prices,
    subtotal,
    discountAmount,
    totalPrice,
    t,
}: ConfirmBookingModalProps) {
    const { formatDate, formatPrice } = useLocale();

    if (!isOpen) return null;

    const dateToShow = departureDate ?? tourData?.startDate;
    const priceRows = [
        { key: 'adult', label: t('checkout.adultX'), count: adultCount, amount: adultCount * prices['Adult (12+)'] },
        { key: 'child', label: t('checkout.childX'), count: childCount, amount: childCount * prices['Child (4-11)'] },
        { key: 'infant', label: t('checkout.infantX'), count: infantCount, amount: infantCount * prices['Infant (<4)'] },
    ].filter(row => row.count > 0);

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[3px] sm:p-4">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-surface-container-lowest shadow-[0_28px_80px_rgba(15,23,42,0.28)] animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200">
                <div className="flex shrink-0 items-start gap-4 border-b border-outline-variant/10 px-5 py-5 sm:px-7">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
                        <span className="material-symbols-outlined text-[22px]">verified_user</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-headline text-xl font-extrabold tracking-tight text-on-surface sm:text-2xl">
                            {t('checkout.confirmTitle')}
                        </h3>
                        <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-on-surface-variant">
                            {t('checkout.confirmDesc')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('checkout.cancel')}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                    <div className="space-y-5">
                        <section className="rounded-3xl border border-outline-variant/20 bg-surface-container-low/50 p-5">
                            <h4 className="mb-4 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-primary">
                                <span className="material-symbols-outlined text-[17px]">contact_mail</span>
                                {t('checkout.contactInfoTitle')}
                            </h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-on-surface-variant/70">person</span>
                                    <div>
                                        <p className="text-[11px] font-semibold text-on-surface-variant">{t('checkout.fullName')}</p>
                                        <p className="mt-0.5 text-sm font-bold text-on-surface">{contactInfo.fullName}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-on-surface-variant/70">mail</span>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-semibold text-on-surface-variant">{t('checkout.email')}</p>
                                        <p className="mt-0.5 break-words text-sm font-bold text-on-surface">{contactInfo.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-on-surface-variant/70">call</span>
                                    <div>
                                        <p className="text-[11px] font-semibold text-on-surface-variant">{t('checkout.phone')}</p>
                                        <p className="mt-0.5 text-sm font-bold text-on-surface">{contactInfo.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-on-surface-variant/70">badge</span>
                                    <div>
                                        <p className="text-[11px] font-semibold text-on-surface-variant">{t('checkout.identityDocument')}</p>
                                        <p className="mt-0.5 text-sm font-bold text-on-surface">{contactInfo.identityType}: {contactInfo.identityNo}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-outline-variant/20 bg-surface-container-low/50 p-5">
                            <h4 className="mb-4 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-primary">
                                <span className="material-symbols-outlined text-[17px]">travel_explore</span>
                                {t('checkout.orderSummary')}
                            </h4>
                            {tourData && (
                                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-outline-variant/10">
                                    <p className="font-headline text-base font-extrabold leading-snug text-on-surface">{tourData.name}</p>
                                    <div className="mt-3 grid gap-2 text-xs font-semibold text-on-surface-variant sm:grid-cols-2">
                                        {dateToShow && (
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                                                <span>{t('checkout.departure')}: {formatDate(dateToShow)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                                            <span>{tourData.duration}</span>
                                        </div>
                                    </div>
                                    {selectedPackage && (
                                        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-3.5 py-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                                <span className="material-symbols-outlined text-[17px]">hotel_class</span>
                                            </span>
                                            <div>
                                                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700">{t('checkout.selectedTier')}</p>
                                                <p className="mt-0.5 text-sm font-bold text-amber-950">{selectedPackage.name}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="mt-4 space-y-3">
                                {priceRows.map(row => (
                                    <div key={row.key} className="flex items-center justify-between gap-4 text-sm">
                                        <span className="font-semibold text-on-surface-variant">{row.label} x {row.count}</span>
                                        <span className="font-bold text-on-surface">{formatPrice(row.amount)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-dashed border-outline-variant/40 pt-3">
                                    <div className="flex items-center justify-between gap-4 text-sm">
                                        <span className="font-semibold text-on-surface-variant">{t('checkout.subtotal')}</span>
                                        <span className="font-bold text-on-surface">{formatPrice(subtotal)}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                                            <span className="font-semibold text-tertiary">{t('checkout.voucherDiscount')}</span>
                                            <span className="font-extrabold text-tertiary">-{formatPrice(discountAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-outline-variant/20 bg-surface-container-low/50 p-5">
                            <h4 className="mb-4 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-primary">
                                <span className="material-symbols-outlined text-[17px]">groups</span>
                                {t('checkout.passengerInfoTitle')}
                            </h4>
                            <ul className="space-y-2">
                                <li className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-outline-variant/10">
                                    <span className="min-w-0 text-sm font-bold text-on-surface">
                                        {t('checkout.passengerN', { number: 1 })}: {leadTraveler.fullName}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                                        {t('checkout.leadRepresentative')}
                                    </span>
                                </li>
                                {passengers.map((passenger, idx) => (
                                    <li key={`${passenger.fullName}-${idx}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-outline-variant/10">
                                        <span className={`min-w-0 text-sm font-bold ${passenger.fullName ? 'text-on-surface' : 'text-outline italic'}`}>
                                            {t('checkout.passengerN', { number: idx + 2 })}: {passenger.fullName || t('checkout.deferLater')}
                                        </span>
                                        <span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
                                            {getPassengerTypeLabel(passenger.type, t)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="rounded-3xl border border-error/20 bg-error/5 p-4">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined mt-0.5 text-[22px] text-error">warning</span>
                                <div>
                                    <p className="text-sm font-extrabold text-error">{t('checkout.warningTitle')}</p>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-error/90">{t('checkout.warningDesc')}</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="mt-6 border-t border-outline-variant/10 pt-5">
                        <div className="mb-5 flex items-end justify-between gap-4">
                            <span className="text-sm font-extrabold uppercase tracking-[0.12em] text-on-surface">
                                {t('checkout.totalPayment')}
                            </span>
                            <span className="font-headline text-3xl font-black text-primary sm:text-4xl">
                                {formatPrice(totalPrice)}
                            </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[1fr_1.35fr]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full border border-outline-variant/30 bg-white px-6 py-3 text-sm font-extrabold text-on-surface transition-all hover:bg-surface-container active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                {t('checkout.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-container active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <span className="material-symbols-outlined text-[18px]">credit_card</span>
                                <span>{t('checkout.confirmAndPay')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

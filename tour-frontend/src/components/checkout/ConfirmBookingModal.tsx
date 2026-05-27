'use client';

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

interface ConfirmBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    contactInfo: ContactInfo;
    leadTraveler: LeadTraveler;
    passengers: Passenger[];
    t: (key: string, params?: Record<string, string | number | Date>) => string;
}

export default function ConfirmBookingModal({
    isOpen,
    onClose,
    onConfirm,
    contactInfo,
    leadTraveler,
    passengers,
    t,
}: ConfirmBookingModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-modalSlideUp max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">verified_user</span>
                    </div>
                    <h3 className="font-headline font-bold text-xl text-on-surface">
                        {t('checkout.confirmTitle')}
                    </h3>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-outline">
                        {t('checkout.confirmDesc')}
                    </p>

                    {/* Contact Details */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm">
                        <h4 className="font-bold text-on-surface mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary">
                            <span className="material-symbols-outlined text-sm">contact_mail</span>
                            {t('checkout.contactInfoTitle')}
                        </h4>
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                            <div>
                                <span className="text-on-surface-variant block">{t('checkout.fullName')}</span>
                                <span className="font-semibold text-on-surface">{contactInfo.fullName}</span>
                            </div>
                            <div>
                                <span className="text-on-surface-variant block">Email</span>
                                <span className="font-semibold text-on-surface">{contactInfo.email}</span>
                            </div>
                            <div>
                                <span className="text-on-surface-variant block">{t('checkout.phone')}</span>
                                <span className="font-semibold text-on-surface">{contactInfo.phone}</span>
                            </div>
                            <div>
                                <span className="text-on-surface-variant block">{t('checkout.identityDocument')}</span>
                                <span className="font-semibold text-on-surface">{contactInfo.identityType}: {contactInfo.identityNo}</span>
                            </div>
                        </div>
                    </div>

                    {/* Passengers List */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm">
                        <h4 className="font-bold text-on-surface mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary">
                            <span className="material-symbols-outlined text-sm">groups</span>
                            {t('checkout.passengerInfoTitle')}
                        </h4>
                        <ul className="space-y-1.5 text-xs divide-y divide-slate-100">
                            <li className="flex justify-between items-center py-1">
                                <span className="text-on-surface-variant font-medium">
                                    {t('checkout.passengerN', { number: 1 })}: {leadTraveler.fullName}
                                </span>
                                <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-bold uppercase">
                                    {t('checkout.leadRepresentative')}
                                </span>
                            </li>
                            {passengers.map((p, idx) => (
                                <li key={idx} className="flex justify-between items-center py-1">
                                    <span className="text-on-surface-variant font-medium">
                                        {t('checkout.passengerN', { number: idx + 2 })}: {p.fullName}
                                    </span>
                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">
                                        {p.type === 'Adult (12+)'
                                            ? t('checkout.adultLabel')
                                            : p.type === 'Child (4-11)'
                                                ? t('checkout.childLabel')
                                                : t('checkout.infantLabel')}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Warning */}
                    <div className="bg-error/5 border border-error/20 rounded-xl p-4 flex items-start gap-3">
                        <span className="material-symbols-outlined text-error text-xl mt-0.5">warning</span>
                        <div>
                            <p className="text-xs font-bold text-error">
                                {t('checkout.warningTitle')}
                            </p>
                            <p className="text-xs text-error/90 mt-0.5 leading-relaxed font-medium">
                                {t('checkout.warningDesc')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/10">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-outline-variant/40 hover:bg-slate-50 text-on-surface-variant font-bold text-sm transition-all active:scale-95"
                    >
                        {t('checkout.cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-base">credit_card</span>
                        <span>{t('checkout.confirmAndPay')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

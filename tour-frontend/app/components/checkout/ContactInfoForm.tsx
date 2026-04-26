'use client';

interface ContactInfo {
    fullName: string;
    email: string;
    phone: string;
    dob: string;
    gender: string;
}

interface ContactInfoFormProps {
    contactInfo: ContactInfo;
    setContactInfo: (info: ContactInfo) => void;
    isBookForMyself: boolean;
    setIsBookForMyself: (checked: boolean) => void;
    onToggleBookForMyself: (checked: boolean) => void;
    setLeadTraveler: React.Dispatch<React.SetStateAction<{ fullName: string; dob: string; gender: string; notes: string }>>;
    t: (key: string) => string;
}

export default function ContactInfoForm({
    contactInfo,
    setContactInfo,
    isBookForMyself,
    onToggleBookForMyself,
    setLeadTraveler,
    t,
}: ContactInfoFormProps) {
    return (
        <>
            {/* 1. Contact Information Card */}
            <section className="bg-white rounded-xl p-6 md:p-8 ambient-shadow ghost-border">
                <div className="flex items-center gap-4 mb-6 md:mb-8">
                    <span className="material-symbols-outlined text-primary text-3xl">contact_mail</span>
                    <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight">{t('checkout.contactInfoTitle')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                        <input
                            className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none"
                            type="text"
                            placeholder={t('checkout.enterFullName')}
                            value={contactInfo.fullName}
                            onChange={(e) => {
                                const newVal = e.target.value;
                                setContactInfo({ ...contactInfo, fullName: newVal });
                                if (isBookForMyself) {
                                    setLeadTraveler(prev => ({ ...prev, fullName: newVal }));
                                }
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.email')} <span className="text-error">*</span></label>
                        <input
                            className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none text-slate-500"
                            type="email"
                            placeholder={t('checkout.enterEmail')}
                            value={contactInfo.email}
                            readOnly
                            title="Login email cannot be changed"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.phone')} <span className="text-error">*</span></label>
                        <input
                            className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none"
                            type="tel"
                            placeholder={t('checkout.enterPhone')}
                            value={contactInfo.phone}
                            onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                        />
                    </div>
                </div>
            </section>

            {/* Book for myself toggle */}
            <label className="flex items-center justify-between bg-primary/5 rounded-xl p-4 md:p-5 border border-primary/20 cursor-pointer shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <div className="flex items-center gap-4 pl-2 md:pl-4">
                    <div className="relative flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={isBookForMyself}
                            onChange={(e) => onToggleBookForMyself(e.target.checked)}
                            className="w-6 h-6 appearance-none border-2 border-primary/50 rounded-md flex-shrink-0 checked:bg-primary checked:border-primary transition-colors cursor-pointer group-hover:border-primary outline-none"
                        />
                        <span className={`material-symbols-outlined text-white text-[18px] font-bold absolute pointer-events-none transition-opacity ${isBookForMyself ? 'opacity-100' : 'opacity-0'}`}>check</span>
                    </div>
                    <div>
                        <span className="text-[15px] md:text-base font-bold text-primary block">{t('checkout.bookForMyself')}</span>
                    </div>
                </div>
                <span className="material-symbols-outlined text-primary/30 group-hover:text-primary/70 transition-colors hidden sm:block text-3xl">post_add</span>
            </label>
        </>
    );
}

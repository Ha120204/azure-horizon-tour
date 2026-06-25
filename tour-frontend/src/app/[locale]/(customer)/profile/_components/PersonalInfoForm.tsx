'use client';

import { CheckoutSelect } from '@/components/checkout/CheckoutSelect';

interface PersonalInfoFormProps {
    name: string;
    setName: (v: string) => void;
    phone: string;
    setPhone: (v: string) => void;
    email: string;
    dob: string;
    setDob: (v: string) => void;
    gender: string;
    setGender: (v: string) => void;
    identityType: string;
    setIdentityType: (v: string) => void;
    identityNo: string;
    setIdentityNo: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    isSubmitting?: boolean;
    t: (key: string) => string;
}

function validateIdentity(type: string, no: string, t: (key: string) => string): string | null {
    if (!no) return null;
    if (type === 'CCCD' && !/^\d{12}$/.test(no)) return t('checkout.citizenIdError');
    if (type === 'PASSPORT' && !/^[A-Za-z0-9]{6,15}$/.test(no)) return t('checkout.passportError');
    return null;
}

export default function PersonalInfoForm({
    name, setName, phone, setPhone, email, dob, setDob, gender, setGender,
    identityType, setIdentityType, identityNo, setIdentityNo,
    onSubmit, isSubmitting = false, t,
}: PersonalInfoFormProps) {
    const identityError = validateIdentity(identityType, identityNo, t);
    const genderOptions = [
        { value: '', label: t('checkout.selectGender'), icon: 'wc' },
        { value: 'Male', label: t('checkout.male'), icon: 'male' },
        { value: 'Female', label: t('checkout.female'), icon: 'female' },
        { value: 'Other', label: t('checkout.other'), icon: 'diversity_1' },
    ];
    const identityOptions = [
        { value: 'CCCD', label: t('checkout.citizenId'), icon: 'badge' },
        { value: 'PASSPORT', label: t('checkout.passport'), icon: 'id_card' },
    ];
    const profileSelectButtonClass =
        '!min-h-[48px] !rounded-lg !border-transparent !bg-surface-container-low !px-3 !py-3 !text-sm !shadow-none hover:!border-primary/35 hover:!bg-white focus-visible:!ring-2 focus-visible:!ring-primary/30';
    const profileSelectMenuClass =
        '!z-[120] !rounded-xl !border-outline-variant/20 !bg-white !shadow-xl !shadow-slate-900/10';

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-headline font-bold text-on-surface">{t('profile.personalInfo')}</h2>
            <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.fullNameLbl')}</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('profile.fullNamePlace')} />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.dobLbl')}</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.genderLbl')}</label>
                    <CheckoutSelect
                        value={gender}
                        options={genderOptions}
                        onChange={setGender}
                        ariaLabel={t('profile.genderLbl')}
                        placeholder={t('checkout.selectGender')}
                        buttonClassName={profileSelectButtonClass}
                        menuClassName={profileSelectMenuClass}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.phoneLbl')}</label>
                    <input
                        className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={15}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder={t('profile.phonePlace')}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('checkout.identityDocument')}</label>
                    <div className="flex gap-2">
                        <CheckoutSelect
                            className="w-32 flex-shrink-0"
                            buttonClassName={`${profileSelectButtonClass} !font-bold`}
                            menuClassName="!z-[120] !w-56 !max-w-56 !rounded-xl !border-outline-variant/20 !bg-white !shadow-xl !shadow-slate-900/10"
                            value={identityType}
                            options={identityOptions}
                            onChange={(nextType) => {
                                setIdentityType(nextType);
                                setIdentityNo('');
                            }}
                            ariaLabel={t('checkout.identityDocument')}
                        />
                        <input
                            className={`flex-1 bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:bg-white transition-all outline-none ${identityError ? 'ring-1 ring-error/60 bg-error/5' : 'focus:ring-primary'}`}
                            type="text"
                            placeholder={identityType === 'CCCD' ? t('checkout.enterCitizenId') : t('checkout.enterPassport')}
                            value={identityNo}
                            maxLength={identityType === 'CCCD' ? 12 : 15}
                            onChange={(e) => {
                                const v = identityType === 'CCCD'
                                    ? e.target.value.replace(/\D/g, '')
                                    : e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                                setIdentityNo(v);
                            }}
                        />
                    </div>
                    {identityError && (
                        <p className="text-xs text-error font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">error</span>{identityError}
                        </p>
                    )}
                    {identityNo && !identityError && (
                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>{t('checkout.valid')}
                        </p>
                    )}
                    {!identityNo && (
                        <p className="text-[11px] text-outline/60 italic">
                            {identityType === 'CCCD' ? t('checkout.citizenIdHint') : t('checkout.passportHint')}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.emailLbl')}</label>
                    <input className="w-full bg-surface-container-low/60 border-none rounded-lg p-3 text-sm outline-none text-slate-500 cursor-not-allowed" type="email" value={email} readOnly />
                </div>
                <button type="submit" disabled={!!identityError || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-md transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-lg hover:shadow-primary/20 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-primary disabled:hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
                    {isSubmitting && <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>}
                    {t('profile.updateBtn')}
                </button>
            </form>
        </div>
    );
}

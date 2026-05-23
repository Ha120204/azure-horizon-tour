'use client';

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
    onSubmit, t,
}: PersonalInfoFormProps) {
    const identityError = validateIdentity(identityType, identityNo, t);

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
                    <select className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">{t('checkout.selectGender')}</option>
                        <option value="Male">{t('checkout.male')}</option>
                        <option value="Female">{t('checkout.female')}</option>
                        <option value="Other">{t('checkout.other')}</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.phoneLbl')}</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('profile.phonePlace')} />
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('checkout.identityDocument')}</label>
                    <div className="flex gap-2">
                        <select
                            className="bg-surface-container-low border-none rounded-lg p-3 text-sm font-semibold focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none w-32 flex-shrink-0"
                            value={identityType}
                            onChange={(e) => { setIdentityType(e.target.value); setIdentityNo(''); }}
                        >
                            <option value="CCCD">{t('checkout.citizenId')}</option>
                            <option value="PASSPORT">{t('checkout.passport')}</option>
                        </select>
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
                <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-full font-headline font-bold text-sm shadow-md hover:opacity-90 transition-opacity active:scale-95">
                    {t('profile.updateBtn')}
                </button>
            </form>
        </div>
    );
}

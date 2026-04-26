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
    onSubmit: (e: React.FormEvent) => void;
    t: (key: string) => string;
}

export default function PersonalInfoForm({
    name, setName, phone, setPhone, email, dob, setDob, gender, setGender, onSubmit, t,
}: PersonalInfoFormProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-headline font-bold text-on-surface">{t('profile.personalInfo')}</h2>
            <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.fullNameLbl') || 'HỌ VÀ TÊN'}</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('profile.fullNamePlace')} />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.dobLbl') || 'NGÀY SINH'}</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.genderLbl') || 'GIỚI TÍNH'}</label>
                    <select className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">{t('checkout.selectGender') || 'Chọn giới tính'}</option>
                        <option value="Male">{t('checkout.male') || 'Nam'}</option>
                        <option value="Female">{t('checkout.female') || 'Nữ'}</option>
                        <option value="Other">{t('checkout.other') || 'Khác'}</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.phoneLbl') || 'SỐ ĐIỆN THOẠI'}</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('profile.phonePlace')} />
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

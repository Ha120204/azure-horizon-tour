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

function validateIdentity(type: string, no: string): string | null {
    if (!no) return null;
    if (type === 'CCCD' && !/^\d{12}$/.test(no)) return 'CCCD phải đúng 12 chữ số.';
    if (type === 'PASSPORT' && !/^[A-Za-z0-9]{6,15}$/.test(no)) return 'Hộ chiếu phải từ 6–15 ký tự.';
    return null;
}

export default function PersonalInfoForm({
    name, setName, phone, setPhone, email, dob, setDob, gender, setGender,
    identityType, setIdentityType, identityNo, setIdentityNo,
    onSubmit, t,
}: PersonalInfoFormProps) {
    const identityError = validateIdentity(identityType, identityNo);

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

                {/* Identity Document — type + number */}
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">GIẤY TỜ TUỲ THÂN</label>
                    <div className="flex gap-2">
                        <select
                            className="bg-surface-container-low border-none rounded-lg p-3 text-sm font-semibold focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none w-32 flex-shrink-0"
                            value={identityType}
                            onChange={(e) => { setIdentityType(e.target.value); setIdentityNo(''); }}
                        >
                            <option value="CCCD">CCCD</option>
                            <option value="PASSPORT">Hộ chiếu</option>
                        </select>
                        <input
                            className={`flex-1 bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:bg-white transition-all outline-none ${identityError ? 'ring-1 ring-error/60 bg-error/5' : 'focus:ring-primary'}`}
                            type="text"
                            placeholder={identityType === 'CCCD' ? 'Nhập 12 số CCCD' : 'Nhập số hộ chiếu'}
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
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>Hợp lệ
                        </p>
                    )}
                    {!identityNo && (
                        <p className="text-[11px] text-outline/60 italic">
                            {identityType === 'CCCD' ? 'Căn cước công dân 12 số.' : 'Số hộ chiếu có thể chứa chữ và số.'}
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

'use client';

import { useState } from 'react';

type PassengerType = 'Adult (12+)' | 'Child (4-11)' | 'Infant (<4)';

interface Passenger {
    type: PassengerType;
    fullName: string;
    dob: string;
    gender: string;
    identityType: string;  // 'CCCD' | 'PASSPORT' | 'BIRTH_CERT'
    identityNo: string;
}

interface LeadTraveler {
    fullName: string;
    dob: string;
    gender: string;
    identityType: string;
    identityNo: string;
    notes: string;
}

interface PassengerSectionProps {
    leadTraveler: LeadTraveler;
    setLeadTraveler: React.Dispatch<React.SetStateAction<LeadTraveler>>;
    passengers: Passenger[];
    activeFormType: PassengerType | null;
    tempFormData: { fullName: string; dob: string; gender: string; identityType: string; identityNo: string };
    setTempFormData: React.Dispatch<React.SetStateAction<{ fullName: string; dob: string; gender: string; identityType: string; identityNo: string }>>;
    onOpenForm: (type: PassengerType | null) => void;
    onSavePassenger: () => void;
    onRemovePassenger: (index: number) => void;
    t: (key: string) => string;
    /** Số ghế tối đa còn lại (availableSeats của departure/tour). Infant (<4) không tính ghế. */
    maxPassengers?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcAge(dob: string): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function getAgeError(type: PassengerType, dob: string): string | null {
    if (!dob) return null;
    const age = calcAge(dob);
    if (age === null) return 'Ngày sinh không hợp lệ.';
    if (age < 0) return 'Ngày sinh không được là ngày trong tương lai.';
    if (type === 'Adult (12+)' && age < 12) return `Người lớn phải từ 12 tuổi trở lên. Tuổi hiện tại: ${age} tuổi.`;
    if (type === 'Child (4-11)' && (age < 4 || age > 11)) return `Trẻ em phải từ 4–11 tuổi. Tuổi hiện tại: ${age} tuổi.`;
    if (type === 'Infant (<4)' && age >= 4) return `Em bé phải dưới 4 tuổi. Tuổi hiện tại: ${age} tuổi.`;
    return null;
}

function getMinDate(type: PassengerType): string {
    const today = new Date();
    const y = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (type === 'Adult (12+)') {
        return `${y - 120}-${mm}-${dd}`;
    }
    if (type === 'Child (4-11)') {
        return `${y - 11}-${mm}-${dd}`;
    }
    // Infant
    return `${y - 3}-${mm}-${dd}`;
}

function getMaxDate(type: PassengerType): string {
    const today = new Date();
    const y = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (type === 'Adult (12+)') {
        // Must be >= 12 years old → max DOB = today - 12 years
        return `${y - 12}-${mm}-${dd}`;
    }
    if (type === 'Child (4-11)') {
        // 4 to 11: max DOB = today - 4 years
        return `${y - 4}-${mm}-${dd}`;
    }
    // Infant <4: max DOB = today
    return `${y}-${mm}-${dd}`;
}

// Name validator: at least 2 words, no numbers/special chars
function getNameError(name: string): string | null {
    if (!name.trim()) return null;
    if (name.trim().split(/\s+/).length < 2) return 'Vui lòng nhập đầy đủ họ và tên (ít nhất 2 từ).';
    if (/[0-9!@#$%^&*()_+=[\]{};':"\\|,.<>/?]/.test(name)) return 'Họ tên không được chứa số hoặc ký tự đặc biệt.';
    return null;
}

export default function PassengerSection({
    leadTraveler,
    setLeadTraveler,
    passengers,
    activeFormType,
    tempFormData,
    setTempFormData,
    onOpenForm,
    onSavePassenger,
    onRemovePassenger,
    t,
    maxPassengers,
}: PassengerSectionProps) {
    // ── Seat capacity logic ──────────────────────────────────────────────────────
    // Infant (<4) không chiếm ghế theo chuẩn du lịch (ngồi lòng người lớn)
    const seatConsumingPassengers = passengers.filter(p => p.type !== 'Infant (<4)');
    // Lead traveler luôn chiếm 1 ghế
    const seatsTaken = 1 + seatConsumingPassengers.length;
    const seatsLeft = maxPassengers !== undefined ? maxPassengers - seatsTaken : Infinity;
    const isSeatFull = seatsLeft <= 0;
    // Infant không giới hạn theo ghế, nhưng tối đa bằng số người lớn (nghiệp vụ thực tế)
    const adultCount = 1 + passengers.filter(p => p.type === 'Adult (12+)').length;
    const infantCount = passengers.filter(p => p.type === 'Infant (<4)').length;
    const isInfantFull = infantCount >= adultCount;
    // Local validation errors for the active passenger form
    const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; dob?: string; identityNo?: string }>({});

    // Identity document validation
    function getIdentityDocTypes(type: PassengerType) {
        if (type === 'Infant (<4)') return [{ value: 'BIRTH_CERT', label: t('checkout.birthCertificate') }, { value: 'PASSPORT', label: t('checkout.passport') }];
        return [{ value: 'CCCD', label: t('checkout.citizenId') }, { value: 'PASSPORT', label: t('checkout.passport') }];
    }

    function validateIdentityNo(idType: string, idNo: string): string | null {
        if (!idNo) return null;
        if (idType === 'CCCD' && !/^\d{12}$/.test(idNo)) return t('checkout.citizenIdError');
        if (idType === 'PASSPORT' && !/^[A-Za-z0-9]{6,15}$/.test(idNo)) return t('checkout.passportError');
        return null;
    }

    // Trigger validation on save attempt
    const handleValidatedSave = () => {
        const nameErr = getNameError(tempFormData.fullName);
        const ageErr = activeFormType ? getAgeError(activeFormType, tempFormData.dob) : null;
        const errors: { fullName?: string; dob?: string } = {};
        if (nameErr) errors.fullName = nameErr;
        if (ageErr) errors.dob = ageErr;
        if (!tempFormData.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên.';
        if (!tempFormData.dob) errors.dob = 'Vui lòng chọn ngày sinh.';
        if (!tempFormData.gender) {
            // gender validation stays in parent via onSavePassenger
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        onSavePassenger();
    };

    const handleOpenForm = (type: PassengerType | null) => {
        setFieldErrors({});
        onOpenForm(type);
    };

    const ageLabel = (p: Passenger) => {
        const age = calcAge(p.dob);
        return age !== null ? `${age} ${t('checkout.yearsOld')}` : p.dob;
    };

    return (
        <section className="bg-white rounded-xl p-6 md:p-8 ambient-shadow ghost-border">
            <div className="flex items-center gap-4 mb-6 md:mb-8">
                <span className="material-symbols-outlined text-primary text-3xl">group</span>
                <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight">{t('checkout.passengerInfoTitle')}</h2>
            </div>

            <div className="space-y-8">
                {/* Lead Traveler */}
                <div className="bg-surface-container-low/50 p-5 md:p-6 rounded-xl border border-outline-variant/20">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
                        <h3 className="font-headline font-semibold text-base md:text-lg text-primary">{t('checkout.leadTraveler')}</h3>
                        <span className="bg-tertiary-container text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest w-max shadow-sm">{t('checkout.required')}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                            <input
                                className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                type="text"
                                placeholder={t('checkout.enterFullName')}
                                value={leadTraveler.fullName}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, fullName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.dob')} <span className="text-error">*</span></label>
                            <input
                                className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                type="date"
                                value={leadTraveler.dob}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, dob: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.gender')} <span className="text-error">*</span></label>
                            <select
                                className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm appearance-none"
                                value={leadTraveler.gender}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, gender: e.target.value })}
                            >
                                <option value="">{t('checkout.selectGender')}</option>
                                <option value="Male">{t('checkout.male')}</option>
                                <option value="Female">{t('checkout.female')}</option>
                                <option value="Other">{t('checkout.other')}</option>
                            </select>
                        </div>

                        {/* Identity Document (Lead Traveler — Required) */}
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                                {t('checkout.identityDocument')} <span className="text-error">*</span>
                            </label>
                            <div className="flex gap-2">
                                <select
                                    className="bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm text-sm font-semibold w-36 flex-shrink-0 appearance-none"
                                    value={leadTraveler.identityType || 'CCCD'}
                                    onChange={(e) => setLeadTraveler({ ...leadTraveler, identityType: e.target.value, identityNo: '' })}
                                >
                                    <option value="CCCD">{t('checkout.citizenId')}</option>
                                    <option value="PASSPORT">{t('checkout.passport')}</option>
                                </select>
                                <input
                                    className="flex-1 bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                    type="text"
                                    placeholder={(leadTraveler.identityType || 'CCCD') === 'CCCD' ? t('checkout.enterCitizenId') : t('checkout.enterPassport')}
                                    value={leadTraveler.identityNo || ''}
                                    maxLength={(leadTraveler.identityType || 'CCCD') === 'CCCD' ? 12 : 15}
                                    onChange={(e) => {
                                        const v = (leadTraveler.identityType || 'CCCD') === 'CCCD'
                                            ? e.target.value.replace(/\D/g, '')
                                            : e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                                        setLeadTraveler({ ...leadTraveler, identityNo: v });
                                    }}
                                />
                            </div>
                            {leadTraveler.identityNo && !validateIdentityNo(leadTraveler.identityType || 'CCCD', leadTraveler.identityNo) && (
                                <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>{t('checkout.valid')}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.specialReq')}</label>
                            <textarea
                                className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm resize-none"
                                placeholder={t('checkout.specialReqPlaceholder')}
                                rows={2}
                                value={leadTraveler.notes}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, notes: e.target.value })}
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Added Passengers List */}
                {passengers.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-bold text-sm text-on-surface-variant">{t('checkout.addedPassengers')}</h4>
                        {passengers.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-primary/20 p-4 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-xl">{p.type.includes('Child') ? 'child_care' : p.type.includes('Infant') ? 'baby_changing_station' : 'person'}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-on-surface">{p.fullName}</p>
                                        <p className="text-xs text-outline font-medium">
                                            {t(p.type === 'Adult (12+)' ? 'checkout.adult' : p.type === 'Child (4-11)' ? 'checkout.child' : 'checkout.infant')}
                                            {' '}•{' '}{ageLabel(p)}
                                            {' '}•{' '}{p.dob}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => onRemovePassenger(idx)} className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Passenger Buttons + Form */}
                <div className="space-y-4 pt-4 border-t border-outline-variant/20">
                    {/* Header: tiêu đề + seat counter badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="font-headline font-bold text-lg">{t('checkout.addPassenger')}</h3>
                        {maxPassengers !== undefined && (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                                isSeatFull
                                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                                    : seatsLeft === 1
                                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            }`}>
                                <span className="material-symbols-outlined text-[14px]">
                                    {isSeatFull ? 'event_seat' : 'airline_seat_recline_normal'}
                                </span>
                                {isSeatFull
                                    ? `Đã đặt đủ ${maxPassengers} ghế`
                                    : `Còn ${seatsLeft} ghế trống`
                                }
                            </div>
                        )}
                    </div>

                    {/* Banner cảnh báo khi đầy ghế */}
                    {isSeatFull && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5 flex-shrink-0">info</span>
                            <div>
                                <p className="font-semibold text-amber-800 text-sm">
                                    Đã đạt giới hạn số ghế
                                </p>
                                <p className="text-amber-700 text-xs mt-0.5">
                                    Tour này chỉ còn <strong>{maxPassengers} ghế</strong> và bạn đã đặt đủ.
                                    Hãy xoá bớt hành khách nếu muốn đổi thành phần đoàn.
                                    {` `}Em bé (&lt;4 tuổi) không tính ghế.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                        {(['Adult (12+)', 'Child (4-11)', 'Infant (<4)'] as PassengerType[]).map((type) => {
                            const isActive = activeFormType === type;
                            const icon = type.includes('Child') ? 'child_care' : type.includes('Infant') ? 'baby_changing_station' : 'person';
                            const translatedType = type === 'Adult (12+)' ? t('checkout.adult') : type === 'Child (4-11)' ? t('checkout.child') : t('checkout.infant');
                            const ageRange = type === 'Adult (12+)' ? '12+' : type === 'Child (4-11)' ? '4–11' : '<4';

                            // Infant không tính ghế nhưng không được vượt quá số người lớn
                            const isDisabled = type === 'Infant (<4)' ? isInfantFull : isSeatFull;

                            // Tooltip giải thích khi bị disabled
                            const disabledReason = type === 'Infant (<4)'
                                ? (isInfantFull ? `Tối đa ${adultCount} em bé (= số người lớn)` : '')
                                : (isSeatFull ? 'Đã hết ghế trống' : '');

                            return (
                                <div key={type} className="relative group">
                                    <button
                                        disabled={isDisabled && !isActive}
                                        onClick={() => {
                                            if (isDisabled && !isActive) return;
                                            handleOpenForm(isActive ? null : type);
                                        }}
                                        aria-disabled={isDisabled && !isActive}
                                        className={`w-full relative flex flex-col items-center justify-center gap-1.5 p-3 md:p-4 rounded-xl border-2 transition-all ${
                                            isDisabled && !isActive
                                                ? 'border-outline-variant/20 bg-surface-container-low/50 cursor-not-allowed opacity-50'
                                                : isActive
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-outline-variant/30 hover:border-primary/50 bg-white'
                                        }`}
                                    >
                                        {isActive && (
                                            <div className="absolute -top-2 -right-2 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                                <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                                            </div>
                                        )}
                                        {isDisabled && !isActive && (
                                            <div className="absolute -top-2 -right-2 bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                                <span className="material-symbols-outlined text-[12px]">block</span>
                                            </div>
                                        )}
                                        <span className={`material-symbols-outlined ${
                                            isDisabled && !isActive ? 'text-outline-variant' : isActive ? 'text-primary' : 'text-on-surface-variant'
                                        }`}>{icon}</span>
                                        <span className={`text-[10px] md:text-xs font-bold uppercase tracking-tight ${
                                            isDisabled && !isActive ? 'text-outline-variant' : isActive ? 'text-primary' : 'text-on-surface-variant'
                                        }`}>{translatedType}</span>
                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                                            isDisabled && !isActive ? 'bg-slate-100 text-slate-400' : isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                                        }`}>{ageRange} {t('checkout.yearsOld')}</span>
                                    </button>
                                    {/* Tooltip giải thích khi disabled */}
                                    {isDisabled && !isActive && disabledReason && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[160px] bg-gray-800 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg z-10
                                            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center leading-relaxed">
                                            {disabledReason}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {activeFormType && (
                        <div className="relative bg-primary/5 rounded-2xl p-5 md:p-8 border border-primary/20 animate-fade-in mt-4">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-surface border-t border-l border-primary/20 rotate-45" style={{ backgroundColor: '#f6f8fb' }}></div>
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-headline font-bold text-lg text-primary">
                                    {t('checkout.enterInfoFor')} {activeFormType === 'Adult (12+)' ? t('checkout.adult') : activeFormType === 'Child (4-11)' ? t('checkout.child') : t('checkout.infant')}
                                    <span className="ml-2 text-sm font-normal text-on-surface-variant">
                                        ({activeFormType === 'Adult (12+)' ? '>=12' : activeFormType === 'Child (4-11)' ? '4-11' : '<4'} {t('checkout.yearsOld')})
                                    </span>
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {/* Full Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                                    <input
                                        className={`w-full bg-white border rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm ${fieldErrors.fullName ? 'border-error/60 bg-error/5' : 'border-outline-variant/20'}`}
                                        placeholder={t('checkout.enterFullName')}
                                        type="text"
                                        value={tempFormData.fullName}
                                        onChange={(e) => {
                                            setTempFormData({ ...tempFormData, fullName: e.target.value });
                                            if (fieldErrors.fullName) setFieldErrors(prev => ({ ...prev, fullName: undefined }));
                                        }}
                                    />
                                    {fieldErrors.fullName && (
                                        <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrors.fullName}
                                        </p>
                                    )}
                                </div>

                                {/* Date of Birth */}
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.dob')} <span className="text-error">*</span></label>
                                    <input
                                        className={`w-full bg-white border rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm ${fieldErrors.dob ? 'border-error/60 bg-error/5' : 'border-outline-variant/20'}`}
                                        type="date"
                                        min={getMinDate(activeFormType)}
                                        max={getMaxDate(activeFormType)}
                                        value={tempFormData.dob}
                                        onChange={(e) => {
                                            setTempFormData({ ...tempFormData, dob: e.target.value });
                                            if (fieldErrors.dob) setFieldErrors(prev => ({ ...prev, dob: undefined }));
                                        }}
                                        onBlur={(e) => {
                                            const err = getAgeError(activeFormType, e.target.value);
                                            if (err) setFieldErrors(prev => ({ ...prev, dob: err }));
                                        }}
                                    />
                                    {/* Real-time age display */}
                                    {tempFormData.dob && !fieldErrors.dob && (() => {
                                        const age = calcAge(tempFormData.dob);
                                        return age !== null ? (
                                            <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                {age} {t('checkout.yearsOld')} - {t('checkout.valid').toLowerCase()}
                                            </p>
                                        ) : null;
                                    })()}
                                    {fieldErrors.dob && (
                                        <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrors.dob}
                                        </p>
                                    )}
                                    {!tempFormData.dob && (
                                        <p className="mt-1.5 text-[11px] text-primary/70 font-medium italic">
                                            {activeFormType === 'Child (4-11)' ? t('checkout.age4to11') : activeFormType === 'Infant (<4)' ? t('checkout.under4') : t('checkout.over12')}
                                        </p>
                                    )}
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.gender')} <span className="text-error">*</span></label>
                                    <select
                                        className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm appearance-none"
                                        value={tempFormData.gender}
                                        onChange={(e) => setTempFormData({ ...tempFormData, gender: e.target.value })}
                                    >
                                        <option value="">{t('checkout.selectGender')}</option>
                                        <option value="Male">{t('checkout.male')}</option>
                                        <option value="Female">{t('checkout.female')}</option>
                                        <option value="Other">{t('checkout.other')}</option>
                                    </select>
                                </div>

                                {/* Identity Document (Passenger — Optional) */}
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                                        {t('checkout.identityDocumentOptional')}
                                        <span className="ml-2 normal-case text-[10px] font-normal text-on-surface-variant/60 bg-surface-container px-1.5 py-0.5 rounded">
                                            {t('checkout.identityOptionalNote')}
                                        </span>
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            className="bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm text-sm font-semibold w-36 flex-shrink-0 appearance-none"
                                            value={tempFormData.identityType || (activeFormType === 'Infant (<4)' ? 'BIRTH_CERT' : 'CCCD')}
                                            onChange={(e) => setTempFormData({ ...tempFormData, identityType: e.target.value, identityNo: '' })}
                                        >
                                            {activeFormType && getIdentityDocTypes(activeFormType).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <input
                                            className={`flex-1 bg-white border rounded-lg p-3 md:p-4 focus:ring-1 outline-none shadow-sm ${
                                                fieldErrors.identityNo ? 'border-error/60 bg-error/5 focus:ring-error' : 'border-outline-variant/20 focus:ring-primary'
                                            }`}
                                            type="text"
                                            placeholder={
                                                (tempFormData.identityType || 'CCCD') === 'CCCD' ? t('checkout.enterCitizenId')
                                                : (tempFormData.identityType || 'CCCD') === 'PASSPORT' ? t('checkout.enterPassport')
                                                : t('checkout.enterBirthCertificate')
                                            }
                                            value={tempFormData.identityNo || ''}
                                            maxLength={(tempFormData.identityType || 'CCCD') === 'CCCD' ? 12 : 20}
                                            onChange={(e) => {
                                                const t = tempFormData.identityType || 'CCCD';
                                                const v = t === 'CCCD'
                                                    ? e.target.value.replace(/\D/g, '')
                                                    : t === 'PASSPORT'
                                                        ? e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
                                                        : e.target.value;
                                                setTempFormData({ ...tempFormData, identityNo: v });
                                                if (fieldErrors.identityNo) setFieldErrors(prev => ({ ...prev, identityNo: undefined }));
                                            }}
                                            onBlur={(e) => {
                                                const err = validateIdentityNo(tempFormData.identityType || 'CCCD', e.target.value);
                                                if (err) setFieldErrors(prev => ({ ...prev, identityNo: err }));
                                            }}
                                        />
                                    </div>
                                    {fieldErrors.identityNo && (
                                        <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrors.identityNo}
                                        </p>
                                    )}
                                    {tempFormData.identityNo && !fieldErrors.identityNo && (
                                        <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">check_circle</span>{t('checkout.valid')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button onClick={() => handleOpenForm(null)} className="px-6 py-3 rounded-full font-bold text-sm text-outline hover:text-on-surface transition-colors">{t('checkout.cancel')}</button>
                                <button onClick={handleValidatedSave} className="bg-primary text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95">{t('checkout.savePassenger')}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

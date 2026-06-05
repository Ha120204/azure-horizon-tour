'use client';

import React from 'react';
import { CheckoutSelect } from './CheckoutSelect';

interface ContactInfo {
    fullName: string;
    email: string;
    phone: string;
    identityType: string; // "CCCD" | "PASSPORT"
    identityNo: string;
    dob: string;
    gender: string;
}

interface ContactInfoFormProps {
    contactInfo: ContactInfo;
    setContactInfo: (info: ContactInfo) => void;
    isBookForMyself: boolean;
    setIsBookForMyself: (checked: boolean) => void;
    onToggleBookForMyself: (checked: boolean) => void;
    setLeadTraveler: React.Dispatch<React.SetStateAction<{ fullName: string; dob: string; gender: string; identityType: string; identityNo: string; notes: string }>>;
    t: (key: string) => string;
    isLoggedIn: boolean;
}

function validateIdentity(type: string, no: string, t: (key: string) => string): string | null {
    if (!no) return null;
    if (type === 'CCCD' && !/^\d{12}$/.test(no)) return t('checkout.citizenIdError');
    if (type === 'PASSPORT' && !/^[A-Za-z0-9]{6,15}$/.test(no)) return t('checkout.passportError');
    return null;
}

export default function ContactInfoForm({
    contactInfo,
    setContactInfo,
    isBookForMyself,
    onToggleBookForMyself,
    setLeadTraveler,
    t,
    isLoggedIn,
}: ContactInfoFormProps) {
    const identityError = validateIdentity(contactInfo.identityType, contactInfo.identityNo, t);

    const isEmailReadOnly = isLoggedIn && !!contactInfo.email;

    return (
        <>
            {/* 1. Contact Information Card */}
            <section className="bg-white rounded-xl p-6 md:p-8 ambient-shadow ghost-border">
                <div className="flex items-center gap-4 mb-6 md:mb-8">
                    <span className="material-symbols-outlined text-primary text-3xl">contact_mail</span>
                    <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight">{t('checkout.contactInfoTitle')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Full Name — spans 2 cols */}
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

                    {/* Email — spans 2 cols */}
                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.email')} <span className="text-error">*</span></label>
                        <input
                            className={`w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none ${isEmailReadOnly ? 'text-slate-500' : 'text-on-surface'}`}
                            type="email"
                            placeholder={t('checkout.enterEmail')}
                            value={contactInfo.email}
                            readOnly={isEmailReadOnly}
                            onChange={(e) => {
                                if (!isEmailReadOnly) {
                                    setContactInfo({ ...contactInfo, email: e.target.value });
                                }
                            }}
                            title={isEmailReadOnly ? "Login email cannot be changed" : ""}
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.phone')} <span className="text-error">*</span></label>
                        <input
                            className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none"
                            type="tel"
                            placeholder={t('checkout.enterPhone')}
                            value={contactInfo.phone}
                            onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value.replace(/\D/g, '') })}
                        />
                    </div>

                    {/* Identity Document — type dropdown + number input */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                            {t('checkout.identityDocument')} <span className="text-error">*</span>
                        </label>
                        <div className="flex gap-2">
                            <CheckoutSelect
                                className="w-36 flex-shrink-0"
                                buttonClassName="border-transparent bg-surface-container-low shadow-none"
                                menuClassName="right-auto w-56"
                                ariaLabel={t('checkout.identityDocument')}
                                value={contactInfo.identityType}
                                options={[
                                    { value: 'CCCD', label: t('checkout.citizenId'), icon: 'badge' },
                                    { value: 'PASSPORT', label: t('checkout.passport'), icon: 'id_card' },
                                ]}
                                onChange={(newType) => {
                                    setContactInfo({ ...contactInfo, identityType: newType, identityNo: '' });
                                    if (isBookForMyself) setLeadTraveler(prev => ({ ...prev, identityType: newType, identityNo: '' }));
                                }}
                            />
                            <div className="flex-1">
                                <input
                                    className={`w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 outline-none ${identityError ? 'ring-1 ring-error/60 bg-error/5 focus:ring-error' : 'focus:ring-primary'}`}
                                    type="text"
                                    placeholder={contactInfo.identityType === 'CCCD' ? t('checkout.enterCitizenId') : t('checkout.enterPassport')}
                                    value={contactInfo.identityNo}
                                    maxLength={contactInfo.identityType === 'CCCD' ? 12 : 15}
                                    onChange={(e) => {
                                        const newNo = contactInfo.identityType === 'CCCD'
                                            ? e.target.value.replace(/\D/g, '')
                                            : e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                                        setContactInfo({ ...contactInfo, identityNo: newNo });
                                        if (isBookForMyself) setLeadTraveler(prev => ({ ...prev, identityNo: newNo }));
                                    }}
                                />
                            </div>
                        </div>
                        {/* Validation feedback */}
                        {identityError && (
                            <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">error</span>
                                {identityError}
                            </p>
                        )}
                        {contactInfo.identityNo && !identityError && (
                            <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                {t('checkout.valid')}
                            </p>
                        )}
                        {!contactInfo.identityNo && (
                            <p className="mt-1.5 text-[11px] text-on-surface-variant/60 italic">
                                {contactInfo.identityType === 'CCCD' ? t('checkout.citizenIdHint') : t('checkout.passportHint')}
                            </p>
                        )}
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

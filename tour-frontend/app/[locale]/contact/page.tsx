'use client';

import { useState, useRef, useEffect } from 'react';
import { isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useLocale } from '@/app/context/LocaleContext';

const COUNTRY_CODES = [
    { code: '+1', country: 'US', iso: 'us' },
    { code: '+44', country: 'UK', iso: 'gb' },
    { code: '+61', country: 'AU', iso: 'au' },
    { code: '+81', country: 'JP', iso: 'jp' },
    { code: '+82', country: 'KR', iso: 'kr' },
    { code: '+84', country: 'VN', iso: 'vn' },
    { code: '+86', country: 'CN', iso: 'cn' },
    { code: '+91', country: 'IN', iso: 'in' },
    { code: '+33', country: 'FR', iso: 'fr' },
    { code: '+49', country: 'DE', iso: 'de' },
    { code: '+65', country: 'SG', iso: 'sg' },
    { code: '+66', country: 'TH', iso: 'th' },
];

const getFlagUrl = (iso: string) => `https://flagcdn.com/24x18/${iso}.png`;

export default function ContactPage() {
    const { t, language } = useLocale();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phonePrefix: '+84',
        phone: '',
        reference: '',
        subject: 'booking',
        message: ''
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
    const phoneDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
                setIsPhoneDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.phonePrefix) || COUNTRY_CODES[5];

    const checkEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) newErrors.name = t('contact.errors.required');
        
        if (!formData.phone.trim()) {
            newErrors.phone = t('contact.errors.required');
        } else {
            if (!isValidPhoneNumber(formData.phone, selectedCountry.iso.toUpperCase() as CountryCode)) {
                newErrors.phone = t('contact.errors.invalidPhone');
            }
        }

        if (!formData.email.trim()) {
            newErrors.email = t('contact.errors.required');
        } else if (!checkEmail(formData.email)) {
            newErrors.email = t('contact.errors.invalidEmail');
        }
        if (!formData.message.trim()) newErrors.message = t('contact.errors.required');

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsSubmitted(false);
            return;
        }

        setErrors({});
        setIsSubmitted(true);
        // Normally send to API here
        console.log("Submitting:", formData);
    };

    const getSuccessMessage = () => {
        const msg = t('contact.successMessage');
        const splitIndex = msg.indexOf('!');
        if (splitIndex !== -1) {
            return {
                title: msg.substring(0, splitIndex + 1),
                desc: msg.substring(splitIndex + 1).trim()
            };
        }
        return { title: "Success!", desc: msg };
    };

    const successData = getSuccessMessage();

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .ambient-shadow { box-shadow: 0 8px 32px rgba(25, 28, 33, 0.04); }
                .primary-gradient { background: linear-gradient(135deg, #003f87 0%, #0056b3 100%); }
            `}} />
            <Header />

            <main className="flex-grow pt-32 pb-24 px-6 max-w-7xl mx-auto w-full">
                {/* Breadcrumb / Label */}
                <div className="mb-8">
                    <span className="text-[0.6875rem] font-medium tracking-[0.1em] uppercase text-primary font-label">{t('contact.guestRelations')}</span>
                    <h1 className="text-5xl md:text-6xl font-headline font-bold text-primary mt-2 tracking-tight">{t('contact.howCanWeAssist')}</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                    {/* Left Column: Support Info */}
                    <div className="lg:col-span-5 space-y-12">
                        <p className="text-lg text-on-surface-variant leading-relaxed font-body max-w-md">
                            {t('contact.description')}
                        </p>
                        <div className="space-y-8">
                            {/* Service Hours Block */}
                            <div className="flex items-start gap-5">
                                <div className="p-3 bg-surface-container-low rounded-xl text-primary flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined">schedule</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-headline font-semibold text-primary mb-1">{t('contact.serviceHours')}</h3>
                                    <p className="text-on-surface-variant font-body">{t('contact.serviceHoursTime')}</p>
                                    <p className="text-sm text-outline mt-1 font-body">{t('contact.serviceHoursSub')}</p>
                                </div>
                            </div>

                            {/* Email Block */}
                            <div className="flex items-start gap-5">
                                <div className="p-3 bg-surface-container-low rounded-xl text-primary flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined">mail</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-headline font-semibold text-primary mb-1">{t('contact.emailUs')}</h3>
                                    <a className="text-on-surface-variant font-body hover:text-primary transition-colors underline underline-offset-4 decoration-outline-variant" href="mailto:support@azurehorizon.com">support@azurehorizon.com</a>
                                </div>
                            </div>

                            {/* FAQ Block */}
                            <div className="flex items-start gap-5">
                                <div className="p-3 bg-surface-container-low rounded-xl text-primary flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined">help_outline</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-headline font-semibold text-primary mb-1">{t('contact.faq')}</h3>
                                    <p className="text-on-surface-variant font-body mb-3">{t('contact.faqDesc')}</p>
                                    <a className="text-primary font-semibold text-sm flex items-center gap-2 group" href="#">
                                        {t('contact.viewFaq')}
                                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Asset */}
                        <div className="rounded-xl overflow-hidden aspect-[16/9] w-full relative group">
                            <img className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" alt="luxury hotel concierge desk with elegant marble counters and warm ambient lighting in a high-end lobby" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQyFceXASZsuTjJXxjYyx-MeFinrs2inzDL_XeF3xlt81WJMykVt3qPeJUHElBLlSADQF7xMnd4QTa9QZ8Qgd1tq26Vw6m5NnZBEIQJte4F0MisyzXCJ7bxSm_-8GwX-3UdX6EA2HgVcXZUK7KmFe5Tb_jDlBZJcHkQGHYFv9H4RbNSWyzPxYRPyP9bULJUuF9071-JFE7RT1KSV7nXY1KAMSxkC4jm-uuCHVr4FSRPydnlAZrOQrAwE3x7oKCuEInYaRVD7BgVfl0" />
                            <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
                        </div>
                    </div>

                    {/* Right Column: Support Form */}
                    <div className="lg:col-span-7">
                        <div className="bg-surface-container-lowest p-8 md:p-12 rounded-[1.5rem] shadow-xl ambient-shadow">

                            {isSubmitted ? (
                                <div className="text-center py-10 fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                                    </div>
                                    <h3 className="text-2xl font-bold font-headline text-on-surface mb-3">
                                        {successData.title}
                                    </h3>
                                    <p className="text-on-surface-variant leading-relaxed max-w-sm mx-auto">
                                        {successData.desc}
                                    </p>
                                    <button
                                        onClick={() => {
                                            setIsSubmitted(false);
                                            setFormData({ name: '', email: '', phonePrefix: '+84', phone: '', reference: '', subject: 'booking', message: '' });
                                        }}
                                        className="mt-8 px-8 py-3 bg-surface-container-low text-primary font-bold rounded-full hover:bg-surface-container transition-colors"
                                    >
                                        {language === 'vi' ? "Gửi yêu cầu khác" : "Send another"}
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                                {t('contact.fullName')} <span className="text-error">*</span>
                                            </label>
                                            <input
                                                className={`w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline/50 ${errors.name ? 'ring-2 ring-error/50 bg-error-container/10' : ''}`}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="NGUYEN VAN A"
                                                type="text"
                                            />
                                            {errors.name && <p className="text-xs text-error font-medium my-1 animate-pulse">{errors.name}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                                {t('contact.emailAddress')} <span className="text-error">*</span>
                                            </label>
                                            <input
                                                className={`w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline/50 ${errors.email ? 'ring-2 ring-error/50 bg-error-container/10' : ''}`}
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="example@gmail.com"
                                                type="text"
                                            />
                                            {errors.email && <p className="text-xs text-error font-medium my-1 animate-pulse">{errors.email}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                                {t('contact.phoneNumber')} <span className="text-error">*</span>
                                            </label>
                                            <div className={`flex bg-surface-container-low rounded-xl focus-within:ring-2 focus-within:ring-primary/20 transition-all font-body text-on-surface ${errors.phone ? 'ring-2 ring-error/50 bg-error-container/10' : ''}`}>
                                                {/* Custom Country Code Dropdown */}
                                                <div className="relative flex-shrink-0" ref={phoneDropdownRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsPhoneDropdownOpen(!isPhoneDropdownOpen)}
                                                        className="flex items-center gap-2 h-full px-4 py-4 cursor-pointer hover:bg-surface-container-highest transition-colors"
                                                        style={{ borderRight: '1px solid rgba(194, 198, 212, 0.3)' }}
                                                    >
                                                        <img src={getFlagUrl(selectedCountry.iso)} alt={selectedCountry.country} className="w-6 h-[18px] object-cover rounded-sm" />
                                                        <span className="text-sm font-medium text-on-surface">{selectedCountry.code}</span>
                                                        <span className="material-symbols-outlined text-sm text-outline transition-transform" style={{ transform: isPhoneDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                                                    </button>
                                                    {isPhoneDropdownOpen && (
                                                        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-outline-variant/20 overflow-hidden z-30 max-h-64 overflow-y-auto">
                                                            {COUNTRY_CODES.map((c) => (
                                                                <button
                                                                    key={c.code}
                                                                    type="button"
                                                                    onClick={() => { setFormData({ ...formData, phonePrefix: c.code }); setIsPhoneDropdownOpen(false); }}
                                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-container-lowest transition-colors ${formData.phonePrefix === c.code ? 'bg-primary/5 font-bold text-primary' : 'text-on-surface'
                                                                        }`}
                                                                >
                                                                    <img src={getFlagUrl(c.iso)} alt={c.country} className="w-6 h-[18px] object-cover rounded-sm" />
                                                                    <span>{c.country}</span>
                                                                    <span className="text-on-surface-variant">{c.code}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    className="w-full px-4 py-4 bg-transparent border-none outline-none font-body text-on-surface placeholder:text-outline/50 flex-1 min-w-0 !ring-0"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    type="tel"
                                                />
                                            </div>
                                            {errors.phone && <p className="text-xs text-error font-medium my-1 animate-pulse">{errors.phone}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">{t('contact.bookingRef')}</label>
                                            <input
                                                className="w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline/50"
                                                value={formData.reference}
                                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                                type="text"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">{t('contact.subject')}</label>
                                        <div className="relative">
                                            <select
                                                className="w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface appearance-none cursor-pointer pr-10"
                                                value={formData.subject}
                                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            >
                                                <option value="booking">{t('contact.subjectOptions.booking')}</option>
                                                <option value="payment">{t('contact.subjectOptions.payment')}</option>
                                                <option value="general">{t('contact.subjectOptions.general')}</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                            {t('contact.message')} <span className="text-error">*</span>
                                        </label>
                                        <textarea
                                            className={`w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline/50 resize-none ${errors.message ? 'ring-2 ring-error/50 bg-error-container/10' : ''}`}
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            placeholder={t('contact.messagePlaceholder')}
                                            rows={4}
                                        ></textarea>
                                        {errors.message && <p className="text-xs text-error font-medium my-1 animate-pulse">{errors.message}</p>}
                                    </div>

                                    {/* File Upload Zone */}
                                    <div className="group relative">
                                        <label className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label mb-2 block">{t('contact.attachments')}</label>
                                        <div className="border-2 border-dashed border-outline-variant/30 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-primary/40 transition-colors cursor-pointer bg-surface/50">
                                            <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors mb-2">cloud_upload</span>
                                            <p className="text-sm font-body text-on-surface-variant">{t('contact.attachInst')}</p>
                                            <p className="text-xs text-outline font-body mt-1">{t('contact.attachSize')}</p>
                                            <input className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" type="file" />
                                        </div>
                                    </div>

                                    <button className="w-full primary-gradient text-white py-5 rounded-full font-headline font-bold text-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] mt-4" type="submit">
                                        {t('contact.sendMsg')}
                                    </button>
                                    <p className="text-[0.6875rem] text-center text-outline font-label uppercase tracking-widest">
                                        {t('contact.avgResponse')}
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

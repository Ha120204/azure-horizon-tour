'use client';

import { useState, useRef, useEffect } from 'react';
import { isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { useLocale } from '@/app/context/LocaleContext';

const COUNTRY_CODES = [
    { code: '+1',  country: 'US', iso: 'us' },
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

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const getFlagUrl = (iso: string) => `https://flagcdn.com/24x18/${iso}.png`;

export default function ContactPage() {
    const { t } = useLocale();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phonePrefix: '+84',
        phone: '',
        reference: '',
        subject: 'booking',
        message: '',
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError]       = useState('');
    const [errors, setErrors]             = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted]   = useState(false);
    const [submittedTicketId, setSubmittedTicketId] = useState<number>(0);
    const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
    const phoneDropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef     = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
                setIsPhoneDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.phonePrefix) ?? COUNTRY_CODES[5];

    /* ── Validation ───────────────────────────────────────────── */
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim())    newErrors.name = t('contact.errors.required');
        if (!formData.email.trim())   newErrors.email = t('contact.errors.required');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
            newErrors.email = t('contact.errors.invalidEmail');
        if (!formData.phone.trim())   newErrors.phone = t('contact.errors.required');
        else if (!isValidPhoneNumber(formData.phone, selectedCountry.iso.toUpperCase() as CountryCode))
            newErrors.phone = t('contact.errors.invalidPhone');
        if (!formData.message.trim()) newErrors.message = t('contact.errors.required');
        return newErrors;
    };

    /* ── File picker ──────────────────────────────────────────── */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setFileError('');
        if (!file) { setSelectedFile(null); return; }
        if (file.size > MAX_FILE_SIZE) {
            setFileError(t('contact.errors.fileTooLarge'));
            setSelectedFile(null);
            e.target.value = '';
            return;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            setFileError(t('contact.errors.fileInvalidType'));
            setSelectedFile(null);
            e.target.value = '';
            return;
        }
        setSelectedFile(file);
    };

    const removeFile = () => {
        setSelectedFile(null);
        setFileError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    /* ── Submit ───────────────────────────────────────────────── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});
        setIsSubmitting(true);

        try {
            const body = new FormData();
            Object.entries(formData).forEach(([k, v]) => body.append(k, v));
            if (selectedFile) body.append('attachment', selectedFile);

            // Gửi userId nếu user đã đăng nhập để liên kết ticket với tài khoản
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    // Decode JWT payload để lấy userId (không cần verify)
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const userId = payload.sub ?? payload.id;
                    if (userId) body.append('userId', String(userId));
                } catch { /* bỏ qua nếu token không decode được */ }
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact/send`, {
                method: 'POST',
                body,
            });

            if (!res.ok) throw new Error('Server error');
            const data = await res.json();
            setSubmittedTicketId(data.ticketId ?? 0);
            setIsSubmitted(true);
        } catch {
            setErrors({ submit: 'Gửi thất bại. Vui lòng thử lại.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setIsSubmitted(false);
        setSelectedFile(null);
        setFileError('');
        setErrors({});
        setFormData({ name: '', email: '', phonePrefix: '+84', phone: '', reference: '', subject: 'booking', message: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    /* ── Input class helper ───────────────────────────────────── */
    const inputCls = (field: string) =>
        `w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline/50 ${errors[field] ? 'ring-2 ring-error/50' : ''}`;

    /* ── Render ───────────────────────────────────────────────── */
    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow pt-32 pb-24 px-6 max-w-7xl mx-auto w-full">
                {/* Label + Heading */}
                <div className="mb-8">
                    <span className="text-[0.6875rem] font-medium tracking-[0.1em] uppercase text-primary font-label">
                        {t('contact.guestRelations')}
                    </span>
                    <h1 className="text-5xl md:text-6xl font-headline font-bold text-primary mt-2 tracking-tight">
                        {t('contact.howCanWeAssist')}
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                    {/* ── Left Column ─────────────────────────────────── */}
                    <div className="lg:col-span-5 space-y-12">
                        <p className="text-lg text-on-surface-variant leading-relaxed font-body max-w-md">
                            {t('contact.description')}
                        </p>

                        <div className="space-y-8">
                            {/* Service Hours */}
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

                            {/* Email */}
                            <div className="flex items-start gap-5">
                                <div className="p-3 bg-surface-container-low rounded-xl text-primary flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined">mail</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-headline font-semibold text-primary mb-1">{t('contact.emailUs')}</h3>
                                    <a
                                        className="text-on-surface-variant font-body hover:text-primary transition-colors underline underline-offset-4 decoration-outline-variant"
                                        href="mailto:support@azurehorizon.com"
                                    >
                                        support@azurehorizon.com
                                    </a>
                                </div>
                            </div>

                            {/* FAQ */}
                            <div className="flex items-start gap-5">
                                <div className="p-3 bg-surface-container-low rounded-xl text-primary flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined">help_outline</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-headline font-semibold text-primary mb-1">{t('contact.faq')}</h3>
                                    <p className="text-on-surface-variant font-body mb-3">{t('contact.faqDesc')}</p>
                                    <a className="text-primary font-semibold text-sm flex items-center gap-2 group" href="/faq">
                                        {t('contact.viewFaq')}
                                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Decorative image */}
                        <div className="rounded-xl overflow-hidden aspect-[16/9] w-full relative group">
                            <img
                                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                                alt="luxury hotel concierge desk"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQyFceXASZsuTjJXxjYyx-MeFinrs2inzDL_XeF3xlt81WJMykVt3qPeJUHElBLlSADQF7xMnd4QTa9QZ8Qgd1tq26Vw6m5NnZBEIQJte4F0MisyzXCJ7bxSm_-8GwX-3UdX6EA2HgVcXZUK7KmFe5Tb_jDlBZJcHkQGHYFv9H4RbNSWyzPxYRPyP9bULJUuF9071-JFE7RT1KSV7nXY1KAMSxkC4jm-uuCHVr4FSRPydnlAZrOQrAwE3x7oKCuEInYaRVD7BgVfl0"
                            />
                            <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
                        </div>
                    </div>

                    {/* ── Right Column ────────────────────────────────── */}
                    <div className="lg:col-span-7">
                        <div className="bg-surface-container-lowest p-8 md:p-12 rounded-[1.5rem] shadow-xl" style={{ boxShadow: '0 8px 32px rgba(25,28,33,0.04)' }}>

                            {isSubmitted ? (
                                /* Success state */
                                <div className="text-center py-8 px-4">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5 text-primary">
                                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                                    </div>
                                    <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">Yêu cầu đã được gửi!</h3>
                                    <p className="text-on-surface-variant leading-relaxed max-w-sm mx-auto text-sm mb-6">
                                        Đội ngũ hỗ trợ Azure Horizon sẽ phản hồi trong vòng 2 giờ làm việc.
                                    </p>

                                    {/* Ticket ID Badge */}
                                    {submittedTicketId > 0 && (
                                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 mx-auto max-w-xs">
                                            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-label mb-1">Mã yêu cầu hỗ trợ của bạn</p>
                                            <p className="text-4xl font-mono font-bold text-primary">#{submittedTicketId}</p>
                                            <p className="text-xs text-outline mt-2">Lưu lại mã này để theo dõi tiến trình xử lý</p>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3">
                                        {submittedTicketId > 0 && (
                                            <a
                                                href={`/support/track?id=${submittedTicketId}&email=${encodeURIComponent(formData.email)}`}
                                                className="w-full text-white py-3.5 rounded-full font-headline font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                                style={{ background: 'linear-gradient(135deg,#003f87 0%,#0056b3 100%)' }}
                                            >
                                                <span className="material-symbols-outlined text-sm">search</span>
                                                Theo dõi tiến trình xử lý
                                            </a>
                                        )}
                                        <button
                                            onClick={resetForm}
                                            className="w-full px-8 py-3.5 bg-surface-container-low text-on-surface-variant font-bold rounded-full hover:bg-surface-container transition-colors text-sm"
                                        >
                                            Gửi yêu cầu khác
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Contact form */
                                <form onSubmit={handleSubmit} className="space-y-6" noValidate>

                                    {/* Row 1: Name + Email */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label htmlFor="contact-name" className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                                {t('contact.fullName')} <span className="text-error" aria-hidden="true">*</span>
                                            </label>
                                            <input
                                                id="contact-name"
                                                type="text"
                                                autoComplete="name"
                                                aria-required="true"
                                                aria-describedby={errors.name ? 'error-name' : undefined}
                                                className={inputCls('name')}
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder={t('contact.namePlaceholder')}
                                            />
                                            {errors.name && <p id="error-name" role="alert" className="text-xs text-error font-medium mt-1">{errors.name}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="contact-email" className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                                {t('contact.emailAddress')} <span className="text-error" aria-hidden="true">*</span>
                                            </label>
                                            <input
                                                id="contact-email"
                                                type="email"
                                                autoComplete="email"
                                                aria-required="true"
                                                aria-describedby={errors.email ? 'error-email' : undefined}
                                                className={inputCls('email')}
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="example@gmail.com"
                                            />
                                            {errors.email && <p id="error-email" role="alert" className="text-xs text-error font-medium mt-1">{errors.email}</p>}
                                        </div>
                                    </div>

                                    {/* Row 2: Phone + Booking ref */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label htmlFor="contact-phone" className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                                {t('contact.phoneNumber')} <span className="text-error" aria-hidden="true">*</span>
                                            </label>
                                            <div
                                                className={`flex bg-surface-container-low rounded-xl focus-within:ring-2 focus-within:ring-primary/20 transition-all ${errors.phone ? 'ring-2 ring-error/50' : ''}`}
                                                aria-describedby={errors.phone ? 'error-phone' : undefined}
                                            >
                                                {/* Country code dropdown */}
                                                <div className="relative flex-shrink-0" ref={phoneDropdownRef}>
                                                    <button
                                                        type="button"
                                                        aria-haspopup="listbox"
                                                        aria-expanded={isPhoneDropdownOpen}
                                                        aria-label={`Country code: ${selectedCountry.code}`}
                                                        onClick={() => setIsPhoneDropdownOpen(v => !v)}
                                                        className="flex items-center gap-2 h-full px-4 py-4 cursor-pointer hover:bg-surface-container-highest transition-colors"
                                                        style={{ borderRight: '1px solid rgba(194,198,212,0.3)' }}
                                                    >
                                                        <img src={getFlagUrl(selectedCountry.iso)} alt={selectedCountry.country} className="w-6 h-[18px] object-cover rounded-sm" />
                                                        <span className="text-sm font-medium text-on-surface">{selectedCountry.code}</span>
                                                        <span className="material-symbols-outlined text-sm text-outline transition-transform" style={{ transform: isPhoneDropdownOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                                                    </button>

                                                    {isPhoneDropdownOpen && (
                                                        <div role="listbox" aria-label="Select country code" className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-outline-variant/20 overflow-hidden z-30 max-h-64 overflow-y-auto">
                                                            {COUNTRY_CODES.map(c => (
                                                                <button
                                                                    key={c.code}
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={formData.phonePrefix === c.code}
                                                                    onClick={() => { setFormData({ ...formData, phonePrefix: c.code }); setIsPhoneDropdownOpen(false); }}
                                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-container-lowest transition-colors ${formData.phonePrefix === c.code ? 'bg-primary/5 font-bold text-primary' : 'text-on-surface'}`}
                                                                >
                                                                    <img src={getFlagUrl(c.iso)} alt={c.country} className="w-6 h-[18px] object-cover rounded-sm" />
                                                                    <span>{c.country}</span>
                                                                    <span className="text-on-surface-variant ml-auto">{c.code}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <input
                                                    id="contact-phone"
                                                    type="tel"
                                                    autoComplete="tel-national"
                                                    aria-required="true"
                                                    className="w-full px-4 py-4 bg-transparent border-none outline-none font-body text-on-surface placeholder:text-outline/50 flex-1 min-w-0 !ring-0"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="912 345 678"
                                                />
                                            </div>
                                            {errors.phone && <p id="error-phone" role="alert" className="text-xs text-error font-medium mt-1">{errors.phone}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="contact-ref" className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                                {t('contact.bookingRef')}
                                            </label>
                                            <input
                                                id="contact-ref"
                                                type="text"
                                                className="w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline/50"
                                                value={formData.reference}
                                                onChange={e => setFormData({ ...formData, reference: e.target.value })}
                                                placeholder="AZH-2024-XXXX"
                                            />
                                        </div>
                                    </div>

                                    {/* Subject */}
                                    <div className="space-y-2">
                                        <label htmlFor="contact-subject" className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                            {t('contact.subject')}
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="contact-subject"
                                                className="w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface appearance-none cursor-pointer pr-10"
                                                value={formData.subject}
                                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                            >
                                                <option value="booking">{t('contact.subjectOptions.booking')}</option>
                                                <option value="payment">{t('contact.subjectOptions.payment')}</option>
                                                <option value="cancellation">{t('contact.subjectOptions.cancellation')}</option>
                                                <option value="complaint">{t('contact.subjectOptions.complaint')}</option>
                                                <option value="partnership">{t('contact.subjectOptions.partnership')}</option>
                                                <option value="general">{t('contact.subjectOptions.general')}</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                                        </div>
                                    </div>

                                    {/* Message */}
                                    <div className="space-y-2">
                                        <label htmlFor="contact-message" className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                                            {t('contact.message')} <span className="text-error" aria-hidden="true">*</span>
                                        </label>
                                        <textarea
                                            id="contact-message"
                                            aria-required="true"
                                            aria-describedby={errors.message ? 'error-message' : undefined}
                                            className={`w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline/50 resize-none ${errors.message ? 'ring-2 ring-error/50' : ''}`}
                                            value={formData.message}
                                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                                            placeholder={t('contact.messagePlaceholder')}
                                            rows={4}
                                        />
                                        {errors.message && <p id="error-message" role="alert" className="text-xs text-error font-medium mt-1">{errors.message}</p>}
                                    </div>

                                    {/* File Upload */}
                                    <div className="space-y-2">
                                        <label className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label block">
                                            {t('contact.attachments')}
                                        </label>

                                        {selectedFile ? (
                                            /* File selected — show preview row */
                                            <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
                                                <span className="material-symbols-outlined text-primary text-xl">attach_file</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-on-surface truncate">{selectedFile.name}</p>
                                                    <p className="text-xs text-outline">{(selectedFile.size / 1024).toFixed(0)} KB — {t('contact.fileSelected')}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-label={t('contact.removeFile')}
                                                    onClick={removeFile}
                                                    className="p-1 rounded-full hover:bg-error/10 text-outline hover:text-error transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-base">close</span>
                                                </button>
                                            </div>
                                        ) : (
                                            /* Drop zone */
                                            <label
                                                htmlFor="contact-file"
                                                className="group relative border-2 border-dashed border-outline-variant/30 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-primary/40 transition-colors cursor-pointer bg-surface/50 block"
                                            >
                                                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors mb-2">cloud_upload</span>
                                                <p className="text-sm font-body text-on-surface-variant">{t('contact.attachInst')}</p>
                                                <p className="text-xs text-outline font-body mt-1">{t('contact.attachSize')}</p>
                                                <input
                                                    id="contact-file"
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    aria-label={t('contact.attachments')}
                                                    className="sr-only"
                                                    onChange={handleFileChange}
                                                />
                                            </label>
                                        )}

                                        {fileError && <p role="alert" className="text-xs text-error font-medium mt-1">{fileError}</p>}
                                    </div>

                                    {/* Submit error */}
                                    {errors.submit && (
                                        <p role="alert" className="text-sm text-error font-medium text-center">{errors.submit}</p>
                                    )}

                                    {/* Submit button */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full text-white py-5 rounded-full font-headline font-bold text-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{ background: 'linear-gradient(135deg,#003f87 0%,#0056b3 100%)' }}
                                    >
                                        {isSubmitting
                                            ? <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>{t('contact.submitting')}</span>
                                            : t('contact.sendMsg')
                                        }
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

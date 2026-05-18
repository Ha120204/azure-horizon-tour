'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { useLocale } from '@/app/context/LocaleContext';
import { API_BASE_URL } from '@/app/lib/constants';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/app/lib/publicSettings';

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

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const getFlagUrl = (iso: string) => `https://flagcdn.com/24x18/${iso}.png`;

type ContactInfoItem = {
    icon: string;
    title: string;
    body: string;
    note?: string;
    href?: string;
    action?: string;
};

export default function ContactPage() {
    const { t, language } = useLocale();

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
    const [fileError, setFileError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [submittedTicketId, setSubmittedTicketId] = useState<number>(0);
    const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
    const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);

    const phoneDropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsLoggedIn(Boolean(localStorage.getItem('accessToken')));
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
                setIsPhoneDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchPublicSettings(controller.signal)
            .then(setPublicSettings)
            .catch(error => {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    console.error('Error loading public settings:', error);
                }
            });

        return () => controller.abort();
    }, []);

    const selectedCountry = COUNTRY_CODES.find(country => country.code === formData.phonePrefix) ?? COUNTRY_CODES[5];

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = t('contact.errors.required');
        if (!formData.email.trim()) newErrors.email = t('contact.errors.required');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = t('contact.errors.invalidEmail');
        }

        if (!formData.phone.trim()) newErrors.phone = t('contact.errors.required');
        else if (!isValidPhoneNumber(formData.phone, selectedCountry.iso.toUpperCase() as CountryCode)) {
            newErrors.phone = t('contact.errors.invalidPhone');
        }

        if (!formData.message.trim()) newErrors.message = t('contact.errors.required');

        return newErrors;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        setFileError('');
        if (!file) {
            setSelectedFile(null);
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setFileError(t('contact.errors.fileTooLarge'));
            setSelectedFile(null);
            event.target.value = '';
            return;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            setFileError(t('contact.errors.fileInvalidType'));
            setSelectedFile(null);
            event.target.value = '';
            return;
        }

        setSelectedFile(file);
    };

    const removeFile = () => {
        setSelectedFile(null);
        setFileError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setIsSubmitting(true);

        try {
            const body = new FormData();
            Object.entries(formData).forEach(([key, value]) => body.append(key, value));
            if (selectedFile) body.append('attachment', selectedFile);

            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const userId = payload.sub ?? payload.id;
                    if (userId) body.append('userId', String(userId));
                } catch {
                    // Token decoding is only used to associate an optional support ticket.
                }
            }

            const response = await fetch(`${API_BASE_URL}/contact/send`, {
                method: 'POST',
                body,
            });

            if (!response.ok) throw new Error('Server error');

            const data = await response.json();
            setSubmittedTicketId(data.ticketId ?? 0);
            setIsSubmitted(true);
        } catch {
            setErrors({
                submit: language === 'vi'
                    ? 'Gửi thất bại. Vui lòng thử lại.'
                    : 'Unable to send your request. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setIsSubmitted(false);
        setSelectedFile(null);
        setFileError('');
        setErrors({});
        setFormData({
            name: '',
            email: '',
            phonePrefix: '+84',
            phone: '',
            reference: '',
            subject: 'booking',
            message: '',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const inputClass = (field: string) =>
        `w-full border-x-0 border-t-0 border-b bg-transparent px-2 py-3.5 font-body text-on-surface outline-none transition-colors placeholder:text-outline/45 focus:border-primary focus:ring-0 ${
            errors[field] ? 'border-error' : 'border-outline-variant'
        }`;

    const minimalFieldClass =
        'w-full border-x-0 border-t-0 border-b border-outline-variant bg-transparent px-2 py-3.5 font-body text-on-surface outline-none transition-colors placeholder:text-outline/45 focus:border-primary focus:ring-0';

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            <Header />

            <main className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32">
                <div className="mb-12 animate-fade-in-up">
                    <span className="font-label text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary">
                        {t('contact.guestRelations')}
                    </span>
                    <h1 className="mt-3 max-w-4xl font-headline text-4xl font-extrabold leading-[1.02] tracking-tight text-primary md:text-6xl">
                        {t('contact.howCanWeAssist')}
                    </h1>
                </div>

                <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
                    <section className="animate-fade-in-up space-y-14 lg:col-span-5">
                        <p className="max-w-md font-body text-lg leading-8 text-on-surface-variant">
                            {t('contact.description')}
                        </p>

                        <div className="space-y-10">
                            {([
                                {
                                    icon: 'schedule',
                                    title: t('contact.serviceHours'),
                                    body: t('contact.serviceHoursTime'),
                                    note: t('contact.serviceHoursSub'),
                                },
                                {
                                    icon: 'mail',
                                    title: t('contact.emailUs'),
                                    body: publicSettings.company_email,
                                    href: `mailto:${publicSettings.company_email}`,
                                },
                                {
                                    icon: 'call',
                                    title: 'Hotline',
                                    body: publicSettings.company_phone,
                                    href: `tel:${publicSettings.company_phone.replace(/\s+/g, '')}`,
                                },
                                {
                                    icon: 'location_on',
                                    title: language === 'vi' ? 'Van phong' : 'Office',
                                    body: publicSettings.company_address,
                                },
                                {
                                    icon: 'help_outline',
                                    title: language === 'vi' ? 'Hỗ trợ trực tiếp' : 'Direct support',
                                    body: language === 'vi'
                                        ? 'Gửi yêu cầu qua biểu mẫu bên cạnh, đội ngũ sẽ phản hồi qua email hoặc điện thoại.'
                                        : 'Send your request through the form and our team will reply by email or phone.',
                                },
                            ] as ContactInfoItem[]).map(item => (
                                <div key={item.title} className="group flex items-start gap-5">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary transition-colors group-hover:bg-primary/10">
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                    </div>
                                    <div>
                                        <h2 className="mb-1 font-headline text-lg font-semibold text-primary">{item.title}</h2>
                                        {item.href && !item.action ? (
                                            <a
                                                className="font-body text-on-surface-variant underline decoration-outline-variant underline-offset-4 transition-colors hover:text-primary"
                                                href={item.href}
                                            >
                                                {item.body}
                                            </a>
                                        ) : (
                                            <p className="font-body text-on-surface-variant">{item.body}</p>
                                        )}
                                        {item.note && <p className="mt-2 font-body text-sm text-outline">{item.note}</p>}
                                        {item.action && item.href && (
                                            <Link
                                                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                                                href={item.href}
                                            >
                                                {item.action}
                                                <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                                                    arrow_forward
                                                </span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-lg">
                            <Image
                                src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=85&w=1200"
                                alt="Luxury hotel concierge desk with warm ambient lighting"
                                fill
                                className="object-cover transition-transform duration-700 hover:scale-105"
                                sizes="(max-width: 1024px) 100vw, 40vw"
                            />
                            <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
                        </div>
                    </section>

                    <section className="animate-fade-in-up lg:col-span-7">
                        <div className="rounded-[2rem] border border-slate-200/70 bg-white/80 p-7 shadow-2xl shadow-slate-900/10 backdrop-blur md:p-10 lg:p-12">
                            {isSubmitted ? (
                                <div className="mx-auto max-w-md py-8 text-center">
                                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                                    </div>
                                    <h2 className="font-headline text-2xl font-bold text-on-surface">
                                        {language === 'vi' ? 'Yêu cầu đã được gửi' : 'Your request has been sent'}
                                    </h2>
                                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                                        {t('contact.successMessage')}
                                    </p>

                                    {submittedTicketId > 0 && (
                                        <div className="my-7 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                                            <p className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">
                                                {language === 'vi' ? 'Mã yêu cầu hỗ trợ' : 'Support ticket ID'}
                                            </p>
                                            <p className="mt-2 font-mono text-4xl font-bold text-primary">#{submittedTicketId}</p>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3">
                                        {isLoggedIn && (
                                            <Link
                                                href="/profile"
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-headline text-sm font-bold text-white transition-colors hover:bg-primary-container"
                                            >
                                                <span className="material-symbols-outlined text-sm">person</span>
                                                {language === 'vi' ? 'Xem yêu cầu trong hồ sơ' : 'View requests in profile'}
                                            </Link>
                                        )}
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="rounded-full bg-surface-container-low px-6 py-3.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
                                        >
                                            {t('contact.sendAnother')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form className="space-y-8" onSubmit={handleSubmit} noValidate>
                                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label htmlFor="contact-name" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {t('contact.fullName')} <span className="text-error">*</span>
                                            </label>
                                            <input
                                                id="contact-name"
                                                type="text"
                                                autoComplete="name"
                                                aria-describedby={errors.name ? 'contact-name-error' : undefined}
                                                className={inputClass('name')}
                                                value={formData.name}
                                                onChange={event => setFormData({ ...formData, name: event.target.value })}
                                                placeholder={t('contact.namePlaceholder')}
                                            />
                                            {errors.name && <p id="contact-name-error" className="text-xs font-medium text-error">{errors.name}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="contact-email" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {t('contact.emailAddress')} <span className="text-error">*</span>
                                            </label>
                                            <input
                                                id="contact-email"
                                                type="email"
                                                autoComplete="email"
                                                aria-describedby={errors.email ? 'contact-email-error' : undefined}
                                                className={inputClass('email')}
                                                value={formData.email}
                                                onChange={event => setFormData({ ...formData, email: event.target.value })}
                                                placeholder="a.thorne@example.com"
                                            />
                                            {errors.email && <p id="contact-email-error" className="text-xs font-medium text-error">{errors.email}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label htmlFor="contact-phone" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {t('contact.phoneNumber')} <span className="text-error">*</span>
                                            </label>
                                            <div
                                                className={`flex border-x-0 border-t-0 border-b bg-transparent transition-colors focus-within:border-primary ${
                                                    errors.phone ? 'border-error' : 'border-outline-variant'
                                                }`}
                                            >
                                                <div className="relative shrink-0" ref={phoneDropdownRef}>
                                                    <button
                                                        type="button"
                                                        aria-haspopup="listbox"
                                                        aria-expanded={isPhoneDropdownOpen}
                                                        onClick={() => setIsPhoneDropdownOpen(value => !value)}
                                                        className="flex h-full items-center gap-2 px-2 py-3.5 text-sm font-semibold text-on-surface transition-colors hover:text-primary"
                                                    >
                                                        <Image
                                                            src={getFlagUrl(selectedCountry.iso)}
                                                            alt={selectedCountry.country}
                                                            width={24}
                                                            height={18}
                                                            className="h-[18px] w-6 rounded-sm object-cover"
                                                        />
                                                        <span>{selectedCountry.code}</span>
                                                        <span className="material-symbols-outlined text-sm text-outline">expand_more</span>
                                                    </button>

                                                    {isPhoneDropdownOpen && (
                                                        <div role="listbox" className="absolute left-0 top-full z-30 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-outline-variant/30 bg-white py-1 shadow-xl">
                                                            {COUNTRY_CODES.map(country => (
                                                                <button
                                                                    key={country.code}
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={formData.phonePrefix === country.code}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, phonePrefix: country.code });
                                                                        setIsPhoneDropdownOpen(false);
                                                                    }}
                                                                    className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-container-low ${
                                                                        formData.phonePrefix === country.code ? 'bg-primary/5 font-bold text-primary' : 'text-on-surface'
                                                                    }`}
                                                                >
                                                                    <Image
                                                                        src={getFlagUrl(country.iso)}
                                                                        alt={country.country}
                                                                        width={24}
                                                                        height={18}
                                                                        className="h-[18px] w-6 rounded-sm object-cover"
                                                                    />
                                                                    <span>{country.country}</span>
                                                                    <span className="ml-auto text-on-surface-variant">{country.code}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <input
                                                    id="contact-phone"
                                                    type="tel"
                                                    autoComplete="tel-national"
                                                    aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
                                                    className="min-w-0 flex-1 border-none bg-transparent px-3 py-3.5 text-on-surface outline-none placeholder:text-outline/45 focus:ring-0"
                                                    value={formData.phone}
                                                    onChange={event => setFormData({ ...formData, phone: event.target.value })}
                                                    placeholder="912 345 678"
                                                />
                                            </div>
                                            {errors.phone && <p id="contact-phone-error" className="text-xs font-medium text-error">{errors.phone}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="contact-ref" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {t('contact.bookingRef')}
                                            </label>
                                            <input
                                                id="contact-ref"
                                                type="text"
                                                className={minimalFieldClass}
                                                value={formData.reference}
                                                onChange={event => setFormData({ ...formData, reference: event.target.value })}
                                                placeholder="AH-98234-X"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="contact-subject" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                            {t('contact.subject')}
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="contact-subject"
                                                className={`${minimalFieldClass} cursor-pointer appearance-none pr-10`}
                                                value={formData.subject}
                                                onChange={event => setFormData({ ...formData, subject: event.target.value })}
                                            >
                                                <option value="booking">{t('contact.subjectOptions.booking')}</option>
                                                <option value="payment">{t('contact.subjectOptions.payment')}</option>
                                                <option value="cancellation">{t('contact.subjectOptions.cancellation')}</option>
                                                <option value="complaint">{t('contact.subjectOptions.complaint')}</option>
                                                <option value="partnership">{t('contact.subjectOptions.partnership')}</option>
                                                <option value="general">{t('contact.subjectOptions.general')}</option>
                                            </select>
                                            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-outline">
                                                expand_more
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="contact-message" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                            {t('contact.message')} <span className="text-error">*</span>
                                        </label>
                                        <textarea
                                            id="contact-message"
                                            aria-describedby={errors.message ? 'contact-message-error' : undefined}
                                            className={`${inputClass('message')} resize-none`}
                                            rows={4}
                                            value={formData.message}
                                            onChange={event => setFormData({ ...formData, message: event.target.value })}
                                            placeholder={t('contact.messagePlaceholder')}
                                        />
                                        {errors.message && <p id="contact-message-error" className="text-xs font-medium text-error">{errors.message}</p>}
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                            {t('contact.attachments')}
                                        </label>

                                        {selectedFile ? (
                                            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                                                <span className="material-symbols-outlined text-primary">attach_file</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-on-surface">{selectedFile.name}</p>
                                                    <p className="text-xs text-outline">
                                                        {(selectedFile.size / 1024).toFixed(0)} KB - {t('contact.fileSelected')}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-label={t('contact.removeFile')}
                                                    onClick={removeFile}
                                                    className="rounded-full p-1 text-outline transition-colors hover:bg-error/10 hover:text-error"
                                                >
                                                    <span className="material-symbols-outlined text-base">close</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <label
                                                htmlFor="contact-file"
                                                className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/60 bg-transparent p-8 text-center transition-all hover:border-primary/40 hover:bg-primary/5"
                                            >
                                                <span className="material-symbols-outlined mb-3 text-3xl text-outline transition-colors group-hover:text-primary">
                                                    cloud_upload
                                                </span>
                                                <p className="text-sm font-medium text-on-surface-variant">{t('contact.attachInst')}</p>
                                                <p className="mt-2 text-xs text-outline">{t('contact.attachSize')}</p>
                                                <input
                                                    id="contact-file"
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    className="sr-only"
                                                    onChange={handleFileChange}
                                                />
                                            </label>
                                        )}

                                        {fileError && <p className="text-xs font-medium text-error">{fileError}</p>}
                                    </div>

                                    {errors.submit && <p className="text-center text-sm font-medium text-error">{errors.submit}</p>}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full rounded-full bg-primary px-6 py-5 font-headline text-lg font-bold text-white shadow-[0_8px_24px_rgba(0,86,179,0.28)] transition-all hover:bg-primary-container hover:shadow-[0_12px_32px_rgba(0,86,179,0.36)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                                                {t('contact.submitting')}
                                            </span>
                                        ) : (
                                            t('contact.sendMsg')
                                        )}
                                    </button>

                                    <p className="text-center font-label text-[0.6875rem] uppercase tracking-widest text-outline">
                                        {t('contact.avgResponse')}
                                    </p>
                                </form>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}

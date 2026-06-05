'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/constants';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/lib/publicSettings';
import { AuthProfile, fetchAuthProfile } from '@/lib/authSession';

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
const BOOKING_REF_REQUIRED_SUBJECTS = new Set(['payment', 'cancellation', 'complaint']);
const SUBJECT_OPTIONS = [
    {
        value: 'booking',
        labelKey: 'booking',
        icon: 'confirmation_number',
        description: {
            vi: 'Tư vấn tour, lịch khởi hành và chỗ còn trống.',
            en: 'Tour advice, departure dates, and availability.',
        },
    },
    {
        value: 'payment',
        labelKey: 'payment',
        icon: 'payments',
        description: {
            vi: 'Xử lý thanh toán, hoàn tiền hoặc hóa đơn.',
            en: 'Payment, refund, or receipt support.',
        },
    },
    {
        value: 'cancellation',
        labelKey: 'cancellation',
        icon: 'event_busy',
        description: {
            vi: 'Đổi lịch, hủy tour hoặc kiểm tra điều kiện.',
            en: 'Reschedule, cancel, or check conditions.',
        },
    },
    {
        value: 'complaint',
        labelKey: 'complaint',
        icon: 'support_agent',
        description: {
            vi: 'Báo sự cố dịch vụ trong hoặc sau chuyến đi.',
            en: 'Report a service issue during or after travel.',
        },
    },
    {
        value: 'partnership',
        labelKey: 'partnership',
        icon: 'handshake',
        description: {
            vi: 'Đề xuất hợp tác, đại lý hoặc nhà cung cấp.',
            en: 'Partnership, agency, or supplier inquiries.',
        },
    },
    {
        value: 'general',
        labelKey: 'general',
        icon: 'help_outline',
        description: {
            vi: 'Câu hỏi khác chưa thuộc các nhóm trên.',
            en: 'Other questions that do not fit the list.',
        },
    },
] as const;

const getFlagUrl = (iso: string) => `https://flagcdn.com/24x18/${iso}.png`;

type ContactInfoItem = {
    icon: string;
    title: string;
    body: string;
    note?: string;
    href?: string;
    action?: string;
};

type ContactSubmitResponse = {
    ticketId?: number;
    accessCode?: string;
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
    const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
    const [submittedTicketId, setSubmittedTicketId] = useState<number>(0);
    const [submittedAccessCode, setSubmittedAccessCode] = useState('');
    const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
    const [activePhoneIndex, setActivePhoneIndex] = useState(5);
    const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
    const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
    const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);

    const phoneListboxId = useId();
    const subjectListboxId = useId();
    const phoneDropdownRef = useRef<HTMLDivElement>(null);
    const phoneButtonRef = useRef<HTMLButtonElement>(null);
    const phoneOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const subjectDropdownRef = useRef<HTMLDivElement>(null);
    const subjectButtonRef = useRef<HTMLButtonElement>(null);
    const subjectOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAuthProfile()
            .then((profile) => {
                setAuthProfile(profile);
                setIsLoggedIn(Boolean(profile));
            })
            .catch(() => {
                setAuthProfile(null);
                setIsLoggedIn(false);
            });
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
                setIsPhoneDropdownOpen(false);
            }
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
                setIsSubjectDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isSubjectDropdownOpen) return;

        subjectOptionRefs.current[activeSubjectIndex]?.focus();
    }, [activeSubjectIndex, isSubjectDropdownOpen]);

    useEffect(() => {
        if (!isPhoneDropdownOpen) return;

        phoneOptionRefs.current[activePhoneIndex]?.focus();
    }, [activePhoneIndex, isPhoneDropdownOpen]);

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
    const selectedCountryIndex = Math.max(0, COUNTRY_CODES.findIndex(country => country.code === formData.phonePrefix));
    const selectedSubject = SUBJECT_OPTIONS.find(option => option.value === formData.subject) ?? SUBJECT_OPTIONS[0];
    const selectedSubjectIndex = Math.max(0, SUBJECT_OPTIONS.findIndex(option => option.value === formData.subject));
    const isBookingRefRequired = BOOKING_REF_REQUIRED_SUBJECTS.has(formData.subject);
    const supportPhoneHref = `tel:${publicSettings.company_phone.replace(/\s+/g, '')}`;
    const supportEmailHref = `mailto:${publicSettings.company_email}`;
    const heroTitle = t('contact.howCanWeAssist');
    const bookingRefLabel = language === 'vi' ? 'Mã đặt chỗ' : 'Booking reference';
    const bookingRefHelp = isBookingRefRequired
        ? language === 'vi'
            ? 'Bắt buộc để nhân viên tra cứu đúng đơn đặt tour của bạn.'
            : 'Required so support staff can look up the correct booking.'
        : language === 'vi'
            ? 'Không bắt buộc với câu hỏi tư vấn chung.'
            : 'Optional for general planning questions.';

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

        if (isBookingRefRequired && !formData.reference.trim()) {
            newErrors.reference = language === 'vi'
                ? 'Vui lòng nhập mã đặt chỗ cho loại yêu cầu này'
                : 'Please enter your booking reference for this request type';
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

            const userId = authProfile?.id ?? authProfile?.userId;
            if (userId) {
                body.append('userId', String(userId));
            }

            const response = await fetch(`${API_BASE_URL}/contact/send`, {
                method: 'POST',
                body,
            });

            if (!response.ok) throw new Error('Server error');

            const data = (await response.json()) as ContactSubmitResponse;
            setSubmittedTicketId(data.ticketId ?? 0);
            setSubmittedAccessCode(data.accessCode ?? '');
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
        setSubmittedAccessCode('');
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

    const openPhoneDropdown = (index = selectedCountryIndex) => {
        setActivePhoneIndex(index);
        setIsPhoneDropdownOpen(true);
    };

    const closePhoneDropdown = () => {
        setIsPhoneDropdownOpen(false);
        phoneButtonRef.current?.focus();
    };

    const movePhoneFocus = (nextIndex: number) => {
        const optionCount = COUNTRY_CODES.length;
        setActivePhoneIndex((nextIndex + optionCount) % optionCount);
    };

    const handlePhonePrefixChange = (nextPrefix: string) => {
        const nextIndex = COUNTRY_CODES.findIndex(country => country.code === nextPrefix);

        setFormData(current => ({ ...current, phonePrefix: nextPrefix }));
        setIsPhoneDropdownOpen(false);
        setActivePhoneIndex(Math.max(0, nextIndex));
        phoneButtonRef.current?.focus();
    };

    const handlePhoneButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Escape') {
            setIsPhoneDropdownOpen(false);
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            openPhoneDropdown(Math.min(selectedCountryIndex + 1, COUNTRY_CODES.length - 1));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            openPhoneDropdown(Math.max(selectedCountryIndex - 1, 0));
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPhoneDropdown(selectedCountryIndex);
        }
    };

    const handlePhoneOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, countryCode: string) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closePhoneDropdown();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            movePhoneFocus(activePhoneIndex + 1);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            movePhoneFocus(activePhoneIndex - 1);
            return;
        }

        if (event.key === 'Home') {
            event.preventDefault();
            movePhoneFocus(0);
            return;
        }

        if (event.key === 'End') {
            event.preventDefault();
            movePhoneFocus(COUNTRY_CODES.length - 1);
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handlePhonePrefixChange(countryCode);
        }
    };

    const openSubjectDropdown = (index = selectedSubjectIndex) => {
        setActiveSubjectIndex(index);
        setIsSubjectDropdownOpen(true);
    };

    const closeSubjectDropdown = () => {
        setIsSubjectDropdownOpen(false);
        subjectButtonRef.current?.focus();
    };

    const moveSubjectFocus = (nextIndex: number) => {
        const optionCount = SUBJECT_OPTIONS.length;
        setActiveSubjectIndex((nextIndex + optionCount) % optionCount);
    };

    const handleSubjectChange = (nextSubject: string) => {
        const nextIndex = SUBJECT_OPTIONS.findIndex(option => option.value === nextSubject);

        setFormData(current => ({ ...current, subject: nextSubject }));
        setIsSubjectDropdownOpen(false);
        setActiveSubjectIndex(Math.max(0, nextIndex));
        subjectButtonRef.current?.focus();
        if (!BOOKING_REF_REQUIRED_SUBJECTS.has(nextSubject)) {
            setErrors(current => {
                const nextErrors = { ...current };
                delete nextErrors.reference;
                return nextErrors;
            });
        }
    };

    const handleSubjectButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Escape') {
            setIsSubjectDropdownOpen(false);
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            openSubjectDropdown(Math.min(selectedSubjectIndex + 1, SUBJECT_OPTIONS.length - 1));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            openSubjectDropdown(Math.max(selectedSubjectIndex - 1, 0));
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openSubjectDropdown(selectedSubjectIndex);
        }
    };

    const handleSubjectOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, optionValue: string) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeSubjectDropdown();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveSubjectFocus(activeSubjectIndex + 1);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveSubjectFocus(activeSubjectIndex - 1);
            return;
        }

        if (event.key === 'Home') {
            event.preventDefault();
            moveSubjectFocus(0);
            return;
        }

        if (event.key === 'End') {
            event.preventDefault();
            moveSubjectFocus(SUBJECT_OPTIONS.length - 1);
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSubjectChange(optionValue);
        }
    };

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes contact-hero-up {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .contact-hero-enter {
                    animation: contact-hero-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .contact-hero-enter-d1 { animation-delay: 80ms; }
                .contact-hero-enter-d2 { animation-delay: 180ms; }
                .contact-hero-enter-d3 { animation-delay: 280ms; }
                .contact-hero-enter-d4 { animation-delay: 380ms; }

                @media (prefers-reduced-motion: reduce) {
                    .contact-hero-enter {
                        animation: none !important;
                    }
                }
            `}} />
            <Header />

            <main className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32">
                <div className="mb-12">
                    <span className="contact-hero-enter contact-hero-enter-d1 inline-block font-label text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary">
                        {t('contact.guestRelations')}
                    </span>
                    <h1 className="contact-hero-enter contact-hero-enter-d2 mt-3 max-w-4xl font-headline text-4xl font-extrabold leading-[1.02] tracking-tight text-primary md:text-6xl">
                        {heroTitle}
                    </h1>
                </div>

                <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
                    <section className="space-y-14 lg:col-span-5">
                        <p className="contact-hero-enter contact-hero-enter-d3 max-w-md font-body text-lg leading-8 text-on-surface-variant">
                            {t('contact.description')}
                        </p>

                        <div className="contact-hero-enter contact-hero-enter-d4 flex flex-wrap gap-3">
                            <a
                                href={supportPhoneHref}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">call</span>
                                {language === 'vi' ? 'Gọi ngay' : 'Call Now'}
                            </a>
                            <a
                                href={supportEmailHref}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/60 bg-white px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">mail</span>
                                {language === 'vi' ? 'Gửi email' : 'Email Us'}
                            </a>
                            {isLoggedIn ? (
                                <Link
                                    href="/profile"
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/60 bg-white px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">assignment</span>
                                    {language === 'vi' ? 'Theo dõi yêu cầu' : 'Track Requests'}
                                </Link>
                            ) : (
                                <a
                                    href="#contact-request-form"
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/60 bg-white px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit_note</span>
                                    {language === 'vi' ? 'Gửi yêu cầu' : 'Send Request'}
                                </a>
                            )}
                        </div>

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
                                    title: language === 'vi' ? 'Văn phòng' : 'Office',
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
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xl shadow-slate-900/5 md:p-10 lg:p-12">
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
                                            {!isLoggedIn && submittedAccessCode && (
                                                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                    <p className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-amber-700">
                                                        {language === 'vi' ? 'Mã truy cập' : 'Access code'}
                                                    </p>
                                                    <p className="mt-2 break-all font-mono text-sm font-bold text-amber-800">
                                                        {submittedAccessCode}
                                                    </p>
                                                </div>
                                            )}
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
                                        {!isLoggedIn && submittedTicketId > 0 && submittedAccessCode && (
                                            <Link
                                                href={`/support/track/${submittedTicketId}?accessCode=${encodeURIComponent(submittedAccessCode)}`}
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-headline text-sm font-bold text-white transition-colors hover:bg-primary-container"
                                            >
                                                <span className="material-symbols-outlined text-sm">support_agent</span>
                                                {language === 'vi' ? 'Theo dõi yêu cầu' : 'Track request'}
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
                                <form id="contact-request-form" className="space-y-8 scroll-mt-28" onSubmit={handleSubmit} noValidate>
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
                                                        ref={phoneButtonRef}
                                                        type="button"
                                                        aria-haspopup="listbox"
                                                        aria-expanded={isPhoneDropdownOpen}
                                                        aria-controls={isPhoneDropdownOpen ? phoneListboxId : undefined}
                                                        aria-label={language === 'vi' ? 'Chọn mã quốc gia' : 'Select country code'}
                                                        onClick={() => {
                                                            if (isPhoneDropdownOpen) {
                                                                setIsPhoneDropdownOpen(false);
                                                                return;
                                                            }

                                                            openPhoneDropdown(selectedCountryIndex);
                                                        }}
                                                        onKeyDown={handlePhoneButtonKeyDown}
                                                        className="flex h-full items-center gap-2 px-2 py-3.5 text-sm font-semibold text-on-surface outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/20"
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
                                                        <div
                                                            id={phoneListboxId}
                                                            role="listbox"
                                                            aria-label={language === 'vi' ? 'Mã quốc gia' : 'Country code'}
                                                            aria-activedescendant={`${phoneListboxId}-${COUNTRY_CODES[activePhoneIndex]?.code.replace('+', '') ?? selectedCountry.code.replace('+', '')}`}
                                                            className="absolute left-0 top-full z-30 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-outline-variant/30 bg-white py-1 shadow-xl"
                                                        >
                                                            {COUNTRY_CODES.map((country, index) => {
                                                                const selected = formData.phonePrefix === country.code;
                                                                const active = index === activePhoneIndex;

                                                                return (
                                                                <button
                                                                    key={country.code}
                                                                    id={`${phoneListboxId}-${country.code.replace('+', '')}`}
                                                                    ref={element => {
                                                                        phoneOptionRefs.current[index] = element;
                                                                    }}
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={selected}
                                                                    tabIndex={active ? 0 : -1}
                                                                    onClick={() => handlePhonePrefixChange(country.code)}
                                                                    onFocus={() => setActivePhoneIndex(index)}
                                                                    onMouseEnter={() => setActivePhoneIndex(index)}
                                                                    onKeyDown={event => handlePhoneOptionKeyDown(event, country.code)}
                                                                    className={`flex w-full items-center gap-3 px-4 py-3 text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary/30 ${
                                                                        selected
                                                                            ? 'bg-primary/5 font-bold text-primary'
                                                                            : active
                                                                                ? 'bg-surface-container-low text-on-surface'
                                                                                : 'text-on-surface'
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
                                                                );
                                                            })}
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
                                                {bookingRefLabel}{' '}
                                                {isBookingRefRequired ? (
                                                    <span className="text-error">*</span>
                                                ) : (
                                                    <span className="text-outline">
                                                        {language === 'vi' ? '(Không bắt buộc)' : '(Optional)'}
                                                    </span>
                                                )}
                                            </label>
                                            <input
                                                id="contact-ref"
                                                type="text"
                                                aria-describedby={errors.reference ? 'contact-ref-error' : 'contact-ref-help'}
                                                className={inputClass('reference')}
                                                value={formData.reference}
                                                onChange={event => setFormData({ ...formData, reference: event.target.value })}
                                                placeholder="AH-98234-X"
                                            />
                                            {errors.reference ? (
                                                <p id="contact-ref-error" className="text-xs font-medium text-error">{errors.reference}</p>
                                            ) : (
                                                <p id="contact-ref-help" className="text-xs text-outline">{bookingRefHelp}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="contact-subject" id="contact-subject-label" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                            {t('contact.subject')}
                                        </label>
                                        <div ref={subjectDropdownRef} className="relative">
                                            <button
                                                id="contact-subject"
                                                ref={subjectButtonRef}
                                                type="button"
                                                aria-haspopup="listbox"
                                                aria-expanded={isSubjectDropdownOpen}
                                                aria-controls={isSubjectDropdownOpen ? subjectListboxId : undefined}
                                                aria-labelledby="contact-subject-label"
                                                onClick={() => {
                                                    if (isSubjectDropdownOpen) {
                                                        setIsSubjectDropdownOpen(false);
                                                        return;
                                                    }

                                                    openSubjectDropdown(selectedSubjectIndex);
                                                }}
                                                onKeyDown={handleSubjectButtonKeyDown}
                                                className={`${minimalFieldClass} flex cursor-pointer items-center justify-between gap-3 pr-2 text-left focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20`}
                                            >
                                                <span className="flex min-w-0 items-center gap-3">
                                                    <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
                                                        {selectedSubject.icon}
                                                    </span>
                                                    <span className="truncate">
                                                        {t(`contact.subjectOptions.${selectedSubject.labelKey}`)}
                                                    </span>
                                                </span>
                                                <span
                                                    className={`material-symbols-outlined shrink-0 text-outline transition-transform ${isSubjectDropdownOpen ? 'rotate-180 text-primary' : ''}`}
                                                    aria-hidden="true"
                                                >
                                                expand_more
                                                </span>
                                            </button>

                                            {isSubjectDropdownOpen && (
                                                <div
                                                    id={subjectListboxId}
                                                    role="listbox"
                                                    aria-labelledby="contact-subject-label"
                                                    aria-activedescendant={`${subjectListboxId}-${SUBJECT_OPTIONS[activeSubjectIndex]?.value ?? selectedSubject.value}`}
                                                    className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-outline-variant/20 bg-white p-1.5 shadow-2xl shadow-slate-900/12"
                                                >
                                                    <div className="max-h-72 overflow-y-auto">
                                                        {SUBJECT_OPTIONS.map((option, index) => {
                                                            const selected = option.value === formData.subject;
                                                            const active = index === activeSubjectIndex;

                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    id={`${subjectListboxId}-${option.value}`}
                                                                    ref={element => {
                                                                        subjectOptionRefs.current[index] = element;
                                                                    }}
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={selected}
                                                                    tabIndex={active ? 0 : -1}
                                                                    onClick={() => handleSubjectChange(option.value)}
                                                                    onFocus={() => setActiveSubjectIndex(index)}
                                                                    onMouseEnter={() => setActiveSubjectIndex(index)}
                                                                    onKeyDown={event => handleSubjectOptionKeyDown(event, option.value)}
                                                                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                                                                        selected
                                                                            ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                                                                            : active
                                                                                ? 'bg-surface-container-low text-on-surface'
                                                                                : 'text-on-surface hover:bg-surface-container-low'
                                                                    } outline-none focus-visible:ring-2 focus-visible:ring-primary/30`}
                                                                >
                                                                    <span
                                                                        className={`material-symbols-outlined mt-0.5 text-[18px] ${selected ? 'text-primary' : 'text-on-surface-variant/70'}`}
                                                                        aria-hidden="true"
                                                                    >
                                                                        {option.icon}
                                                                    </span>
                                                                    <span className="min-w-0 flex-1">
                                                                        <span className="block whitespace-normal break-words text-sm font-bold leading-5">
                                                                            {t(`contact.subjectOptions.${option.labelKey}`)}
                                                                        </span>
                                                                        <span className={`mt-0.5 block text-xs font-medium leading-5 ${selected ? 'text-primary/75' : 'text-on-surface-variant'}`}>
                                                                            {language === 'vi' ? option.description.vi : option.description.en}
                                                                        </span>
                                                                    </span>
                                                                    {selected && (
                                                                        <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary" aria-hidden="true">
                                                                            done
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
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
                                        className="group relative w-full overflow-hidden rounded-full bg-primary px-6 py-5 font-headline text-lg font-bold text-white shadow-[0_8px_24px_rgba(0,86,179,0.28)] outline-none transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-[0_16px_34px_rgba(0,86,179,0.34)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-primary disabled:hover:shadow-[0_8px_24px_rgba(0,86,179,0.28)] motion-reduce:transform-none"
                                    >
                                        <span
                                            className="pointer-events-none absolute inset-y-0 -left-1/3 z-0 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[420%] group-hover:opacity-100 group-disabled:opacity-0 motion-reduce:hidden"
                                            aria-hidden="true"
                                        />
                                        {isSubmitting ? (
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined animate-spin text-base motion-reduce:animate-none">progress_activity</span>
                                                {t('contact.submitting')}
                                            </span>
                                        ) : (
                                            <span className="relative z-10 inline-flex items-center justify-center gap-2">
                                                <span className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-1 motion-reduce:transform-none">
                                                    {t('contact.sendMsg')}
                                                </span>
                                                <span
                                                    className="material-symbols-outlined translate-x-[-0.5rem] text-[20px] opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:translate-x-0 motion-reduce:opacity-100"
                                                    aria-hidden="true"
                                                >
                                                    arrow_forward
                                                </span>
                                            </span>
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

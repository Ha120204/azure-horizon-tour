'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/http/constants';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/lib/settings/publicSettings';
import { type AuthProfile, fetchAuthProfile } from '@/lib/auth/authSession';

// ── Constants ─────────────────────────────────────────────────────────────

export const COUNTRY_CODES = [
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

export const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const BOOKING_REF_REQUIRED_SUBJECTS = new Set(['payment', 'cancellation', 'complaint']);

export const SUBJECT_OPTIONS = [
    {
        value: 'booking',
        labelKey: 'booking',
        icon: 'confirmation_number',
        description: { vi: 'Tư vấn tour, lịch khởi hành và chỗ còn trống.', en: 'Tour advice, departure dates, and availability.' },
    },
    {
        value: 'payment',
        labelKey: 'payment',
        icon: 'payments',
        description: { vi: 'Xử lý thanh toán, hoàn tiền hoặc hóa đơn.', en: 'Payment, refund, or receipt support.' },
    },
    {
        value: 'cancellation',
        labelKey: 'cancellation',
        icon: 'event_busy',
        description: { vi: 'Đổi lịch, hủy tour hoặc kiểm tra điều kiện.', en: 'Reschedule, cancel, or check conditions.' },
    },
    {
        value: 'complaint',
        labelKey: 'complaint',
        icon: 'support_agent',
        description: { vi: 'Báo sự cố dịch vụ trong hoặc sau chuyến đi.', en: 'Report a service issue during or after travel.' },
    },
    {
        value: 'partnership',
        labelKey: 'partnership',
        icon: 'handshake',
        description: { vi: 'Đề xuất hợp tác, đại lý hoặc nhà cung cấp.', en: 'Partnership, agency, or supplier inquiries.' },
    },
    {
        value: 'general',
        labelKey: 'general',
        icon: 'help_outline',
        description: { vi: 'Câu hỏi khác chưa thuộc các nhóm trên.', en: 'Other questions that do not fit the list.' },
    },
] as const;

export const CONTEXT_FIELD_KEYS: SupportContextField[] = [
    'tourInterest', 'preferredTravelDate', 'guestCount', 'preferredContactMethod',
    'paymentMethod', 'requestedChangeDate', 'cancellationReason', 'issueOccurredAt',
    'companyName', 'partnerType', 'website',
];

export const getFlagUrl = (iso: string) => `https://flagcdn.com/24x18/${iso}.png`;

// ── Types ─────────────────────────────────────────────────────────────────

export type ContactInfoItem = {
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

export type SupportContextFields = {
    tourInterest: string;
    preferredTravelDate: string;
    guestCount: string;
    preferredContactMethod: string;
    paymentMethod: string;
    requestedChangeDate: string;
    cancellationReason: string;
    issueOccurredAt: string;
    companyName: string;
    partnerType: string;
    website: string;
};

export type SupportContextField = keyof SupportContextFields;

export type SupportSelectOption = {
    value: string;
    label: string;
};

// ── Internal defaults ─────────────────────────────────────────────────────

const EMPTY_FORM_DATA = {
    name: '', email: '', phonePrefix: '+84', phone: '',
    reference: '', subject: 'booking', message: '',
};

const EMPTY_CONTEXT_FIELDS: SupportContextFields = {
    tourInterest: '', preferredTravelDate: '', guestCount: '',
    preferredContactMethod: '', paymentMethod: '', requestedChangeDate: '',
    cancellationReason: '', issueOccurredAt: '', companyName: '',
    partnerType: '', website: '',
};

// ── Hook ──────────────────────────────────────────────────────────────────

export function useContactForm() {
    const { t, language } = useLocale();

    const [formData, setFormData] = useState({ ...EMPTY_FORM_DATA });
    const [contextFields, setContextFields] = useState<SupportContextFields>({ ...EMPTY_CONTEXT_FIELDS });
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
    const formPanelRef = useRef<HTMLDivElement>(null);
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

    // ── Derived ───────────────────────────────────────────────────────────

    const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.phonePrefix) ?? COUNTRY_CODES[5];
    const selectedCountryIndex = Math.max(0, COUNTRY_CODES.findIndex(c => c.code === formData.phonePrefix));
    const selectedSubject = SUBJECT_OPTIONS.find(o => o.value === formData.subject) ?? SUBJECT_OPTIONS[0];
    const selectedSubjectIndex = Math.max(0, SUBJECT_OPTIONS.findIndex(o => o.value === formData.subject));
    const isBookingRefRequired = BOOKING_REF_REQUIRED_SUBJECTS.has(formData.subject);
    const supportPhoneHref = `tel:${publicSettings.company_phone.replace(/\s+/g, '')}`;
    const supportEmailHref = `mailto:${publicSettings.company_email}`;
    const heroTitle = t('contact.howCanWeAssist');
    const bookingRefLabel = language === 'vi' ? 'Mã đặt chỗ' : 'Booking reference';
    const today = new Date();
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const bookingRefHelp = isBookingRefRequired
        ? language === 'vi' ? 'Bắt buộc để nhân viên tra cứu đúng đơn đặt tour của bạn.' : 'Required so support staff can look up the correct booking.'
        : language === 'vi' ? 'Không bắt buộc với câu hỏi tư vấn chung.' : 'Optional for general planning questions.';
    const contextLabels: Record<SupportContextField, string> = {
        tourInterest:           language === 'vi' ? 'Tour/điểm đến quan tâm'    : 'Tour/destination of interest',
        preferredTravelDate:    language === 'vi' ? 'Ngày đi dự kiến'           : 'Preferred travel date',
        guestCount:             language === 'vi' ? 'Số khách'                  : 'Guests',
        preferredContactMethod: language === 'vi' ? 'Kênh liên hệ ưu tiên'     : 'Preferred contact channel',
        paymentMethod:          language === 'vi' ? 'Phương thức thanh toán'    : 'Payment method',
        requestedChangeDate:    language === 'vi' ? 'Ngày muốn đổi sang'        : 'Requested new date',
        cancellationReason:     language === 'vi' ? 'Lý do đổi/hủy'            : 'Reason for change/cancellation',
        issueOccurredAt:        language === 'vi' ? 'Thời điểm xảy ra sự cố'   : 'Issue time',
        companyName:            language === 'vi' ? 'Tên công ty/đơn vị'        : 'Company/organization',
        partnerType:            language === 'vi' ? 'Vai trò hợp tác'           : 'Partnership type',
        website:                language === 'vi' ? 'Website/kênh tham khảo'   : 'Website/reference channel',
    };
    const contactMethodOptions: SupportSelectOption[] = [
        { value: '',      label: language === 'vi' ? 'Chọn kênh liên hệ' : 'Select contact channel' },
        { value: 'zalo',  label: 'Zalo' },
        { value: 'phone', label: language === 'vi' ? 'Điện thoại' : 'Phone' },
        { value: 'email', label: 'Email' },
    ];
    const paymentMethodOptions: SupportSelectOption[] = [
        { value: '',              label: language === 'vi' ? 'Chọn phương thức'         : 'Select method' },
        { value: 'bank_transfer', label: language === 'vi' ? 'Chuyển khoản'             : 'Bank transfer' },
        { value: 'card',          label: language === 'vi' ? 'Thẻ ngân hàng'            : 'Card' },
        { value: 'wallet',        label: language === 'vi' ? 'Ví điện tử'               : 'E-wallet' },
        { value: 'cash',          label: language === 'vi' ? 'Thanh toán trực tiếp'     : 'Pay in person' },
    ];
    const partnerTypeOptions: SupportSelectOption[] = [
        { value: '',          label: language === 'vi' ? 'Chọn vai trò'                  : 'Select role' },
        { value: 'agency',    label: language === 'vi' ? 'Đại lý'                        : 'Agency' },
        { value: 'supplier',  label: language === 'vi' ? 'Nhà cung cấp'                  : 'Supplier' },
        { value: 'corporate', label: language === 'vi' ? 'Khách đoàn/doanh nghiệp'       : 'Corporate group' },
        { value: 'other',     label: language === 'vi' ? 'Đối tác khác'                  : 'Other partner' },
    ];

    // ── Style helpers ─────────────────────────────────────────────────────

    const inputClass = (field: string) =>
        `w-full rounded-xl border bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-outline/55 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 ${
            errors[field] ? 'border-error bg-error/5 focus:border-error focus:ring-error/15' : 'border-outline-variant/20'
        }`;

    const minimalFieldClass =
        'w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-outline/55 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15';

    const datePickerTriggerClass = (field: string) =>
        `!h-auto min-h-[46px] !rounded-xl !border !bg-surface-container-low !px-4 !py-3 !text-sm !font-medium !transition-[border-color,background-color,box-shadow] !duration-200 hover:!bg-surface-container-low focus-visible:!border-primary focus-visible:!bg-white focus-visible:!ring-2 focus-visible:!ring-primary/15 ${
            errors[field]
                ? '!border-error !bg-error/5 focus-visible:!border-error focus-visible:!ring-error/15'
                : '!border-outline-variant/20'
        }`;

    // ── Handlers ──────────────────────────────────────────────────────────

    const setContextField = (field: SupportContextField, value: string) => {
        setContextFields(current => ({ ...current, [field]: value }));
        setErrors(current => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        const required = t('contact.errors.required');

        if (!formData.name.trim()) newErrors.name = required;
        if (!formData.email.trim()) newErrors.email = required;
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('contact.errors.invalidEmail');

        if (!formData.phone.trim()) newErrors.phone = required;
        else if (!isValidPhoneNumber(formData.phone, selectedCountry.iso.toUpperCase() as CountryCode)) newErrors.phone = t('contact.errors.invalidPhone');

        if (isBookingRefRequired && !formData.reference.trim()) {
            newErrors.reference = language === 'vi'
                ? 'Vui lòng nhập mã đặt chỗ cho loại yêu cầu này'
                : 'Please enter your booking reference for this request type';
        }

        if (formData.subject === 'booking') {
            if (!contextFields.tourInterest.trim()) newErrors.tourInterest = required;
            if (!contextFields.preferredTravelDate.trim()) {
                newErrors.preferredTravelDate = required;
            } else if (contextFields.preferredTravelDate < todayYMD) {
                newErrors.preferredTravelDate = language === 'vi'
                    ? 'Ngày đi dự kiến không thể là ngày đã qua'
                    : 'Preferred travel date cannot be in the past';
            }
            if (!contextFields.guestCount.trim()) {
                newErrors.guestCount = required;
            } else if (!Number.isInteger(Number(contextFields.guestCount)) || Number(contextFields.guestCount) < 1) {
                newErrors.guestCount = language === 'vi' ? 'Vui lòng nhập số khách hợp lệ' : 'Please enter a valid guest count';
            }
            if (!contextFields.preferredContactMethod.trim()) newErrors.preferredContactMethod = required;
        }

        if (formData.subject === 'payment' && !contextFields.paymentMethod.trim()) newErrors.paymentMethod = required;

        if (formData.subject === 'cancellation') {
            if (contextFields.requestedChangeDate && contextFields.requestedChangeDate < todayYMD) {
                newErrors.requestedChangeDate = language === 'vi'
                    ? 'Ngày muốn đổi không thể là ngày đã qua'
                    : 'Requested new date cannot be in the past';
            }
            if (!contextFields.cancellationReason.trim()) newErrors.cancellationReason = required;
        }

        if (formData.subject === 'complaint' && !contextFields.issueOccurredAt.trim()) newErrors.issueOccurredAt = required;

        if (formData.subject === 'partnership') {
            if (!contextFields.companyName.trim()) newErrors.companyName = required;
            if (!contextFields.partnerType.trim()) newErrors.partnerType = required;
            if (contextFields.website.trim()) {
                try { new URL(contextFields.website.trim()); } catch {
                    newErrors.website = language === 'vi' ? 'Vui lòng nhập URL hợp lệ' : 'Please enter a valid URL';
                }
            }
        }

        if (!formData.message.trim()) newErrors.message = required;
        return newErrors;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setFileError('');
        if (!file) { setSelectedFile(null); return; }
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
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
        setErrors({});
        setIsSubmitting(true);
        try {
            const body = new FormData();
            Object.entries(formData).forEach(([key, value]) => body.append(key, value));
            Object.entries(contextFields).forEach(([key, value]) => { if (value.trim()) body.append(key, value.trim()); });
            if (selectedFile) body.append('attachment', selectedFile);
            const userId = authProfile?.id ?? (authProfile as unknown as Record<string, unknown>)?.userId;
            if (userId) body.append('userId', String(userId));
            const response = await fetch(`${API_BASE_URL}/contact/send`, { method: 'POST', body });
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
        setSubmittedTicketId(0);
        setSubmittedAccessCode('');
        setSelectedFile(null);
        setFileError('');
        setErrors({});
        setFormData({ ...EMPTY_FORM_DATA });
        setContextFields({ ...EMPTY_CONTEXT_FIELDS });
        if (fileInputRef.current) fileInputRef.current.value = '';
        window.setTimeout(() => {
            formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.getElementById('contact-name')?.focus();
        }, 0);
    };

    // ── Phone dropdown ────────────────────────────────────────────────────

    const openPhoneDropdown = (index = selectedCountryIndex) => {
        setActivePhoneIndex(index);
        setIsPhoneDropdownOpen(true);
    };

    const closePhoneDropdown = () => {
        setIsPhoneDropdownOpen(false);
        phoneButtonRef.current?.focus();
    };

    const movePhoneFocus = (nextIndex: number) => {
        setActivePhoneIndex((nextIndex + COUNTRY_CODES.length) % COUNTRY_CODES.length);
    };

    const handlePhonePrefixChange = (nextPrefix: string) => {
        const nextIndex = COUNTRY_CODES.findIndex(c => c.code === nextPrefix);
        setFormData(current => ({ ...current, phonePrefix: nextPrefix }));
        setIsPhoneDropdownOpen(false);
        setActivePhoneIndex(Math.max(0, nextIndex));
        phoneButtonRef.current?.focus();
    };

    const handlePhoneButtonClick = () => {
        if (isPhoneDropdownOpen) { setIsPhoneDropdownOpen(false); return; }
        openPhoneDropdown(selectedCountryIndex);
    };

    const handlePhoneButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Escape') { setIsPhoneDropdownOpen(false); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); openPhoneDropdown(Math.min(selectedCountryIndex + 1, COUNTRY_CODES.length - 1)); return; }
        if (event.key === 'ArrowUp')   { event.preventDefault(); openPhoneDropdown(Math.max(selectedCountryIndex - 1, 0)); return; }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPhoneDropdown(selectedCountryIndex); }
    };

    const handlePhoneOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, countryCode: string) => {
        if (event.key === 'Escape')    { event.preventDefault(); closePhoneDropdown(); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); movePhoneFocus(activePhoneIndex + 1); return; }
        if (event.key === 'ArrowUp')   { event.preventDefault(); movePhoneFocus(activePhoneIndex - 1); return; }
        if (event.key === 'Home')      { event.preventDefault(); movePhoneFocus(0); return; }
        if (event.key === 'End')       { event.preventDefault(); movePhoneFocus(COUNTRY_CODES.length - 1); return; }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handlePhonePrefixChange(countryCode); }
    };

    // ── Subject dropdown ──────────────────────────────────────────────────

    const openSubjectDropdown = (index = selectedSubjectIndex) => {
        setActiveSubjectIndex(index);
        setIsSubjectDropdownOpen(true);
    };

    const closeSubjectDropdown = () => {
        setIsSubjectDropdownOpen(false);
        subjectButtonRef.current?.focus();
    };

    const moveSubjectFocus = (nextIndex: number) => {
        setActiveSubjectIndex((nextIndex + SUBJECT_OPTIONS.length) % SUBJECT_OPTIONS.length);
    };

    const handleSubjectChange = (nextSubject: string) => {
        const nextIndex = SUBJECT_OPTIONS.findIndex(o => o.value === nextSubject);
        setFormData(current => ({ ...current, subject: nextSubject }));
        setIsSubjectDropdownOpen(false);
        setActiveSubjectIndex(Math.max(0, nextIndex));
        subjectButtonRef.current?.focus();
        setErrors(current => {
            const next = { ...current };
            if (!BOOKING_REF_REQUIRED_SUBJECTS.has(nextSubject)) delete next.reference;
            CONTEXT_FIELD_KEYS.forEach(field => { delete next[field]; });
            return next;
        });
    };

    const handleSubjectButtonClick = () => {
        if (isSubjectDropdownOpen) { setIsSubjectDropdownOpen(false); return; }
        openSubjectDropdown(selectedSubjectIndex);
    };

    const handleSubjectButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Escape') { setIsSubjectDropdownOpen(false); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); openSubjectDropdown(Math.min(selectedSubjectIndex + 1, SUBJECT_OPTIONS.length - 1)); return; }
        if (event.key === 'ArrowUp')   { event.preventDefault(); openSubjectDropdown(Math.max(selectedSubjectIndex - 1, 0)); return; }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSubjectDropdown(selectedSubjectIndex); }
    };

    const handleSubjectOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, optionValue: string) => {
        if (event.key === 'Escape')    { event.preventDefault(); closeSubjectDropdown(); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); moveSubjectFocus(activeSubjectIndex + 1); return; }
        if (event.key === 'ArrowUp')   { event.preventDefault(); moveSubjectFocus(activeSubjectIndex - 1); return; }
        if (event.key === 'Home')      { event.preventDefault(); moveSubjectFocus(0); return; }
        if (event.key === 'End')       { event.preventDefault(); moveSubjectFocus(SUBJECT_OPTIONS.length - 1); return; }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleSubjectChange(optionValue); }
    };

    return {
        // i18n
        t,
        language,
        // state
        formData,
        setFormData,
        contextFields,
        selectedFile,
        fileError,
        errors,
        isSubmitting,
        isSubmitted,
        isLoggedIn,
        submittedTicketId,
        submittedAccessCode,
        isPhoneDropdownOpen,
        setIsPhoneDropdownOpen,
        activePhoneIndex,
        setActivePhoneIndex,
        isSubjectDropdownOpen,
        setIsSubjectDropdownOpen,
        activeSubjectIndex,
        setActiveSubjectIndex,
        publicSettings,
        // refs & ids
        phoneListboxId,
        subjectListboxId,
        phoneDropdownRef,
        phoneButtonRef,
        phoneOptionRefs,
        subjectDropdownRef,
        subjectButtonRef,
        subjectOptionRefs,
        formPanelRef,
        fileInputRef,
        // derived
        selectedCountry,
        selectedSubject,
        isBookingRefRequired,
        supportPhoneHref,
        supportEmailHref,
        heroTitle,
        bookingRefLabel,
        bookingRefHelp,
        todayYMD,
        contextLabels,
        contactMethodOptions,
        paymentMethodOptions,
        partnerTypeOptions,
        // style helpers
        inputClass,
        minimalFieldClass,
        datePickerTriggerClass,
        // handlers
        setContextField,
        handleFileChange,
        removeFile,
        handleSubmit,
        resetForm,
        handlePhoneButtonClick,
        handlePhoneButtonKeyDown,
        handlePhoneOptionKeyDown,
        handlePhonePrefixChange,
        handleSubjectButtonClick,
        handleSubjectButtonKeyDown,
        handleSubjectOptionKeyDown,
        handleSubjectChange,
    };
}

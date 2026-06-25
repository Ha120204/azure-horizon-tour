'use client';

import { useEffect, useRef, useState } from 'react';
import { isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';
import { useLocale } from '@/context/LocaleContext';
import { apiClient } from '@/lib/http/fetchWithAuth';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/lib/settings/publicSettings';
import { fetchAuthProfile } from '@/lib/auth/authSession';
import { useListboxNav } from './useListboxNav';

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
    { value: 'booking',      labelKey: 'booking',      icon: 'confirmation_number' },
    { value: 'payment',      labelKey: 'payment',      icon: 'payments' },
    { value: 'cancellation', labelKey: 'cancellation', icon: 'event_busy' },
    { value: 'complaint',    labelKey: 'complaint',    icon: 'support_agent' },
    { value: 'partnership',  labelKey: 'partnership',  icon: 'handshake' },
    { value: 'general',      labelKey: 'general',      icon: 'help_outline' },
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
    const [submittedTicketId, setSubmittedTicketId] = useState<number>(0);
    const [submittedAccessCode, setSubmittedAccessCode] = useState('');
    const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);

    const formPanelRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAuthProfile()
            .then((profile) => setIsLoggedIn(Boolean(profile)))
            .catch(() => setIsLoggedIn(false));
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

    // ── Derived ───────────────────────────────────────────────────────────

    const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.phonePrefix) ?? COUNTRY_CODES[5];
    const selectedSubject = SUBJECT_OPTIONS.find(o => o.value === formData.subject) ?? SUBJECT_OPTIONS[0];
    const isBookingRefRequired = BOOKING_REF_REQUIRED_SUBJECTS.has(formData.subject);
    const supportPhoneHref = `tel:${publicSettings.company_phone.replace(/\s+/g, '')}`;
    const heroTitle = t('contact.howCanWeAssist');
    const bookingRefLabel = t('contact.bookingRefLabel');
    const today = new Date();
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const bookingRefHelp = isBookingRefRequired
        ? t('contact.refRequiredHelp')
        : t('contact.refOptionalHelp');
    const contextLabels: Record<SupportContextField, string> = {
        tourInterest:           t('contact.contextLabels.tourInterest'),
        preferredTravelDate:    t('contact.contextLabels.preferredTravelDate'),
        guestCount:             t('contact.contextLabels.guestCount'),
        preferredContactMethod: t('contact.contextLabels.preferredContactMethod'),
        paymentMethod:          t('contact.contextLabels.paymentMethod'),
        requestedChangeDate:    t('contact.contextLabels.requestedChangeDate'),
        cancellationReason:     t('contact.contextLabels.cancellationReason'),
        issueOccurredAt:        t('contact.contextLabels.issueOccurredAt'),
        companyName:            t('contact.contextLabels.companyName'),
        partnerType:            t('contact.contextLabels.partnerType'),
        website:                t('contact.contextLabels.website'),
    };
    const contactMethodOptions: SupportSelectOption[] = [
        { value: '',      label: t('contact.select.contactChannel') },
        { value: 'zalo',  label: t('contact.contactMethods.zalo') },
        { value: 'phone', label: t('contact.contactMethods.phone') },
        { value: 'email', label: t('contact.contactMethods.email') },
    ];
    const paymentMethodOptions: SupportSelectOption[] = [
        { value: '',              label: t('contact.select.paymentMethod') },
        { value: 'bank_transfer', label: t('contact.paymentMethods.bank_transfer') },
        { value: 'card',          label: t('contact.paymentMethods.card') },
        { value: 'wallet',        label: t('contact.paymentMethods.wallet') },
        { value: 'cash',          label: t('contact.paymentMethods.cash') },
    ];
    const partnerTypeOptions: SupportSelectOption[] = [
        { value: '',          label: t('contact.select.partnerRole') },
        { value: 'agency',    label: t('contact.partnerTypes.agency') },
        { value: 'supplier',  label: t('contact.partnerTypes.supplier') },
        { value: 'corporate', label: t('contact.partnerTypes.corporate') },
        { value: 'other',     label: t('contact.partnerTypes.other') },
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
            newErrors.reference = t('contact.errors.refRequiredForType');
        }

        if (formData.subject === 'booking') {
            if (!contextFields.tourInterest.trim()) newErrors.tourInterest = required;
            if (!contextFields.preferredTravelDate.trim()) {
                newErrors.preferredTravelDate = required;
            } else if (contextFields.preferredTravelDate < todayYMD) {
                newErrors.preferredTravelDate = t('contact.errors.travelDatePast');
            }
            if (!contextFields.guestCount.trim()) {
                newErrors.guestCount = required;
            } else if (!Number.isInteger(Number(contextFields.guestCount)) || Number(contextFields.guestCount) < 1) {
                newErrors.guestCount = t('contact.errors.invalidGuestCount');
            }
            if (!contextFields.preferredContactMethod.trim()) newErrors.preferredContactMethod = required;
        }

        if (formData.subject === 'payment' && !contextFields.paymentMethod.trim()) newErrors.paymentMethod = required;

        if (formData.subject === 'cancellation') {
            if (contextFields.requestedChangeDate && contextFields.requestedChangeDate < todayYMD) {
                newErrors.requestedChangeDate = t('contact.errors.changeDatePast');
            }
            if (!contextFields.cancellationReason.trim()) newErrors.cancellationReason = required;
        }

        if (formData.subject === 'complaint' && !contextFields.issueOccurredAt.trim()) newErrors.issueOccurredAt = required;

        if (formData.subject === 'partnership') {
            if (!contextFields.companyName.trim()) newErrors.companyName = required;
            if (!contextFields.partnerType.trim()) newErrors.partnerType = required;
            if (contextFields.website.trim()) {
                try { new URL(contextFields.website.trim()); } catch {
                    newErrors.website = t('contact.errors.invalidUrl');
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
            // apiClient gửi kèm cookie (userId lấy từ JWT phía server) và tự bóc envelope { data }
            const result = await apiClient<ContactSubmitResponse>('/contact/send', { method: 'POST', body }, { silent: true });
            if (!result.ok) {
                setErrors({ submit: result.error || t('contact.errors.submitFailed') });
                return;
            }
            setSubmittedTicketId(result.data.ticketId ?? 0);
            setSubmittedAccessCode(result.data.accessCode ?? '');
            setIsSubmitted(true);
        } catch {
            setErrors({ submit: t('contact.errors.submitFailed') });
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

    // ── Dropdown điều hướng (mã quốc gia & chủ đề) ───────────────────────────

    const phoneNav = useListboxNav({
        options: COUNTRY_CODES,
        selectedValue: formData.phonePrefix,
        getOptionValue: country => country.code,
        onChange: nextPrefix => setFormData(current => ({ ...current, phonePrefix: nextPrefix })),
    });

    const subjectNav = useListboxNav({
        options: SUBJECT_OPTIONS,
        selectedValue: formData.subject,
        getOptionValue: option => option.value,
        onChange: nextSubject => {
            setFormData(current => ({ ...current, subject: nextSubject }));
            setErrors(current => {
                const next = { ...current };
                if (!BOOKING_REF_REQUIRED_SUBJECTS.has(nextSubject)) delete next.reference;
                CONTEXT_FIELD_KEYS.forEach(field => { delete next[field]; });
                return next;
            });
        },
    });

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
        isPhoneDropdownOpen: phoneNav.isOpen,
        activePhoneIndex: phoneNav.activeIndex,
        setActivePhoneIndex: phoneNav.setActiveIndex,
        isSubjectDropdownOpen: subjectNav.isOpen,
        activeSubjectIndex: subjectNav.activeIndex,
        setActiveSubjectIndex: subjectNav.setActiveIndex,
        publicSettings,
        // refs & ids
        phoneListboxId: phoneNav.listboxId,
        subjectListboxId: subjectNav.listboxId,
        phoneDropdownRef: phoneNav.dropdownRef,
        phoneButtonRef: phoneNav.buttonRef,
        phoneOptionRefs: phoneNav.optionRefs,
        subjectDropdownRef: subjectNav.dropdownRef,
        subjectButtonRef: subjectNav.buttonRef,
        subjectOptionRefs: subjectNav.optionRefs,
        formPanelRef,
        fileInputRef,
        // derived
        selectedCountry,
        selectedSubject,
        isBookingRefRequired,
        supportPhoneHref,
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
        handlePhoneButtonClick: phoneNav.handleButtonClick,
        handlePhoneButtonKeyDown: phoneNav.handleButtonKeyDown,
        handlePhoneOptionKeyDown: phoneNav.handleOptionKeyDown,
        handlePhonePrefixChange: phoneNav.commit,
        handleSubjectButtonClick: subjectNav.handleButtonClick,
        handleSubjectButtonKeyDown: subjectNav.handleButtonKeyDown,
        handleSubjectOptionKeyDown: subjectNav.handleOptionKeyDown,
        handleSubjectChange: subjectNav.commit,
    };
}

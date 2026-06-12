'use client';

import Image from 'next/image';
import Link from 'next/link';
import DatePickerDropdown from '@/components/search/DatePickerDropdown';
import { SupportDropdownSelect } from './SupportDropdownSelect';
import {
    COUNTRY_CODES,
    SUBJECT_OPTIONS,
    getFlagUrl,
    useContactForm,
} from '../_hooks/useContactForm';

type ContactFormPanelProps = {
    form: ReturnType<typeof useContactForm>;
};

export function ContactFormPanel({ form }: ContactFormPanelProps) {
    const {
        t,
        language,
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
        activePhoneIndex,
        setActivePhoneIndex,
        isSubjectDropdownOpen,
        activeSubjectIndex,
        setActiveSubjectIndex,
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
        selectedCountry,
        selectedSubject,
        isBookingRefRequired,
        bookingRefLabel,
        bookingRefHelp,
        todayYMD,
        contextLabels,
        contactMethodOptions,
        paymentMethodOptions,
        partnerTypeOptions,
        inputClass,
        minimalFieldClass,
        datePickerTriggerClass,
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
    } = form;

    return (
        <section className="animate-fade-in-up lg:col-span-7">
            <div ref={formPanelRef} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 md:p-8 lg:p-10">
                {isSubmitted ? (
                    <div className="mx-auto max-w-md py-8 text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-4xl">check_circle</span>
                        </div>
                        <h2 className="font-headline text-2xl font-bold text-on-surface">
                            {t('contact.successTitle')}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                            {t('contact.successMessage')}
                        </p>

                        {submittedTicketId > 0 && (
                            <div className="my-7 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                                <p className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">
                                    {t('contact.ticketIdLabel')}
                                </p>
                                <p className="mt-2 font-mono text-4xl font-bold text-primary">#{submittedTicketId}</p>
                                {!isLoggedIn && submittedAccessCode && (
                                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                        <p className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-amber-700">
                                            {t('contact.accessCodeLabel')}
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
                                    href={`/profile?tab=support${submittedTicketId > 0 ? `&ticketId=${submittedTicketId}` : ''}`}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-headline text-sm font-bold text-white transition-colors hover:bg-primary-container"
                                >
                                    <span className="material-symbols-outlined text-sm">person</span>
                                    {t('contact.viewInProfile')}
                                </Link>
                            )}
                            {!isLoggedIn && submittedTicketId > 0 && submittedAccessCode && (
                                <Link
                                    href={`/support/track/${submittedTicketId}?accessCode=${encodeURIComponent(submittedAccessCode)}`}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-headline text-sm font-bold text-white transition-colors hover:bg-primary-container"
                                >
                                    <span className="material-symbols-outlined text-sm">support_agent</span>
                                    {t('contact.trackRequest')}
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
                    <form id="contact-request-form" className="space-y-6 scroll-mt-28" onSubmit={handleSubmit} noValidate>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
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
                                {errors.name && <p id="contact-name-error" role="alert" className="text-xs font-medium text-error">{errors.name}</p>}
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
                                {errors.email && <p id="contact-email-error" role="alert" className="text-xs font-medium text-error">{errors.email}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                            <div className="space-y-2">
                                <label htmlFor="contact-phone" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                    {t('contact.phoneNumber')} <span className="text-error">*</span>
                                </label>
                                <div
                                    className={`flex rounded-xl border bg-surface-container-low transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/15 ${
                                        errors.phone ? 'border-error bg-error/5 focus-within:border-error focus-within:ring-error/15' : 'border-outline-variant/20'
                                    }`}
                                >
                                    <div className="relative shrink-0" ref={phoneDropdownRef}>
                                        <button
                                            ref={phoneButtonRef}
                                            type="button"
                                            aria-haspopup="listbox"
                                            aria-expanded={isPhoneDropdownOpen}
                                            aria-controls={isPhoneDropdownOpen ? phoneListboxId : undefined}
                                            aria-label={t('contact.selectCountryCode')}
                                            onClick={handlePhoneButtonClick}
                                            onKeyDown={handlePhoneButtonKeyDown}
                                            className="flex h-full items-center gap-2 rounded-l-xl border-r border-outline-variant/20 px-3 py-3 text-sm font-semibold text-on-surface outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/20"
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
                                                aria-label={t('contact.countryCode')}
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
                                                            ref={element => { phoneOptionRefs.current[index] = element; }}
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
                                        className="min-w-0 flex-1 border-none bg-transparent px-3 py-3 text-sm font-medium text-on-surface outline-none placeholder:text-outline/55 focus:ring-0"
                                        value={formData.phone}
                                        onChange={event => setFormData({ ...formData, phone: event.target.value })}
                                        placeholder="912 345 678"
                                    />
                                </div>
                                {errors.phone && <p id="contact-phone-error" role="alert" className="text-xs font-medium text-error">{errors.phone}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="contact-ref" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                    {bookingRefLabel}{' '}
                                    {isBookingRefRequired ? (
                                        <span className="text-error">*</span>
                                    ) : (
                                        <span className="text-outline">
                                            {t('contact.phoneOptional')}
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
                                    <p id="contact-ref-error" role="alert" className="text-xs font-medium text-error">{errors.reference}</p>
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
                                    onClick={handleSubjectButtonClick}
                                    onKeyDown={handleSubjectButtonKeyDown}
                                    className={`${minimalFieldClass} flex cursor-pointer items-center justify-between gap-3 pr-3 text-left focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20`}
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
                                                        ref={element => { subjectOptionRefs.current[index] = element; }}
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
                                                                {t(`contact.subjectDescriptions.${option.value}`)}
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

                        {formData.subject !== 'general' && (
                            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4">
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">fact_check</span>
                                    <h2 className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                        {t('contact.additionalDetails')}
                                    </h2>
                                </div>

                                {formData.subject === 'booking' && (
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                                        <div className="space-y-2 md:col-span-2">
                                            <label htmlFor="contact-tour-interest" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {contextLabels.tourInterest}
                                            </label>
                                            <input
                                                id="contact-tour-interest"
                                                name="tourInterest"
                                                type="text"
                                                autoComplete="off"
                                                aria-describedby={errors.tourInterest ? 'contact-tour-interest-error' : undefined}
                                                className={inputClass('tourInterest')}
                                                value={contextFields.tourInterest}
                                                onChange={event => setContextField('tourInterest', event.target.value)}
                                                placeholder={t('contact.placeholders.tourInterest')}
                                            />
                                            {errors.tourInterest && <p id="contact-tour-interest-error" role="alert" className="text-xs font-medium text-error">{errors.tourInterest}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="contact-travel-date" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {contextLabels.preferredTravelDate}
                                            </label>
                                            <DatePickerDropdown
                                                triggerId="contact-travel-date"
                                                value={contextFields.preferredTravelDate}
                                                onChange={value => setContextField('preferredTravelDate', value)}
                                                minDate={todayYMD}
                                                language={language}
                                                placeholder={t('contact.placeholders.date')}
                                                variant="field"
                                                dropdownPlacement="bottom"
                                                triggerClassName={datePickerTriggerClass('preferredTravelDate')}
                                                dropdownClassName="w-[min(21rem,calc(100vw-3rem))]"
                                            />
                                            {errors.preferredTravelDate && <p id="contact-travel-date-error" role="alert" className="text-xs font-medium text-error">{errors.preferredTravelDate}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="contact-guest-count" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {contextLabels.guestCount}
                                            </label>
                                            <input
                                                id="contact-guest-count"
                                                name="guestCount"
                                                type="number"
                                                min="1"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                aria-describedby={errors.guestCount ? 'contact-guest-count-error' : undefined}
                                                className={inputClass('guestCount')}
                                                value={contextFields.guestCount}
                                                onChange={event => setContextField('guestCount', event.target.value)}
                                                placeholder={t('contact.placeholders.guestCount')}
                                            />
                                            {errors.guestCount && <p id="contact-guest-count-error" role="alert" className="text-xs font-medium text-error">{errors.guestCount}</p>}
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label htmlFor="contact-preferred-method" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {contextLabels.preferredContactMethod}
                                            </label>
                                            <SupportDropdownSelect
                                                id="contact-preferred-method"
                                                name="preferredContactMethod"
                                                value={contextFields.preferredContactMethod}
                                                options={contactMethodOptions}
                                                error={Boolean(errors.preferredContactMethod)}
                                                ariaDescribedBy={errors.preferredContactMethod ? 'contact-preferred-method-error' : undefined}
                                                onChange={value => setContextField('preferredContactMethod', value)}
                                            />
                                            {errors.preferredContactMethod && <p id="contact-preferred-method-error" role="alert" className="text-xs font-medium text-error">{errors.preferredContactMethod}</p>}
                                        </div>
                                    </div>
                                )}

                                {formData.subject === 'payment' && (
                                    <div className="space-y-2">
                                        <label htmlFor="contact-payment-method" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                            {contextLabels.paymentMethod}
                                        </label>
                                        <SupportDropdownSelect
                                            id="contact-payment-method"
                                            name="paymentMethod"
                                            value={contextFields.paymentMethod}
                                            options={paymentMethodOptions}
                                            error={Boolean(errors.paymentMethod)}
                                            ariaDescribedBy={errors.paymentMethod ? 'contact-payment-method-error' : undefined}
                                            onChange={value => setContextField('paymentMethod', value)}
                                        />
                                        {errors.paymentMethod && <p id="contact-payment-method-error" role="alert" className="text-xs font-medium text-error">{errors.paymentMethod}</p>}
                                    </div>
                                )}

                                {formData.subject === 'cancellation' && (
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                                        <div className="space-y-2">
                                            <label htmlFor="contact-change-date" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {contextLabels.requestedChangeDate}
                                            </label>
                                            <DatePickerDropdown
                                                triggerId="contact-change-date"
                                                value={contextFields.requestedChangeDate}
                                                onChange={value => setContextField('requestedChangeDate', value)}
                                                minDate={todayYMD}
                                                language={language}
                                                placeholder={t('contact.placeholders.date')}
                                                variant="field"
                                                dropdownPlacement="bottom"
                                                triggerClassName={datePickerTriggerClass('requestedChangeDate')}
                                                dropdownClassName="w-[min(21rem,calc(100vw-3rem))]"
                                            />
                                            {errors.requestedChangeDate && <p id="contact-change-date-error" role="alert" className="text-xs font-medium text-error">{errors.requestedChangeDate}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="contact-cancel-reason" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {contextLabels.cancellationReason}
                                            </label>
                                            <input
                                                id="contact-cancel-reason"
                                                name="cancellationReason"
                                                type="text"
                                                autoComplete="off"
                                                aria-describedby={errors.cancellationReason ? 'contact-cancel-reason-error' : undefined}
                                                className={inputClass('cancellationReason')}
                                                value={contextFields.cancellationReason}
                                                onChange={event => setContextField('cancellationReason', event.target.value)}
                                                placeholder={t('contact.placeholders.cancellationReason')}
                                            />
                                            {errors.cancellationReason && <p id="contact-cancel-reason-error" role="alert" className="text-xs font-medium text-error">{errors.cancellationReason}</p>}
                                        </div>
                                    </div>
                                )}

                                {formData.subject === 'complaint' && (
                                    <div className="space-y-2">
                                        <label htmlFor="contact-issue-time" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                            {contextLabels.issueOccurredAt}
                                        </label>
                                        <input
                                            id="contact-issue-time"
                                            name="issueOccurredAt"
                                            type="datetime-local"
                                            autoComplete="off"
                                            aria-describedby={errors.issueOccurredAt ? 'contact-issue-time-error' : undefined}
                                            className={inputClass('issueOccurredAt')}
                                            value={contextFields.issueOccurredAt}
                                            onChange={event => setContextField('issueOccurredAt', event.target.value)}
                                        />
                                        {errors.issueOccurredAt && <p id="contact-issue-time-error" role="alert" className="text-xs font-medium text-error">{errors.issueOccurredAt}</p>}
                                    </div>
                                )}

                                {formData.subject === 'partnership' && (
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                                        <div className="space-y-2">
                                            <label htmlFor="contact-company-name" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {contextLabels.companyName}
                                            </label>
                                            <input
                                                id="contact-company-name"
                                                name="companyName"
                                                type="text"
                                                autoComplete="organization"
                                                aria-describedby={errors.companyName ? 'contact-company-name-error' : undefined}
                                                className={inputClass('companyName')}
                                                value={contextFields.companyName}
                                                onChange={event => setContextField('companyName', event.target.value)}
                                                placeholder={t('contact.placeholders.companyName')}
                                            />
                                            {errors.companyName && <p id="contact-company-name-error" role="alert" className="text-xs font-medium text-error">{errors.companyName}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="contact-partner-type" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {contextLabels.partnerType}
                                            </label>
                                            <SupportDropdownSelect
                                                id="contact-partner-type"
                                                name="partnerType"
                                                value={contextFields.partnerType}
                                                options={partnerTypeOptions}
                                                error={Boolean(errors.partnerType)}
                                                ariaDescribedBy={errors.partnerType ? 'contact-partner-type-error' : undefined}
                                                onChange={value => setContextField('partnerType', value)}
                                            />
                                            {errors.partnerType && <p id="contact-partner-type-error" role="alert" className="text-xs font-medium text-error">{errors.partnerType}</p>}
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label htmlFor="contact-website" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                                {contextLabels.website}
                                            </label>
                                            <input
                                                id="contact-website"
                                                name="website"
                                                type="url"
                                                inputMode="url"
                                                autoComplete="url"
                                                aria-describedby={errors.website ? 'contact-website-error' : undefined}
                                                className={inputClass('website')}
                                                value={contextFields.website}
                                                onChange={event => setContextField('website', event.target.value)}
                                                placeholder="https://example.com"
                                            />
                                            {errors.website && <p id="contact-website-error" role="alert" className="text-xs font-medium text-error">{errors.website}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                            {errors.message && <p id="contact-message-error" role="alert" className="text-xs font-medium text-error">{errors.message}</p>}
                        </div>

                        <div className="space-y-3">
                            <label className="block font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                {t('contact.attachments')}
                            </label>

                            {selectedFile ? (
                                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
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
                                    className="group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-low px-4 py-4 text-left transition-[border-color,background-color] duration-200 hover:border-primary/40 hover:bg-primary/5"
                                >
                                    <span className="material-symbols-outlined text-2xl text-outline transition-colors group-hover:text-primary">
                                        cloud_upload
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-on-surface-variant">{t('contact.attachInst')}</span>
                                        <span className="mt-1 block text-xs text-outline">{t('contact.attachSize')}</span>
                                    </span>
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

                            {fileError && <p role="alert" className="text-xs font-medium text-error">{fileError}</p>}
                        </div>

                        {errors.submit && <p role="alert" className="text-center text-sm font-medium text-error">{errors.submit}</p>}

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
    );
}

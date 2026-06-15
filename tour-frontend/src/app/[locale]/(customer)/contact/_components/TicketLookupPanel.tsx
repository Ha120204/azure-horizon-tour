'use client';

import { useState } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/http/constants';

type LookupResult = {
    id: number;
    subject: string;
    status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
    category: string;
    createdAt: string;
    accessCode: string;
};

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
    NEW:         { bg: 'bg-sky-50 border-sky-200',     text: 'text-sky-700',    icon: 'mark_email_unread' },
    IN_PROGRESS: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700',  icon: 'pending' },
    RESOLVED:    { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: 'check_circle' },
};

type TicketLookupPanelProps = {
    onView: (ticketId: number, accessCode: string) => void;
    isOpening: boolean;
};

export function TicketLookupPanel({ onView, isOpening }: TicketLookupPanelProps) {
    const { t, formatDate } = useLocale();
    const [email, setEmail] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<LookupResult | null>(null);
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [codeError, setCodeError] = useState('');

    const validate = () => {
        let valid = true;
        setEmailError('');
        setCodeError('');
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setEmailError(t('contact.errors.invalidEmail'));
            valid = false;
        }
        if (!accessCode.trim()) {
            setCodeError(t('contact.errors.required'));
            valid = false;
        }
        return valid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSearching(true);
        setError('');
        setResult(null);

        try {
            const params = new URLSearchParams({
                email: email.trim(),
                accessCode: accessCode.trim(),
            });
            const res = await fetch(`${API_BASE_URL}/support/customer/lookup?${params}`);
            const json = await res.json();

            if (!res.ok) {
                setError(json?.message || t('contact.lookupNotFound'));
                return;
            }

            setResult(json.data ?? json);
        } catch {
            setError(t('contact.lookupNotFound'));
        } finally {
            setIsSearching(false);
        }
    };

    const statusStyle = result ? (STATUS_STYLE[result.status] ?? STATUS_STYLE.NEW) : null;
    const statusLabel = result
        ? (t(`contact.lookupStatus.${result.status}`) ?? result.status)
        : '';

    return (
        <section className="mt-16 border-t border-outline-variant/20 pt-12">
            <div className="mx-auto max-w-2xl">
                <div className="mb-6">
                    <span className="inline-flex items-center gap-2 font-label text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary">
                        <span className="material-symbols-outlined text-sm">manage_search</span>
                        {t('contact.lookupTitle')}
                    </span>
                    <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                        {t('contact.lookupDesc')}
                    </p>
                </div>

                <div className="rounded-2xl border border-outline-variant/20 bg-white p-6 shadow-sm">
                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label htmlFor="lookup-email" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                    {t('contact.lookupEmail')} <span className="text-error">*</span>
                                </label>
                                <input
                                    id="lookup-email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setEmailError(''); setError(''); }}
                                    placeholder="you@example.com"
                                    className={`w-full rounded-xl border bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition-[border-color,box-shadow] placeholder:text-outline/55 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 ${
                                        emailError ? 'border-error bg-error/5' : 'border-outline-variant/20'
                                    }`}
                                />
                                {emailError && <p role="alert" className="text-xs font-medium text-error">{emailError}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="lookup-code" className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-primary">
                                    {t('contact.lookupAccessCode')} <span className="text-error">*</span>
                                </label>
                                <input
                                    id="lookup-code"
                                    type="text"
                                    autoComplete="off"
                                    value={accessCode}
                                    onChange={e => { setAccessCode(e.target.value); setCodeError(''); setError(''); }}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className={`w-full rounded-xl border bg-surface-container-low px-4 py-3 font-mono text-sm text-on-surface outline-none transition-[border-color,box-shadow] placeholder:text-outline/40 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 ${
                                        codeError ? 'border-error bg-error/5' : 'border-outline-variant/20'
                                    }`}
                                />
                                {codeError
                                    ? <p role="alert" className="text-xs font-medium text-error">{codeError}</p>
                                    : <p className="text-xs text-outline">{t('contact.lookupAccessCodeHint')}</p>
                                }
                            </div>
                        </div>

                        {error && (
                            <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                <span className="material-symbols-outlined text-base shrink-0">error</span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSearching}
                            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm outline-none transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none"
                        >
                            {isSearching
                                ? <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>{t('contact.lookupSearching')}</>
                                : <><span className="material-symbols-outlined text-base">search</span>{t('contact.lookupSubmit')}</>
                            }
                        </button>
                    </form>

                    {result && statusStyle && (
                        <div className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="font-label text-[0.6875rem] font-bold uppercase tracking-widest text-outline">
                                        #{result.id}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-on-surface line-clamp-2">
                                        {result.subject}
                                    </p>
                                    <p className="mt-1 text-xs text-outline">
                                        {t('contact.lookupCreatedAt')}: {formatDate(result.createdAt)}
                                    </p>
                                </div>
                                <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {statusStyle.icon}
                                    </span>
                                    {statusLabel}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => onView(result.id, result.accessCode)}
                                disabled={isOpening}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm outline-none transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-primary-container focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none"
                            >
                                <span className={`material-symbols-outlined text-base ${isOpening ? 'animate-spin' : ''}`}>
                                    {isOpening ? 'progress_activity' : 'support_agent'}
                                </span>
                                {t('contact.lookupViewDetail')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

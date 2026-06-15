'use client';
import { useEffect, useState } from 'react';
import { toastEmitter } from '@/lib/http/toastEmitter';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/lib/settings/publicSettings';
import { QUICK_CONTACTS } from './constants';

interface ConciergeTriggerProps {
    isContactDockOpen: boolean;
    setIsContactDockOpen: (v: boolean) => void;
    setIsOpen: (v: boolean) => void;
    t: (key: string) => string;
}

export default function ConciergeTrigger({
    isContactDockOpen,
    setIsContactDockOpen,
    setIsOpen,
    t,
}: ConciergeTriggerProps) {
    const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);
    const supportPhoneHref = `tel:${publicSettings.company_phone.replace(/\s+/g, '')}`;

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

    const handleCopyPhone = () => {
        if (!navigator.clipboard) return;
        navigator.clipboard
            .writeText(publicSettings.company_phone)
            .then(() => toastEmitter.success(t('contact.phoneCopied')))
            .catch(() => {});
    };

    return (
        <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 sm:right-6">
            {isContactDockOpen ? (
                <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_14px_40px_rgba(15,23,42,0.16)] backdrop-blur animate-fade-in-up">
                    <a
                        href={supportPhoneHref}
                        onClick={handleCopyPhone}
                        aria-label={t('contact.callNow')}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-md"
                    >
                        <span
                            className="material-symbols-outlined text-[20px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            call
                        </span>
                    </a>
                    {QUICK_CONTACTS.map((contact) => (
                        <a
                            key={contact.label}
                            href={contact.href}
                            target={contact.href.startsWith('http') ? '_blank' : undefined}
                            rel={contact.href.startsWith('http') ? 'noreferrer' : undefined}
                            aria-label={contact.label}
                            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${contact.className}`}
                        >
                            {contact.icon ? (
                                <span
                                    className="material-symbols-outlined text-[20px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    {contact.icon}
                                </span>
                            ) : (
                                <span className={contact.textIcon === 'Zalo' ? 'text-[14px] font-extrabold tracking-tight' : 'text-2xl leading-none'}>
                                    {contact.textIcon}
                                </span>
                            )}
                        </a>
                    ))}
                    <button
                        type="button"
                        onClick={() => setIsContactDockOpen(false)}
                        aria-label={t('conciergeApp.collapseContacts')}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                    >
                        <span className="material-symbols-outlined text-[17px]">close</span>
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsContactDockOpen(true)}
                    aria-label={t('conciergeApp.openContacts')}
                    aria-expanded={isContactDockOpen}
                    className="group flex min-h-12 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-primary shadow-[0_12px_34px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-white/15">
                        <span className="material-symbols-outlined text-[20px]">support_agent</span>
                    </span>
                    <span className="hidden pr-1 text-xs font-black sm:block">{t('conciergeApp.contact')}</span>
                </button>
            )}

            <button
                id="ai-concierge-trigger"
                onClick={() => setIsOpen(true)}
                aria-label={t('conciergeApp.openAssistant')}
                className="group flex items-center gap-2 rounded-full border border-white/25 bg-primary px-3 py-2 text-white shadow-[0_16px_40px_rgba(0,63,135,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-[0_18px_48px_rgba(0,63,135,0.34)]"
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/14 ring-1 ring-white/20">
                    <span
                        className="material-symbols-outlined text-[15px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        auto_awesome
                    </span>
                </span>
                <span className="pr-1 font-headline text-xs font-bold">{t('conciergeApp.btn')}</span>
            </button>
        </div>
    );
}

'use client';
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
    return (
        <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 sm:right-6">
            {isContactDockOpen ? (
                <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_14px_40px_rgba(15,23,42,0.16)] backdrop-blur">
                    {QUICK_CONTACTS.map((contact) => (
                        <a
                            key={contact.label}
                            href={contact.href}
                            target={contact.href.startsWith('http') ? '_blank' : undefined}
                            rel={contact.href.startsWith('http') ? 'noreferrer' : undefined}
                            aria-label={contact.label}
                            title={contact.label}
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
                        aria-label="Thu gọn kênh liên hệ"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                    >
                        <span className="material-symbols-outlined text-[17px]">close</span>
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsContactDockOpen(true)}
                    aria-label="Mở kênh liên hệ nhanh"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-[0_12px_34px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white"
                >
                    <span className="material-symbols-outlined text-[22px]">support_agent</span>
                </button>
            )}

            <button
                id="ai-concierge-trigger"
                onClick={() => setIsOpen(true)}
                aria-label="Mở trợ lý AI"
                className="group flex items-center gap-3 rounded-full border border-white/25 bg-primary px-4 py-3 text-white shadow-[0_16px_40px_rgba(0,63,135,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-[0_18px_48px_rgba(0,63,135,0.34)] sm:px-5"
            >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/14 ring-1 ring-white/20">
                    <span
                        className="material-symbols-outlined text-[19px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        auto_awesome
                    </span>
                </span>
                <span className="hidden pr-1 font-headline text-sm font-bold sm:block">{t('conciergeApp.btn')}</span>
            </button>
        </div>
    );
}

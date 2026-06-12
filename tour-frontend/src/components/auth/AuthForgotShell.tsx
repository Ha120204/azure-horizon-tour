'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import styles from './AuthTheme.module.css';
import AuthLocaleSwitcher from './AuthLocaleSwitcher';

type Step = 'email' | 'otp' | 'newPassword' | 'success';

const DEFAULT_BRAND_MARK = (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-[#12bff0] shadow-[0_8px_20px_rgba(18,191,240,0.30)]" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="7.25" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M14.9 8.6L12.9 13L8.6 15L10.6 10.6L14.9 8.6Z" fill="#FFFFFF" />
            <circle cx="12" cy="12" r="1.15" fill="#12BFF0" />
        </svg>
    </span>
);

type Props = {
    children: ReactNode;
    activeStep?: Step;
    brandName?: string;
    brandMark?: ReactNode;
};

function toStepIndex(step: Step): number {
    return { email: 1, otp: 2, newPassword: 3, success: 4 }[step];
}

export default function AuthForgotShell({
    children,
    activeStep = 'email',
    brandName = 'Azure Horizon',
    brandMark = DEFAULT_BRAND_MARK,
}: Props) {
    const t = useTranslations('auth');
    const currentIndex = toStepIndex(activeStep);

    const steps = [
        { label: t('forgotPanelStep1Label'), desc: t('forgotPanelStep1Desc') },
        { label: t('forgotPanelStep2Label'), desc: t('forgotPanelStep2Desc') },
        { label: t('forgotPanelStep3Label'), desc: t('forgotPanelStep3Desc') },
    ];

    return (
        <main className={`${styles.authTheme} min-h-screen bg-[var(--auth-surface)] text-[var(--auth-ink)] font-body lg:grid lg:grid-cols-2`}>

            {/* ── LEFT PANEL ── */}
            <section
                className="relative hidden min-h-screen overflow-hidden text-[var(--auth-panel-text)] lg:flex"
                style={{ background: 'linear-gradient(155deg, #03091e 0%, #050d26 50%, #030e1e 100%)' }}
            >
                <div className={styles.auroraA} aria-hidden="true" />
                <div className={styles.auroraB} aria-hidden="true" />
                <div className={styles.dotGrid} aria-hidden="true" />

                <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-12 py-11">

                    {/* Brand */}
                    <div className={`${styles.brandEnter} flex items-center gap-3 text-[1.55rem] font-extrabold tracking-tight`}>
                        {brandMark}
                        <span className="font-headline -translate-y-0.5">{brandName}</span>
                    </div>

                    {/* Hero */}
                    <div className="mx-auto flex w-full max-w-[520px] flex-col">

                        {/* Icon */}
                        <div className={`${styles.copyEnter} mb-6`}>
                            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem]"
                                style={{ background: 'oklch(100% 0 0 / 8%)', border: '1px solid oklch(100% 0 0 / 16%)' }}>
                                <span
                                    className="material-symbols-outlined text-[2.75rem] text-white/90"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                    aria-hidden="true"
                                >
                                    lock_reset
                                </span>
                                <div
                                    className="absolute inset-0 rounded-[1.5rem] blur-xl opacity-25"
                                    style={{ background: 'oklch(68% 0.18 194)' }}
                                    aria-hidden="true"
                                />
                            </div>
                        </div>

                        {/* Headline */}
                        <h2 className={`${styles.copyEnter} font-headline text-[2.6rem] font-extrabold leading-[1.1] tracking-tight`}>
                            {t('forgotPanelHeadline')}<br />
                            <span style={{
                                background: 'linear-gradient(105deg, oklch(78% 0.16 194) 0%, oklch(74% 0.18 240) 100%)',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                color: 'transparent',
                            }}>
                                {t('forgotPanelHeadlineSub')}
                            </span>
                        </h2>

                        <p className={`${styles.copyEnter} mt-4 text-[0.92rem] font-medium leading-relaxed text-[var(--auth-panel-muted)]`}>
                            {t('forgotPanelDesc')}
                        </p>

                        {/* Step tracker */}
                        <div className={`${styles.metaEnter} mt-10`}>
                            {steps.map((step, i) => {
                                const num = i + 1;
                                const isDone = currentIndex > num;
                                const isActive = currentIndex === num;
                                const isFuture = currentIndex < num;

                                return (
                                    <div key={num} className="flex items-start gap-4">
                                        {/* Badge + connector */}
                                        <div className="flex flex-col items-center">
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-300 ${
                                                isDone
                                                    ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                                                    : isActive
                                                        ? 'border-2 border-white/70 bg-white/12 text-white shadow-[0_0_18px_oklch(68%_0.18_194/45%)]'
                                                        : 'border border-white/15 bg-white/5 text-white/30'
                                            }`}>
                                                {isDone
                                                    ? <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check</span>
                                                    : num
                                                }
                                            </div>
                                            {num < steps.length && (
                                                <div className={`mt-1 w-px h-10 transition-all duration-300 ${isDone ? 'bg-emerald-500/35' : 'bg-white/10'}`} />
                                            )}
                                        </div>

                                        {/* Text */}
                                        <div className={`pb-9 pt-1.5 transition-opacity duration-300 ${isFuture ? 'opacity-35' : 'opacity-100'}`}>
                                            <p className={`text-sm font-bold ${isDone ? 'text-emerald-400' : isActive ? 'text-white' : 'text-white/50'}`}>
                                                {step.label}
                                            </p>
                                            <p className="mt-0.5 text-xs font-medium text-[var(--auth-panel-muted)]">
                                                {step.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Trust badges */}
                    <div className={`${styles.brandEnter} flex items-center justify-center gap-6`}>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--auth-panel-muted)]">
                            <span className="material-symbols-outlined text-[16px] text-emerald-400" aria-hidden="true">lock</span>
                            {t('forgotPanelTrustSsl')}
                        </div>
                        <div className="h-4 w-px bg-white/15" />
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--auth-panel-muted)]">
                            <span className="material-symbols-outlined text-[16px] text-emerald-400" aria-hidden="true">verified_user</span>
                            {t('forgotPanelTrustPrivacy')}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── RIGHT PANEL ── */}
            <section className="relative flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
                <div className="absolute top-4 right-4 z-10">
                    <AuthLocaleSwitcher />
                </div>
                <div className="w-full max-w-[480px]">
                    <div className={`${styles.panelEnter} mb-9 flex items-center justify-center gap-2 text-[var(--auth-primary)] lg:hidden`}>
                        {brandMark}
                        <span className="font-headline text-2xl font-extrabold tracking-tight">{brandName}</span>
                    </div>
                    {children}
                </div>
            </section>

        </main>
    );
}

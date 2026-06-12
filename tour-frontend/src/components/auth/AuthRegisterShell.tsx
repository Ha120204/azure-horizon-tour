'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import styles from './AuthTheme.module.css';
import AuthLocaleSwitcher from './AuthLocaleSwitcher';

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
    brandName?: string;
    brandMark?: ReactNode;
};

export default function AuthRegisterShell({
    children,
    brandName = 'Azure Horizon',
    brandMark = DEFAULT_BRAND_MARK,
}: Props) {
    const t = useTranslations('auth');
    const FEATURES = [
        { icon: 'map', title: t('registerFeature1Title'), desc: t('registerFeature1Desc') },
        { icon: 'card_giftcard', title: t('registerFeature2Title'), desc: t('registerFeature2Desc') },
        { icon: 'support_agent', title: t('registerFeature3Title'), desc: t('registerFeature3Desc') },
    ];
    return (
        <main className={`${styles.authTheme} min-h-screen bg-[var(--auth-surface)] text-[var(--auth-ink)] font-body lg:grid lg:grid-cols-2`}>
            <section className={`${styles.regPanel} relative hidden min-h-screen overflow-hidden text-[var(--auth-panel-text)] lg:flex`}>
                <div className={styles.regAuroraA} aria-hidden="true" />
                <div className={styles.regAuroraB} aria-hidden="true" />
                <div className={styles.dotGrid} aria-hidden="true" />

                <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-12 py-11">
                    {/* Brand */}
                    <div className={`${styles.brandEnter} flex items-center gap-3 text-[1.55rem] font-extrabold tracking-tight`}>
                        {brandMark}
                        <span className="font-headline -translate-y-0.5">{brandName}</span>
                    </div>

                    {/* Hero content */}
                    <div className="mx-auto flex w-full max-w-[560px] flex-col">
                        <div className={`${styles.copyEnter} ${styles.regFreePill}`}>
                            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">verified</span>
                            {t('registerPanelFreeBadge')}
                        </div>

                        <h2 className={`${styles.copyEnter} mt-5 font-headline text-[2.75rem] font-extrabold leading-[1.1] tracking-tight`}>
                            {t('registerPanelHeadline')}<br />
                            <span className={styles.regGradientText}>{t('registerPanelHeadlineSub')}</span>
                        </h2>

                        <p className={`${styles.copyEnter} mt-4 text-[0.92rem] font-medium leading-relaxed text-[var(--auth-panel-muted)]`}>
                            {t('registerPanelDesc')}
                        </p>

                        {/* Feature cards */}
                        <div className={`${styles.metaEnter} mt-8 flex flex-col gap-3`}>
                            {FEATURES.map((feat, i) => (
                                <div
                                    key={feat.icon}
                                    className={`${styles.regFeatureCard} ${i === 1 ? styles.regFeatureCardAccent : ''}`}
                                >
                                    <div className={styles.regFeatureIcon}>
                                        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{feat.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-extrabold">{feat.title}</p>
                                        <p className="mt-0.5 text-xs font-medium leading-relaxed text-[var(--auth-panel-muted)]">{feat.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Testimonial */}
                        <div className={`${styles.metaEnter} ${styles.regTestimonial} mt-5`}>
                            <div className={styles.regTestimonialAvatar} aria-hidden="true">TH</div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium leading-relaxed text-[var(--auth-panel-muted)]">
                                    &ldquo;{t('registerTestimonialQuote')}&rdquo;
                                </p>
                                <div className="mt-2.5 flex items-center justify-between">
                                    <p className="text-xs font-bold">{t('registerTestimonialAuthor')}</p>
                                    <p className="text-[0.75rem] text-amber-400" aria-label="5 sao">★★★★★</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom tagline */}
                    <p className={`${styles.brandEnter} text-center text-xs font-semibold text-[var(--auth-panel-muted)]`}>
                        {t('registerPanelTagline')}
                    </p>
                </div>
            </section>

            <section className="relative flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
                <div className="absolute top-4 right-4 z-10">
                    <AuthLocaleSwitcher />
                </div>
                <div className="w-full max-w-[560px]">
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

'use client';
import type { StaticImageData } from 'next/image';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import styles from './AuthTheme.module.css';
import AuthLocaleSwitcher from './AuthLocaleSwitcher';

export type AuthMetric = {
    value: string;
    label: string;
};

export type AuthBenefit = {
    text: string;
};

type AuthSplitShellProps = {
    brandName?: string;
    brandMark?: ReactNode;
    imageSrc?: string | StaticImageData;
    imageAlt?: string;
    eyebrow?: string;
    title: string;
    description: string;
    metrics?: AuthMetric[];
    benefits?: AuthBenefit[];
    children: ReactNode;
};

const DEFAULT_BRAND_MARK = (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-[#12bff0] shadow-[0_8px_20px_rgba(18,191,240,0.30)]" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="7.25" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M14.9 8.6L12.9 13L8.6 15L10.6 10.6L14.9 8.6Z" fill="#FFFFFF" />
            <circle cx="12" cy="12" r="1.15" fill="#12BFF0" />
        </svg>
    </span>
);

const DESTINATIONS = ['🗼 Paris', '🌸 Kyoto', '🌊 Santorini', '🏔️ Alps'];

export default function AuthSplitShell(props: AuthSplitShellProps) {
    const {
        brandName = 'Azure Horizon',
        brandMark = DEFAULT_BRAND_MARK,
        children,
    } = props;
    const t = useTranslations('auth');
    const STATS = [
        { value: '50K+', label: t('loginStatCustomers') },
        { value: '200+', label: t('loginStatDestinations') },
        { value: '4.9★', label: t('loginStatRating') },
    ];

    return (
        <main className={`${styles.authTheme} min-h-screen bg-[var(--auth-surface)] text-[var(--auth-ink)] font-body lg:grid lg:grid-cols-2`}>
            <section className={`${styles.commandPanel} relative hidden min-h-screen overflow-hidden text-[var(--auth-panel-text)] lg:flex`}>
                <div className={styles.auroraA} aria-hidden="true" />
                <div className={styles.auroraB} aria-hidden="true" />
                <div className={styles.dotGrid} aria-hidden="true" />

                <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-12 py-11">
                    {/* Brand */}
                    <div className={`${styles.brandEnter} flex items-center gap-3 text-[1.55rem] font-extrabold tracking-tight`}>
                        {brandMark}
                        <span className="font-headline -translate-y-0.5">{brandName}</span>
                    </div>

                    {/* Hero content */}
                    <div className="relative mx-auto flex w-full max-w-[600px] flex-col">
                        <div className={`${styles.copyEnter} ${styles.trustPill}`}>
                            <span className={styles.trustDot} aria-hidden="true" />
                            {t('loginPanelTrustBadge')}
                        </div>

                        <h2 className={`${styles.copyEnter} mt-5 font-headline text-[2.75rem] font-extrabold leading-[1.1] tracking-tight`}>
                            {t('loginPanelHeadline')}<br />
                            <span className={styles.gradientText}>{t('loginPanelHeadlineSub')}</span>
                        </h2>

                        <p className={`${styles.copyEnter} mt-4 text-[0.92rem] font-medium leading-relaxed text-[var(--auth-panel-muted)]`}>
                            {t('loginPanelDesc')}
                        </p>

                        {/* Destination chips */}
                        <div className={`${styles.metaEnter} mt-6 flex flex-wrap gap-2`}>
                            {DESTINATIONS.map((dest) => (
                                <span key={dest} className={styles.destChip}>{dest}</span>
                            ))}
                        </div>

                        {/* Boarding pass */}
                        <div className={`${styles.boardingPass} mt-7`}>
                            <div className="flex items-center justify-between gap-6">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--auth-panel-muted)]">Flight</p>
                                    <p className="mt-2 font-headline text-2xl font-extrabold">AZ-402</p>
                                </div>
                                <span className="material-symbols-outlined text-[38px] text-white/80" aria-hidden="true">
                                    flight
                                </span>
                                <div className="text-right">
                                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--auth-panel-muted)]">Gate</p>
                                    <p className="mt-2 font-headline text-2xl font-extrabold">D14</p>
                                </div>
                            </div>

                            <div className="my-6 border-t border-white/18" />

                            <div className="relative grid grid-cols-[1fr_1.1fr_1fr] items-center gap-5">
                                <div>
                                    <p className="font-headline text-[2.4rem] font-extrabold leading-none">SGN</p>
                                    <p className="mt-2 text-sm font-medium text-[var(--auth-panel-muted)]">Ho Chi Minh</p>
                                </div>
                                <div className={styles.flightPath} aria-hidden="true">
                                    <span className={styles.flightNode} />
                                </div>
                                <div className="text-right">
                                    <p className="font-headline text-[2.4rem] font-extrabold leading-none">CDG</p>
                                    <p className="mt-2 text-sm font-medium text-[var(--auth-panel-muted)]">Paris</p>
                                </div>
                            </div>

                            <div className="my-6 border-t border-white/18" />

                            <div className="flex items-end justify-between gap-6">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--auth-panel-muted)]">Passenger</p>
                                    <p className="mt-2 text-base font-extrabold">A. Traveler</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--auth-panel-muted)]">Boarding Time</p>
                                    <p className="mt-2 text-base font-extrabold">18:45</p>
                                </div>
                            </div>
                        </div>

                        {/* Info cards */}
                        <div className={`${styles.metaEnter} mt-4 flex gap-4`}>
                            <div className={styles.infoCard}>
                                <p className="text-[0.9rem] tracking-wide text-amber-400">★★★★★</p>
                                <p className="mt-2 text-sm font-extrabold">4.9 / 5.0</p>
                                <p className="mt-0.5 text-xs font-semibold text-[var(--auth-panel-muted)]">{t('loginPanelReviews')}</p>
                            </div>
                            <div className={`${styles.infoCard} flex flex-1 items-center gap-3`}>
                                <div className={styles.guideIcon}>
                                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">explore</span>
                                </div>
                                <div>
                                    <p className="text-sm font-extrabold">Kyoto Guide</p>
                                    <p className="mt-0.5 text-xs font-semibold text-[var(--auth-panel-muted)]">Ready offline</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className={`${styles.brandEnter} flex items-center justify-center gap-0`}>
                        {STATS.map((stat, i) => (
                            <div key={stat.value} className="flex items-center">
                                {i > 0 && <div className="mx-6 h-8 w-px bg-white/20" />}
                                <div>
                                    <p className="font-headline text-xl font-extrabold">{stat.value}</p>
                                    <p className="mt-0.5 text-xs font-semibold text-[var(--auth-panel-muted)]">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
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

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';

// ---------------------------------------------------------------------------
// Scroll-reveal hook — Intersection Observer, GPU-only (transform + opacity)
// Respects prefers-reduced-motion per WCAG 2.1 SC 2.3.3
// ---------------------------------------------------------------------------
function useReveal(options?: { threshold?: number; rootMargin?: string }) {
    const ref = useRef<HTMLElement | null>(null);
    const [visible, setVisible] = useState(false);

    const refCallback = useCallback((node: HTMLElement | null) => {
        ref.current = node;
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Skip animation entirely for users who prefer reduced motion.
        // Defer to next frame so we don't setState synchronously in the effect body.
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            const frame = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(frame);
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            {
                threshold: options?.threshold ?? 0.12,
                rootMargin: options?.rootMargin ?? '0px 0px -48px 0px',
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [options?.threshold, options?.rootMargin]);

    return { refCallback, visible };
}

// ---------------------------------------------------------------------------
// RevealBlock — wraps any section/div with a staggered fade-up entrance
// ---------------------------------------------------------------------------
interface RevealBlockProps {
    children: React.ReactNode;
    className?: string;
    delay?: number; // ms, for stagger
    as?: 'section' | 'div' | 'article' | 'li' | 'ol';
}

function RevealBlock({ children, className = '', delay = 0, as: Tag = 'div' }: RevealBlockProps) {
    const { refCallback, visible } = useReveal();

    return (
        <Tag
            ref={refCallback as React.Ref<HTMLElement & HTMLLIElement & HTMLOListElement & HTMLDivElement & HTMLElement>}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(28px)',
                transition: visible
                    ? `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
                    : 'none',
            }}
        >
            {children}
        </Tag>
    );
}

export default function AboutClient() {
    const { t } = useLocale();

    const heroProofs = [
        { icon: 'verified', value: t('about.heroProofJourneysValue'), label: t('about.heroProofJourneys') },
        { icon: 'public', value: t('about.heroProofDestinationsValue'), label: t('about.heroProofDestinations') },
        { icon: 'headset_mic', value: t('about.heroProofSupportValue'), label: t('about.heroProofSupport') },
    ];

    const journeySteps = [
        {
            step: '01',
            icon: 'travel_explore',
            title: t('about.philosophyPoint1Title'),
            desc: t('about.philosophyPoint1Desc'),
        },
        {
            step: '02',
            icon: 'fact_check',
            title: t('about.philosophyPoint2Title'),
            desc: t('about.philosophyPoint2Desc'),
        },
        {
            step: '03',
            icon: 'support_agent',
            title: t('about.philosophyPoint3Title'),
            desc: t('about.philosophyPoint3Desc'),
        },
    ];

    const bookingStandards = [
        {
            icon: 'payments',
            title: t('about.wcu1Title'),
            desc: t('about.wcu1Desc'),
            meta: t('about.wcu1Meta'),
        },
        {
            icon: 'reviews',
            title: t('about.wcu2Title'),
            desc: t('about.wcu2Desc'),
            meta: t('about.wcu2Meta'),
        },
        {
            icon: 'event_repeat',
            title: t('about.wcu3Title'),
            desc: t('about.wcu3Desc'),
            meta: t('about.wcu3Meta'),
        },
        {
            icon: 'support_agent',
            title: t('about.wcu4Title'),
            desc: t('about.wcu4Desc'),
            meta: t('about.wcu4Meta'),
        },
    ];

    const operationSteps = [
        {
            step: '01',
            icon: 'route',
            title: t('about.team1Title'),
            desc: t('about.team1Role'),
            meta: t('about.team1Meta'),
        },
        {
            step: '02',
            icon: 'event_available',
            title: t('about.team2Title'),
            desc: t('about.team2Role'),
            meta: t('about.team2Meta'),
        },
        {
            step: '03',
            icon: 'contact_support',
            title: t('about.team3Title'),
            desc: t('about.team3Role'),
            meta: t('about.team3Meta'),
        },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface antialiased">
            <Header />

            <main id="main-content" className="flex-grow overflow-x-hidden pt-[88px]">

                {/* ── Hero ─────────────────────────────────────────────────── */}
                <section className="relative overflow-hidden bg-primary px-6 py-20 md:px-10 md:py-24 lg:px-12">
                    <div className="absolute inset-0">
                        <Image
                            alt="Travelers overlooking a bright coastal destination"
                            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2200"
                            fill
                            priority
                            className="object-cover object-center"
                            sizes="100vw"
                        />
                        <div className="about-hero-overlay absolute inset-0" />
                    </div>

                    <div className="relative z-10 mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.42fr)] lg:items-end">
                        <div className="max-w-4xl">
                            <span className="about-hero-enter about-hero-enter-d1 inline-flex items-center gap-3 font-label text-xs font-extrabold uppercase tracking-[0.24em] text-white/80">
                                <span className="h-px w-10 bg-white/50" aria-hidden="true" />
                                {t('about.badge')}
                            </span>
                            <h1 className="about-hero-enter about-hero-enter-d2 mt-6 max-w-4xl text-balance font-headline text-4xl font-extrabold leading-[1.04] tracking-tight text-white md:text-6xl lg:text-7xl">
                                {t('about.heroTitle')}
                            </h1>
                            <p className="about-hero-enter about-hero-enter-d3 mt-6 max-w-2xl text-pretty text-base leading-8 text-white/82 md:text-lg">
                                {t('about.heroSubtitle')}
                            </p>
                            <div className="about-hero-enter about-hero-enter-d4 mt-9 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/destinations"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-primary shadow-[0_18px_48px_rgba(0,0,0,0.22)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:translate-y-0"
                                >
                                    {t('about.heroPrimaryCta')}
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                                </Link>
                                <Link
                                    href="/contact"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/45 bg-white/10 px-7 py-3.5 text-sm font-extrabold text-white backdrop-blur-md transition-[background-color,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:translate-y-0"
                                >
                                    {t('about.heroSecondaryCta')}
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">support_agent</span>
                                </Link>
                            </div>
                        </div>

                        {/*
                          FIX: stat cards — on mobile/sm the floating contact widget
                          (fixed bottom-6 right-5) can overlap the last stat card.
                          We add pb-20 sm:pb-0 so the cards don't run into the widget area
                          when stacked in a column on small screens.
                          On lg the grid switches to a side column, so no overlap occurs.
                        */}
                        <div className="grid gap-3 pb-20 sm:grid-cols-3 sm:pb-0 lg:grid-cols-1 lg:pb-0">
                            {heroProofs.map((item, i) => (
                                <div
                                    key={item.label}
                                    className={`about-stat-enter about-stat-d${i} grid grid-cols-[44px_1fr] items-center gap-4 rounded-lg border border-white/18 bg-white/[0.12] p-4 text-white shadow-[0_12px_42px_rgba(0,0,0,0.14)] backdrop-blur-md`}
                                >
                                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/14 text-[23px] text-white" aria-hidden="true">
                                        <span className="material-symbols-outlined about-symbol">{item.icon}</span>
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-headline text-2xl font-extrabold leading-none tracking-tight">{item.value}</p>
                                        <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.12em] text-white/68">{item.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Philosophy / Story ───────────────────────────────────── */}
                {/* FIX spacing: py-20 md:py-28 → py-14 md:py-20 (tighter rhythm) */}
                <section className="bg-surface px-6 py-14 md:px-10 md:py-20 lg:px-12">
                    <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(320px,0.84fr)_minmax(0,1.16fr)] lg:items-center">
                        <RevealBlock className="relative min-h-[460px] overflow-hidden rounded-lg bg-surface-container md:min-h-[560px]">
                            <Image
                                alt="Curated resort and tour planning details"
                                src="https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=1200"
                                fill
                                className="object-cover"
                                sizes="(min-width: 1024px) 42vw, 100vw"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#001a40]/88 via-[#001a40]/44 to-transparent p-5 pt-24 text-white md:p-7">
                                <p className="font-label text-xs font-extrabold uppercase tracking-[0.18em] text-white/68">{t('about.philosophyImageKicker')}</p>
                                <p className="mt-2 max-w-md font-headline text-2xl font-extrabold leading-tight tracking-tight">{t('about.philosophyImageTitle')}</p>
                                <p className="mt-3 max-w-md text-sm leading-6 text-white/76">{t('about.philosophyImageDesc')}</p>
                            </div>
                        </RevealBlock>

                        <div>
                            <RevealBlock delay={60}>
                                <span className="font-label text-xs font-extrabold uppercase tracking-[0.22em] text-primary">{t('about.philosophyKicker')}</span>
                                <h2 className="mt-4 max-w-3xl text-balance font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
                                    {t('about.philosophyTitle')}
                                </h2>
                                <div className="mt-6 grid gap-5 text-base leading-8 text-on-surface-variant md:text-lg">
                                    <p>{t('about.philosophyDesc1')}</p>
                                    <p>{t('about.philosophyDesc2')}</p>
                                </div>
                            </RevealBlock>

                            <ol className="mt-10 grid gap-3">
                                {journeySteps.map((item, i) => (
                                    <RevealBlock key={item.title} as="li" delay={i * 110} className="grid gap-4 rounded-lg border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-[0_10px_34px_rgba(17,36,64,0.05)] sm:grid-cols-[72px_1fr]">
                                        <div className="flex items-center gap-3 sm:block">
                                            <span className="font-headline text-2xl font-extrabold leading-none text-primary/35">{item.step}</span>
                                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-[21px] text-white sm:mt-4" aria-hidden="true">
                                                <span className="material-symbols-outlined about-symbol">{item.icon}</span>
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-headline text-lg font-extrabold tracking-tight text-on-surface">{item.title}</h3>
                                            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{item.desc}</p>
                                        </div>
                                    </RevealBlock>
                                ))}
                            </ol>
                        </div>
                    </div>
                </section>

                {/* ── Why Choose Us ────────────────────────────────────────── */}
                {/* FIX spacing: py-20 md:py-28 → py-14 md:py-22 */}
                <section className="relative bg-surface-container-low px-6 py-14 md:px-10 md:py-22 lg:px-12">
                    <div className="about-map-grid absolute inset-0 opacity-70" aria-hidden="true" />
                    <div className="relative mx-auto max-w-7xl">
                        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                            <RevealBlock className="max-w-xl">
                                <span className="font-label text-xs font-extrabold uppercase tracking-[0.22em] text-primary">{t('about.whyChooseUsKicker')}</span>
                                <h2 className="mt-4 text-balance font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
                                    {t('about.whyChooseUsTitle')}
                                </h2>
                            </RevealBlock>
                            <RevealBlock delay={80}>
                                <p className="max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg lg:justify-self-end">
                                    {t('about.whyChooseUsSubtitle')}
                                </p>
                            </RevealBlock>
                        </div>

                        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {bookingStandards.map((item, i) => (
                                <RevealBlock key={item.title} as="article" delay={i * 90} className="rounded-lg border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-[0_12px_36px_rgba(17,36,64,0.05)]">
                                    <div className="flex items-start justify-between gap-4">
                                        {/*
                                          FIX icon contrast: was bg-primary-fixed text-primary (light blue on white → low contrast).
                                          Now bg-primary text-white — solid navy icon on white card, clearly readable.
                                        */}
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-[22px] text-white" aria-hidden="true">
                                            <span className="material-symbols-outlined about-symbol">{item.icon}</span>
                                        </span>
                                        <span className="rounded-full bg-surface-container px-3 py-1 text-right font-label text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-primary">
                                            {item.meta}
                                        </span>
                                    </div>
                                    <h3 className="mt-5 font-headline text-lg font-extrabold leading-snug tracking-tight text-on-surface">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">{item.desc}</p>
                                </RevealBlock>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Operations / Team ────────────────────────────────────── */}
                <section className="bg-surface px-6 py-14 md:px-10 md:py-20 lg:px-12">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
                            <RevealBlock className="max-w-xl">
                                <span className="font-label text-xs font-extrabold uppercase tracking-[0.22em] text-primary">{t('about.teamKicker')}</span>
                                <h2 className="mt-4 text-balance font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
                                    {t('about.teamTitle')}
                                </h2>
                                <p className="mt-5 text-base leading-8 text-on-surface-variant md:text-lg">
                                    {t('about.teamSubtitle')}
                                </p>
                            </RevealBlock>

                            <ol className="grid gap-4">
                                {operationSteps.map((item, i) => (
                                    <RevealBlock key={item.title} as="li" delay={i * 110} className="grid gap-5 rounded-lg border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-[0_12px_36px_rgba(17,36,64,0.05)] md:grid-cols-[92px_1fr_auto] md:items-center">
                                        <div className="flex items-center gap-3 md:block">
                                            <span className="font-headline text-3xl font-extrabold leading-none text-primary/35">{item.step}</span>
                                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-[22px] text-white md:mt-4" aria-hidden="true">
                                                <span className="material-symbols-outlined about-symbol">{item.icon}</span>
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-headline text-xl font-extrabold tracking-tight text-on-surface">{item.title}</h3>
                                            <p className="mt-2 text-sm leading-6 text-on-surface-variant md:max-w-2xl">{item.desc}</p>
                                        </div>
                                        <span className="w-fit rounded-full bg-surface-container px-3 py-1 font-label text-xs font-extrabold uppercase tracking-[0.12em] text-primary md:justify-self-end">
                                            {item.meta}
                                        </span>
                                    </RevealBlock>
                                ))}
                            </ol>
                        </div>
                    </div>
                </section>

                {/* ── CTA Banner ───────────────────────────────────────────── */}
                <section className="bg-surface px-6 pb-20 md:px-10 md:pb-28 lg:px-12">
                    <RevealBlock className="relative mx-auto grid max-w-7xl overflow-hidden rounded-lg bg-[#001a40] lg:grid-cols-[1fr_0.82fr]">
                        <div className="relative z-10 p-6 text-white md:p-10 lg:p-12">
                            <span className="font-label text-xs font-extrabold uppercase tracking-[0.22em] text-white/62">{t('about.ctaKicker')}</span>
                            <h2 className="mt-4 max-w-2xl text-balance font-headline text-3xl font-extrabold tracking-tight md:text-5xl">
                                {t('about.ctaTitle')}
                            </h2>
                            <p className="mt-5 max-w-xl text-base leading-8 text-white/72 md:text-lg">
                                {t('about.ctaSubtitle')}
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/destinations"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-primary shadow-[0_18px_48px_rgba(0,0,0,0.22)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#001a40] active:translate-y-0"
                                >
                                    {t('about.ctaExplore')}
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                                </Link>
                                <Link
                                    href="/contact"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/45 bg-white/10 px-7 py-3.5 text-sm font-extrabold text-white backdrop-blur-md transition-[background-color,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#001a40] active:translate-y-0"
                                >
                                    {t('about.ctaContact')}
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">support_agent</span>
                                </Link>
                            </div>
                        </div>
                        <div className="relative min-h-[280px] lg:min-h-full">
                            <Image
                                alt="Couple reviewing travel plans before a tour"
                                src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=1200"
                                fill
                                className="object-cover"
                                sizes="(min-width: 1024px) 40vw, 100vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#001a40]/70 via-[#001a40]/16 to-transparent lg:bg-gradient-to-r" />
                        </div>
                    </RevealBlock>
                </section>
            </main>

            <Footer />
        </div>
    );
}

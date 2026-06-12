'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toastEmitter } from '@/lib/http/toastEmitter';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/lib/settings/publicSettings';
import type { Tour } from '@/types';
import { FAQAccordion } from './FAQAccordion';

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

// ── Highlights Section ────────────────────────────────────────────────────────
export function HighlightsSection({ highlights, t }: { highlights: { id: number; content: string; icon: string }[]; t: TranslationFn }) {
    if (!highlights || highlights.length === 0) return null;
    return (
        <section className="bg-gradient-to-br from-primary/5 to-secondary-container/5 rounded-3xl p-6 md:p-8 border border-primary/10">
            <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <h2 className="text-xl font-bold font-headline text-on-surface">{t('tour_detail.highlightsTitle')}</h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {highlights.map((h) => (
                    <li key={h.id} className="flex items-start gap-3 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm">
                        <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {h.icon || 'auto_awesome'}
                        </span>
                        <p className="text-sm text-on-surface leading-relaxed font-medium">{h.content}</p>
                    </li>
                ))}
            </ul>
        </section>
    );
}

// ── Meal Badge ────────────────────────────────────────────────────────────────
function MealBadge({ included, label, icon }: { included: boolean; label: string; icon: string }) {
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${included
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-400 border-slate-200 opacity-50'}`}>
            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: included ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
            {label}
        </span>
    );
}

// ── Itinerary Section ─────────────────────────────────────────────────────────
type ItineraryDay = {
    id: number; dayNumber: number; title: string; description: string;
    mealsBreakfast?: boolean; mealsLunch?: boolean; mealsDinner?: boolean;
    accommodation?: string | null; transport?: string | null; activities?: string[];
    imageUrl?: string | null; timeline?: { time: string; activity: string }[];
};

export function ItinerarySection({ itinerary, t }: {
    itinerary: ItineraryDay[];
    t: TranslationFn;
}) {
    const days = itinerary && itinerary.length > 0 ? itinerary : null;
    if (!days) return null;

    const hasMealsInfo = days.some(d => d.mealsBreakfast || d.mealsLunch || d.mealsDinner);

    return (
        <section>
            <h2 className="text-2xl font-bold font-headline mb-8">{t('tour_detail.itineraryTitle')}</h2>
            <div className="space-y-0">
                {days.map((day, i) => (
                    <div key={day.id} className="flex gap-4 md:gap-6">
                        {/* Số ngày + connector line */}
                        <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center font-bold shadow-md text-sm shrink-0 ${i === 0 ? 'bg-primary text-white' : 'bg-surface-container text-on-surface border-2 border-outline-variant/20'}`}>
                                {day.dayNumber}
                            </div>
                            {i < days.length - 1 && <div className="w-px flex-1 bg-gradient-to-b from-primary/30 to-outline-variant/20 mt-2 min-h-[32px]" />}
                        </div>

                        {/* Card nội dung */}
                        <div className="pb-8 flex-1 min-w-0">
                            <div className={`rounded-2xl border p-5 ${i === 0 ? 'border-primary/20 bg-primary/[0.03] shadow-sm' : 'border-outline-variant/15 bg-white'}`}>
                                <h3 className="text-base md:text-lg font-bold mb-2 text-on-surface">{day.title}</h3>
                                <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{day.description}</p>

                                {/* Timeline giờ */}
                                {day.timeline && day.timeline.length > 0 && (
                                    <div className="mb-4 border-t border-outline-variant/10 pt-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px] text-primary">schedule</span>
                                            {t('tour_detail.daySchedule')}
                                        </p>
                                        <div className="space-y-1.5">
                                            {(day.timeline as { time: string; activity: string }[]).map((t, ti) => (
                                                <div key={ti} className="flex items-start gap-2.5 text-xs text-on-surface-variant">
                                                    <span className="font-mono font-bold text-primary w-11 flex-shrink-0 pt-0.5">{t.time}</span>
                                                    <span className="leading-relaxed">{t.activity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Địa điểm tham quan */}
                                {day.activities && day.activities.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px] text-primary">location_on</span>
                                            {t('tour_detail.visitPlaces')}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {day.activities.map((act, ai) => (
                                                <span key={ai} className="inline-flex items-center gap-1 text-xs bg-secondary-container/10 text-secondary-container px-2.5 py-1 rounded-full border border-secondary-container/15 font-medium">
                                                    <span className="material-symbols-outlined text-[11px]">place</span>
                                                    {act}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Footer: Bữa ăn + Khách sạn + Phương tiện */}
                                {(hasMealsInfo || day.accommodation || day.transport) && (
                                    <div className="border-t border-outline-variant/10 pt-3 flex flex-wrap gap-x-5 gap-y-2 items-center">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">{t('tour_detail.mealsLabel')}</span>
                                            <MealBadge included={!!day.mealsBreakfast} label={t('tour_detail.breakfast')} icon="breakfast_dining" />
                                            <MealBadge included={!!day.mealsLunch} label={t('tour_detail.lunch')} icon="lunch_dining" />
                                            <MealBadge included={!!day.mealsDinner} label={t('tour_detail.dinner')} icon="dinner_dining" />
                                        </div>
                                        {day.accommodation && (
                                            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                                <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>hotel</span>
                                                <span className="font-medium">{day.accommodation}</span>
                                            </div>
                                        )}
                                        {day.transport && (
                                            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                                <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>directions_bus</span>
                                                <span>{day.transport}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ── FAQ Section ───────────────────────────────────────────────────────────────
export function FAQSection({ faqs, t }: { faqs: { id: number; question: string; answer: string }[]; t: TranslationFn }) {
    if (!faqs || faqs.length === 0) return null;
    return (
        <section className="pt-8 border-t border-outline-variant/20">
            <h2 className="text-2xl font-bold font-headline mb-6">{t('tour_detail.faqTitle')}</h2>
            <FAQAccordion faqs={faqs} />
        </section>
    );
}

// ── Rating Breakdown ──────────────────────────────────────────────────────────
export function RatingBreakdown({ stats, t }: {
    stats: {
        averageRating: number;
        totalReviews: number;
        breakdown: { star: number; count: number; percent: number }[];
    } | null;
    t: TranslationFn;
}) {
    if (!stats || stats.totalReviews === 0) return null;
    return (
        <div className="bg-surface-container-low/40 rounded-2xl p-5 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="text-center sm:border-r sm:border-outline-variant/20 sm:pr-6 flex-shrink-0">
                    <p className="text-5xl font-extrabold text-primary leading-none">{stats.averageRating.toFixed(1)}</p>
                    <div className="flex justify-center gap-0.5 my-2">
                        {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} className="material-symbols-outlined text-secondary-container text-lg" style={{ fontVariationSettings: s <= Math.round(stats.averageRating) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                        ))}
                    </div>
                    <p className="text-xs text-outline">{stats.totalReviews} {t('tour_detail.reviewsLabel')}</p>
                </div>
                <div className="flex-1 w-full space-y-2">
                    {stats.breakdown.map(b => (
                        <div key={b.star} className="flex items-center gap-2.5 text-xs">
                            <span className="w-4 text-right font-bold text-on-surface-variant flex-shrink-0">{b.star}</span>
                            <span className="material-symbols-outlined text-secondary-container text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <div className="flex-1 h-2 bg-outline-variant/20 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-secondary-container to-primary rounded-full transition-all duration-700" style={{ width: `${b.percent}%` }} />
                            </div>
                            <span className="w-8 text-outline flex-shrink-0">{b.percent}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Important Info Section ────────────────────────────────────────────────────
type ImportantInfoTour = {
    suitableFor?: string | null;
    ageRequirement?: string | null;
    bestTime?: string | null;
    bestSeason?: string | null;
    departurePoint?: string | null;
    meetingPoint?: string | null;
    dressCode?: string | null;
    thingsToBring?: string | null;
    healthNotes?: string | null;
    accessibility?: string | null;
};

// Props: tour object + t() translation function
export function ImportantInfoSection({ tour, t }: { tour: ImportantInfoTour | null; t: (key: string) => string }) {
    // ── Group 1: Basic trip info (from tour data when available) ──
    const basicItems = [
        {
            icon: 'group',
            label: t('tour_detail.suitableFor'),
            value: tour?.suitableFor || t('tour_detail.defaultSuitableFor'),
        },
        {
            icon: 'child_care',
            label: t('tour_detail.ageRequirement'),
            value: tour?.ageRequirement || t('tour_detail.defaultAge'),
        },
        {
            icon: 'schedule',
            label: t('tour_detail.bestTime'),
            value: tour?.bestTime || (tour?.bestSeason ?? null),
        },
        {
            icon: 'location_on',
            label: t('tour_detail.meetingPoint'),
            value: tour?.departurePoint || tour?.meetingPoint || null,
        },
    ].filter(item => item.value);

    // ── Group 2: What to prepare ──
    const prepItems = [
        {
            icon: 'checkroom',
            label: t('tour_detail.dressCode'),
            value: tour?.dressCode || t('tour_detail.defaultDress'),
        },
        {
            icon: 'backpack',
            label: t('tour_detail.thingsToBring'),
            value: tour?.thingsToBring || t('tour_detail.defaultBring'),
        },
        {
            icon: 'health_and_safety',
            label: t('tour_detail.healthSafety'),
            value: tour?.healthNotes || t('tour_detail.defaultHealth'),
        },
        {
            icon: 'accessible',
            label: t('tour_detail.accessibility'),
            value: tour?.accessibility || t('tour_detail.defaultAccessibility'),
        },
    ];
    const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);

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

    // Số hotline lấy từ cấu hình admin (publicSettings), không hardcode
    const hotlineValue = publicSettings.company_phone;
    const hotlineHref = `tel:${hotlineValue.replace(/[^\d+]/g, '')}`;

    // Desktop không có app tel: → copy số + toast để vẫn có phản hồi rõ ràng
    const handleCopyHotline = () => {
        if (!navigator.clipboard) return;
        navigator.clipboard
            .writeText(hotlineValue)
            .then(() => toastEmitter.success(t('tour_detail.hotlineCopied')))
            .catch(() => {});
    };

    return (
        <section className="pt-8 border-t border-outline-variant/20">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-7">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                </div>
                <h2 className="text-2xl font-bold font-headline text-on-surface">{t('tour_detail.importantInfoTitle')}</h2>
            </div>

            <div className="space-y-6">
                {/* ── Group 1: Basic Info ── */}
                {basicItems.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline mb-3 flex items-center gap-1.5">
                            <span className="w-4 h-px bg-outline/40 inline-block" />
                            {t('tour_detail.groupBasicInfo')}
                        </p>
                        <div className="divide-y divide-outline-variant/15 border border-outline-variant/20 rounded-2xl overflow-hidden">
                            {basicItems.map((item, i) => (
                                <div key={i} className="flex items-start gap-4 px-4 py-3.5 bg-white hover:bg-surface-container-lowest/60 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">{item.label}</p>
                                        <p className="text-sm text-on-surface font-medium leading-relaxed">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Group 2: Preparation ── */}
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline mb-3 flex items-center gap-1.5">
                        <span className="w-4 h-px bg-outline/40 inline-block" />
                        {t('tour_detail.groupPreparation')}
                    </p>
                    <div className="divide-y divide-outline-variant/15 border border-outline-variant/20 rounded-2xl overflow-hidden">
                        {prepItems.map((item, i) => (
                            <div key={i} className="flex items-start gap-4 px-4 py-3.5 bg-white hover:bg-surface-container-lowest/60 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">{item.label}</p>
                                    <p className="text-sm text-on-surface font-medium leading-relaxed">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Group 3: Contact & Support ── */}
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline mb-3 flex items-center gap-1.5">
                        <span className="w-4 h-px bg-outline/40 inline-block" />
                        {t('tour_detail.groupContactSupport')}
                    </p>
                    <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-white p-4 shadow-sm shadow-primary/5 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
                                <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>phone_in_talk</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">{t('tour_detail.hotlineLabel')}</p>
                                <a
                                    href={hotlineHref}
                                    className="inline-flex max-w-full items-baseline gap-2 rounded text-lg font-extrabold text-on-surface font-headline leading-none hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                    aria-label={`${t('tour_detail.supportInfo')} ${hotlineValue}`}
                                >
                                    <span className="truncate">{hotlineValue}</span>
                                </a>
                                <p className="text-xs text-on-surface-variant mt-1">{t('tour_detail.supportAvail')}</p>
                                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                                    {t('tour_detail.hotlineHours')}
                                </p>
                            </div>
                        </div>
                        <a
                            href={hotlineHref}
                            onClick={handleCopyHotline}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            aria-label={`${t('tour_detail.supportInfo')} ${hotlineValue}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">call</span>
                            {t('tour_detail.supportInfo')}
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ── Cancellation Policy Section ───────────────────────────────────────────────
const CANCEL_POLICY_ROWS = [
    {
        timeKey: 'cancelPolicyRow1Time',
        refundKey: 'cancelPolicyRow1Refund',
        noteKey: 'cancelPolicyRow1Note',
        refundColor: 'text-emerald-600',
        noteBg: 'bg-emerald-50 text-emerald-700',
        barWidth: 'w-full',
        barColor: 'bg-emerald-400',
        icon: 'check_circle',
        iconColor: 'text-emerald-500',
    },
    {
        timeKey: 'cancelPolicyRow2Time',
        refundKey: 'cancelPolicyRow2Refund',
        noteKey: 'cancelPolicyRow2Note',
        refundColor: 'text-teal-600',
        noteBg: 'bg-teal-50 text-teal-700',
        barWidth: 'w-4/5',
        barColor: 'bg-teal-400',
        icon: 'check_circle',
        iconColor: 'text-teal-500',
    },
    {
        timeKey: 'cancelPolicyRow3Time',
        refundKey: 'cancelPolicyRow3Refund',
        noteKey: 'cancelPolicyRow3Note',
        refundColor: 'text-amber-600',
        noteBg: 'bg-amber-50 text-amber-700',
        barWidth: 'w-1/2',
        barColor: 'bg-amber-400',
        icon: 'warning',
        iconColor: 'text-amber-500',
    },
    {
        timeKey: 'cancelPolicyRow4Time',
        refundKey: 'cancelPolicyRow4Refund',
        noteKey: 'cancelPolicyRow4Note',
        refundColor: 'text-red-500',
        noteBg: 'bg-red-50 text-red-600',
        barWidth: 'w-0',
        barColor: 'bg-red-300',
        icon: 'cancel',
        iconColor: 'text-red-400',
    },
] as const;

export function CancelPolicySection({ t }: { t: TranslationFn }) {
    return (
        <section className="pt-8 border-t border-outline-variant/20">
            <h2 className="text-2xl font-bold font-headline mb-6">{t('tour_detail.cancelPolicyTitle')}</h2>

            <div className="flex items-start gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-6">
                <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                    <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
                <div>
                    <p className="font-bold text-emerald-800 text-base leading-snug">{t('tour_detail.cancelPolicyBadge')}</p>
                    <p className="text-sm text-emerald-700/80 mt-0.5 leading-relaxed">{t('tour_detail.cancelPolicyBadgeSub')}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/20 overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] bg-surface-container-low/60 px-5 py-3 gap-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-outline">{t('tour_detail.cancelPolicyTableHeader1')}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-outline text-right w-16">{t('tour_detail.cancelPolicyTableHeader2')}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-outline text-right w-28 hidden sm:block"></p>
                </div>

                {CANCEL_POLICY_ROWS.map((row, idx) => (
                    <div
                        key={row.timeKey}
                        className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 px-5 py-4 ${idx < 3 ? 'border-b border-outline-variant/10' : ''}`}
                    >
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={`material-symbols-outlined text-[16px] ${row.iconColor} shrink-0`} style={{ fontVariationSettings: "'FILL' 1" }}>{row.icon}</span>
                                <p className="text-sm font-medium text-on-surface">{t(`tour_detail.${row.timeKey}`)}</p>
                            </div>
                            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                                <div className={`h-full ${row.barWidth} ${row.barColor} rounded-full transition-all duration-500`} />
                            </div>
                        </div>
                        <div className="text-right w-16">
                            <p className={`text-xl font-extrabold leading-none ${row.refundColor}`}>{t(`tour_detail.${row.refundKey}`)}</p>
                        </div>
                        <div className="hidden sm:flex justify-end w-28">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${row.noteBg}`}>
                                {t(`tour_detail.${row.noteKey}`)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-5">
                <p className="text-xs text-outline leading-relaxed">{t('tour_detail.cancelPolicyNote')}</p>
            </div>
        </section>
    );
}

// ── Similar Tours Section ─────────────────────────────────────────────────────
export function SimilarTours({
    similarTours,
    destinationName,
    t,
    formatPrice,
}: {
    similarTours: Tour[];
    destinationName?: string;
    t: TranslationFn;
    formatPrice: (n: number) => string;
}) {
    if (similarTours.length === 0) return null;
    return (
        <section className="mt-20 pt-12 border-t border-outline-variant/20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold font-headline">
                        {destinationName
                            ? t('tour_detail.similarToursAt', { dest: destinationName })
                            : t('tour_detail.similarTours')}
                    </h2>
                    <p className="text-sm text-on-surface-variant mt-1">{t('tour_detail.similarToursDesc')}</p>
                </div>
                <Link
                    href={destinationName
                        ? `/destinations?dest=${encodeURIComponent(destinationName)}`
                        : '/destinations'}
                    className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline shrink-0"
                >
                    {t('tour_detail.viewAll')}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
                {similarTours.map((st) => {
                    const stMin = st.departures?.length
                        ? Math.min(...st.departures.map((d) => d.price ?? st.price))
                        : st.price;
                    return (
                        <Link key={st.id} href={`/tour/${st.id}`} className="group min-w-[260px] snap-start flex-shrink-0 flex flex-col bg-white rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm hover:shadow-lg transition-all duration-300 md:min-w-0">
                            <div className="relative h-48 overflow-hidden">
                                <Image
                                    src={st.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'}
                                    alt={st.name}
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    fill
                                    sizes="(min-width: 768px) 33vw, 100vw"
                                />
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
                                    {st.duration}
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <p className="font-bold text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors">{st.name}</p>
                                {(st.averageRating ?? 0) > 0 && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <span className="material-symbols-outlined text-secondary-container text-[14px] fill-icon">star</span>
                                        <span className="text-xs font-semibold text-on-surface">{(st.averageRating ?? 0).toFixed(1)}</span>
                                        {(st._count?.reviews ?? 0) > 0 && (
                                            <span className="text-xs text-outline">({st._count!.reviews})</span>
                                        )}
                                    </div>
                                )}
                                <p className="text-xs text-outline mt-auto pt-3 border-t border-outline-variant/10">
                                    <span className="font-bold text-primary text-base">{formatPrice(stMin)}</span>
                                    <span className="ml-1">{t('tour_detail.perPerson')}</span>
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

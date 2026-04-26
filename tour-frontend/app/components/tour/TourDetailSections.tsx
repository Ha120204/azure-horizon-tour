'use client';
import { FAQAccordion } from './FAQAccordion';

// ── Highlights Section ────────────────────────────────────────────────────────
export function HighlightsSection({ highlights }: { highlights: { id: number; content: string; icon: string }[] }) {
    if (!highlights || highlights.length === 0) return null;
    return (
        <section className="bg-gradient-to-br from-primary/5 to-secondary-container/5 rounded-3xl p-6 md:p-8 border border-primary/10">
            <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <h2 className="text-xl font-bold font-headline text-on-surface">Điểm nổi bật</h2>
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
    accommodation?: string; transport?: string; activities?: string[];
    imageUrl?: string; timeline?: { time: string; activity: string }[];
};

export function ItinerarySection({ itinerary, fallback }: {
    itinerary: ItineraryDay[];
    fallback: { day: number; title: string; desc: string }[];
}) {
    const days = itinerary?.length > 0 ? itinerary : null;
    const hasMealsInfo = days?.some(d => d.mealsBreakfast || d.mealsLunch || d.mealsDinner);

    return (
        <section>
            <h2 className="text-2xl font-bold font-headline mb-8">Lịch trình chi tiết</h2>
            <div className="space-y-0">
                {days ? days.map((day, i) => (
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
                                {day.timeline && (day.timeline as any[]).length > 0 && (
                                    <div className="mb-4 border-t border-outline-variant/10 pt-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px] text-primary">schedule</span>
                                            Lịch trình trong ngày
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
                                            Địa điểm tham quan
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
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Bữa ăn:</span>
                                            <MealBadge included={!!day.mealsBreakfast} label="Sáng" icon="breakfast_dining" />
                                            <MealBadge included={!!day.mealsLunch} label="Trưa" icon="lunch_dining" />
                                            <MealBadge included={!!day.mealsDinner} label="Tối" icon="dinner_dining" />
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
                )) : fallback.map((item, i, arr) => (
                    <div key={item.day} className="flex gap-4 md:gap-6">
                        <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shadow-md text-sm shrink-0 ${i === 0 ? 'bg-primary text-white' : 'bg-surface-container text-on-surface'}`}>{item.day}</div>
                            {i < arr.length - 1 && <div className="w-px flex-1 bg-outline-variant/30 mt-2 min-h-[32px]" />}
                        </div>
                        <div className="pb-8">
                            <h3 className="text-base md:text-lg font-bold mb-2 text-on-surface">{item.title}</h3>
                            <p className="text-sm text-on-surface-variant leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ── FAQ Section ───────────────────────────────────────────────────────────────
export function FAQSection({ faqs }: { faqs: { id: number; question: string; answer: string }[] }) {
    if (!faqs || faqs.length === 0) return null;
    return (
        <section className="pt-8 border-t border-outline-variant/20">
            <h2 className="text-2xl font-bold font-headline mb-6">Câu hỏi thường gặp</h2>
            <FAQAccordion faqs={faqs} />
        </section>
    );
}

// ── Rating Breakdown ──────────────────────────────────────────────────────────
export function RatingBreakdown({ stats }: {
    stats: {
        averageRating: number;
        totalReviews: number;
        breakdown: { star: number; count: number; percent: number }[];
    } | null;
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
                    <p className="text-xs text-outline">{stats.totalReviews} đánh giá</p>
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
// Props: tour object + t() translation function
export function ImportantInfoSection({ tour, t }: { tour: any; t: (key: string) => string }) {
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
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-secondary-container/5 border border-primary/10">
                        <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
                            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>headset_mic</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">{t('tour_detail.hotlineLabel')}</p>
                            <p className="text-lg font-extrabold text-on-surface font-headline leading-none">{t('tour_detail.hotlineValue')}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">{t('tour_detail.supportAvail')}</p>
                        </div>
                        <a
                            href={`tel:${t('tour_detail.hotlineValue').replace(/\s/g, '')}`}
                            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-[14px]">call</span>
                            {t('tour_detail.supportInfo')}
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

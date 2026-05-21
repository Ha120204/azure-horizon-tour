'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import ReviewModal from '@/app/components/features/review/ReviewModal';
import { useLocale } from '@/app/context/LocaleContext';
import TourGallery from '@/app/components/tour/TourGallery';
import {
    HighlightsSection,
    ItinerarySection,
    FAQSection,
    RatingBreakdown,
    ImportantInfoSection,
} from '@/app/components/tour/TourDetailSections';

import PackageCard from '@/app/components/tour/PackageCard';
import BookingSidebarNew from '@/app/components/tour/BookingSidebar';
import { Tour, TourPackage, Review, ReviewStats } from '@/app/types';

interface RatingBreakdownStats {
    averageRating: number;
    totalReviews: number;
    breakdown: { star: number; count: number; percent: number }[];
}

// ─── Main Page ─
export default function TourDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { t, formatPrice, language } = useLocale();
    const initialDepartureIdParam = searchParams.get('departureId');
    const initialDepartureId = initialDepartureIdParam ? Number(initialDepartureIdParam) : null;

    const [tour, setTour] = useState<Tour | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<TourPackage | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewStats, setReviewStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0 });
    const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdownStats | null>(null);
    const [similarTours, setSimilarTours] = useState<Tour[]>([]);

    const fetchReviews = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/tour/${params.id}/reviews?limit=2`);
            if (res.ok) {
                const data = await res.json();
                setReviews(data.data || []);
                setReviewStats(data.stats || { averageRating: 0, totalReviews: 0 });
            }
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
        }
    };

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                
                // Parallel data fetching for performance
                const [tourRes, reviewsRes, ratingStatsRes] = await Promise.allSettled([
                    fetch(`${apiUrl}/tour/${params.id}?locale=${language}`),
                    fetch(`${apiUrl}/tour/${params.id}/reviews?limit=2`),
                    fetch(`${apiUrl}/tour/${params.id}/rating-stats`)
                ]);

                let fetchedTour = null;

                if (tourRes.status === 'fulfilled' && tourRes.value.ok) {
                    const json = await tourRes.value.json();
                    fetchedTour = json.data || json;
                    setTour(fetchedTour);
                }
                if (reviewsRes.status === 'fulfilled' && reviewsRes.value.ok) {
                    const data = await reviewsRes.value.json();
                    setReviews(data.data || []);
                    setReviewStats(data.stats || { averageRating: 0, totalReviews: 0 });
                }
                if (ratingStatsRes.status === 'fulfilled' && ratingStatsRes.value.ok) {
                    const data = await ratingStatsRes.value.json();
                    setRatingBreakdown(data.data || data);
                }

                // Fetch similar tours after tour data is available
                if (fetchedTour) {
                    const dest = fetchedTour.destination?.name ? `&dest=${encodeURIComponent(fetchedTour.destination.name)}` : '';
                    const similarRes = await fetch(`${apiUrl}/tour?limit=3&locale=${language}${dest}`);
                    if (similarRes.ok) {
                        const json = await similarRes.json();
                        const all: Tour[] = json.data || [];
                        setSimilarTours(all.filter((t: Tour) => t.id !== fetchedTour.id).slice(0, 3));
                    }
                }
            } catch (error) {
                console.error('Error fetching tour detail data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchAllData();
        }
    }, [params.id, language]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center font-bold text-primary">{t('tour_detail.loading')}</div>;
    }
    if (!tour) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-3xl font-bold mb-4 text-error">{t('tour_detail.notFound')}</h2>
                <Link href="/destinations" className="bg-primary text-white px-8 py-3 rounded-full font-bold">{t('tour_detail.backToList')}</Link>
            </div>
        );
    }

    const hasPackages = (tour.packages && tour.packages.length > 0) ?? false;
    const hasReviewStats = reviewStats.totalReviews > 0 && reviewStats.averageRating > 0;

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                {/* ── Breadcrumb ── */}
                <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-outline flex-wrap">
                    <Link href="/" className="hover:text-primary transition-colors">{t('tour_detail.breadcrumbHome')}</Link>
                    <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                    <Link href="/destinations" className="hover:text-primary transition-colors">{t('tour_detail.breadcrumbDest')}</Link>
                    {tour.destination?.name && (
                        <>
                            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                            <Link href={`/destinations?dest=${encodeURIComponent(tour.destination.name)}`} className="hover:text-primary transition-colors">{tour.destination.name}</Link>
                        </>
                    )}
                    <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                    <span className="text-on-surface font-medium truncate max-w-[200px]">{tour.name}</span>
                </nav>

                <TourGallery tour={tour} t={t} />

                {/* ── Highlights ── */}
                <HighlightsSection highlights={tour.highlights ?? []} t={t} />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* ── Left: Detail Content ── */}
                    <div className="col-span-1 lg:col-span-8 space-y-12">

                        {/* Tour header */}
                        <header>
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="bg-secondary-container/10 text-secondary-container px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border border-secondary-container/20">
                                    {t('tour_detail.premiumExp')}
                                </span>
                                <div className={`flex items-center ${hasReviewStats ? 'text-secondary-container' : 'text-outline'}`}>
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    {hasReviewStats ? (
                                        <>
                                            <span className="text-sm font-bold ml-1 text-on-surface">{reviewStats.averageRating.toFixed(1)}</span>
                                            <span className="text-xs text-outline ml-1">
                                                ({reviewStats.totalReviews} {reviewStats.totalReviews === 1 ? t('tour_detail.reviewSingular') : t('tour_detail.reviewsLabel')})
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xs font-bold ml-1 text-outline">{t('reviews.notRated')}</span>
                                    )}
                                </div>
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold font-headline leading-tight tracking-tight text-primary mb-6">
                                {tour.name}
                            </h1>
                            <div className="flex flex-wrap gap-4 md:gap-8 py-6 border-y border-outline-variant/20 text-on-surface-variant">
                                {[
                                    { icon: 'schedule', label: t('tour_detail.durationLbl'), value: tour.duration },
                                    { icon: 'group', label: t('tour_detail.groupSizeLbl'), value: t('tour_detail.spotsLeft', { seats: tour.availableSeats }) },
                                    { icon: 'location_on', label: t('tour_detail.destinationLbl'), value: tour.destination?.name },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                                            <span className="material-symbols-outlined">{item.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-outline">{item.label}</p>
                                            <p className="font-semibold text-sm md:text-base text-on-surface">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </header>

                        {/* Overview */}
                        <section>
                            <h2 className="text-2xl font-bold font-headline mb-4">{t('tour_detail.overview')}</h2>
                            <div className="prose prose-slate max-w-none text-on-surface-variant leading-relaxed space-y-4 text-sm md:text-base whitespace-pre-line">
                                {tour.description}
                            </div>
                        </section>

                        {/* ── Gói Tour ── */}
                        {hasPackages && (
                            <section>
                                <h2 className="text-2xl font-bold font-headline mb-2">{t('tour_detail.selectPackage')}</h2>
                                <p className="text-sm text-on-surface-variant mb-6">
                                    {t('tour_detail.selectPackageDesc')}
                                </p>
                                <div className="space-y-4">
                                    {tour.packages && tour.packages.map((pkg: TourPackage) => (
                                        <PackageCard
                                            key={pkg.id}
                                            pkg={pkg}
                                            selected={selectedPackage?.id === pkg.id}
                                            onSelect={() => {
                                                setSelectedPackage((current) => current?.id === pkg.id ? null : pkg);
                                            }}
                                            formatPrice={formatPrice}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* ── Lịch trình chi tiết (nâng cấp) ── */}
                        <ItinerarySection
                            itinerary={tour.itinerary ?? []}
                            t={t}
                            fallback={[
                                { day: 1, title: t('tour_detail.day1Title'), desc: t('tour_detail.day1Desc') },
                                { day: 2, title: t('tour_detail.day2Title'), desc: t('tour_detail.day2Desc') },
                                { day: 3, title: t('tour_detail.day3Title'), desc: t('tour_detail.day3Desc') },
                            ]}
                        />

                        {/* ── Thông tin cần biết ── */}
                        <ImportantInfoSection tour={tour} t={t} />

                        {/* ── Chính sách hủy (Redesigned) ── */}
                        <section className="pt-8 border-t border-outline-variant/20">
                            <h2 className="text-2xl font-bold font-headline mb-6">{t('tour_detail.cancelPolicyTitle')}</h2>

                            {/* USP Badge — Free Cancellation */}
                            <div className="flex items-start gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                                    <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-800 text-base leading-snug">{t('tour_detail.cancelPolicyBadge')}</p>
                                    <p className="text-sm text-emerald-700/80 mt-0.5 leading-relaxed">{t('tour_detail.cancelPolicyBadgeSub')}</p>
                                </div>
                            </div>

                            {/* Refund Table */}
                            <div className="rounded-2xl border border-outline-variant/20 overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-[1fr_auto_auto] bg-surface-container-low/60 px-5 py-3 gap-4">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-outline">{t('tour_detail.cancelPolicyTableHeader1')}</p>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-outline text-right w-16">{t('tour_detail.cancelPolicyTableHeader2')}</p>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-outline text-right w-28 hidden sm:block"></p>
                                </div>

                                {/* Rows */}
                                {([
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
                                ] as const).map((row, idx) => (
                                    <div
                                        key={row.timeKey}
                                        className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 px-5 py-4 ${idx < 3 ? 'border-b border-outline-variant/10' : ''}`}
                                    >
                                        {/* Left: icon + time label + progress bar */}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`material-symbols-outlined text-[16px] ${row.iconColor} shrink-0`} style={{ fontVariationSettings: "'FILL' 1" }}>{row.icon}</span>
                                                <p className="text-sm font-medium text-on-surface">{t(`tour_detail.${row.timeKey}`)}</p>
                                            </div>
                                            {/* Mini progress bar */}
                                            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                                                <div className={`h-full ${row.barWidth} ${row.barColor} rounded-full transition-all duration-500`} />
                                            </div>
                                        </div>

                                        {/* Center: refund % — always visible */}
                                        <div className="text-right w-16">
                                            <p className={`text-xl font-extrabold leading-none ${row.refundColor}`}>{t(`tour_detail.${row.refundKey}`)}</p>
                                        </div>

                                        {/* Right: badge note — hidden on xs */}
                                        <div className="hidden sm:flex justify-end w-28">
                                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${row.noteBg}`}>
                                                {t(`tour_detail.${row.noteKey}`)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* CTA + Disclaimer */}
                            <div className="mt-5">
                                <p className="text-xs text-outline leading-relaxed">{t('tour_detail.cancelPolicyNote')}</p>
                            </div>
                        </section>

                        {/* ── FAQ ── */}
                        <FAQSection faqs={tour.faqs ?? []} t={t} />

                        {/* Reviews */}
                        <section className="pt-8 border-t border-outline-variant/20">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold font-headline mb-1">{t('tour_detail.storiesTitle')}</h2>
                                    <p className="text-on-surface-variant text-sm md:text-base">{t('tour_detail.storiesSub')}</p>
                                </div>
                                <button onClick={() => setIsReviewModalOpen(true)}
                                    className="group relative inline-flex items-center text-[15px] font-semibold text-on-surface hover:text-primary transition-colors pb-1">
                                    {t('tour_detail.writeReview')}
                                    <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ease-out" />
                                </button>
                            </div>
                            {/* Rating Breakdown */}
                            <RatingBreakdown stats={ratingBreakdown} t={t} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {reviews.length > 0 ? reviews.map(r => (
                                    <div key={r.id} className="bg-white p-6 rounded-xl shadow-sm border border-outline-variant/20">
                                        <div className="flex gap-1 text-secondary-container mb-3">
                                            {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: i < r.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>)}
                                        </div>
                                        <p className="text-on-surface-variant italic mb-4 text-sm line-clamp-3">{r.content}</p>
                                        {r.adminReply && (
                                            <div className="mb-4 bg-primary/5 border-l-4 border-primary/30 rounded-r-lg px-3 py-2.5">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Azure Horizon</span>
                                                </div>
                                                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">{r.adminReply}</p>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                <Image
                                                    className="object-cover"
                                                    alt={r.user?.fullName || 'Reviewer avatar'}
                                                    src={r.user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                                                    fill
                                                    sizes="40px"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-on-surface">{r.user?.fullName}</p>
                                                <p className="text-[10px] uppercase tracking-wider text-outline">{new Date(r.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}</p>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-2 text-center py-6 text-outline-variant italic">
                                        {t('reviews.noReviewsYet')}
                                    </div>
                                )}
                            </div>
                            <div className="mt-8 flex justify-center">
                                <Link href={`/tour/${params.id}/reviews`} className="text-primary font-bold text-sm md:text-base flex items-center gap-2 hover:bg-surface-container-low px-6 py-3 rounded-full transition-colors">
                                    {t('reviews.showMore')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                            </div>
                        </section>
                    </div>

                    {/* ── Right: Booking Sidebar ── */}
                    <BookingSidebarNew
                        tour={tour}
                        initialDepartureId={initialDepartureId}
                        selectedPackage={selectedPackage}
                        formatPrice={formatPrice}
                        t={t}
                        language={language}
                    />
                </div>

                {/* ── Tour tương tự ── */}
                {similarTours.length > 0 && (
                    <section className="mt-20 pt-12 border-t border-outline-variant/20">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold font-headline">{t('tour_detail.similarTours')}</h2>
                                <p className="text-sm text-on-surface-variant mt-1">{t('tour_detail.similarToursDesc')}</p>
                            </div>
                            <Link href="/destinations" className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline">
                                {t('tour_detail.viewAll')}
                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {similarTours.map((st: Tour) => {
                                const stMin = st.departures?.length && st.departures.length > 0
                                    ? Math.min(...st.departures.map(d => d.price ?? st.price))
                                    : st.price;
                                return (
                                    <Link key={st.id} href={`/tour/${st.id}`} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm hover:shadow-lg transition-all duration-300">
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
                                            <p className="font-bold text-on-surface leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">{st.name}</p>
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
                )}
            </main>

            <Footer />

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                tourId={tour.id}
                onSuccess={fetchReviews}
            />
        </div>
    );
}

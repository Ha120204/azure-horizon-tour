'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ReviewModal from '@/components/review/ReviewModal';
import { useLocale } from '@/context/LocaleContext';
import TourGallery from '@/components/tour/TourGallery';
import {
    HighlightsSection,
    ItinerarySection,
    FAQSection,
    RatingBreakdown,
    ImportantInfoSection,
    CancelPolicySection,
    SimilarTours,
} from '@/components/tour/TourDetailSections';
import PackageCard from '@/components/tour/PackageCard';
import BookingSidebarNew from '@/components/tour/BookingSidebar';
import { Tour, TourPackage, TourDeparture, Review, ReviewStats } from '@/types';
import { API_BASE_URL } from '@/lib/http/constants';
import { useCanReview } from '@/hooks/useCanReview';
import { useSimilarTours } from '../_hooks/useSimilarTours';

export interface RatingBreakdownStats {
    averageRating: number;
    totalReviews: number;
    breakdown: { star: number; count: number; percent: number }[];
}

interface Props {
    tour: Tour;
    initialDepartureId: number | null;
    initialReviews: Review[];
    initialReviewStats: ReviewStats;
    initialRatingBreakdown: RatingBreakdownStats | null;
}

export default function TourDetailClient({
    tour,
    initialDepartureId,
    initialReviews,
    initialReviewStats,
    initialRatingBreakdown,
}: Props) {
    const { t, formatPrice, formatDate, language } = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tourId = String(tour.id);

    const departures = useMemo<TourDeparture[]>(() => tour.departures ?? [], [tour.departures]);
    const hasDepartures = departures.length > 0;

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<TourPackage | null>(
        tour.packages?.length ? tour.packages[0] : null,
    );
    const [selectedDeparture, setSelectedDeparture] = useState<TourDeparture | null>(
        initialDepartureId && Number.isFinite(initialDepartureId)
            ? departures.find((d) => d.id === initialDepartureId) ?? null
            : null,
    );

    const handleSelectDeparture = (departure: TourDeparture) => {
        setSelectedDeparture(departure);
        const params = new URLSearchParams(searchParams.toString());
        params.set('departureId', String(departure.id));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Ghế hiển thị ở header: ưu tiên ngày đã chọn; nếu chưa chọn mà có nhiều
    // ngày thì lấy ghế cao nhất (tồn kho thực), tránh dùng tour.availableSeats lệch.
    const headerSeats = selectedDeparture
        ? selectedDeparture.availableSeats
        : hasDepartures
            ? Math.max(...departures.map((d) => d.availableSeats ?? 0))
            : tour.availableSeats;
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [reviewStats, setReviewStats] = useState<ReviewStats>(initialReviewStats);
    const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdownStats | null>(initialRatingBreakdown);
    const { canReview: canWriteReview, setCanReview: setCanWriteReview } = useCanReview(tourId);
    const similarTours = useSimilarTours(tour, language);

    const fetchReviews = async () => {
        // Khách vừa gửi đánh giá → không còn đủ điều kiện viết tiếp (backend chặn review trùng)
        setCanWriteReview(false);
        try {
            const res = await fetch(`${API_BASE_URL}/tour/${tourId}/reviews?limit=2`);
            if (!res.ok) return;
            const data = await res.json();
            setReviews(data.data ?? []);
            setReviewStats(data.stats ?? { averageRating: 0, totalReviews: 0 });
            // Refresh rating breakdown after new review
            const statsRes = await fetch(`${API_BASE_URL}/tour/${tourId}/rating-stats`);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setRatingBreakdown(statsData.data ?? statsData ?? null);
            }
        } catch {
            // Silently ignore — không crash nếu refresh thất bại
        }
    };

    const hasPackages = (tour.packages?.length ?? 0) > 0;
    const hasReviewStats = reviewStats.totalReviews > 0 && reviewStats.averageRating > 0;

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col pb-[76px] lg:pb-0">
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
                            <Link
                                href={`/destinations?dest=${encodeURIComponent(tour.destination.name)}`}
                                className="hover:text-primary transition-colors"
                            >
                                {tour.destination.name}
                            </Link>
                        </>
                    )}
                    <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                    <span className="text-on-surface font-medium truncate max-w-[200px]">{tour.name}</span>
                </nav>

                <TourGallery tour={tour} t={t} tourId={tourId} />

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
                                    { icon: 'group', label: t('tour_detail.groupSizeLbl'), value: t('tour_detail.spotsLeft', { seats: headerSeats }) },
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
                        {tour.description?.trim() && (
                            <section>
                                <h2 className="text-2xl font-bold font-headline mb-4">{t('tour_detail.overview')}</h2>
                                <div className="prose prose-slate max-w-none text-on-surface-variant leading-relaxed text-sm md:text-base">
                                    <ReactMarkdown>{tour.description}</ReactMarkdown>
                                </div>
                            </section>
                        )}

                        {/* ── Gói Tour ── */}
                        {hasPackages && (
                            <section>
                                <h2 className="text-2xl font-bold font-headline mb-2">{t('tour_detail.selectPackage')}</h2>
                                <p className="text-sm text-on-surface-variant mb-6">
                                    {t('tour_detail.selectPackageDesc')}
                                </p>
                                <div className="space-y-4">
                                    {tour.packages!.map((pkg: TourPackage) => (
                                        <PackageCard
                                            key={pkg.id}
                                            pkg={pkg}
                                            selected={selectedPackage?.id === pkg.id}
                                            onSelect={() => setSelectedPackage(pkg)}
                                            formatPrice={formatPrice}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        <ItinerarySection itinerary={tour.itinerary ?? []} t={t} />

                        <ImportantInfoSection tour={tour} t={t} />

                        <CancelPolicySection t={t} />

                        <FAQSection faqs={tour.faqs ?? []} t={t} />

                        {/* ── Reviews ── */}
                        <section className="pt-8 border-t border-outline-variant/20">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold font-headline mb-1">{t('tour_detail.storiesTitle')}</h2>
                                    <p className="text-on-surface-variant text-sm md:text-base">{t('tour_detail.storiesSub')}</p>
                                </div>
                                {canWriteReview && (
                                    <button
                                        type="button"
                                        onClick={() => setIsReviewModalOpen(true)}
                                        className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
                                    >
                                        <span className="material-symbols-outlined text-[18px] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-6 motion-reduce:transform-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            rate_review
                                        </span>
                                        {t('tour_detail.writeReview')}
                                    </button>
                                )}
                            </div>

                            <RatingBreakdown stats={ratingBreakdown} t={t} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {reviews.length > 0 ? reviews.map(r => (
                                    <div key={r.id} className="bg-white p-6 rounded-xl shadow-sm border border-outline-variant/20">
                                        <div className="flex gap-1 text-secondary-container mb-3">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: i < r.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                                            ))}
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
                                                <p className="text-[10px] uppercase tracking-wider text-outline">{formatDate(r.createdAt)}</p>
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
                                <Link href={`/tour/${tourId}/reviews`} className="text-primary font-bold text-sm md:text-base flex items-center gap-2 hover:bg-surface-container-low px-6 py-3 rounded-full transition-colors">
                                    {t('reviews.showMore')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                            </div>
                        </section>
                    </div>

                    {/* ── Right: Booking Sidebar ── */}
                    <BookingSidebarNew
                        tour={tour}
                        selectedDeparture={selectedDeparture}
                        onSelectDeparture={handleSelectDeparture}
                        selectedPackage={selectedPackage}
                        formatPrice={formatPrice}
                        formatDate={formatDate}
                        t={t}
                        language={language}
                    />
                </div>

                {/* ── Tour tương tự ── */}
                <SimilarTours
                    similarTours={similarTours}
                    destinationName={tour.destination?.name}
                    t={t}
                    formatPrice={formatPrice}
                />
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

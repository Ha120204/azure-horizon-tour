import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_BASE_URL } from '@/lib/http/constants';
import type { Tour, Review, ReviewStats } from '@/types';
import TourDetailClient, { type RatingBreakdownStats } from './_components/TourDetailClient';

interface PageProps {
    params: Promise<{ id: string; locale: string }>;
    searchParams: Promise<{ departureId?: string }>;
}

async function fetchTour(id: string, locale: string): Promise<Tour | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/tour/${id}?locale=${locale}`, {
            next: { revalidate: 3600, tags: [`tour-${id}`] },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data ?? json ?? null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id, locale } = await params;

    if (!/^[1-9]\d*$/.test(id)) {
        return { title: 'Tour không tồn tại | Azure Horizon' };
    }

    const tour = await fetchTour(id, locale);
    if (!tour) {
        return { title: 'Tour không tồn tại | Azure Horizon' };
    }

    const description = tour.description?.slice(0, 160) ?? '';

    return {
        title: `${tour.name} | Azure Horizon`,
        description,
        openGraph: {
            title: tour.name,
            description,
            images: tour.imageUrl ? [{ url: tour.imageUrl }] : [],
            type: 'website',
        },
        alternates: {
            canonical: `/${locale}/tour/${id}`,
        },
    };
}

export default async function TourDetailPage({ params, searchParams }: PageProps) {
    const { id, locale } = await params;
    const { departureId } = await searchParams;

    if (!/^[1-9]\d*$/.test(id)) notFound();

    // Fetch tour + reviews + rating stats in parallel
    const [tourResult, reviewsResult, ratingStatsResult] = await Promise.allSettled([
        fetchTour(id, locale),
        fetch(`${API_BASE_URL}/tour/${id}/reviews?limit=2`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/tour/${id}/rating-stats`, { cache: 'no-store' }),
    ]);

    const tour = tourResult.status === 'fulfilled' ? tourResult.value : null;
    if (!tour) notFound();

    let initialReviews: Review[] = [];
    let initialReviewStats: ReviewStats = { averageRating: 0, totalReviews: 0 };
    let initialRatingBreakdown: RatingBreakdownStats | null = null;

    if (reviewsResult.status === 'fulfilled' && reviewsResult.value.ok) {
        const data = await reviewsResult.value.json();
        initialReviews = data.data ?? [];
        initialReviewStats = data.stats ?? { averageRating: 0, totalReviews: 0 };
    }

    if (ratingStatsResult.status === 'fulfilled' && ratingStatsResult.value.ok) {
        const data = await ratingStatsResult.value.json();
        initialRatingBreakdown = data.data ?? data ?? null;
    }

    return (
        <TourDetailClient
            tour={tour}
            initialDepartureId={departureId ? Number(departureId) : null}
            initialReviews={initialReviews}
            initialReviewStats={initialReviewStats}
            initialRatingBreakdown={initialRatingBreakdown}
        />
    );
}

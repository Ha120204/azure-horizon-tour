import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_BASE_URL } from '@/lib/http/constants';
import type { Tour } from '@/types';
import ReviewsClient from './_components/ReviewsClient';

interface PageProps {
    params: Promise<{ id: string; locale: string }>;
}

type ReviewListItem = {
    id: number | string;
    rating: number;
    content: string;
    createdAt: string;
    adminReply?: string | null;
    imageUrls?: string[];
    user?: {
        fullName?: string | null;
        avatarUrl?: string | null;
    };
};

type ReviewListStats = {
    averageRating: number;
    totalReviews: number;
    breakdown?: Record<number, number>;
};

async function fetchTourName(id: string): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/tour/${id}`, { next: { revalidate: 3600 } });
        if (!res.ok) return null;
        const json = await res.json();
        const tour = (json.data ?? json) as Tour;
        return tour?.name ?? null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id, locale } = await params;
    const tourName = await fetchTourName(id);
    return {
        title: tourName
            ? `${tourName} — Đánh giá | Azure Horizon`
            : 'Đánh giá | Azure Horizon',
        alternates: { canonical: `/${locale}/tour/${id}/reviews` },
    };
}

export default async function ReviewsPage({ params }: PageProps) {
    const { id } = await params;

    if (!/^[1-9]\d*$/.test(id)) notFound();

    const [tourResult, reviewsResult] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/tour/${id}`, { next: { revalidate: 3600 } }),
        fetch(`${API_BASE_URL}/tour/${id}/reviews?page=1&limit=5&sortBy=newest`, {
            next: { revalidate: 300 },
        }),
    ]);

    let tourName: string | undefined;
    let initialReviews: ReviewListItem[] = [];
    let initialStats: ReviewListStats | null = null;
    let initialTotalPages = 1;

    if (tourResult.status === 'fulfilled' && tourResult.value.ok) {
        const json = await tourResult.value.json();
        const tour = (json.data ?? json) as Tour;
        tourName = tour?.name;
    }

    if (reviewsResult.status === 'fulfilled' && reviewsResult.value.ok) {
        const json = await reviewsResult.value.json();
        initialReviews = json.data ?? [];
        initialStats = json.stats ?? null;
        initialTotalPages = json.meta?.totalPages ?? 1;
    }

    return (
        <ReviewsClient
            tourId={id}
            tourName={tourName}
            initialReviews={initialReviews}
            initialStats={initialStats}
            initialTotalPages={initialTotalPages}
        />
    );
}

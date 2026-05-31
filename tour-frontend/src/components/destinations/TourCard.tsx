'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import TourRatingBadge from '@/components/tour/TourRatingBadge';

interface TourCardDeparture {
    price?: number | null;
}

interface TourCardData {
    id: number;
    name: string;
    imageUrl?: string | null;
    duration?: string | null;
    price: number;
    averageRating?: number | null;
    reviewCount?: number | null;
    _count?: {
        reviews?: number;
    };
    departures?: TourCardDeparture[];
}

interface TourCardProps {
    tour: TourCardData;
    t: (key: string) => string;
    formatPrice: (price: number) => string;
}

export default function TourCard({ tour, t, formatPrice }: TourCardProps) {
    const router = useRouter();

    /**
     * Smooth expand transition via View Transition API.
     *
     * How it works:
     * 1. Browser captures a screenshot of the current page (old state).
     * 2. `router.push` navigates to the detail page (new state).
     * 3. Browser morphs the element with matching `viewTransitionName` from
     *    its card position/size to its detail-page position/size.
     *
     * `viewTransitionName` is set on the image container div below.
     * The matching name on the TourGallery hero image makes the shared
     * element morph happen automatically.
     *
     * Graceful degradation: falls back to normal navigation on browsers
     * without View Transition support (Firefox < 144, Safari < 18.2).
     */
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        const url = `/tour/${tour.id}`;

        // Fallback for browsers without View Transition API support
        if (typeof document.startViewTransition !== 'function') {
            router.push(url);
            return;
        }

        // Check reduced motion preference — instant nav, no animation
        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;
        if (prefersReducedMotion) {
            router.push(url);
            return;
        }

        // Trigger the shared element morph + page slide transition
        document.startViewTransition(() => {
            router.push(url);
        });
    };

    const displayPrice = formatPrice(
        tour.departures && tour.departures.length > 0
            ? Math.min(...tour.departures.map((d) => d.price ?? tour.price))
            : tour.price
    );

    return (
        <a
            href={`/tour/${tour.id}`}
            onClick={handleClick}
            className="block bg-surface-container-lowest rounded-2xl overflow-hidden editorial-shadow group transition-all duration-300 hover:-translate-y-1"
        >
            {/*
              Image container — the shared element.
              `viewTransitionName` must be unique per card (uses tour.id).
              The matching name in TourGallery tells the browser to morph
              this element into the hero image on the detail page.
            */}
            <div
                className="relative aspect-[4/3] overflow-hidden"
                style={{ viewTransitionName: `tour-img-${tour.id}` }}
            >
                <Image
                    alt={tour.name}
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    src={
                        tour.imageUrl ||
                        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200'
                    }
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                />
                <div className="absolute top-4 left-4 z-10">
                    <span className="bg-tertiary-container text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                        {t('dest.available_badge')}
                    </span>
                </div>
                <TourRatingBadge
                    averageRating={tour.averageRating}
                    reviewCount={tour.reviewCount}
                    _count={tour._count}
                    notRatedLabel={t('reviews.notRated')}
                    reviewLabel={t('tour_detail.reviewSingular')}
                    reviewsLabel={t('tour_detail.reviewsLabel')}
                    variant="surface"
                    className="absolute bottom-4 right-4 z-10"
                />
            </div>

            <div className="p-6">
                <div className="flex items-center text-outline text-[11px] font-bold uppercase tracking-widest mb-2">
                    <span className="material-symbols-outlined text-xs mr-1">schedule</span>
                    {tour.duration}
                </div>
                <h3
                    className="font-headline text-xl font-bold text-on-surface mb-6 truncate"
                    title={tour.name}
                >
                    {tour.name}
                </h3>
                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                    <div>
                        <span className="text-[10px] text-outline block font-bold uppercase tracking-tighter">
                            {t('dest.from')}
                        </span>
                        <span className="text-xl font-extrabold text-primary">{displayPrice}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-surface-container-high group-hover:bg-primary flex items-center justify-center transition-colors duration-300">
                        <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors">
                            arrow_forward
                        </span>
                    </div>
                </div>
            </div>
        </a>
    );
}

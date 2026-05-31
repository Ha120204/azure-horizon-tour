'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
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
    /** Called when card is clicked — parent opens the drawer */
    onSelect: (id: number, imageUrl: string | null | undefined) => void;
}

export default function TourCard({ tour, t, formatPrice, onSelect }: TourCardProps) {
    const displayPrice = formatPrice(
        tour.departures && tour.departures.length > 0
            ? Math.min(...tour.departures.map((d) => d.price ?? tour.price))
            : tour.price
    );

    return (
        <motion.div
            /*
             * layoutId is the key to the shared element animation.
             * When TourDetailDrawer mounts with the same layoutId on its
             * hero image, Framer Motion morphs between the two automatically:
             * position, size, and border-radius all interpolated.
             *
             * Note: only the image container has layoutId, not the whole card.
             * This ensures the card body (title, price) fades naturally while
             * the image is the hero of the expansion animation.
             */
            className="block bg-surface-container-lowest rounded-2xl overflow-hidden editorial-shadow group cursor-pointer"
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => onSelect(tour.id, tour.imageUrl)}
        >
            {/* Image container with layoutId — this is the shared element */}
            <motion.div
                layoutId={`card-img-${tour.id}`}
                className="relative aspect-[4/3] overflow-hidden rounded-t-2xl"
                transition={{
                    layout: {
                        type: 'spring',
                        stiffness: 280,
                        damping: 32,
                    }
                }}
            >
                <Image
                    alt={tour.name}
                    className="object-cover"
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
            </motion.div>

            {/* Card body */}
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
        </motion.div>
    );
}

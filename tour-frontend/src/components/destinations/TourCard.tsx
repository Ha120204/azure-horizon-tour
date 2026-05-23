'use client';

import Image from 'next/image';
import Link from 'next/link';

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
    const reviewCount = Number(tour.reviewCount ?? tour._count?.reviews ?? 0);
    const averageRating = Number(tour.averageRating ?? 0);
    const hasReviews = reviewCount > 0 && averageRating > 0;

    return (
        <Link href={`/tour/${tour.id}`} className="block bg-surface-container-lowest rounded-2xl overflow-hidden editorial-shadow group transition-all duration-300 hover:-translate-y-1">
            <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                    alt={tour.name}
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    src={tour.imageUrl || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200'}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                />
                <div className="absolute top-4 left-4">
                    <span className="bg-tertiary-container text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">{t('dest.available_badge')}</span>
                </div>
                <div className="absolute bottom-4 right-4 bg-surface-container-lowest px-3 py-1.5 rounded-xl editorial-shadow">
                    <div className={`flex items-center ${hasReviews ? 'text-secondary-container' : 'text-outline'}`}>
                        <span className="material-symbols-outlined text-sm mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-xs font-bold text-on-surface">
                            {hasReviews ? averageRating.toFixed(1) : t('reviews.notRated')}
                        </span>
                    </div>
                </div>
            </div>
            <div className="p-6">
                <div className="flex items-center text-outline text-[11px] font-bold uppercase tracking-widest mb-2">
                    <span className="material-symbols-outlined text-xs mr-1">schedule</span>
                    {tour.duration}
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-6 truncate" title={tour.name}>{tour.name}</h3>
                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                    <div>
                        <span className="text-[10px] text-outline block font-bold uppercase tracking-tighter">{t('dest.from')}</span>
                        <span className="text-xl font-extrabold text-primary">
                            {formatPrice(
                                tour.departures && tour.departures.length > 0
                                    ? Math.min(...tour.departures.map((d) => d.price ?? tour.price))
                                    : tour.price
                            )}
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-surface-container-high group-hover:bg-primary flex items-center justify-center transition-colors duration-300">
                        <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors">arrow_forward</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

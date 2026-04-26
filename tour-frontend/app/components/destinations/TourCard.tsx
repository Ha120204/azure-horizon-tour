'use client';

import Link from 'next/link';

interface TourCardProps {
    tour: any;
    t: (key: string) => string;
    formatPrice: (price: number) => string;
}

export default function TourCard({ tour, t, formatPrice }: TourCardProps) {
    return (
        <article className="bg-surface-container-lowest rounded-2xl overflow-hidden editorial-shadow group transition-all duration-300 hover:-translate-y-1">
            <div className="relative aspect-[4/3] overflow-hidden">
                <img alt={tour.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={tour.imageUrl || "https://images.unsplash.com/photo-1499681404123-6c7102ce0033"} />
                <div className="absolute top-4 left-4">
                    <span className="bg-tertiary-container text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">{t('dest.available_badge')}</span>
                </div>
                <div className="absolute bottom-4 right-4 bg-surface-container-lowest px-3 py-1.5 rounded-xl editorial-shadow">
                    <div className="flex items-center text-secondary-container">
                        <span className="material-symbols-outlined text-sm mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-xs font-bold text-on-surface">5.0</span>
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
                                    ? Math.min(...tour.departures.map((d: any) => d.price ?? tour.price))
                                    : tour.price
                            )}
                        </span>
                    </div>
                    <Link href={`/tour/${tour.id}`} className="bg-surface-container-high hover:bg-primary hover:text-white text-primary px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 text-center">
                        {t('dest.viewDetails')}
                    </Link>
                </div>
            </div>
        </article>
    );
}

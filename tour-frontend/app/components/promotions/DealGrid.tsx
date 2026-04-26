'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type DealCategory = 'all' | 'flash' | 'early' | 'lastminute';

interface DealCard {
    id: number;
    tourId: number;
    name: string;
    image: string;
    badge: string;
    badgeColor: string;
    rating: number;
    duration: string;
    newPrice: number;
    oldPrice: number;
    urgencyText: string;
    bookedPercent: number;
    urgencyColor: string;
    category: DealCategory;
}

interface DealGridProps {
    deals: DealCard[];
    filteredDeals: DealCard[];
    activeTab: DealCategory;
    setActiveTab: (tab: DealCategory) => void;
    tabOptions: { key: DealCategory; label: string }[];
    t: (key: string) => string;
    formatPrice: (price: number) => string;
}

const PAGE_SIZE = 6;

export default function DealGrid({
    filteredDeals,
    activeTab,
    setActiveTab,
    tabOptions,
    t,
    formatPrice,
}: DealGridProps) {
    const [page, setPage] = useState(1);

    // Reset về trang 1 khi đổi tab
    useEffect(() => { setPage(1); }, [activeTab]);

    const totalPages = Math.ceil(filteredDeals.length / PAGE_SIZE);
    const paginatedDeals = filteredDeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <>
            {/* ═══════ Filter Tabs ═══════ */}
            <section className="max-w-screen-2xl mx-auto px-8 mb-12">
                <div className="flex flex-wrap gap-3 items-center justify-center bg-surface-container-low p-2 rounded-full border border-outline-variant/20 max-w-max mx-auto">
                    {tabOptions.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-8 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${activeTab === tab.key
                                ? 'bg-primary text-on-primary shadow-sm'
                                : 'hover:bg-white text-on-surface-variant'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* ═══════ Tour Grid ═══════ */}
            <section className="max-w-screen-2xl mx-auto px-8 pb-16">
                {filteredDeals.length === 0 ? (
                    <div className="text-center py-20 bg-surface-container-lowest rounded-2xl">
                        <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
                        <p className="font-bold text-on-surface">{t('noOffersFound')}</p>
                    </div>
                ) : (
                    <>
                        {/* Result count */}
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-sm text-on-surface-variant font-medium">
                                Hiển thị{' '}
                                <span className="font-bold text-on-surface">
                                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredDeals.length)}
                                </span>
                                {' '}/ <span className="font-bold text-primary">{filteredDeals.length}</span> ưu đãi
                            </p>
                            {totalPages > 1 && (
                                <p className="text-xs text-outline">Trang {page} / {totalPages}</p>
                            )}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {paginatedDeals.map((deal) => (
                                <div
                                    key={deal.id}
                                    className="group bg-surface-container-lowest rounded-2xl overflow-hidden hover:shadow-[0_32px_64px_-12px_rgba(25,28,33,0.10)] transition-all duration-500 border border-transparent hover:border-outline-variant/10 flex flex-col"
                                >
                                    {/* Image */}
                                    <div className="relative h-64 overflow-hidden shrink-0">
                                        <img
                                            alt={deal.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            src={deal.image}
                                        />
                                        <span className={`absolute top-4 left-4 ${deal.badgeColor} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm`}>
                                            {deal.badge}
                                        </span>
                                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                                            <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                            <span className="text-sm font-bold text-on-surface">{deal.rating}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <h3 className="text-base font-headline font-bold text-on-surface leading-snug line-clamp-2">{deal.name}</h3>
                                            <span className="text-xs font-label text-on-surface-variant font-semibold uppercase whitespace-nowrap shrink-0 mt-0.5 bg-surface-container px-2 py-0.5 rounded-full">{deal.duration}</span>
                                        </div>

                                        {/* Price */}
                                        <div className="flex items-baseline gap-2 my-3">
                                            <span className="text-xl font-headline font-bold text-primary">{formatPrice(deal.newPrice)}</span>
                                            <span className="text-sm text-on-surface-variant line-through opacity-50">{formatPrice(deal.oldPrice)}</span>
                                            <span className="ml-auto text-xs font-bold text-error bg-error/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                -{Math.round(((deal.oldPrice - deal.newPrice) / deal.oldPrice) * 100)}%
                                            </span>
                                        </div>

                                        {/* Urgency bar */}
                                        <div className="mb-5 mt-auto">
                                            <div className={`flex justify-between text-xs font-semibold text-${deal.urgencyColor} mb-1.5`}>
                                                <span>{deal.urgencyText}</span>
                                                <span>{deal.bookedPercent}% {t('booked')}</span>
                                            </div>
                                            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={`bg-${deal.urgencyColor} h-full rounded-full transition-all duration-700`}
                                                    style={{ width: `${deal.bookedPercent}%` }}
                                                />
                                            </div>
                                        </div>

                                        <Link
                                            href={`/tour/${deal.tourId}`}
                                            className="w-full bg-primary text-on-primary py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                        >
                                            {t('viewDetails')}
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ─── Pagination ─── */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-12">
                                {/* Prev */}
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    aria-label="Trang trước"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>

                                {/* Page numbers */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                                    const isActive = p === page;
                                    const isNear = Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
                                    if (!isNear && Math.abs(p - page) === 2) {
                                        return <span key={p} className="text-outline px-1">…</span>;
                                    }
                                    if (!isNear) return null;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-10 h-10 rounded-full text-sm font-bold transition-all duration-200 ${isActive
                                                ? 'bg-primary text-on-primary shadow-md scale-105'
                                                : 'border border-outline-variant/20 text-on-surface hover:bg-surface-container hover:border-primary/30'
                                                }`}
                                            aria-label={`Trang ${p}`}
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}

                                {/* Next */}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    aria-label="Trang sau"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </>
    );
}

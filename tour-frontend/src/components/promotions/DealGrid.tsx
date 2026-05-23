'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type DealCategory = 'all' | 'flash' | 'early' | 'lastminute';

interface DealCard {
    id: number;
    departureId: number;
    tourId: number;
    name: string;
    image: string;
    badge: string;
    badgeColor?: string;      // legacy – kept for compat, no longer used
    rating: number;
    duration: string;
    newPrice: number;
    oldPrice: number;
    discountPct?: number;
    bookedPercent: number | null;  // null = no data
    maxSeats: number | null;
    availableSeats: number;
    flashSaleEndsAt: string | null; // ISO — real countdown deadline
    urgencyText?: string;           // legacy
    urgencyColor?: string;          // legacy
    category: DealCategory;
    destination?: string;
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

// ── Per-card countdown hook ──────────────────────────────────────────────────
function useCountdown(endsAt: string | null) {
    const getLeft = useCallback(() => {
        if (!endsAt) return null;
        const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
        if (diff === 0) return null;
        return {
            days:    Math.floor(diff / 86_400_000),
            hours:   Math.floor((diff % 86_400_000) / 3_600_000),
            minutes: Math.floor((diff % 3_600_000) / 60_000),
            seconds: Math.floor((diff % 60_000) / 1_000),
            total:   diff,
        };
    }, [endsAt]);

    const [left, setLeft] = useState(getLeft);

    useEffect(() => {
        if (!endsAt) return;
        const id = setInterval(() => setLeft(getLeft()), 1000);
        return () => clearInterval(id);
    }, [endsAt, getLeft]);

    return left;
}

// ── Countdown display widget ─────────────────────────────────────────────────
function CardCountdown({ endsAt, category }: { endsAt: string | null; category: DealCategory }) {
    const left = useCountdown(endsAt);

    if (!endsAt || !left) return null;

    const isUrgent = left.total < 6 * 3_600_000; // < 6 giờ
    const color = category === 'flash'
        ? (isUrgent ? 'bg-error text-white' : 'bg-error/10 text-error border border-error/20')
        : category === 'lastminute'
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-blue-50 text-blue-700 border border-blue-200';

    const pad = (n: number) => String(n).padStart(2, '0');

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${color} mt-2`}>
            <span className="material-symbols-outlined text-[13px]">
                {isUrgent ? 'alarm' : 'schedule'}
            </span>
            <span>
                {left.days > 0 && `${left.days}n `}
                {pad(left.hours)}:{pad(left.minutes)}:{pad(left.seconds)}
            </span>
            <span className="opacity-70 font-normal">còn lại</span>
        </div>
    );
}

// ── Badge color by category ──────────────────────────────────────────────────
function getBadgeStyle(category: DealCategory) {
    switch (category) {
        case 'flash':      return 'bg-error text-white';
        case 'early':      return 'bg-secondary-container text-on-secondary-container';
        case 'lastminute': return 'bg-amber-500 text-white';
        default:           return 'bg-surface-container text-on-surface';
    }
}

// ── Urgency bar color ────────────────────────────────────────────────────────
function getBarColor(category: DealCategory, pct: number) {
    if (pct >= 90) return 'bg-error';
    if (category === 'flash')      return 'bg-error';
    if (category === 'lastminute') return 'bg-amber-500';
    return 'bg-secondary-container';
}

// ── Single deal card ─────────────────────────────────────────────────────────
function DealCardItem({ deal, formatPrice, t }: { deal: DealCard; formatPrice: (n: number) => string; t: (k: string) => string }) {
    const left = useCountdown(deal.flashSaleEndsAt);
    const isExpired = deal.flashSaleEndsAt && !left;

    const discountPct = deal.discountPct
        ?? (deal.oldPrice > 0 ? Math.round(((deal.oldPrice - deal.newPrice) / deal.oldPrice) * 100) : 0);

    const bookedPct = deal.bookedPercent;
    const barColor  = getBarColor(deal.category, bookedPct ?? 0);

    // Urgency text logic
    let urgencyText = '';
    if (deal.availableSeats <= 3) {
        urgencyText = `Chỉ còn ${deal.availableSeats} chỗ!`;
    } else if (deal.flashSaleEndsAt && left && left.total < 6 * 3_600_000) {
        urgencyText = 'Sắp kết thúc!';
    } else if (deal.category === 'flash') {
        urgencyText = 'Flash Sale';
    } else if (deal.category === 'lastminute') {
        urgencyText = 'Sắp hết!';
    } else {
        urgencyText = 'Ưu đãi có hạn';
    }

    return (
        <Link
            href={`/tour/${deal.tourId}?departureId=${deal.departureId}`}
            className={`group block bg-surface-container-lowest rounded-2xl overflow-hidden transition-all duration-500 border flex flex-col cursor-pointer
                ${isExpired
                    ? 'opacity-60 grayscale border-outline-variant/10 pointer-events-none'
                    : 'hover:shadow-[0_32px_64px_-12px_rgba(25,28,33,0.12)] hover:border-outline-variant/20 border-transparent'
                }`}
        >
            {/* Image */}
            <div className="relative h-56 overflow-hidden shrink-0">
                <Image
                    alt={deal.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={deal.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                />

                {/* Badge */}
                <span className={`absolute top-3 left-3 ${getBadgeStyle(deal.category)} px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-sm`}>
                    {deal.badge}
                </span>

                {/* Rating */}
                {deal.rating > 0 && (
                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-sm font-bold text-on-surface">{deal.rating.toFixed(1)}</span>
                    </div>
                )}

                {/* Expired overlay */}
                {isExpired && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white/90 text-on-surface font-bold text-sm px-4 py-2 rounded-full">
                            Ưu đãi đã kết thúc
                        </span>
                    </div>
                )}

                {/* Destination pill */}
                {deal.destination && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px]">location_on</span>
                        {deal.destination}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
                {/* Name + Duration */}
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-sm font-headline font-bold text-on-surface leading-snug line-clamp-2">{deal.name}</h3>
                    <span className="text-[10px] font-label text-on-surface-variant font-semibold uppercase whitespace-nowrap shrink-0 mt-0.5 bg-surface-container px-2 py-0.5 rounded-full">
                        {deal.duration}
                    </span>
                </div>

                {/* Price row */}
                <div className="flex items-baseline gap-2 my-2.5">
                    <span className="text-lg font-headline font-extrabold text-primary">{formatPrice(deal.newPrice)}</span>
                    {deal.oldPrice > deal.newPrice && (
                        <span className="text-xs text-on-surface-variant line-through opacity-50">{formatPrice(deal.oldPrice)}</span>
                    )}
                    {discountPct > 0 && (
                        <span className="ml-auto text-[11px] font-bold text-error bg-error/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                            -{discountPct}%
                        </span>
                    )}
                </div>

                {/* ── Per-card countdown ── */}
                <CardCountdown endsAt={deal.flashSaleEndsAt} category={deal.category} />

                {/* ── Booked progress bar ── */}
                <div className="mt-auto pt-3">
                    {bookedPct !== null ? (
                        <>
                            <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                                <span className={`${deal.availableSeats <= 3 ? 'text-error' : 'text-on-surface-variant'}`}>
                                    {urgencyText}
                                </span>
                                <span className="text-on-surface-variant">
                                    {bookedPct}% {t('booked')}
                                </span>
                            </div>
                            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                <div
                                    className={`${barColor} h-full rounded-full transition-all duration-700`}
                                    style={{ width: `${bookedPct}%` }}
                                />
                            </div>
                            {deal.availableSeats > 0 && (
                                <p className="text-[10px] text-on-surface-variant mt-1 text-right">
                                    Còn <strong className={deal.availableSeats <= 3 ? 'text-error' : 'text-on-surface'}>{deal.availableSeats}</strong> ghế
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-[11px] text-on-surface-variant">{urgencyText}</p>
                    )}
                </div>
            </div>
        </Link>
    );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function DealGrid({
    filteredDeals,
    activeTab,
    setActiveTab,
    tabOptions,
    t,
    formatPrice,
}: DealGridProps) {
    const [pagination, setPagination] = useState({ tab: activeTab, page: 1 });
    const page = pagination.tab === activeTab ? pagination.page : 1;
    const setPageForActiveTab = (nextPage: number | ((currentPage: number) => number)) => {
        setPagination((current) => {
            const currentPage = current.tab === activeTab ? current.page : 1;
            return {
                tab: activeTab,
                page: typeof nextPage === 'function' ? nextPage(currentPage) : nextPage,
            };
        });
    };

    const totalPages     = Math.ceil(filteredDeals.length / PAGE_SIZE);
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
                            className={`px-8 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                                activeTab === tab.key
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
                                <DealCardItem key={deal.id} deal={deal} formatPrice={formatPrice} t={t} />
                            ))}
                        </div>

                        {/* ─── Pagination ─── */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-12">
                                <button
                                    onClick={() => setPageForActiveTab(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    aria-label="Trang trước"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                                    const isActive = p === page;
                                    const isNear   = Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
                                    if (!isNear && Math.abs(p - page) === 2) {
                                        return <span key={p} className="text-outline px-1">…</span>;
                                    }
                                    if (!isNear) return null;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPageForActiveTab(p)}
                                            className={`w-10 h-10 rounded-full text-sm font-bold transition-all duration-200 ${
                                                isActive
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

                                <button
                                    onClick={() => setPageForActiveTab(p => Math.min(totalPages, p + 1))}
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

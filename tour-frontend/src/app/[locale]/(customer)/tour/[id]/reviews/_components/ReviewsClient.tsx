'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ReviewModal from '@/components/review/ReviewModal';
import { useLocale } from '@/context/LocaleContext';
import { useCanReview } from '@/hooks/useCanReview';
import { API_BASE_URL } from '@/lib/http/constants';

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

type ReviewListResponse = {
    data?: ReviewListItem[];
    stats?: ReviewListStats;
    meta?: { totalPages?: number };
};

interface Props {
    tourId: string;
    tourName?: string;
    initialReviews: ReviewListItem[];
    initialStats: ReviewListStats | null;
    initialTotalPages: number;
}

function generatePageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let p = start; p <= end; p++) pages.push(p);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

export default function ReviewsClient({ tourId, tourName, initialReviews, initialStats, initialTotalPages }: Props) {
    const { t, formatDate, formatDateTime } = useLocale();
    const { canReview, setCanReview } = useCanReview(tourId);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState('newest');
    const sortRef = useRef<HTMLDivElement>(null);
    const reviewsListRef = useRef<HTMLElement>(null);
    const [reviews, setReviews] = useState<ReviewListItem[]>(initialReviews);
    const [stats, setStats] = useState<ReviewListStats | null>(initialStats);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(initialTotalPages);
    const [isLoading, setIsLoading] = useState(false);
    const [isPaginating, setIsPaginating] = useState(false);
    const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

    const fetchReviews = async (paginating = false) => {
        if (paginating) {
            setIsPaginating(true);
            if (reviewsListRef.current) {
                const y = reviewsListRef.current.getBoundingClientRect().top + window.scrollY - 120;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        } else {
            setIsLoading(true);
        }
        try {
            const limit = 5;
            const sort = sortOption === 'highest' ? 'rating_desc' : sortOption === 'lowest' ? 'rating_asc' : 'newest';
            const filter = activeFilter === 'all' ? '' : activeFilter;
            const res = await fetch(`${API_BASE_URL}/tour/${tourId}/reviews?page=${page}&limit=${limit}&sortBy=${sort}&filter=${filter}`);
            const json = (await res.json()) as ReviewListResponse;
            if (json.data) {
                setReviews(json.data);
                setStats(json.stats ?? null);
                setTotalPages(json.meta?.totalPages || 1);
            }
        } catch (error) {
            console.error('Lỗi fetch reviews:', error);
        } finally {
            setIsLoading(false);
            setIsPaginating(false);
        }
    };

    // Reset về trang 1 khi đổi filter hoặc sort; nếu page đã là 1 thì fetch trực tiếp
    const filterSortInitial = useRef(true);
    useEffect(() => {
        if (filterSortInitial.current) { filterSortInitial.current = false; return; }
        if (page !== 1) {
            setPage(1); // page effect sẽ xử lý việc fetch
        } else {
            fetchReviews(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilter, sortOption]);

    // Fetch khi chuyển trang (scroll lên đầu danh sách)
    const pageInitial = useRef(true);
    useEffect(() => {
        if (pageInitial.current) { pageInitial.current = false; return; }
        fetchReviews(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Refetch khi modal đóng lại (người dùng vừa gửi đánh giá mới)
    const prevModalOpen = useRef(false);
    useEffect(() => {
        if (!isModalOpen && prevModalOpen.current) fetchReviews(false);
        prevModalOpen.current = isModalOpen;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isModalOpen]);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Đóng lightbox bằng phím Escape
    useEffect(() => {
        if (!lightbox) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setLightbox(null);
            if (e.key === 'ArrowLeft') setLightbox(lb => lb && lb.index > 0 ? { ...lb, index: lb.index - 1 } : lb);
            if (e.key === 'ArrowRight') setLightbox(lb => lb && lb.index < lb.urls.length - 1 ? { ...lb, index: lb.index + 1 } : lb);
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [lightbox]);

    const avgRating = stats?.averageRating || 0;
    const totalReviews = stats?.totalReviews || 0;
    const breakdown = stats?.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    const getPercent = (stars: number) => {
        if (totalReviews === 0) return 0;
        return Math.round(((breakdown[stars] || 0) / totalReviews) * 100);
    };

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow pt-28 pb-20 max-w-6xl mx-auto px-4 md:px-12 lg:px-20 w-full space-y-10">

                {/* Breadcrumb */}
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-outline flex-wrap">
                    <Link href="/" className="hover:text-primary transition-colors">{t('tour_detail.breadcrumbHome')}</Link>
                    <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                    {tourName ? (
                        <>
                            <Link href={`/tour/${tourId}`} className="hover:text-primary transition-colors truncate max-w-[200px]">
                                {tourName}
                            </Link>
                            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                        </>
                    ) : null}
                    <span className="text-on-surface font-medium">{t('reviews.writeReview')}</span>
                </nav>

                {/* 1. Review Overview Header */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center bg-surface-container-lowest p-8 md:p-12 rounded-xl ambient-shadow">
                    {/* Left: Rating Summary */}
                    <div className="flex flex-col items-center lg:items-start space-y-2">
                        <span className="text-7xl font-extrabold font-headline text-primary tracking-tighter">{avgRating.toFixed(1)}</span>
                        <div className="flex items-center text-secondary-container space-x-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={`material-symbols-outlined ${i < Math.round(avgRating) ? 'fill-icon' : ''}`}>star</span>
                            ))}
                        </div>
                        <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest pt-2">
                            {t('reviews.basedOn', { count: totalReviews })}
                        </p>
                    </div>

                    {/* Middle: Breakdown Bars */}
                    <div className="space-y-3 w-full">
                        {[5, 4, 3, 2, 1].map(stars => (
                            <div key={stars} className="flex items-center space-x-4">
                                <span className="text-xs font-medium w-12 text-on-surface-variant">
                                    {stars === 1 ? `1 ${t('reviews.star')}` : t('reviews.stars', { count: stars })}
                                </span>
                                <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                    <div className="h-full bg-secondary-container rounded-full" style={{ width: `${getPercent(stars)}%` }}></div>
                                </div>
                                <span className="text-xs font-medium w-8 text-right text-on-surface-variant">{getPercent(stars)}%</span>
                            </div>
                        ))}
                    </div>

                    {/* Right: Action — chỉ hiện khi user đủ điều kiện (giống trang chi tiết) */}
                    <div className="flex justify-center lg:justify-end">
                        {canReview && (
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary-container px-8 py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-[transform,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:opacity-95 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                <span className="material-symbols-outlined text-[18px] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-6 motion-reduce:transform-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    rate_review
                                </span>
                                {t('reviews.writeReview')}
                            </button>
                        )}
                    </div>
                </section>

                {/* 2. Filter & Sort Toolbar */}
                <nav className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {(['all', '5stars', '4stars', '3stars', '2stars', '1star', 'photos'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeFilter === filter ? 'bg-primary border-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                            >
                                {filter === 'all' && t('reviews.all')}
                                {filter === '5stars' && t('reviews.5stars')}
                                {filter === '4stars' && t('reviews.4stars')}
                                {filter === '3stars' && `3 ${t('reviews.star')}`}
                                {filter === '2stars' && `2 ${t('reviews.star')}`}
                                {filter === '1star' && `1 ${t('reviews.star')}`}
                                {filter === 'photos' && t('reviews.withPhotos')}
                            </button>
                        ))}
                    </div>
                    <div className="relative group min-w-[180px]" ref={sortRef}>
                        <div
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            className="flex items-center justify-between bg-surface-container-low px-5 py-2.5 rounded-lg cursor-pointer hover:bg-surface-container transition-colors"
                        >
                            <span className="text-sm font-medium text-on-surface">
                                {t('reviews.sortBy')} <span className="text-primary">
                                    {sortOption === 'newest' ? t('reviews.newest') : sortOption === 'highest' ? t('reviews.highest') : t('reviews.lowest')}
                                </span>
                            </span>
                            <span className="material-symbols-outlined text-sm transition-transform duration-200" style={{ transform: isSortOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                        </div>

                        {isSortOpen && (
                            <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-outline-variant/20 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                                {(['newest', 'highest', 'lowest'] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => { setSortOption(opt); setIsSortOpen(false); }}
                                        className={`w-full text-left px-5 py-3 text-sm transition-colors hover:bg-surface-container-lowest ${sortOption === opt ? 'font-bold text-primary bg-primary/5' : 'text-on-surface'}`}
                                    >
                                        {opt === 'newest' ? t('reviews.newest') : opt === 'highest' ? t('reviews.highest') : t('reviews.lowest')}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </nav>

                {/* 3. Review List */}
                <section ref={reviewsListRef} className={`space-y-0 bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden relative transition-opacity duration-200 ${isPaginating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    {isPaginating && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                    )}
                    {isLoading ? (
                        <div className="p-12 text-center text-outline-variant font-medium">{t('reviews.loading')}</div>
                    ) : reviews.length > 0 ? (
                        reviews.map((review) => (
                            <article key={review.id} className="p-8 md:p-12 border-b border-outline-variant/15 last:border-0 hover:bg-surface-bright transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                    <div className="flex items-center space-x-4">
                                        {review.user?.avatarUrl ? (
                                            <Image
                                                className="h-14 w-14 rounded-full object-cover"
                                                alt={review.user?.fullName ?? t('reviews.anonymous')}
                                                src={review.user.avatarUrl}
                                                width={56}
                                                height={56}
                                                sizes="56px"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl uppercase">
                                                {review.user?.fullName?.substring(0, 2) || 'U'}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-headline font-bold text-lg text-on-surface">{review.user?.fullName || t('reviews.anonymous')}</h4>
                                            <div className="flex items-center text-tertiary-container space-x-1 pt-0.5">
                                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{t('reviews.authenticatedTraveler')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-start md:items-end gap-1">
                                        <div className="flex text-secondary-container">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <span key={i} className={`material-symbols-outlined text-sm ${i < review.rating ? 'fill-icon' : ''}`}>star</span>
                                            ))}
                                        </div>
                                        <span className="text-xs text-on-surface-variant font-label">
                                            {formatDate(review.createdAt)}
                                            {' '}
                                            <span className="text-outline">
                                                {formatDateTime(review.createdAt, { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-6 max-w-3xl">
                                    <p className="text-on-surface leading-relaxed text-[0.9375rem] font-light">
                                        {review.content}
                                    </p>

                                    {review.imageUrls && review.imageUrls.length > 0 && (
                                        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {review.imageUrls.map((url, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => setLightbox({ urls: review.imageUrls!, index })}
                                                    className="relative aspect-square overflow-hidden rounded-lg group cursor-zoom-in"
                                                >
                                                    <Image
                                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                        alt={`${t('reviews.anonymous')} photo ${index + 1}`}
                                                        src={url}
                                                        fill
                                                        sizes="(min-width: 640px) 25vw, 50vw"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {review.adminReply && (
                                        <div className="mt-6 bg-primary/5 border-l-4 border-primary/40 rounded-r-xl px-5 py-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span
                                                    className="material-symbols-outlined text-primary text-[18px]"
                                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                                >
                                                    admin_panel_settings
                                                </span>
                                                <span className="text-xs font-bold text-primary uppercase tracking-widest">
                                                    {t('reviews.adminName')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-on-surface leading-relaxed">
                                                {review.adminReply}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="p-12 text-center text-outline-variant font-medium">{t('reviews.noReviews')}</div>
                    )}
                </section>

                {/* 4. Pagination với ellipsis */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pb-12">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface hover:bg-primary hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>

                        {generatePageNumbers(page, totalPages).map((p, i) =>
                            p === '...' ? (
                                <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-on-surface-variant text-sm select-none">
                                    …
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all duration-300 ${p === page ? 'bg-primary text-white shadow-md' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'}`}
                                >
                                    {p}
                                </button>
                            )
                        )}

                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-primary hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                )}
            </main>

            <Footer />

            <ReviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tourId={Number(tourId)}
                onSuccess={() => setCanReview(false)}
            />

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightbox(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                        onClick={() => setLightbox(null)}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    {lightbox.index > 0 && (
                        <button
                            className="absolute left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                            onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: lightbox.index - 1 }); }}
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                    )}
                    {lightbox.index < lightbox.urls.length - 1 && (
                        <button
                            className="absolute right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                            onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: lightbox.index + 1 }); }}
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    )}

                    <div onClick={(e) => e.stopPropagation()} className="max-w-5xl w-full">
                        <Image
                            src={lightbox.urls[lightbox.index]}
                            alt={`Review photo ${lightbox.index + 1}`}
                            width={1200}
                            height={800}
                            sizes="100vw"
                            className="w-full max-h-[80vh] object-contain rounded-xl"
                        />
                        <p className="text-center text-white/60 text-xs mt-3">
                            {lightbox.index + 1} / {lightbox.urls.length}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

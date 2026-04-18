'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ReviewModal from '@/app/components/ReviewModal';
import { useParams } from 'next/navigation';
import { useLocale } from '@/app/context/LocaleContext';

export default function ReviewsPage() {
    const params = useParams();
    const { t } = useLocale();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState('newest');
    const sortRef = useRef<HTMLDivElement>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReviews = async () => {
        setIsLoading(true);
        try {
            const limit = 5;
            const sort = sortOption === 'highest' ? 'rating_desc' : sortOption === 'lowest' ? 'rating_asc' : 'newest';
            const filter = activeFilter === 'all' ? '' : activeFilter === 'photos' ? 'photos' : activeFilter;
            // Dù backend chưa support sort & filter chi tiết, nhưng ta gửi lên cho cấu trúc hoàn chỉnh.
            const res = await fetch(`http://localhost:3000/tour/${params.id}/reviews?page=${page}&limit=${limit}&sortBy=${sort}&filter=${filter}`);
            const json = await res.json();
            if (json.data) {
                setReviews(json.data);
                setStats(json.stats);
                setTotalPages(json.meta?.totalPages || 1);
            }
        } catch (error) {
            console.error('Lỗi fetch reviews:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id, page, isModalOpen, sortOption, activeFilter]);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const avgRating = stats?.averageRating || 0;
    const totalReviews = stats?.totalReviews || 0;
    const breakdown = stats?.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    const getPercent = (stars: number) => {
        if (totalReviews === 0) return 0;
        return Math.round(((breakdown[stars] || 0) / totalReviews) * 100);
    };

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .ambient-shadow { box-shadow: 0 8px 32px rgba(25, 28, 33, 0.04); }
                .fill-icon { font-variation-settings: 'FILL' 1; }
            `}} />

            <Header />

            <main className="flex-grow pt-28 pb-20 max-w-6xl mx-auto px-4 md:px-12 lg:px-20 w-full space-y-16">

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
                        <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest pt-2">{totalReviews} {t('reviews.basedOn')}</p>
                    </div>

                    {/* Middle: Breakdown Bars */}
                    <div className="space-y-3 w-full">
                        {[5, 4, 3, 2, 1].map(stars => (
                            <div key={stars} className="flex items-center space-x-4">
                                <span className="text-xs font-medium w-12 text-on-surface-variant">{stars === 1 ? t('reviews.star') : t('reviews.stars', { count: stars }).replace('{count}', stars.toString())}</span>
                                <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                    <div className="h-full bg-secondary-container rounded-full" style={{ width: `${getPercent(stars)}%` }}></div>
                                </div>
                                <span className="text-xs font-medium w-8 text-right text-on-surface-variant">{getPercent(stars)}%</span>
                            </div>
                        ))}
                    </div>

                    {/* Right: Action */}
                    <div className="flex justify-center lg:justify-end">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-full font-headline font-semibold text-sm hover:shadow-lg transition-all active:scale-95"
                        >
                            {t('reviews.writeReview')}
                        </button>
                    </div>
                </section>

                {/* 2. Filter & Sort Toolbar */}
                <nav className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeFilter === 'all' ? 'bg-primary border-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                        >
                            {t('reviews.all')}
                        </button>
                        <button
                            onClick={() => setActiveFilter('5stars')}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeFilter === '5stars' ? 'bg-primary border-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                        >
                            5 {t('reviews.stars')}
                        </button>
                        <button
                            onClick={() => setActiveFilter('4stars')}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeFilter === '4stars' ? 'bg-primary border-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                        >
                            4 {t('reviews.stars')}
                        </button>
                        <button
                            onClick={() => setActiveFilter('3stars')}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeFilter === '3stars' ? 'bg-primary border-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                        >
                            3 {t('reviews.stars')}
                        </button>
                        <button
                            onClick={() => setActiveFilter('2stars')}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeFilter === '2stars' ? 'bg-primary border-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                        >
                            2 {t('reviews.stars')}
                        </button>
                        <button
                            onClick={() => setActiveFilter('1star')}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeFilter === '1star' ? 'bg-primary border-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                        >
                            1 {t('reviews.star')}
                        </button>
                        <button
                            onClick={() => setActiveFilter('photos')}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeFilter === 'photos' ? 'bg-primary border-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                        >
                            {t('reviews.withPhotos')}
                        </button>
                    </div>
                    <div className="relative group min-w-[180px]" ref={sortRef}>
                        <div
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            className="flex items-center justify-between bg-surface-container-low px-5 py-2.5 rounded-lg cursor-pointer hover:bg-surface-container transition-colors"
                        >
                            <span className="text-sm font-medium text-on-surface">
                                {t('reviews.sortBy')} <span className="text-primary">{sortOption === 'newest' ? t('reviews.newest') : (sortOption === 'highest' ? 'Highest Rating' : 'Lowest Rating')}</span>
                            </span>
                            <span className="material-symbols-outlined text-sm transition-transform duration-200" style={{ transform: isSortOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                        </div>

                        {isSortOpen && (
                            <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-outline-variant/20 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                                <button
                                    onClick={() => { setSortOption('newest'); setIsSortOpen(false); }}
                                    className={`w-full text-left px-5 py-3 text-sm transition-colors hover:bg-surface-container-lowest ${sortOption === 'newest' ? 'font-bold text-primary bg-primary/5' : 'text-on-surface'}`}
                                >
                                    {t('reviews.newest')}
                                </button>
                                <button
                                    onClick={() => { setSortOption('highest'); setIsSortOpen(false); }}
                                    className={`w-full text-left px-5 py-3 text-sm transition-colors hover:bg-surface-container-lowest ${sortOption === 'highest' ? 'font-bold text-primary bg-primary/5' : 'text-on-surface'}`}
                                >
                                    Highest Rating
                                </button>
                                <button
                                    onClick={() => { setSortOption('lowest'); setIsSortOpen(false); }}
                                    className={`w-full text-left px-5 py-3 text-sm transition-colors hover:bg-surface-container-lowest ${sortOption === 'lowest' ? 'font-bold text-primary bg-primary/5' : 'text-on-surface'}`}
                                >
                                    Lowest Rating
                                </button>
                            </div>
                        )}
                    </div>
                </nav>

                {/* 3. Review List */}
                <section className="space-y-0 bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-outline-variant font-medium">Loading reviews...</div>
                    ) : reviews.length > 0 ? (
                        reviews.map((review) => (
                            <article key={review.id} className="p-8 md:p-12 border-b border-outline-variant/15 last:border-0 hover:bg-surface-bright transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                    <div className="flex items-center space-x-4">
                                        {review.user?.avatarUrl ? (
                                            <img className="w-14 h-14 rounded-full object-cover" alt={review.user?.fullName} src={review.user.avatarUrl} />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl uppercase">
                                                {review.user?.fullName?.substring(0, 2) || 'U'}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-headline font-bold text-lg text-on-surface">{review.user?.fullName || 'Anonymous'}</h4>
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
                                            {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-6 max-w-3xl">
                                    <p className="text-on-surface leading-relaxed text-[0.9375rem] font-light">
                                        {review.content}
                                    </p>

                                    {review.imageUrls && review.imageUrls.length > 0 && (
                                        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {review.imageUrls.map((url: string, index: number) => (
                                                <div key={index} className="relative aspect-square overflow-hidden rounded-lg group cursor-zoom-in">
                                                    <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Review photo" src={url} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="p-12 text-center text-outline-variant font-medium">No reviews found.</div>
                    )}
                </section>

                {/* 4. Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 pb-12">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface hover:bg-primary hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        
                        {Array.from({ length: totalPages }).map((_, i) => {
                            const p = i + 1;
                            const isActive = p === page;
                            return (
                                <button 
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'}`}
                                >
                                    {p}
                                </button>
                            );
                        })}

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
                tourId={Number(params.id)}
            />
        </div>
    );
}

'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ReviewModal from '@/app/components/ReviewModal';
import { useLocale } from '@/app/context/LocaleContext';

export default function ReviewsPage() {
    const { t } = useLocale();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState('newest');
    const sortRef = useRef<HTMLDivElement>(null);

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
                        <span className="text-7xl font-extrabold font-headline text-primary tracking-tighter">4.9</span>
                        <div className="flex items-center text-secondary-container space-x-1">
                            <span className="material-symbols-outlined fill-icon">star</span>
                            <span className="material-symbols-outlined fill-icon">star</span>
                            <span className="material-symbols-outlined fill-icon">star</span>
                            <span className="material-symbols-outlined fill-icon">star</span>
                            <span className="material-symbols-outlined fill-icon">star</span>
                        </div>
                        <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest pt-2">{t('reviews.basedOn')}</p>
                    </div>

                    {/* Middle: Breakdown Bars */}
                    <div className="space-y-3 w-full">
                        <div className="flex items-center space-x-4">
                            <span className="text-xs font-medium w-12 text-on-surface-variant">{t('reviews.5stars')}</span>
                            <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full bg-secondary-container w-[92%] rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium w-8 text-right text-on-surface-variant">92%</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-xs font-medium w-12 text-on-surface-variant">{t('reviews.4stars')}</span>
                            <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full bg-secondary-container w-[6%] rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium w-8 text-right text-on-surface-variant">6%</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-xs font-medium w-12 text-on-surface-variant">3 {t('reviews.stars')}</span>
                            <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full bg-secondary-container w-[2%] rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium w-8 text-right text-on-surface-variant">2%</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-xs font-medium w-12 text-on-surface-variant">2 {t('reviews.stars')}</span>
                            <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full bg-secondary-container w-[0%] rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium w-8 text-right text-on-surface-variant">0%</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-xs font-medium w-12 text-on-surface-variant">1 {t('reviews.star')}</span>
                            <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full bg-secondary-container w-[0%] rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium w-8 text-right text-on-surface-variant">0%</span>
                        </div>
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
                            {t('reviews.5stars')}
                        </button>
                        <button
                            onClick={() => setActiveFilter('4stars')}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${activeFilter === '4stars' ? 'bg-primary border-primary text-white' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                        >
                            {t('reviews.4stars')}
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
                    {/* Sample 1 */}
                    <article className="p-8 md:p-12 border-b border-outline-variant/15 last:border-0 hover:bg-surface-bright transition-colors">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-center space-x-4">
                                <img className="w-14 h-14 rounded-full object-cover" alt="Elena Rodriguez" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqWtmpcYtI8hDCrGDQ8o726b9tL0_xOtjSjLqwnE-5sR1Go_v6lsDrXSdspQm90hFXDGBZ--5WS-ABwJuoPY6Wt2anWBsq5y2RhAu0IoZ8sYZWYWvJdvJRUmZxatR-4B9GpYCgbZ45RZe77HS-qjaCHCzueVF4n4LfnKCmJQPaCxJld37ucDrKxogXnsk4OrJgRoUgQgjr3hJCyNt-ky8ctTUwPlqwi5exLMVKafuXi1Zi6Ny4url5Lzj0kk5_IIf4948z4qKV9iD-" />
                                <div>
                                    <h4 className="font-headline font-bold text-lg text-on-surface">Elena Rodriguez</h4>
                                    <div className="flex items-center text-tertiary-container space-x-1 pt-0.5">
                                        <span className="material-symbols-outlined text-[16px]">verified</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('reviews.authenticatedTraveler')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-start md:items-end gap-1">
                                <div className="flex text-secondary-container">
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                </div>
                                <span className="text-xs text-on-surface-variant font-label">October 2024</span>
                            </div>
                        </div>
                        <div className="mt-6 max-w-3xl">
                            <p className="text-on-surface leading-relaxed text-[0.9375rem] font-light">
                                Our stay was absolutely transcendent. Azure Horizon didn't just book a room; they curated an entire sensory experience. From the private balcony breakfast overlooking the Amalfi coast to the hidden vineyard tour, every detail was polished to perfection. The attention to our specific dietary preferences was a touch of true luxury.
                            </p>
                        </div>
                    </article>

                    {/* Sample 2 (With Photos) */}
                    <article className="p-8 md:p-12 border-b border-outline-variant/15 last:border-0 hover:bg-surface-bright transition-colors">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl">JM</div>
                                <div>
                                    <h4 className="font-headline font-bold text-lg text-on-surface">Julian Mercer</h4>
                                    <div className="flex items-center text-tertiary-container space-x-1 pt-0.5">
                                        <span className="material-symbols-outlined text-[16px]">verified</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('reviews.authenticatedTraveler')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-start md:items-end gap-1">
                                <div className="flex text-secondary-container">
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                </div>
                                <span className="text-xs text-on-surface-variant font-label">September 2024</span>
                            </div>
                        </div>
                        <div className="mt-6 max-w-3xl">
                            <p className="text-on-surface leading-relaxed text-[0.9375rem] font-light">
                                The "Visual Memories" package is worth every penny. The photographer they arranged captured the sunset at Oia in a way that truly feels like a cinematic dream. We've used many concierge services, but the editorial quality of this trip was unparalleled.
                            </p>

                            {/* Visual Memories Grid */}
                            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="relative aspect-square overflow-hidden rounded-lg group cursor-zoom-in">
                                    <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="stunning sunset over white architecture of Santorini with deep blue Aegean sea in the background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvABLwzdjP_5ByE-BR_ClHUhTOQq2SxbOJK-tOQjcZYGTf8dpyjuFqKRBqccjXhNvNFQcFJZ72o-f56rQsQ4vnQSgQdZluFpGVOwSlU4rO5ZwRGXlE9F87SVVarluf32Y58fK2eqAiik41DLhjkhDIZuj5fx8LbNvfL_16sES0y0CJn_ULvwDJoX63y0ro5yfGaowPT33NFERn62qJcyhOx_viWNe7ChQfynB7Z3AUcCLrt9qpPCFPhZbUNDMUlrBgEvw0ovlpc4iE" />
                                </div>
                                <div className="relative aspect-square overflow-hidden rounded-lg group cursor-zoom-in">
                                    <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="close-up of luxury breakfast spread on a balcony with blue water and hills in the soft focus distance" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuBTCFGBdGQ8dEUIBtbjN7GWRpCF9V0fI2j1woU6JKj6b2MsuD1_ItQLn23fFwAis3xViS0aUmFwOF6qrmnYqUH0gdoOD3WctXIb2j7DGJGnQquTZHfcTU_MtuL85Fia4U4Zztxa6koHf2oI0onyUo6yPMU9eLL4MsmLetSuxLZw6RVT4IcncCNPRoKZOnZfQ0S0lKAL0qgDyU3kokmpLYMTAUirjq0nsBOlJMIp5o2KzlkqtIRSbEC2MFMIJhRQdzScaqzNh695dp" />
                                </div>
                            </div>
                        </div>
                    </article>

                    {/* Sample 3 */}
                    <article className="p-8 md:p-12 border-b border-outline-variant/15 last:border-0 hover:bg-surface-bright transition-colors">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-center space-x-4">
                                <img className="w-14 h-14 rounded-full object-cover" alt="middle-aged man with beard wearing premium linen shirt in a bright airy Mediterranean setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMC1TJh0ZH66zq561ePcuNSjKldqPwvgOuRa66D5QQcun7drQNLOwy977BGmhrvdrMtFGXT6NOHcLrlaKPJp5DrMq_Ppa14qbcEYHsG3YHDlb8fRCfeKAVsBxHQgQ4K8sQpSGRi6-RiNvgvAwRnoFAuUEzBia2ufZNfeuOgGdjMSGgEfqIJfuBc7HLV8mxJwAFyfoOjv0-Kv9UbaHzLiY9Cuczp2jaIb8QromutdTGNYAwDfVv76dU2lc5seo6PeAVD2o0xAgKlgGt" />
                                <div>
                                    <h4 className="font-headline font-bold text-lg text-on-surface">David Chen</h4>
                                    <div className="flex items-center text-tertiary-container space-x-1 pt-0.5">
                                        <span className="material-symbols-outlined text-[16px]">verified</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('reviews.authenticatedTraveler')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-start md:items-end gap-1">
                                <div className="flex text-secondary-container">
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined fill-icon text-sm">star</span>
                                    <span className="material-symbols-outlined text-sm">star</span>
                                </div>
                                <span className="text-xs text-on-surface-variant font-label">August 2024</span>
                            </div>
                        </div>
                        <div className="mt-6 max-w-3xl">
                            <p className="text-on-surface leading-relaxed text-[0.9375rem] font-light">
                                Azure Horizon understands that luxury is found in the quiet moments. They arranged a private transfer that was seamless, and the hotel staff treated us like royalty from the moment we stepped off the boat. A 5-star experience through and through.
                            </p>
                        </div>
                    </article>
                </section>

                {/* 4. Pagination */}
                <div className="flex justify-center pb-12">
                    <button className="group flex items-center space-x-3 text-primary font-headline font-semibold text-sm tracking-wide py-4 px-8 hover:bg-surface-container-low rounded-full transition-all">
                        <span>{t('reviews.showMore')}</span>
                        <span className="material-symbols-outlined group-hover:translate-y-1 transition-transform">expand_more</span>
                    </button>
                </div>
            </main>

            <Footer />

            <ReviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}

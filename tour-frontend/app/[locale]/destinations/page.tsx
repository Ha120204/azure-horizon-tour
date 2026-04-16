'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { useLocale } from '@/app/context/LocaleContext';

function DestinationsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t, formatPrice, language, currency } = useLocale();

    // 1. Nhận tham số từ trang chủ truyền sang
    const initialDest = searchParams.get('dest') || '';
    const initialDate = searchParams.get('date') || '';
    const initialBudget = searchParams.get('budget') || '';

    // 2. State cho thanh tìm kiếm
    const [dest, setDest] = useState(initialDest);
    const [date, setDate] = useState(initialDate);
    const [budget, setBudget] = useState(initialBudget);

    // 3. State lưu dữ liệu API
    const [allTours, setAllTours] = useState<any[]>([]);
    const [filteredTours, setFilteredTours] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 4. State cho bộ lọc sidebar
    const [sidebarBudget, setSidebarBudget] = useState(initialBudget);
    const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['Luxury Retreat']);
    const [showMobileFilter, setShowMobileFilter] = useState(false);
    const [sortBy, setSortBy] = useState('recommended');

    // 5. Gọi API lấy Tour
    useEffect(() => {
        const fetchTours = async () => {
            try {
                const res = await fetch('http://localhost:3000/tour');
                const data = await res.json();
                setAllTours(data);
                applyFilter(data, initialDest, initialBudget);
            } catch (error) {
                console.error('Lỗi lấy danh sách tour:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTours();
    }, [initialDest, initialBudget]);

    // 6. Logic lọc tour
    const applyFilter = (tours: any[], searchDest: string, searchBudget: string) => {
        let result = tours;
        if (searchDest) {
            const keyword = searchDest.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(keyword) ||
                (t.destination && t.destination.toLowerCase().includes(keyword))
            );
        }
        if (searchBudget && searchBudget !== 'unlimited') {
            const parts = searchBudget.split('-');
            if (parts.length === 2) {
                const min = parseInt(parts[0]) || 0;
                const max = parts[1] === 'unlimited' ? Infinity : parseInt(parts[1]);
                result = result.filter(t => t.price >= min && t.price <= max);
            } else {
                const budgetValue = parseInt(searchBudget);
                result = result.filter(t => t.price >= budgetValue);
            }
        }
        
        if (sortBy === 'priceLowHigh') {
            result.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'priceHighLow') {
            result.sort((a, b) => b.price - a.price);
        } else {
            result.sort((a, b) => a.id - b.id);
        }
        
        setFilteredTours(result);
    };

    // Theo dõi thay đổi sortBy để sắp xếp lại mảng đã lọc
    useEffect(() => {
        setFilteredTours(prev => {
            const sorted = [...prev];
            if (sortBy === 'priceLowHigh') {
                sorted.sort((a, b) => a.price - b.price);
            } else if (sortBy === 'priceHighLow') {
                sorted.sort((a, b) => b.price - a.price);
            } else {
                sorted.sort((a, b) => a.id - b.id);
            }
            return sorted;
        });
    }, [sortBy]);

    // 7. Toggle star rating
    const toggleRating = (rating: number) => {
        setSelectedRatings(prev =>
            prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
        );
    };

    // 8. Toggle tour type
    const toggleType = (type: string) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    // 9. Clear all filters
    const handleClearAll = () => {
        setDest('');
        setDate('');
        setSidebarBudget('');
        setSelectedRatings([]);
        setSelectedTypes([]);
    };

    // 10. Apply sidebar filters
    const handleApplyFilters = () => {
        let result = allTours;

        // Filter by search keyword
        if (dest) {
            const keyword = dest.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(keyword) ||
                (t.destination && t.destination.toLowerCase().includes(keyword))
            );
        }

        // Filter by budget
        if (sidebarBudget && sidebarBudget !== 'unlimited') {
            const parts = sidebarBudget.split('-');
            if (parts.length === 2) {
                const min = parseInt(parts[0]) || 0;
                const max = parts[1] === 'unlimited' ? Infinity : parseInt(parts[1]);
                result = result.filter(t => t.price >= min && t.price <= max);
            }
        }

        if (sortBy === 'priceLowHigh') {
            result.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'priceHighLow') {
            result.sort((a, b) => b.price - a.price);
        } else {
            result.sort((a, b) => a.id - b.id);
        }

        setFilteredTours(result);
        setShowMobileFilter(false);
    };

    // Đếm tổng bộ lọc đang active
    const activeFilterCount = selectedRatings.length + selectedTypes.length + (sidebarBudget ? 1 : 0) + (dest ? 1 : 0) + (date ? 1 : 0);

    // Nội dung Sidebar Filter dùng chung cho Desktop và Mobile
    const filterContent = (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(25,28,33,0.06)' }}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-lg">tune</span>
                    </div>
                    <div>
                        <h2 className="font-headline text-lg font-bold tracking-tight leading-tight">{t('filter.title')}</h2>
                        {activeFilterCount > 0 && (
                            <p className="text-[11px] text-primary font-semibold">{activeFilterCount} {t('filter.active')}</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleClearAll}
                    className="text-[11px] font-bold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-primary/5"
                >
                    {t('filter.clearAll')}
                </button>
            </div>

            {/* Search Section */}
            <div className="px-6 py-6 border-b border-outline-variant/10">
                <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">search</span>
                    {t('search.whereTo')}
                </h3>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">location_on</span>
                    <input
                        className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-white transition-all placeholder:text-outline-variant outline-none"
                        placeholder={t('search.whereTo')}
                        type="text"
                        value={dest}
                        onChange={(e) => setDest(e.target.value)}
                    />
                </div>
            </div>

            {/* Departure Date Section */}
            <div className="px-6 py-6 border-b border-outline-variant/10">
                <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                    {language === 'vi' ? 'Ngày khởi hành' : 'Departure Date'}
                </h3>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">event</span>
                    <input
                        className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-white transition-all outline-none cursor-pointer"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Price Range Section */}
            <div className="px-6 py-6 border-b border-outline-variant/10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">payments</span>
                        {t('filter.priceRange')}
                    </h3>
                </div>
                <div className="space-y-2">
                    {[
                        { label: t('search.under5k'), value: '0-200' },
                        { label: t('search.5kTo10k'), value: '200-400' },
                        { label: t('search.10kTo25k'), value: '400-800' },
                        { label: t('search.above25k'), value: '800-unlimited' },
                    ].map((option) => {
                        const isActive = sidebarBudget === option.value;
                        return (
                            <button
                                key={option.value}
                                onClick={() => setSidebarBudget(option.value)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 group active:scale-[0.98]
                                    ${isActive
                                        ? 'bg-primary/5 border-primary/25'
                                        : 'border-outline-variant/15 bg-white hover:border-primary/15'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                    ${isActive ? 'border-primary' : 'border-outline-variant/30 group-hover:border-primary/50'}`}>
                                    {isActive && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                                    )}
                                </div>
                                <span className={`text-sm font-semibold leading-tight ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                                    {option.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Star Rating Section */}
            <div className="px-6 py-6 border-b border-outline-variant/10">
                <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    {language === 'vi' ? 'Đánh giá' : 'Rating'}
                </h3>
                <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                        const isActive = selectedRatings.includes(rating);
                        return (
                            <button
                                key={rating}
                                onClick={() => toggleRating(rating)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 group active:scale-[0.98]
                                    ${isActive
                                        ? 'bg-primary/5 border-primary/25'
                                        : 'border-outline-variant/15 bg-white hover:border-primary/15'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                                    ${isActive ? 'bg-primary border-primary' : 'border-outline-variant/30'}`}>
                                    {isActive && (
                                        <span className="material-symbols-outlined text-white text-xs font-bold">check</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <span
                                            key={i}
                                            className={`material-symbols-outlined text-base ${i < rating ? 'text-amber-400' : 'text-outline-variant/30'}`}
                                            style={{ fontVariationSettings: "'FILL' 1" }}
                                        >star</span>
                                    ))}
                                </div>
                                <span className={`text-xs font-semibold ml-auto ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                                    {rating}.0+
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tour Type Section */}
            <div className="px-6 py-6 border-b border-outline-variant/10">
                <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">category</span>
                    {t('filter.tourType')}
                </h3>
                <div className="space-y-2">
                    {[
                        { label: t('filter.groupTour'), icon: 'groups', desc: t('filter.groupTourDesc') },
                        { label: t('filter.privateCharter'), icon: 'directions_car', desc: t('filter.privateCharterDesc') },
                        { label: t('filter.luxuryRetreat'), icon: 'spa', desc: t('filter.luxuryRetreatDesc') },
                    ].map((type) => {
                        const isActive = selectedTypes.includes(type.label);
                        return (
                            <button
                                key={type.label}
                                onClick={() => toggleType(type.label)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 group active:scale-[0.98]
                                    ${isActive
                                        ? 'bg-primary/5 border-primary/25'
                                        : 'border-outline-variant/15 bg-white hover:border-primary/15'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                    ${isActive ? 'bg-primary/15' : 'bg-surface-container-low group-hover:bg-surface-container'}`}>
                                    <span className={`material-symbols-outlined text-base ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{type.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-primary' : 'text-on-surface'}`}>{type.label}</p>
                                    <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">{type.desc}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                                    ${isActive ? 'bg-primary border-primary' : 'border-outline-variant/30'}`}>
                                    {isActive && (
                                        <span className="material-symbols-outlined text-white text-xs font-bold">check</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Apply Button */}
            <div className="px-6 py-5">
                <button
                    onClick={handleApplyFilters}
                    className="w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-white font-headline font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/15 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">filter_list</span>
                    {t('filter.apply')}
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}} />

            <Header />

            <main className="pt-28 pb-20 flex-grow">
                {/* Hero Section */}
                <section className="px-4 md:px-8 max-w-screen-2xl mx-auto mb-16">
                    <div className="relative overflow-hidden rounded-3xl min-h-[320px] flex flex-col items-center justify-center text-center p-6 md:p-12 hero-gradient">
                        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
                            <img alt="Travel background" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1499681404123-6c7102ce0033?auto=format&fit=crop&q=80&w=2000" />
                        </div>
                        <div className="relative z-10 max-w-4xl w-full">
                            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">{t('dest.heroTitle')}</h1>
                            <p className="text-base md:text-lg text-white/90 font-medium max-w-2xl mx-auto leading-relaxed">
                                {t('dest.heroSubtitle')}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Main Content Area */}
                <div className="px-4 md:px-8 max-w-screen-2xl mx-auto">
                    {/* Mobile Filter Toggle */}
                    <div className="lg:hidden mb-6">
                        <button
                            onClick={() => setShowMobileFilter(!showMobileFilter)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15 font-semibold text-sm text-on-surface active:scale-[0.98] transition-all"
                        >
                            <span className="material-symbols-outlined text-primary text-lg">tune</span>
                            {showMobileFilter ? t('filter.hide') : t('filter.show')}
                            {activeFilterCount > 0 && (
                                <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>
                            )}
                        </button>
                        {showMobileFilter && <div className="mt-4">{filterContent}</div>}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                        {/* Desktop Sidebar Filter */}
                        <aside className="hidden lg:block lg:col-span-3">
                            <div className="sticky top-28">
                                {filterContent}
                            </div>
                        </aside>

                        {/* Right Content Area: Tour Grid */}
                        <section className="lg:col-span-9">
                            {/* Top Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                <div>
                                    <p className="text-on-surface-variant font-medium">
                                        {t('dest.showing')} <span className="text-on-surface font-bold">{filteredTours.length} {t('dest.tours')}</span> {t('dest.available')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-outline font-medium whitespace-nowrap">{t('dest.sortBy')}</span>
                                    <div className="relative w-full sm:w-auto">
                                        <select 
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="bg-surface-container-low border-none rounded-lg pl-4 pr-10 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20 appearance-none w-full cursor-pointer outline-none"
                                        >
                                            <option value="recommended">{t('dest.recommended')}</option>
                                            <option value="priceLowHigh">{t('dest.priceLowHigh')}</option>
                                            <option value="priceHighLow">{t('dest.priceHighLow')}</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tour Grid */}
                            {isLoading ? (
                                <div className="text-center text-xl text-primary font-bold py-10">{t('dest.loadingData')}</div>
                            ) : filteredTours.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {filteredTours.map((tour: any) => (
                                        <article key={tour.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden editorial-shadow group transition-all duration-300 hover:-translate-y-1">
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
                                                            {formatPrice(tour.price)}
                                                        </span>
                                                    </div>
                                                    <Link href={`/tour/${tour.id}`} className="bg-surface-container-high hover:bg-primary hover:text-white text-primary px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 text-center">
                                                        {t('dest.viewDetails')}
                                                    </Link>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-surface-container-lowest rounded-2xl">
                                    <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
                                    <p className="font-bold text-on-surface">{t('dest.noMatch')}</p>
                                </div>
                            )}

                            {/* Pagination */}
                            <div className="mt-16 flex items-center justify-center space-x-2">
                                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface hover:bg-primary hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-white font-bold transition-all duration-300 shadow-md">1</button>
                                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface font-bold hover:bg-surface-container-high transition-all duration-300">2</button>
                                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-primary hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default function DestinationsWrapper() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading data...</div>}>
            <DestinationsContent />
        </Suspense>
    );
}
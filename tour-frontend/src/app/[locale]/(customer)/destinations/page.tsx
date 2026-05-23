'use client';

import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import FilterSidebar from '@/components/destinations/FilterSidebar';
import TourCard from '@/components/destinations/TourCard';
import Pagination from '@/components/destinations/Pagination';
import { API_BASE_URL } from '@/lib/constants';

type TravelScope = '' | 'DOMESTIC' | 'INTERNATIONAL';

interface DestinationOption {
    id: number;
    name: string;
    imageUrl?: string | null;
    region?: string | null;
    travelScope?: Exclude<TravelScope, ''>;
    countryCode?: string | null;
}

interface TourListItem {
    id: number;
    name: string;
    price: number;
    imageUrl?: string | null;
    duration?: string | null;
    averageRating?: number | null;
    reviewCount?: number | null;
    _count?: {
        reviews?: number;
    };
    departures?: { price?: number | null }[];
    [key: string]: unknown;
}

interface AppliedFilters {
    travelScope: TravelScope;
    dest: string;
    date: string;
    sidebarBudget: string;
    selectedRatings: number[];
    selectedTypes: string[];
}

const normalizeTravelScope = (value: string | null): TravelScope =>
    value === 'DOMESTIC' || value === 'INTERNATIONAL' ? value : '';

function DestinationsContent() {
    const searchParams = useSearchParams();
    const { t, formatPrice, language } = useLocale();

    // 1. Nhận tham số từ trang chủ truyền sang
    const initialDest = searchParams.get('dest') || '';
    const initialDate = searchParams.get('date') || '';
    const initialBudget = searchParams.get('budget') || '';
    const initialTravelScope = normalizeTravelScope(searchParams.get('travelScope'));
    const initialAllDestinations = searchParams.get('allDestinations') === '1' && !initialDest;

    // 2. State cho thanh tìm kiếm
    const [dest, setDest] = useState(initialDest);
    const [isAllDestinationsSelected, setIsAllDestinationsSelected] = useState(initialAllDestinations);
    const [date, setDate] = useState(initialDate);
    const [travelScope, setTravelScope] = useState<TravelScope>(initialTravelScope);

    // 3. State lưu dữ liệu API
    const [filteredTours, setFilteredTours] = useState<TourListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadedTours, setHasLoadedTours] = useState(false);

    // 4. State cho bộ lọc sidebar
    const [sidebarBudget, setSidebarBudget] = useState(initialBudget);
    const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
        travelScope: initialTravelScope,
        dest: initialDest,
        date: initialDate,
        sidebarBudget: initialBudget,
        selectedRatings: [],
        selectedTypes: [],
    });
    const [showMobileFilter, setShowMobileFilter] = useState(false);
    const [sortBy, setSortBy] = useState('recommended');

    // 4b. Dynamic data
    const [allDestinations, setAllDestinations] = useState<DestinationOption[]>([]);
    const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });

    // 5. State Phân trang
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit, setLimit] = useState(12);

    const buildQueryString = () => {
        const query = new URLSearchParams();
        if (appliedFilters.travelScope) query.append('travelScope', appliedFilters.travelScope);
        if (appliedFilters.dest) query.append('dest', appliedFilters.dest);
        if (appliedFilters.date) query.append('date', appliedFilters.date);
        if (appliedFilters.sidebarBudget && appliedFilters.sidebarBudget !== 'unlimited') {
            const parts = appliedFilters.sidebarBudget.split('-');
            if (parts.length === 2) {
                query.append('minPrice', parts[0]);
                query.append('maxPrice', parts[1]);
            } else {
                query.append('minPrice', appliedFilters.sidebarBudget);
            }
        }
        if (appliedFilters.selectedRatings.length > 0) {
            query.append('ratings', appliedFilters.selectedRatings.join(','));
        }
        if (appliedFilters.selectedTypes.length > 0) {
            query.append('types', appliedFilters.selectedTypes.join(','));
        }
        query.append('sortBy', sortBy);
        query.append('page', page.toString());
        query.append('limit', limit.toString());
        query.append('locale', language);
        return query.toString();
    };
    const queryString = buildQueryString();

    // 6. Gọi API lấy Tour
    useEffect(() => {
        const controller = new AbortController();
        const fetchTours = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tour?${queryString}`, { signal: controller.signal });
            const json = await res.json();
            if (json.data) {
                setFilteredTours(json.data);
                setTotalPages(json.meta?.totalPages || 1);
                setTotalItems(json.meta?.totalItems || 0);
            } else {
                setFilteredTours(Array.isArray(json) ? json : []);
                setTotalItems(Array.isArray(json) ? json.length : 0);
            }
            setHasLoadedTours(true);
        } catch (error) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                console.error('Lỗi lấy danh sách tour:', error);
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
            }
        }
        };
        fetchTours();
        return () => controller.abort();
    }, [queryString]);

    // 6b. Fetch destinations & price range on mount
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const destinationParams = new URLSearchParams({ locale: language });
                if (travelScope) destinationParams.set('travelScope', travelScope);
                const destUrl = `${API_BASE_URL}/search/destinations?${destinationParams.toString()}`;
                const [destRes, priceRes] = await Promise.all([
                    fetch(destUrl),
                    fetch(`${API_BASE_URL}/search/price-range`),
                ]);
                const destJson = await destRes.json();
                const priceJson = await priceRes.json();
                setAllDestinations(destJson.data || destJson);
                setPriceRange(priceJson.data || priceJson);
            } catch (error) {
                console.error('Lỗi fetch dữ liệu filter:', error);
            }
        };
        fetchFilterData();
    }, [travelScope, language]);

    // 7. Toggle star rating
    const toggleRating = (rating: number) => {
        setSelectedRatings(prev => prev.includes(rating) ? [] : [rating]);
    };

    // 8. Toggle tour type
    const toggleType = (type: string) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    // 9. Clear all filters
    const handleClearAll = () => {
        setTravelScope('');
        setDest('');
        setIsAllDestinationsSelected(false);
        setDate('');
        setSidebarBudget('');
        setSelectedRatings([]);
        setSelectedTypes([]);
    };

    // 10. Apply sidebar filters
    const handleApplyFilters = () => {
        setAppliedFilters({
            travelScope,
            dest,
            date,
            sidebarBudget,
            selectedRatings,
            selectedTypes,
        });
        setPage(1);
        setShowMobileFilter(false);
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };

    // Đếm tổng bộ lọc đang active
    const activeFilterCount = selectedRatings.length + selectedTypes.length + (sidebarBudget ? 1 : 0) + (dest ? 1 : 0) + (date ? 1 : 0) + (travelScope ? 1 : 0);
    const totalTourCount = totalItems || filteredTours.length;
    const resultSummary =
        language === 'vi'
            ? `Tìm thấy tổng cộng ${totalTourCount} tour`
            : `Found ${totalTourCount} tours in total`;
    const visibleSummary =
        language === 'vi'
            ? `Đang hiển thị ${filteredTours.length} tour trên trang này`
            : `Showing ${filteredTours.length} tours on this page`;
    const showInitialLoading = isLoading && !hasLoadedTours;
    const showRefetchOverlay = isLoading && hasLoadedTours;

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
                            <Image
                                alt="Travel background"
                                className="object-cover"
                                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=2000"
                                fill
                                sizes="100vw"
                                preload
                                loading="eager"
                            />
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
                        {showMobileFilter && (
                            <div className="mt-4">
                                <FilterSidebar
                                    travelScope={travelScope} setTravelScope={setTravelScope}
                                    dest={dest} setDest={setDest}
                                    isAllDestinationsSelected={isAllDestinationsSelected}
                                    setIsAllDestinationsSelected={setIsAllDestinationsSelected}
                                    date={date} setDate={setDate}
                                    sidebarBudget={sidebarBudget} setSidebarBudget={setSidebarBudget}
                                    selectedRatings={selectedRatings} toggleRating={toggleRating}
                                    selectedTypes={selectedTypes} toggleType={toggleType}
                                    onClearAll={handleClearAll} onApplyFilters={handleApplyFilters}
                                    activeFilterCount={activeFilterCount}
                                    priceRange={priceRange} allDestinations={allDestinations}
                                    t={t} formatPrice={formatPrice} language={language}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                        {/* Desktop Sidebar Filter */}
                        <aside className="hidden lg:block lg:col-span-3">
                            <div className="sticky top-28">
                                <FilterSidebar
                                    travelScope={travelScope} setTravelScope={setTravelScope}
                                    dest={dest} setDest={setDest}
                                    isAllDestinationsSelected={isAllDestinationsSelected}
                                    setIsAllDestinationsSelected={setIsAllDestinationsSelected}
                                    date={date} setDate={setDate}
                                    sidebarBudget={sidebarBudget} setSidebarBudget={setSidebarBudget}
                                    selectedRatings={selectedRatings} toggleRating={toggleRating}
                                    selectedTypes={selectedTypes} toggleType={toggleType}
                                    onClearAll={handleClearAll} onApplyFilters={handleApplyFilters}
                                    activeFilterCount={activeFilterCount}
                                    priceRange={priceRange} allDestinations={allDestinations}
                                    t={t} formatPrice={formatPrice} language={language}
                                />
                            </div>
                        </aside>

                        {/* Right Content Area: Tour Grid */}
                        <section className="lg:col-span-9">
                            {/* Top Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                <div>
                                    <p className="text-on-surface-variant font-medium">
                                        <span className="text-on-surface font-bold">{resultSummary}</span>
                                    </p>
                                    {totalTourCount > filteredTours.length && (
                                        <p className="mt-1 text-xs font-medium text-outline">{visibleSummary}</p>
                                    )}
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
                            <div className="relative min-h-[420px]">
                            {showInitialLoading ? (
                                <div className="text-center text-xl text-primary font-bold py-10">{t('dest.loadingData')}</div>
                            ) : filteredTours.length > 0 ? (
                                <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 transition-opacity duration-200 ${showRefetchOverlay ? 'opacity-55 pointer-events-none' : 'opacity-100'}`}>
                                    {filteredTours.map((tour) => (
                                        <TourCard key={tour.id} tour={tour} t={t} formatPrice={formatPrice} />
                                    ))}
                                </div>
                            ) : (
                                <div className={`text-center py-20 bg-surface-container-lowest rounded-2xl transition-opacity duration-200 ${showRefetchOverlay ? 'opacity-55' : 'opacity-100'}`}>
                                    <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
                                    <p className="font-bold text-on-surface">{t('dest.noMatch')}</p>
                                </div>
                            )}
                            {showRefetchOverlay && (
                                <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2 pointer-events-none">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-primary shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5">
                                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                        {language === 'vi' ? 'Đang cập nhật kết quả' : 'Updating results'}
                                    </div>
                                </div>
                            )}
                            </div>

                            <Pagination 
                                page={page} 
                                totalPages={totalPages} 
                                setPage={setPage} 
                                totalItems={totalItems}
                                limit={limit}
                                setLimit={setLimit}
                            />
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

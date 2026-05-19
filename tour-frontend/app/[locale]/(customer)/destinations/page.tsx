'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { useLocale } from '@/app/context/LocaleContext';
import FilterSidebar from '@/app/components/destinations/FilterSidebar';
import TourCard from '@/app/components/destinations/TourCard';
import Pagination from '@/app/components/destinations/Pagination';
import { getTranslatedTour } from '@/app/lib/mockTranslations';
import { API_BASE_URL } from '@/app/lib/constants';

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
    [key: string]: unknown;
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

    // 2. State cho thanh tìm kiếm
    const [dest, setDest] = useState(initialDest);
    const [date, setDate] = useState(initialDate);
    const [travelScope, setTravelScope] = useState<TravelScope>(initialTravelScope);

    // 3. State lưu dữ liệu API
    const [filteredTours, setFilteredTours] = useState<TourListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 4. State cho bộ lọc sidebar
    const [sidebarBudget, setSidebarBudget] = useState(initialBudget);
    const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
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
        if (travelScope) query.append('travelScope', travelScope);
        if (dest) query.append('dest', dest);
        if (date) query.append('date', date);
        if (sidebarBudget && sidebarBudget !== 'unlimited') {
            const parts = sidebarBudget.split('-');
            if (parts.length === 2) {
                query.append('minPrice', parts[0]);
                query.append('maxPrice', parts[1]);
            } else {
                query.append('minPrice', sidebarBudget);
            }
        }
        if (selectedRatings.length > 0) {
            query.append('ratings', selectedRatings.join(','));
        }
        if (selectedTypes.length > 0) {
            query.append('types', selectedTypes.join(','));
        }
        query.append('sortBy', sortBy);
        query.append('page', page.toString());
        query.append('limit', limit.toString());
        return query.toString();
    };

    // 6. Gọi API lấy Tour
    const fetchTours = async () => {
        setIsLoading(true);
        try {
            const qs = buildQueryString();
            const res = await fetch(`${API_BASE_URL}/tour?${qs}`);
            const json = await res.json();
            if (json.data) {
                setFilteredTours(json.data);
                setTotalPages(json.meta?.totalPages || 1);
                setTotalItems(json.meta?.totalItems || 0);
            } else {
                setFilteredTours(Array.isArray(json) ? json : []);
                setTotalItems(Array.isArray(json) ? json.length : 0);
            }
        } catch (error) {
            console.error('Lỗi lấy danh sách tour:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTours();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, sortBy, limit]);

    // 6b. Fetch destinations & price range on mount
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const destUrl = travelScope
                    ? `${API_BASE_URL}/search/destinations?travelScope=${travelScope}`
                    : `${API_BASE_URL}/search/destinations`;
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
    }, [travelScope]);

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
        setTravelScope('');
        setDest('');
        setDate('');
        setSidebarBudget('');
        setSelectedRatings([]);
        setSelectedTypes([]);
        setPage(1);
    };

    // 10. Apply sidebar filters
    const handleApplyFilters = () => {
        setPage(1);
        fetchTours();
        setShowMobileFilter(false);
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
                        {showMobileFilter && (
                            <div className="mt-4">
                                <FilterSidebar
                                    travelScope={travelScope} setTravelScope={setTravelScope}
                                    dest={dest} setDest={setDest}
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
                            {isLoading ? (
                                <div className="text-center text-xl text-primary font-bold py-10">{t('dest.loadingData')}</div>
                            ) : filteredTours.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {filteredTours.map((tour) => (
                                        <TourCard key={tour.id} tour={getTranslatedTour(tour, language)} t={t} formatPrice={formatPrice} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-surface-container-lowest rounded-2xl">
                                    <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
                                    <p className="font-bold text-on-surface">{t('dest.noMatch')}</p>
                                </div>
                            )}

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

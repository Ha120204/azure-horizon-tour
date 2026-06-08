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
import { API_BASE_URL } from '@/lib/http/constants';

type TravelScope = '' | 'DOMESTIC' | 'INTERNATIONAL';
type HeroVisualKey = 'ALL' | 'DOMESTIC' | 'INTERNATIONAL';

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
    selectedRating: number;
    selectedTypes: string[];
    departure: string;
}

const normalizeTravelScope = (value: string | null): TravelScope =>
    value === 'DOMESTIC' || value === 'INTERNATIONAL' ? value : '';

const HERO_BACKDROPS: Record<HeroVisualKey, { src: string; alt: string }> = {
    ALL: {
        src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=2000',
        alt: 'Layered mountain valleys at sunrise',
    },
    DOMESTIC: {
        src: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=2000',
        alt: 'Limestone islands rising from a quiet Vietnamese bay',
    },
    INTERNATIONAL: {
        src: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&q=80&w=2000',
        alt: 'European mountain village beside a blue lake',
    },
};

function DestinationsContent() {
    const searchParams = useSearchParams();
    const { t, formatPrice, language } = useLocale();

    // 1. Nhận tham số từ trang chủ truyền sang
    const initialDest = searchParams.get('dest') || '';
    const initialDate = searchParams.get('date') || '';
    const initialBudget = searchParams.get('budget') || '';
    const initialTravelScope = normalizeTravelScope(searchParams.get('travelScope'));
    const initialAllDestinations = searchParams.get('allDestinations') === '1' && !initialDest;
    const initialDeparture = searchParams.get('departure') || '';

    // 2. State cho thanh tìm kiếm
    const [dest, setDest] = useState(initialDest);
    const [isAllDestinationsSelected, setIsAllDestinationsSelected] = useState(initialAllDestinations);
    const [date, setDate] = useState(initialDate);
    const [travelScope, setTravelScope] = useState<TravelScope>(initialTravelScope);

    // 3. State lưu dữ liệu API
    const [filteredTours, setFilteredTours] = useState<TourListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadedTours, setHasLoadedTours] = useState(false);
    const [resultRevision, setResultRevision] = useState(0);

    // 4. State cho bộ lọc sidebar
    const [sidebarBudget, setSidebarBudget] = useState(initialBudget);
    const [selectedRating, setSelectedRating] = useState<number>(0);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [departure, setDeparture] = useState(initialDeparture);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
        travelScope: initialTravelScope,
        dest: initialDest,
        date: initialDate,
        sidebarBudget: initialBudget,
        selectedRating: 0,
        selectedTypes: [],
        departure: initialDeparture,
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
        if (appliedFilters.selectedRating > 0) {
            query.append('minRating', appliedFilters.selectedRating.toString());
        }
        if (appliedFilters.selectedTypes.length > 0) {
            query.append('types', appliedFilters.selectedTypes.join(','));
        }
        if (appliedFilters.departure) {
            query.append('departure', appliedFilters.departure);
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
            setResultRevision((revision) => revision + 1);
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

    // 7. Set rating threshold (single-select, 0 = no filter)
    const setRating = (rating: number) => {
        setSelectedRating(rating);
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
        setSelectedRating(0);
        setSelectedTypes([]);
        setDeparture('');
    };

    // 10. Apply sidebar filters
    const handleApplyFilters = () => {
        setAppliedFilters({
            travelScope,
            dest,
            date,
            sidebarBudget,
            selectedRating,
            selectedTypes,
            departure,
        });
        setPage(1);
        setShowMobileFilter(false);
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };

    // Đếm tổng bộ lọc đang active
    const activeFilterCount = (selectedRating > 0 ? 1 : 0) + selectedTypes.length + (sidebarBudget ? 1 : 0) + (dest ? 1 : 0) + (date ? 1 : 0) + (travelScope ? 1 : 0) + (departure ? 1 : 0);
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
    const heroVisualKey: HeroVisualKey = travelScope || 'ALL';

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }

                @keyframes destination-rise {
                    from {
                        opacity: 0;
                        transform: translate3d(0, 24px, 0);
                    }
                    to {
                        opacity: 1;
                        transform: translate3d(0, 0, 0);
                    }
                }

                @keyframes destination-panel-rise {
                    from {
                        opacity: 0;
                        transform: translate3d(0, 18px, 0) scale(0.99);
                    }
                    to {
                        opacity: 1;
                        transform: translate3d(0, 0, 0) scale(1);
                    }
                }

                @keyframes destination-mobile-filter {
                    from {
                        opacity: 0;
                        transform: translate3d(0, -8px, 0) scale(0.985);
                    }
                    to {
                        opacity: 1;
                        transform: translate3d(0, 0, 0) scale(1);
                    }
                }

                .destination-hero-bg {
                    opacity: 0;
                    transform: scale(1.035);
                    transition: opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
                }

                .destination-hero-bg.is-active {
                    opacity: 1;
                    transform: scale(1);
                }

                .destination-enter {
                    animation: destination-rise 0.72s cubic-bezier(0.16, 1, 0.3, 1) both;
                }

                .destination-panel-enter {
                    animation: destination-panel-rise 0.62s cubic-bezier(0.16, 1, 0.3, 1) both;
                }

                .destination-card-enter {
                    animation: destination-panel-rise 0.58s cubic-bezier(0.16, 1, 0.3, 1) both;
                }

                .destination-filter-enter {
                    animation: destination-mobile-filter 0.34s cubic-bezier(0.16, 1, 0.3, 1) both;
                    transform-origin: top center;
                }

                .destination-d1 { animation-delay: 80ms; }
                .destination-d2 { animation-delay: 180ms; }
                .destination-d3 { animation-delay: 300ms; }
                .destination-d4 { animation-delay: 420ms; }

                @media (prefers-reduced-motion: reduce) {
                    .destination-hero-bg,
                    .destination-enter,
                    .destination-panel-enter,
                    .destination-card-enter,
                    .destination-filter-enter {
                        animation: none !important;
                        opacity: 1 !important;
                        transform: none !important;
                        transition: none !important;
                    }
                }
            `}} />

            <Header />

            <main className="pt-28 pb-20 flex-grow">
                {/* Hero Section */}
                <section className="px-4 md:px-8 max-w-screen-2xl mx-auto mb-16">
                    <div className="relative min-h-[360px] overflow-hidden rounded-3xl bg-slate-950 p-6 text-center shadow-2xl shadow-slate-900/10 md:min-h-[420px] md:p-12">
                        <div className="absolute inset-0">
                            {(Object.entries(HERO_BACKDROPS) as [HeroVisualKey, { src: string; alt: string }][]).map(([key, image]) => (
                                <Image
                                    key={key}
                                    alt={image.alt}
                                    className={`destination-hero-bg object-cover ${heroVisualKey === key ? 'is-active' : ''}`}
                                    src={image.src}
                                    fill
                                    sizes="100vw"
                                    preload={heroVisualKey === key}
                                    loading={heroVisualKey === key ? 'eager' : 'lazy'}
                                />
                            ))}
                        </div>
                        <div
                            className="absolute inset-0"
                            style={{ background: 'linear-gradient(to bottom, rgba(0,31,71,0.70) 0%, rgba(0,63,135,0.30) 48%, rgba(0,35,78,0.76) 100%)' }}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white/10" />
                        <div className="relative z-10 mx-auto flex min-h-[312px] w-full max-w-4xl flex-col items-center justify-center md:min-h-[360px]">
                            <span className="destination-enter destination-d1 mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {activeFilterCount > 0
                                    ? `${activeFilterCount} ${t('filter.active')}`
                                    : t('hero.badge')}
                            </span>
                            <h1 className="destination-enter destination-d2 font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-2xl">{t('dest.heroTitle')}</h1>
                            <p className="destination-enter destination-d3 text-base md:text-lg text-white/90 font-medium max-w-2xl mx-auto leading-relaxed">
                                {t('dest.heroSubtitle')}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Main Content Area */}
                <div className="px-4 md:px-8 max-w-screen-2xl mx-auto">
                    {/* Mobile Filter Toggle */}
                    <div className="destination-panel-enter destination-d1 lg:hidden mb-6">
                        <button
                            onClick={() => setShowMobileFilter(!showMobileFilter)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15 font-semibold text-sm text-on-surface active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/20 hover:shadow-lg hover:shadow-slate-900/5 motion-reduce:transform-none"
                        >
                            <span className="material-symbols-outlined text-primary text-lg">tune</span>
                            {showMobileFilter ? t('filter.hide') : t('filter.show')}
                            {activeFilterCount > 0 && (
                                <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>
                            )}
                        </button>
                        {showMobileFilter && (
                            <div className="destination-filter-enter mt-4">
                                <FilterSidebar
                                    travelScope={travelScope} setTravelScope={setTravelScope}
                                    dest={dest} setDest={setDest}
                                    isAllDestinationsSelected={isAllDestinationsSelected}
                                    setIsAllDestinationsSelected={setIsAllDestinationsSelected}
                                    date={date} setDate={setDate}
                                    sidebarBudget={sidebarBudget} setSidebarBudget={setSidebarBudget}
                                    selectedRating={selectedRating} setRating={setRating}
                                    selectedTypes={selectedTypes} toggleType={toggleType}
                                    onClearAll={handleClearAll} onApplyFilters={handleApplyFilters}
                                    activeFilterCount={activeFilterCount}
                                    priceRange={priceRange} allDestinations={allDestinations}
                                    departure={departure} setDeparture={setDeparture}
                                    t={t} formatPrice={formatPrice} language={language}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                        {/* Desktop Sidebar Filter */}
                        <aside className="hidden lg:block lg:col-span-3">
                            <div className="destination-panel-enter destination-d1 sticky top-28">
                                <FilterSidebar
                                    travelScope={travelScope} setTravelScope={setTravelScope}
                                    dest={dest} setDest={setDest}
                                    isAllDestinationsSelected={isAllDestinationsSelected}
                                    setIsAllDestinationsSelected={setIsAllDestinationsSelected}
                                    date={date} setDate={setDate}
                                    sidebarBudget={sidebarBudget} setSidebarBudget={setSidebarBudget}
                                    selectedRating={selectedRating} setRating={setRating}
                                    selectedTypes={selectedTypes} toggleType={toggleType}
                                    onClearAll={handleClearAll} onApplyFilters={handleApplyFilters}
                                    activeFilterCount={activeFilterCount}
                                    priceRange={priceRange} allDestinations={allDestinations}
                                    departure={departure} setDeparture={setDeparture}
                                    t={t} formatPrice={formatPrice} language={language}
                                />
                            </div>
                        </aside>

                        {/* Right Content Area: Tour Grid */}
                        <section className="lg:col-span-9">
                            {/* Top Bar */}
                            <div className="destination-panel-enter destination-d2 flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
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
                                            className="bg-surface-container-low border-none rounded-lg pl-4 pr-10 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20 appearance-none w-full cursor-pointer outline-none transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-container-high active:scale-[0.98] motion-reduce:transform-none"
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
                                <div className="destination-panel-enter text-center text-xl text-primary font-bold py-10">{t('dest.loadingData')}</div>
                            ) : filteredTours.length > 0 ? (
                                <div key={resultRevision} className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 transition-opacity duration-200 ${showRefetchOverlay ? 'opacity-55 pointer-events-none' : 'opacity-100'}`}>
                                    {filteredTours.map((tour, index) => (
                                        <TourCard key={tour.id} tour={tour} t={t} formatPrice={formatPrice} index={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className={`destination-panel-enter text-center py-20 bg-surface-container-lowest rounded-2xl transition-opacity duration-200 ${showRefetchOverlay ? 'opacity-55' : 'opacity-100'}`}>
                                    <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
                                    <p className="font-bold text-on-surface">{t('dest.noMatch')}</p>
                                </div>
                            )}
                            {showRefetchOverlay && (
                                <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2 pointer-events-none">
                                    <div className="destination-filter-enter inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-primary shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5">
                                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                        {language === 'vi' ? 'Đang cập nhật kết quả' : 'Updating results'}
                                    </div>
                                </div>
                            )}
                            </div>

                            <div className="destination-panel-enter destination-d4">
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    setPage={setPage}
                                    totalItems={totalItems}
                                    limit={limit}
                                    setLimit={setLimit}
                                />
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

'use client';

import { Suspense, useRef } from 'react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import FilterSidebar from '@/components/destinations/FilterSidebar';
import TourCard from '@/components/destinations/TourCard';
import Pagination from '@/components/destinations/Pagination';
import SortDropdown from '@/components/destinations/SortDropdown';
import { useDestinationTours } from '../_hooks/useDestinationTours';

type HeroVisualKey = 'ALL' | 'DOMESTIC' | 'INTERNATIONAL';

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
    const { t, formatPrice, language } = useLocale();
    const {
        dest, setDest,
        isAllDestinationsSelected, setIsAllDestinationsSelected,
        date, setDate,
        travelScope, setTravelScope,
        sidebarBudget, setSidebarBudget,
        selectedRating, setRating,
        selectedTypes, toggleType,
        departure, setDeparture,
        sortBy, setSortBy,
        showMobileFilter, setShowMobileFilter,
        page, setPage,
        totalPages,
        totalItems,
        limit, setLimit,
        filteredTours,
        allDestinations,
        resultRevision,
        hasError,
        showInitialLoading,
        showRefetchOverlay,
        retry,
        activeFilterCount,
        appliedFilterCount,
        hasPendingChanges,
        handleClearAll,
        handleApplyFilters,
    } = useDestinationTours(language);

    const totalTourCount = totalItems || filteredTours.length;
    const resultSummary = t('dest.resultSummary', { count: totalTourCount });
    const visibleSummary = t('dest.visibleSummary', { count: filteredTours.length });
    const heroVisualKey: HeroVisualKey = travelScope || 'ALL';
    const sortOptions = [
        { value: 'recommended', label: t('dest.recommended') },
        { value: 'priceLowHigh', label: t('dest.priceLowHigh') },
        { value: 'priceHighLow', label: t('dest.priceHighLow') },
    ];

    const contentTopRef = useRef<HTMLDivElement>(null);
    const scrollToResults = () => {
        requestAnimationFrame(() => {
            contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };
    const handleApply = () => {
        handleApplyFilters();
        scrollToResults();
    };
    const handleSortChange = (value: string) => {
        setSortBy(value);
        scrollToResults();
    };

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
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
                                {appliedFilterCount > 0
                                    ? `${appliedFilterCount} ${t('filter.active')}`
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
                <div ref={contentTopRef} className="px-4 md:px-8 max-w-screen-2xl mx-auto scroll-mt-28">
                    {/* Mobile Filter Toggle */}
                    <div className="destination-panel-enter destination-d1 lg:hidden mb-6">
                        <button
                            onClick={() => setShowMobileFilter(!showMobileFilter)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15 font-semibold text-sm text-on-surface active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/20 hover:shadow-lg hover:shadow-slate-900/5 motion-reduce:transform-none"
                        >
                            <span className="material-symbols-outlined text-primary text-lg">tune</span>
                            {showMobileFilter ? t('filter.hide') : t('filter.show')}
                            {appliedFilterCount > 0 && (
                                <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{appliedFilterCount}</span>
                            )}
                            {hasPendingChanges && (
                                <span className="ml-0.5 h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
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
                                    onClearAll={handleClearAll} onApplyFilters={handleApply}
                                    activeFilterCount={activeFilterCount}
                                    hasPendingChanges={hasPendingChanges}
                                    allDestinations={allDestinations}
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
                                    onClearAll={handleClearAll} onApplyFilters={handleApply}
                                    activeFilterCount={activeFilterCount}
                                    hasPendingChanges={hasPendingChanges}
                                    allDestinations={allDestinations}
                                    departure={departure} setDeparture={setDeparture}
                                    t={t} formatPrice={formatPrice} language={language}
                                />
                            </div>
                        </aside>

                        {/* Right Content Area: Tour Grid */}
                        <section className="lg:col-span-9">
                            {/* Top Bar */}
                            <div className="destination-panel-enter destination-d2 relative z-20 flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                {!hasError && (
                                    <div>
                                        <p className="text-on-surface-variant font-medium">
                                            <span className="text-on-surface font-bold">{resultSummary}</span>
                                        </p>
                                        {totalTourCount > filteredTours.length && (
                                            <p className="mt-1 text-xs font-medium text-outline">{visibleSummary}</p>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-outline font-medium whitespace-nowrap">{t('dest.sortBy')}</span>
                                    <SortDropdown value={sortBy} options={sortOptions} onChange={handleSortChange} />
                                </div>
                            </div>

                            {/* Tour Grid */}
                            <div className="relative min-h-[420px]">
                            {showInitialLoading ? (
                                <div className="destination-panel-enter text-center text-xl text-primary font-bold py-10">{t('dest.loadingData')}</div>
                            ) : hasError ? (
                                <div className="destination-panel-enter text-center py-20 bg-surface-container-lowest rounded-2xl">
                                    <span className="material-symbols-outlined text-4xl text-error mb-2">error</span>
                                    <p className="font-bold text-on-surface">{t('dest.loadError')}</p>
                                    <button
                                        onClick={retry}
                                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                                        {t('dest.retry')}
                                    </button>
                                </div>
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
                                        {t('dest.updatingResults')}
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
                                    onNavigate={scrollToResults}
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

function DestinationsClientFallback() {
    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />
            <main className="pt-28 pb-20 flex-grow px-4 md:px-8 max-w-screen-2xl mx-auto w-full" aria-busy="true">
                <div className="h-[360px] animate-pulse rounded-3xl bg-slate-200 mb-16 md:min-h-[420px]" />
                <div className="flex gap-8">
                    <div className="hidden lg:block w-68 flex-shrink-0 space-y-4">
                        {['h-8', 'h-40', 'h-32', 'h-24', 'h-28'].map((heightClass, i) => (
                            <div key={i} className={`animate-pulse rounded-2xl bg-slate-200 ${heightClass}`} />
                        ))}
                    </div>
                    <div className="flex-1 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-outline-variant/10 bg-white overflow-hidden shadow-sm">
                                <div className="animate-pulse h-52 w-full bg-slate-200" />
                                <div className="p-4 space-y-3">
                                    <div className="animate-pulse h-5 w-4/5 rounded-xl bg-slate-200" />
                                    <div className="animate-pulse h-4 w-3/5 rounded-xl bg-slate-200" />
                                    <div className="flex items-center justify-between pt-1">
                                        <div className="animate-pulse h-6 w-24 rounded-xl bg-slate-200" />
                                        <div className="animate-pulse h-9 w-28 rounded-lg bg-slate-200" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function DestinationsClient() {
    return (
        <Suspense fallback={<DestinationsClientFallback />}>
            <DestinationsContent />
        </Suspense>
    );
}

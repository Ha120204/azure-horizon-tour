'use client';

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/http/constants';
import { getDestinationDisplay, getDestinationDisplayName } from '@/lib/tour/formatDestination';
import { TOUR_TYPE_OPTIONS } from '@/lib/tour/tourTypes';
import DatePickerDropdown from '@/components/search/DatePickerDropdown';

type TravelScope = '' | 'DOMESTIC' | 'INTERNATIONAL';

interface DestinationOption {
    id: number;
    name: string;
    imageUrl?: string | null;
    region?: string | null;
    travelScope?: Exclude<TravelScope, ''>;
    countryCode?: string | null;
}

interface FilterSidebarProps {
    travelScope: TravelScope;
    setTravelScope: (v: TravelScope) => void;
    dest: string;
    setDest: (v: string) => void;
    isAllDestinationsSelected: boolean;
    setIsAllDestinationsSelected: (v: boolean) => void;
    date: string;
    setDate: (v: string) => void;
    sidebarBudget: string;
    setSidebarBudget: (v: string) => void;
    selectedRating: number;
    setRating: (r: number) => void;
    selectedTypes: string[];
    toggleType: (t: string) => void;
    onClearAll: () => void;
    onApplyFilters: () => void;
    activeFilterCount: number;
    hasPendingChanges: boolean;
    allDestinations: DestinationOption[];
    // Departure filter
    departure: string;
    setDeparture: (v: string) => void;
    t: (key: string) => string;
    formatPrice: (price: number) => string;
    language: string;
}

const normalizeSearchText = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

export default function FilterSidebar({
    travelScope, setTravelScope,
    dest, setDest,
    isAllDestinationsSelected, setIsAllDestinationsSelected,
    date, setDate,
    sidebarBudget, setSidebarBudget,
    selectedRating, setRating,
    selectedTypes, toggleType,
    onClearAll, onApplyFilters,
    activeFilterCount,
    hasPendingChanges,
    allDestinations,
    departure, setDeparture,
    t, formatPrice, language,
}: FilterSidebarProps) {
    const [sidebarSuggestions, setSidebarSuggestions] = useState<DestinationOption[]>([]);
    const [isSidebarDestFocused, setIsSidebarDestFocused] = useState(false);
    const sidebarDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const sidebarAbortRef = useRef<AbortController | null>(null);
    const sidebarDestRef = useRef<HTMLDivElement>(null);
    const [departurePoints, setDeparturePoints] = useState<{ label: string; searchText?: string }[]>([]);
    const [isDepartureOpen, setIsDepartureOpen] = useState(false);
    const departureRef = useRef<HTMLDivElement>(null);
    const departureInputRef = useRef<HTMLInputElement>(null);

    const handleSidebarDestChange = useCallback((value: string) => {
        setIsAllDestinationsSelected(false);
        setDest(value);
        if (sidebarDebounceRef.current) clearTimeout(sidebarDebounceRef.current);
        sidebarAbortRef.current?.abort();
        if (value.length < 2) {
            setSidebarSuggestions([]);
            return;
        }
        const controller = new AbortController();
        sidebarAbortRef.current = controller;
        sidebarDebounceRef.current = setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    q: value,
                    locale: language,
                });
                if (travelScope) params.set('travelScope', travelScope);
                const res = await fetch(`${API_BASE_URL}/search?${params.toString()}`, {
                    signal: controller.signal,
                });
                const json = await res.json();
                const data = json.data || json;
                setSidebarSuggestions(data.destinations || []);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
            }
        }, 300);
    }, [setDest, setIsAllDestinationsSelected, travelScope, language]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sidebarDestRef.current && !sidebarDestRef.current.contains(event.target as Node)) {
                setIsSidebarDestFocused(false);
            }
            if (departureRef.current && !departureRef.current.contains(event.target as Node)) {
                setIsDepartureOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch departure points
    useEffect(() => {
        const fetchDepartures = async () => {
            try {
                const params = new URLSearchParams({ locale: language });
                if (travelScope) params.set('travelScope', travelScope);
                const res = await fetch(`${API_BASE_URL}/search/departure-points?${params.toString()}`);
                const json = await res.json();
                setDeparturePoints(json.data || json);
            } catch { /* ignore */ }
        };
        fetchDepartures();
    }, [travelScope, language]);

    const filteredDeparturePoints = useMemo(() => {
        const query = normalizeSearchText(departure);
        if (!query) return departurePoints;
        return departurePoints.filter((pt) => {
            const labelNorm = normalizeSearchText(pt.label);
            if (labelNorm.includes(query)) return true;
            if (pt.searchText) return pt.searchText.includes(query);
            return false;
        });
    }, [departure, departurePoints]);

    const tourTypes = TOUR_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        icon: option.icon,
        label: t(option.labelKey),
        desc: t(option.descKey),
    }));
    const tripScopeOptions: { value: TravelScope; icon: string; label: string; desc: string }[] = [
        { value: '', icon: 'travel_explore', label: t('filter.allTrips'), desc: t('filter.tripScope_allDesc') },
        { value: 'DOMESTIC', icon: 'home_pin', label: t('search.domestic'), desc: t('filter.tripScope_domesticDesc') },
        { value: 'INTERNATIONAL', icon: 'public', label: t('search.international'), desc: t('filter.tripScope_internationalDesc') },
    ];

    return (
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
                    onClick={onClearAll}
                    className="text-[11px] font-bold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-primary/5"
                >
                    {t('filter.clearAll')}
                </button>
            </div>

            {/* Trip Scope Section */}
            <div className="px-6 py-6 border-b border-outline-variant/10">
                <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">public</span>
                    {t('filter.tripScope')}
                </h3>
                <div className="space-y-2">
                    {tripScopeOptions.map((option) => {
                        const isActive = travelScope === option.value;
                        return (
                            <button
                                key={option.value || 'all'}
                                onClick={() => {
                                    setTravelScope(option.value);
                                    setDest('');
                                    setIsAllDestinationsSelected(false);
                                    setSidebarSuggestions([]);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 group active:scale-[0.98]
                                    ${isActive
                                        ? 'bg-primary/5 border-primary/25'
                                        : 'border-outline-variant/15 bg-white hover:border-primary/15'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                    ${isActive ? 'bg-primary/15' : 'bg-surface-container-low group-hover:bg-surface-container'}`}
                                >
                                    <span className={`material-symbols-outlined text-base ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{option.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-primary' : 'text-on-surface'}`}>{option.label}</p>
                                    <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">{option.desc}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                                    ${isActive ? 'bg-primary border-primary' : 'border-outline-variant/30'}`}
                                >
                                    {isActive && (
                                        <span className="material-symbols-outlined text-white text-xs font-bold">check</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Departure City Filter */}
            <div className="px-6 py-6 border-b border-outline-variant/10">
                <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">flight_takeoff</span>
                    {t('filter.departureCity')}
                </h3>
                <div ref={departureRef} className="relative">
                    <div
                        onClick={() => {
                            departureInputRef.current?.focus();
                            setIsDepartureOpen(true);
                        }}
                        className="w-full flex items-center justify-between bg-surface-container-low border border-outline-variant/15 rounded-xl px-4 py-3 text-sm font-medium focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 hover:bg-white transition-all cursor-text"
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="material-symbols-outlined text-outline text-[18px] flex-shrink-0">location_city</span>
                            <input
                                ref={departureInputRef}
                                type="text"
                                value={departure}
                                onChange={(e) => {
                                    setDeparture(e.target.value);
                                    setIsDepartureOpen(true);
                                }}
                                onFocus={() => setIsDepartureOpen(true)}
                                placeholder={t('filter.departurePlaceholder')}
                                className="min-w-0 flex-1 bg-transparent p-0 text-sm font-semibold text-on-surface outline-none placeholder:text-outline-variant"
                            />
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            {departure && (
                                <button
                                    type="button"
                                    className="w-5 h-5 flex items-center justify-center rounded-full bg-outline-variant/20 hover:bg-error/10 hover:text-error transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeparture('');
                                        setIsDepartureOpen(true);
                                        departureInputRef.current?.focus();
                                    }}
                                    aria-label={t('filter.departureClear')}
                                >
                                    <span className="material-symbols-outlined text-[13px]">close</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isDepartureOpen) departureInputRef.current?.focus();
                                    setIsDepartureOpen((open) => !open);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded-full text-outline hover:bg-outline-variant/15 transition-colors"
                                aria-label={isDepartureOpen ? t('filter.departureCloseList') : t('filter.departureOpenList')}
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {isDepartureOpen ? 'expand_less' : 'expand_more'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {isDepartureOpen && (
                        <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-[100] max-h-[240px] overflow-y-auto">
                            {/* All */}
                            <button
                                type="button"
                                onClick={() => { setDeparture(''); setIsDepartureOpen(false); }}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                                <span className="text-sm font-bold">{t('filter.allDepartureCities')}</span>
                            </button>
                            <div className="mx-3 my-1 border-t border-slate-100" />
                            {filteredDeparturePoints.map((pt, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => { setDeparture(pt.label); setIsDepartureOpen(false); }}
                                    className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${departure === pt.label ? 'text-primary bg-blue-50/50' : 'text-slate-600'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-400 text-[16px]">location_city</span>
                                        <span className="text-sm font-semibold">{pt.label}</span>
                                    </div>
                                    {departure === pt.label && <span className="material-symbols-outlined text-[14px] text-primary">check</span>}
                                </button>
                            ))}
                            {filteredDeparturePoints.length === 0 && departure.trim() && (
                                <div className="px-4 py-4 text-center">
                                    <span className="material-symbols-outlined text-2xl text-slate-300">search_off</span>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">{t('filter.noSuggestions')}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">{t('filter.applyTypedKeyword')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="px-6 py-6 border-b border-outline-variant/10">
                <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">search</span>
                    {t('search.whereTo')}
                </h3>
                <div ref={sidebarDestRef} className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">location_on</span>
                    <input
                        className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-10 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-white transition-all placeholder:text-outline-variant outline-none"
                        placeholder={t('search.whereTo')}
                        type="text"
                        value={isAllDestinationsSelected ? t('search.allDestinations') : getDestinationDisplayName(dest, language)}
                        onChange={(e) => handleSidebarDestChange(e.target.value)}
                        onFocus={() => setIsSidebarDestFocused(true)}
                    />
                    {(dest || isAllDestinationsSelected) && (
                        <button
                            onClick={() => {
                                setDest('');
                                setIsAllDestinationsSelected(false);
                                setSidebarSuggestions([]);
                            }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-outline-variant/20 hover:bg-outline-variant/40 transition-colors text-on-surface-variant hover:text-on-surface"
                        >
                            <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                        </button>
                    )}

                    {isSidebarDestFocused && (() => {
                        const suggestions = dest.length >= 2 ? sidebarSuggestions : allDestinations;
                        return (
                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-[100] max-h-[260px] overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDest('');
                                        setIsAllDestinationsSelected(true);
                                        setSidebarSuggestions([]);
                                        setIsSidebarDestFocused(false);
                                    }}
                                    className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                        isAllDestinationsSelected ? 'bg-primary/5 text-primary' : 'hover:bg-slate-50 text-on-surface'
                                    }`}
                                >
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAllDestinationsSelected ? 'bg-primary/10' : 'bg-slate-100'}`}>
                                        <span className={`material-symbols-outlined text-sm ${isAllDestinationsSelected ? 'text-primary' : 'text-slate-400'}`}>travel_explore</span>
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="text-sm font-bold block">{t('search.allDestinations')}</span>
                                        <span className="text-[10px] text-slate-400">{t('search.allDestinationsDesc')}</span>
                                    </span>
                                    {isAllDestinationsSelected && <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>}
                                </button>
                                {suggestions.map((item) => {
                                    const display = getDestinationDisplay(item, language);
                                    return (
                                        <button
                                            type="button"
                                            key={item.id}
                                            onClick={() => { if (sidebarDebounceRef.current) clearTimeout(sidebarDebounceRef.current); sidebarAbortRef.current?.abort(); setSidebarSuggestions([]); setDest(display.name); setIsAllDestinationsSelected(false); setIsSidebarDestFocused(false); }}
                                            className="w-full px-3 py-2.5 hover:bg-slate-50 flex items-center gap-3 rounded-xl text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        >
                                            {item.imageUrl ? (
                                                <span className="relative w-8 h-8 rounded-md overflow-hidden bg-slate-100 shrink-0">
                                                    <Image src={item.imageUrl} alt={display.name} fill sizes="32px" unoptimized className="object-cover" />
                                                </span>
                                            ) : (
                                                <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-slate-400 text-sm">location_city</span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-sm font-bold text-primary block">{display.name}</span>
                                                {display.region && <span className="text-[10px] text-slate-400">{display.region}</span>}
                                            </div>
                                        </button>
                                    );
                                })}
                                {suggestions.length === 0 && dest.length >= 2 && (
                                    <div className="px-3 py-4 text-center">
                                        <span className="material-symbols-outlined text-2xl text-slate-300">search_off</span>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{t('search.noResults')}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Departure Date Section */}
            <div className="px-6 py-6 border-b border-outline-variant/10">
                <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                    {t('filter.departureDate')}
                </h3>
                <DatePickerDropdown
                    value={date}
                    onChange={setDate}
                    language={language}
                    placeholder="dd/mm/yyyy"
                    triggerId="filter-departure-date"
                    variant="field"
                    dropdownPlacement="bottom"
                    dropdownClassName="w-full"
                />
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
                    {(() => {
                        const options = [
                            { label: `${t('filter.priceUnder')} ${formatPrice(5000000)}`, value: '0-5000000' },
                            { label: `${formatPrice(5000000)} – ${formatPrice(10000000)}`, value: '5000000-10000000' },
                            { label: `${formatPrice(10000000)} – ${formatPrice(20000000)}`, value: '10000000-20000000' },
                            { label: `${t('filter.priceOver')} ${formatPrice(20000000)}`, value: '20000000-unlimited' },
                        ];
                        return options.map((option) => {
                            const isActive = sidebarBudget === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => setSidebarBudget(isActive ? '' : option.value)}
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
                        });
                    })()}
                </div>
            </div>

            {/* Star Rating Section */}
            <div className="px-6 py-6 border-b border-outline-variant/10">
                <h3 className="font-bold text-[11px] text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    {t('filter.ratingTitle')}
                </h3>
                <div className="space-y-2">
                    {([
                        { threshold: 4.5, filledStars: 5, label: t('filter.ratingExcellent'), sublabel: '4.5+' },
                        { threshold: 4.0, filledStars: 4, label: t('filter.ratingVeryGood'), sublabel: '4.0+' },
                        { threshold: 3.0, filledStars: 3, label: t('filter.ratingGood'),      sublabel: '3.0+' },
                    ] as { threshold: number; filledStars: number; label: string; sublabel: string }[]).map((opt) => {
                        const isActive = selectedRating === opt.threshold;
                        return (
                            <button
                                key={opt.threshold}
                                onClick={() => setRating(isActive ? 0 : opt.threshold)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 group active:scale-[0.98]
                                    ${isActive
                                        ? 'bg-primary/5 border-primary/25'
                                        : 'border-outline-variant/15 bg-white hover:border-primary/15'
                                    }`}
                            >
                                {/* Radio indicator */}
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                    ${isActive ? 'border-primary' : 'border-outline-variant/30 group-hover:border-primary/50'}`}>
                                    {isActive && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>

                                {/* Stars */}
                                <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <span
                                            key={i}
                                            className={`material-symbols-outlined text-[15px] ${
                                                i < opt.filledStars ? 'text-amber-400' : 'text-outline-variant/25'
                                            }`}
                                            style={{ fontVariationSettings: i < opt.filledStars ? "'FILL' 1" : "'FILL' 0" }}
                                        >star</span>
                                    ))}
                                </div>

                                {/* Label */}
                                <span className={`text-sm font-semibold leading-tight ${
                                    isActive ? 'text-primary' : 'text-on-surface'
                                }`}>
                                    {opt.label}
                                </span>

                                {/* Badge threshold */}
                                <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-surface-container text-on-surface-variant'
                                }`}>
                                    {opt.sublabel}
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
                    {tourTypes.map((type) => {
                        const isActive = selectedTypes.includes(type.value);
                        return (
                            <button
                                key={type.value}
                                onClick={() => toggleType(type.value)}
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
                {hasPendingChanges && (
                    <p className="mb-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {t('filter.pendingChanges')}
                    </p>
                )}
                <button
                    onClick={onApplyFilters}
                    className="group w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-white font-headline font-semibold rounded-xl shadow-md shadow-primary/15 transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                >
                    <span className="material-symbols-outlined text-lg transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:scale-110 motion-reduce:transform-none">filter_list</span>
                    {t('filter.apply')}
                </button>
            </div>
        </div>
    );
}

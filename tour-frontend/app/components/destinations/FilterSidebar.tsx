'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/app/lib/constants';
import { getDestinationDisplay, getDestinationDisplayName } from '@/app/lib/destinationDisplay';

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
    selectedRatings: number[];
    toggleRating: (r: number) => void;
    selectedTypes: string[];
    toggleType: (t: string) => void;
    onClearAll: () => void;
    onApplyFilters: () => void;
    activeFilterCount: number;
    priceRange: { min: number; max: number };
    allDestinations: DestinationOption[];
    t: (key: string) => string;
    formatPrice: (price: number) => string;
    language: string;
}

export default function FilterSidebar({
    travelScope, setTravelScope,
    dest, setDest,
    isAllDestinationsSelected, setIsAllDestinationsSelected,
    date, setDate,
    sidebarBudget, setSidebarBudget,
    selectedRatings, toggleRating,
    selectedTypes, toggleType,
    onClearAll, onApplyFilters,
    activeFilterCount,
    allDestinations,
    t, formatPrice, language,
}: FilterSidebarProps) {
    const [sidebarSuggestions, setSidebarSuggestions] = useState<DestinationOption[]>([]);
    const [isSidebarDestFocused, setIsSidebarDestFocused] = useState(false);
    const sidebarDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const sidebarDestRef = useRef<HTMLDivElement>(null);

    const handleSidebarDestChange = useCallback((value: string) => {
        setIsAllDestinationsSelected(false);
        setDest(value);
        if (sidebarDebounceRef.current) clearTimeout(sidebarDebounceRef.current);
        if (value.length < 2) {
            setSidebarSuggestions([]);
            return;
        }
        sidebarDebounceRef.current = setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    q: value,
                    locale: language,
                });
                if (travelScope) params.set('travelScope', travelScope);
                const res = await fetch(`${API_BASE_URL}/search?${params.toString()}`);
                const json = await res.json();
                const data = json.data || json;
                setSidebarSuggestions(data.destinations || []);
            } catch { /* ignore */ }
        }, 300);
    }, [setDest, setIsAllDestinationsSelected, travelScope, language]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sidebarDestRef.current && !sidebarDestRef.current.contains(event.target as Node)) {
                setIsSidebarDestFocused(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const tourTypes = [
        { value: 'Tour Gia Đình',    icon: 'family_restroom', label: t('filter.tourType_family'),    desc: t('filter.tourType_familyDesc') },
        { value: 'Tour Cao Cấp',     icon: 'diamond',         label: t('filter.tourType_premium'),   desc: t('filter.tourType_premiumDesc') },
        { value: 'Nghỉ Dưỡng',       icon: 'beach_access',    label: t('filter.tourType_resort'),    desc: t('filter.tourType_resortDesc') },
        { value: 'Khám Phá',         icon: 'hiking',          label: t('filter.tourType_adventure'), desc: t('filter.tourType_adventureDesc') },
        { value: 'Văn Hóa & Lịch Sử', icon: 'museum',         label: t('filter.tourType_culture'),   desc: t('filter.tourType_cultureDesc') },
        { value: 'Tour Ghép Đoàn',   icon: 'groups',          label: t('filter.tourType_group'),     desc: t('filter.tourType_groupDesc') },
    ];
    const tripScopeOptions: { value: TravelScope; icon: string; label: string; desc: string }[] = [
        { value: '', icon: 'travel_explore', label: t('filter.allTrips'), desc: language === 'vi' ? 'Hiển thị toàn bộ hành trình' : 'Show every available journey' },
        { value: 'DOMESTIC', icon: 'home_pin', label: t('search.domestic'), desc: language === 'vi' ? 'Tour khởi hành và trải nghiệm tại Việt Nam' : 'Journeys within Vietnam' },
        { value: 'INTERNATIONAL', icon: 'public', label: t('search.international'), desc: language === 'vi' ? 'Hành trình ra nước ngoài' : 'Journeys outside Vietnam' },
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

            {/* Search Section */}
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
                                            onClick={() => { setDest(display.name); setIsAllDestinationsSelected(false); setIsSidebarDestFocused(false); }}
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
                    {(() => {
                        const options = [
                            { label: `${language === 'vi' ? 'Dưới' : 'Under'} ${formatPrice(5000000)}`, value: '0-5000000' },
                            { label: `${formatPrice(5000000)} – ${formatPrice(10000000)}`, value: '5000000-10000000' },
                            { label: `${formatPrice(10000000)} – ${formatPrice(20000000)}`, value: '10000000-20000000' },
                            { label: `${language === 'vi' ? 'Trên' : 'Over'} ${formatPrice(20000000)}`, value: '20000000-unlimited' },
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
                                    {rating}.0
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
                <button
                    onClick={onApplyFilters}
                    className="w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-white font-headline font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/15 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">filter_list</span>
                    {t('filter.apply')}
                </button>
            </div>
        </div>
    );
}

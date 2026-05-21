'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/app/context/LocaleContext';
import { API_BASE_URL } from '@/app/lib/constants';
import { getDestinationDisplay } from '@/app/lib/destinationDisplay';

type TravelScope = 'DOMESTIC' | 'INTERNATIONAL';

// Kiểu dữ liệu từ API
interface Destination {
    id: number;
    name: string;
    imageUrl: string | null;
    region: string | null;
    travelScope?: TravelScope;
    countryCode?: string | null;
}

interface TourResult {
    id: number;
    name: string;
    price: number;
}

interface PriceRange {
    min: number;
    max: number;
}

interface HeroSearchProps {
    travelScope?: TravelScope;
    onTravelScopeChange?: (scope: TravelScope) => void;
}

export default function HeroSearch({ travelScope: controlledTravelScope, onTravelScopeChange }: HeroSearchProps = {}) {
    const router = useRouter();
    const { t, formatPrice, language } = useLocale();

    const [destination, setDestination] = useState('');
    const [isAllDestinationsSelected, setIsAllDestinationsSelected] = useState(false);
    const [internalTravelScope, setInternalTravelScope] = useState<TravelScope>('DOMESTIC');
    const travelScope = controlledTravelScope ?? internalTravelScope;

    // Mặc định ngày đi = ngày mai
    const getTomorrow = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };
    const [date, setDate] = useState(getTomorrow);

    // State riêng cho Budget
    const [budget, setBudget] = useState('');

    // State điều khiển đóng/mở Dropdown
    const [isDestFocused, setIsDestFocused] = useState(false);
    const [isBudgetOpen, setIsBudgetOpen] = useState(false);

    // Dữ liệu từ API
    const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
    const [searchDestinations, setSearchDestinations] = useState<Destination[]>([]);
    const [searchTours, setSearchTours] = useState<TourResult[]>([]);
    const [, setPriceRange] = useState<PriceRange>({ min: 0, max: 1000 });
    const [isSearching, setIsSearching] = useState(false);

    const destRef = useRef<HTMLDivElement>(null);
    const budgetRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // ═══ Fetch price range once ═══
    useEffect(() => {
        const fetchPriceRange = async () => {
            try {
                const priceRes = await fetch(`${API_BASE_URL}/search/price-range`);
                const priceJson = await priceRes.json();
                setPriceRange(priceJson.data || priceJson);
            } catch (error) {
                console.error('Lỗi fetch dữ liệu search:', error);
            }
        };
        fetchPriceRange();
    }, []);

    // ═══ Fetch destinations by trip scope ═══
    useEffect(() => {
        const fetchDestinations = async () => {
            try {
                const params = new URLSearchParams({
                    travelScope,
                    locale: language,
                });
                const res = await fetch(`${API_BASE_URL}/search/destinations?${params.toString()}`);
                const json = await res.json();
                setAllDestinations(json.data || json);
            } catch (error) {
                console.error('Lỗi fetch điểm đến:', error);
            }
        };
        fetchDestinations();
    }, [travelScope, language]);

    // ═══ Live search — gọi API khi user gõ (debounce 300ms) ═══
    const performSearch = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchDestinations([]);
            setSearchTours([]);
            return;
        }
        setIsSearching(true);
        try {
            const params = new URLSearchParams({
                q: query,
                travelScope,
                locale: language,
            });
            const res = await fetch(`${API_BASE_URL}/search?${params.toString()}`);
            const json = await res.json();
            const data = json.data || json;
            setSearchDestinations(data.destinations || []);
            setSearchTours(data.tours || []);
        } catch (error) {
            console.error('Lỗi tìm kiếm:', error);
        } finally {
            setIsSearching(false);
        }
    }, [travelScope, language]);

    const handleTravelScopeChange = (nextScope: TravelScope) => {
        if (nextScope === travelScope) return;
        setInternalTravelScope(nextScope);
        onTravelScopeChange?.(nextScope);
        setDestination('');
        setIsAllDestinationsSelected(false);
        setSearchDestinations([]);
        setSearchTours([]);
        setIsDestFocused(false);
    };

    const handleDestinationChange = (value: string) => {
        setDestination(value);
        setIsAllDestinationsSelected(false);
        // Debounce live search
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // ═══ Click outside đóng dropdown ═══
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (destRef.current && !destRef.current.contains(event.target as Node)) setIsDestFocused(false);
            if (budgetRef.current && !budgetRef.current.contains(event.target as Node)) setIsBudgetOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ═══ Chọn gợi ý ═══
    const handleSelectSuggestion = (name: string) => {
        setDestination(name);
        setIsAllDestinationsSelected(false);
        setIsDestFocused(false);
    };

    const handleSelectAllDestinations = () => {
        setDestination(t('search.allDestinations'));
        setIsAllDestinationsSelected(true);
        setSearchDestinations([]);
        setSearchTours([]);
        setIsDestFocused(false);
    };

    const handleSelectBudget = (value: string) => {
        setBudget(value);
        setIsBudgetOpen(false);
    };

    // ═══ Submit — BẮT BUỘC phải chọn điểm đến ═══
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAllDestinationsSelected && !destination.trim()) return;
        const params = new URLSearchParams();
        params.append('travelScope', travelScope);
        if (isAllDestinationsSelected) params.append('allDestinations', '1');
        if (!isAllDestinationsSelected && destination.trim()) params.append('dest', destination);
        if (date) params.append('date', date);
        if (budget) params.append('budget', budget);
        router.push(`/destinations?${params.toString()}`);
    };

    const canSearch = isAllDestinationsSelected || !!destination.trim();

    // ═══ Tính Budget Options từ price range thực ═══
    const generateBudgetOptions = () => {
        return [
            { label: `${language === 'vi' ? 'Dưới' : 'Under'} ${formatPrice(5000000)}`, value: '0-5000000' },
            { label: `${formatPrice(5000000)} – ${formatPrice(10000000)}`, value: '5000000-10000000' },
            { label: `${formatPrice(10000000)} – ${formatPrice(20000000)}`, value: '10000000-20000000' },
            { label: `${language === 'vi' ? 'Trên' : 'Over'} ${formatPrice(20000000)}`, value: '20000000-unlimited' },
        ];
    };

    const BUDGET_OPTIONS = generateBudgetOptions();

    // Dynamic label to correctly react to locale changes
    const currentBudgetLabel = budget ? BUDGET_OPTIONS.find(o => o.value === budget)?.label : '';

    // ═══ Quyết định hiển thị gì trong dropdown ═══
    // Nếu user chưa gõ gì: hiện tất cả destinations
    // Nếu user đã gõ: hiện kết quả search (destinations + tours)
    const hasSearchQuery = destination.length >= 2 && !isAllDestinationsSelected;
    const displayDestinations = hasSearchQuery ? searchDestinations : allDestinations;
    const displayTours = hasSearchQuery ? searchTours : [];
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const scopeOptions: { value: TravelScope; label: string; icon: string }[] = [
        { value: 'DOMESTIC', label: t('search.domestic'), icon: 'home_pin' },
        { value: 'INTERNATIONAL', label: t('search.international'), icon: 'public' },
    ];

    return (
        <div className="relative z-50 max-w-4xl mx-auto w-full">
            <div className="mb-3 flex justify-center">
                <div className="relative grid grid-cols-2 rounded-full bg-white/15 p-1 border border-white/20 backdrop-blur-md shadow-lg shadow-slate-950/10">
                    <span
                        aria-hidden="true"
                        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                            travelScope === 'INTERNATIONAL' ? 'translate-x-full' : 'translate-x-0'
                        }`}
                    />
                    {scopeOptions.map((option) => {
                        const active = travelScope === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => handleTravelScopeChange(option.value)}
                                className={`relative z-10 flex min-w-[7.25rem] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-[color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] motion-reduce:transition-none ${
                                    active
                                        ? 'text-primary'
                                        : 'text-white/80 hover:text-white'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[17px] transition-transform duration-300 motion-reduce:transition-none ${active ? 'scale-110' : 'scale-100'}`}>{option.icon}</span>
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        <form
            onSubmit={handleSearch}
            className="bg-white rounded-[2rem] md:rounded-full shadow-2xl flex flex-col md:flex-row items-center p-2 border border-slate-100 w-full"
        >
            {/* 1. Destination */}
            <div ref={destRef} className="flex-1 flex items-center gap-4 px-6 py-2 md:py-0 w-full hover:bg-slate-50 rounded-full transition-colors cursor-pointer group relative">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">location_on</span>
                <div className="flex flex-col flex-1 relative w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('search.destination')}</label>
                    <div className="flex items-center">
                        <input
                            type="text"
                            placeholder={t('search.whereTo')}
                            value={destination}
                            onChange={(e) => handleDestinationChange(e.target.value)}
                            onFocus={() => setIsDestFocused(true)}
                            className="bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 outline-none placeholder:text-slate-300 w-full truncate"
                        />
                        {destination && (
                            <button
                                type="button"
                                onClick={() => { setDestination(''); setIsAllDestinationsSelected(false); setSearchDestinations([]); setSearchTours([]); }}
                                aria-label={language === 'vi' ? 'Xóa điểm đến' : 'Clear destination'}
                                className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">cancel</span>
                            </button>
                        )}
                    </div>

                    {/* Hộp gợi ý Điểm đến */}
                    {isDestFocused && (
                        <div className="absolute top-[calc(100%+22px)] left-[-40px] md:left-0 w-[calc(100%+80px)] md:w-[430px] z-[100] animate-fade-in-up">
                            <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/20 ring-1 ring-slate-900/5">
                                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{t('search.destination')}</p>
                                    <p className="mt-1 text-xs font-medium text-slate-500">{t('search.destinationHint')}</p>
                                </div>
                                <div className="max-h-[360px] overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllDestinations}
                                        className={`mb-2 flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-blue-50/70 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                            isAllDestinationsSelected ? 'bg-blue-50 text-primary' : 'text-slate-700'
                                        }`}
                                    >
                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shadow-primary/20">
                                            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">travel_explore</span>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-extrabold">{t('search.allDestinations')}</span>
                                            <span className="mt-0.5 block text-xs font-medium text-slate-500">{t('search.allDestinationsDesc')}</span>
                                        </span>
                                        {isAllDestinationsSelected && (
                                            <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">check_circle</span>
                                        )}
                                    </button>
                            {/* Loading indicator */}
                            {isSearching && (
                                <div className="px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                    {language === 'vi' ? 'Đang tìm...' : 'Searching...'}
                                </div>
                            )}

                            {/* Destinations */}
                            {displayDestinations.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">{t('search.destinations')}</div>
                                    {displayDestinations.map(item => {
                                        const display = getDestinationDisplay(item, language);
                                        return (
                                            <button key={`dest-${item.id}`} type="button" onClick={() => handleSelectSuggestion(display.name)} className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                                {item.imageUrl ? (
                                                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm">
                                                        <Image
                                                            src={item.imageUrl}
                                                            alt={display.name}
                                                            fill
                                                            sizes="48px"
                                                            unoptimized
                                                            className="object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=100&q=80';
                                                            }}
                                                        />
                                                    </span>
                                                ) : (
                                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100"><span className="material-symbols-outlined text-slate-400">location_city</span></span>
                                                )}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-extrabold text-slate-800">{display.name}</span>
                                                    {display.region && <span className="text-[11px] text-slate-400">{display.region}</span>}
                                                </span>
                                                <span className="material-symbols-outlined text-[18px] text-slate-300" aria-hidden="true">arrow_forward</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Tours (chỉ khi đang search) */}
                            {displayTours.length > 0 && (
                                <div className="border-t border-slate-100 pt-2">
                                    <div className="px-3 pb-2 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">{t('search.attractions')}</div>
                                    {displayTours.map(item => {
                                        const displayName = item.name;
                                        return (
                                            <button key={`tour-${item.id}`} type="button" onClick={() => handleSelectSuggestion(item.name)} className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                                                    <span className="material-symbols-outlined text-slate-500 text-[20px]">pin_drop</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span
                                                        className="text-sm font-medium text-slate-600 truncate block"
                                                        dangerouslySetInnerHTML={{
                                                            __html: destination
                                                                ? displayName.replace(new RegExp(escapeRegExp(destination), 'gi'), (match: string) => `<span class="text-primary font-bold">${match}</span>`)
                                                                : displayName
                                                        }}
                                                    />
                                                    <span className="text-[11px] text-slate-400">{formatPrice(item.price)}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                                    {!isSearching && displayDestinations.length === 0 && displayTours.length === 0 && hasSearchQuery && (
                                        <div className="px-4 py-6 text-center">
                                            <span className="material-symbols-outlined text-3xl text-slate-300" aria-hidden="true">search_off</span>
                                            <p className="mt-2 text-sm font-bold text-slate-600">{t('search.noResults')}</p>
                                            <p className="mt-1 text-xs text-slate-400">{t('search.tryAllDestinations')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-slate-200"></div>

            {/* 2. Dates */}
            <div className="flex-1 flex items-center gap-4 px-6 py-2 md:py-0 w-full hover:bg-slate-50 rounded-full transition-colors cursor-pointer group">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">calendar_today</span>
                <div className="flex flex-col flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('search.dates')}</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 outline-none text-slate-500 w-full" />
                </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-slate-200"></div>

            {/* 3. Budget (CUSTOM DROPDOWN) */}
            <div ref={budgetRef} onClick={() => setIsBudgetOpen(!isBudgetOpen)} className="flex-1 flex items-center gap-4 px-6 py-2 md:py-0 w-full hover:bg-slate-50 rounded-full transition-colors cursor-pointer group relative">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">account_balance_wallet</span>
                <div className="flex flex-col flex-1 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('search.budget')}</label>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${currentBudgetLabel ? 'text-slate-800' : 'text-slate-300'}`}>
                            {currentBudgetLabel || t('search.selectBudget')}
                        </span>
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">
                            {isBudgetOpen ? 'expand_less' : 'expand_more'}
                        </span>
                    </div>
                </div>

                {/* Hộp thả xuống của Budget */}
                {isBudgetOpen && (
                    <div className="absolute top-[calc(100%+24px)] left-0 w-full md:w-[280px] bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[100] animate-fade-in-up">
                        {BUDGET_OPTIONS.map((opt, idx) => (
                            <div
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectBudget(opt.value);
                                }}
                                className={`px-5 py-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors ${budget === opt.value ? 'text-primary bg-blue-50/50' : 'text-slate-600'}`}
                            >
                                <span className="text-sm font-bold">{opt.label}</span>
                                {budget === opt.value && (
                                    <span className="material-symbols-outlined text-[18px] text-primary">check</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={!canSearch}
                className={`w-full md:w-auto mt-2 md:mt-0 rounded-full px-8 py-4 font-bold tracking-wide transition-all whitespace-nowrap shadow-md
                    ${canSearch
                        ? 'bg-primary text-white hover:bg-primary-container active:scale-95 shadow-primary/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
            >
                {t('search.searchPath')}
            </button>
        </form>
        </div>
    );
}

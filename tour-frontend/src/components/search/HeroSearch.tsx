'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/constants';
import { getDestinationDisplay } from '@/lib/formatDestination';
import DatePickerDropdown from './DatePickerDropdown';

type TravelScope = 'DOMESTIC' | 'INTERNATIONAL';

// Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
const removeAccents = (str: string) =>
    str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');

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

    // State cho Điểm khởi hành
    const [departure, setDeparture] = useState('');
    const [isAllDepartureSelected, setIsAllDepartureSelected] = useState(false);
    const [isDepartureOpen, setIsDepartureOpen] = useState(false);
    const [departurePoints, setDeparturePoints] = useState<{label:string}[]>([]);
    const departureRef = useRef<HTMLDivElement>(null);
    const departureInputRef = useRef<HTMLInputElement>(null);

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
    const destInputRef = useRef<HTMLInputElement>(null);
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

    // ═══ Fetch departure points by trip scope ═══
    useEffect(() => {
        const fetchDepartures = async () => {
            try {
                const params = new URLSearchParams({ travelScope, locale: language });
                const res = await fetch(`${API_BASE_URL}/search/departure-points?${params.toString()}`);
                const json = await res.json();
                setDeparturePoints(json.data || json);
            } catch (error) {
                console.error('Lỗi fetch điểm khởi hành:', error);
            }
        };
        fetchDepartures();
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
        setDeparture('');
        setIsAllDepartureSelected(false);
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
            if (departureRef.current && !departureRef.current.contains(event.target as Node)) setIsDepartureOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ═══ Chọn gợi ý ═══
    const handleSelectSuggestion = (name: string) => {
        setDestination(name);
        setIsAllDestinationsSelected(false);
        setIsDestFocused(false);
        // NOTE: Không clear departure — user được chọn cả 2 filter độc lập
    };

    const handleSelectAllDestinations = () => {
        setDestination(t('search.allDestinations'));
        setIsAllDestinationsSelected(true);
        setSearchDestinations([]);
        setSearchTours([]);
        setIsDestFocused(false);
        // NOTE: Không clear departure
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
        if (departure.trim()) params.append('departure', departure.trim());
        if (budget) params.append('budget', budget);
        router.push(`/destinations?${params.toString()}`);
    };

    const canSearch =
        (isAllDepartureSelected || !!departure.trim()) &&
        (isAllDestinationsSelected || !!destination.trim());

    // ═══ Tính Budget Options từ price range thực ═══
    const generateBudgetOptions = () => {
        return [
            {
                label: `${language === 'vi' ? 'Dưới' : 'Under'} ${formatPrice(5000000)}`,
                shortLabel: language === 'vi' ? 'Dưới 5M đ' : 'Under 5M',
                value: '0-5000000'
            },
            {
                label: `${formatPrice(5000000)} – ${formatPrice(10000000)}`,
                shortLabel: '5M – 10M đ',
                value: '5000000-10000000'
            },
            {
                label: `${formatPrice(10000000)} – ${formatPrice(20000000)}`,
                shortLabel: '10M – 20M đ',
                value: '10000000-20000000'
            },
            {
                label: `${language === 'vi' ? 'Trên' : 'Over'} ${formatPrice(20000000)}`,
                shortLabel: language === 'vi' ? 'Trên 20M đ' : 'Over 20M',
                value: '20000000-unlimited'
            },
        ];
    };

    const BUDGET_OPTIONS = generateBudgetOptions();

    // Dynamic label to correctly react to locale changes
    const currentBudgetLabel = budget ? BUDGET_OPTIONS.find(o => o.value === budget)?.label : '';
    // ═══ Quyết định hiển thị gì trong dropdown ═══
    // Nếu user chưa gõ gì: hiện tất cả destinations
    // Nếu user đã gõ: hiện kết quả search (destinations + tours)
    const hasSearchQuery = destination.length >= 2 && !isAllDestinationsSelected;
    // Filter ra các destination không hợp lệ (tên null, rỗng, hoặc "Chưa xác định")
    const INVALID_DEST_NAMES = ['chưa xác định', 'chua xac dinh', 'unknown', 'không xác định', ''];
    const filterValidDestinations = (list: Destination[]) =>
        list.filter(d => {
            const name = (d.name || '').trim().toLowerCase();
            return name.length > 0 && !INVALID_DEST_NAMES.includes(name);
        });
    const displayDestinations = hasSearchQuery
        ? filterValidDestinations(searchDestinations)
        : filterValidDestinations(allDestinations);
    const displayTours = hasSearchQuery ? searchTours : [];
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const scopeOptions: { value: TravelScope; label: string; icon: string }[] = [
        { value: 'DOMESTIC', label: t('search.domestic'), icon: 'home_pin' },
        { value: 'INTERNATIONAL', label: t('search.international'), icon: 'public' },
    ];

    return (
        <div className="relative z-50 max-w-7xl mx-auto w-full">
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
                                className={`group relative z-10 flex min-w-[7.25rem] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-[color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${
                                    active
                                        ? 'text-primary shadow-sm'
                                        : 'text-white/80 hover:text-white'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[17px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${active ? 'scale-110' : 'scale-100'}`}>{option.icon}</span>
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        <form
            onSubmit={handleSearch}
            className="bg-white rounded-[2rem] md:rounded-full shadow-2xl flex flex-col md:grid md:grid-cols-[230px_1px_1fr_1px_200px_1px_260px_auto] items-center p-2 border border-slate-100 w-full"
        >
            {/* 0. Điểm khởi hành */}
            <div ref={departureRef} className="flex items-center gap-3 px-4 py-2 md:py-0 w-full rounded-full transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-900/5 cursor-pointer group relative motion-reduce:transform-none motion-reduce:transition-none" onClick={() => { departureInputRef.current?.focus(); setIsDepartureOpen(true); }}>
                <span className="material-symbols-outlined text-primary group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex-shrink-0 motion-reduce:transform-none">flight_takeoff</span>
                <div className="flex flex-col min-w-0 flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">
                        {language === 'vi' ? 'Khởi hành từ' : 'Departure'}
                    </label>
                    <div className="flex items-center gap-1">
                        {isAllDepartureSelected ? (
                            <>
                                <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                    <span className="material-symbols-outlined text-[14px] flex-shrink-0">travel_explore</span>
                                    {language === 'vi' ? 'Tất cả điểm' : 'All cities'}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setDeparture(''); setIsAllDepartureSelected(false); setIsDepartureOpen(false); }}
                                    aria-label={language === 'vi' ? 'Xóa bộ lọc khởi hành' : 'Clear departure filter'}
                                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-[color,transform,background-color] duration-200 hover:scale-110 hover:bg-slate-200 hover:text-slate-600 active:scale-95 motion-reduce:transform-none"
                                >
                                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <input
                                    ref={departureInputRef}
                                    type="text"
                                    placeholder={language === 'vi' ? 'Chọn điểm khởi hành' : 'Select departure'}
                                    value={departure}
                                    onChange={(e) => { setDeparture(e.target.value); setIsDepartureOpen(true); }}
                                    onFocus={() => setIsDepartureOpen(true)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 outline-none placeholder:text-slate-300 truncate flex-1 min-w-0 text-center"
                                />
                                {departure && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setDeparture(''); setIsAllDepartureSelected(false); setIsDepartureOpen(false); }}
                                        aria-label={language === 'vi' ? 'Xóa điểm khởi hành' : 'Clear departure'}
                                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-[color,transform,background-color] duration-200 hover:scale-110 hover:bg-slate-200 hover:text-slate-600 active:scale-95 motion-reduce:transform-none"
                                    >
                                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
                {/* Departure dropdown — styled like Destination */}
                {isDepartureOpen && (
                    <div
                        className="absolute top-[calc(100%+24px)] left-0 w-full md:w-[400px] z-[100] animate-fade-in-up"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/20 ring-1 ring-slate-900/5">
                            {/* Header */}
                            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                                    {language === 'vi' ? 'Khởi hành từ' : 'Departure'}
                                </p>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                    {language === 'vi'
                                        ? 'Chọn thành phố xuất phát hoặc tìm kiếm tất cả.'
                                        : 'Select a departure city or search all.'}
                                </p>
                            </div>

                            <div className="max-h-[360px] overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                                {/* Option: Tất cả điểm khởi hành */}
                                <button
                                    type="button"
                                    onClick={() => { setDeparture(''); setIsAllDepartureSelected(true); setIsDepartureOpen(false); }}
                                    className={`group mb-2 flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-blue-50/70 hover:shadow-sm active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transform-none ${
                                        isAllDepartureSelected && !departure ? 'bg-blue-50 text-primary' : 'text-slate-700'
                                    }`}
                                >
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shadow-primary/20">
                                        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">travel_explore</span>
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-extrabold">
                                            {language === 'vi' ? 'Tất cả điểm khởi hành' : 'All departure cities'}
                                        </span>
                                        <span className="mt-0.5 block text-xs font-medium text-slate-500">
                                            {language === 'vi' ? 'Không giới hạn điểm xuất phát.' : 'No departure city filter.'}
                                        </span>
                                    </span>
                                    {isAllDepartureSelected && !departure && (
                                        <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">check_circle</span>
                                    )}
                                </button>

                                {/* Danh sách thành phố */}
                                {(() => {
                                    const filtered = departurePoints.filter(pt =>
                                        !departure || removeAccents(pt.label.toLowerCase()).includes(removeAccents(departure.toLowerCase()))
                                    );
                                    return filtered.length > 0 ? (
                                        <div>
                                            <div className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">
                                                {language === 'vi' ? 'Thành phố khởi hành' : 'Departure cities'}
                                            </div>
                                            {filtered.map((pt, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => { setDeparture(pt.label); setIsAllDepartureSelected(false); setIsDepartureOpen(false); }}
                                                    className={`group flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transform-none ${
                                                        departure === pt.label ? 'text-primary bg-blue-50/70' : 'text-slate-700'
                                                    }`}
                                                >
                                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                                                        <span className="material-symbols-outlined text-slate-400 text-[20px]">location_city</span>
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-extrabold" dangerouslySetInnerHTML={{ __html: departure ? pt.label.replace(new RegExp(escapeRegExp(departure), 'gi'), (m: string) => `<span class="text-primary">${m}</span>`) : pt.label }} />
                                                    </span>
                                                    {departure === pt.label && (
                                                        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">check_circle</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : departure && !isAllDepartureSelected ? (
                                        <div className="px-4 py-6 text-center">
                                            <span className="material-symbols-outlined text-3xl text-slate-300">search_off</span>
                                            <p className="mt-2 text-sm font-bold text-slate-600">{language === 'vi' ? 'Không tìm thấy thành phố' : 'No city found'}</p>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Divider col-span in grid: tự render là 1px column */}
            <div className="hidden md:block w-px h-10 bg-slate-200"></div>

            {/* 1. Destination */}
            <div ref={destRef} className="flex items-center gap-3 px-4 py-2 md:py-0 w-full rounded-full transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-900/5 cursor-pointer group relative min-w-0 motion-reduce:transform-none motion-reduce:transition-none" onClick={() => { destInputRef.current?.focus(); setIsDestFocused(true); }}>
                <span className="material-symbols-outlined text-primary group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] text-[18px] flex-shrink-0 motion-reduce:transform-none">location_on</span>

                <div className="flex flex-col flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 text-center w-full">{t('search.destination')}</label>
                    <div className="flex items-center justify-center gap-2 min-w-0 w-full">
                        {isAllDestinationsSelected ? (
                            <>
                                <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                    <span className="material-symbols-outlined text-[14px] flex-shrink-0">travel_explore</span>
                                    {language === 'vi' ? 'Tất cả điểm' : 'All cities'}
                                </span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setDestination(''); setIsAllDestinationsSelected(false); }} aria-label="Xóa điểm đến" className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-[color,transform,background-color] duration-200 hover:scale-110 hover:bg-slate-200 hover:text-slate-600 active:scale-95 motion-reduce:transform-none">
                                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <input
                                    ref={destInputRef}
                                    type="text"
                                    placeholder={t('search.whereTo')}
                                    value={destination}
                                    onChange={(e) => handleDestinationChange(e.target.value)}
                                    onFocus={() => setIsDestFocused(true)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 outline-none placeholder:text-slate-300 text-center flex-1 min-w-0 max-w-[160px]"
                                />
                                {destination && (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setDestination(''); setSearchDestinations([]); setSearchTours([]); }} aria-label="Xóa điểm đến" className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-[color,transform,background-color] duration-200 hover:scale-110 hover:bg-slate-200 hover:text-slate-600 active:scale-95 motion-reduce:transform-none">
                                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Dropdown — direct child of relative destRef, NOT inside inner div */}
                {isDestFocused && (
                    <div className="absolute top-full left-0 mt-3 w-[430px] z-[200] animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/20 ring-1 ring-slate-900/5">
                            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{t('search.destination')}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">{t('search.destinationHint')}</p>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                                <button type="button" onClick={handleSelectAllDestinations} className={`group mb-2 flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-blue-50/70 hover:shadow-sm active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transform-none ${isAllDestinationsSelected ? 'bg-blue-50 text-primary' : 'text-slate-700'}`}>
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shadow-primary/20">
                                        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">travel_explore</span>
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-extrabold">{t('search.allDestinations')}</span>
                                        <span className="mt-0.5 block text-xs font-medium text-slate-500">{t('search.allDestinationsDesc')}</span>
                                    </span>
                                    {isAllDestinationsSelected && <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">check_circle</span>}
                                </button>

                                {isSearching && (
                                    <div className="px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                        {language === 'vi' ? 'Đang tìm...' : 'Searching...'}
                                    </div>
                                )}

                                {displayDestinations.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">{t('search.destinations')}</div>
                                        {displayDestinations.map(item => {
                                            const display = getDestinationDisplay(item, language);
                                            return (
                                                <button key={`dest-${item.id}`} type="button" onClick={() => handleSelectSuggestion(display.name)} className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transform-none">
                                                    {item.imageUrl ? (
                                                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm">
                                                            <Image src={item.imageUrl} alt={display.name} fill sizes="48px" unoptimized className="object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=100&q=80'; }} />
                                                        </span>
                                                    ) : (
                                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100"><span className="material-symbols-outlined text-slate-400">location_city</span></span>
                                                    )}
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-extrabold text-slate-800">{display.name}</span>
                                                        {display.region && <span className="text-[11px] text-slate-400">{display.region}</span>}
                                                    </span>
                                                    <span className="material-symbols-outlined text-[18px] text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transform-none" aria-hidden="true">arrow_forward</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {displayTours.length > 0 && (
                                    <div className="border-t border-slate-100 pt-2">
                                        <div className="px-3 pb-2 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">{t('search.attractions')}</div>
                                        {displayTours.map(item => (
                                            <button key={`tour-${item.id}`} type="button" onClick={() => handleSelectSuggestion(item.name)} className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transform-none">
                                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                                                    <span className="material-symbols-outlined text-slate-500 text-[20px]">pin_drop</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium text-slate-600 truncate block" dangerouslySetInnerHTML={{ __html: destination ? item.name.replace(new RegExp(escapeRegExp(destination), 'gi'), (m: string) => `<span class="text-primary font-bold">${m}</span>`) : item.name }} />
                                                    <span className="text-[11px] text-slate-400">{formatPrice(item.price)}</span>
                                                </div>
                                            </button>
                                        ))}
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



            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-slate-200"></div>

            {/* 2. Dates */}
            <div className="flex items-center gap-3 px-4 py-2 md:py-0 w-full rounded-full transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-900/5 cursor-pointer group motion-reduce:transform-none motion-reduce:transition-none" onClick={() => { const btn = document.getElementById('date-picker-trigger'); btn?.click(); }}>
                <span className="material-symbols-outlined text-primary group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] text-[18px] flex-shrink-0 motion-reduce:transform-none">calendar_today</span>
                <div className="flex flex-col flex-1 min-w-0">
                    <DatePickerDropdown
                        value={date}
                        onChange={setDate}
                        language={language}
                        label={t('search.dates')}
                        placeholder={language === 'vi' ? 'Chọn ngày đi' : 'Select date'}
                        triggerId="date-picker-trigger"
                    />
                </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-slate-200"></div>

            {/* 3. Budget (CUSTOM DROPDOWN) */}
            <div ref={budgetRef} onClick={() => setIsBudgetOpen(!isBudgetOpen)} className="flex items-center gap-3 px-4 py-2 md:py-0 w-full rounded-full transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-900/5 cursor-pointer group relative motion-reduce:transform-none motion-reduce:transition-none">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex-shrink-0 motion-reduce:transform-none">account_balance_wallet</span>
                <div className="flex flex-col flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">{t('search.budget')}</label>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-bold truncate flex-1 text-center ${currentBudgetLabel ? 'text-slate-800' : 'text-slate-300'}`}>
                            {currentBudgetLabel || t('search.selectBudget')}
                        </span>
                        {budget && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setBudget(''); setIsBudgetOpen(false); }}
                                aria-label={language === 'vi' ? 'Xóa ngân sách' : 'Clear budget'}
                                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-[color,transform,background-color] duration-200 hover:scale-110 hover:bg-slate-200 hover:text-slate-600 active:scale-95 motion-reduce:transform-none"
                            >
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                            </button>
                        )}
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
                                className={`px-5 py-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-1 active:translate-x-0 motion-reduce:transform-none ${budget === opt.value ? 'text-primary bg-blue-50/50' : 'text-slate-600'}`}
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
                className={`group w-full md:w-auto mt-2 md:mt-0 inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-bold tracking-wide transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] whitespace-nowrap shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    ${canSearch
                        ? 'bg-primary text-white hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.97] shadow-primary/20 motion-reduce:transform-none'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
            >
                <span>{t('search.searchPath')}</span>
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${canSearch ? 'group-hover:translate-x-1' : ''} motion-reduce:transform-none`} aria-hidden="true">arrow_forward</span>
            </button>
        </form>
        </div>
    );
}

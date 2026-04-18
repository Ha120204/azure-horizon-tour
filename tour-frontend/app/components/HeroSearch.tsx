'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/app/context/LocaleContext';

// Kiểu dữ liệu từ API
interface Destination {
    id: number;
    name: string;
    imageUrl: string | null;
    region: string | null;
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

export default function HeroSearch() {
    const router = useRouter();
    const { t, formatPrice, language } = useLocale();

    const [destination, setDestination] = useState('');

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
    const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 1000 });
    const [isSearching, setIsSearching] = useState(false);

    const destRef = useRef<HTMLDivElement>(null);
    const budgetRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // ═══ Fetch dữ liệu lần đầu khi mount ═══
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [destRes, priceRes] = await Promise.all([
                    fetch('http://localhost:3000/search/destinations'),
                    fetch('http://localhost:3000/search/price-range'),
                ]);
                const destJson = await destRes.json();
                const priceJson = await priceRes.json();

                // API có thể bọc trong { data: ... } từ TransformInterceptor
                setAllDestinations(destJson.data || destJson);
                setPriceRange(priceJson.data || priceJson);
            } catch (error) {
                console.error('Lỗi fetch dữ liệu search:', error);
            }
        };
        fetchInitialData();
    }, []);

    // ═══ Live search — gọi API khi user gõ (debounce 300ms) ═══
    const performSearch = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchDestinations([]);
            setSearchTours([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`);
            const json = await res.json();
            const data = json.data || json;
            setSearchDestinations(data.destinations || []);
            setSearchTours(data.tours || []);
        } catch (error) {
            console.error('Lỗi tìm kiếm:', error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleDestinationChange = (value: string) => {
        setDestination(value);
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
        setIsDestFocused(false);
    };

    const handleSelectBudget = (value: string) => {
        setBudget(value);
        setIsBudgetOpen(false);
    };

    // ═══ Submit — BẮT BUỘC phải chọn điểm đến ═══
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!destination.trim()) return;
        const params = new URLSearchParams();
        params.append('dest', destination);
        if (date) params.append('date', date);
        if (budget) params.append('budget', budget);
        router.push(`/destinations?${params.toString()}`);
    };

    const canSearch = !!destination.trim();

    // ═══ Tính Budget Options từ price range thực ═══
    const generateBudgetOptions = () => {
        const { min, max } = priceRange;
        if (max <= 0) return [];

        // Chia khoảng giá thành 4 tier đều nhau (USD)
        const step = Math.ceil(max / 4);
        const tier1 = step;
        const tier2 = step * 2;
        const tier3 = step * 3;

        return [
            { label: `${formatPrice(min)} – ${formatPrice(tier1)}`, value: `${min}-${tier1}` },
            { label: `${formatPrice(tier1)} – ${formatPrice(tier2)}`, value: `${tier1}-${tier2}` },
            { label: `${formatPrice(tier2)} – ${formatPrice(tier3)}`, value: `${tier2}-${tier3}` },
            { label: `${formatPrice(tier3)}+`, value: `${tier3}-unlimited` },
        ];
    };

    const BUDGET_OPTIONS = generateBudgetOptions();

    // Dynamic label to correctly react to locale changes
    const currentBudgetLabel = budget ? BUDGET_OPTIONS.find(o => o.value === budget)?.label : '';

    // ═══ Quyết định hiển thị gì trong dropdown ═══
    // Nếu user chưa gõ gì: hiện tất cả destinations
    // Nếu user đã gõ: hiện kết quả search (destinations + tours)
    const hasSearchQuery = destination.length >= 2;
    const displayDestinations = hasSearchQuery ? searchDestinations : allDestinations;
    const displayTours = hasSearchQuery ? searchTours : [];

    return (
        <form
            onSubmit={handleSearch}
            className="bg-white rounded-full shadow-2xl flex flex-col md:flex-row items-center p-2 border border-slate-100 max-w-4xl mx-auto w-full relative z-50"
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
                            <span onClick={() => { setDestination(''); setSearchDestinations([]); setSearchTours([]); }} className="material-symbols-outlined text-[16px] text-slate-400 hover:text-slate-600 cursor-pointer ml-2 bg-slate-100 rounded-full">
                                cancel
                            </span>
                        )}
                    </div>

                    {/* Hộp gợi ý Điểm đến */}
                    {isDestFocused && (displayDestinations.length > 0 || displayTours.length > 0) && (
                        <div className="absolute top-[calc(100%+24px)] left-[-40px] md:left-0 w-[calc(100%+80px)] md:w-[400px] bg-white rounded-2xl shadow-xl border border-slate-100 py-4 z-[100] animate-fade-in-up max-h-[360px] overflow-y-auto">
                            {/* Loading indicator */}
                            {isSearching && (
                                <div className="px-5 py-2 text-sm text-slate-400 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                    {language === 'vi' ? 'Đang tìm...' : 'Searching...'}
                                </div>
                            )}

                            {/* Destinations */}
                            {displayDestinations.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('search.destinations')}</div>
                                    {displayDestinations.map(item => (
                                        <div key={`dest-${item.id}`} onClick={() => handleSelectSuggestion(item.name)} className="px-5 py-2.5 hover:bg-slate-50 flex items-center gap-4 cursor-pointer transition-colors">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-slate-400">location_city</span></div>
                                            )}
                                            <div>
                                                <span className="text-sm font-bold text-primary block">{item.name}</span>
                                                {item.region && <span className="text-[11px] text-slate-400">{item.region}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tours (chỉ khi đang search) */}
                            {displayTours.length > 0 && (
                                <div className="border-t border-slate-100 pt-2">
                                    <div className="px-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('search.attractions')}</div>
                                    {displayTours.map(item => (
                                        <div key={`tour-${item.id}`} onClick={() => handleSelectSuggestion(item.name)} className="px-5 py-2.5 hover:bg-slate-50 flex items-center gap-4 cursor-pointer transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                                                <span className="material-symbols-outlined text-slate-500 text-[20px]">pin_drop</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span
                                                    className="text-sm font-medium text-slate-600 truncate block"
                                                    dangerouslySetInnerHTML={{
                                                        __html: destination
                                                            ? item.name.replace(new RegExp(destination, 'gi'), (match) => `<span class="text-primary font-bold">${match}</span>`)
                                                            : item.name
                                                    }}
                                                />
                                                <span className="text-[11px] text-slate-400">{formatPrice(item.price)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
    );
}
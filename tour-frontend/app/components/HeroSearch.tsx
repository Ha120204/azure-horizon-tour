'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SUGGESTED_DESTINATIONS = [
    { id: 1, name: 'Đà Nẵng', type: 'Điểm đến', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&q=80&w=100' },
    { id: 2, name: 'Hạ Long', type: 'Điểm đến', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=100' },
    { id: 3, name: 'Lễ hội pháo hoa quốc tế Đà Nẵng (DIFF)', type: 'Điểm tham quan' },
    { id: 4, name: 'Paris', type: 'Điểm đến', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=100' },
    { id: 5, name: 'Kyoto', type: 'Điểm đến', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=100' }
];

const BUDGET_OPTIONS = [
    { label: 'Từ $5,000+', value: '5000' },
    { label: 'Từ $10,000+', value: '10000' },
    { label: 'Từ $25,000+', value: '25000' },
    { label: 'Không giới hạn', value: 'unlimited' }
];

export default function HeroSearch() {
    const router = useRouter();

    const [destination, setDestination] = useState('');
    const [date, setDate] = useState('');

    // State riêng cho Budget
    const [budget, setBudget] = useState('');
    const [budgetLabel, setBudgetLabel] = useState('');

    // State điều khiển đóng/mở Dropdown
    const [isDestFocused, setIsDestFocused] = useState(false);
    const [isBudgetOpen, setIsBudgetOpen] = useState(false);

    const destRef = useRef<HTMLDivElement>(null);
    const budgetRef = useRef<HTMLDivElement>(null);

    const filteredSuggestions = SUGGESTED_DESTINATIONS.filter(item =>
        item.name.toLowerCase().includes(destination.toLowerCase())
    );

    const destSuggestions = filteredSuggestions.filter(item => item.type === 'Điểm đến');
    const attractionSuggestions = filteredSuggestions.filter(item => item.type === 'Điểm tham quan');

    // Tự động đóng Dropdown khi click ra vùng viền
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (destRef.current && !destRef.current.contains(event.target as Node)) setIsDestFocused(false);
            if (budgetRef.current && !budgetRef.current.contains(event.target as Node)) setIsBudgetOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectSuggestion = (name: string) => {
        setDestination(name);
        setIsDestFocused(false);
    };

    const handleSelectBudget = (value: string, label: string) => {
        setBudget(value);
        setBudgetLabel(label);
        setIsBudgetOpen(false); // Chọn xong thì tự động đóng lại
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (destination) params.append('dest', destination);
        if (date) params.append('date', date);
        if (budget) params.append('budget', budget);
        router.push(`/destinations?${params.toString()}`);
    };

    return (
        <form
            onSubmit={handleSearch}
            className="bg-white rounded-full shadow-2xl flex flex-col md:flex-row items-center p-2 border border-slate-100 max-w-4xl mx-auto w-full relative z-50"
        >
            {/* 1. Destination */}
            <div ref={destRef} className="flex-1 flex items-center gap-4 px-6 py-2 md:py-0 w-full hover:bg-slate-50 rounded-full transition-colors cursor-pointer group relative">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">location_on</span>
                <div className="flex flex-col flex-1 relative w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Destination</label>
                    <div className="flex items-center">
                        <input
                            type="text"
                            placeholder="Where to?"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            onFocus={() => setIsDestFocused(true)}
                            className="bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 outline-none placeholder:text-slate-300 w-full truncate"
                        />
                        {destination && (
                            <span onClick={() => setDestination('')} className="material-symbols-outlined text-[16px] text-slate-400 hover:text-slate-600 cursor-pointer ml-2 bg-slate-100 rounded-full">
                                cancel
                            </span>
                        )}
                    </div>

                    {/* Hộp gợi ý Điểm đến (Sửa z-index siêu cao) */}
                    {isDestFocused && destination && filteredSuggestions.length > 0 && (
                        <div className="absolute top-[calc(100%+24px)] left-[-40px] md:left-0 w-[calc(100%+80px)] md:w-[400px] bg-white rounded-2xl shadow-xl border border-slate-100 py-4 z-[100] animate-fade-in-up">
                            {destSuggestions.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-5 text-sm font-bold text-slate-800 mb-2">Điểm đến</div>
                                    {destSuggestions.map(item => (
                                        <div key={item.id} onClick={() => handleSelectSuggestion(item.name)} className="px-5 py-2.5 hover:bg-slate-50 flex items-center gap-4 cursor-pointer transition-colors">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-10 h-10 rounded-md object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-slate-400">location_city</span></div>
                                            )}
                                            <span className="text-sm font-bold text-primary">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {attractionSuggestions.length > 0 && (
                                <div>
                                    <div className="px-5 text-sm font-bold text-slate-800 mb-2">Điểm tham quan</div>
                                    {attractionSuggestions.map(item => (
                                        <div key={item.id} onClick={() => handleSelectSuggestion(item.name)} className="px-5 py-2.5 hover:bg-slate-50 flex items-center gap-4 cursor-pointer transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                                                <span className="material-symbols-outlined text-slate-500 text-[20px]">pin_drop</span>
                                            </div>
                                            <span
                                                className="text-sm font-medium text-slate-600 truncate"
                                                dangerouslySetInnerHTML={{ __html: item.name.replace(new RegExp(destination, 'gi'), (match) => `<span class="text-primary font-bold">${match}</span>`) }}
                                            />
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
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dates</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 outline-none text-slate-500 w-full" />
                </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-slate-200"></div>

            {/* 3. Budget (CUSTOM DROPDOWN MỚI) */}
            <div ref={budgetRef} onClick={() => setIsBudgetOpen(!isBudgetOpen)} className="flex-1 flex items-center gap-4 px-6 py-2 md:py-0 w-full hover:bg-slate-50 rounded-full transition-colors cursor-pointer group relative">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">account_balance_wallet</span>
                <div className="flex flex-col flex-1 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Budget</label>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${budgetLabel ? 'text-slate-800' : 'text-slate-300'}`}>
                            {budgetLabel || 'Select budget'}
                        </span>
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">
                            {isBudgetOpen ? 'expand_less' : 'expand_more'}
                        </span>
                    </div>
                </div>

                {/* Hộp thả xuống của Budget */}
                {isBudgetOpen && (
                    <div className="absolute top-[calc(100%+24px)] left-0 w-full md:w-[250px] bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[100] animate-fade-in-up">
                        {BUDGET_OPTIONS.map((opt, idx) => (
                            <div
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectBudget(opt.value, opt.label);
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
            <button type="submit" className="w-full md:w-auto mt-2 md:mt-0 bg-primary text-white rounded-full px-8 py-4 font-bold tracking-wide hover:bg-primary-container transition-all active:scale-95 whitespace-nowrap shadow-md shadow-primary/20">
                Search Path
            </button>
        </form>
    );
}
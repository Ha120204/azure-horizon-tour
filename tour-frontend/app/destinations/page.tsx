'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import Link from 'next/link';

function DestinationsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // 1. Nhận tham số từ trang chủ truyền sang
    const initialDest = searchParams.get('dest') || '';
    const initialDate = searchParams.get('date') || '';
    const initialBudget = searchParams.get('budget') || '';

    // 2. State cho thanh tìm kiếm
    const [dest, setDest] = useState(initialDest);
    const [date, setDate] = useState(initialDate);
    const [budget, setBudget] = useState(initialBudget);

    // 3. State lưu dữ liệu API
    const [allTours, setAllTours] = useState<any[]>([]);
    const [filteredTours, setFilteredTours] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 4. Gọi API lấy Tour
    useEffect(() => {
        const fetchTours = async () => {
            try {
                const res = await fetch('http://localhost:3000/tour');
                const data = await res.json();
                setAllTours(data);
                applyFilter(data, initialDest, initialBudget);
            } catch (error) {
                console.error('Lỗi lấy danh sách tour:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTours();
    }, [initialDest, initialBudget]);

    // 5. Logic lọc tour
    const applyFilter = (tours: any[], searchDest: string, searchBudget: string) => {
        let result = tours;
        if (searchDest) {
            const keyword = searchDest.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(keyword) ||
                (t.destination && t.destination.toLowerCase().includes(keyword))
            );
        }
        if (searchBudget && searchBudget !== 'unlimited') {
            const budgetValue = parseInt(searchBudget);
            result = result.filter(t => t.price >= budgetValue);
        }
        setFilteredTours(result);
    };

    // 6. Nút Tìm kiếm
    const handleSearchClick = () => {
        applyFilter(allTours, dest, budget);
        const params = new URLSearchParams();
        if (dest) params.append('dest', dest);
        if (date) params.append('date', date);
        if (budget) params.append('budget', budget);
        router.push(`/destinations?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />

            <main className="pt-28 pb-20 flex-grow">
                {/* Hero Section (Giữ nguyên nền ảnh của em, chỉ đổi thanh tìm kiếm thành 3 ô) */}
                <section className="px-4 md:px-8 max-w-screen-2xl mx-auto mb-16">
                    <div className="relative overflow-hidden rounded-3xl min-h-[400px] flex flex-col items-center justify-center text-center p-6 md:p-12 hero-gradient">
                        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
                            <img alt="Travel background" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1499681404123-6c7102ce0033?auto=format&fit=crop&q=80&w=2000" />
                        </div>
                        <div className="relative z-10 max-w-4xl w-full">
                            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">Explore All Destinations</h1>
                            <p className="text-base md:text-lg text-white/90 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
                                Find your next unforgettable journey from our curated collection of extraordinary places around the globe.
                            </p>

                            {/* Thanh Tìm Kiếm CẬP NHẬT 3 Ô */}
                            <div className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center w-full editorial-shadow gap-2 md:gap-0">
                                <div className="flex items-center flex-1 px-4 py-3 md:py-2 border-b md:border-b-0 md:border-r border-slate-100 w-full">
                                    <span className="material-symbols-outlined text-primary mr-3">location_on</span>
                                    <input
                                        className="w-full border-none focus:ring-0 text-on-surface placeholder:text-outline font-medium outline-none bg-transparent"
                                        placeholder="Bạn muốn đi đâu?"
                                        type="text"
                                        value={dest}
                                        onChange={(e) => setDest(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center flex-1 px-4 py-3 md:py-2 border-b md:border-b-0 md:border-r border-slate-100 w-full">
                                    <span className="material-symbols-outlined text-primary mr-3">calendar_today</span>
                                    <input
                                        className="w-full border-none focus:ring-0 text-outline font-medium outline-none bg-transparent"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center flex-1 px-4 py-3 md:py-2 border-b md:border-b-0 md:border-r border-slate-100 w-full">
                                    <span className="material-symbols-outlined text-primary mr-3">account_balance_wallet</span>
                                    <select
                                        className="w-full border-none focus:ring-0 text-on-surface font-medium outline-none bg-transparent cursor-pointer"
                                        value={budget}
                                        onChange={(e) => setBudget(e.target.value)}
                                    >
                                        <option value="">Mọi ngân sách</option>
                                        <option value="5000">Từ $5,000+</option>
                                        <option value="10000">Từ $10,000+</option>
                                        <option value="25000">Từ $25,000+</option>
                                        <option value="unlimited">Không giới hạn</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleSearchClick}
                                    className="w-full md:w-auto mt-2 md:mt-0 bg-primary hover:bg-primary-container text-white px-10 py-4 md:py-3 md:ml-2 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 active:scale-95"
                                >
                                    <span>Tìm kiếm</span>
                                    <span className="material-symbols-outlined">search</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Content Area */}
                <div className="px-4 md:px-8 max-w-screen-2xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                        {/* GIỮ NGUYÊN BỘ LỌC CỦA EM Ở ĐÂY */}
                        <aside className="lg:col-span-3 space-y-10">
                            <div>
                                <h2 className="font-headline text-xl font-bold mb-8 flex items-center">
                                    <span className="material-symbols-outlined mr-2">tune</span>
                                    Bộ Lọc Tìm Kiếm
                                </h2>
                                {/* Price Range */}
                                <div className="mb-10">
                                    <h3 className="font-bold text-sm text-on-surface-variant uppercase tracking-widest mb-6">Mức Giá</h3>
                                    <div className="space-y-6">
                                        <div className="relative h-2 bg-surface-container rounded-full overflow-hidden">
                                            <div className="absolute left-[15%] right-[25%] h-full bg-primary"></div>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant/20">
                                                <span className="text-[10px] text-outline block">TỪ</span>
                                                <input className="bg-transparent border-none p-0 text-sm font-bold w-full focus:ring-0 outline-none" type="text" defaultValue="$500" />
                                            </div>
                                            <div className="flex-1 bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant/20">
                                                <span className="text-[10px] text-outline block">ĐẾN</span>
                                                <input className="bg-transparent border-none p-0 text-sm font-bold w-full focus:ring-0 outline-none" type="text" defaultValue="$10,000+" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Khu vực */}
                                <div className="mb-10">
                                    <h3 className="font-bold text-sm text-on-surface-variant uppercase tracking-widest mb-4">Khu Vực</h3>
                                    <div className="space-y-3">
                                        {['Châu Âu', 'Châu Á', 'Châu Mỹ', 'Châu Phi'].map((region, idx) => (
                                            <label key={idx} className="flex items-center group cursor-pointer">
                                                <input defaultChecked={idx === 0} className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer" type="checkbox" />
                                                <span className="ml-3 text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">{region}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {/* Loại Tour */}
                                <div className="mb-10">
                                    <h3 className="font-bold text-sm text-on-surface-variant uppercase tracking-widest mb-4">Loại Tour</h3>
                                    <div className="space-y-3">
                                        {['Ghép đoàn', 'Thuê xe riêng', 'Nghỉ dưỡng sang trọng'].map((type, idx) => (
                                            <label key={idx} className="flex items-center group cursor-pointer">
                                                <input defaultChecked={idx === 2} className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer" type="checkbox" />
                                                <span className="ml-3 text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Right Content Area: Tour Grid */}
                        <section className="lg:col-span-9">
                            {/* Top Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                <div>
                                    <p className="text-on-surface-variant font-medium">
                                        Hiển thị <span className="text-on-surface font-bold">{filteredTours.length} Tours</span> phù hợp
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-outline font-medium whitespace-nowrap">Sắp xếp:</span>
                                    <div className="relative w-full sm:w-auto">
                                        <select className="bg-surface-container-low border-none rounded-lg pl-4 pr-10 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20 appearance-none w-full cursor-pointer outline-none">
                                            <option>Đề xuất</option>
                                            <option>Giá: Thấp đến Cao</option>
                                            <option>Đánh giá cao nhất</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tour Grid MỚI (Lấy dữ liệu API) */}
                            {isLoading ? (
                                <div className="text-center text-xl text-primary font-bold py-10">Đang tải dữ liệu...</div>
                            ) : filteredTours.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {filteredTours.map((tour: any) => (
                                        <article key={tour.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden editorial-shadow group transition-all duration-300 hover:-translate-y-1">
                                            <div className="relative aspect-[4/3] overflow-hidden">
                                                <img alt={tour.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={tour.imageUrl || "https://images.unsplash.com/photo-1499681404123-6c7102ce0033"} />
                                                <div className="absolute top-4 left-4">
                                                    <span className="bg-tertiary-container text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                                                        Sẵn Sàng
                                                    </span>
                                                </div>
                                                <div className="absolute bottom-4 right-4 bg-surface-container-lowest px-3 py-1.5 rounded-xl editorial-shadow">
                                                    <div className="flex items-center text-secondary-container">
                                                        <span className="material-symbols-outlined text-sm mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                        <span className="text-xs font-bold text-on-surface">5.0</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                <div className="flex items-center text-outline text-[11px] font-bold uppercase tracking-widest mb-2">
                                                    <span className="material-symbols-outlined text-xs mr-1">schedule</span>
                                                    {tour.duration}
                                                </div>
                                                <h3 className="font-headline text-xl font-bold text-on-surface mb-6 truncate" title={tour.name}>{tour.name}</h3>
                                                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                                                    <div>
                                                        <span className="text-[10px] text-outline block font-bold uppercase tracking-tighter">Giá từ</span>
                                                        <span className="text-xl font-extrabold text-primary">
                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(tour.price)}
                                                        </span>
                                                    </div>
                                                    <Link
                                                        href={`/tour/${tour.id}`}
                                                        className="bg-surface-container-high hover:bg-primary hover:text-white text-primary px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 text-center"
                                                    >
                                                        View details
                                                    </Link>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-surface-container-lowest rounded-2xl">
                                    <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
                                    <p className="font-bold text-on-surface">Không tìm thấy tour phù hợp.</p>
                                </div>
                            )}

                            {/* Pagination (Giữ nguyên của em) */}
                            <div className="mt-16 flex items-center justify-center space-x-2">
                                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface hover:bg-primary hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-white font-bold transition-all duration-300 shadow-md">1</button>
                                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface font-bold hover:bg-surface-container-high transition-all duration-300">2</button>
                                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-primary hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
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
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải dữ liệu...</div>}>
            <DestinationsContent />
        </Suspense>
    );
}
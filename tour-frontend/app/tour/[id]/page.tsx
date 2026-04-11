'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

// Mặc định hạng phòng
const ACCOMMODATION_TIERS = [
    { id: 'luxury_villa', name: 'Biệt thự sang trọng (Luxury Villa)', price: 0 },
    { id: 'boutique_hotel', name: 'Khách sạn Boutique', price: 0 },
    { id: 'ocean_suite', name: 'Phòng Suite view biển', price: 0 },
];

export default function TourDetailPage() {
    const params = useParams();

    // STATE: Quản lý Tour Data
    const [tour, setTour] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // STATE: Hạng phòng (Sẽ cập nhật lại giá khi lấy được API)
    const [tiers, setTiers] = useState(ACCOMMODATION_TIERS);
    const [selectedTier, setSelectedTier] = useState(ACCOMMODATION_TIERS[0]);

    useEffect(() => {
        const fetchTourDetail = async () => {
            try {
                // Gọi API lấy Tour
                const res = await fetch(`http://localhost:3000/tour/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setTour(data);

                    // Cập nhật lại giá cho các hạng phòng dựa trên giá cơ sở của Tour
                    const updatedTiers = [
                        { id: 'luxury_villa', name: 'Biệt thự sang trọng (Luxury Villa)', price: data.price },
                        { id: 'boutique_hotel', name: 'Khách sạn Boutique', price: data.price * 0.9 }, // Rẻ hơn xíu
                        { id: 'ocean_suite', name: 'Phòng Suite view biển', price: data.price * 1.2 }, // Đắt hơn xíu
                    ];
                    setTiers(updatedTiers);
                    setSelectedTier(updatedTiers[0]);
                }
            } catch (error) {
                console.error("Lỗi tải chi tiết tour:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) fetchTourDetail();
    }, [params.id]);

    const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const tierId = e.target.value;
        const newTier = tiers.find(t => t.id === tierId);
        if (newTier) setSelectedTier(newTier);
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center font-bold text-primary">Đang tải thông tin hành trình...</div>;
    }

    if (!tour) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-3xl font-bold mb-4 text-error">Không tìm thấy Tour</h2>
                <Link href="/destinations" className="bg-primary text-white px-8 py-3 rounded-full font-bold">Quay lại danh sách</Link>
            </div>
        );
    }

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .editorial-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 2rem; }
                .ambient-shadow { box-shadow: 0 8px 32px 0 rgba(25, 28, 33, 0.04); }
            `}} />

            <Header />

            <main className="flex-grow pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                {/* Hero Gallery Section */}
                <section className="mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 md:gap-4 h-[300px] md:h-[500px]">
                        <div className="md:col-span-2 md:row-span-2 rounded-xl overflow-hidden shadow-sm h-full relative">
                            {/* DÙNG ẢNH ĐỘNG TỪ DATABASE CHO ẢNH CHÍNH */}
                            <img className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt={tour.name} src={tour.imageUrl || "https://images.unsplash.com/photo-1723380775952-28ea1a7a330a"} />
                            <div className="absolute top-4 left-4">
                                <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest uppercase shadow-sm">
                                    Mã Tour: {tour.tourCode}
                                </span>
                            </div>
                        </div>
                        <div className="hidden md:block rounded-xl overflow-hidden shadow-sm h-full">
                            <img className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Italian architecture" src="https://images.unsplash.com/photo-1688707084161-a2d4a7313f37?w=800&auto=format&fit=crop&q=60" />
                        </div>
                        <div className="hidden md:block rounded-xl overflow-hidden shadow-sm h-full">
                            <img className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Mediterranean sea" src="https://plus.unsplash.com/premium_photo-1673139081468-d6c013defbc2?w=800&auto=format&fit=crop&q=60" />
                        </div>
                        <div className="hidden md:block md:col-span-2 rounded-xl overflow-hidden shadow-sm relative h-full">
                            <img className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Luxury yacht" src="https://plus.unsplash.com/premium_photo-1680831748191-d726a2f7b201?w=800&auto=format&fit=crop&q=60" />
                            <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg hover:bg-white transition-colors">
                                <span className="material-symbols-outlined text-sm">photo_library</span>
                                Xem tất cả ảnh
                            </button>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* Main Content Area (Left Column) */}
                    <div className="col-span-1 lg:col-span-8 space-y-12">
                        {/* Tour Introduction */}
                        <header>
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="bg-secondary-container/10 text-secondary-container px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border border-secondary-container/20">Trải nghiệm cao cấp</span>
                                <div className="flex items-center text-secondary-container">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    <span className="text-sm font-bold ml-1 text-on-surface">5.0 (Tuyệt vời)</span>
                                </div>
                            </div>

                            {/* TIÊU ĐỀ ĐỘNG */}
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold font-headline leading-tight tracking-tight text-primary mb-6">
                                {tour.name}
                            </h1>

                            <div className="flex flex-wrap gap-4 md:gap-8 py-6 border-y border-outline-variant/20 text-on-surface-variant">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                                        <span className="material-symbols-outlined">schedule</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-outline">Thời gian</p>
                                        <p className="font-semibold text-sm md:text-base text-on-surface">{tour.duration}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                                        <span className="material-symbols-outlined">group</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-outline">Quy mô đoàn</p>
                                        <p className="font-semibold text-sm md:text-base text-on-surface">Còn {tour.availableSeats} chỗ</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                                        <span className="material-symbols-outlined">location_on</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-outline">Điểm đến</p>
                                        <p className="font-semibold text-sm md:text-base text-on-surface">{tour.destination}</p>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* Description */}
                        <section>
                            <h2 className="text-2xl font-bold font-headline mb-4">Tổng quan hành trình</h2>
                            <div className="prose prose-slate max-w-none text-on-surface-variant leading-relaxed space-y-4 text-sm md:text-base whitespace-pre-line">
                                {tour.description}
                            </div>
                        </section>

                        {/* GIỮ NGUYÊN PHẦN ITINERARY VÀ REVIEW CỦA EM */}
                        {/* Itinerary */}
                        <section>
                            <h2 className="text-2xl font-bold font-headline mb-8">Lịch trình chi tiết</h2>
                            <div className="space-y-6">
                                {/* Day 1 */}
                                <div className="group flex gap-4 md:gap-6">
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-md text-sm md:text-base shrink-0">1</div>
                                        <div className="w-px h-full bg-outline-variant/30 mt-2"></div>
                                    </div>
                                    <div className="pb-8">
                                        <h3 className="text-base md:text-lg font-bold mb-2 text-on-surface">Đón khách & Nhận phòng VIP</h3>
                                        <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">Đón khách tại sân bay bằng xe riêng. Nhận phòng và tham gia tiệc tối thân mật cùng hướng dẫn viên địa phương.</p>
                                    </div>
                                </div>

                                {/* Day 2 */}
                                <div className="group flex gap-4 md:gap-6">
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-container text-on-surface flex items-center justify-center font-bold text-sm md:text-base shrink-0">2</div>
                                        <div className="w-px h-full bg-outline-variant/30 mt-2"></div>
                                    </div>
                                    <div className="pb-8">
                                        <h3 className="text-base md:text-lg font-bold mb-2 text-on-surface">Khám phá văn hóa bản địa</h3>
                                        <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">Tham quan các di sản nổi tiếng với đặc quyền không cần xếp hàng. Bữa trưa tại nhà hàng đạt chuẩn Michelin.</p>
                                    </div>
                                </div>

                                {/* Day 3 */}
                                <div className="group flex gap-4 md:gap-6">
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-container text-on-surface flex items-center justify-center font-bold text-sm md:text-base shrink-0">3</div>
                                    </div>
                                    <div className="pb-8">
                                        <h3 className="text-base md:text-lg font-bold mb-2 text-on-surface">Tự do thư giãn & Tiệc chia tay</h3>
                                        <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">Thư giãn tại Spa đẳng cấp hoặc tự do mua sắm. Tối tham gia tiệc Gala chia tay trên du thuyền.</p>
                                    </div>
                                </div>
                            </div>
                            <button className="mt-2 text-primary font-bold flex items-center gap-2 hover:translate-x-1 transition-transform text-sm md:text-base">
                                Xem toàn bộ lịch trình <span className="material-symbols-outlined text-sm md:text-base">arrow_forward</span>
                            </button>
                        </section>

                        {/* Traveler Stories */}
                        <section className="pt-8 border-t border-outline-variant/20">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold font-headline mb-1">Câu chuyện Hành khách</h2>
                                    <p className="text-on-surface-variant text-sm md:text-base">Lắng nghe từ những người đã trải nghiệm</p>
                                </div>
                                <button className="bg-surface-container-high hover:bg-surface-container px-6 py-2.5 rounded-full text-sm font-bold transition-colors w-full sm:w-auto">Viết Đánh giá</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-outline-variant/20">
                                    <div className="flex gap-1 text-secondary-container mb-3">
                                        {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                                    </div>
                                    <p className="text-on-surface-variant italic mb-6 text-sm">"Vượt quá mong đợi của tôi. Mọi thứ đều được chuẩn bị liền mạch và hoàn hảo đến từng chi tiết nhỏ."</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                            <img className="w-full h-full object-cover" alt="Elena Rodriguez" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-on-surface">Elena Rodriguez</p>
                                            <p className="text-[10px] uppercase tracking-wider text-outline">Tháng 10, 2024</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-outline-variant/20">
                                    <div className="flex gap-1 text-secondary-container mb-3">
                                        {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                                    </div>
                                    <p className="text-on-surface-variant italic mb-6 text-sm">"Các hướng dẫn viên địa phương đã tạo nên sự khác biệt hoàn toàn. Chúng tôi cảm thấy như những vị khách trong nhà của họ."</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                            <img className="w-full h-full object-cover" alt="David Chen" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-on-surface">David Chen</p>
                                            <p className="text-[10px] uppercase tracking-wider text-outline">Tháng 9, 2024</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: STICKY SIDEBAR */}
                    <aside className="col-span-1 lg:col-span-4 mt-8 lg:mt-0">
                        <div className="sticky top-28 space-y-6">

                            {/* Bảng Đặt Tour */}
                            <div className="bg-white rounded-xl p-6 md:p-8 ambient-shadow border border-outline-variant/20">
                                <div className="flex justify-between items-baseline mb-8 pb-6 border-b border-outline-variant/10">
                                    <p className="text-on-surface-variant font-medium text-sm">Giá từ</p>
                                    <div className="text-right">
                                        {/* HIỂN THỊ GIÁ ĐỘNG */}
                                        <span className="text-3xl font-extrabold font-headline text-primary">
                                            ${selectedTier.price.toLocaleString()}
                                        </span>
                                        <p className="text-xs text-on-surface-variant mt-1">/ mỗi người lớn</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Date Selector */}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-outline">Ngày khởi hành</label>
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">calendar_today</span>
                                            <select className="w-full bg-surface-container-low border-none rounded-lg py-3.5 pl-12 pr-10 focus:ring-2 focus:ring-primary appearance-none font-semibold text-sm cursor-pointer outline-none">
                                                {/* DÙNG NGÀY ĐỘNG TỪ DATABASE */}
                                                <option>{new Date(tour.startDate).toLocaleDateString('vi-VN')}</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                                        </div>
                                        {/* Urgency Badge */}
                                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-100 w-full">
                                            <span className="material-symbols-outlined text-amber-600 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                            <span className="text-[11px] font-bold text-amber-700">Chỉ còn {tour.availableSeats} chỗ!</span>
                                        </div>
                                    </div>

                                    {/* Accommodation Tier */}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-outline">Hạng Phòng / Dịch vụ</label>
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">hotel</span>
                                            <select
                                                className="w-full bg-surface-container-low border-none rounded-lg py-3.5 pl-12 pr-10 focus:ring-2 focus:ring-primary appearance-none font-semibold text-sm cursor-pointer outline-none"
                                                value={selectedTier.id}
                                                onChange={handleTierChange}
                                            >
                                                {tiers.map(tier => (
                                                    <option key={tier.id} value={tier.id}>
                                                        {tier.name} (+${tier.price.toLocaleString()})
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                                        </div>
                                    </div>

                                    {/* Pricing Detail */}
                                    <div className="pt-6 border-t border-dashed border-outline-variant/30 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-on-surface-variant">Tổng chi phí dự kiến</span>
                                            <span className="font-black text-primary text-lg">
                                                ${selectedTier.price.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* NÚT QUAN TRỌNG: TRUYỀN ID TOUR SANG CHECKOUT */}
                                    <Link
                                        href={`/checkout?tourId=${tour.id}&tier=${selectedTier.id}`}
                                        className="w-full flex justify-center py-4 bg-primary text-white rounded-xl font-bold text-base shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                                    >
                                        Đặt Tour Ngay
                                    </Link>
                                    <p className="text-center text-[11px] font-medium text-outline mt-3">Hủy miễn phí trước 30 ngày khởi hành.</p>
                                </div>
                            </div>

                            {/* Availability Heatmap Concept */}
                            <div className="bg-white rounded-xl p-6 border border-outline-variant/20 shadow-sm hidden sm:block">
                                <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-on-surface">
                                    <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                    Ngày được quan tâm nhiều
                                </h4>
                                <div className="grid grid-cols-7 gap-2">
                                    <div className="aspect-square bg-surface-container-highest rounded-md"></div>
                                    <div className="aspect-square bg-surface-container-highest rounded-md"></div>
                                    <div className="aspect-square bg-secondary-container/40 rounded-md"></div>
                                    <div className="aspect-square bg-secondary-container/80 rounded-md"></div>
                                    <div className="aspect-square bg-secondary-container/20 rounded-md"></div>
                                    <div className="aspect-square bg-surface-container-highest rounded-md"></div>
                                    <div className="aspect-square bg-surface-container-highest rounded-md"></div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
}
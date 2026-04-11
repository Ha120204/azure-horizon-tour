'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';

type PassengerType = 'Adult (12+)' | 'Child (4-11)' | 'Infant (<4)';

interface Passenger {
    type: PassengerType;
    fullName: string;
    dob: string;
    gender: string;
}

const ACCOMMODATION_TIERS = {
    'luxury_villa': { name: 'Biệt thự sang trọng (Luxury Villa)', price: 0 }, // Giá giờ sẽ cộng dồn từ Tour gốc
    'boutique_hotel': { name: 'Khách sạn Boutique', price: 0 },
    'ocean_suite': { name: 'Phòng Suite view biển', price: 0 },
};

function CheckoutContent() {
    const searchParams = useSearchParams();

    // 1. LẤY ID TOUR TỪ URL
    const tourIdStr = searchParams.get('tourId');
    const tierId = searchParams.get('tier') || 'luxury_villa';

    const currentTier =
        ACCOMMODATION_TIERS[tierId as keyof typeof ACCOMMODATION_TIERS] ||
        Object.values(ACCOMMODATION_TIERS).find(t => t.name === tierId) ||
        ACCOMMODATION_TIERS['luxury_villa'];

    // STATE LƯU THÔNG TIN TOUR TỪ DATABASE
    const [tourData, setTourData] = useState<any>(null);
    const [isLoadingTour, setIsLoadingTour] = useState(true);

    const [contactInfo, setContactInfo] = useState({ fullName: '', email: '', phone: '' });
    const [leadTraveler, setLeadTraveler] = useState({ fullName: '', dob: '', gender: '', notes: '' });

    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [activeFormType, setActiveFormType] = useState<PassengerType | null>(null);
    const [tempFormData, setTempFormData] = useState({ fullName: '', dob: '', gender: '' });
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);

    // 2. GỌI API LẤY DATA THẬT CỦA TOUR VÀ THÔNG TIN NGƯỜI DÙNG
    useEffect(() => {
        const fetchInitialData = async () => {
            // Lấy thông tin Tour
            if (tourIdStr) {
                try {
                    // Giả định API lấy 1 tour của em là GET /tours/:id (Có thể cần sửa /tours thành /tour tùy backend của em)
                    const resTour = await fetch(`http://localhost:3000/tour/${tourIdStr}`);
                    if (resTour.ok) {
                        const tData = await resTour.json();
                        setTourData(tData);
                    }
                } catch (error) {
                    console.error("Lỗi tải thông tin tour:", error);
                }
            }
            setIsLoadingTour(false);

            // Lấy thông tin User
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const resUser = await fetchWithAuth('http://localhost:3000/auth/profile');
                    if (resUser.ok) {
                        const uData = await resUser.json();
                        setContactInfo({ fullName: uData.fullName || '', email: uData.email || '', phone: uData.phone || '' });
                        setLeadTraveler(prev => ({ ...prev, fullName: uData.fullName || '' }));
                    }
                } catch (error) {
                    console.error("Lỗi khi tải thông tin user:", error);
                }
            }
        };
        fetchInitialData();
    }, [tourIdStr]);

    // 3. THIẾT LẬP BẢNG GIÁ ĐỘNG DỰA TRÊN GIÁ TOUR TRONG DATABASE
    const basePrice = tourData?.price || 0;
    const PRICES = {
        'Adult (12+)': basePrice,
        'Child (4-11)': basePrice * 0.7, // Trẻ em tính 70% giá
        'Infant (<4)': basePrice * 0.1   // Em bé tính 10% giá
    };
    const TAXES = basePrice > 0 ? 120 : 0; // Fix cứng thuế 120$ hoặc tính theo % tùy em

    const adultCount = 1 + passengers.filter(p => p.type === 'Adult (12+)').length;
    const childCount = passengers.filter(p => p.type === 'Child (4-11)').length;
    const infantCount = passengers.filter(p => p.type === 'Infant (<4)').length;

    const totalPrice = (adultCount * PRICES['Adult (12+)']) +
        (childCount * PRICES['Child (4-11)']) +
        (infantCount * PRICES['Infant (<4)']) + TAXES;


    const handleOpenForm = (type: PassengerType | null) => {
        setActiveFormType(type);
        setTempFormData({ fullName: '', dob: '', gender: '' });
    };

    const handleSavePassenger = () => {
        if (!tempFormData.fullName || !tempFormData.dob || !tempFormData.gender) {
            alert("Vui lòng điền đầy đủ thông tin (Họ và tên, Ngày sinh, Giới tính) cho hành khách này!");
            return;
        }
        if (activeFormType) {
            setPassengers([...passengers, { type: activeFormType, ...tempFormData }]);
            setActiveFormType(null);
        }
    };

    const handleRemovePassenger = (indexToRemove: number) => {
        setPassengers(passengers.filter((_, index) => index !== indexToRemove));
    };

    const handlePayment = async () => {
        if (!contactInfo.fullName || !contactInfo.email || !contactInfo.phone) {
            alert("Vui lòng điền đầy đủ Thông tin liên hệ!");
            return;
        }

        if (!contactInfo.email.includes('@')) {
            alert("Email không hợp lệ!");
            return;
        }

        if (!leadTraveler.fullName || !leadTraveler.dob || !leadTraveler.gender) {
            alert("Vui lòng điền đầy đủ thông tin bắt buộc cho Hành khách 1 (Người đại diện)!");
            return;
        }

        if (!tourData) {
            alert("Đơn hàng không hợp lệ, không tìm thấy thông tin Tour!");
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
            alert("Vui lòng đăng nhập để tiếp tục thanh toán!");
            window.location.href = "/login";
            return;
        }

        try {
            setIsPaymentLoading(true);

            const allPassengers = [
                { type: 'Adult (12+)', fullName: leadTraveler.fullName, dob: leadTraveler.dob, gender: leadTraveler.gender, notes: leadTraveler.notes },
                ...passengers
            ];

            const totalPeople = adultCount + childCount + infantCount;

            const bookingPayload = {
                tourId: Number(tourIdStr) || tourData.id, // ĐÃ SỬA: Đẩy đúng ID tour lên server
                tier: tierId,
                contactInfo: contactInfo,
                passengers: allPassengers,
                totalAmount: totalPrice,
                numberOfPeople: totalPeople
            };

            const response = await fetchWithAuth('http://localhost:3000/booking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingPayload)
            });

            const data = await response.json();

            if (response.ok && data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                alert("Lỗi khởi tạo thanh toán: " + (data.message || "Vui lòng thử lại."));
                setIsPaymentLoading(false);
            }

        } catch (error) {
            console.error("Lỗi gọi API:", error);
            alert("Không thể kết nối đến hệ thống máy chủ.");
            setIsPaymentLoading(false);
        }
    };

    if (isLoadingTour) {
        return <div className="min-h-[60vh] flex items-center justify-center font-bold text-primary">Đang chuẩn bị giỏ hàng...</div>;
    }

    if (!tourData) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <span className="material-symbols-outlined text-6xl text-error mb-4">error</span>
                <h2 className="text-2xl font-bold mb-2">Không tìm thấy thông tin Tour</h2>
                <p className="text-outline mb-6">Vui lòng quay lại danh sách để chọn tour.</p>
                <button onClick={() => window.location.href = '/destinations'} className="bg-primary text-white px-8 py-3 rounded-full font-bold">Khám phá Tour</button>
            </div>
        );
    }

    return (
        <main className="pt-28 pb-20 px-4 md:px-8 max-w-screen-2xl mx-auto flex-grow w-full">
            <div className="mb-8 md:mb-12 flex items-center justify-start gap-4 md:gap-12">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full primary-gradient flex items-center justify-center text-white font-bold text-sm md:text-base shadow-md">1</div>
                    <span className="font-headline font-bold text-primary tracking-tight text-sm md:text-base">Bước 1: Thông tin Hành khách</span>
                </div>
                <div className="h-px w-8 md:w-16 bg-outline-variant/30 hidden sm:block"></div>
                <div className="flex items-center gap-2 md:gap-3 opacity-50">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant font-bold text-sm md:text-base">2</div>
                    <span className="font-headline font-medium text-on-surface-variant tracking-tight text-sm md:text-base hidden sm:block">Bước 2: Thanh toán</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-8 space-y-8 md:space-y-10">

                    {/* 1. Contact Information Card */}
                    <section className="bg-white rounded-xl p-6 md:p-8 ambient-shadow ghost-border">
                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <span className="material-symbols-outlined text-primary text-3xl">contact_mail</span>
                            <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight">1. Thông tin liên hệ</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Họ và tên <span className="text-error">*</span></label>
                                <input
                                    className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none"
                                    type="text"
                                    placeholder="Nhập họ và tên"
                                    value={contactInfo.fullName}
                                    onChange={(e) => setContactInfo({ ...contactInfo, fullName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Email <span className="text-error">*</span></label>
                                <input
                                    className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none text-slate-500"
                                    type="email"
                                    placeholder="Nhập địa chỉ email"
                                    value={contactInfo.email}
                                    readOnly
                                    title="Email đăng nhập không thể thay đổi"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Số điện thoại <span className="text-error">*</span></label>
                                <input
                                    className="w-full bg-surface-container-low border-none rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none"
                                    type="tel"
                                    placeholder="Nhập số điện thoại"
                                    value={contactInfo.phone}
                                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* 2. Passenger Information Card */}
                    <section className="bg-white rounded-xl p-6 md:p-8 ambient-shadow ghost-border">
                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <span className="material-symbols-outlined text-primary text-3xl">group</span>
                            <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight">2. Thông tin hành khách</h2>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-surface-container-low/50 p-5 md:p-6 rounded-xl border border-outline-variant/20">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
                                    <h3 className="font-headline font-semibold text-base md:text-lg text-primary">Hành khách 1 (Người đại diện - Người lớn)</h3>
                                    <span className="bg-tertiary-container text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest w-max shadow-sm">Bắt buộc</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Họ và Tên <span className="text-error">*</span></label>
                                        <input
                                            className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                            type="text"
                                            placeholder="Vd: Đào Thanh Hà"
                                            value={leadTraveler.fullName}
                                            onChange={(e) => setLeadTraveler({ ...leadTraveler, fullName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Ngày sinh <span className="text-error">*</span></label>
                                        <input
                                            className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                            type="date"
                                            value={leadTraveler.dob}
                                            onChange={(e) => setLeadTraveler({ ...leadTraveler, dob: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Giới tính <span className="text-error">*</span></label>
                                        <select
                                            className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm appearance-none"
                                            value={leadTraveler.gender}
                                            onChange={(e) => setLeadTraveler({ ...leadTraveler, gender: e.target.value })}
                                        >
                                            <option value="">Chọn giới tính</option>
                                            <option value="Male">Nam</option>
                                            <option value="Female">Nữ</option>
                                            <option value="Other">Khác</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Yêu cầu đặc biệt</label>
                                        <textarea
                                            className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm resize-none"
                                            placeholder="Yêu cầu ăn chay, dị ứng thực phẩm, yêu cầu xe đẩy trẻ em, v.v..."
                                            rows={2}
                                            value={leadTraveler.notes}
                                            onChange={(e) => setLeadTraveler({ ...leadTraveler, notes: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {passengers.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-sm text-on-surface-variant">Hành khách đã thêm:</h4>
                                    {passengers.map((p, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white border border-primary/20 p-4 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <span className="material-symbols-outlined text-xl">{p.type.includes('Child') ? 'child_care' : p.type.includes('Infant') ? 'baby_changing_station' : 'person'}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-on-surface">{p.fullName}</p>
                                                    <p className="text-xs text-outline font-medium">{p.type} • {p.dob || 'Chưa nhập ngày sinh'}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemovePassenger(idx)} className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors" title="Xóa hành khách này">
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-4 pt-4 border-t border-outline-variant/20">
                                <h3 className="font-headline font-bold text-lg">Thêm hành khách</h3>
                                <div className="grid grid-cols-3 gap-2 md:gap-4">
                                    {(['Adult (12+)', 'Child (4-11)', 'Infant (<4)'] as PassengerType[]).map((type) => {
                                        const isActive = activeFormType === type;
                                        const icon = type.includes('Child') ? 'child_care' : type.includes('Infant') ? 'baby_changing_station' : 'person';

                                        return (
                                            <button
                                                key={type}
                                                onClick={() => handleOpenForm(isActive ? null : type)}
                                                className={`relative flex flex-col items-center justify-center gap-2 p-3 md:p-4 rounded-xl border-2 transition-all ${isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline-variant/30 hover:border-primary/50 bg-white'}`}
                                            >
                                                {isActive && (
                                                    <div className="absolute -top-2 -right-2 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                                        <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                                                    </div>
                                                )}
                                                <span className={`material-symbols-outlined ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{icon}</span>
                                                <span className={`text-[10px] md:text-xs font-bold uppercase tracking-tight ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{type}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {activeFormType && (
                                    <div className="relative bg-primary/5 rounded-2xl p-5 md:p-8 border border-primary/20 animate-fade-in mt-4">
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-surface border-t border-l border-primary/20 rotate-45" style={{ backgroundColor: '#f6f8fb' }}></div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-headline font-bold text-lg text-primary">Nhập thông tin cho: {activeFormType}</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Họ và Tên <span className="text-error">*</span></label>
                                                <input
                                                    className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                                    placeholder="Vd: Nguyễn Văn A"
                                                    type="text"
                                                    value={tempFormData.fullName}
                                                    onChange={(e) => setTempFormData({ ...tempFormData, fullName: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Ngày sinh <span className="text-error">*</span></label>
                                                <input
                                                    className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm"
                                                    type="date"
                                                    value={tempFormData.dob}
                                                    onChange={(e) => setTempFormData({ ...tempFormData, dob: e.target.value })}
                                                />
                                                <p className="mt-2 text-[11px] text-primary/70 font-medium italic">
                                                    {activeFormType === 'Child (4-11)' ? 'Tuổi từ 4-11 tuổi' : activeFormType === 'Infant (<4)' ? 'Dưới 4 tuổi' : 'Trên 12 tuổi'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Giới tính <span className="text-error">*</span></label>
                                                <select
                                                    className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm appearance-none"
                                                    value={tempFormData.gender}
                                                    onChange={(e) => setTempFormData({ ...tempFormData, gender: e.target.value })}
                                                >
                                                    <option value="">Chọn giới tính</option>
                                                    <option value="Male">Nam</option>
                                                    <option value="Female">Nữ</option>
                                                    <option value="Other">Khác</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="mt-8 flex justify-end gap-3">
                                            <button onClick={() => setActiveFormType(null)} className="px-6 py-3 rounded-full font-bold text-sm text-outline hover:text-on-surface transition-colors">Hủy</button>
                                            <button onClick={handleSavePassenger} className="bg-primary text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95">Lưu Hành Khách</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: STICKY ORDER SUMMARY */}
                <div className="lg:col-span-4 sticky top-28">
                    <div className="bg-white rounded-2xl ambient-shadow border border-outline-variant/20 overflow-hidden flex flex-col">
                        <div className="bg-surface-container-low p-6 border-b border-outline-variant/20">
                            <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">receipt_long</span>
                                Tóm tắt đơn hàng
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* ĐÃ SỬA: Hiển thị Tên và Ảnh ĐỘNG từ Database */}
                            <div className="flex gap-4 items-start">
                                <img alt={tourData.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl shrink-0 shadow-sm" src={tourData.imageUrl || "https://images.unsplash.com/photo-1499681404123-6c7102ce0033?auto=format&fit=crop&q=80&w=400"} />
                                <div>
                                    <h3 className="font-headline font-bold text-base leading-tight mb-2 text-on-surface line-clamp-2">{tourData.name}</h3>
                                    <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium mt-2">
                                        <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                                        <span>Khởi hành: {new Date(tourData.startDate).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium mt-1">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        <span>{tourData.duration}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100/50 rounded-xl p-3.5 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-amber-700 text-sm">hotel_class</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-0.5">Hạng dịch vụ đã chọn</p>
                                    <p className="font-semibold text-amber-900 text-sm">{currentTier.name}</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-dashed border-outline-variant/40 text-sm">
                                {adultCount > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-on-surface-variant font-medium">Người lớn x {adultCount}</span>
                                        <span className="font-semibold text-on-surface">${(adultCount * PRICES['Adult (12+)']).toLocaleString('en-US')}</span>
                                    </div>
                                )}
                                {childCount > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-on-surface-variant font-medium">Trẻ em x {childCount}</span>
                                        <span className="font-semibold text-on-surface">${(childCount * PRICES['Child (4-11)']).toLocaleString('en-US')}</span>
                                    </div>
                                )}
                                {infantCount > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-on-surface-variant font-medium">Em bé x {infantCount}</span>
                                        <span className="font-semibold text-on-surface">${(infantCount * PRICES['Infant (<4)']).toLocaleString('en-US')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-outline font-medium">Thuế & Phí dịch vụ</span>
                                    <span className="font-semibold text-outline">${TAXES}</span>
                                </div>
                            </div>

                            <div className="pt-4 mt-2 border-t-2 border-primary/10">
                                <div className="flex justify-between items-end bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                                    <span className="font-headline font-bold text-on-surface-variant uppercase tracking-wider text-xs">Tổng thanh toán</span>
                                    <span className="font-headline font-black text-3xl text-primary">${totalPrice.toLocaleString('en-US')}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={isPaymentLoading}
                                className={`w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95 text-base ${isPaymentLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <span>{isPaymentLoading ? 'Đang chuyển hướng...' : 'Thanh toán bảo mật'}</span>
                                <span className="material-symbols-outlined text-xl">{isPaymentLoading ? 'hourglass_empty' : 'lock'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function CheckoutPage() {
    return (
        <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .ambient-shadow { box-shadow: 0 8px 32px rgba(25, 28, 33, 0.04); }
                .primary-gradient { background: linear-gradient(135deg, #003f87 0%, #0056b3 100%); }
                .ghost-border { border: 1px solid rgba(194, 198, 212, 0.15); }
            `}} />
            <Header />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-primary">Đang chuẩn bị giỏ hàng...</div>}>
                <CheckoutContent />
            </Suspense>
            <Footer />
        </div>
    );
}
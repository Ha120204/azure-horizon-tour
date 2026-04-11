'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';

export default function BookingDetailPage() {
    const params = useParams(); // Lấy cái ID từ URL (VD: URL là /my-bookings/15 thì params.id = 15)
    const router = useRouter();
    const [booking, setBooking] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBookingDetail = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                // Tạm thời mình lấy toàn bộ lịch sử rồi lọc ra cái ID tương ứng cho nhanh
                const res = await fetchWithAuth('http://localhost:3000/booking/history/my-bookings');

                if (res.ok) {
                    const result = await res.json();
                    // Tìm đúng cái booking có ID khớp với URL
                    const specificBooking = result.data.find((b: any) => b.id === Number(params.id));

                    if (specificBooking) {
                        setBooking(specificBooking);
                    } else {
                        // Không tìm thấy thì đá về trang danh sách
                        router.push('/my-bookings');
                    }
                }
            } catch (error) {
                console.error("Lỗi tải chi tiết đơn hàng:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBookingDetail();
    }, [params.id, router]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-primary">Đang tải chi tiết hành trình...</div>;
    if (!booking) return null;

    const isPaid = booking.paymentStatus === 'PAID';

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />

            <main className="pt-32 pb-20 flex-grow max-w-4xl mx-auto w-full px-6">
                {/* Nút quay lại */}
                <Link href="/my-bookings" className="inline-flex items-center gap-2 text-outline font-medium hover:text-primary transition-colors mb-8">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Quay lại danh sách
                </Link>

                <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
                    {/* Ảnh cover của Tour */}
                    <div className="relative w-full h-64 md:h-80 lg:h-[400px] rounded-2xl overflow-hidden mb-8 md:mb-12 shadow-lg">
                        {/* 1. Ảnh nền */}
                        <img
                            src={booking.tour?.imageUrl || "https://images.unsplash.com/photo-1531366936337-7c912a4589a7"}
                            alt={booking.tour?.name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* 2. Lớp phủ Gradient đen mờ từ dưới lên (Để làm nổi bật chữ) */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                        {/* 3. Khối nội dung nằm đè lên ảnh (Căn góc dưới cùng bên trái) */}
                        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 lg:p-10">

                            {/* Hàng chứa 2 Badge Mã Code */}
                            <div className="flex flex-wrap items-center gap-3 mb-3 md:mb-4">
                                <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm">
                                    Mã vé: {booking.bookingCode}
                                </span>
                                <span className="bg-black/30 backdrop-blur-md text-white border border-white/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm">
                                    Mã Tour: {booking.tour?.tourCode}
                                </span>
                            </div>

                            {/* Tên Tour */}
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold text-white tracking-tight drop-shadow-md">
                                {booking.tour?.name}
                            </h1>

                        </div>
                    </div>

                    {/* Chi tiết thông tin */}
                    <div className="p-8 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Cột trái: Thông tin chuyến đi */}
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-4">Chi tiết hành trình</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3 text-on-surface-variant">
                                                <span className="material-symbols-outlined text-primary">calendar_today</span>
                                                <span className="font-medium">Ngày đặt</span>
                                            </div>
                                            <span className="font-bold">{new Date(booking.createdAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3 text-on-surface-variant">
                                                <span className="material-symbols-outlined text-primary">group</span>
                                                <span className="font-medium">Hành khách</span>
                                            </div>
                                            <span className="font-bold">{booking.numberOfPeople} Người</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3 text-on-surface-variant">
                                                <span className="material-symbols-outlined text-primary">schedule</span>
                                                <span className="font-medium">Thời lượng</span>
                                            </div>
                                            <span className="font-bold">{booking.tour?.duration || 'Chưa xác định'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cột phải: Thanh toán & Trạng thái */}
                            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0_8px_32px_rgba(25,28,33,0.04)] border border-outline-variant/10">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-6">Trạng thái thanh toán</p>

                                <div className="flex justify-between items-center mb-6 pb-6 border-b border-outline-variant/10">
                                    <span className="text-on-surface-variant font-medium">Trạng thái</span>
                                    {booking.paymentStatus === 'PAID' ? (
                                        <div className="bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-2 border border-emerald-100">
                                            <span className="material-symbols-outlined text-emerald-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Đã thanh toán</span>
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50 px-3 py-1 rounded-full flex items-center gap-2 border border-amber-100">
                                            <span className="material-symbols-outlined text-amber-600 text-sm">pending</span>
                                            <span className="text-[10px] font-bold text-amber-700 uppercase">Chờ thanh toán</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-end mb-8">
                                    <span className="text-on-surface-variant font-medium">Tổng cộng</span>
                                    <span className="text-3xl font-extrabold font-headline text-primary">${booking.totalPrice?.toLocaleString()}</span>
                                </div>

                                {/* XỬ LÝ NÚT BẤM ĐỘNG THEO TRẠNG THÁI */}
                                {booking.paymentStatus === 'PAID' ? (
                                    <Link
                                        // Dẫn thẳng sang trang Success (E-Ticket) kèm theo Mã vé
                                        href={`/success?bookingId=${booking.bookingCode}`}
                                        className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                                        Xem vé điện tử (E-Ticket)
                                    </Link>
                                ) : (
                                    <button
                                        // Nút dành cho vé chưa thanh toán (Em có thể gắn hàm gọi lại API VNPAY ở đây)
                                        className="w-full bg-amber-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-md active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                                        Thanh toán ngay
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
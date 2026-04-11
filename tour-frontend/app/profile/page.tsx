'use client'; // Bắt buộc vì có dùng State, Effect, Event

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- 1. STATE QUẢN LÝ DỮ LIỆU ĐỘNG ---
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // State cho Form Thông tin cá nhân
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    // THÊM MỚI: State hiển thị vòng quay loading khi đang tải ảnh
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);

    // State quản lý việc ẩn/hiện form đổi mật khẩu
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // State cho Toast Thông báo
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [logoutMsg, setLogoutMsg] = useState('');

    // State lưu lịch sử đơn hàng
    const [recentBookings, setRecentBookings] = useState<any[]>([]);

    // --- 2. GỌI API LẤY THÔNG TIN HỒ SƠ LÚC LOAD TRANG ---
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                // 2.1 Lấy thông tin User
                const resProfile = await fetchWithAuth('http://localhost:3000/auth/profile');

                if (resProfile.ok) {
                    const data = await resProfile.json();
                    setUserData(data);
                    setName(data.fullName || '');
                    setPhone(data.phone || '');
                    setEmail(data.email || '');
                    setAvatarUrl(data.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200");
                }

                // 2.2 Lấy danh sách Bookings (để làm Dashboard)
                const resBookings = await fetchWithAuth('http://localhost:3000/booking/history/my-bookings');

                if (resBookings.ok) {
                    const bookingResult = await resBookings.json();
                    setRecentBookings(bookingResult.data || []);
                }

            } catch (err) {
                console.warn('API lỗi, đang sử dụng dữ liệu mẫu (Mock Data).');
                setUserData({ mock: true });
                setName('Đào Thanh Hà (Bản Demo)');
                setPhone('+84 90 123 4567');
                setEmail('ha.dt@azurehorizon.com');
                setAvatarUrl("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200");
                setToast({ msg: 'Chưa kết nối Backend. Đang hiển thị giao diện mẫu.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- 3. LOGIC XỬ LÝ SỰ KIỆN ---

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetchWithAuth('http://localhost:3000/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: name, phone: phone })
            });
            if (res.ok) setToast({ msg: 'Cập nhật thông tin hồ sơ thành công!', type: 'success' });
            else setToast({ msg: `Cập nhật thất bại`, type: 'error' });
        } catch (err) {
            setToast({ msg: 'Lỗi kết nối máy chủ.', type: 'error' });
        } finally {
            setTimeout(() => setToast(null), 3000);
        }
    };

    // [ĐÃ SỬA]: Kích hoạt thẻ input file ẩn
    const handleAvatarClick = () => { fileInputRef.current?.click(); };

    // [ĐÃ SỬA]: Logic upload ảnh lên Backend và hiển thị ngay lập tức
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // BƯỚC A: Hiển thị ảnh xem trước (Preview) ngay lập tức
        const previewUrl = URL.createObjectURL(file);
        setAvatarUrl(previewUrl);

        // BƯỚC B: Upload ảnh lên Backend qua API /auth/avatar
        setIsAvatarUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetchWithAuth('http://localhost:3000/auth/avatar', {
                method: 'POST',
                body: formData // Gửi formData đi
            });

            const result = await res.json();

            if (res.ok && result.data?.avatarUrl) {
                // Thành công: Đổi lại link ảnh từ server trả về và hiện thông báo xanh
                setAvatarUrl(result.data.avatarUrl);
                setToast({ msg: 'Đã cập nhật ảnh đại diện mới!', type: 'success' });
            } else {
                setToast({ msg: result.message || 'Lỗi tải ảnh', type: 'error' });
            }
        } catch (error) {
            console.error("Lỗi tải ảnh:", error);
            setToast({ msg: 'Không thể kết nối đến máy chủ.', type: 'error' });
        } finally {
            setIsAvatarUploading(false);
            setTimeout(() => setToast(null), 3000); // Ẩn thông báo sau 3s
        }
    };

    // --- GIAO DIỆN ---
    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-primary">Đang tải dữ liệu hồ sơ...</div>;
    if (!userData) return null;

    // Tính toán con số thống kê
    const totalTrips = recentBookings.length;
    const confirmedTrips = recentBookings.filter(b => b.paymentStatus === 'PAID').length;

    return (
        <div className="bg-background text-on-background min-h-screen font-body flex flex-col relative">
            <Header />

            {/* TOAST NOTIFICATION DÙNG CHUNG */}
            {toast && (
                <div className="fixed top-24 right-8 z-[100] animate-bounce">
                    <div className={`bg-white border-l-4 ${toast.type === 'success' ? 'border-emerald-500' : 'border-red-500'} shadow-2xl rounded-xl px-6 py-4 flex items-center gap-4`}>
                        <div className={`w-10 h-10 rounded-full ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} flex items-center justify-center`}>
                            <span className="material-symbols-outlined text-2xl">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 font-headline">{toast.type === 'success' ? 'Thành công!' : 'Lỗi!'}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{toast.msg}</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-16 w-full flex-grow">
                {/* Profile Header Section */}
                <section className="flex flex-col md:flex-row items-center md:items-end gap-8 bg-surface-container-lowest p-8 rounded-xl ambient-shadow">

                    {/* KHỐI ẢNH ĐẠI DIỆN */}
                    <div className="relative group">
                        <div className={`w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-surface-container relative ${isAvatarUploading ? 'opacity-70' : ''}`}>
                            <img alt={name} className="w-full h-full object-cover" src={avatarUrl} />

                            {/* Hiệu ứng loading xoay tròn */}
                            {isAvatarUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <span className="material-symbols-outlined text-white animate-spin text-4xl">progress_activity</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleAvatarClick}
                            type="button"
                            disabled={isAvatarUploading}
                            className={`absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-lg text-primary hover:bg-primary-fixed transition-colors ${isAvatarUploading ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
                        >
                            <span className="material-symbols-outlined text-xl">photo_camera</span>
                        </button>

                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" hidden />
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="space-y-1">
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                                <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface">{name}</h1>
                                <span className="px-3 py-1 bg-secondary-container/10 text-on-secondary-container text-[10px] font-bold tracking-widest uppercase rounded-full border border-secondary-container/20">Thành viên từ: Oct 2023</span>
                            </div>
                            <p className="text-on-surface-variant font-body">{email}</p>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold font-headline text-primary">{totalTrips}</span>
                                <span className="text-xs uppercase tracking-wider text-outline font-label">Tổng chuyến đi</span>
                            </div>
                            <div className="w-px h-8 bg-outline-variant/30 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold font-headline text-secondary">{confirmedTrips}</span>
                                <span className="text-xs uppercase tracking-wider text-outline font-label">Đã xác nhận</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bento Grid Layout for Info and Bookings */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cột trái: Personal Info & Security */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Personal Information Card */}
                        <div className="bg-surface-container-lowest p-8 rounded-xl ambient-shadow space-y-6 h-fit">
                            <h2 className="text-xl font-headline font-bold text-on-surface">Thông tin cá nhân</h2>
                            <form className="space-y-5" onSubmit={handleUpdateInfo}>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">Họ và Tên</label>
                                    <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập họ và tên" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">Số điện thoại</label>
                                    <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nhập số điện thoại" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">Email (Read-only)</label>
                                    <input className="w-full bg-surface-container-low/60 border-none rounded-lg p-3 text-sm outline-none text-slate-500 cursor-not-allowed" type="email" value={email} readOnly />
                                </div>
                                <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-full font-headline font-bold text-sm shadow-md hover:opacity-90 transition-opacity active:scale-95">
                                    Cập nhật thông tin
                                </button>
                            </form>
                        </div>
                        {/* Account Security (Luồng Đổi Mật Khẩu Động) */}
                        {/* Phần này của em giữ nguyên */}
                    </div>

                    {/* Cột phải: My Bookings & Travel History */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">My Bookings</h2>
                            <Link href="/my-bookings" className="text-sm font-bold text-primary hover:underline underline-offset-4 flex items-center gap-1">
                                View All History <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                        </div>

                        {/* HIỂN THỊ ĐỘNG 4 ĐƠN HÀNG MỚI NHẤT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {recentBookings.length === 0 ? (
                                <div className="col-span-full py-10 text-center bg-surface-container-lowest rounded-xl ambient-shadow">
                                    <p className="text-outline font-medium">Bạn chưa có chuyến đi nào.</p>
                                    <Link href="/destinations" className="text-primary font-bold hover:underline mt-2 inline-block">Khám phá tour ngay</Link>
                                </div>
                            ) : (
                                recentBookings.slice(0, 4).map((booking) => {
                                    const isPaid = booking.paymentStatus === 'PAID';
                                    return (
                                        <div key={booking.id} className="group bg-surface-container-lowest rounded-xl overflow-hidden ambient-shadow transition-all duration-300 hover:-translate-y-1">
                                            <div className="relative h-48 overflow-hidden">
                                                <img alt={booking.tour?.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={booking.tour?.imageUrl || "https://images.unsplash.com/photo-1610574138412-7bf28ade0222?w=600&auto=format&fit=crop&q=60"} />
                                                <div className="absolute top-4 left-4">
                                                    <span className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-full shadow-lg ${isPaid ? 'bg-tertiary-container text-white' : 'bg-secondary-container text-on-secondary-container'}`}>
                                                        {isPaid ? 'Đã xác nhận' : 'Chờ thanh toán'}
                                                    </span>
                                                </div>
                                                <div className="absolute -bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-xl border border-surface-container">
                                                    <span className="text-lg font-bold font-headline text-primary">${booking.totalPrice?.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="p-6 pt-8 space-y-4">
                                                <div>
                                                    <h3 className="text-lg font-headline font-bold text-on-surface line-clamp-1" title={booking.tour?.name}>{booking.tour?.name}</h3>
                                                    <p className="text-xs text-outline font-medium flex items-center gap-1 mt-1">
                                                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                                                        Ngày đặt: {new Date(booking.createdAt).toLocaleDateString('vi-VN')}
                                                    </p>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${isPaid ? 'text-tertiary-container bg-tertiary-container/10' : 'text-amber-600 bg-amber-50'}`}>
                                                        {isPaid ? 'Thanh toán thành công' : 'Chưa hoàn tất'}
                                                    </span>
                                                    <Link href={`/my-bookings/${booking.id}`} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                                                        <span className="material-symbols-outlined">arrow_forward</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Logout Section */}
                <section className="flex justify-center md:justify-end pt-8 border-t border-outline-variant/20">
                    <button
                        onClick={() => {
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('refreshToken');
                            localStorage.removeItem('userName');
                            setLogoutMsg('Đã đăng xuất thành công.');
                            
                            window.dispatchEvent(new Event('auth-change'));
                            router.push('/login');
                        }}
                        className="px-8 py-3 rounded-full text-error font-bold font-headline hover:bg-error/10 transition-colors flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Đăng xuất
                    </button>
                </section>

                {logoutMsg && (
                    <div className="fixed top-24 right-8 z-[100] animate-bounce">
                        {/* Toast Logout nếu có */}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
'use client'; // Required vì có dùng State, Effect, Event

import { useEffect, useState, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import { useLocale } from '@/app/context/LocaleContext';
import ProfileHeader from '@/app/components/profile/ProfileHeader';
import PersonalInfoForm from '@/app/components/profile/PersonalInfoForm';
import ChangePasswordForm from '@/app/components/profile/ChangePasswordForm';
import VoucherWallet from '@/app/components/profile/VoucherWallet';

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t, formatPrice } = useLocale();

    // --- 1. STATE QUẢN LÝ DỮ LIỆU ĐỘNG ---
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // State cho Form Thông tin cá nhân
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [logoutMsg, setLogoutMsg] = useState('');

    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [myVouchers, setMyVouchers] = useState<any[]>([]);
    const [showAllVouchers, setShowAllVouchers] = useState(false);

    // State cho đổi mật khẩu
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const resProfile = await fetchWithAuth('http://localhost:3000/auth/profile');

                if (resProfile.ok) {
                    const payload = await resProfile.json();
                    const data = payload.data !== undefined ? payload.data : payload;
                    setUserData(data);
                    setName(data.fullName || '');
                    setPhone(data.phone || '');
                    setEmail(data.email || '');
                    setDob(data.dob || '');
                    setGender(data.gender || '');
                    setAvatarUrl(data.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200");
                }

                const resBookings = await fetchWithAuth('http://localhost:3000/booking/history/my-bookings');

                if (resBookings.ok) {
                    const bookingResult = await resBookings.json();
                    setRecentBookings(bookingResult.data || []);
                }

                // Fetch voucher wallet
                const resVouchers = await fetchWithAuth('http://localhost:3000/voucher/my-wallet');
                if (resVouchers.ok) {
                    const voucherData = await resVouchers.json();
                    const arr = voucherData.data || voucherData || [];
                    setMyVouchers(Array.isArray(arr) ? arr : []);
                }

            } catch (err) {
                console.warn('API lỗi, đang sử dụng dữ liệu mẫu (Mock Data).');
                setUserData({ mock: true });
                setName('Đào Thanh Hà (Bản Demo)');
                setPhone('+84 90 123 4567');
                setEmail('ha.dt@azurehorizon.com');
                setDob('1990-01-01');
                setGender('Female');
                setAvatarUrl("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200");
                setToast({ msg: t('profile.mockWarning'), type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetchWithAuth('http://localhost:3000/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: name, phone: phone, dob, gender })
            });
            if (res.ok) {
                // Đồng bộ tên mới lên localStorage → Header cập nhật ngay
                localStorage.setItem('userName', name);
                window.dispatchEvent(new Event('auth-change'));
                setToast({ msg: t('profile.updateSuccess'), type: 'success' });
            }
            else setToast({ msg: t('profile.updateFail'), type: 'error' });
        } catch (err) {
            setToast({ msg: t('profile.serverError'), type: 'error' });
        } finally {
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setToast({ msg: t('profile.passwordMismatch') || 'Mật khẩu xác nhận không khớp', type: 'error' });
            return;
        }
        setIsChangingPassword(true);
        try {
            const res = await fetchWithAuth('http://localhost:3000/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (res.ok) {
                setToast({ msg: t('profile.passwordSuccess') || 'Đổi mật khẩu thành công', type: 'success' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            } else {
                const result = await res.json();
                setToast({ msg: result.message || t('profile.passwordFail') || 'Đổi mật khẩu thất bại', type: 'error' });
            }
        } catch (err) {
            setToast({ msg: t('profile.serverError') || 'Lỗi kết nối', type: 'error' });
        } finally {
            setIsChangingPassword(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleAvatarClick = () => { fileInputRef.current?.click(); };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setAvatarUrl(previewUrl);

        setIsAvatarUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetchWithAuth('http://localhost:3000/auth/avatar', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();

            if (res.ok && result.data?.avatarUrl) {
                setAvatarUrl(result.data.avatarUrl);
                setToast({ msg: t('profile.avatarSuccess'), type: 'success' });
            } else {
                setToast({ msg: result.message || t('profile.avatarFail'), type: 'error' });
            }
        } catch (error) {
            console.error("Lỗi tải ảnh:", error);
            setToast({ msg: t('profile.serverError'), type: 'error' });
        } finally {
            setIsAvatarUploading(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-primary">{t('profile.loading')}</div>;
    if (!userData) return null;

    const totalTrips = recentBookings.length;
    const confirmedTrips = recentBookings.filter(b => b.paymentStatus === 'PAID').length;

    return (
        <div className="bg-background text-on-background min-h-screen font-body flex flex-col relative">
            <Header />

            {toast && (
                <div className="fixed top-24 right-8 z-[100] animate-bounce">
                    <div className={`bg-white border-l-4 ${toast.type === 'success' ? 'border-emerald-500' : 'border-red-500'} shadow-2xl rounded-xl px-6 py-4 flex items-center gap-4`}>
                        <div className={`w-10 h-10 rounded-full ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} flex items-center justify-center`}>
                            <span className="material-symbols-outlined text-2xl">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 font-headline">{toast.type === 'success' ? 'Success!' : 'Error!'}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{toast.msg}</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-16 w-full flex-grow">
                <ProfileHeader
                    name={name}
                    email={email}
                    avatarUrl={avatarUrl}
                    isAvatarUploading={isAvatarUploading}
                    totalTrips={totalTrips}
                    confirmedTrips={confirmedTrips}
                    onAvatarClick={handleAvatarClick}
                    onFileChange={handleFileChange}
                    fileInputRef={fileInputRef}
                    t={t}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-surface-container-lowest p-8 rounded-xl ambient-shadow space-y-8 h-fit">
                            <PersonalInfoForm
                                name={name} setName={setName}
                                phone={phone} setPhone={setPhone}
                                email={email}
                                dob={dob} setDob={setDob}
                                gender={gender} setGender={setGender}
                                onSubmit={handleUpdateInfo}
                                t={t}
                            />

                            <hr className="border-outline-variant/30" />

                            <ChangePasswordForm
                                isVisible={isChangePasswordVisible}
                                setIsVisible={setIsChangePasswordVisible}
                                currentPassword={currentPassword} setCurrentPassword={setCurrentPassword}
                                newPassword={newPassword} setNewPassword={setNewPassword}
                                confirmNewPassword={confirmNewPassword} setConfirmNewPassword={setConfirmNewPassword}
                                showCurrentPassword={showCurrentPassword} setShowCurrentPassword={setShowCurrentPassword}
                                showNewPassword={showNewPassword} setShowNewPassword={setShowNewPassword}
                                showConfirmNewPassword={showConfirmNewPassword} setShowConfirmNewPassword={setShowConfirmNewPassword}
                                isChangingPassword={isChangingPassword}
                                onSubmit={handleChangePassword}
                                t={t}
                            />
                        </div>

                        <VoucherWallet
                            myVouchers={myVouchers}
                            showAllVouchers={showAllVouchers}
                            setShowAllVouchers={setShowAllVouchers}
                            t={t}
                            formatPrice={formatPrice}
                        />
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">{t('profile.myBookings')}</h2>
                            <Link href="/my-bookings" className="text-sm font-bold text-primary hover:underline underline-offset-4 flex items-center gap-1">
                                {t('profile.viewAllHistory')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {recentBookings.length === 0 ? (
                                <div className="col-span-full py-10 text-center bg-surface-container-lowest rounded-xl ambient-shadow">
                                    <p className="text-outline font-medium">{t('profile.noTrips')}</p>
                                    <Link href="/destinations" className="text-primary font-bold hover:underline mt-2 inline-block">{t('profile.exploreNow')}</Link>
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
                                                        {isPaid ? t('profile.confirmedBadge') : t('profile.unpaidBadge')}
                                                    </span>
                                                </div>
                                                <div className="absolute -bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-xl border border-surface-container">
                                                    <span className="text-lg font-bold font-headline text-primary">{formatPrice(booking.totalPrice)}</span>
                                                </div>
                                            </div>
                                            <div className="p-6 pt-8 space-y-4">
                                                <div>
                                                    <h3 className="text-lg font-headline font-bold text-on-surface line-clamp-1" title={booking.tour?.name}>{booking.tour?.name}</h3>
                                                    <p className="text-xs text-outline font-medium flex items-center gap-1 mt-1">
                                                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                                                        {t('profile.bookingDate')}: {new Date(booking.createdAt).toLocaleDateString('vi-VN')}
                                                    </p>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${isPaid ? 'text-tertiary-container bg-tertiary-container/10' : 'text-amber-600 bg-amber-50'}`}>
                                                        {isPaid ? t('profile.paidLbl') : t('profile.incompleteLbl')}
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

                <section className="flex justify-center md:justify-end pt-8 border-t border-outline-variant/20">
                    <button
                        onClick={() => {
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('refreshToken');
                            localStorage.removeItem('userName');
                            setLogoutMsg(t('profile.logoutSuccess'));
                            
                            window.dispatchEvent(new Event('auth-change'));
                            router.push('/login');
                        }}
                        className="px-8 py-3 rounded-full text-error font-bold font-headline hover:bg-error/10 transition-colors flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        {t('profile.logoutBtn')}
                    </button>
                </section>
            </main>

            <Footer />
        </div>
    );
}
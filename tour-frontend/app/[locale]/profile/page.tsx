'use client'; // Required vì có dùng State, Effect, Event

import { useEffect, useState, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';
import { useLocale } from '@/app/context/LocaleContext';

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
                <section className="flex flex-col md:flex-row items-center md:items-end gap-8 bg-surface-container-lowest p-8 rounded-xl ambient-shadow">
                    <div className="relative group">
                        <div className={`w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-surface-container relative ${isAvatarUploading ? 'opacity-70' : ''}`}>
                            <img alt={name} className="w-full h-full object-cover" src={avatarUrl} />
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
                                <span className="px-3 py-1 bg-secondary-container/10 text-on-secondary-container text-[10px] font-bold tracking-widest uppercase rounded-full border border-secondary-container/20">{t('profile.memberSince')}</span>
                            </div>
                            <p className="text-on-surface-variant font-body">{email}</p>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold font-headline text-primary">{totalTrips}</span>
                                <span className="text-xs uppercase tracking-wider text-outline font-label">{t('profile.totalTripsLbl')}</span>
                            </div>
                            <div className="w-px h-8 bg-outline-variant/30 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold font-headline text-secondary">{confirmedTrips}</span>
                                <span className="text-xs uppercase tracking-wider text-outline font-label">{t('profile.confirmedTripsLbl')}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-surface-container-lowest p-8 rounded-xl ambient-shadow space-y-8 h-fit">
                            {/* Thông tin cá nhân */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-headline font-bold text-on-surface">{t('profile.personalInfo')}</h2>
                                <form className="space-y-5" onSubmit={handleUpdateInfo}>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.fullNameLbl') || 'HỌ VÀ TÊN'}</label>
                                        <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('profile.fullNamePlace')} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.dobLbl') || 'NGÀY SINH'}</label>
                                        <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.genderLbl') || 'GIỚI TÍNH'}</label>
                                        <select className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" value={gender} onChange={(e) => setGender(e.target.value)}>
                                            <option value="">{t('checkout.selectGender') || 'Chọn giới tính'}</option>
                                            <option value="Male">{t('checkout.male') || 'Nam'}</option>
                                            <option value="Female">{t('checkout.female') || 'Nữ'}</option>
                                            <option value="Other">{t('checkout.other') || 'Khác'}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.phoneLbl') || 'SỐ ĐIỆN THOẠI'}</label>
                                        <input className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('profile.phonePlace')} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.emailLbl')}</label>
                                        <input className="w-full bg-surface-container-low/60 border-none rounded-lg p-3 text-sm outline-none text-slate-500 cursor-not-allowed" type="email" value={email} readOnly />
                                    </div>
                                    <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-full font-headline font-bold text-sm shadow-md hover:opacity-90 transition-opacity active:scale-95">
                                        {t('profile.updateBtn')}
                                    </button>
                                </form>
                            </div>

                            <hr className="border-outline-variant/30" />

                            {/* Thay đổi mật khẩu Toggle */}
                            <div className="space-y-6">
                                {!isChangePasswordVisible ? (
                                    <button
                                        onClick={() => setIsChangePasswordVisible(true)}
                                        type="button"
                                        className="w-full py-3.5 bg-surface-container-low text-on-surface rounded-full font-headline font-bold text-sm hover:bg-outline-variant/20 transition-colors active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">lock</span>
                                        {t('profile.changePassword') || 'Thay đổi mật khẩu'}
                                    </button>
                                ) : (
                                    <form className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300" onSubmit={handleChangePassword}>
                                        <div className="flex items-center justify-between px-1 mb-2">
                                            <h3 className="text-[14px] font-headline font-bold text-on-surface uppercase tracking-wider">{t('profile.changePassword') || 'Thay đổi mật khẩu'}</h3>
                                            <button type="button" onClick={() => setIsChangePasswordVisible(false)} className="text-outline hover:text-error transition-colors flex items-center">
                                                <span className="material-symbols-outlined text-lg">close</span>
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.currentPassword') || 'Mật khẩu hiện tại'}</label>
                                            <div className="flex items-center bg-surface-container-low rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all">
                                                <input
                                                    type={showCurrentPassword ? 'text' : 'password'}
                                                    className="w-full bg-transparent border-none outline-none py-3 text-sm"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="text-slate-400 hover:text-primary">
                                                    <span className="material-symbols-outlined text-xl">{showCurrentPassword ? 'visibility' : 'visibility_off'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.newPassword') || 'Mật khẩu mới'}</label>
                                            <div className="flex items-center bg-surface-container-low rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    className="w-full bg-transparent border-none outline-none py-3 text-sm"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="text-slate-400 hover:text-primary">
                                                    <span className="material-symbols-outlined text-xl">{showNewPassword ? 'visibility' : 'visibility_off'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('profile.confirmNewPassword') || 'Xác nhận mật khẩu mới'}</label>
                                            <div className={`flex items-center rounded-lg px-3 focus-within:ring-1 transition-all border ${confirmNewPassword && confirmNewPassword !== newPassword ? 'border-error/50 focus-within:ring-error bg-error/5 focus-within:bg-error/10' : 'border-transparent bg-surface-container-low focus-within:ring-primary focus-within:bg-white'}`}>
                                                <input
                                                    type={showConfirmNewPassword ? 'text' : 'password'}
                                                    className={`w-full bg-transparent border-none outline-none py-3 text-sm ${confirmNewPassword && confirmNewPassword !== newPassword ? 'text-error' : ''}`}
                                                    value={confirmNewPassword}
                                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className={`text-slate-400 hover:text-primary ${confirmNewPassword && confirmNewPassword !== newPassword ? 'text-error/70 hover:text-error' : ''}`}>
                                                    <span className="material-symbols-outlined text-xl">{showConfirmNewPassword ? 'visibility' : 'visibility_off'}</span>
                                                </button>
                                            </div>
                                            {confirmNewPassword && confirmNewPassword !== newPassword && (
                                                <p className="text-error text-xs flex items-center gap-1 mt-1">
                                                    <span className="material-symbols-outlined text-[14px]">error</span>
                                                    {t('profile.passwordNotMatch') || 'Passwords do not match'}
                                                </p>
                                            )}
                                        </div>

                                        <button disabled={isChangingPassword} type="submit" className={`w-full py-3.5 bg-primary text-white rounded-full font-headline font-bold text-sm shadow-md hover:opacity-90 transition-opacity active:scale-95 ${isChangingPassword ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                            {isChangingPassword ? '...' : (t('profile.updatePasswordBtn') || 'Cập nhật mật khẩu')}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>

                        {/* Voucher Wallet Section */}
                        <div className="bg-surface-container-lowest p-8 rounded-xl ambient-shadow space-y-4 h-fit">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">wallet</span>
                                    {t('profile.voucherWallet') || 'Ví Voucher'}
                                    {myVouchers.length > 0 && (
                                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                            {myVouchers.length}
                                        </span>
                                    )}
                                </h2>
                                <Link href="/promotions" className="text-xs font-bold text-primary hover:underline underline-offset-4">
                                    {t('profile.getMore') || 'Lấy thêm'}
                                </Link>
                            </div>

                            {myVouchers.length === 0 ? (
                                <div className="text-center py-6">
                                    <span className="material-symbols-outlined text-3xl text-outline mb-2">confirmation_number</span>
                                    <p className="text-sm text-outline">{t('profile.noVouchers') || 'Chưa có voucher nào'}</p>
                                    <Link href="/promotions" className="text-primary font-bold text-sm hover:underline mt-1 inline-block">
                                        {t('profile.browseOffers') || 'Xem ưu đãi'}
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {(showAllVouchers ? myVouchers : myVouchers.slice(0, 2)).map((uv: any) => {
                                            const isExpired = uv.status === 'expired';
                                            const isUsed = uv.status === 'used';
                                            const isAvailable = uv.status === 'available';

                                            return (
                                                <div
                                                    key={uv.id}
                                                    className={`p-4 rounded-xl border transition-all ${
                                                        isAvailable
                                                            ? 'border-primary/20 bg-primary/5'
                                                            : 'border-outline-variant/20 bg-surface-container-low opacity-60'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-bold font-headline text-sm text-on-surface">{uv.voucher.label}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                            isAvailable ? 'bg-tertiary/10 text-tertiary' :
                                                            isUsed ? 'bg-outline/10 text-outline' :
                                                            'bg-error/10 text-error'
                                                        }`}>
                                                            {isAvailable ? (t('profile.vReady') || 'Sẵn sàng') :
                                                             isUsed ? (t('profile.vUsed') || 'Đã dùng') :
                                                             (t('profile.vExpired') || 'Hết hạn')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="font-mono font-bold text-primary text-sm">{uv.voucher.code}</span>
                                                            <p className="text-[10px] text-outline mt-0.5">
                                                                {uv.voucher.discountType === 'PERCENTAGE'
                                                                    ? `Giảm ${uv.voucher.discountValue}%`
                                                                    : `Giảm ${formatPrice(uv.voucher.discountValue)}`
                                                                }
                                                            </p>
                                                        </div>
                                                        <p className="text-[10px] text-outline">
                                                            HSD: {new Date(uv.voucher.expiresAt).toLocaleDateString('vi-VN')}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {myVouchers.length > 2 && (
                                        <button
                                            onClick={() => setShowAllVouchers(!showAllVouchers)}
                                            className="w-full pt-3 border-t border-outline-variant/15 flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {showAllVouchers ? 'expand_less' : 'expand_more'}
                                            </span>
                                            {showAllVouchers
                                                ? (t('profile.collapseVouchers') || 'Thu gọn')
                                                : (t('profile.viewAllVouchers') || `Xem tất cả (${myVouchers.length})`)}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
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
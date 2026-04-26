'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import { useLocale } from '@/app/context/LocaleContext';

const EXPIRY_MINUTES = 15;

// ─── Countdown Timer Hook ─────────────────────────────────────────────────────
function useCountdown(createdAt: string | undefined) {
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!createdAt) return;

        const expiresAt = new Date(createdAt).getTime() + EXPIRY_MINUTES * 60 * 1000;

        const tick = () => {
            const diff = Math.floor((expiresAt - Date.now()) / 1000);
            setSecondsLeft(diff > 0 ? diff : 0);
        };

        tick(); // ngay lập tức
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [createdAt]);

    return secondsLeft;
}

function CountdownBadge({ seconds }: { seconds: number | null }) {
    if (seconds === null) return null;

    const expired = seconds <= 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (expired) {
        return (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                <span className="material-symbols-outlined text-base">timer_off</span>
                Đã hết thời gian thanh toán (quá {EXPIRY_MINUTES} phút). Booking đã bị hủy tự động.
            </div>
        );
    }

    const isUrgent = seconds <= 120; // đỏ khi còn < 2 phút

    return (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${isUrgent
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
            <span className={`material-symbols-outlined text-base ${isUrgent ? 'animate-pulse' : ''}`}>
                timer
            </span>
            <span>
                Thời gian thanh toán còn lại:{' '}
                <strong className="font-mono text-base">
                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </strong>
            </span>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [booking, setBooking] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [payError, setPayError] = useState('');
    const { t, formatPrice } = useLocale();

    const secondsLeft = useCountdown(
        booking?.paymentStatus === 'UNPAID' && booking?.status === 'PENDING'
            ? booking?.createdAt
            : undefined
    );

    const isExpired = secondsLeft !== null && secondsLeft <= 0;

    useEffect(() => {
        const fetchBookingDetail = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetchWithAuth('http://localhost:3000/booking/history/my-bookings');

                if (res.ok) {
                    const result = await res.json();
                    const specificBooking = result.data.find((b: any) => b.id === Number(params.id));

                    if (specificBooking) {
                        setBooking(specificBooking);
                    } else {
                        router.push('/my-bookings');
                    }
                }
            } catch (error) {
                console.error('Lỗi tải chi tiết đơn hàng:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBookingDetail();
    }, [params.id, router]);

    // ─── Retry Payment handler ─────────────────────────────────────────────────
    const handleRetryPayment = useCallback(async () => {
        if (!booking || isPaying) return;
        setIsPaying(true);
        setPayError('');

        try {
            const res = await fetchWithAuth(
                `http://localhost:3000/booking/${booking.id}/retry-payment`,
                { method: 'POST' }
            );
            const result = await res.json();

            if (res.ok && result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            } else {
                setPayError(result.message ?? 'Không thể tạo liên kết thanh toán. Vui lòng thử lại.');
            }
        } catch (err) {
            setPayError('Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.');
        } finally {
            setIsPaying(false);
        }
    }, [booking, isPaying]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center font-bold text-primary">
            {t('my_bookings.loadingDetails')}
        </div>
    );
    if (!booking) return null;

    const isPaid = booking.paymentStatus === 'PAID';
    const isPending = booking.paymentStatus === 'UNPAID' && booking.status === 'PENDING';
    const isCancelled = booking.status === 'CANCELLED';

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />

            <main className="pt-32 pb-20 flex-grow max-w-4xl mx-auto w-full px-6">
                <Link href="/my-bookings" className="inline-flex items-center gap-2 text-outline font-medium hover:text-primary transition-colors mb-8">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    {t('my_bookings.backToList')}
                </Link>

                <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
                    {/* Hero Image */}
                    <div className="relative w-full h-64 md:h-80 lg:h-[400px] rounded-2xl overflow-hidden mb-8 md:mb-12 shadow-lg">
                        <img
                            src={booking.tour?.imageUrl || 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7'}
                            alt={booking.tour?.name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 lg:p-10">
                            <div className="flex flex-wrap items-center gap-3 mb-3 md:mb-4">
                                <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm">
                                    {t('my_bookings.ticketCode')} {booking.bookingCode}
                                </span>
                                <span className="bg-black/30 backdrop-blur-md text-white border border-white/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm">
                                    {t('my_bookings.tourCode')} {booking.tour?.tourCode}
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold text-white tracking-tight drop-shadow-md">
                                {booking.tour?.name}
                            </h1>
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Left: Trip Details */}
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-4">
                                        {t('my_bookings.itineraryDetails')}
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3 text-on-surface-variant">
                                                <span className="material-symbols-outlined text-primary">calendar_today</span>
                                                <span className="font-medium">{t('my_bookings.dateLbl')}</span>
                                            </div>
                                            <span className="font-bold">
                                                {new Date(booking.createdAt).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3 text-on-surface-variant">
                                                <span className="material-symbols-outlined text-primary">group</span>
                                                <span className="font-medium">{t('my_bookings.passengersLbl')}</span>
                                            </div>
                                            <span className="font-bold">{booking.numberOfPeople}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3 text-on-surface-variant">
                                                <span className="material-symbols-outlined text-primary">schedule</span>
                                                <span className="font-medium">{t('my_bookings.durationLbl')}</span>
                                            </div>
                                            <span className="font-bold">
                                                {booking.tour?.duration || t('my_bookings.unspecified')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Payment Panel */}
                            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0_8px_32px_rgba(25,28,33,0.04)] border border-outline-variant/10 space-y-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                                    {t('my_bookings.detailStatus')}
                                </p>

                                {/* Payment status badge */}
                                <div className="flex justify-between items-center pb-5 border-b border-outline-variant/10">
                                    <span className="text-on-surface-variant font-medium">
                                        {t('my_bookings.detailStatus')}
                                    </span>
                                    {isPaid ? (
                                        <div className="bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-2 border border-emerald-100">
                                            <span className="material-symbols-outlined text-emerald-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase">{t('my_bookings.paidStatusLong')}</span>
                                        </div>
                                    ) : isCancelled ? (
                                        <div className="bg-red-50 px-3 py-1 rounded-full flex items-center gap-2 border border-red-100">
                                            <span className="material-symbols-outlined text-red-600 text-sm">cancel</span>
                                            <span className="text-[10px] font-bold text-red-700 uppercase">Đã hủy</span>
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50 px-3 py-1 rounded-full flex items-center gap-2 border border-amber-100">
                                            <span className="material-symbols-outlined text-amber-600 text-sm">pending</span>
                                            <span className="text-[10px] font-bold text-amber-700 uppercase">{t('my_bookings.unpaidStatusLong')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Total */}
                                <div className="flex justify-between items-end">
                                    <span className="text-on-surface-variant font-medium">{t('my_bookings.totalPrice')}</span>
                                    <span className="text-3xl font-extrabold font-headline text-primary">
                                        {formatPrice(booking.totalPrice)}
                                    </span>
                                </div>

                                {/* Countdown — only for PENDING */}
                                {isPending && <CountdownBadge seconds={secondsLeft} />}

                                {/* Error message from retry */}
                                {payError && (
                                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                                        <span className="material-symbols-outlined text-base mt-0.5">error</span>
                                        {payError}
                                    </div>
                                )}

                                {/* CTA button */}
                                {isPaid ? (
                                    <Link
                                        href={`/success?bookingId=${booking.bookingCode}`}
                                        className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                                        {t('my_bookings.eTicket')}
                                    </Link>
                                ) : isCancelled ? (
                                    <div className="w-full bg-surface-container-high text-on-surface-variant py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                                        <span className="material-symbols-outlined text-lg">block</span>
                                        Đơn đặt tour đã bị hủy
                                    </div>
                                ) : isExpired ? (
                                    <div className="space-y-3">
                                        <div className="w-full bg-red-100 text-red-600 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                                            <span className="material-symbols-outlined text-lg">timer_off</span>
                                            Đã hết hạn thanh toán
                                        </div>
                                        <Link
                                            href="/destinations"
                                            className="w-full border border-primary text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all text-sm"
                                        >
                                            <span className="material-symbols-outlined text-lg">explore</span>
                                            Đặt tour mới
                                        </Link>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleRetryPayment}
                                        disabled={isPaying}
                                        className="w-full bg-amber-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isPaying ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                Đang tạo liên kết...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                                                {t('my_bookings.payNow')}
                                            </>
                                        )}
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
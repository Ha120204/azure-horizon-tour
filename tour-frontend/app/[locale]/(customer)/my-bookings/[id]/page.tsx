'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import { useLocale } from '@/app/context/LocaleContext';
import CancelBookingModal from '@/app/components/booking/CancelBookingModal';

const EXPIRY_MINUTES = 15;

function useCountdown(createdAt: string | undefined) {
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    useEffect(() => {
        if (!createdAt) return;
        const expiresAt = new Date(createdAt).getTime() + EXPIRY_MINUTES * 60 * 1000;
        const tick = () => {
            const diff = Math.floor((expiresAt - Date.now()) / 1000);
            setSecondsLeft(diff > 0 ? diff : 0);
        };
        tick();
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
    const isUrgent = seconds <= 120;
    return (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${isUrgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <span className={`material-symbols-outlined text-base ${isUrgent ? 'animate-pulse' : ''}`}>timer</span>
            <span>
                Thời gian thanh toán còn lại:{' '}
                <strong className="font-mono text-base">
                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </strong>
            </span>
        </div>
    );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string }) {
    if (paymentStatus === 'PAID' && status === 'CONFIRMED') {
        return (
            <div className="bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-2 border border-emerald-100">
                <span className="material-symbols-outlined text-emerald-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Đã Xác Nhận</span>
            </div>
        );
    }
    if (status === 'CANCEL_REQUESTED') {
        return (
            <div className="bg-orange-50 px-3 py-1 rounded-full flex items-center gap-2 border border-orange-200">
                <span className="material-symbols-outlined text-orange-500 text-sm animate-pulse">pending</span>
                <span className="text-[10px] font-bold text-orange-600 uppercase">Đang Chờ Duyệt Hủy</span>
            </div>
        );
    }
    if (status === 'CANCELLED') {
        return (
            <div className="bg-red-50 px-3 py-1 rounded-full flex items-center gap-2 border border-red-100">
                <span className="material-symbols-outlined text-red-600 text-sm">cancel</span>
                <span className="text-[10px] font-bold text-red-700 uppercase">Đã Hủy</span>
            </div>
        );
    }
    return (
        <div className="bg-amber-50 px-3 py-1 rounded-full flex items-center gap-2 border border-amber-100">
            <span className="material-symbols-outlined text-amber-600 text-sm">pending</span>
            <span className="text-[10px] font-bold text-amber-700 uppercase">Chờ Thanh Toán</span>
        </div>
    );
}

export default function BookingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [booking, setBooking] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [payError, setPayError] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelSuccess, setCancelSuccess] = useState(false);
    const { t, formatPrice } = useLocale();

    const secondsLeft = useCountdown(
        booking?.paymentStatus === 'UNPAID' && booking?.status === 'PENDING'
            ? booking?.createdAt : undefined
    );
    const isExpired = secondsLeft !== null && secondsLeft <= 0;

    const fetchBooking = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) { router.push('/login'); return; }
        try {
            const res = await fetchWithAuth(`http://localhost:3000/booking/my/${params.id}`);
            if (res.ok) {
                const result = await res.json();
                if (result.data) setBooking(result.data);
                else router.push('/my-bookings');
            }
        } catch (error) {
            console.error('Lỗi tải chi tiết đơn hàng:', error);
        } finally {
            setIsLoading(false);
        }
    }, [params.id, router]);

    useEffect(() => { fetchBooking(); }, [fetchBooking]);

    const handleRetryPayment = useCallback(async () => {
        if (!booking || isPaying) return;
        setIsPaying(true); setPayError('');
        try {
            const res = await fetchWithAuth(`http://localhost:3000/booking/${booking.id}/retry-payment`, { method: 'POST' });
            const result = await res.json();
            const checkoutUrl = result.data?.checkoutUrl || result.checkoutUrl;
            if (res.ok && checkoutUrl) { window.location.href = checkoutUrl; }
            else { setPayError(result.message ?? 'Không thể tạo liên kết thanh toán. Vui lòng thử lại.'); }
        } catch { setPayError('Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.'); }
        finally { setIsPaying(false); }
    }, [booking, isPaying]);

    const handleCancelSuccess = useCallback(() => {
        setShowCancelModal(false);
        setCancelSuccess(true);
        fetchBooking(); // Reload để lấy status mới
    }, [fetchBooking]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center font-bold text-primary">
            Đang tải chi tiết đơn hàng...
        </div>
    );
    if (!booking) return null;

    const isPaid = booking.paymentStatus === 'PAID' && booking.status === 'CONFIRMED';
    const isPending = booking.paymentStatus === 'UNPAID' && booking.status === 'PENDING';
    const isCancelled = booking.status === 'CANCELLED';
    const isCancelRequested = booking.status === 'CANCEL_REQUESTED';
    const isConfirmed = booking.paymentStatus === 'PAID' && booking.status === 'CONFIRMED';

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />
            <main className="pt-32 pb-20 flex-grow max-w-4xl mx-auto w-full px-6">
                <Link href="/my-bookings" className="inline-flex items-center gap-2 text-outline font-medium hover:text-primary transition-colors mb-8">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    {t('my_bookings.backToList')}
                </Link>

                {/* Cancel success banner */}
                {cancelSuccess && (
                    <div className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-4">
                        <span className="material-symbols-outlined text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <div>
                            <p className="font-bold text-sm">Yêu cầu đã được ghi nhận!</p>
                            <p className="text-xs opacity-80 mt-0.5">Chúng tôi sẽ xử lý và thông báo kết quả trong vòng 1–3 ngày làm việc.</p>
                        </div>
                    </div>
                )}

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
                                    VÉ: {booking.bookingCode}
                                </span>
                                <span className="bg-black/30 backdrop-blur-md text-white border border-white/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm">
                                    TOUR: {booking.tour?.tourCode}
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
                                            <span className="font-bold">{new Date(booking.createdAt).toLocaleDateString('vi-VN')}</span>
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
                                            <span className="font-bold">{booking.tour?.duration || t('my_bookings.unspecified')}</span>
                                        </div>
                                        {booking.tour?.startDate && (
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                <div className="flex items-center gap-3 text-on-surface-variant">
                                                    <span className="material-symbols-outlined text-primary">flight_takeoff</span>
                                                    <span className="font-medium">Ngày khởi hành</span>
                                                </div>
                                                <span className="font-bold">{new Date(booking.tour.startDate).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Cancel reason display — if cancelled */}
                                {(isCancelled || isCancelRequested) && booking.cancelReason && (
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                        <p className="text-xs font-bold text-outline uppercase tracking-widest mb-3">Thông Tin Hủy Tour</p>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Lý do</span>
                                                <span className="font-medium text-slate-700 text-right max-w-[60%]">{booking.cancelReason}</span>
                                            </div>
                                            {booking.cancelRequestedAt && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Yêu cầu lúc</span>
                                                    <span className="font-medium">{new Date(booking.cancelRequestedAt).toLocaleString('vi-VN')}</span>
                                                </div>
                                            )}
                                            {booking.cancelledAt && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Hủy lúc</span>
                                                    <span className="font-medium">{new Date(booking.cancelledAt).toLocaleString('vi-VN')}</span>
                                                </div>
                                            )}
                                            {booking.refundAmount !== undefined && booking.refundAmount !== null && (
                                                <div className="flex justify-between pt-2 border-t border-slate-200">
                                                    <span className="text-slate-500 font-semibold">Hoàn tiền</span>
                                                    <span className={`font-bold text-base ${booking.refundAmount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {booking.refundAmount > 0
                                                            ? booking.refundAmount.toLocaleString('vi-VN') + 'đ'
                                                            : 'Không hoàn tiền'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Payment Panel */}
                            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0_8px_32px_rgba(25,28,33,0.04)] border border-outline-variant/10 space-y-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                                    {t('my_bookings.detailStatus')}
                                </p>

                                {/* Status badge */}
                                <div className="flex justify-between items-center pb-5 border-b border-outline-variant/10">
                                    <span className="text-on-surface-variant font-medium">{t('my_bookings.detailStatus')}</span>
                                    <StatusBadge status={booking.status} paymentStatus={booking.paymentStatus} />
                                </div>

                                {/* Total */}
                                <div className="flex justify-between items-end">
                                    <span className="text-on-surface-variant font-medium">{t('my_bookings.totalPrice')}</span>
                                    <span className="text-3xl font-extrabold font-headline text-primary">{formatPrice(booking.totalPrice)}</span>
                                </div>

                                {/* Refund info if CANCEL_REQUESTED */}
                                {isCancelRequested && booking.refundAmount !== null && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1">
                                        <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Dự Kiến Hoàn Tiền</p>
                                        <p className="text-lg font-extrabold text-orange-600">
                                            {booking.refundAmount > 0
                                                ? Number(booking.refundAmount).toLocaleString('vi-VN') + 'đ'
                                                : 'Không hoàn tiền'}
                                        </p>
                                        <p className="text-xs text-orange-600 opacity-80">{booking.refundNote}</p>
                                    </div>
                                )}

                                {/* Countdown — only for PENDING */}
                                {isPending && <CountdownBadge seconds={secondsLeft} />}

                                {/* Error message from retry */}
                                {payError && (
                                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                                        <span className="material-symbols-outlined text-base mt-0.5">error</span>
                                        {payError}
                                    </div>
                                )}

                                {/* CTA Buttons */}
                                {isPaid ? (
                                    <div className="space-y-3">
                                        <Link
                                            href={`/success?bookingId=${booking.bookingCode}`}
                                            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                                            {t('my_bookings.eTicket')}
                                        </Link>
                                        {/* Cancel button for CONFIRMED paid */}
                                        <button
                                            onClick={() => setShowCancelModal(true)}
                                            className="w-full border-2 border-red-200 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all text-sm"
                                        >
                                            <span className="material-symbols-outlined text-base">cancel</span>
                                            Yêu Cầu Hủy Tour
                                        </button>
                                    </div>
                                ) : isCancelRequested ? (
                                    <div className="space-y-3">
                                        <div className="w-full bg-orange-50 border-2 border-orange-200 text-orange-600 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                                            <span className="material-symbols-outlined text-lg animate-pulse">pending</span>
                                            Đang Chờ Admin Xử Lý
                                        </div>
                                        <p className="text-xs text-center text-slate-400">Thời gian xử lý: 1–3 ngày làm việc</p>
                                        <Link
                                            href="/contact"
                                            className="w-full border border-slate-200 text-slate-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-sm"
                                        >
                                            <span className="material-symbols-outlined text-base">support_agent</span>
                                            Liên Hệ Hỗ Trợ
                                        </Link>
                                    </div>
                                ) : isCancelled ? (
                                    <div className="space-y-3">
                                        <div className="w-full bg-slate-100 text-slate-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                                            <span className="material-symbols-outlined text-lg">block</span>
                                            Đơn Đặt Tour Đã Hủy
                                        </div>
                                        <Link
                                            href="/destinations"
                                            className="w-full border border-primary text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all text-sm"
                                        >
                                            <span className="material-symbols-outlined text-base">explore</span>
                                            Khám Phá Tour Mới
                                        </Link>
                                    </div>
                                ) : isExpired ? (
                                    <div className="space-y-3">
                                        <div className="w-full bg-red-100 text-red-600 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                                            <span className="material-symbols-outlined text-lg">timer_off</span>
                                            Đã Hết Hạn Thanh Toán
                                        </div>
                                        <Link href="/destinations" className="w-full border border-primary text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all text-sm">
                                            <span className="material-symbols-outlined text-lg">explore</span>
                                            Đặt Tour Mới
                                        </Link>
                                    </div>
                                ) : (
                                    // PENDING — chờ thanh toán
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleRetryPayment}
                                            disabled={isPaying}
                                            className="w-full bg-amber-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isPaying ? (
                                                <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Đang tạo liên kết...</>
                                            ) : (
                                                <><span className="material-symbols-outlined text-lg">account_balance_wallet</span>{t('my_bookings.payNow')}</>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setShowCancelModal(true)}
                                            className="w-full border-2 border-slate-200 text-slate-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-sm"
                                        >
                                            <span className="material-symbols-outlined text-base">cancel</span>
                                            Hủy Đặt Tour
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            {/* Cancel Modal */}
            {showCancelModal && (
                <CancelBookingModal
                    bookingId={booking.id}
                    bookingCode={booking.bookingCode}
                    tourName={booking.tour?.name}
                    tourStartDate={booking.tour?.startDate}
                    totalPrice={Number(booking.totalPrice)}
                    paymentStatus={booking.paymentStatus}
                    bookingStatus={booking.status}
                    onClose={() => setShowCancelModal(false)}
                    onSuccess={handleCancelSuccess}
                />
            )}
        </div>
    );
}

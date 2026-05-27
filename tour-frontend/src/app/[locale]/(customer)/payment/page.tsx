'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/constants';

interface EBookedTour {
    id: number;
    name: string;
    imageUrl?: string | null;
    startDate: string;
    duration?: string | null;
}

interface EBooking {
    id: number;
    bookingCode: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
    numberOfPeople: number;
    totalPrice: number;
    leadTravelerName: string;
    tour: EBookedTour;
}

const dict = {
    vi: {
        step1: "Điền thông tin",
        step2: "Chọn thanh toán",
        step3: "Hoàn tất",
        title: "Phương thức thanh toán",
        subtitle: "Chọn một phương thức thanh toán phù hợp nhất cho chuyến đi của bạn",
        payosTitle: "Chuyển khoản Ngân hàng nhanh (PayOS)",
        payosDesc: "Quét mã QR tự động xác nhận giao dịch tức thì qua ứng dụng Ngân hàng.",
        payosTimer: "Thanh toán trong {time}",
        payosExpired: "Đã quá hạn 15 phút - Vui lòng chọn Thanh toán tại cửa hàng",
        inStoreTitle: "Thanh toán tại văn phòng / cửa hàng",
        inStoreDesc: "Giữ chỗ đặt tối đa 24 giờ. Vui lòng đến chi nhánh văn phòng của chúng tôi để thanh toán trực tiếp.",
        officeLabel: "Văn phòng Azure Horizon:",
        officeAddress: "175 Phố Tây Sơn, Đống Đa, Hà Nội",
        hoursLabel: "Giờ làm việc:",
        hoursValue: "Thứ 2 - Thứ 6 (08:00 - 18:00)",
        phoneLabel: "Điện thoại hỗ trợ:",
        inStoreWarning: "Hệ thống sẽ giữ chỗ đặt tour của bạn trong 24 giờ kể từ thời điểm đăng ký. Đơn đặt sẽ tự động hủy nếu quá thời hạn trên mà chưa nhận được xác nhận thanh toán tại cửa hàng.",
        cancelBtn: "Hủy giao dịch",
        payosBtn: "Thanh toán bằng mã QR",
        inStoreBtn: "Xác nhận đặt giữ chỗ",
        processing: "Đang xử lý...",
        orderSummary: "Tóm tắt đơn hàng",
        orderCode: "Mã đơn hàng",
        leadRepresentative: "Người đại diện",
        passengerCount: "{count} hành khách",
        totalAmount: "Tổng tiền",
        loading: "Đang tải thông tin thanh toán...",
        errorTitle: "Đã xảy ra lỗi",
        backBtn: "Quay lại xem Tour",
        invalidCode: "Mã đặt chỗ không hợp lệ"
    },
    en: {
        step1: "Fill details",
        step2: "Select Payment",
        step3: "Complete",
        title: "Payment Method",
        subtitle: "Choose the payment method that fits your trip best",
        payosTitle: "Fast Bank Transfer (PayOS)",
        payosDesc: "Scan QR code to automatically confirm transaction instantly via your banking app.",
        payosTimer: "Pay within {time}",
        payosExpired: "Expired 15-minute slot - Please choose In-Store Payment",
        inStoreTitle: "Pay at Office / Store",
        inStoreDesc: "Hold seats for up to 24 hours. Please visit our transaction office to pay in person.",
        officeLabel: "Azure Horizon Office:",
        officeAddress: "175 Tay Son Street, Dong Da, Hanoi",
        hoursLabel: "Working Hours:",
        hoursValue: "Monday - Friday (08:00 - 18:00)",
        phoneLabel: "Support Phone:",
        inStoreWarning: "The system will hold your tour reservation for 24 hours. The booking will automatically cancel after this deadline if store payment confirmation is not received.",
        cancelBtn: "Cancel Transaction",
        payosBtn: "Pay with QR Code",
        inStoreBtn: "Confirm Reservation",
        processing: "Processing...",
        orderSummary: "Order Summary",
        orderCode: "Order Code",
        leadRepresentative: "Lead Traveler",
        passengerCount: "{count} passenger(s)",
        totalAmount: "Total Amount",
        loading: "Loading payment details...",
        errorTitle: "An error occurred",
        backBtn: "Back to Explore Tours",
        invalidCode: "Invalid booking code"
    }
};

export default function PaymentSelectorPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t, formatPrice, formatDate, language } = useLocale();

    const bookingCode = searchParams.get('bookingCode');

    const [booking, setBooking] = useState<EBooking | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<'PAYOS' | 'IN_STORE'>('PAYOS');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const lang = (language === 'vi' || language === 'en') ? language : 'vi';
    const d = dict[lang];

    // 1. Fetch booking details by code
    useEffect(() => {
        if (!bookingCode) {
            setError(d.invalidCode);
            setIsLoading(false);
            return;
        }

        const fetchBooking = async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/booking/my/code/${bookingCode}`);
                const result = await res.json();

                if (res.ok && result.data) {
                    setBooking(result.data);
                    setSelectedMethod((result.data.paymentMethod as 'PAYOS' | 'IN_STORE') || 'PAYOS');
                } else {
                    setError(result.message || d.invalidCode);
                }
            } catch (err) {
                console.error('Lỗi tải booking:', err);
                setError(d.invalidCode);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBooking();
    }, [bookingCode, d.invalidCode]);

    // 2. Countdown timer calculation (15 mins from createdAt)
    useEffect(() => {
        if (!booking) return;

        const createdTime = new Date(booking.createdAt).getTime();
        const limitTime = createdTime + 15 * 60 * 1000; // 15 minutes limit

        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((limitTime - now) / 1000));
            setTimeLeft(remaining);
        };

        updateTimer();
        const timerId = setInterval(updateTimer, 1000);

        return () => clearInterval(timerId);
    }, [booking]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 3. Confirming and proceeding with payment
    const handleConfirmPayment = async () => {
        if (!booking) return;

        try {
            setIsSubmitting(true);

            if (selectedMethod === 'PAYOS') {
                const res = await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/retry-payment`, {
                    method: 'POST',
                });
                const result = await res.json();
                const payUrl = result.checkoutUrl || result.paymentUrl || result.data?.checkoutUrl || result.data?.paymentUrl;

                if (res.ok && payUrl) {
                    window.location.href = payUrl;
                } else {
                    alert(result.message && result.message !== 'Success' ? result.message : 'Error starting PayOS payment');
                }
            } else if (selectedMethod === 'IN_STORE') {
                const res = await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/payment-method`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ paymentMethod: 'IN_STORE' }),
                });
                const result = await res.json();

                if (res.ok) {
                    router.push(`/${language}/success?bookingId=${bookingCode}`);
                } else {
                    alert(result.message || 'Error updating payment method');
                }
            }
        } catch (err) {
            console.error('Lỗi xác nhận thanh toán:', err);
            alert('Error processing payment choice. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-slate-50 min-h-screen flex flex-col">
                <Header />
                <main className="flex-grow flex items-center justify-center pt-28">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        <span className="text-sm font-bold text-primary">{d.loading}</span>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="bg-slate-50 min-h-screen flex flex-col">
                <Header />
                <main className="flex-grow flex flex-col items-center justify-center pt-28 px-4 text-center">
                    <span className="material-symbols-outlined text-6xl text-error mb-4">error</span>
                    <h2 className="text-2xl font-bold mb-2">{d.errorTitle}</h2>
                    <p className="text-outline mb-6">{error || d.invalidCode}</p>
                    <button
                        onClick={() => router.push('/destinations')}
                        className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
                    >
                        {d.backBtn}
                    </button>
                </main>
                <Footer />
            </div>
        );
    }

    const isPayosExpired = timeLeft === 0;

    return (
        <div className="bg-slate-50 font-body text-on-surface flex flex-col min-h-screen">
            <style dangerouslySetInnerHTML={{
                __html: `
                .ambient-shadow { box-shadow: 0 8px 32px rgba(25, 28, 33, 0.03); }
                .option-active { border-color: #003f87; background: rgba(0, 63, 135, 0.02); }
                `
            }} />
            <Header />

            <main className="flex-grow pt-28 pb-20 px-4 md:px-8 max-w-screen-xl mx-auto w-full">
                {/* 1. Step Indicator */}
                <div className="flex items-center justify-center mb-8 gap-4 text-xs font-bold md:text-sm">
                    <div className="flex items-center gap-2 text-outline">
                        <span className="w-6 h-6 rounded-full border border-outline flex items-center justify-center text-xs">1</span>
                        <span>{d.step1}</span>
                    </div>
                    <span className="material-symbols-outlined text-outline">arrow_forward</span>
                    <div className="flex items-center gap-2 text-primary">
                        <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">2</span>
                        <span>{d.step2}</span>
                    </div>
                    <span className="material-symbols-outlined text-outline">arrow_forward</span>
                    <div className="flex items-center gap-2 text-outline">
                        <span className="w-6 h-6 rounded-full border border-outline flex items-center justify-center text-xs">3</span>
                        <span>{d.step3}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Payment Selector */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 ambient-shadow space-y-6">
                            <div>
                                <h2 className="font-headline font-bold text-xl text-on-surface">{d.title}</h2>
                                <p className="text-xs text-outline mt-1">{d.subtitle}</p>
                            </div>

                            {/* Options */}
                            <div className="space-y-4">
                                {/* PAYOS Option */}
                                <div
                                    onClick={() => !isPayosExpired && setSelectedMethod('PAYOS')}
                                    className={`relative flex flex-col p-5 rounded-xl border-2 transition-all cursor-pointer ${selectedMethod === 'PAYOS'
                                            ? 'option-active'
                                            : 'border-slate-100 hover:border-slate-200'
                                        } ${isPayosExpired ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-primary font-black text-sm shrink-0">
                                                QR
                                            </div>
                                            <div>
                                                <span className="block font-bold text-on-surface text-base">{d.payosTitle}</span>
                                                <p className="text-xs text-outline mt-1 leading-relaxed">{d.payosDesc}</p>
                                                
                                                {/* Timer indicator */}
                                                {timeLeft !== null && timeLeft > 0 && (
                                                    <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-100">
                                                        <span className="material-symbols-outlined text-sm animate-pulse">timer</span>
                                                        <span>{d.payosTimer.replace('{time}', formatTime(timeLeft))}</span>
                                                    </div>
                                                )}

                                                {isPayosExpired && (
                                                    <div className="mt-3 inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
                                                        <span className="material-symbols-outlined text-sm">error</span>
                                                        <span>{d.payosExpired}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedMethod === 'PAYOS' ? 'border-primary bg-primary' : 'border-slate-300'
                                            }`}>
                                            {selectedMethod === 'PAYOS' && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* IN_STORE Option */}
                                <div
                                    onClick={() => setSelectedMethod('IN_STORE')}
                                    className={`relative flex flex-col p-5 rounded-xl border-2 transition-all cursor-pointer ${selectedMethod === 'IN_STORE'
                                            ? 'option-active'
                                            : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                                <span className="material-symbols-outlined">store</span>
                                            </div>
                                            <div>
                                                <span className="block font-bold text-on-surface text-base">{d.inStoreTitle}</span>
                                                <p className="text-xs text-outline mt-1 leading-relaxed">{d.inStoreDesc}</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedMethod === 'IN_STORE' ? 'border-primary bg-primary' : 'border-slate-300'
                                            }`}>
                                            {selectedMethod === 'IN_STORE' && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Sub-panel details when chosen */}
                                    {selectedMethod === 'IN_STORE' && (
                                        <div className="mt-5 pt-4 border-t border-dashed border-slate-100 space-y-4 animate-fadeIn">
                                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 text-xs leading-relaxed text-on-surface-variant">
                                                <div className="flex items-start gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                                                    <div>
                                                        <strong className="text-on-surface">{d.officeLabel}</strong>
                                                        <p className="mt-0.5">{d.officeAddress}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                                                    <div>
                                                        <strong className="text-on-surface">{d.hoursLabel}</strong>
                                                        <p className="mt-0.5">{d.hoursValue}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary">call</span>
                                                    <div>
                                                        <strong className="text-on-surface">{d.phoneLabel}</strong>
                                                        <p className="mt-0.5">0386761856</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex gap-3 text-xs text-amber-800">
                                                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">info</span>
                                                <p className="leading-relaxed">{d.inStoreWarning}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CTA Action button */}
                        <div className="flex items-center justify-end gap-4">
                            <button
                                onClick={() => router.push(`/my-bookings`)}
                                className="px-6 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-sm transition-all active:scale-95 text-on-surface-variant"
                            >
                                {d.cancelBtn}
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={isSubmitting || (selectedMethod === 'PAYOS' && isPayosExpired)}
                                className="px-10 py-3.5 bg-primary text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>{d.processing}</span>
                                    </>
                                ) : selectedMethod === 'PAYOS' ? (
                                    <>
                                        <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                                        <span>{d.payosBtn}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-base">verified</span>
                                        <span>{d.inStoreBtn}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Order Summary Info */}
                    <div className="lg:col-span-4 sticky top-28 space-y-6">
                        <div className="bg-white rounded-2xl ambient-shadow border border-slate-100 overflow-hidden flex flex-col">
                            <div className="bg-slate-50 p-5 border-b border-slate-100">
                                <h3 className="font-headline font-bold text-base text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">receipt_long</span>
                                    {d.orderSummary}
                                </h3>
                            </div>
                            
                            <div className="p-5 space-y-4 text-sm">
                                {/* Tour details */}
                                <div className="flex gap-3">
                                    {booking.tour.imageUrl && (
                                        <Image
                                            src={booking.tour.imageUrl}
                                            alt={booking.tour.name}
                                            width={64}
                                            height={64}
                                            sizes="64px"
                                            className="h-16 w-16 rounded-xl object-cover shrink-0"
                                        />
                                    )}
                                    <div>
                                        <h4 className="font-bold text-on-surface line-clamp-2 leading-snug">{booking.tour.name}</h4>
                                        <span className="text-xs text-outline block mt-1">{t('checkout.departure')}: {formatDate(booking.tour.startDate)}</span>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100 border-t border-slate-100 mt-2">
                                    <div className="py-2.5 flex justify-between">
                                        <span className="text-outline">{d.orderCode}</span>
                                        <span className="font-bold text-on-surface font-mono">{booking.bookingCode}</span>
                                    </div>
                                    <div className="py-2.5 flex justify-between">
                                        <span className="text-outline">{d.leadRepresentative}</span>
                                        <span className="font-bold text-on-surface">{booking.leadTravelerName}</span>
                                    </div>
                                    <div className="py-2.5 flex justify-between">
                                        <span className="text-outline">{d.orderSummary}</span>
                                        <span className="font-bold text-on-surface">{d.passengerCount.replace('{count}', booking.numberOfPeople.toString())}</span>
                                    </div>
                                    <div className="py-4 flex justify-between items-baseline">
                                        <span className="text-outline text-xs uppercase font-bold tracking-wider">{d.totalAmount}</span>
                                        <span className="font-headline font-black text-2xl text-primary">{formatPrice(booking.totalPrice)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

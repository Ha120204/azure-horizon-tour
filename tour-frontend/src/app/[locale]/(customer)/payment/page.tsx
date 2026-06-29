'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { toastEmitter } from '@/lib/http/toastEmitter';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/http/constants';

interface EBookedTour {
    id: number;
    name: string;
    imageUrl?: string | null;
    startDate: string;
    duration?: string | null;
    durationEn?: string | null;
}

interface QRPaymentData {
    checkoutUrl: string;
    qrCode?: string;
    accountNumber?: string;
    accountName?: string;
    description: string;
    amount: number;
    expiresAt: string;
}

interface EBooking {
    id: number;
    bookingCode: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
    holdExpiresAt: string | null;
    numberOfPeople: number;
    totalPrice: number;
    leadTravelerName: string;
    tour: EBookedTour;
    departureId?: number | null;
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
        inStoreTitle: "Thanh toán tại văn phòng / cửa hàng",
        inStoreDesc: "Giữ chỗ đặt tối đa 24 giờ. Vui lòng đến chi nhánh văn phòng của chúng tôi để thanh toán trực tiếp.",
        officeLabel: "Văn phòng Azure Horizon:",
        officeAddress: "175 Phố Tây Sơn, Đống Đa, Hà Nội",
        hoursLabel: "Giờ làm việc:",
        hoursValue: "Thứ 2 - Thứ 6 (08:00 - 18:00)",
        phoneLabel: "Điện thoại hỗ trợ:",
        inStoreWarning: "Hệ thống sẽ giữ chỗ đặt tour của bạn trong 24 giờ kể từ thời điểm đăng ký. Đơn đặt sẽ tự động hủy nếu quá thời hạn trên mà chưa nhận được xác nhận thanh toán tại cửa hàng.",
        editBtn: "Quay lại sửa thông tin",
        cancelBtn: "Hủy đơn",
        payosBtn: "Thanh toán bằng mã QR",
        inStoreBtn: "Xác nhận đặt giữ chỗ",
        qrModalTitle: "Thanh toán chuyển khoản",
        qrAmount: "Số tiền",
        qrAccount: "Số tài khoản",
        qrAccountName: "Chủ tài khoản",
        qrContent: "Nội dung CK",
        qrNote: "Nhập {code} làm nội dung chuyển khoản để hệ thống tự động xác nhận. Trạng thái sẽ cập nhật sau khi ngân hàng xử lý.",
        qrClose: "Đóng",
        qrExpired: "Mã QR đã hết hạn",
        regenerateQR: "Tạo lại mã QR",
        holdExpiredWarning: "Phiên giữ chỗ đã hết — nhấn nút bên dưới để tạo lại mã QR hoặc chọn thanh toán tại cửa hàng.",
        processing: "Đang xử lý...",
        orderSummary: "Tóm tắt đơn hàng",
        orderCode: "Mã đơn hàng",
        leadRepresentative: "Người đại diện",
        passengerCount: "{count} hành khách",
        totalAmount: "Tổng tiền",
        loading: "Đang tải thông tin thanh toán...",
        errorTitle: "Đã xảy ra lỗi",
        backBtn: "Quay lại xem Tour",
        invalidCode: "Mã đặt chỗ không hợp lệ",
        payErrorTitle: "Lỗi thanh toán",
        payStartError: "Không thể khởi tạo thanh toán PayOS. Vui lòng thử lại.",
        payMethodError: "Không thể cập nhật phương thức thanh toán. Vui lòng thử lại.",
        payGenericError: "Có lỗi khi xử lý thanh toán. Vui lòng thử lại.",
        waitingPayment: "Đang chờ xác nhận thanh toán...",
        downloadQR: "Tải mã QR",
        copy: "Sao chép",
        iTransferred: "Tôi đã chuyển khoản",
        checkingNow: "Đang kiểm tra...",
        paymentSuccess: "Thanh toán thành công!",
        redirectingToConfirm: "Đang chuyển đến trang xác nhận...",
        editConfirmTitle: "Quay lại chỉnh sửa thông tin?",
        editConfirmDesc: "Đơn giữ chỗ hiện tại sẽ được hủy và chỗ ngồi mở lại. Thông tin bạn đã nhập vẫn được giữ để chỉnh sửa, sau đó bạn đặt lại và thanh toán.",
        editConfirmNo: "Không, tiếp tục thanh toán",
        editConfirmYes: "Quay lại chỉnh sửa",
        cancelConfirmTitle: "Hủy đơn đặt chỗ?",
        cancelConfirmDesc: "Đơn đặt chỗ của bạn sẽ bị hủy hoàn toàn và chỗ ngồi được trả về hệ thống. Bạn sẽ được đưa về trang chủ. Bạn có chắc chắn muốn hủy?",
        cancelConfirmNo: "Không, tiếp tục thanh toán",
        cancelConfirmYes: "Hủy đơn",
        loadingPayment: "Đang tải thông tin thanh toán..."
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
        inStoreTitle: "Pay at Office / Store",
        inStoreDesc: "Hold seats for up to 24 hours. Please visit our transaction office to pay in person.",
        officeLabel: "Azure Horizon Office:",
        officeAddress: "175 Tay Son Street, Dong Da, Hanoi",
        hoursLabel: "Working Hours:",
        hoursValue: "Monday - Friday (08:00 - 18:00)",
        phoneLabel: "Support Phone:",
        inStoreWarning: "The system will hold your tour reservation for 24 hours. The booking will automatically cancel after this deadline if store payment confirmation is not received.",
        editBtn: "Back to edit details",
        cancelBtn: "Cancel booking",
        payosBtn: "Pay with QR Code",
        inStoreBtn: "Confirm Reservation",
        qrModalTitle: "Bank Transfer Payment",
        qrAmount: "Amount",
        qrAccount: "Account Number",
        qrAccountName: "Account Name",
        qrContent: "Transfer Content",
        qrNote: "Enter {code} as transfer content for automatic confirmation. Status updates after bank processing.",
        qrClose: "Close",
        qrExpired: "QR code expired",
        regenerateQR: "Generate new QR code",
        holdExpiredWarning: "Hold period has ended — click the button below to generate a new QR code or choose in-store payment.",
        processing: "Processing...",
        orderSummary: "Order Summary",
        orderCode: "Order Code",
        leadRepresentative: "Lead Traveler",
        passengerCount: "{count} passenger(s)",
        totalAmount: "Total Amount",
        loading: "Loading payment details...",
        errorTitle: "An error occurred",
        backBtn: "Back to Explore Tours",
        invalidCode: "Invalid booking code",
        payErrorTitle: "Payment error",
        payStartError: "Could not start PayOS payment. Please try again.",
        payMethodError: "Could not update payment method. Please try again.",
        payGenericError: "Something went wrong while processing payment. Please try again.",
        waitingPayment: "Waiting for payment confirmation...",
        downloadQR: "Download QR",
        copy: "Copy",
        iTransferred: "I've Transferred",
        checkingNow: "Checking...",
        paymentSuccess: "Payment successful!",
        redirectingToConfirm: "Redirecting to confirmation page...",
        editConfirmTitle: "Go back to edit details?",
        editConfirmDesc: "Your current held order will be cancelled and the seats released. The details you entered are kept so you can edit them, then book again and pay.",
        editConfirmNo: "No, Continue Payment",
        editConfirmYes: "Go back to edit",
        cancelConfirmTitle: "Cancel this booking?",
        cancelConfirmDesc: "Your booking will be fully cancelled and the seats released back to the system. You will be taken to the homepage. Are you sure you want to cancel?",
        cancelConfirmNo: "No, Continue Payment",
        cancelConfirmYes: "Cancel booking",
        loadingPayment: "Loading payment details..."
    }
};

function PaymentSelectorContent() {
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
    const [qrPaymentData, setQrPaymentData] = useState<QRPaymentData | null>(null);
    const [qrSuccess, setQrSuccess] = useState(false);
    const [officeSettings, setOfficeSettings] = useState<{ company_address?: string; company_address_en?: string } | null>(null);

    // Cuộn lên đầu trang khi component mount (kể cả khi bấm back/forward)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if ('scrollRestoration' in window.history) {
                window.history.scrollRestoration = 'manual';
            }
            window.scrollTo(0, 0);
        }
    }, []);

    const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

    // Chặn nút Back của trình duyệt (popstate) → coi như "quay lại sửa thông tin"
    // (luồng ít phá hủy nhất, đưa khách về checkout với dữ liệu được giữ nguyên).
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.history.pushState(null, '', window.location.href);

            const handlePopState = (e: PopStateEvent) => {
                e.preventDefault();
                setIsEditConfirmOpen(true);
                window.history.pushState(null, '', window.location.href);
            };

            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, []);

    // Hủy đơn giữ chỗ hiện tại (giải phóng ghế). Đơn PENDING chưa thanh toán bị hủy
    // ngay phía backend, ghế được trả lại.
    const cancelHeldBooking = async (reason: string) => {
        if (!booking) return;
        await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/cancel-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
    };

    // "Quay lại sửa thông tin": hủy hold rồi về checkout. Dữ liệu đã nhập vẫn còn
    // trong sessionStorage nên khách chỉ cần chỉnh và đặt lại.
    const handleEditBack = async () => {
        if (!booking) {
            router.push(`/${language}/destinations`);
            return;
        }
        const depQuery = booking.departureId ? `&departureId=${booking.departureId}` : '';
        try {
            setIsSubmitting(true);
            await cancelHeldBooking('Khách quay lại sửa thông tin');
        } catch (error) {
            console.error('Lỗi khi quay lại sửa thông tin:', error);
        } finally {
            setIsSubmitting(false);
            setIsEditConfirmOpen(false);
            router.push(`/${language}/checkout?tourId=${booking.tour.id}${depQuery}`);
        }
    };

    // "Hủy đơn": hủy hold rồi về trang chủ.
    const handleCancelOrder = async () => {
        try {
            setIsSubmitting(true);
            await cancelHeldBooking('Khách hủy đơn');
        } catch (error) {
            console.error('Lỗi khi hủy đơn:', error);
        } finally {
            setIsSubmitting(false);
            setIsCancelConfirmOpen(false);
            router.push(`/${language}`);
        }
    };

    const lang = (language === 'vi' || language === 'en') ? language : 'vi';
    const d = dict[lang];
    const officeAddress = (lang === 'en'
        ? (officeSettings?.company_address_en?.trim() || officeSettings?.company_address)
        : officeSettings?.company_address) || d.officeAddress;

    useEffect(() => {
        fetch(`${API_BASE_URL}/settings/public`)
            .then(r => r.json())
            .then(json => { if (json.data) setOfficeSettings(json.data); })
            .catch(() => {});
    }, []);

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

    // 2. Countdown timer: dùng holdExpiresAt từ server (rolling window, reset sau mỗi lần tạo lại QR)
    useEffect(() => {
        if (!booking) return;

        const limitTime = booking.holdExpiresAt
            ? new Date(booking.holdExpiresAt).getTime()
            : new Date(booking.createdAt).getTime() + 15 * 60 * 1000;

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

    // 3. Poll PayOS while QR modal is open + manual check
    const checkPaymentOnce = async (): Promise<boolean> => {
        if (!booking) return false;
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/check-payment`, {
                method: 'POST',
            });
            const result = await res.json();
            const data = result.data ?? result;
            if (res.ok && data?.synced === true) {
                setQrSuccess(true);
                setTimeout(() => {
                    setQrPaymentData(null);
                    setQrSuccess(false);
                    router.push(`/${language}/success?bookingId=${bookingCode}`);
                }, 1500);
                return true;
            }
        } catch {
            // ignore network errors
        }
        return false;
    };

    useEffect(() => {
        if (!qrPaymentData || !booking) return;

        const poll = setInterval(async () => {
            const confirmed = await checkPaymentOnce();
            if (confirmed) clearInterval(poll);
        }, 4000);

        return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qrPaymentData, booking, bookingCode, language, router]);

    // 4. Confirming and proceeding with payment
    const handleConfirmPayment = async () => {
        if (!booking) return;

        try {
            setIsSubmitting(true);

            if (selectedMethod === 'PAYOS') {
                const res = await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/retry-payment`, {
                    method: 'POST',
                });
                const result = await res.json();
                const data = result.data ?? result;

                if (res.ok && data.checkoutUrl) {
                    if (data.qrCode && data.accountNumber) {
                        setQrPaymentData({
                            checkoutUrl: data.checkoutUrl,
                            qrCode: data.qrCode,
                            accountNumber: data.accountNumber,
                            accountName: data.accountName,
                            description: data.description,
                            amount: data.amount,
                            expiresAt: data.expiresAt,
                        });
                        // Đồng bộ holdExpiresAt để timer đếm ngược reset theo rolling window mới
                        if (data.expiresAt) {
                            setBooking(prev => prev ? { ...prev, holdExpiresAt: data.expiresAt } : prev);
                        }
                    } else {
                        window.location.href = data.checkoutUrl;
                    }
                } else {
                    toastEmitter.error(
                        d.payErrorTitle,
                        result.message && result.message !== 'Success' ? result.message : d.payStartError,
                    );
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
                    toastEmitter.error(d.payErrorTitle, result.message || d.payMethodError);
                }
            }
        } catch (err) {
            console.error('Lỗi xác nhận thanh toán:', err);
            toastEmitter.error(d.payErrorTitle, d.payGenericError);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <main className="flex-grow flex items-center justify-center pt-28">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <span className="text-sm font-bold text-primary">{d.loading}</span>
                </div>
            </main>
        );
    }

    if (error || !booking) {
        return (
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
        );
    }

    return (
        <>
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
                                    onClick={() => setSelectedMethod('PAYOS')}
                                    className={`relative flex flex-col p-5 rounded-xl border-2 transition-all cursor-pointer ${selectedMethod === 'PAYOS'
                                            ? 'option-active'
                                            : 'border-slate-100 hover:border-slate-200'
                                        }`}
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
                                                {timeLeft === 0 && (
                                                    <div className="mt-3 flex items-start gap-2 bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-xs border border-slate-200">
                                                        <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">info</span>
                                                        <span>{d.holdExpiredWarning}</span>
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
                                                        <p className="mt-0.5">{officeAddress}</p>
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
                        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditConfirmOpen(true)}
                                    className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-on-surface-variant shadow-sm outline-none transition-[background-color,border-color,box-shadow,transform,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-on-surface hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
                                >
                                    <span
                                        className="material-symbols-outlined text-[17px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5 motion-reduce:transform-none"
                                        aria-hidden="true"
                                    >
                                        arrow_back
                                    </span>
                                    <span>{d.editBtn}</span>
                                </button>
                                <button
                                    onClick={() => setIsCancelConfirmOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-red-600 outline-none transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:scale-[0.98]"
                                >
                                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">close</span>
                                    <span>{d.cancelBtn}</span>
                                </button>
                            </div>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={isSubmitting}
                                className="group relative inline-flex min-w-[250px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-10 py-3.5 text-sm font-bold text-white shadow-md shadow-primary/20 outline-none transition-[background-color,box-shadow,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-primary disabled:hover:shadow-md disabled:hover:shadow-primary/20 motion-reduce:transform-none"
                            >
                                <span
                                    className="pointer-events-none absolute inset-y-0 -left-1/3 z-0 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[420%] group-hover:opacity-100 group-disabled:opacity-0 motion-reduce:hidden"
                                    aria-hidden="true"
                                />
                                {isSubmitting ? (
                                    <span className="relative z-10 inline-flex items-center justify-center gap-2">
                                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin motion-reduce:animate-none" />
                                        <span>{d.processing}</span>
                                    </span>
                                ) : selectedMethod === 'PAYOS' ? (
                                    <span className="relative z-10 inline-flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-base transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:-translate-x-0.5 motion-reduce:transform-none">qr_code_scanner</span>
                                        <span>{d.payosBtn}</span>
                                        <span
                                            className="material-symbols-outlined translate-x-[-0.35rem] text-[17px] opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:translate-x-0 motion-reduce:opacity-100"
                                            aria-hidden="true"
                                        >
                                            arrow_forward
                                        </span>
                                    </span>
                                ) : (
                                    <span className="relative z-10 inline-flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-base transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 motion-reduce:transform-none">verified</span>
                                        <span>{d.inStoreBtn}</span>
                                    </span>
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

            {qrPaymentData && (
                <QRPaymentModal
                    data={qrPaymentData}
                    timeLeft={timeLeft}
                    isSuccess={qrSuccess}
                    d={d}
                    formatPrice={formatPrice}
                    formatTime={formatTime}
                    onClose={() => { setQrPaymentData(null); setQrSuccess(false); }}
                    onManualCheck={checkPaymentOnce}
                    onRegenerate={handleConfirmPayment}
                />
            )}

            <ConfirmDialog
                isOpen={isEditConfirmOpen}
                onClose={() => setIsEditConfirmOpen(false)}
                onConfirm={handleEditBack}
                isSubmitting={isSubmitting}
                tone="primary"
                icon="edit"
                title={d.editConfirmTitle}
                desc={d.editConfirmDesc}
                cancelLabel={d.editConfirmNo}
                confirmLabel={d.editConfirmYes}
            />

            <ConfirmDialog
                isOpen={isCancelConfirmOpen}
                onClose={() => setIsCancelConfirmOpen(false)}
                onConfirm={handleCancelOrder}
                isSubmitting={isSubmitting}
                tone="danger"
                icon="warning"
                title={d.cancelConfirmTitle}
                desc={d.cancelConfirmDesc}
                cancelLabel={d.cancelConfirmNo}
                confirmLabel={d.cancelConfirmYes}
            />
        </>
    );
}

interface QRPaymentModalProps {
    data: QRPaymentData;
    timeLeft: number | null;
    isSuccess: boolean;
    d: typeof dict['vi'];
    formatPrice: (n: number) => string;
    formatTime: (s: number) => string;
    onClose: () => void;
    onManualCheck?: () => Promise<boolean>;
    onRegenerate?: () => Promise<void>;
}

function QRPaymentModal({ data, timeLeft, isSuccess, d, formatPrice, formatTime, onClose, onManualCheck, onRegenerate }: QRPaymentModalProps) {
    const [copied, setCopied] = useState<string | null>(null);
    const [isManualChecking, setIsManualChecking] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    const handleManualCheck = async () => {
        if (!onManualCheck || isManualChecking) return;
        setIsManualChecking(true);
        try {
            await onManualCheck();
        } finally {
            setIsManualChecking(false);
        }
    };

    const handleRegenerate = async () => {
        if (!onRegenerate || isRegenerating) return;
        setIsRegenerating(true);
        try {
            await onRegenerate();
        } finally {
            setIsRegenerating(false);
        }
    };

    const copy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDownload = () => {
        const svgEl = qrRef.current?.querySelector('svg');
        if (!svgEl) return;

        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svgEl);
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new window.Image();
        img.onload = () => {
            const padding = 24;
            const canvas = document.createElement('canvas');
            canvas.width = img.width + padding * 2;
            canvas.height = img.height + padding * 2;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding);
            URL.revokeObjectURL(svgUrl);

            canvas.toBlob((blob) => {
                if (!blob) return;
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `QR-${data.description}.png`;
                a.click();
                URL.revokeObjectURL(a.href);
            }, 'image/png');
        };
        img.src = svgUrl;
    };

    const isExpired = timeLeft === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

            <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-[440px] flex flex-col overflow-hidden">

                {/* Success overlay */}
                {isSuccess && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white rounded-3xl gap-4">
                        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-emerald-500">check_circle</span>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-lg text-on-surface">{d.paymentSuccess}</p>
                            <p className="text-sm text-outline mt-1">{d.redirectingToConfirm}</p>
                        </div>
                        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-7 pb-5">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">credit_card</span>
                        <h3 className="font-bold text-on-surface text-lg">{d.qrModalTitle}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-outline hover:text-on-surface"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center px-7 pb-5">
                    <div className="relative">
                        <div ref={qrRef} className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-opacity ${isExpired ? 'opacity-20 grayscale' : ''}`}>
                            {data.qrCode ? (
                                <QRCode
                                    value={data.qrCode}
                                    size={220}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                    level="M"
                                />
                            ) : (
                                <div className="w-[220px] h-[220px] flex items-center justify-center bg-slate-50 rounded-xl">
                                    <span className="material-symbols-outlined text-5xl text-outline">qr_code_2</span>
                                </div>
                            )}
                        </div>
                        {isExpired && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl">
                                <span className="material-symbols-outlined text-4xl text-slate-400">qr_code_off</span>
                                <span className="text-xs font-bold text-slate-500">{d.qrExpired}</span>
                            </div>
                        )}
                    </div>

                    {/* Timer */}
                    {!isExpired && timeLeft !== null && timeLeft > 0 && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-amber-700 text-sm font-bold">
                            <span className="material-symbols-outlined text-sm animate-pulse">timer</span>
                            <span>{d.payosTimer.replace('{time}', formatTime(timeLeft))}</span>
                        </div>
                    )}
                </div>

                {/* Bank Info */}
                <div className="mx-7 mb-4 border border-slate-100 rounded-2xl divide-y divide-slate-100 text-sm">
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-outline">{d.qrAmount}</span>
                        <span className="font-black text-primary text-base">{formatPrice(data.amount)}</span>
                    </div>

                    {data.accountNumber && (
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-outline">{d.qrAccount}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-on-surface">{data.accountNumber}</span>
                                <button
                                    onClick={() => copy(data.accountNumber!, 'account')}
                                    className="text-outline hover:text-primary transition-colors"
                                    title={d.copy}
                                >
                                    <span className="material-symbols-outlined text-base">
                                        {copied === 'account' ? 'check' : 'content_copy'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {data.accountName && (
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-outline">{d.qrAccountName}</span>
                            <span className="font-bold text-on-surface">{data.accountName}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-outline">{d.qrContent}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-on-surface tracking-wide">{data.description}</span>
                            <button
                                onClick={() => copy(data.description, 'desc')}
                                className="text-outline hover:text-primary transition-colors"
                                title="Sao chép"
                            >
                                <span className="material-symbols-outlined text-base">
                                    {copied === 'desc' ? 'check' : 'content_copy'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Note */}
                <p className="mx-7 mb-4 text-xs text-outline text-center leading-relaxed">
                    {d.qrNote.replace('{code}', data.description)}
                </p>

                {/* Waiting indicator */}
                {!isExpired && !isSuccess && (
                    <div className="mx-7 mb-5 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                        </span>
                        <span>{d.waitingPayment}</span>
                    </div>
                )}

                {/* Footer */}
                <div className="px-7 pb-7 flex flex-col gap-2">
                    {isExpired && !isSuccess && onRegenerate && (
                        <button
                            onClick={handleRegenerate}
                            disabled={isRegenerating}
                            className="w-full py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isRegenerating ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    {d.processing}
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">refresh</span>
                                    {d.regenerateQR}
                                </>
                            )}
                        </button>
                    )}
                    {!isExpired && !isSuccess && onManualCheck && (
                        <button
                            onClick={handleManualCheck}
                            disabled={isManualChecking}
                            className="w-full py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isManualChecking ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    {d.checkingNow}
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">task_alt</span>
                                    {d.iTransferred}
                                </>
                            )}
                        </button>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={handleDownload}
                            disabled={isExpired || !data.qrCode}
                            className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-on-surface hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-base">download</span>
                            {d.downloadQR}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-on-surface hover:bg-slate-50 transition-colors"
                        >
                            {d.qrClose}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    tone: 'danger' | 'primary';
    icon: string;
    title: string;
    desc: string;
    cancelLabel: string;
    confirmLabel: string;
}

function ConfirmDialog({ isOpen, onClose, onConfirm, isSubmitting, tone, icon, title, desc, cancelLabel, confirmLabel }: ConfirmDialogProps) {
    if (!isOpen) return null;

    const iconWrapClass = tone === 'danger'
        ? 'bg-red-50 border-red-100 text-red-600'
        : 'bg-primary/10 border-primary/15 text-primary';
    const confirmBtnClass = tone === 'danger'
        ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
        : 'bg-primary hover:bg-primary-container shadow-primary/20';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full relative z-10 shadow-2xl border border-slate-100 transform transition-all scale-100 flex flex-col items-center text-center animate-fade-in-up">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 border ${iconWrapClass}`}>
                    <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>

                <h3 className="font-headline font-bold text-xl text-on-surface mb-3">
                    {title}
                </h3>

                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    {desc}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full mt-auto">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 px-5 py-3.5 border border-slate-200 hover:bg-slate-50 font-bold text-sm rounded-xl text-on-surface transition-all active:scale-95 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className={`flex-1 px-5 py-3.5 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg disabled:opacity-50 ${confirmBtnClass}`}
                    >
                        {isSubmitting && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PaymentLoadingFallback() {
    const { language } = useLocale();
    const lang = (language === 'vi' || language === 'en') ? language : 'vi';
    return (
        <main className="flex-grow flex items-center justify-center pt-28">
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <span className="text-sm font-bold text-primary">{dict[lang].loadingPayment}</span>
            </div>
        </main>
    );
}

export default function PaymentSelectorPage() {
    return (
        <div className="bg-slate-50 font-body text-on-surface flex flex-col min-h-screen">
            <Header />
            <Suspense fallback={<PaymentLoadingFallback />}>
                <PaymentSelectorContent />
            </Suspense>
            <Footer />
        </div>
    );
}

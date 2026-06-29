'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { toastEmitter } from '@/lib/http/toastEmitter';
import { useLocale } from '@/context/LocaleContext';
import { EXPIRY_MINUTES, type BookingDetail, type BankOption, type PaymentIssueResult, type QRPaymentData } from '../_lib/types';

export const FALLBACK_BANK_OPTIONS: BankOption[] = [
    { shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
    { shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
    { shortName: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam' },
    { shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
    { shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
    { shortName: 'MB', name: 'Ngân hàng TMCP Quân đội' },
    { shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
    { shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
    { shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong' },
    { shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
    { shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM' },
    { shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam' },
    { shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
    { shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
    { shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
    { shortName: 'Khác', name: 'Ngân hàng khác' },
];

export function useCountdown(expiresAt: string | undefined) {
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    useEffect(() => {
        if (!expiresAt) return;
        const expiryTime = new Date(expiresAt).getTime();
        if (Number.isNaN(expiryTime)) return;
        const tick = () => {
            const diff = Math.floor((expiryTime - Date.now()) / 1000);
            setSecondsLeft(diff > 0 ? diff : 0);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);
    return secondsLeft;
}

export function useBookingDetail() {
    const params = useParams();
    const router = useRouter();
    const { formatNumber, language } = useLocale();

    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [payError, setPayError] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [paymentIssueResult, setPaymentIssueResult] = useState<PaymentIssueResult | null>(null);
    const [paymentData, setPaymentData] = useState<QRPaymentData | null>(null);
    const [qrSuccess, setQrSuccess] = useState(false);
    const [banksList, setBanksList] = useState<BankOption[]>(FALLBACK_BANK_OPTIONS);
    const [isBankListLoading, setIsBankListLoading] = useState(false);

    useEffect(() => {
        setIsLoggedIn(!new URLSearchParams(window.location.search).get('email'));
    }, []);

    const fetchBooking = useCallback(async () => {
        setFetchError(false);
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        const codeParam = urlParams.get('code');
        try {
            let res;
            if (emailParam && codeParam) {
                res = await fetch(`${API_BASE_URL}/booking/public/lookup?bookingCode=${codeParam}&email=${encodeURIComponent(emailParam)}`);
            } else {
                res = await fetchWithAuth(`${API_BASE_URL}/booking/my/${params.id}?locale=${language}`);
            }
            if (res.ok) {
                const result = await res.json();
                if (result.data) setBooking(result.data);
                else router.push(emailParam && codeParam ? '/' : '/my-bookings');
            } else if (res.status === 404) {
                setBooking(null);
            } else {
                setFetchError(true);
            }
        } catch (error) {
            console.error('Lỗi tải chi tiết đơn hàng:', error);
            setFetchError(true);
        } finally {
            setIsLoading(false);
        }
    }, [params.id, router, language]);

    useEffect(() => { fetchBooking(); }, [fetchBooking]);

    useEffect(() => {
        if (!showIssueForm) return;
        let ignore = false;
        setIsBankListLoading(true);
        fetch('https://api.vietqr.io/v2/banks')
            .then(res => res.json())
            .then((json: { code?: string; data?: BankOption[] }) => {
                if (!ignore && json.code === '00' && Array.isArray(json.data) && json.data.length > 0) {
                    setBanksList(json.data);
                }
            })
            .catch(error => console.error('Lỗi lấy danh sách ngân hàng:', error))
            .finally(() => { if (!ignore) setIsBankListLoading(false); });
        return () => { ignore = true; };
    }, [showIssueForm]);

    const handleRetryPayment = useCallback(async () => {
        if (!booking || isPaying) return;
        setIsPaying(true); setPayError('');
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const emailParam = urlParams.get('email');
            let res;
            if (emailParam) {
                res = await fetch(`${API_BASE_URL}/booking/public/retry-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingCode: booking.bookingCode, email: emailParam }),
                });
            } else {
                res = await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/retry-payment`, { method: 'POST' });
            }
            const result = await res.json();
            const checkoutUrl = result.data?.checkoutUrl || result.checkoutUrl;
            if (res.ok && checkoutUrl) {
                const data = result.data ?? result;
                if (data.qrCode && data.accountNumber) {
                    setPaymentData({
                        checkoutUrl,
                        qrCode: data.qrCode,
                        accountNumber: data.accountNumber,
                        accountName: data.accountName,
                        description: data.description,
                        amount: data.amount,
                        expiresAt: data.expiresAt,
                    });
                } else {
                    window.location.href = checkoutUrl;
                }
            } else { setPayError(result.message ?? 'Không thể tạo liên kết thanh toán. Vui lòng thử lại.'); }
        } catch { setPayError('Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.'); }
        finally { setIsPaying(false); }
    }, [booking, isPaying]);

    // Poll for payment confirmation while QR modal is open
    useEffect(() => {
        if (!paymentData || !booking) return;
        const poll = setInterval(async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/check-payment`, { method: 'POST' });
                const result = await res.json();
                const data = result.data ?? result;
                if (res.ok && data?.synced === true) {
                    clearInterval(poll);
                    setQrSuccess(true);
                    setTimeout(() => {
                        setPaymentData(null);
                        setQrSuccess(false);
                        router.push(`/success?bookingId=${booking.bookingCode}`);
                    }, 1500);
                }
            } catch { /* ignore poll errors */ }
        }, 4000);
        return () => clearInterval(poll);
    }, [paymentData, booking, router]);

    const handleCancelSuccess = useCallback((immediate: boolean) => {
        setShowCancelModal(false);
        if (immediate) {
            toastEmitter.success(
                language === 'vi' ? 'Đã hủy tour thành công' : 'Tour cancelled',
                language === 'vi' ? 'Đặt tour của bạn đã được hủy.' : 'Your booking has been cancelled.',
            );
        } else {
            toastEmitter.success(
                language === 'vi' ? 'Đã gửi yêu cầu hủy' : 'Cancellation requested',
                language === 'vi'
                    ? 'Chúng tôi sẽ xử lý và thông báo kết quả trong vòng 1–3 ngày làm việc.'
                    : 'We will process and notify you within 1–3 business days.',
            );
        }
        fetchBooking();
    }, [fetchBooking, language]);

    const submitPaymentIssue = useCallback(async (data: {
        amount: number;
        transferredAt: string;
        transactionRef: string;
        senderBank: string;
        senderAccountName: string;
        note: string;
    }): Promise<{ success: boolean; error?: string }> => {
        if (!booking) return { success: false, error: 'Không tìm thấy thông tin đặt tour.' };
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/payment-issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: data.amount,
                    transferredAt: data.transferredAt,
                    transactionRef: data.transactionRef,
                    senderBank: data.senderBank,
                    senderAccountName: data.senderAccountName,
                    message: data.note || `Khách báo đã chuyển ${formatNumber(data.amount)}đ nhưng hệ thống chưa ghi nhận.`,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message ?? 'Gửi yêu cầu không thành công');
            const responseData = json?.data ?? json;
            setPaymentIssueResult({
                message: responseData?.message ?? 'Đã nhận yêu cầu kiểm tra thanh toán.',
                ticketId: responseData?.ticketId,
                accessCode: responseData?.accessCode,
            });
            setShowIssueForm(false);
            fetchBooking();
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: e instanceof Error ? e.message : 'Lỗi kết nối. Vui lòng thử lại.' };
        }
    }, [booking, formatNumber, fetchBooking]);

    const paymentHoldExpiresAt =
        booking?.paymentStatus === 'UNPAID' && booking?.status === 'PENDING' && booking?.paymentMethod === 'PAYOS'
            ? booking.holdExpiresAt ??
              new Date(new Date(booking.createdAt).getTime() + EXPIRY_MINUTES * 60 * 1000).toISOString()
            : undefined;
    const secondsLeft = useCountdown(paymentHoldExpiresAt);
    const isExpired = secondsLeft !== null && secondsLeft <= 0;
    const isPaid = booking?.paymentStatus === 'PAID' && booking?.status === 'CONFIRMED';
    const isPending = booking?.paymentStatus === 'UNPAID' && booking?.status === 'PENDING';
    const isPaymentReviewing =
        (booking?.paymentStatus === 'PROCESSING' && booking?.status === 'PENDING') ||
        Boolean(paymentIssueResult);
    const isCancelled = booking?.status === 'CANCELLED';
    const isCancelRequested = booking?.status === 'CANCEL_REQUESTED';
    const cancellationPolicy = booking?.cancellationPolicy;
    const canCancelBooking = Boolean(cancellationPolicy?.canCancel) && isLoggedIn;
    const tripLifecycle = cancellationPolicy?.tripLifecycle ?? 'UPCOMING';
    const departureDate =
        (booking?.departureDate ?? cancellationPolicy?.departureDate ?? booking?.tour?.startDate) ??
        undefined;
    const tripUnavailableReason =
        cancellationPolicy?.cancelUnavailableReason ??
        (tripLifecycle === 'COMPLETED' ? 'Chuyến đi đã hoàn thành.' : 'Không thể hủy online ở thời điểm này.');
    const totalPriceNumber = Number(booking?.totalPrice ?? 0);
    const refundAmountNumber = Number(booking?.refundAmount ?? 0);
    const paymentSupportTicket = booking?.supportTickets?.find(ticket => {
        const subject = ticket.subject?.toLowerCase() ?? '';
        return subject.includes('thanh toán') || subject.includes('payment');
    });

    return {
        booking,
        isLoading,
        fetchError,
        refetchBooking: fetchBooking,
        isPaying,
        payError,
        showCancelModal,
        setShowCancelModal,
        isLoggedIn,
        showIssueForm,
        setShowIssueForm,
        paymentIssueResult,
        setPaymentIssueResult,
        banksList,
        isBankListLoading,
        secondsLeft,
        isExpired,
        isPaid,
        isPending,
        isPaymentReviewing,
        isCancelled,
        isCancelRequested,
        cancellationPolicy,
        canCancelBooking,
        tripLifecycle,
        departureDate,
        tripUnavailableReason,
        totalPriceNumber,
        refundAmountNumber,
        paymentSupportTicket,
        paymentData,
        qrSuccess,
        clearPaymentData: () => { setPaymentData(null); setQrSuccess(false); },
        handleRetryPayment,
        handleCancelSuccess,
        submitPaymentIssue,
    };
}

'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useLocale } from '@/context/LocaleContext';
import CancelBookingModal from '@/components/booking/CancelBookingModal';
import { API_BASE_URL } from '@/lib/constants';

const EXPIRY_MINUTES = 15;

type TripLifecycle = 'UPCOMING' | 'DEPARTING_TODAY' | 'COMPLETED';

type CancellationPolicy = {
    canCancel: boolean;
    tripLifecycle: TripLifecycle;
    cancelUnavailableReason?: string;
    refundPercent: number;
    estimatedRefundAmount: number;
    refundNote: string;
    policyTier: string;
    departureDate: string;
    daysUntilDeparture: number;
};

type BookingDetail = {
    id: number;
    bookingCode: string;
    status: string;
    paymentStatus: string;
    paymentMethod?: string | null;
    createdAt: string;
    numberOfPeople: number;
    totalPrice: number | string;
    cancelReason?: string | null;
    cancelRequestedAt?: string | null;
    cancelledAt?: string | null;
    refundAmount?: number | string | null;
    refundNote?: string | null;
    cancellationPolicy?: CancellationPolicy;
    supportTickets?: { id: number; status: string; subject?: string | null; createdAt: string }[];
    tour?: {
        id?: number;
        name?: string;
        tourCode?: string;
        imageUrl?: string | null;
        duration?: string | null;
        startDate?: string | null;
    } | null;
};

type PaymentIssueForm = {
    amount: string;
    transferredAt: string;
    transactionRef: string;
    senderBank: string;
    senderAccountName: string;
    note: string;
};

type PaymentIssueResult = {
    message: string;
    ticketId?: number;
    accessCode?: string;
};

type BankOption = {
    shortName: string;
    name: string;
    logo?: string;
};

const createEmptyPaymentIssueForm = (): PaymentIssueForm => ({
    amount: '',
    transferredAt: '',
    transactionRef: '',
    senderBank: '',
    senderAccountName: '',
    note: '',
});

const FALLBACK_BANK_OPTIONS: BankOption[] = [
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

function parseMoneyInput(value: string) {
    const normalized = value.replace(/[^\d]/g, '');
    return normalized ? Number(normalized) : 0;
}

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
    if (paymentStatus === 'PROCESSING') {
        return (
            <div className="bg-sky-50 px-3 py-1 rounded-full flex items-center gap-2 border border-sky-100">
                <span className="material-symbols-outlined text-sky-600 text-sm">fact_check</span>
                <span className="text-[10px] font-bold text-sky-700 uppercase">Đang Kiểm Tra</span>
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
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [payError, setPayError] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelSuccess, setCancelSuccess] = useState(false);
    const { t, formatPrice, formatNumber, formatDate, formatDateTime, language } = useLocale();

    const secondsLeft = useCountdown(
        booking?.paymentStatus === 'UNPAID' && booking?.status === 'PENDING' && booking?.paymentMethod === 'PAYOS'
            ? booking?.createdAt : undefined
    );
    const isExpired = secondsLeft !== null && secondsLeft <= 0;

    const fetchBooking = useCallback(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        const codeParam = urlParams.get('code');

        try {
            let res;
            if (emailParam && codeParam) {
                res = await fetch(`${API_BASE_URL}/booking/public/lookup?bookingCode=${codeParam}&email=${encodeURIComponent(emailParam)}`);
            } else {
                res = await fetchWithAuth(`${API_BASE_URL}/booking/my/${params.id}`);
            }

            if (res.ok) {
                const result = await res.json();
                if (result.data) setBooking(result.data);
                else {
                    if (emailParam && codeParam) {
                        router.push('/');
                    } else {
                        router.push('/my-bookings');
                    }
                }
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
            const urlParams = new URLSearchParams(window.location.search);
            const emailParam = urlParams.get('email');

            let res;
            if (emailParam) {
                res = await fetch(`${API_BASE_URL}/booking/public/retry-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingCode: booking.bookingCode, email: emailParam })
                });
            } else {
                res = await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/retry-payment`, { method: 'POST' });
            }

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

    // Payment verification request
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [paymentIssueForm, setPaymentIssueForm] = useState<PaymentIssueForm>(() => createEmptyPaymentIssueForm());
    const [isReportingIssue, setIsReportingIssue] = useState(false);
    const [paymentIssueResult, setPaymentIssueResult] = useState<PaymentIssueResult | null>(null);
    const [issueError, setIssueError] = useState('');
    const [banksList, setBanksList] = useState<BankOption[]>(FALLBACK_BANK_OPTIONS);
    const [isBankListLoading, setIsBankListLoading] = useState(false);
    const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
    const [bankSearchQuery, setBankSearchQuery] = useState('');
    const bankDropdownRef = useRef<HTMLDivElement>(null);
    const paymentIssueDialogRef = useRef<HTMLDivElement>(null);
    const paymentIssueErrorId = 'payment-issue-error';
    const paymentBankLabelId = 'payment-issue-bank-label';
    const paymentBankButtonId = 'payment-issue-bank-button';
    const paymentBankListboxId = 'payment-issue-bank-listbox';
    const paymentBankSearchId = 'payment-issue-bank-search';
    const paymentAmountId = 'payment-issue-amount';
    const paymentTransferredAtId = 'payment-issue-transferred-at';
    const paymentTransactionRefId = 'payment-issue-transaction-ref';
    const paymentSenderAccountId = 'payment-issue-sender-account';
    const paymentNoteId = 'payment-issue-note';

    const updatePaymentIssueForm = useCallback((patch: Partial<PaymentIssueForm>) => {
        setPaymentIssueForm(previous => ({ ...previous, ...patch }));
        if (issueError) setIssueError('');
    }, [issueError]);

    const selectedBank = useMemo(
        () => banksList.find(bank => bank.shortName === paymentIssueForm.senderBank),
        [banksList, paymentIssueForm.senderBank],
    );

    const filteredBanks = useMemo(() => {
        const query = bankSearchQuery.trim().toLowerCase();
        if (!query) return banksList;
        return banksList.filter(bank =>
            bank.shortName.toLowerCase().includes(query) ||
            bank.name.toLowerCase().includes(query)
        );
    }, [bankSearchQuery, banksList]);

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
            .finally(() => {
                if (!ignore) setIsBankListLoading(false);
            });

        return () => { ignore = true; };
    }, [showIssueForm]);

    useEffect(() => {
        if (!showIssueForm || !isBankDropdownOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
                setIsBankDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isBankDropdownOpen, showIssueForm]);

    useEffect(() => {
        if (!showIssueForm) return;
        paymentIssueDialogRef.current?.focus();
    }, [showIssueForm]);

    useEffect(() => {
        if (!showIssueForm) return;

        const handleKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (isBankDropdownOpen) {
                setIsBankDropdownOpen(false);
                return;
            }
            setShowIssueForm(false);
            setIssueError('');
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isBankDropdownOpen, showIssueForm]);

    const handleReportIssue = async () => {
        if (!booking || isReportingIssue) return;

        const amount = parseMoneyInput(paymentIssueForm.amount);
        const transactionRef = paymentIssueForm.transactionRef.trim();
        const senderBank = paymentIssueForm.senderBank.trim();
        const senderAccountName = paymentIssueForm.senderAccountName.trim();
        const note = paymentIssueForm.note.trim();

        if (amount <= 0) {
            setIssueError('Vui lòng nhập số tiền bạn đã chuyển.');
            return;
        }
        if (!paymentIssueForm.transferredAt) {
            setIssueError('Vui lòng nhập thời gian chuyển khoản.');
            return;
        }
        if (transactionRef.length < 4) {
            setIssueError('Vui lòng nhập mã giao dịch hoặc nội dung chuyển khoản.');
            return;
        }
        if (!senderBank) {
            setIssueError('Vui lòng chọn ngân hàng chuyển khoản.');
            return;
        }
        if (senderAccountName.length < 2) {
            setIssueError('Vui lòng nhập tên chủ tài khoản chuyển.');
            return;
        }
        setIsReportingIssue(true); setIssueError('');
        try {
            const senderBankLabel = selectedBank
                ? `${selectedBank.shortName} - ${selectedBank.name}`
                : senderBank;
            const res = await fetchWithAuth(`${API_BASE_URL}/booking/${booking.id}/payment-issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    transferredAt: paymentIssueForm.transferredAt,
                    transactionRef,
                    senderBank: senderBankLabel,
                    senderAccountName,
                    message: note || `Khách báo đã chuyển ${formatNumber(amount)}đ nhưng hệ thống chưa ghi nhận.`,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message ?? 'Gửi yêu cầu không thành công');
            const data = json?.data ?? json;
            setPaymentIssueResult({
                message: data?.message ?? 'Đã nhận yêu cầu kiểm tra thanh toán.',
                ticketId: data?.ticketId,
                accessCode: data?.accessCode,
            });
            setShowIssueForm(false);
            fetchBooking();
        } catch (e: unknown) {
            setIssueError(e instanceof Error ? e.message : 'Lỗi kết nối. Vui lòng thử lại.');
        } finally { setIsReportingIssue(false); }
    };

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    useEffect(() => {
        setIsLoggedIn(!new URLSearchParams(window.location.search).get('email'));
    }, []);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center font-bold text-primary">
            Đang tải chi tiết đơn hàng...
        </div>
    );
    if (!booking) return null;

    const isPaid = booking.paymentStatus === 'PAID' && booking.status === 'CONFIRMED';
    const isPending = booking.paymentStatus === 'UNPAID' && booking.status === 'PENDING';
    const isPaymentReviewing =
        (booking.paymentStatus === 'PROCESSING' && booking.status === 'PENDING') ||
        Boolean(paymentIssueResult);
    const isCancelled = booking.status === 'CANCELLED';
    const isCancelRequested = booking.status === 'CANCEL_REQUESTED';
    const cancellationPolicy = booking.cancellationPolicy;
    const canCancelBooking = Boolean(cancellationPolicy?.canCancel) && isLoggedIn;
    const tripLifecycle = cancellationPolicy?.tripLifecycle ?? 'UPCOMING';
    const departureDate =
        cancellationPolicy?.departureDate ?? booking.tour?.startDate;
    const tripUnavailableReason =
        cancellationPolicy?.cancelUnavailableReason ??
        (tripLifecycle === 'COMPLETED'
            ? 'Chuyến đi đã hoàn thành.'
            : 'Không thể hủy online ở thời điểm này.');
    const totalPriceNumber = Number(booking.totalPrice);
    const refundAmountNumber = Number(booking.refundAmount ?? 0);
    const paymentSupportTicket = booking.supportTickets?.find(ticket => {
        const subject = ticket.subject?.toLowerCase() ?? '';
        return subject.includes('thanh toán') || subject.includes('payment');
    });

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
                        <Image
                            src={booking.tour?.imageUrl || 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7'}
                            alt={booking.tour?.name || 'Tour image'}
                            fill
                            priority
                            sizes="100vw"
                            className="object-cover"
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
                                            <span className="font-bold">{formatDate(booking.createdAt)}</span>
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
                                        {departureDate && (
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                <div className="flex items-center gap-3 text-on-surface-variant">
                                                    <span className="material-symbols-outlined text-primary">flight_takeoff</span>
                                                    <span className="font-medium">Ngày khởi hành</span>
                                                </div>
                                                <span className="font-bold">{formatDate(departureDate)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3 text-on-surface-variant">
                                                <span className="material-symbols-outlined text-primary">payments</span>
                                                <span className="font-medium">
                                                    {language === 'vi' ? 'Phương thức thanh toán' : 'Payment Method'}
                                                </span>
                                            </div>
                                            <span className="font-bold text-primary text-right">
                                                {booking.paymentMethod === 'IN_STORE'
                                                    ? (language === 'vi' ? 'Thanh toán tại văn phòng' : 'Pay at Office')
                                                    : (language === 'vi' ? 'Chuyển khoản (PayOS)' : 'Bank Transfer (PayOS)')
                                                }
                                            </span>
                                        </div>
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
                                                    <span className="font-medium">{formatDateTime(booking.cancelRequestedAt)}</span>
                                                </div>
                                            )}
                                            {booking.cancelledAt && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Hủy lúc</span>
                                                    <span className="font-medium">{formatDateTime(booking.cancelledAt)}</span>
                                                </div>
                                            )}
                                            {booking.refundAmount !== undefined && booking.refundAmount !== null && (
                                                <div className="flex justify-between pt-2 border-t border-slate-200">
                                                    <span className="text-slate-500 font-semibold">Hoàn tiền</span>
                                                    <span className={`font-bold text-base ${refundAmountNumber > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {refundAmountNumber > 0
                                                            ? formatPrice(refundAmountNumber)
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
                                    <StatusBadge
                                        status={booking.status}
                                        paymentStatus={isPaymentReviewing ? 'PROCESSING' : booking.paymentStatus}
                                    />
                                </div>

                                {/* Total */}
                                <div className="flex justify-between items-end">
                                    <span className="text-on-surface-variant font-medium">{t('my_bookings.totalPrice')}</span>
                                    <span className="text-3xl font-extrabold font-headline text-primary">{formatPrice(totalPriceNumber)}</span>
                                </div>

                                {/* Refund info if CANCEL_REQUESTED */}
                                {isCancelRequested && booking.refundAmount !== null && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1">
                                        <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Dự Kiến Hoàn Tiền</p>
                                        <p className="text-lg font-extrabold text-orange-600">
                                            {refundAmountNumber > 0
                                                ? formatPrice(refundAmountNumber)
                                                : 'Không hoàn tiền'}
                                        </p>
                                        <p className="text-xs text-orange-600 opacity-80">{booking.refundNote}</p>
                                    </div>
                                )}

                                {/* In-Store Payment Info Box */}
                                {isPending && booking.paymentMethod === 'IN_STORE' && (
                                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs space-y-2">
                                        <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                                            <span className="material-symbols-outlined text-base">info</span>
                                            <span>
                                                {language === 'vi' ? 'Thanh toán tại văn phòng' : 'In-Store Payment'}
                                            </span>
                                        </div>
                                        <p className="leading-relaxed">
                                            {language === 'vi'
                                                ? 'Vui lòng mang mã đặt chỗ đến trực tiếp văn phòng để hoàn tất thanh toán và nhận vé trong vòng 24 giờ kể từ thời điểm đặt.'
                                                : 'Please bring your booking code directly to our office to complete payment and receive your ticket within 24 hours of booking.'}
                                        </p>
                                        <div className="pt-2 border-t border-amber-200/50 flex justify-between font-bold text-[10px] uppercase tracking-wider text-amber-800">
                                            <span>{language === 'vi' ? 'Hạn chót giữ chỗ:' : 'Holding Deadline:'}</span>
                                            <span>
                                                {formatDateTime(new Date(new Date(booking.createdAt).getTime() + 24 * 60 * 60 * 1000))}
                                            </span>
                                        </div>
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

                                {cancellationPolicy && !isCancelRequested && !isCancelled && (
                                    <div className={`rounded-xl border px-4 py-3 text-sm ${canCancelBooking
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                        : tripLifecycle === 'COMPLETED'
                                            ? 'border-slate-200 bg-slate-50 text-slate-700'
                                            : 'border-amber-200 bg-amber-50 text-amber-800'
                                        }`}>
                                        <div className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-base mt-0.5">
                                                {canCancelBooking ? 'event_available' : tripLifecycle === 'COMPLETED' ? 'task_alt' : 'event_busy'}
                                            </span>
                                            <div>
                                                <p className="font-bold">
                                                    {canCancelBooking
                                                        ? `Có thể hủy online - hoàn dự kiến ${cancellationPolicy.refundPercent}%`
                                                        : tripLifecycle === 'COMPLETED'
                                                            ? 'Chuyến đi đã hoàn thành'
                                                            : 'Không thể hủy online'}
                                                </p>
                                                <p className="mt-1 text-xs opacity-80">
                                                    {canCancelBooking
                                                        ? cancellationPolicy.refundNote
                                                        : tripUnavailableReason}
                                                </p>
                                            </div>
                                        </div>
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
                                        {canCancelBooking ? (
                                            <button
                                                onClick={() => setShowCancelModal(true)}
                                                className="w-full border-2 border-red-200 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all text-sm"
                                            >
                                                <span className="material-symbols-outlined text-base">cancel</span>
                                                Yêu Cầu Hủy Tour
                                            </button>
                                        ) : null}
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
                                        {booking.paymentMethod === 'IN_STORE' ? (
                                            <Link
                                                href={`/success?bookingId=${booking.bookingCode}`}
                                                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95 text-center text-sm"
                                            >
                                                <span className="material-symbols-outlined text-lg">info</span>
                                                {language === 'vi' ? 'Xem Hướng Dẫn và Vé Giữ Chỗ' : 'View Instructions and Ticket'}
                                            </Link>
                                        ) : isPaymentReviewing ? (
                                            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3">
                                                <div className="flex items-start gap-3">
                                                    <span className="material-symbols-outlined text-sky-600 mt-0.5">fact_check</span>
                                                    <div>
                                                        <p className="text-sm font-bold text-sky-900">Đang kiểm tra thanh toán</p>
                                                        <p className="mt-1 text-xs leading-relaxed text-sky-700">
                                                            Chúng tôi đã nhận yêu cầu đối soát. Nếu bạn đã chuyển khoản, không cần tạo thanh toán lại hoặc hủy tour trong lúc chờ kiểm tra.
                                                        </p>
                                                        {paymentIssueResult?.message && (
                                                            <p className="mt-2 text-xs font-semibold text-sky-800">
                                                                {paymentIssueResult.message}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {(paymentIssueResult?.ticketId || paymentSupportTicket?.id) && (
                                                    <div className="rounded-xl border border-sky-200 bg-white/70 px-3 py-2 text-xs text-sky-800">
                                                        Mã yêu cầu: #{paymentIssueResult?.ticketId ?? paymentSupportTicket?.id}
                                                    </div>
                                                )}
                                                <Link
                                                    href="/contact"
                                                    className="w-full border border-sky-200 bg-white text-sky-700 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sky-100 transition-all text-sm"
                                                >
                                                    <span className="material-symbols-outlined text-base">support_agent</span>
                                                    Liên hệ hỗ trợ
                                                </Link>
                                            </div>
                                        ) : (
                                            <>
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
                                            {/* Yêu cầu kiểm tra thanh toán */}
                                            <button
                                                onClick={() => { setShowIssueForm(true); setIssueError(''); setPaymentIssueResult(null); }}
                                                className="w-full border border-sky-200 text-sky-700 bg-sky-50 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sky-100 transition-all text-sm"
                                            >
                                                <span className="material-symbols-outlined text-base">fact_check</span>
                                                Tôi đã chuyển khoản, yêu cầu kiểm tra
                                            </button>
                                            </>
                                        )}
                                        {canCancelBooking && (
                                            <div className="border-t border-slate-200/70 pt-3 space-y-2">
                                                {(isPaymentReviewing || paymentIssueResult) && (
                                                    <p className="text-xs leading-relaxed text-slate-500">
                                                        Nếu bạn đã chuyển khoản, hãy chờ kết quả đối soát trước khi hủy để tránh nhầm trạng thái hoàn tiền.
                                                    </p>
                                                )}
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
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            {showIssueForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
                    onClick={(event) => {
                        if (event.target !== event.currentTarget) return;
                        setShowIssueForm(false);
                        setIssueError('');
                    }}
                >
                    <div
                        ref={paymentIssueDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="payment-issue-title"
                        aria-describedby={issueError ? paymentIssueErrorId : undefined}
                        tabIndex={-1}
                        className="w-full max-w-2xl rounded-[1.75rem] bg-white shadow-2xl ring-1 ring-slate-900/10 focus:outline-none"
                    >
                        <div className="rounded-t-[1.75rem] bg-gradient-to-r from-sky-700 to-blue-600 px-5 py-5 text-white sm:px-7">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                                        <span className="material-symbols-outlined text-2xl">fact_check</span>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100">
                                            Đối soát thanh toán
                                        </p>
                                        <h2 id="payment-issue-title" className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                                            Kiểm tra khoản chuyển của bạn
                                        </h2>
                                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-sky-50/90">
                                            Cung cấp thông tin trên biên lai để nhân viên kiểm tra nhanh hơn. Trong lúc chờ đối soát, bạn không cần tạo thanh toán lại.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setShowIssueForm(false); setIssueError(''); }}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                                    aria-label="Đóng form kiểm tra thanh toán"
                                >
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>
                        </div>

                        <form
                            className="space-y-5 px-5 py-5 sm:px-7 sm:py-6"
                            onSubmit={(event) => { event.preventDefault(); void handleReportIssue(); }}
                        >
                            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mã đặt tour</p>
                                    <p className="mt-1 font-extrabold text-slate-900">{booking.bookingCode}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng cần thanh toán</p>
                                    <p className="mt-1 font-extrabold text-sky-700">{formatPrice(totalPriceNumber)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Trạng thái</p>
                                    <p className="mt-1 font-extrabold text-amber-600">Chờ ghi nhận</p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block space-y-2 text-sm font-bold text-slate-700">
                                    Số tiền đã chuyển
                                    <input
                                        id={paymentAmountId}
                                        value={paymentIssueForm.amount}
                                        onChange={e => updatePaymentIssueForm({ amount: e.target.value })}
                                        inputMode="numeric"
                                        required
                                        placeholder="VD: 6120000"
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                    />
                                </label>
                                <label className="block space-y-2 text-sm font-bold text-slate-700">
                                    Thời gian chuyển
                                    <input
                                        id={paymentTransferredAtId}
                                        type="datetime-local"
                                        value={paymentIssueForm.transferredAt}
                                        onChange={e => updatePaymentIssueForm({ transferredAt: e.target.value })}
                                        required
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                    />
                                </label>
                            </div>

                            <label className="block space-y-2 text-sm font-bold text-slate-700">
                                Mã giao dịch hoặc nội dung chuyển khoản
                                <input
                                    id={paymentTransactionRefId}
                                    value={paymentIssueForm.transactionRef}
                                    onChange={e => updatePaymentIssueForm({ transactionRef: e.target.value })}
                                    required
                                    placeholder="VD: FT260526XMZR hoặc BK-260526-XMZR"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="block space-y-2 text-sm font-bold text-slate-700">
                                    <span id={paymentBankLabelId}>Ngân hàng chuyển</span>
                                    <div className="relative" ref={bankDropdownRef}>
                                        <button
                                            id={paymentBankButtonId}
                                            type="button"
                                            aria-haspopup="listbox"
                                            aria-expanded={isBankDropdownOpen}
                                            aria-controls={isBankDropdownOpen ? paymentBankListboxId : undefined}
                                            aria-labelledby={`${paymentBankLabelId} ${paymentBankButtonId}`}
                                            onClick={() => {
                                                setIsBankDropdownOpen(previous => !previous);
                                                setBankSearchQuery('');
                                            }}
                                            className={`flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-white px-4 text-left text-sm font-semibold outline-none transition hover:border-sky-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 ${selectedBank ? 'text-slate-900' : 'text-slate-400'}`}
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="material-symbols-outlined text-lg text-sky-700">account_balance</span>
                                                <span className="truncate">
                                                    {isBankListLoading && banksList.length === 0
                                                        ? 'Đang tải danh sách ngân hàng...'
                                                        : selectedBank
                                                            ? `${selectedBank.shortName} - ${selectedBank.name}`
                                                            : 'Tìm hoặc chọn ngân hàng...'}
                                                </span>
                                            </span>
                                            <span
                                                className="material-symbols-outlined shrink-0 text-lg text-slate-400 transition-transform duration-200"
                                                style={{ transform: isBankDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                            >
                                                expand_more
                                            </span>
                                        </button>

                                        {isBankDropdownOpen && (
                                            <div className="absolute left-0 right-0 top-full z-[70] mt-2 flex max-h-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
                                                <div className="border-b border-slate-100 bg-slate-50/80 p-2">
                                                    <div className="relative">
                                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                                                        <input
                                                            id={paymentBankSearchId}
                                                            type="text"
                                                            placeholder="Gõ để tìm tên hoặc mã ngân hàng..."
                                                            aria-label="Tìm ngân hàng chuyển khoản"
                                                            value={bankSearchQuery}
                                                            onChange={e => setBankSearchQuery(e.target.value)}
                                                            autoFocus
                                                            className="h-10 w-full rounded-xl border border-sky-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                        />
                                                    </div>
                                                </div>
                                                <div id={paymentBankListboxId} role="listbox" aria-labelledby={paymentBankLabelId} className="overflow-y-auto overflow-x-hidden">
                                                    {filteredBanks.length > 0 ? (
                                                        filteredBanks.map(bank => (
                                                            <button
                                                                key={`${bank.shortName}-${bank.name}`}
                                                                type="button"
                                                                role="option"
                                                                aria-selected={paymentIssueForm.senderBank === bank.shortName}
                                                                onClick={() => {
                                                                    updatePaymentIssueForm({ senderBank: bank.shortName });
                                                                    setIsBankDropdownOpen(false);
                                                                    setBankSearchQuery('');
                                                                }}
                                                                className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-sky-50 ${paymentIssueForm.senderBank === bank.shortName ? 'bg-sky-50/80 font-bold text-sky-800' : 'font-medium'}`}
                                                            >
                                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-1">
                                                                    {bank.logo ? (
                                                                        <Image
                                                                            src={bank.logo}
                                                                            alt={bank.shortName}
                                                                            width={32}
                                                                            height={32}
                                                                            sizes="32px"
                                                                            className="max-h-full max-w-full object-contain"
                                                                            unoptimized
                                                                        />
                                                                    ) : (
                                                                        <span className="material-symbols-outlined text-sm text-slate-400">account_balance</span>
                                                                    )}
                                                                </span>
                                                                <span className="min-w-0 flex-1 truncate">
                                                                    {bank.shortName} - {bank.name}
                                                                </span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                                                            Không tìm thấy ngân hàng phù hợp
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <label className="block space-y-2 text-sm font-bold text-slate-700">
                                    Tên chủ tài khoản chuyển
                                    <input
                                        id={paymentSenderAccountId}
                                        value={paymentIssueForm.senderAccountName}
                                        onChange={e => updatePaymentIssueForm({ senderAccountName: e.target.value })}
                                        required
                                        placeholder="VD: Dao Thanh Ha"
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                    />
                                </label>
                            </div>

                            <label className="block space-y-2 text-sm font-bold text-slate-700">
                                Ghi chú thêm
                                <textarea
                                    id={paymentNoteId}
                                    value={paymentIssueForm.note}
                                    onChange={e => updatePaymentIssueForm({ note: e.target.value })}
                                    rows={4}
                                    placeholder="VD: Tôi đã chuyển khoản nhưng hệ thống chưa ghi nhận sau khi quay lại trang."
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                />
                            </label>

                            {issueError && (
                                <div id={paymentIssueErrorId} role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    <span className="material-symbols-outlined text-base mt-0.5">error</span>
                                    {issueError}
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setShowIssueForm(false); setIssueError(''); }}
                                    className="h-11 rounded-2xl border border-slate-200 px-6 text-sm font-bold text-slate-500 transition hover:bg-slate-50 sm:min-w-32"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isReportingIssue}
                                    className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-40"
                                >
                                    {isReportingIssue ? (
                                        <span className="inline-flex items-center justify-center gap-2">
                                            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                            Đang gửi...
                                        </span>
                                    ) : (
                                        'Gửi kiểm tra'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {showCancelModal && (
                <CancelBookingModal
                    bookingId={booking.id}
                    bookingCode={booking.bookingCode}
                    tourName={booking.tour?.name ?? 'Tour'}
                    tourStartDate={departureDate ?? new Date().toISOString()}
                    totalPrice={totalPriceNumber}
                    paymentStatus={booking.paymentStatus}
                    bookingStatus={booking.status}
                    cancellationPolicy={cancellationPolicy}
                    onClose={() => setShowCancelModal(false)}
                    onSuccess={handleCancelSuccess}
                />
            )}
        </div>
    );
}

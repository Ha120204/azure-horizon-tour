'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { toastEmitter } from '@/lib/http/toastEmitter';
import { API_BASE_URL } from '@/lib/http/constants';

import { pdf } from '@react-pdf/renderer';
import QRCodeGen from 'qrcode';
import QRCode from 'react-qr-code';
import { useLocale } from '@/context/LocaleContext';
import { ETicketPDF } from './_components/ETicketPDF';

type TicketData = {
    bookingCode: string;
    status: string;
    paymentStatus: string;
    paymentMethod?: string | null;
    createdAt?: string | null;
    holdExpiresAt?: string | null;
    numberOfPeople: number;
    totalPrice: number;
    leadTravelerName?: string | null;
    user?: {
        fullName?: string | null;
    } | null;
    tour?: {
        name?: string | null;
        imageUrl?: string | null;
        startDate?: string | null;
        duration?: string | null;
    } | null;
};

type TicketResponse = {
    data?: TicketData;
    message?: string;
};

type PublicSettings = {
    company_name?: string;
    company_address?: string;
    company_phone?: string;
};

const successDict = {
    vi: {
        bookingSuccessTitle: "Đã giữ chỗ thành công",
        bookingSuccessDesc: "Vui lòng thanh toán tại văn phòng trước hạn chót để hoàn tất đặt chỗ.",
        inStoreTitle: "Thông tin Thanh toán tại Cửa hàng",
        inStoreDesc: "Vui lòng đối chiếu mã thanh toán và hoàn tất thanh toán trước hạn chót.",
        deadlineLabel: "Hạn chót giữ chỗ",
        officesLabel: "Hệ thống Văn phòng",
        officeName: "Văn phòng chính (Hà Nội)",
        officeAddress: "175 Phố Tây Sơn, Đống Đa, Hà Nội",
        officeHours: "Giờ làm việc: 08:00 - 18:00 (Thứ 2 - Thứ 6)",
        viewOnMaps: "Xem trên Google Maps",
        hotline: "Hotline",
        processTitle: "Quy trình Thanh toán (3 Bước)",
        step1Title: "Đến Cửa Hàng",
        step1Desc: "Đến trực tiếp văn phòng trong thời hạn giữ chỗ 24h.",
        step2Title: "Cung Cấp Mã",
        step2Desc: "Đọc mã booking {code} cho nhân viên quầy.",
        step3Title: "Nhận Vé Cứng",
        step3Desc: "Nhân viên thu tiền (Tiền mặt/Thẻ) và in vé/vé điện tử chính thức gửi bạn.",
        bringInfoTitle: "Khi đến văn phòng",
        bringInfoText: "Vui lòng cung cấp mã đặt chỗ {code} và tên người đại diện {name} cho nhân viên. Nếu tour cần đối chiếu thông tin, hãy mang theo giấy tờ tùy thân.",
        noteTitle: "Lưu ý:",
        noteText: "Chỗ ngồi của bạn sẽ được giữ tối đa trong 24 giờ. Quá thời hạn này, hệ thống sẽ tự động hủy đơn và hoàn lại số lượng ghế trống cho khách đặt khác.",
        generatingTicket: "Đang tạo vé điện tử...",
        ticketNotFound: "Không tìm thấy vé",
        backToHome: "Quay lại Trang chủ",
        bookingCode: "Mã đặt chỗ",
        tourName: "Tên Tour",
        dateTime: "Ngày & Giờ",
        duration: "Thời lượng",
        passengers: "Hành khách",
        leadTraveler: "Người đại diện",
        paymentMethod: "Phương thức",
        totalAmount: "Tổng số tiền",
        confirmed: "Đã xác nhận",
        awaitingPayment: "Chờ thanh toán",
        statusLabel: "Trạng thái",
        awaitingPaymentInStore: "Chờ thanh toán tại cửa hàng",
        paymentDeadlineLabel: "Hạn thanh toán",
        paymentBeforeOfficeClose: "Thanh toán tại văn phòng trước {deadline}.",
        holdDeadlineAfterHoursNote: "Hệ thống giữ chỗ đến {deadline}, nhưng văn phòng chỉ nhận thanh toán trong giờ làm việc.",
        exportingPdf: "Đang xuất PDF...",
        downloadTicket: "Tải vé điện tử (PDF)",
        downloadReservationSlip: "Tải phiếu giữ chỗ (PDF)",
        viewProfile: "Xem trong hồ sơ",
        payAtStore: "Thanh toán tại cửa hàng",
        bankTransferPayOS: "Chuyển khoản (PayOS)",
        onlinePayment: "Thanh toán trực tuyến",
        unpaid: "Chưa thanh toán",
        passengerUnit: "Hành khách",
        paidHeroTitle: "Hành trình của bạn đã sẵn sàng, {name}!",
        paidHeroSubtitle: "Thanh toán thành công và đặt chỗ của bạn đã được xác nhận. Chúng tôi đã gửi chi tiết hành trình đến email của bạn.",
        guestName: "Quý khách",
        unknownTour: "Chưa có tên tour",
        toBeAnnounced: "Đang cập nhật",
        leadTravelerFallback: "Khách VIP",
        tourImageAlt: "Ảnh tour",
        scanAtCheckIn: "Quét khi check-in",
        qrPendingTitle: "Vé/QR chưa kích hoạt",
        qrPendingDesc: "Sẽ hiển thị sau khi xác nhận thanh toán.",
        officeOpen: "Đang mở cửa",
        officeClosed: "Đã đóng cửa",
        pdfError: "Không thể tạo PDF vé. Vui lòng thử lại!",
        loadingData: "Đang tải dữ liệu..."
    },
    en: {
        bookingSuccessTitle: "Reservation Held Successfully",
        bookingSuccessDesc: "Please pay at our office before the deadline to complete your booking.",
        inStoreTitle: "In-Store Payment Information",
        inStoreDesc: "Please verify your booking code and complete payment before the deadline.",
        deadlineLabel: "Reservation Deadline",
        officesLabel: "Office Locations",
        officeName: "Head Office (Hanoi)",
        officeAddress: "175 Tay Son Street, Dong Da, Hanoi",
        officeHours: "Working Hours: 08:00 - 18:00 (Mon - Fri)",
        viewOnMaps: "View on Google Maps",
        hotline: "Hotline",
        processTitle: "Payment Process (3 Steps)",
        step1Title: "Visit Office",
        step1Desc: "Go to our office within the 24-hour seat holding period.",
        step2Title: "Provide Code",
        step2Desc: "Provide booking code {code} to our desk staff.",
        step3Title: "Get Ticket",
        step3Desc: "Staff collects payment (Cash/Card) and prints your official ticket/e-ticket.",
        bringInfoTitle: "At the office",
        bringInfoText: "Please provide booking code {code} and lead traveler name {name} to our staff. Bring an ID if the tour requires identity verification.",
        noteTitle: "Note:",
        noteText: "Your seat is held for up to 24 hours. After this period, the system will automatically cancel the order and release the seats for other customers.",
        generatingTicket: "Generating your e-ticket...",
        ticketNotFound: "Ticket not found",
        backToHome: "Back to Home",
        bookingCode: "Booking Code",
        tourName: "Tour Name",
        dateTime: "Date & Time",
        duration: "Duration",
        passengers: "Passengers",
        leadTraveler: "Lead Traveler",
        paymentMethod: "Payment Method",
        totalAmount: "Total Amount",
        confirmed: "Confirmed",
        awaitingPayment: "Awaiting Payment",
        statusLabel: "Status",
        awaitingPaymentInStore: "Awaiting in-store payment",
        paymentDeadlineLabel: "Payment Deadline",
        paymentBeforeOfficeClose: "Pay at our office before {deadline}.",
        holdDeadlineAfterHoursNote: "The system holds your seat until {deadline}, but the office only accepts payment during working hours.",
        exportingPdf: "Exporting PDF...",
        downloadTicket: "Download E-Ticket (PDF)",
        downloadReservationSlip: "Download Reservation Slip (PDF)",
        viewProfile: "View in Profile",
        payAtStore: "Pay at Store",
        bankTransferPayOS: "Bank Transfer (PayOS)",
        onlinePayment: "Online Payment",
        unpaid: "Unpaid",
        passengerUnit: "Passenger",
        paidHeroTitle: "Your journey awaits, {name}!",
        paidHeroSubtitle: "Payment successful and your booking is confirmed. We've sent the itinerary details to your email.",
        guestName: "Guest",
        unknownTour: "Unknown Tour",
        toBeAnnounced: "TBA",
        leadTravelerFallback: "VIP Guest",
        tourImageAlt: "Tour Image",
        scanAtCheckIn: "Scan at Check-in",
        qrPendingTitle: "Ticket/QR Locked",
        qrPendingDesc: "It will appear after payment is confirmed.",
        officeOpen: "Open now",
        officeClosed: "Closed",
        pdfError: "Error generating PDF ticket. Please try again!",
        loadingData: "Loading data..."
    }
};

const OFFICE_OPEN_HOUR = 8;
const OFFICE_CLOSE_HOUR = 18;

function toValidDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isOfficeWorkday(date: Date) {
    const day = date.getDay();
    return day >= 1 && day <= 5;
}

function atOfficeHour(date: Date, hour: number) {
    const next = new Date(date);
    next.setHours(hour, 0, 0, 0);
    return next;
}

function getInStorePaymentDeadline(holdDeadline: Date | null, createdAt: Date | null) {
    if (!holdDeadline) return null;

    const candidate = new Date(holdDeadline);
    for (let i = 0; i < 8; i += 1) {
        if (isOfficeWorkday(candidate)) {
            const openAt = atOfficeHour(candidate, OFFICE_OPEN_HOUR);
            const closeAt = atOfficeHour(candidate, OFFICE_CLOSE_HOUR);
            const deadline = holdDeadline.getTime() < closeAt.getTime() ? holdDeadline : closeAt;

            if (
                deadline.getTime() >= openAt.getTime() &&
                (!createdAt || deadline.getTime() > createdAt.getTime())
            ) {
                return deadline;
            }
        }

        candidate.setDate(candidate.getDate() - 1);
        candidate.setHours(OFFICE_CLOSE_HOUR, 0, 0, 0);
    }

    return holdDeadline;
}

function SuccessTicketContent() {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    const { formatPrice, formatDateTime, language } = useLocale();

    const [ticketData, setTicketData] = useState<TicketData | null>(null);
    const [loading, setLoading] = useState(true);
    const [officeSettings, setOfficeSettings] = useState<PublicSettings | null>(null);

    const [isDownloading, setIsDownloading] = useState(false);

    const lang = (language === 'vi' || language === 'en') ? language : 'vi';
    const sd = successDict[lang];

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            return;
        }

        const fetchTicket = async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/booking/my/code/${bookingId}`);
                const result: TicketResponse = await res.json();

                if (res.ok && result.data) {
                    setTicketData(result.data);
                }
            } catch (err) {
                console.error("Lỗi khi tải thông tin vé:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTicket();
    }, [bookingId]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/settings/public`)
            .then(r => r.json())
            .then(json => { if (json.data) setOfficeSettings(json.data); })
            .catch(() => {});
    }, []);

    const handleDownloadPDF = async () => {
        if (!ticketData) return;
        try {
            setIsDownloading(true);

            const qrDataUrl = await QRCodeGen.toDataURL(
                `AZURE_TICKET_${ticketData.bookingCode}`,
                { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }
            );

            const formattedDate = ticketData.tour?.startDate
                ? formatDateTime(ticketData.tour.startDate, { dateStyle: 'medium', timeStyle: 'short' })
                : '';

            const blob = await pdf(
                <ETicketPDF
                    ticketData={ticketData}
                    qrDataUrl={qrDataUrl}
                    formattedPrice={formatPrice(ticketData.totalPrice || 0)}
                    formattedDate={formattedDate}
                    language={lang}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filePrefix = ticketData.paymentMethod === 'IN_STORE' && ticketData.paymentStatus !== 'PAID'
                ? 'Reservation-Slip'
                : 'E-Ticket';
            a.download = `${filePrefix}_${ticketData.bookingCode}.pdf`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Lỗi khi tạo PDF:", error);
            toastEmitter.error(sd.pdfError);
        } finally {
            setIsDownloading(false);
        }
    };

    // Bổ sung các biến kiểm soát bảo mật CSS cho Canvas
    if (loading) {
        return (
            <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
                <Header />
                <div className="flex-grow flex items-center justify-center pt-20">
                    <p className="font-bold text-primary text-xl">{sd.generatingTicket}</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (!ticketData) {
        return (
            <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
                <Header />
                <div className="flex-grow flex flex-col items-center justify-center space-y-4 pt-20">
                    <h1 className="text-2xl font-bold text-error">{sd.ticketNotFound}</h1>
                    <Link href="/" className="text-primary hover:underline">{sd.backToHome}</Link>
                </div>
                <Footer />
            </div>
        );
    }

    const travelerName = ticketData.leadTravelerName || ticketData.user?.fullName || sd.guestName;
    const isInStorePending = ticketData.paymentMethod === 'IN_STORE' && ticketData.paymentStatus === 'UNPAID';
    const createdAt = toValidDate(ticketData.createdAt);
    const holdDeadline = toValidDate(ticketData.holdExpiresAt) ?? (
        createdAt ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) : null
    );
    const inStorePaymentDeadline = getInStorePaymentDeadline(holdDeadline, createdAt);
    const holdDeadlineText = holdDeadline
        ? formatDateTime(holdDeadline, { dateStyle: 'medium', timeStyle: 'short' })
        : sd.toBeAnnounced;
    const paymentDeadlineText = inStorePaymentDeadline
        ? formatDateTime(inStorePaymentDeadline, { dateStyle: 'medium', timeStyle: 'short' })
        : holdDeadlineText;
    const isOfficePaymentDeadlineAdjusted = Boolean(
        holdDeadline &&
        inStorePaymentDeadline &&
        inStorePaymentDeadline.getTime() !== holdDeadline.getTime()
    );

    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const minutes = now.getHours() * 60 + now.getMinutes();
    const isOfficeOpen = day >= 1 && day <= 5 && minutes >= 8 * 60 && minutes < 18 * 60;

    return (
        <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow pt-32 pb-20 px-4 md:px-6 overflow-hidden">
                <section className="max-w-3xl mx-auto text-center mb-12">
                    {ticketData.paymentMethod === 'IN_STORE' && ticketData.paymentStatus === 'UNPAID' ? (
                        <>
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6 ambient-glow">
                                <span className="material-symbols-outlined text-amber-600 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                            </div>
                            <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
                                {sd.bookingSuccessTitle}
                            </h1>
                            <p className="text-on-surface-variant text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                                {sd.bookingSuccessDesc}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6 ambient-glow">
                                <span className="material-symbols-outlined text-emerald-600 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
                                {sd.paidHeroTitle.replace('{name}', travelerName)}
                            </h1>
                            <p className="text-on-surface-variant text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                                {sd.paidHeroSubtitle}
                            </p>
                        </>
                    )}
                </section>

                <section className="max-w-5xl mx-auto mb-16 relative">
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-secondary-container/10 rounded-full blur-3xl -z-10"></div>

                    <div className="bg-white rounded-xl ambient-glow overflow-hidden flex flex-col md:flex-row ticket-cutout ticket-right-cutout border border-outline-variant/10">

                        {/* Image Side */}
                        <div className="md:w-1/3 h-48 md:h-auto overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                alt={sd.tourImageAlt}
                                className="w-full h-full object-cover"
                                src={ticketData.tour?.imageUrl || "https://images.unsplash.com/photo-1561956021-947f09ae0101?w=800&auto=format&fit=crop&q=60"}
                                crossOrigin="anonymous" // Cấp phép bảo mật cho ảnh Unsplash
                            />
                        </div>

                        {/* Ticket Info Side */}
                        <div className="md:w-2/3 p-6 md:p-8 flex flex-col md:flex-row gap-6">
                            <div className="min-w-0 flex-grow">
                                <div className="mb-7 space-y-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline mb-1">{sd.bookingCode}</p>
                                            <p className="font-mono text-xl font-bold text-primary tracking-widest">{ticketData.bookingCode}</p>
                                        </div>
                                        {ticketData.paymentStatus === 'PAID' ? (
                                            <div className="bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-2 border border-emerald-100">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                <span className="text-[10px] font-bold text-emerald-700 uppercase">
                                                    {sd.confirmed}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="bg-amber-50 px-3 py-1 rounded-full flex items-center gap-2 border border-amber-100">
                                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                                <span className="text-[10px] font-bold text-amber-700 uppercase">
                                                    {sd.awaitingPayment}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {isInStorePending && (
                                        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <span className="material-symbols-outlined mt-0.5 text-[20px] text-amber-700">pending_actions</span>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                                                        {sd.statusLabel}: {sd.awaitingPaymentInStore}
                                                    </p>
                                                    <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-950">
                                                        {sd.paymentBeforeOfficeClose.replace('{deadline}', paymentDeadlineText)}
                                                    </p>
                                                    {isOfficePaymentDeadlineAdjusted && (
                                                        <p className="mt-1 text-[10px] leading-relaxed text-amber-800/75">
                                                            {sd.holdDeadlineAfterHoursNote.replace('{deadline}', holdDeadlineText)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-col gap-1 rounded-lg border border-amber-100 bg-white/85 px-3 py-2.5 text-left shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                                                    {sd.paymentDeadlineLabel}
                                                </span>
                                                <span className="font-mono text-sm font-bold leading-snug text-amber-950 sm:whitespace-nowrap">
                                                    {paymentDeadlineText}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                                    <div className="sm:col-span-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.tourName}</p>
                                        <p className="font-headline font-bold text-base md:text-lg leading-tight">
                                            {ticketData.tour?.name || sd.unknownTour}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.dateTime}</p>
                                        <p className="font-semibold text-sm md:text-base">
                                            {ticketData.tour?.startDate ? formatDateTime(ticketData.tour.startDate, { dateStyle: 'medium', timeStyle: 'short' }) : sd.toBeAnnounced}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.duration}</p>
                                        <p className="font-semibold text-sm md:text-base">
                                            {ticketData.tour?.duration || sd.toBeAnnounced}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.passengers}</p>
                                        <p className="font-semibold text-sm md:text-base">{ticketData.numberOfPeople} {sd.passengerUnit}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.leadTraveler}</p>
                                        <p className="font-semibold text-sm md:text-base">{ticketData.leadTravelerName || ticketData.user?.fullName || sd.leadTravelerFallback}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.paymentMethod}</p>
                                        <p className="font-semibold text-sm md:text-base text-primary">
                                            {ticketData.paymentMethod === 'IN_STORE'
                                                ? sd.payAtStore
                                                : (ticketData.paymentMethod === 'PAYOS' ? sd.bankTransferPayOS : (ticketData.paymentStatus === 'PAID' ? sd.onlinePayment : sd.unpaid))
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.totalAmount}</p>
                                        <p className="font-headline font-extrabold text-xl md:text-2xl text-on-surface">{formatPrice(ticketData.totalPrice || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center p-5 md:w-[165px] md:min-w-[165px] md:border-l border-t md:border-t-0 border-dashed border-outline-variant/30">
                                {ticketData.paymentStatus === 'PAID' ? (
                                    <>
                                        <div className="bg-white p-2 rounded-lg border border-outline-variant/20 mb-3">
                                            <QRCode
                                                value={`AZURE_TICKET_${ticketData.bookingCode}`}
                                                size={100}
                                                level="M"
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-outline text-center">{sd.scanAtCheckIn}</p>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border border-amber-100 bg-amber-50/70 text-amber-700">
                                            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                                            <span className="material-symbols-outlined -mt-1 text-lg">pending_actions</span>
                                        </div>
                                        <div className="max-w-[150px]">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">{sd.qrPendingTitle}</p>
                                            <p className="mt-1 text-[10px] font-medium leading-relaxed text-outline">{sd.qrPendingDesc}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Hướng dẫn thanh toán tại cửa hàng */}
                {ticketData.paymentMethod === 'IN_STORE' && ticketData.paymentStatus === 'UNPAID' && (
                    <section className="max-w-5xl mx-auto mt-8 mb-16 bg-white rounded-2xl p-6 md:p-8 border border-amber-100 shadow-md shadow-amber-50/50 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-dashed border-slate-100">
                            <div>
                                <h3 className="font-headline font-bold text-xl text-amber-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-600">info</span>
                                    {sd.inStoreTitle}
                                </h3>
                                <p className="text-xs text-outline mt-1">
                                    {sd.inStoreDesc}
                                </p>
                            </div>
                            <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-100 text-right min-w-[250px]">
                                <span className="block text-[10px] font-bold uppercase text-amber-800 tracking-wider">{sd.paymentDeadlineLabel}</span>
                                <span className="block font-mono font-bold text-base text-amber-900 mt-1">
                                    {paymentDeadlineText}
                                </span>
                                {isOfficePaymentDeadlineAdjusted && (
                                    <span className="block mt-2 text-[10px] leading-relaxed text-amber-800/75">
                                        {sd.holdDeadlineAfterHoursNote.replace('{deadline}', holdDeadlineText)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Cột 1: Địa chỉ quầy */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-on-surface flex items-center gap-2 text-sm">
                                    <span className="material-symbols-outlined text-primary text-base">pin_drop</span>
                                    {sd.officesLabel}
                                </h4>
                                <ul className="space-y-3 text-xs text-on-surface-variant">
                                    <li className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="font-bold text-on-surface">
                                            {officeSettings?.company_name || sd.officeName}
                                        </p>
                                        <p className="mt-1">
                                            {officeSettings?.company_address || sd.officeAddress}
                                        </p>
                                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                            <p className="text-[10px] text-outline">{sd.officeHours}</p>
                                            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isOfficeOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isOfficeOpen ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                {isOfficeOpen ? sd.officeOpen : sd.officeClosed}
                                            </span>
                                        </div>
                                        {officeSettings?.company_phone && (
                                            <a
                                                href={`tel:${officeSettings.company_phone}`}
                                                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant transition-colors hover:text-primary"
                                            >
                                                <span className="material-symbols-outlined text-sm leading-none">call</span>
                                                {sd.hotline}: {officeSettings.company_phone}
                                            </a>
                                        )}
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(officeSettings?.company_address || sd.officeAddress)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary transition-colors hover:text-primary/75"
                                        >
                                            <span className="material-symbols-outlined text-sm leading-none">map</span>
                                            {sd.viewOnMaps}
                                            <span className="material-symbols-outlined text-[11px] leading-none">open_in_new</span>
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Cột 2: Quy trình 3 bước */}
                            <div className="md:col-span-2 space-y-4">
                                <h4 className="font-bold text-on-surface flex items-center gap-2 text-sm">
                                    <span className="material-symbols-outlined text-primary text-base">list_alt</span>
                                    {sd.processTitle}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center text-center space-y-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">1</div>
                                        <p className="font-bold text-xs text-on-surface">{sd.step1Title}</p>
                                        <p className="text-[10px] text-on-surface-variant leading-relaxed">{sd.step1Desc}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center text-center space-y-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">2</div>
                                        <p className="font-bold text-xs text-on-surface">{sd.step2Title}</p>
                                        <p className="text-[10px] text-on-surface-variant leading-relaxed">{sd.step2Desc.replace('{code}', ticketData.bookingCode)}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center text-center space-y-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">3</div>
                                        <p className="font-bold text-xs text-on-surface">{sd.step3Title}</p>
                                        <p className="text-[10px] text-on-surface-variant leading-relaxed">{sd.step3Desc}</p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-xs text-on-surface flex items-start gap-2.5">
                                    <span className="material-symbols-outlined text-primary text-base mt-0.5">badge</span>
                                    <p className="leading-relaxed">
                                        <strong>{sd.bringInfoTitle}:</strong>{' '}
                                        {sd.bringInfoText
                                            .replace('{code}', ticketData.bookingCode)
                                            .replace('{name}', travelerName)}
                                    </p>
                                </div>

                                <div className="bg-amber-50/50 border border-amber-100/80 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
                                    <span className="material-symbols-outlined text-amber-600 text-base mt-0.5">campaign</span>
                                    <p className="leading-relaxed">
                                        <strong>{sd.noteTitle}</strong> {sd.noteText}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Action Buttons */}
                <section className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-10 py-4 font-headline text-sm font-bold tracking-tight text-white shadow-lg shadow-primary/20 outline-none transition-[background-color,box-shadow,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-2xl hover:shadow-primary/25 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:bg-primary disabled:hover:shadow-lg disabled:hover:shadow-primary/20 motion-reduce:transform-none sm:w-auto"
                    >
                        <span
                            className="pointer-events-none absolute inset-y-0 -left-1/3 z-0 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[420%] group-hover:opacity-100 group-disabled:opacity-0 motion-reduce:hidden"
                            aria-hidden="true"
                        />
                        <span className={`material-symbols-outlined relative z-10 text-lg transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isDownloading ? 'animate-pulse motion-reduce:animate-none' : 'group-hover:translate-y-0.5 motion-reduce:transform-none'}`}>
                            {isDownloading ? 'hourglass_empty' : 'download'}
                        </span>
                        <span className="relative z-10">
                            {isDownloading ? sd.exportingPdf : (isInStorePending ? sd.downloadReservationSlip : sd.downloadTicket)}
                        </span>
                    </button>
                    <Link
                        href="/my-bookings"
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant bg-white/60 px-10 py-4 text-center font-headline text-sm font-bold tracking-tight text-primary outline-none transition-[background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-surface-container-low hover:shadow-lg hover:shadow-slate-900/8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none sm:w-auto"
                    >
                        <span>{sd.viewProfile}</span>
                        <span
                            className="material-symbols-outlined translate-x-[-0.35rem] text-[18px] opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:translate-x-0 motion-reduce:opacity-100"
                            aria-hidden="true"
                        >
                            arrow_forward
                        </span>
                    </Link>
                </section>
            </main>

            <Footer />
        </div>
    );
}

function SuccessFallback() {
    const { language } = useLocale();
    const lang = (language === 'vi' || language === 'en') ? language : 'vi';

    return (
        <div className="min-h-screen flex items-center justify-center font-bold text-primary">
            {successDict[lang].loadingData}
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<SuccessFallback />}>
            <SuccessTicketContent />
        </Suspense>
    );
}

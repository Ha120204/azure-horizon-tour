'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import QRCode from 'react-qr-code';
import { useLocale } from '@/context/LocaleContext';

type TicketData = {
    bookingCode: string;
    status: string;
    paymentStatus: string;
    paymentMethod?: string | null;
    createdAt?: string | null;
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

const successDict = {
    vi: {
        bookingSuccessTitle: "Đặt chỗ thành công!",
        bookingSuccessDesc: "Đơn hàng của bạn đang chờ thanh toán tại cửa hàng. Vui lòng hoàn thành giao dịch trước hạn chót giữ chỗ.",
        inStoreTitle: "Thông tin Thanh toán tại Cửa hàng",
        inStoreDesc: "Vui lòng đối chiếu mã thanh toán và hoàn tất thanh toán trước hạn chót.",
        deadlineLabel: "Hạn chót giữ chỗ",
        officesLabel: "Hệ thống Văn phòng",
        officeName: "Văn phòng chính (Hà Nội)",
        officeAddress: "175 Phố Tây Sơn, Đống Đa, Hà Nội",
        officeHours: "Giờ làm việc: 08:00 - 18:00 (Thứ 2 - Thứ 6)",
        processTitle: "Quy trình Thanh toán (3 Bước)",
        step1Title: "Đến Cửa Hàng",
        step1Desc: "Đến trực tiếp văn phòng trong thời hạn giữ chỗ 24h.",
        step2Title: "Cung Cấp Mã",
        step2Desc: "Đọc mã booking {code} cho nhân viên quầy.",
        step3Title: "Nhận Vé Cứng",
        step3Desc: "Nhân viên thu tiền (Tiền mặt/Thẻ) và in vé/vé điện tử chính thức gửi bạn.",
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
        exportingPdf: "Đang xuất PDF...",
        downloadTicket: "Tải vé điện tử (PDF)",
        viewProfile: "Xem trong hồ sơ",
        payAtStore: "Thanh toán tại cửa hàng",
        bankTransferPayOS: "Chuyển khoản (PayOS)",
        onlinePayment: "Thanh toán trực tuyến",
        unpaid: "Chưa thanh toán",
        passengerUnit: "Hành khách"
    },
    en: {
        bookingSuccessTitle: "Booking Successful!",
        bookingSuccessDesc: "Your booking is awaiting payment in store. Please complete the transaction before the seat holding deadline.",
        inStoreTitle: "In-Store Payment Information",
        inStoreDesc: "Please verify your booking code and complete payment before the deadline.",
        deadlineLabel: "Reservation Deadline",
        officesLabel: "Office Locations",
        officeName: "Head Office (Hanoi)",
        officeAddress: "175 Tay Son Street, Dong Da, Hanoi",
        officeHours: "Working Hours: 08:00 - 18:00 (Mon - Fri)",
        processTitle: "Payment Process (3 Steps)",
        step1Title: "Visit Office",
        step1Desc: "Go to our office within the 24-hour seat holding period.",
        step2Title: "Provide Code",
        step2Desc: "Provide booking code {code} to our desk staff.",
        step3Title: "Get Ticket",
        step3Desc: "Staff collects payment (Cash/Card) and prints your official ticket/e-ticket.",
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
        exportingPdf: "Exporting PDF...",
        downloadTicket: "Download E-Ticket (PDF)",
        viewProfile: "View in Profile",
        payAtStore: "Pay at Store",
        bankTransferPayOS: "Bank Transfer (PayOS)",
        onlinePayment: "Online Payment",
        unpaid: "Unpaid",
        passengerUnit: "Passenger"
    }
};

function SuccessTicketContent() {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    const { formatPrice, language } = useLocale();

    const [ticketData, setTicketData] = useState<TicketData | null>(null);
    const [loading, setLoading] = useState(true);

    const [isDownloading, setIsDownloading] = useState(false);
    const ticketRef = useRef<HTMLDivElement>(null);

    const lang = (language === 'vi' || language === 'en') ? language : 'vi';
    const sd = successDict[lang];

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            return;
        }

        const fetchTicket = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const res = await fetchWithAuth(`${apiUrl}/booking/my/code/${bookingId}`);
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

    // Hàm xuất PDF chụp nguyên vẹn vùng chứa vé
    const handleDownloadPDF = async () => {
        if (!ticketRef.current || !ticketData) return;

        try {
            setIsDownloading(true);

            // Bịt mắt tạm thời các thuộc tính bảo mật của font trên trình duyệt để Canvas vẽ chữ chính xác
            // Gọi thư viện chuyển đổi DOM thành Canvas dạng PNG
            const element = ticketRef.current;
            const dataUrl = await toPng(element, {
                quality: 0.95,
                pixelRatio: 2, // Đảm bảo độ sắc nét cao khi in ấn
                skipFonts: true,
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                }
            });

            // Khởi tạo file PDF kích cỡ A4 ngang
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

            // Dán ảnh vào PDF và lưu
            pdf.addImage(dataUrl, 'PNG', 0, 10, pdfWidth, pdfHeight);
            pdf.save(`E-Ticket_${ticketData.bookingCode}.pdf`);

        } catch (error) {
            console.error("Lỗi khi tạo PDF:", error);
            alert("Error generating PDF ticket. Please try again!");
        } finally {
            setIsDownloading(false);

            // Xuất file xong thì tháo băng bịt mắt, trả lại hiện trạng cho trình duyệt
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

    return (
        <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .ambient-glow { box-shadow: 0 8px 32px 0 rgba(25, 28, 33, 0.04); }
                .ticket-cutout { position: relative; }
                .ticket-cutout::before, .ticket-cutout::after {
                    content: ''; position: absolute; left: -12px; width: 24px; height: 24px;
                    background-color: #f9f9ff; border-radius: 50%; z-index: 10;
                }
                .ticket-cutout::before { top: 35%; }
                .ticket-cutout::after { bottom: 25%; }
                .ticket-right-cutout::before, .ticket-right-cutout::after {
                    content: ''; position: absolute; right: -12px; width: 24px; height: 24px;
                    background-color: #f9f9ff; border-radius: 50%; z-index: 10;
                }
                .ticket-right-cutout::before { top: 35%; }
                .ticket-right-cutout::after { bottom: 25%; }
            `}} />

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
                                Your journey awaits, {ticketData.leadTravelerName || ticketData.user?.fullName || 'Guest'}!
                            </h1>
                            <p className="text-on-surface-variant text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                                Payment successful and your booking is confirmed. We&apos;ve sent the itinerary details to your email.
                            </p>
                        </>
                    )}
                </section>

                <section className="max-w-5xl mx-auto mb-16 relative">
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-secondary-container/10 rounded-full blur-3xl -z-10"></div>

                    {/* VÙNG CHỤP ẢNH VÉ */}
                    <div ref={ticketRef} className="bg-white rounded-xl ambient-glow overflow-hidden flex flex-col md:flex-row ticket-cutout ticket-right-cutout border border-outline-variant/10">

                        {/* Image Side */}
                        <div className="md:w-1/3 h-48 md:h-auto overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                alt="Tour Image"
                                className="w-full h-full object-cover"
                                src={ticketData.tour?.imageUrl || "https://images.unsplash.com/photo-1561956021-947f09ae0101?w=800&auto=format&fit=crop&q=60"}
                                crossOrigin="anonymous" // Cấp phép bảo mật cho ảnh Unsplash
                            />
                        </div>

                        {/* Ticket Info Side */}
                        <div className="md:w-2/3 p-6 md:p-10 flex flex-col md:flex-row gap-8">
                            <div className="flex-grow">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                                    <div className="sm:col-span-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.tourName}</p>
                                        <p className="font-headline font-bold text-base md:text-lg leading-tight">
                                            {ticketData.tour?.name || 'Unknown Tour'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.dateTime}</p>
                                        <p className="font-semibold text-sm md:text-base">
                                            {ticketData.tour?.startDate ? new Date(ticketData.tour.startDate).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBA'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.duration}</p>
                                        <p className="font-semibold text-sm md:text-base">
                                            {ticketData.tour?.duration || 'TBA'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.passengers}</p>
                                        <p className="font-semibold text-sm md:text-base">{ticketData.numberOfPeople} {sd.passengerUnit}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">{sd.leadTraveler}</p>
                                        <p className="font-semibold text-sm md:text-base">{ticketData.leadTravelerName || ticketData.user?.fullName || 'VIP Guest'}</p>
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

                            {/* [ĐÃ SỬA]: Dùng thư viện QR nội bộ, sinh ra SVG, chấp mọi loại bảo mật! */}
                            <div className="flex flex-col items-center justify-center p-6 md:border-l border-t md:border-t-0 border-dashed border-outline-variant/30 min-w-[150px]">
                                <div className="bg-white p-2 rounded-lg border border-outline-variant/20 mb-3">
                                    <QRCode
                                        value={`AZURE_TICKET_${ticketData.bookingCode}`}
                                        size={100}
                                        level="M"
                                    />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-outline text-center">Scan at Check-in</p>
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
                                <span className="block text-[10px] font-bold uppercase text-amber-800 tracking-wider">{sd.deadlineLabel}</span>
                                <span className="block font-mono font-bold text-base text-amber-900 mt-1">
                                    {ticketData.createdAt ? new Date(new Date(ticketData.createdAt).getTime() + 24 * 60 * 60 * 1000).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBA'}
                                </span>
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
                                        <p className="font-bold text-on-surface">{sd.officeName}</p>
                                        <p className="mt-1">{sd.officeAddress}</p>
                                        <p className="mt-1 text-[10px] text-outline">{sd.officeHours}</p>
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
                        className={`w-full sm:w-auto px-10 py-4 rounded-full bg-primary text-white font-headline font-bold text-sm tracking-tight shadow-lg hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2 ${isDownloading ? 'opacity-70 cursor-wait' : 'active:scale-95'}`}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {isDownloading ? 'hourglass_empty' : 'download'}
                        </span>
                        {isDownloading ? sd.exportingPdf : sd.downloadTicket}
                    </button>
                    <Link href="/my-bookings" className="w-full sm:w-auto px-10 py-4 rounded-full border border-outline-variant text-primary font-headline font-bold text-sm tracking-tight hover:bg-surface-container-low transition-all text-center">
                        {sd.viewProfile}
                    </Link>
                </section>
            </main>

            <Footer />
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-primary">Loading data...</div>}>
            <SuccessTicketContent />
        </Suspense>
    );
}

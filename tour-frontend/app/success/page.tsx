'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';

import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import QRCode from 'react-qr-code';

function SuccessTicketContent() {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');

    const [ticketData, setTicketData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [isDownloading, setIsDownloading] = useState(false);
    const ticketRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            return;
        }

        const fetchTicket = async () => {
            try {
                const res = await fetchWithAuth(`http://localhost:3000/booking/code/${bookingId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const result = await res.json();

                if (res.ok && result.data) {
                    setTicketData(result.data);
                } else {
                    console.log("Backend báo lỗi:", result.message);
                }
            } catch (error) {
                console.error("Lỗi khi tải vé:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTicket();
    }, [bookingId]);

    const handleDownloadPDF = async () => {
        const element = ticketRef.current;
        if (!element || !ticketData) return;

        // --- BẮT ĐẦU VÁ LỖI BẢO MẬT CSS ---
        // Lưu lại bộ quy tắc gốc của trình duyệt
        const styleSheetProto = CSSStyleSheet.prototype as any;
        const originalCssRules = Object.getOwnPropertyDescriptor(styleSheetProto, 'cssRules');

        // Ghi đè tạm thời: Bỏ qua các file CSS từ Google Fonts gây văng lỗi
        if (originalCssRules) {
            Object.defineProperty(styleSheetProto, 'cssRules', {
                get() {
                    try {
                        // Added optional chaining (?.) and fallback (|| [])
                        return originalCssRules.get?.call(this) || [];
                    } catch (e) {
                        return []; // Bypass lỗi một cách êm ái
                    }
                }
            });
        }

        // --- KẾT THÚC VÁ LỖI ---

        try {
            setIsDownloading(true);

            // Chụp ảnh thẻ HTML siêu mượt
            const dataUrl = await toPng(element, {
                quality: 1,
                pixelRatio: 2,
                cacheBust: true,
            });

            // Khởi tạo file PDF
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

            // Dán ảnh vào PDF và lưu
            pdf.addImage(dataUrl, 'PNG', 0, 10, pdfWidth, pdfHeight);
            pdf.save(`E-Ticket_${ticketData.bookingCode}.pdf`);

        } catch (error) {
            console.error("Lỗi khi tạo PDF:", error);
            alert("Có lỗi xảy ra khi tạo vé PDF. Vui lòng thử lại!");
        } finally {
            setIsDownloading(false);

            // Xuất file xong thì tháo băng bịt mắt, trả lại hiện trạng cho trình duyệt
            if (originalCssRules) {
                Object.defineProperty(styleSheetProto, 'cssRules', originalCssRules);
            }
        }
    };

    if (loading) {
        return (
            <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
                <Header />
                <div className="flex-grow flex items-center justify-center pt-20">
                    <p className="font-bold text-primary text-xl">Đang khởi tạo vé điện tử của bạn...</p>
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
                    <h1 className="text-2xl font-bold text-error">Không tìm thấy thông tin vé</h1>
                    <Link href="/" className="text-primary hover:underline">Quay lại trang chủ</Link>
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
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6 ambient-glow">
                        <span className="material-symbols-outlined text-emerald-600 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
                        Hành trình đang chờ đón, {ticketData.user?.fullName || 'bạn'}!
                    </h1>
                    <p className="text-on-surface-variant text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                        Thanh toán thành công và đặt chỗ của bạn đã được xác nhận. Chúng tôi đã gửi chi tiết lịch trình vào email của bạn.
                    </p>
                </section>

                <section className="max-w-5xl mx-auto mb-16 relative">
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-secondary-container/10 rounded-full blur-3xl -z-10"></div>

                    {/* VÙNG CHỤP ẢNH VÉ */}
                    <div ref={ticketRef} className="bg-white rounded-xl ambient-glow overflow-hidden flex flex-col md:flex-row ticket-cutout ticket-right-cutout border border-outline-variant/10">

                        {/* Image Side */}
                        <div className="md:w-1/3 h-48 md:h-auto overflow-hidden">
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
                                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline mb-1">Mã đặt chỗ</p>
                                        <p className="font-mono text-xl font-bold text-primary tracking-widest">{ticketData.bookingCode}</p>
                                    </div>
                                    <div className="bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-2 border border-emerald-100">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase">
                                            {ticketData.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Chờ xử lý'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                                    <div className="sm:col-span-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">Tên Tour</p>
                                        <p className="font-headline font-bold text-base md:text-lg leading-tight">
                                            {ticketData.tour?.name || 'Tour chưa xác định'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">Hành khách</p>
                                        <p className="font-semibold text-sm md:text-base">{ticketData.numberOfPeople} Người</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">Người đại diện</p>
                                        <p className="font-semibold text-sm md:text-base">{ticketData.user?.fullName || 'Khách hàng VIP'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">Phương thức TT</p>
                                        <p className="font-semibold text-sm md:text-base text-primary">
                                            {ticketData.paymentStatus === 'PAID' ? 'Thanh toán qua VNPAY' : 'Chưa thanh toán'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">Tổng tiền</p>
                                        <p className="font-headline font-extrabold text-xl md:text-2xl text-on-surface">${ticketData.totalPrice?.toLocaleString()}</p>
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
                                <p className="text-[10px] font-bold uppercase tracking-widest text-outline text-center">Quét khi nhận phòng</p>
                            </div>
                        </div>
                    </div>
                </section>

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
                        {isDownloading ? 'Đang xuất PDF...' : 'Tải vé điện tử (PDF)'}
                    </button>
                    <Link href="/my-bookings" className="w-full sm:w-auto px-10 py-4 rounded-full border border-outline-variant text-primary font-headline font-bold text-sm tracking-tight hover:bg-surface-container-low transition-all text-center">
                        Xem trong Hồ sơ của tôi
                    </Link>
                </section>
            </main>

            <Footer />
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-primary">Đang tải dữ liệu...</div>}>
            <SuccessTicketContent />
        </Suspense>
    );
}
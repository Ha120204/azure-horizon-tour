import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
    family: 'BeVietnamPro',
    fonts: [
        { src: '/fonts/BeVietnamPro-Regular.ttf', fontWeight: 400 },
        { src: '/fonts/BeVietnamPro-Bold.ttf', fontWeight: 700 },
    ],
});

type TicketData = {
    bookingCode: string;
    status: string;
    paymentStatus: string;
    paymentMethod?: string | null;
    numberOfPeople: number;
    totalPrice: number;
    leadTravelerName?: string | null;
    user?: { fullName?: string | null } | null;
    tour?: {
        name?: string | null;
        imageUrl?: string | null;
        duration?: string | null;
    } | null;
};

type Props = {
    ticketData: TicketData;
    qrDataUrl: string;
    formattedPrice: string;
    formattedDate: string;
    language: 'vi' | 'en';
};

const C = {
    primary: '#1a56db',
    primaryBg: '#eff6ff',
    primaryBorder: '#bfdbfe',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    white: '#ffffff',
    surface: '#f8fafc',
    emerald: '#059669',
    emeraldBg: '#ecfdf5',
    amber: '#b45309',
    amberBg: '#fffbeb',
};

const s = StyleSheet.create({
    page: {
        flexDirection: 'row',
        backgroundColor: C.white,
    },

    // Left: tour image
    imageCol: {
        width: 196,
        alignSelf: 'stretch',
        position: 'relative',
        overflow: 'hidden',
    },
    tourImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        objectFit: 'cover',
    },
    imageFallback: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1e3a5f',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 14,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    tourNameOnImage: {
        color: C.white,
        fontSize: 12,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        lineHeight: 1.4,
    },

    // Middle: booking info
    infoCol: {
        flex: 1,
        padding: 28,
        paddingTop: 22,
        justifyContent: 'space-between',
        borderLeftWidth: 1,
        borderLeftColor: C.border,
        borderRightWidth: 1,
        borderRightColor: C.border,
    },
    infoTop: {
        flex: 1,
    },
    footer: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: C.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 7,
        color: C.muted,
        fontFamily: 'BeVietnamPro',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    brandName: {
        fontSize: 9,
        color: C.primary,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        letterSpacing: 1.5,
    },
    eticketPill: {
        backgroundColor: C.primaryBg,
        borderRadius: 10,
        paddingTop: 3,
        paddingBottom: 3,
        paddingLeft: 10,
        paddingRight: 10,
        borderWidth: 1,
        borderColor: C.primaryBorder,
    },
    eticketText: {
        fontSize: 7,
        color: C.primary,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        letterSpacing: 1,
    },
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    label: {
        fontSize: 7,
        color: C.muted,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        letterSpacing: 1,
        marginBottom: 4,
    },
    bookingCode: {
        fontSize: 20,
        color: C.primary,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        letterSpacing: 2,
    },
    statusPill: {
        borderRadius: 12,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 12,
        paddingRight: 12,
    },
    statusText: {
        fontSize: 8,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gridItem: {
        width: '50%',
        marginBottom: 22,
        paddingRight: 16,
    },
    gridValue: {
        fontSize: 11,
        color: C.text,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        lineHeight: 1.3,
    },
    totalValue: {
        fontSize: 18,
        color: C.text,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
    },
    primaryValue: {
        fontSize: 11,
        color: C.primary,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        lineHeight: 1.3,
    },

    // Right: QR
    qrCol: {
        width: 136,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        backgroundColor: C.surface,
    },
    qrWrapper: {
        padding: 8,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 6,
        marginBottom: 10,
    },
    qrImage: {
        width: 96,
        height: 96,
    },
    qrScanLabel: {
        fontSize: 6.5,
        color: C.muted,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        letterSpacing: 0.8,
        textAlign: 'center',
    },
    qrBookingCode: {
        fontSize: 6.5,
        color: C.muted,
        fontFamily: 'BeVietnamPro',
        textAlign: 'center',
        marginTop: 5,
        letterSpacing: 0.3,
    },
    qrPendingBox: {
        width: 104,
        minHeight: 104,
        borderWidth: 1,
        borderColor: '#fcd34d',
        borderRadius: 8,
        backgroundColor: C.amberBg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        marginBottom: 10,
    },
    qrPendingMark: {
        fontSize: 22,
        color: C.amber,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: 6,
    },
    qrPendingTitle: {
        fontSize: 7,
        color: C.amber,
        fontFamily: 'BeVietnamPro',
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.35,
    },
    qrPendingText: {
        fontSize: 6,
        color: C.muted,
        fontFamily: 'BeVietnamPro',
        textAlign: 'center',
        lineHeight: 1.35,
        marginTop: 4,
    },

    // Bottom accent
    accentBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: C.primary,
    },
});

const LABELS = {
    vi: {
        brand: 'AZURE HORIZON',
        eticket: 'VÉ ĐIỆN TỬ',
        reservationSlip: 'PHIẾU GIỮ CHỖ',
        bookingCode: 'MÃ ĐẶT CHỖ',
        dateTime: 'NGÀY & GIỜ',
        duration: 'THỜI LƯỢNG',
        passengers: 'HÀNH KHÁCH',
        leadTraveler: 'NGƯỜI ĐẠI DIỆN',
        paymentMethod: 'PHƯƠNG THỨC',
        total: 'TỔNG TIỀN',
        confirmed: 'ĐÃ XÁC NHẬN',
        awaitingPayment: 'CHỜ THANH TOÁN',
        payAtStore: 'Thanh toán tại cửa hàng',
        bankTransfer: 'Chuyển khoản (PayOS)',
        scanAtCheckIn: 'QUÉT KHI CHECK-IN',
        qrPendingMark: 'KHÓA',
        qrPendingTitle: 'VÉ/QR CHƯA KÍCH HOẠT',
        qrPendingDesc: 'Sẽ hiển thị sau khi xác nhận thanh toán.',
        passengerUnit: 'Hành khách',
        tba: 'Đang cập nhật',
        unknownTour: 'Chưa có tên tour',
        reservationSlipFooter: 'Phiếu giữ chỗ chưa phải vé sử dụng dịch vụ. Vui lòng thanh toán tại văn phòng trước hạn chót.',
    },
    en: {
        brand: 'AZURE HORIZON',
        eticket: 'E-TICKET',
        reservationSlip: 'RESERVATION SLIP',
        bookingCode: 'BOOKING CODE',
        dateTime: 'DATE & TIME',
        duration: 'DURATION',
        passengers: 'PASSENGERS',
        leadTraveler: 'LEAD TRAVELER',
        paymentMethod: 'PAYMENT',
        total: 'TOTAL AMOUNT',
        confirmed: 'CONFIRMED',
        awaitingPayment: 'AWAITING PAYMENT',
        payAtStore: 'Pay at Store',
        bankTransfer: 'Bank Transfer (PayOS)',
        scanAtCheckIn: 'SCAN AT CHECK-IN',
        qrPendingMark: 'LOCKED',
        qrPendingTitle: 'TICKET/QR LOCKED',
        qrPendingDesc: 'It will appear after payment is confirmed.',
        passengerUnit: 'Passenger',
        tba: 'TBA',
        unknownTour: 'Unknown Tour',
        reservationSlipFooter: 'This reservation slip is not a valid travel ticket yet. Please pay at our office before the deadline.',
    },
};

export function ETicketPDF({ ticketData, qrDataUrl, formattedPrice, formattedDate, language }: Props) {
    const L = LABELS[language] ?? LABELS.vi;
    const isPaid = ticketData.paymentStatus === 'PAID';
    const isReservationSlip = ticketData.paymentMethod === 'IN_STORE' && !isPaid;
    const travelerName = ticketData.leadTravelerName || ticketData.user?.fullName || '';
    const paymentLabel = ticketData.paymentMethod === 'IN_STORE' ? L.payAtStore
        : ticketData.paymentMethod === 'PAYOS' ? L.bankTransfer
        : L.payAtStore;

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={s.page}>

                {/* Left: tour image */}
                <View style={s.imageCol}>
                    {ticketData.tour?.imageUrl ? (
                        <Image src={ticketData.tour.imageUrl} style={s.tourImage} />
                    ) : (
                        <View style={s.imageFallback} />
                    )}
                    <View style={s.imageOverlay}>
                        <Text style={s.tourNameOnImage}>
                            {ticketData.tour?.name || L.unknownTour}
                        </Text>
                    </View>
                </View>

                {/* Middle: info */}
                <View style={s.infoCol}>
                    <View style={s.infoTop}>
                        <View style={s.headerRow}>
                            <Text style={s.brandName}>{L.brand}</Text>
                            <View style={s.eticketPill}>
                                <Text style={s.eticketText}>{isReservationSlip ? L.reservationSlip : L.eticket}</Text>
                            </View>
                        </View>

                        <View style={s.codeRow}>
                            <View>
                                <Text style={s.label}>{L.bookingCode}</Text>
                                <Text style={s.bookingCode}>{ticketData.bookingCode}</Text>
                            </View>
                            <View style={[
                                s.statusPill,
                                { backgroundColor: isPaid ? C.emeraldBg : C.amberBg },
                            ]}>
                                <Text style={[
                                    s.statusText,
                                    { color: isPaid ? C.emerald : C.amber },
                                ]}>
                                    {isPaid ? L.confirmed : L.awaitingPayment}
                                </Text>
                            </View>
                        </View>

                        <View style={s.grid}>
                            <View style={s.gridItem}>
                                <Text style={s.label}>{L.dateTime}</Text>
                                <Text style={s.gridValue}>{formattedDate || L.tba}</Text>
                            </View>
                            <View style={s.gridItem}>
                                <Text style={s.label}>{L.duration}</Text>
                                <Text style={s.gridValue}>{ticketData.tour?.duration || L.tba}</Text>
                            </View>
                            <View style={s.gridItem}>
                                <Text style={s.label}>{L.passengers}</Text>
                                <Text style={s.gridValue}>{ticketData.numberOfPeople} {L.passengerUnit}</Text>
                            </View>
                            <View style={s.gridItem}>
                                <Text style={s.label}>{L.leadTraveler}</Text>
                                <Text style={s.gridValue}>{travelerName}</Text>
                            </View>
                            <View style={s.gridItem}>
                                <Text style={s.label}>{L.paymentMethod}</Text>
                                <Text style={s.primaryValue}>{paymentLabel}</Text>
                            </View>
                            <View style={s.gridItem}>
                                <Text style={s.label}>{L.total}</Text>
                                <Text style={s.totalValue}>{formattedPrice}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={s.footer}>
                        <Text style={s.footerText}>
                            {isReservationSlip
                                ? L.reservationSlipFooter
                                : language === 'vi'
                                ? 'Vé điện tử có giá trị như vé giấy. Vui lòng xuất trình khi check-in.'
                                : 'This e-ticket is valid as a paper ticket. Please present it at check-in.'}
                        </Text>
                        <Text style={s.footerText}>azurehorizon.tech</Text>
                    </View>
                </View>

                {/* Right: QR */}
                <View style={s.qrCol}>
                    {isReservationSlip ? (
                        <View style={s.qrPendingBox}>
                            <Text style={s.qrPendingMark}>{L.qrPendingMark}</Text>
                            <Text style={s.qrPendingTitle}>{L.qrPendingTitle}</Text>
                            <Text style={s.qrPendingText}>{L.qrPendingDesc}</Text>
                        </View>
                    ) : (
                        <>
                            <View style={s.qrWrapper}>
                                <Image src={qrDataUrl} style={s.qrImage} />
                            </View>
                            <Text style={s.qrScanLabel}>{L.scanAtCheckIn}</Text>
                        </>
                    )}
                    <Text style={s.qrBookingCode}>{ticketData.bookingCode}</Text>
                </View>

                {/* Bottom accent bar */}
                <View style={s.accentBar} />

            </Page>
        </Document>
    );
}

export const EXPIRY_MINUTES = 15;

export type TripLifecycle = 'UPCOMING' | 'DEPARTING_TODAY' | 'COMPLETED';

export type CancellationPolicy = {
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

export type BookingTransportAssignment = {
    outboundTicketCodes: string[];
    outboundSeatNumbers: string[];
    outboundPnrCode?: string | null;
    returnTicketCodes: string[];
    returnSeatNumbers: string[];
    returnPnrCode?: string | null;
    vehiclePlate?: string | null;
    seatNumbers: string[];
    notes?: string | null;
    assignedAt: string;
};

export type BookingDepartureTransport = {
    type: 'FLIGHT' | 'BUS' | 'PRIVATE_CAR' | 'COMBO' | 'SELF_ARRANGED';
    airline?: string | null;
    flightCode?: string | null;
    departureAirport?: string | null;
    arrivalAirport?: string | null;
    boardingPoint?: string | null;
    boardingTime?: string | null;
    departureTime?: string | null;
    arrivalTime?: string | null;
    vehicleType?: string | null;
    operator?: string | null;
    notes?: string | null;
};

export type BookingContactInfo = {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    identityType?: string | null;
    identityNo?: string | null;
};

export type BookingPassenger = {
    type?: string | null;
    fullName?: string | null;
    dob?: string | null;
    gender?: string | null;
    identityType?: string | null;
    identityNo?: string | null;
    notes?: string | null;
};

export type BookingDetail = {
    id: number;
    bookingCode: string;
    status: string;
    paymentStatus: string;
    paymentMethod?: string | null;
    createdAt: string;
    holdExpiresAt?: string | null;
    departureDate?: string | null;
    meetingTime?: string | null;
    pickupLocation?: string | null;
    contactInfo?: BookingContactInfo | null;
    passengers?: BookingPassenger[] | null;
    incompletePassengerCount?: number;
    passengerInfoDeadline?: string | null;
    passengerInfoOverdue?: boolean;
    user?: {
        fullName?: string | null;
        email?: string | null;
        phone?: string | null;
    } | null;
    numberOfPeople: number;
    totalPrice: number | string;
    unitPriceAtBooking?: number | null;
    discountAmount?: number;
    voucherCode?: string | null;
    cancelReason?: string | null;
    cancelRequestedAt?: string | null;
    cancelledAt?: string | null;
    refundAmount?: number | string | null;
    refundNote?: string | null;
    cancellationPolicy?: CancellationPolicy;
    supportTickets?: { id: number; status: string; subject?: string | null; createdAt: string }[];
    transportAssignment?: BookingTransportAssignment | null;
    departureTransport?: BookingDepartureTransport | null;
    tour?: {
        id?: number;
        name?: string;
        tourCode?: string;
        imageUrl?: string | null;
        duration?: string | null;
        startDate?: string | null;
    } | null;
};

export type PaymentIssueForm = {
    amount: string;
    transferredAt: string;
    transactionRef: string;
    senderBank: string;
    senderAccountName: string;
    note: string;
};

export type PaymentIssueResult = {
    message: string;
    ticketId?: number;
    accessCode?: string;
};

export type QRPaymentData = {
    checkoutUrl: string;
    qrCode?: string;
    accountNumber?: string;
    accountName?: string;
    description: string;
    amount: number;
    expiresAt: string;
};

export type BankOption = {
    shortName: string;
    name: string;
    logo?: string;
};

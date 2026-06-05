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

export type BookingDetail = {
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

export type BankOption = {
    shortName: string;
    name: string;
    logo?: string;
};

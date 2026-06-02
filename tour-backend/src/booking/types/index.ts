import {
  type AssistedBookingDraft,
  type BookingStatus,
  type PaymentStatus,
  type Prisma,
  type Tour,
  type TourDeparture,
} from '@prisma/client';

// ─── Primitive types ──────────────────────────────────────────────────────────

export type TransactionClient = Prisma.TransactionClient;

export type TripLifecycle = 'UPCOMING' | 'DEPARTING_TODAY' | 'COMPLETED';

export type CancellationPolicyTier =
  | 'UNPAID'
  | 'FULL_REFUND_24H'
  | 'EIGHTY_REFUND'
  | 'HALF_REFUND'
  | 'NO_REFUND'
  | 'NOT_CANCELABLE';

export type CancellationPolicy = {
  canCancel: boolean;
  tripLifecycle: TripLifecycle;
  cancelUnavailableReason?: string;
  refundPercent: number;
  estimatedRefundAmount: number;
  refundNote: string;
  policyTier: CancellationPolicyTier;
  departureDate: Date;
  daysUntilDeparture: number;
};

export type PassengerInput = {
  type?: string;
  [key: string]: Prisma.JsonValue | undefined;
};

export type AssistedQuoteDto = {
  customerId?: number | null;
  tourId: number;
  departureId?: number;
  packageId?: number;
  numberOfPeople: number;
  passengers?: PassengerInput[];
  voucherCode?: string;
};

export type AssistedQuote = {
  tour: Tour;
  basePrice: number;
  totalPrice: number;
  discountAmount: number;
  voucherCode: string | null;
};

export type AssistedDraftRecord = AssistedBookingDraft & Record<string, unknown>;

export type AssistedCustomerDraft = Pick<
  AssistedBookingDraft,
  | 'customerId'
  | 'customerEmail'
  | 'customerPhone'
  | 'customerIdentityNo'
  | 'customerName'
>;

export type PayosError = {
  code?: string;
};

export type PaymentNotificationPayload = {
  bookingCode: string;
  customerName: string;
  tourName: string;
  startDate: string;
  duration: string;
  passengerBreakdown: string;
  totalPrice: string;
  discountAmount?: string;
  deadlineText: string;
};

// ─── Re-export Prisma types used across booking services ─────────────────────

export type { BookingStatus, PaymentStatus, TourDeparture };

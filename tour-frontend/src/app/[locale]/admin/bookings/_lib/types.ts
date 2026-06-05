import type { PassengerType as SharedPassengerType } from '@/lib/passengerDetails';

export interface BookingUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string;
}

export interface BookingTour {
  id: number;
  name: string;
  imageUrl?: string;
  tourCode: string;
  destination?: { name: string };
}

export interface BookingNotification {
  id: number;
  type: string;
  channel: string;
  recipient?: string | null;
  status: string;
  content: string;
  paymentUrl?: string | null;
  qrCodeUrl?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface PaymentTransaction {
  id: number;
  gateway: string;
  transactionRef?: string | null;
  amount: number;
  status: string;
  confirmedSource?: string | null;
  confirmedById?: number | null;
  confirmedAt?: string | null;
  confirmedNote?: string | null;
  evidenceUrl?: string | null;
  createdAt: string;
}

export interface Booking {
  id: number;
  bookingCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCEL_REQUESTED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED' | 'PROCESSING';
  paymentMethod: 'PAYOS' | 'IN_STORE';
  numberOfPeople: number;
  totalPrice: number;
  unitPriceAtBooking: number;
  discountAmount: number;
  voucherCode?: string | null;
  createdAt: string;
  cancelRequestedAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancelReason?: string | null;
  departureDate?: string | null;
  contactPhone?: string | null;
  adminNote?: string | null;
  user: BookingUser;
  tour: BookingTour | null;
  refundAmount?: number | null;
  refundedAt?: string | null;
  refundNote?: string | null;
  notifications?: BookingNotification[];
  transactions?: PaymentTransaction[];
  supportTickets?: { id: number; status: string; category: string; subject?: string | null; createdAt: string }[];
}

export interface Stats {
  pending: number;
  confirmed: number;
  cancelRequested: number;
  cancelled: number;
  total: number;
  totalRevenue: number;
  paidCount: number;
  unpaidCount: number;
  processingCount?: number;
  failedPaymentCount: number;
  assistedDraftPending?: number;
  assistedDraftNeedsRevision?: number;
}

export interface Meta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

export interface BookingListPayload {
  bookings?: Booking[];
  stats?: Stats;
  meta?: Meta;
}

export interface BookingKpiItem {
  icon: string;
  label: string;
  value: string;
  sub: string;
  bg: string;
  ic: string;
  onClick: () => void;
  active: boolean;
}

export interface PaymentStatBreakdown {
  source: string;
  revenue: number;
  count: number;
  percentage: number;
}

export interface PaymentStats {
  totalRevenue: number;
  totalCount: number;
  breakdown: PaymentStatBreakdown[];
  byGroup: Record<string, { revenue: number; percentage: number }>;
}

export type BookingSavedViewKey = 'all' | 'pending' | 'unpaid' | 'upcoming' | 'cancelled' | 'needsCall';

export type AssistedDraftStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'NEEDS_REVISION' | 'REJECTED' | 'CONVERTED';
export type AssistedDraftAction = 'submit' | 'approve' | 'reject' | 'request-revision';
export type AssistedDraftReviewAction = Extract<AssistedDraftAction, 'approve' | 'reject' | 'request-revision'>;
export type PassengerType = SharedPassengerType;

export type DraftPassenger = {
  type?: PassengerType | string;
  fullName?: string;
  dob?: string;
  gender?: string;
  identityType?: string;
  identityNo?: string;
  notes?: string;
  [key: string]: unknown;
};

export interface AssistedDraft {
  id: number;
  draftCode: string;
  status: AssistedDraftStatus;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerIdentityNo?: string | null;
  sourceChannel: string;
  confirmationChannel?: string | null;
  emailForTicket?: string | null;
  tourId?: number | null;
  packageId?: number | null;
  departureId?: number | null;
  numberOfPeople: number;
  quotedPrice: number;
  unitPriceAtDraft?: number | null;
  discountAmount: number;
  passengers?: DraftPassenger[] | null;
  voucherCode?: string | null;
  internalNote?: string | null;
  specialRequests?: string | null;
  rejectionReason?: string | null;
  approvalNote?: string | null;
  createdAt: string;
  tour?: BookingTour | null;
  createdByStaff?: { id: number; fullName: string; email: string; role: string } | null;
  reviewedByAdmin?: { id: number; fullName: string; email: string; role: string } | null;
  convertedBooking?: { id: number; bookingCode: string; status: string; paymentStatus: string } | null;
}

export interface TourDepartureOption {
  id?: number;
  departureDate?: string | null;
  price?: number | null;
  availableSeats?: number;
  isActive?: boolean;
}

export interface TourOption {
  id: number;
  name: string;
  price: number;
  availableSeats: number;
  imageUrl?: string | null;
  destination?: { name: string };
  packages?: { id: number; name: string; price: number; isActive?: boolean }[];
  departures?: TourDepartureOption[];
}

export type AssistedDraftForm = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerIdentityNo: string;
  sourceChannel: string;
  confirmationChannel: string;
  emailForTicket: string;
  tourId: string;
  departureId: string;
  packageId: string;
  adultCount: string;
  childCount: string;
  infantCount: string;
  voucherCode: string;
  specialRequests: string;
  internalNote: string;
};

export type AssistedDraftFormErrors = Partial<Record<keyof AssistedDraftForm, string>>;

export type DraftSelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
};

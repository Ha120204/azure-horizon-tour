export interface UserVoucherEntry {
  id: number;
  isUsed: boolean;
  savedAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface VoucherAnalyticsTopTour {
  tourId: number;
  tourName: string;
  imageUrl: string | null;
  bookingCount: number;
  totalRevenue: number;
  totalDiscount: number;
}

export interface VoucherAnalyticsBooking {
  id: number;
  bookingCode: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  numberOfPeople: number;
  totalPrice: number;
  discountAmount: number;
  customer: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  tour: {
    id: number;
    name: string;
    imageUrl: string | null;
  };
}

export interface VoucherAnalytics {
  scope: 'paid_bookings_all_time';
  totalBookings: number;
  paidBookings: number;
  totalRevenue: number;
  totalDiscount: number;
  averageOrderValue: number;
  topTours: VoucherAnalyticsTopTour[];
  recentBookings: VoucherAnalyticsBooking[];
}

export interface VoucherDetail {
  id: number;
  code: string;
  label: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue: number;
  maxUses: number;
  usageLimitPerUser?: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  isStackable: boolean;
  eligibleTourIds: number[];
  eligibleDestinationIds: number[];
  eligibleCustomerSegments: string[];
  createdAt: string;
  computedStatus: 'active' | 'expired' | 'depleted' | 'inactive' | 'scheduled';
  analytics?: VoucherAnalytics;
  userVouchers: UserVoucherEntry[];
  _count: { userVouchers: number };
}

export interface VoucherDetailDrawerProps {
  voucherId: number | null;
  onClose: () => void;
}

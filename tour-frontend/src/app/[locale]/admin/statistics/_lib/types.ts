export interface RevenuePoint { key: string; label: string; revenue: number; bookings: number }
export interface DestRevenue { name: string; revenue: number; bookings: number }
export interface BookingStatusDist { name: string; value: number; key: string }
export interface BookingStatusData {
    total: number;
    distribution: BookingStatusDist[];
    paymentStatus: { name: string; value: number }[];
    recentTrend: { date: string; count: number }[];
}
export interface TopTour {
    tourId: number; name: string; destination: string;
    totalBookings: number; totalRevenue: number;
}
export interface TopCustomer {
    userId: number; fullName: string; email: string;
    totalBookings: number; totalSpent: number;
}
export interface VoucherOverview {
    totalVouchers: number; activeVouchers: number;
    totalDiscountGiven: number; bookingsWithVoucher: number; voucherUsageRate: number;
}
export interface TopVoucher {
    id: number; code: string; discountValue: number; discountType: string;
    usedCount: number; maxUses: number; usageRate: number; isActive: boolean;
}

export type ChartPayload = { value?: number };
export type ChartTooltipProps = {
    active?: boolean;
    payload?: ChartPayload[];
    label?: string;
};

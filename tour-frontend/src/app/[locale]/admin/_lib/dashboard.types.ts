export interface OverviewData {
    period: { from: string; to: string };
    revenue: { current: number; previous: number; changePercent: number };
    bookings: { total: number; previous: number; confirmed: number; cancelled: number; cancellationRate: number; changePercent: number };
    aov: { current: number; previous: number; changePercent: number };
    tours: { active: number };
    customers: { newInPeriod: number; previousNewInPeriod: number; changePercent: number };
}

export interface BookingStatus {
    total: number;
    distribution: { name: string; value: number; key: string }[];
}

export interface RecentBooking {
    id: number;
    bookingCode: string;
    totalPrice: number;
    numberOfPeople: number;
    status: string;
    createdAt: string;
    user: { fullName: string; email: string; avatarUrl: string | null };
    tour: { name: string; tourCode: string };
}

export interface OperationalStats {
    bookingPending: number;
    cancelRequested: number;
    tourPending: number;
    articlePending: number;
    supportOpen: number;
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'new';

export interface TrendMeta {
    label: string;
    direction: TrendDirection;
}

export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    CONFIRMED: { label: 'Xác nhận', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    PENDING: { label: 'Chờ xử lý', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    CANCELLED: { label: 'Đã hủy', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
};

export const PIE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444'];

export const GRAN_LABEL: Record<string, string> = {
    daily: 'Theo ngày', weekly: 'Theo tuần', monthly: 'Theo tháng',
};

export const PRESETS = [
    { label: '7 ngày', days: 7 },
    { label: '30 ngày', days: 30 },
    { label: '3 tháng', days: 90 },
    { label: '12 tháng', days: 365 },
] as const;

export const EMPTY_OPERATIONAL_STATS: OperationalStats = {
    bookingPending: 0, cancelRequested: 0, tourPending: 0, articlePending: 0, supportOpen: 0,
};

export function getTrendMeta(current: number, previous: number, changePercent: number): TrendMeta {
    if (previous === 0 && current > 0) return { label: 'Mới phát sinh', direction: 'new' };
    if (previous === 0 && current === 0) return { label: 'Chưa có kỳ trước', direction: 'flat' };
    if (changePercent === 0) return { label: 'Không đổi', direction: 'flat' };
    return {
        label: `${changePercent > 0 ? '+' : ''}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(changePercent)}%`,
        direction: changePercent > 0 ? 'up' : 'down',
    };
}

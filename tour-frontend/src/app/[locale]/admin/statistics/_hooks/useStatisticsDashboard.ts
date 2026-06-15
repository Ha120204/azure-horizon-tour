'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import { api } from '@/lib/http/fetchWithAuth';
import type { OverviewData } from '../../_lib/dashboard.types';
import {
    getDateRange,
    getGranularity,
    getPeriodLabel,
} from '../_lib/helpers';
import type {
    BookingStatusData,
    DestRevenue,
    RevenuePoint,
    TopCustomer,
    TopTour,
    TopVoucher,
    VoucherOverview,
} from '../_lib/types';

export function useStatisticsDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const [activeDays, setActiveDays] = useState<number>(30);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [isCustom, setIsCustom] = useState(false);
    const [dateRange, setDateRange] = useState(() => getDateRange(30));

    const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
    const [destRevenue, setDestRevenue] = useState<DestRevenue[]>([]);
    const [bookingStatus, setBookingStatus] = useState<BookingStatusData | null>(null);
    const [topTours, setTopTours] = useState<TopTour[]>([]);
    const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
    const [voucherOverview, setVoucherOverview] = useState<VoucherOverview | null>(null);
    const [topVouchers, setTopVouchers] = useState<TopVoucher[]>([]);
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [dashboardError, setDashboardError] = useState('');
    const fetchIdRef = useRef(0);

    const fetchAll = useCallback(async (options: { silent?: boolean } = {}) => {
        const currentId = ++fetchIdRef.current;
        const silent = options.silent ?? false;
        if (!silent) { setLoading(true); setDashboardError(''); }
        const { from, to } = dateRange;
        const diffDays = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
        const gran = getGranularity(diffDays);
        try {
            const [overviewRes, revRes, destRes, bsRes, toursRes, custRes, vouchRes] = await Promise.all([
                api.get<OverviewData>(`/statistics/overview?dateFrom=${from}&dateTo=${to}`, { silent }),
                api.get<{ data: RevenuePoint[] }>(`/statistics/revenue?dateFrom=${from}&dateTo=${to}&granularity=${gran}`, { silent }),
                api.get<DestRevenue[]>(`/statistics/destinations/revenue?dateFrom=${from}&dateTo=${to}&limit=8`, { silent }),
                api.get<BookingStatusData>(`/statistics/bookings/status?dateFrom=${from}&dateTo=${to}`, { silent }),
                api.get<TopTour[]>(`/statistics/tours/top?limit=5&dateFrom=${from}&dateTo=${to}`, { silent }),
                api.get<TopCustomer[]>(`/statistics/customers/top?limit=5&dateFrom=${from}&dateTo=${to}`, { silent }),
                api.get<{ overview: VoucherOverview; topVouchers: TopVoucher[] }>(`/statistics/vouchers/summary`, { silent }),
            ]);
            if (fetchIdRef.current !== currentId) return;
            if (overviewRes.ok) setOverview(overviewRes.data);
            if (revRes.ok) setRevenueData(revRes.data.data ?? []);
            if (destRes.ok) setDestRevenue(destRes.data ?? []);
            if (bsRes.ok) setBookingStatus(bsRes.data);
            if (toursRes.ok) setTopTours(toursRes.data ?? []);
            if (custRes.ok) setTopCustomers(custRes.data ?? []);
            if (vouchRes.ok) {
                setVoucherOverview(vouchRes.data.overview ?? null);
                setTopVouchers(vouchRes.data.topVouchers ?? []);
            }
            const allFailed = [overviewRes, revRes, destRes, bsRes, toursRes, custRes, vouchRes].every(r => !r.ok);
            if (!silent && allFailed) {
                setDashboardError('Không tải được dữ liệu thống kê. Vui lòng thử làm mới lại.');
            } else {
                setLastUpdatedAt(new Date());
            }
        } catch {
            if (fetchIdRef.current !== currentId) return;
            if (!silent) setDashboardError('Không tải được dữ liệu thống kê. Vui lòng thử làm mới lại.');
        } finally {
            if (fetchIdRef.current !== currentId) return;
            if (!silent) setLoading(false);
        }
    }, [dateRange]);

    const handlePreset = useCallback((days: number) => {
        setActiveDays(days);
        setIsCustom(false);
        setDateRange(getDateRange(days));
    }, []);

    const handleCustomApply = useCallback(() => {
        if (!customFrom || !customTo || customFrom > customTo) return;
        setIsCustom(true);
        setActiveDays(0);
        setDateRange({ from: customFrom, to: customTo });
    }, [customFrom, customTo]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    useAdminAutoRefresh({
        intervalMs: 3 * 60 * 1000,
        onRefresh: () => fetchAll({ silent: true }),
    });

    const { from, to } = dateRange;
    const diffDays = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
    const gran = getGranularity(diffDays);
    const maxRevenue = revenueData.length ? Math.max(...revenueData.map(d => d.revenue)) : 1;
    const periodLabel = getPeriodLabel(isCustom, activeDays || diffDays, from, to);
    const totalRevenue = revenueData.reduce((sum, point) => sum + point.revenue, 0);
    const totalTrendBookings = revenueData.reduce((sum, point) => sum + point.bookings, 0);
    const nonZeroRevenuePoints = revenueData.filter(point => point.revenue > 0).length;
    const hasRevenueData = totalRevenue > 0;
    const bestRevenuePoint = revenueData.find(point => point.revenue === maxRevenue);
    const totalDestinationRevenue = destRevenue.reduce((sum, point) => sum + point.revenue, 0);
    const topDestination = destRevenue[0];
    const topDestinationShare = topDestination && totalDestinationRevenue > 0
        ? (topDestination.revenue / totalDestinationRevenue) * 100
        : 0;
    const cancelledStatus = bookingStatus?.distribution.find(item => item.key === 'CANCELLED');
    const cancellationRate = bookingStatus && bookingStatus.total > 0 && cancelledStatus
        ? (cancelledStatus.value / bookingStatus.total) * 100
        : 0;
    const trendHasEnoughData = (bookingStatus?.recentTrend.filter(point => point.count > 0).length ?? 0) > 1;

    return {
        today,
        activeDays,
        customFrom,
        customTo,
        isCustom,
        from,
        to,
        gran,
        periodLabel,
        overview,
        revenueData,
        destRevenue,
        bookingStatus,
        topTours,
        topCustomers,
        voucherOverview,
        topVouchers,
        loading,
        lastUpdatedAt,
        dashboardError,
        maxRevenue,
        totalRevenue,
        totalTrendBookings,
        nonZeroRevenuePoints,
        hasRevenueData,
        bestRevenuePoint,
        topDestination,
        topDestinationShare,
        cancellationRate,
        trendHasEnoughData,
        setCustomFrom,
        setCustomTo,
        fetchAll,
        handlePreset,
        handleCustomApply,
    };
}

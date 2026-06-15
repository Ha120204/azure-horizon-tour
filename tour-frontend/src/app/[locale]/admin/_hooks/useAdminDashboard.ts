'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/http/fetchWithAuth';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import { getDateRange, getGranularity } from '../_lib/helpers';
import type { OverviewData, BookingStatus, RecentBooking, OperationalStats } from '../_lib/dashboard.types';
import { EMPTY_OPERATIONAL_STATS } from '../_lib/dashboard.types';
import type { RevenuePoint } from '../statistics/_lib/types';

export function useAdminDashboard(enabled: boolean) {
    const [activeDays, setActiveDays] = useState<number>(30);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [isCustom, setIsCustom] = useState(false);
    const [dateRange, setDateRange] = useState(() => getDateRange(30));

    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
    const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
    const [operationalStats, setOperationalStats] = useState<OperationalStats>(EMPTY_OPERATIONAL_STATS);
    const [loading, setLoading] = useState(true);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [dashboardError, setDashboardError] = useState('');

    const fetchAll = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) setLoading(true);
        if (!options.silent) setDashboardError('');
        const { from, to } = dateRange;
        const diffDays = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
        const gran = getGranularity(diffDays);
        try {
            const [ovRes, revRes, bsRes, rbRes, opStatsRes] = await Promise.all([
                api.get<OverviewData>(`/statistics/overview?dateFrom=${from}&dateTo=${to}`),
                api.get<{ granularity: string; from: string; to: string; data: RevenuePoint[] }>(
                    `/statistics/revenue?dateFrom=${from}&dateTo=${to}&granularity=${gran}`,
                ),
                api.get<BookingStatus>(`/statistics/bookings/status?dateFrom=${from}&dateTo=${to}`),
                api.get<RecentBooking[]>(`/booking/admin/recent?limit=5`),
                api.get<OperationalStats>(`/booking/admin/operational-stats`),
            ]);

            if (!ovRes.ok && !revRes.ok && !options.silent) {
                setDashboardError('Không tải được dữ liệu tổng quan. Vui lòng thử làm mới lại.');
            }
            if (ovRes.ok) setOverview(ovRes.data);
            if (revRes.ok) setRevenueData(revRes.data.data ?? []);
            if (bsRes.ok) setBookingStatus(bsRes.data);
            if (rbRes.ok) setRecentBookings(Array.isArray(rbRes.data) ? rbRes.data : []);
            if (opStatsRes.ok) setOperationalStats(opStatsRes.data);
            setLastUpdatedAt(new Date());
        } catch (e) {
            if (options.silent) return;
            console.error('Dashboard error:', e);
            setDashboardError('Không tải được dữ liệu tổng quan. Vui lòng thử làm mới lại.');
        } finally {
            if (!options.silent) setLoading(false);
        }
    }, [dateRange]);

    const handlePreset = (days: number) => {
        setActiveDays(days);
        setIsCustom(false);
        setDateRange(getDateRange(days));
    };

    const handleCustomApply = () => {
        if (!customFrom || !customTo || customFrom > customTo) return;
        setIsCustom(true);
        setActiveDays(0);
        setDateRange({ from: customFrom, to: customTo });
    };

    useEffect(() => {
        if (enabled) fetchAll();
    }, [fetchAll, enabled]);

    useAdminAutoRefresh({
        enabled,
        intervalMs: 60 * 1000,
        onRefresh: () => fetchAll({ silent: true }),
    });

    return {
        today: new Date().toISOString().split('T')[0],
        activeDays, customFrom, customTo, isCustom, dateRange,
        setCustomFrom, setCustomTo,
        overview, revenueData, bookingStatus, recentBookings, operationalStats,
        loading, lastUpdatedAt, dashboardError,
        handlePreset, handleCustomApply, fetchAll,
    };
}

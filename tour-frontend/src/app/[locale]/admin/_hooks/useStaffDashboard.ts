'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/http/fetchWithAuth';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import type { QuickStats, RecentTour, RecentTicket, BookingResult } from '../_components/staffDashboard/types';

type StatMap = Record<string, number | undefined>;

export function useStaffDashboard() {
    const [stats, setStats] = useState<QuickStats | null>(null);
    const [recentTours, setRecentTours] = useState<RecentTour[]>([]);
    const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [bookingResults, setBookingResults] = useState<BookingResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState('');

    const fetchData = useCallback(async (options: { silent?: boolean } = {}) => {
        const silent = options.silent ?? false;
        if (!silent) {
            setLoading(true);
            setLoadError('');
        }

        try {
            const [statsRes, toursRes, ticketsRes, tourStatsRes, articleStatsRes, supportStatsRes] = await Promise.all([
                api.get<StatMap>('/booking/admin/stats', { silent }),
                api.get<RecentTour[]>('/tour?limit=6', { silent }),
                api.get<{ tickets?: RecentTicket[] }>('/support/tickets?view=open&limit=5', { silent }),
                api.get<StatMap>('/tour/admin/stats', { silent }),
                api.get<StatMap>('/article/admin/stats', { silent }),
                api.get<StatMap>('/support/stats', { silent }),
            ]);

            if (!statsRes.ok) throw new Error('Không thể tải thống kê vận hành.');

            const bookingStats = statsRes.data;
            const tourStats = tourStatsRes.ok ? tourStatsRes.data : {};
            const articleStats = articleStatsRes.ok ? articleStatsRes.data : {};
            const supportStats = supportStatsRes.ok ? supportStatsRes.data : {};

            setStats({
                pending: bookingStats.pending ?? 0,
                confirmed: bookingStats.confirmed ?? 0,
                cancelRequested: bookingStats.cancelRequested ?? 0,
                total: bookingStats.total ?? 0,
                publishedTours: bookingStats.publishedTours ?? 0,
                unpaidCount: bookingStats.unpaidCount ?? 0,
                pendingOverdue: bookingStats.pendingOverdue ?? 0,
                cancelRequestedOverdue: bookingStats.cancelRequestedOverdue ?? 0,
                assistedDraftPending: bookingStats.assistedDraftPending ?? 0,
                tourDraft: tourStats.draft ?? 0,
                tourPending: tourStats.pending ?? 0,
                articleDraft: articleStats.draft ?? 0,
                articlePending: articleStats.pending ?? 0,
                supportOpen: supportStats.open ?? 0,
                supportAssignedToMeOpen: supportStats.assignedToMeOpen ?? 0,
                supportUnassignedOpen: supportStats.unassignedOpen ?? 0,
                supportOverdue: supportStats.overdue ?? 0,
            });

            setRecentTours(toursRes.ok && Array.isArray(toursRes.data) ? toursRes.data.slice(0, 6) : []);
            setRecentTickets(ticketsRes.ok && Array.isArray(ticketsRes.data.tickets) ? ticketsRes.data.tickets.slice(0, 5) : []);

            setLastUpdated(new Date());
        } catch (error) {
            if (silent) return;
            console.error('Staff dashboard error:', error);
            setLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu tổng quan.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useAdminAutoRefresh({
        intervalMs: 60 * 1000,
        pause: searching,
        onRefresh: () => fetchData({ silent: true }),
    });

    const handleQueryChange = (value: string) => {
        setSearchQuery(value);
        if (!value.trim()) {
            setBookingResults([]);
            setHasSearched(false);
            setSearchError('');
        }
    };

    const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;

        setSearching(true);
        setHasSearched(true);
        setSearchError('');

        try {
            const res = await api.get<BookingResult[]>(
                `/booking/admin/all?search=${encodeURIComponent(query)}&limit=5`,
                { silent: true },
            );
            if (!res.ok) throw new Error('Không thể tra cứu booking lúc này.');
            setBookingResults(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Booking lookup error:', error);
            setBookingResults([]);
            setSearchError(error instanceof Error ? error.message : 'Không thể tra cứu booking lúc này.');
        } finally {
            setSearching(false);
        }
    };

    return {
        stats,
        recentTours,
        recentTickets,
        loading,
        loadError,
        lastUpdated,
        fetchData,
        searchQuery,
        handleQueryChange,
        bookingResults,
        searching,
        hasSearched,
        searchError,
        handleSearch,
    };
}

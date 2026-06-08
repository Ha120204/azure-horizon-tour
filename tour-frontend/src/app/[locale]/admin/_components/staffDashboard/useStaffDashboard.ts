'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import type { QuickStats, MyTour, MyTicket, BookingResult } from './types';
import { toObject, toArray, getNumber } from './constants';

export function useStaffDashboard() {
    const [stats, setStats] = useState<QuickStats | null>(null);
    const [myTours, setMyTours] = useState<MyTour[]>([]);
    const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [bookingResults, setBookingResults] = useState<BookingResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState('');

    const fetchData = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) setLoading(true);
        if (!options.silent) setLoadError('');

        try {
            const [statsRes, toursRes, ticketsRes, tourStatsRes, articleStatsRes, supportStatsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/booking/admin/stats`),
                fetchWithAuth(`${API_BASE_URL}/tour?limit=6`),
                fetchWithAuth(`${API_BASE_URL}/support/tickets?view=open&limit=5`),
                fetchWithAuth(`${API_BASE_URL}/tour/admin/stats`),
                fetchWithAuth(`${API_BASE_URL}/article/admin/stats`),
                fetchWithAuth(`${API_BASE_URL}/support/stats`),
            ]);

            if (!statsRes.ok) throw new Error('Không thể tải thống kê vận hành.');

            const statsJson = await statsRes.json();
            const bookingStats = toObject(toObject(statsJson).data ?? statsJson);
            const [tourStatsJson, articleStatsJson, supportStatsJson] = await Promise.all([
                tourStatsRes.ok ? tourStatsRes.json() : Promise.resolve({}),
                articleStatsRes.ok ? articleStatsRes.json() : Promise.resolve({}),
                supportStatsRes.ok ? supportStatsRes.json() : Promise.resolve({}),
            ]);
            const tourStats = toObject(toObject(tourStatsJson).data ?? tourStatsJson);
            const articleStats = toObject(toObject(articleStatsJson).data ?? articleStatsJson);
            const supportStats = toObject(toObject(supportStatsJson).data ?? supportStatsJson);

            setStats({
                pending: getNumber(bookingStats, 'pending'),
                confirmed: getNumber(bookingStats, 'confirmed'),
                cancelRequested: getNumber(bookingStats, 'cancelRequested'),
                total: getNumber(bookingStats, 'total'),
                publishedTours: getNumber(bookingStats, 'publishedTours'),
                unpaidCount: getNumber(bookingStats, 'unpaidCount'),
                pendingOverdue: getNumber(bookingStats, 'pendingOverdue'),
                cancelRequestedOverdue: getNumber(bookingStats, 'cancelRequestedOverdue'),
                assistedDraftPending: getNumber(bookingStats, 'assistedDraftPending'),
                tourDraft: getNumber(tourStats, 'draft'),
                tourPending: getNumber(tourStats, 'pending'),
                articleDraft: getNumber(articleStats, 'draft'),
                articlePending: getNumber(articleStats, 'pending'),
                supportOpen: getNumber(supportStats, 'open'),
                supportAssignedToMeOpen: getNumber(supportStats, 'assignedToMeOpen'),
                supportUnassignedOpen: getNumber(supportStats, 'unassignedOpen'),
                supportOverdue: getNumber(supportStats, 'overdue'),
            });

            if (toursRes.ok) {
                const toursJson = await toursRes.json();
                setMyTours(toArray(toursJson).slice(0, 6) as MyTour[]);
            } else {
                setMyTours([]);
            }

            if (ticketsRes.ok) {
                const ticketsJson = await ticketsRes.json();
                setMyTickets(toArray(ticketsJson).slice(0, 5) as MyTicket[]);
            } else {
                setMyTickets([]);
            }

            setLastUpdated(new Date());
        } catch (error) {
            if (options.silent) return;
            console.error('Staff dashboard error:', error);
            setLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu tổng quan.');
        } finally {
            if (options.silent) return;
            setLoading(false);
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
            const res = await fetchWithAuth(
                `${API_BASE_URL}/booking/admin/all?search=${encodeURIComponent(query)}&limit=5`
            );
            if (!res.ok) throw new Error('Không thể tra cứu booking lúc này.');
            const json = await res.json();
            setBookingResults(toArray(json) as BookingResult[]);
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
        myTours,
        myTickets,
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

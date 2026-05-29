'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { writeClipboardText } from '../_lib/helpers';
import type { ActivityLog, KpiFilter, LogStats } from '../_lib/types';

export function useSystemLogs() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const linkedLogIdParam = searchParams.get('logId');

    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [stats, setStats] = useState<LogStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [copiedLogId, setCopiedLogId] = useState<number | null>(null);
    const [copyErrorLogId, setCopyErrorLogId] = useState<number | null>(null);
    const [linkedLog, setLinkedLog] = useState<ActivityLog | null>(null);
    const [linkedLogError, setLinkedLogError] = useState<string | null>(null);
    const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeShortcut, setActiveShortcut] = useState<string>('');
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const displayLogs = useMemo(() => {
        if (!linkedLog) return logs;
        return logs.some(log => log.id === linkedLog.id) ? logs : [linkedLog, ...logs];
    }, [linkedLog, logs]);

    const applyShortcut = useCallback((key: string) => {
        const now = new Date();
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        const today = fmt(now);

        if (key === activeShortcut) {
            setDateFrom('');
            setDateTo('');
            setActiveShortcut('');
            setPage(1);
            return;
        }

        setActiveShortcut(key);
        setPage(1);

        if (key === 'today') {
            setDateFrom(today);
            setDateTo(today);
        } else if (key === '7d') {
            const from = new Date(now);
            from.setDate(from.getDate() - 6);
            setDateFrom(fmt(from));
            setDateTo(today);
        } else if (key === '30d') {
            const from = new Date(now);
            from.setDate(from.getDate() - 29);
            setDateFrom(fmt(from));
            setDateTo(today);
        } else if (key === 'month') {
            const from = new Date(now.getFullYear(), now.getMonth(), 1);
            setDateFrom(fmt(from));
            setDateTo(today);
        }
    }, [activeShortcut]);

    const clearDateFilter = useCallback(() => {
        setDateFrom('');
        setDateTo('');
        setActiveShortcut('');
        setPage(1);
    }, []);

    const applyKpiFilter = useCallback((filter: KpiFilter) => {
        if (filter === 'all') {
            setSearch('');
            setActionFilter('');
            setDateFrom('');
            setDateTo('');
            setActiveShortcut('');
            setPage(1);
            return;
        }

        if (filter === 'today') {
            setActionFilter('');
            applyShortcut('today');
            return;
        }

        setActionFilter(current => current === filter ? '' : filter);
        setDateFrom('');
        setDateTo('');
        setActiveShortcut('');
        setPage(1);
    }, [applyShortcut]);

    const fetchLogs = useCallback(async (currentPage: number, currentSearch: string, currentAction: string, from: string, to: string) => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: '15',
            });
            if (currentSearch) queryParams.append('search', currentSearch);
            if (currentAction) queryParams.append('action', currentAction);
            if (from) queryParams.append('dateFrom', from);
            if (to) queryParams.append('dateTo', to);

            const [logsRes, statsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/admin/logs?${queryParams.toString()}`),
                fetchWithAuth(`${API_BASE_URL}/admin/logs/stats`),
            ]);

            if (logsRes.ok) {
                const logsJson = await logsRes.json();
                setLogs(Array.isArray(logsJson?.data) ? logsJson.data : []);
                setTotalPages(logsJson?.meta?.totalPages ?? 1);
                setTotalRecords(logsJson?.meta?.total ?? 0);
            }

            if (statsRes.ok) {
                const statsJson = await statsRes.json();
                setStats(statsJson?.data ?? null);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs(page, search, actionFilter, dateFrom, dateTo);
        }, 400);
        return () => clearTimeout(timer);
    }, [page, search, actionFilter, dateFrom, dateTo, fetchLogs]);

    useAdminAutoRefresh({
        intervalMs: 60 * 1000,
        pause: Boolean(isExporting || expandedRow),
        onRefresh: () => fetchLogs(page, search, actionFilter, dateFrom, dateTo),
    });

    useEffect(() => {
        if (!linkedLogIdParam) {
            setLinkedLog(null);
            setLinkedLogError(null);
            return;
        }

        const linkedLogId = Number(linkedLogIdParam);
        if (!Number.isInteger(linkedLogId) || linkedLogId <= 0) {
            setLinkedLog(null);
            setLinkedLogError(`Không tìm thấy log #${linkedLogIdParam} hoặc bạn không có quyền xem.`);
            return;
        }

        const controller = new AbortController();

        const fetchLinkedLog = async () => {
            setLinkedLog(null);
            setLinkedLogError(null);

            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/admin/logs/${linkedLogId}`, {
                    signal: controller.signal,
                });

                if (!res.ok) throw new Error('Linked log not found');

                const json = await res.json();
                const log = json?.data;
                if (!log || typeof log.id !== 'number') throw new Error('Invalid linked log payload');

                setLinkedLog(log);
                setExpandedRow(log.id);
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error('Error fetching linked log:', error);
                setLinkedLog(null);
                setLinkedLogError(`Không tìm thấy log #${linkedLogId} hoặc bạn không có quyền xem.`);
            }
        };

        void fetchLinkedLog();

        return () => controller.abort();
    }, [linkedLogIdParam]);

    useEffect(() => {
        if (!linkedLog || expandedRow !== linkedLog.id || isLoading) return;

        const frame = window.requestAnimationFrame(() => {
            document.getElementById(`audit-row-${linkedLog.id}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [linkedLog, expandedRow, isLoading]);

    useEffect(() => {
        return () => {
            if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
        };
    }, []);

    const handleExport = useCallback(async () => {
        setIsExporting(true);
        try {
            const queryParams = new URLSearchParams();
            if (search) queryParams.append('search', search);
            if (actionFilter) queryParams.append('action', actionFilter);
            if (dateFrom) queryParams.append('dateFrom', dateFrom);
            if (dateTo) queryParams.append('dateTo', dateTo);

            const res = await fetchWithAuth(`${API_BASE_URL}/admin/logs/export?${queryParams.toString()}`);

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `nhat-ky-he-thong-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Có lỗi xảy ra khi xuất dữ liệu!');
        } finally {
            setIsExporting(false);
        }
    }, [actionFilter, dateFrom, dateTo, search]);

    const scheduleCopyFeedbackReset = useCallback(() => {
        if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
        copyFeedbackTimer.current = setTimeout(() => {
            setCopiedLogId(null);
            setCopyErrorLogId(null);
            copyFeedbackTimer.current = null;
        }, 1800);
    }, []);

    const copyAuditReference = useCallback(async (log: ActivityLog) => {
        const reference = `${window.location.origin}${pathname}?logId=${log.id}`;
        const success = await writeClipboardText(reference);

        setCopiedLogId(success ? log.id : null);
        setCopyErrorLogId(success ? null : log.id);
        scheduleCopyFeedbackReset();
    }, [pathname, scheduleCopyFeedbackReset]);

    const changeSearch = useCallback((value: string) => {
        setSearch(value);
        setPage(1);
    }, []);

    const changeActionFilter = useCallback((value: string) => {
        setActionFilter(value);
        setPage(1);
    }, []);

    const changeDateFrom = useCallback((value: string) => {
        setDateFrom(value);
        setActiveShortcut('');
        setPage(1);
    }, []);

    const changeDateTo = useCallback((value: string) => {
        setDateTo(value);
        setActiveShortcut('');
        setPage(1);
    }, []);

    return {
        displayLogs,
        stats,
        isLoading,
        isExporting,
        copiedLogId,
        copyErrorLogId,
        linkedLogError,
        page,
        totalPages,
        totalRecords,
        search,
        actionFilter,
        dateFrom,
        dateTo,
        activeShortcut,
        expandedRow,
        setPage,
        setExpandedRow,
        applyShortcut,
        clearDateFilter,
        applyKpiFilter,
        handleExport,
        copyAuditReference,
        changeSearch,
        changeActionFilter,
        changeDateFrom,
        changeDateTo,
    };
}

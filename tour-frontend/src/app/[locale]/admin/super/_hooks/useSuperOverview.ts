'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth, api } from '@/lib/http/fetchWithAuth';
import { toastEmitter } from '@/lib/http/toastEmitter';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import type { OverviewData } from '../_lib/types';

export function useSuperOverview() {
    const [data, setData] = useState<OverviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isMutating, setIsMutating] = useState(false);

    const fetchOverview = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) {
            setIsLoading(true);
            setError('');
        }
        // silent: true cho api.get để tránh toast trùng — lỗi load trang đã có error screen riêng.
        const result = await api.get<OverviewData>('/admin/super/overview', { silent: true });
        if (result.ok) {
            setData(result.data);
        } else if (!options.silent) {
            setError(result.error || 'Không thể tải dữ liệu Super Admin.');
        }
        if (!options.silent) setIsLoading(false);
    }, []);

    useEffect(() => {
        void fetchOverview();
    }, [fetchOverview]);

    useAdminAutoRefresh({
        intervalMs: 60 * 1000,
        pause: isExporting || isMutating,
        onRefresh: () => fetchOverview({ silent: true }),
    });

    const refresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await fetchOverview({ silent: true });
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchOverview]);

    const updateRisk = useCallback(async (key: string, status: 'REVIEWED' | 'RESOLVED') => {
        setIsMutating(true);
        try {
            const result = await api.patch(`/admin/super/risks/${key}`, { status });
            if (!result.ok) {
                toastEmitter.error('Không thể cập nhật trạng thái rủi ro');
                return;
            }
            await fetchOverview({ silent: true });
        } finally {
            setIsMutating(false);
        }
    }, [fetchOverview]);

    const exportAudit = useCallback(async () => {
        setIsExporting(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/admin/logs/export`);
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `super-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch {
            toastEmitter.error('Không thể xuất báo cáo audit. Vui lòng thử lại.');
        } finally {
            setIsExporting(false);
        }
    }, []);

    return { data, isLoading, error, isExporting, isRefreshing, fetchOverview, refresh, updateRisk, exportAudit };
}

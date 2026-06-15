'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth, api } from '@/lib/http/fetchWithAuth';
import { toastEmitter } from '@/lib/http/toastEmitter';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import {
    SuperErrorState,
    SuperLoadingState,
    SuperOverviewContent,
} from './_components/SuperOverviewContent';
import type { OverviewData } from './_lib/types';

export default function SuperAdminOverviewPage() {
    const [data, setData] = useState<OverviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const fetchOverview = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) setIsLoading(true);
        if (!options.silent) setError('');
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/admin/super/overview`);
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Không thể tải dữ liệu Super Admin.');
            setData(json?.data ?? json);
        } catch (err) {
            if (options.silent) return;
            setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu Super Admin.');
        } finally {
            if (options.silent) return;
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    useAdminAutoRefresh({
        intervalMs: 60 * 1000,
        pause: isExporting,
        onRefresh: () => fetchOverview({ silent: true }),
    });

    const handleUpdateRisk = useCallback(async (key: string, status: 'REVIEWED' | 'RESOLVED') => {
        const result = await api.patch(`/admin/super/risks/${key}`, { status });
        if (!result.ok) {
            toastEmitter.error('Không thể cập nhật trạng thái rủi ro');
            return;
        }
        void fetchOverview({ silent: true });
    }, [fetchOverview]);

    const exportAudit = async () => {
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
    };

    if (isLoading) return <SuperLoadingState />;

    if (error || !data) {
        return (
            <SuperErrorState
                message={error || 'Dữ liệu trả về không hợp lệ.'}
                onRetry={() => { void fetchOverview(); }}
            />
        );
    }

    return (
        <SuperOverviewContent
            data={data}
            isExporting={isExporting}
            onRefresh={() => { void fetchOverview(); }}
            onExportAudit={() => { void exportAudit(); }}
            onUpdateRisk={handleUpdateRisk}
        />
    );
}

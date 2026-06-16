'use client';

import {
    SuperErrorState,
    SuperLoadingState,
    SuperOverviewContent,
} from './_components/SuperOverviewContent';
import { useSuperOverview } from './_hooks/useSuperOverview';

export default function SuperAdminOverviewPage() {
    const { data, isLoading, error, isExporting, isRefreshing, fetchOverview, refresh, updateRisk, exportAudit } = useSuperOverview();

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
            isRefreshing={isRefreshing}
            onRefresh={() => { void refresh(); }}
            onExportAudit={() => { void exportAudit(); }}
            onUpdateRisk={updateRisk}
        />
    );
}

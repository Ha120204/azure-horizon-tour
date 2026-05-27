'use client';

import {
    LinkedLogAlert,
    LogsDateFilterBar,
    LogsFilterBar,
    LogsKpiGrid,
    LogsPageHeader,
} from './_components/LogPageSections';
import { LogsTable } from './_components/LogsTable';
import { useSystemLogs } from './_hooks/useSystemLogs';

export default function SystemLogsPage() {
    const logs = useSystemLogs();

    return (
        <main className="flex-1 p-6 md:p-8 lg:p-10 w-full max-w-[1600px] mx-auto overflow-y-auto font-body bg-surface min-h-screen text-on-surface">
            <LogsPageHeader
                isExporting={logs.isExporting}
                onExport={logs.handleExport}
            />

            <LogsKpiGrid
                stats={logs.stats}
                search={logs.search}
                actionFilter={logs.actionFilter}
                dateFrom={logs.dateFrom}
                dateTo={logs.dateTo}
                activeShortcut={logs.activeShortcut}
                onApplyFilter={logs.applyKpiFilter}
            />

            <LogsFilterBar
                search={logs.search}
                actionFilter={logs.actionFilter}
                onSearchChange={logs.changeSearch}
                onActionFilterChange={logs.changeActionFilter}
            />

            <LogsDateFilterBar
                activeShortcut={logs.activeShortcut}
                dateFrom={logs.dateFrom}
                dateTo={logs.dateTo}
                onShortcut={logs.applyShortcut}
                onDateFromChange={logs.changeDateFrom}
                onDateToChange={logs.changeDateTo}
                onClearDateFilter={logs.clearDateFilter}
            />

            <LinkedLogAlert error={logs.linkedLogError} />

            <LogsTable
                logs={logs.displayLogs}
                isLoading={logs.isLoading}
                expandedRow={logs.expandedRow}
                copiedLogId={logs.copiedLogId}
                copyErrorLogId={logs.copyErrorLogId}
                page={logs.page}
                totalPages={logs.totalPages}
                totalRecords={logs.totalRecords}
                onToggleExpanded={logs.setExpandedRow}
                onCopyReference={logs.copyAuditReference}
                onPageChange={logs.setPage}
            />
        </main>
    );
}

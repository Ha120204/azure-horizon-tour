'use client';

import {
    LinkedLogAlert,
    LogsAdvancedFilterPanel,
    LogsDateFilterBar,
    LogsFilterBar,
    LogsKpiGrid,
    LogsPageHeader,
} from './_components/LogPageSections';
import { LogsTable } from './_components/LogsTable';
import { useSystemLogs } from './_hooks/useSystemLogs';

export default function SystemLogsPage() {
    const logs = useSystemLogs();
    const hasActiveFilters = Boolean(logs.search || logs.actionFilter || logs.resourceFilter || logs.roleFilter || logs.severityFilter || logs.dateFrom || logs.dateTo);

    return (
        <main className="flex-1 p-6 md:p-8 lg:p-10 w-full max-w-[1600px] mx-auto overflow-y-auto font-body bg-surface min-h-screen text-on-surface">
            <LogsPageHeader
                isExporting={logs.isExporting}
                canExport={logs.canExport}
                onExport={logs.handleExport}
            />

            <LogsKpiGrid
                stats={logs.stats}
                search={logs.search}
                actionFilter={logs.actionFilter}
                resourceFilter={logs.resourceFilter}
                roleFilter={logs.roleFilter}
                severityFilter={logs.severityFilter}
                dateFrom={logs.dateFrom}
                dateTo={logs.dateTo}
                activeShortcut={logs.activeShortcut}
                onApplyFilter={logs.applyKpiFilter}
            />

            <LogsFilterBar
                search={logs.search}
                actionFilter={logs.actionFilter}
                resourceFilter={logs.resourceFilter}
                hasActiveFilters={hasActiveFilters}
                onSearchChange={logs.changeSearch}
                onActionFilterChange={logs.changeActionFilter}
                onResourceFilterChange={logs.changeResourceFilter}
                onClearAllFilters={logs.clearAllFilters}
            />

            <LogsAdvancedFilterPanel
                roleFilter={logs.roleFilter}
                severityFilter={logs.severityFilter}
                isSuperAdmin={logs.isSuperAdmin}
                onRoleFilterChange={logs.changeRoleFilter}
                onSeverityFilterChange={logs.changeSeverityFilter}
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
                loadError={logs.loadError}
                expandedRow={logs.expandedRow}
                copiedLogId={logs.copiedLogId}
                copyErrorLogId={logs.copyErrorLogId}
                page={logs.page}
                pageSize={logs.pageSize}
                sortOrder={logs.sortOrder}
                totalPages={logs.totalPages}
                totalRecords={logs.totalRecords}
                onToggleExpanded={logs.setExpandedRow}
                onCopyReference={logs.copyAuditReference}
                onPageChange={logs.setPage}
                onPageSizeChange={logs.changePageSize}
                onToggleCreatedAtSort={logs.toggleCreatedAtSort}
            />
        </main>
    );
}

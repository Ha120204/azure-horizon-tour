'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import { ACTION_COLORS, ACTION_LABELS } from '../_lib/config';
import {
    buildAuditRows,
    formatAuditDate,
    formatAuditTime,
    formatDateTimeValue,
    getAuditImpactText,
    getAuditSeverity,
    getAuditSummary,
    getRecordTitle,
    getResourceHref,
    getResourceLabel,
    getUserInitials,
    isAuditRecord,
} from '../_lib/helpers';
import type { ActivityLog } from '../_lib/types';
import { LogSelect, type LogSelectOption } from './LogSelect';

const PAGE_SIZE_OPTIONS: LogSelectOption[] = [
    { value: '10', label: '10', icon: 'table_rows' },
    { value: '25', label: '25', icon: 'table_rows' },
    { value: '50', label: '50', icon: 'table_rows' },
];

interface LogsTableProps {
    logs: ActivityLog[];
    isLoading: boolean;
    loadError: boolean;
    expandedRow: number | null;
    copiedLogId: number | null;
    copyErrorLogId: number | null;
    page: number;
    pageSize: number;
    sortOrder: 'asc' | 'desc';
    totalPages: number;
    totalRecords: number;
    onToggleExpanded: (id: number | null) => void;
    onCopyReference: (log: ActivityLog) => void;
    onPageChange: (page: number | ((current: number) => number)) => void;
    onPageSizeChange: (pageSize: number) => void;
    onToggleCreatedAtSort: () => void;
}

export function LogsTable({
    logs,
    isLoading,
    loadError,
    expandedRow,
    copiedLogId,
    copyErrorLogId,
    page,
    pageSize,
    sortOrder,
    totalPages,
    totalRecords,
    onToggleExpanded,
    onCopyReference,
    onPageChange,
    onPageSizeChange,
    onToggleCreatedAtSort,
}: LogsTableProps) {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-sm overflow-visible flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface-variant font-label text-[11px] uppercase tracking-wider">
                            <th className="py-3 px-4 w-10"></th>
                            <th className="py-3 px-4 font-semibold" aria-sort={sortOrder === 'asc' ? 'ascending' : 'descending'}>
                                <button
                                    type="button"
                                    onClick={onToggleCreatedAtSort}
                                    className="inline-flex items-center gap-1 rounded-md text-left font-semibold uppercase tracking-wider transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                >
                                    Thời Gian
                                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                    </span>
                                </button>
                            </th>
                            <th className="py-3 px-4 font-semibold">Người Thực Hiện</th>
                            <th className="py-3 px-4 font-semibold">Hành Động</th>
                            <th className="py-3 px-4 font-semibold">Đối Tượng</th>
                            <th className="py-3 px-4 font-semibold hidden lg:table-cell">Mức độ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <LogsSkeletonRow key={i} />)
                        ) : loadError ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center">
                                    <span className="material-symbols-outlined text-[48px] mb-3 block text-red-300">error</span>
                                    <p className="text-sm font-medium text-red-600">Không tải được nhật ký. Vui lòng thử lại.</p>
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-outline">
                                    <span className="material-symbols-outlined text-[48px] mb-3 opacity-50">search_off</span>
                                    <p className="text-sm font-medium">Không tìm thấy nhật ký nào phù hợp</p>
                                </td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <LogTableItem
                                    key={log.id}
                                    log={log}
                                    isExpanded={expandedRow === log.id}
                                    isCopied={copiedLogId === log.id}
                                    isCopyError={copyErrorLogId === log.id}
                                    onToggleExpanded={onToggleExpanded}
                                    onCopyReference={onCopyReference}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-on-surface-variant">
                        Hiển thị <span className="font-semibold text-on-surface">{logs.length}</span> / <span className="font-semibold text-on-surface">{totalRecords}</span> bản ghi
                    </span>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                        Số dòng
                        <LogSelect
                            ariaLabel="Chọn số dòng mỗi trang"
                            value={String(pageSize)}
                            options={PAGE_SIZE_OPTIONS}
                            onChange={value => onPageSizeChange(Number(value))}
                            className="w-20"
                            menuClassName="min-w-20"
                            placement="top"
                        />
                    </label>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={page === 1}
                        onClick={() => onPageChange(current => current - 1)}
                        aria-label="Trang trước"
                        className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container text-on-surface disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="px-3 font-semibold text-primary">Trang {page} / {totalPages || 1}</span>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(current => current + 1)}
                        aria-label="Trang sau"
                        className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container text-on-surface disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function LogsSkeletonRow() {
    return (
        <tr className="animate-pulse">
            <td className="py-4 px-4"><div className="w-4 h-4 bg-outline-variant/20 rounded" /></td>
            <td className="py-4 px-4"><div className="w-24 h-4 bg-outline-variant/20 rounded" /></td>
            <td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-outline-variant/20" /><div className="w-32 h-4 bg-outline-variant/20 rounded" /></div></td>
            <td className="py-4 px-4"><div className="w-20 h-5 bg-outline-variant/20 rounded-full" /></td>
            <td className="py-4 px-4"><div className="w-48 h-4 bg-outline-variant/20 rounded" /></td>
            <td className="py-4 px-4 hidden lg:table-cell"><div className="w-24 h-4 bg-outline-variant/20 rounded" /></td>
        </tr>
    );
}

interface LogTableItemProps {
    log: ActivityLog;
    isExpanded: boolean;
    isCopied: boolean;
    isCopyError: boolean;
    onToggleExpanded: (id: number | null) => void;
    onCopyReference: (log: ActivityLog) => void;
}

function LogTableItem({
    log,
    isExpanded,
    isCopied,
    isCopyError,
    onToggleExpanded,
    onCopyReference,
}: LogTableItemProps) {
    const summary = getAuditSummary(log);
    const severity = getAuditSeverity(log);
    const auditRows = buildAuditRows(log);
    const changedRows = auditRows.visibleRows;
    const resourceLabel = getResourceLabel(log.resource);
    const targetTitle = getRecordTitle(log);
    const hasBeforeData = log.action === 'UPDATE' && isAuditRecord(log.oldData);
    const resourceHref = getResourceHref(log);

    return (
        <Fragment>
            <tr id={`audit-row-${log.id}`} className="hover:bg-surface-container-low/50 transition-colors group">
                <td className="py-3 px-4 text-outline group-hover:text-primary transition-colors">
                    <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`audit-detail-${log.id}`}
                        aria-label={isExpanded ? 'Thu gọn chi tiết nhật ký' : 'Mở chi tiết nhật ký'}
                        onClick={() => onToggleExpanded(isExpanded ? null : log.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-outline transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                        <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)' }}>
                            chevron_right
                        </span>
                    </button>
                </td>
                <td className="py-3 px-4">
                    <div className="text-xs font-semibold text-on-surface whitespace-nowrap">{formatAuditDate(log.createdAt)}</div>
                    <div className="mt-0.5 whitespace-nowrap text-[11px] text-outline">{formatAuditTime(log.createdAt)}</div>
                </td>
                <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                        {log.user ? (
                            log.user.avatarUrl ? (
                                <Image src={log.user.avatarUrl} alt="" width={28} height={28} sizes="28px" className="h-7 w-7 rounded-full object-cover border border-outline-variant/20" />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                    {getUserInitials(log.user.fullName)}
                                </div>
                            )
                        ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-on-surface leading-tight">{log.user?.fullName || 'System Automated'}</span>
                            <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">{log.user?.role || 'SYSTEM'}</span>
                        </div>
                    </div>
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${ACTION_COLORS[log.action] || ACTION_COLORS.LOGIN}`}>
                        {ACTION_LABELS[log.action] || log.action}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <div className="max-w-xl" title={summary}>
                        <p className="line-clamp-1 text-sm font-semibold text-on-surface">{summary}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-outline">
                            {resourceLabel} · {targetTitle}
                            {auditRows.hiddenEmptyCount > 0 && (
                                <span className="ml-2 rounded-full bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">
                                    Ẩn {auditRows.hiddenEmptyCount} trường trống
                                </span>
                            )}
                        </p>
                    </div>
                </td>
                <td className="py-3 px-4 hidden lg:table-cell">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${severity.className}`}>
                        <span className="material-symbols-outlined text-[13px]">{severity.icon}</span>
                        {severity.label}
                    </span>
                </td>
            </tr>

            {isExpanded && (
                <tr className="bg-surface-container-low/30 border-b border-outline-variant/20">
                    <td colSpan={6} className="p-0">
                        <div id={`audit-detail-${log.id}`} className="px-4 py-5 animate-in fade-in slide-in-from-top-2 duration-200 sm:px-8 sm:py-6">
                            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                <AuditSummaryPanel
                                    log={log}
                                    summary={summary}
                                    severityClassName={severity.className}
                                    severityIcon={severity.icon}
                                    resourceHref={resourceHref}
                                    resourceLabel={resourceLabel}
                                    targetTitle={targetTitle}
                                    isCopied={isCopied}
                                    isCopyError={isCopyError}
                                    onCopyReference={onCopyReference}
                                />
                                <AuditChangesPanel
                                    log={log}
                                    severityLabel={severity.label}
                                    severityClassName={severity.className}
                                    hiddenEmptyCount={auditRows.hiddenEmptyCount}
                                    changedRows={changedRows}
                                    hasBeforeData={hasBeforeData}
                                />
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </Fragment>
    );
}

interface AuditSummaryPanelProps {
    log: ActivityLog;
    summary: string;
    severityClassName: string;
    severityIcon: string;
    resourceHref: string | null;
    resourceLabel: string;
    targetTitle: string;
    isCopied: boolean;
    isCopyError: boolean;
    onCopyReference: (log: ActivityLog) => void;
}

function AuditSummaryPanel({
    log,
    summary,
    severityClassName,
    severityIcon,
    resourceHref,
    resourceLabel,
    targetTitle,
    isCopied,
    isCopyError,
    onCopyReference,
}: AuditSummaryPanelProps) {
    return (
        <section className="rounded-2xl border border-outline-variant/25 bg-surface p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className={`material-symbols-outlined grid h-10 w-10 shrink-0 place-items-center rounded-2xl border text-[20px] ${severityClassName}`}>
                    {severityIcon}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-outline">Tóm tắt nghiệp vụ</p>
                    <h4 className="mt-1 text-lg font-black leading-7 text-on-surface">{summary}</h4>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{getAuditImpactText(log)}</p>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2" aria-live="polite">
                {resourceHref && (
                    <a
                        href={resourceHref}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant/25 bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        Mở module
                    </a>
                )}
                <button
                    type="button"
                    onClick={() => onCopyReference(log)}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        isCopied
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : isCopyError
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-outline-variant/25 bg-surface-container-lowest text-on-surface-variant hover:border-primary/30 hover:text-primary'
                    }`}
                >
                    <span className="material-symbols-outlined text-[16px]">
                        {isCopied ? 'check' : isCopyError ? 'error' : 'content_copy'}
                    </span>
                    {isCopied ? 'Đã sao chép liên kết' : isCopyError ? 'Không sao chép được' : 'Sao chép liên kết log'}
                </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                    ['Đối tượng', `${resourceLabel} · ${targetTitle}`],
                    ['Người thực hiện', log.user?.fullName || 'Hệ thống'],
                    ['Vai trò', log.user?.role || 'SYSTEM'],
                    ['Email', log.user?.email || '—'],
                    ['Thời gian', formatDateTimeValue(log.createdAt)],
                    ['IP', log.ipAddress || '—'],
                    ['Mã bản ghi', log.resourceId || `Log #${log.id}`],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-outline">{label}</p>
                        <p className="mt-1 break-words text-sm font-semibold text-on-surface">{value}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

interface AuditChangesPanelProps {
    log: ActivityLog;
    severityLabel: string;
    severityClassName: string;
    hiddenEmptyCount: number;
    changedRows: ReturnType<typeof buildAuditRows>['visibleRows'];
    hasBeforeData: boolean;
}

function AuditChangesPanel({
    log,
    severityLabel,
    severityClassName,
    hiddenEmptyCount,
    changedRows,
    hasBeforeData,
}: AuditChangesPanelProps) {
    return (
        <section className="rounded-2xl border border-outline-variant/25 bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">
                    <span className="material-symbols-outlined text-[17px]">difference</span>
                    {log.action === 'UPDATE' ? 'Thông tin được cập nhật' : log.action === 'DELETE' ? 'Thông tin trước khi xóa' : 'Thông tin được ghi nhận'}
                </h4>
                <div className="flex flex-wrap justify-end gap-2">
                    {hiddenEmptyCount > 0 && (
                        <span className="rounded-full border border-outline-variant/20 bg-surface-container-lowest px-2 py-0.5 text-[10px] font-black text-on-surface-variant">
                            Đã ẩn {hiddenEmptyCount} trường chưa nhập
                        </span>
                    )}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${severityClassName}`}>{severityLabel}</span>
                </div>
            </div>

            {changedRows.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-outline-variant/20">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-container-low text-[10px] uppercase tracking-[0.12em] text-outline">
                            <tr>
                                <th className="px-3 py-2 text-left font-black">Thông tin</th>
                                {hasBeforeData && <th className="px-3 py-2 text-left font-black">Trước</th>}
                                <th className="px-3 py-2 text-left font-black">{hasBeforeData ? 'Sau' : log.action === 'UPDATE' ? 'Giá trị mới' : 'Giá trị'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {changedRows.map(row => (
                                <tr key={row.key} className="align-top">
                                    <td className="w-44 px-3 py-3 font-bold text-on-surface">{row.label}</td>
                                    {hasBeforeData && <td className="min-w-[11rem] break-words px-3 py-3 text-on-surface-variant">{row.before}</td>}
                                    <td className="min-w-[11rem] break-words px-3 py-3 font-semibold text-on-surface">{row.after}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="mt-4 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest p-5 text-center text-sm text-outline">
                    Không có dữ liệu thay đổi thân thiện để hiển thị.
                </div>
            )}

            <details className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
                <summary className="cursor-pointer px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
                    Chi tiết kỹ thuật
                </summary>
                <div className="space-y-3 border-t border-outline-variant/20 p-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-outline">User Agent</p>
                        <p className="mt-1 break-words text-xs font-medium text-on-surface-variant">{log.userAgent || '—'}</p>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="overflow-x-auto rounded-lg bg-[#fff1f2] p-3">
                            <p className="mb-2 text-[10px] font-black uppercase text-red-700">Dữ liệu cũ</p>
                            <pre className="m-0 whitespace-pre-wrap break-words text-[11px] text-red-950">{log.oldData ? JSON.stringify(log.oldData, null, 2) : 'Không có'}</pre>
                        </div>
                        <div className="overflow-x-auto rounded-lg bg-[#ecfdf5] p-3">
                            <p className="mb-2 text-[10px] font-black uppercase text-emerald-700">Dữ liệu mới</p>
                            <pre className="m-0 whitespace-pre-wrap break-words text-[11px] text-emerald-950">{log.newData ? JSON.stringify(log.newData, null, 2) : 'Không có'}</pre>
                        </div>
                    </div>
                </div>
            </details>
        </section>
    );
}

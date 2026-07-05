'use client';

import type React from 'react';
import AdminPagination from '@/components/admin/AdminPagination';
import { StaffSelect } from './StaffSelect';
import { StaffMobileCard, StaffTableRow } from './StaffTableRow';
import type { BulkStatusAction, Meta, SortDirection, StaffKpiItem, StaffSortKey, ToastState, User } from '../_lib/types';

interface StaffPageHeaderProps {
    title: string;
    description: string;
    createButtonLabel: string;
    canCreate: boolean;
    onCreate: () => void;
}

export function StaffPageHeader({ title, description, createButtonLabel, canCreate, onCreate }: StaffPageHeaderProps) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h1 className="font-headline text-2xl font-semibold text-on-surface sm:text-[1.75rem]" style={{ textWrap: 'balance' } as React.CSSProperties}>
                    {title}
                </h1>
                <p className="text-on-surface-variant text-sm mt-1">{description}</p>
            </div>
            {canCreate && (
                <button
                    onClick={onCreate}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto"
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">person_add</span>
                    {createButtonLabel}
                </button>
            )}
        </div>
    );
}

interface StaffKpiGridProps {
    kpis: StaffKpiItem[];
}

export function StaffKpiGrid({ kpis }: StaffKpiGridProps) {
    return (
        <div className="-mx-3 mb-6 flex snap-x gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:mb-8 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3">
            {kpis.map(kpi => (
                <div key={kpi.label} className="min-w-[240px] snap-start rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-sm transition-shadow hover:shadow-md sm:min-w-0 sm:p-5">
                    <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                            <span className="material-symbols-outlined text-xl" aria-hidden="true">{kpi.icon}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-on-surface-variant font-medium truncate">{kpi.label}</p>
                            <p className="text-xl font-bold text-on-surface leading-tight mt-0.5 truncate">{kpi.value}</p>
                            <p className="mt-1 text-xs leading-5 text-on-surface-variant/75">{kpi.helper}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

interface StaffFiltersProps {
    search: string;
    filterStatus: string;
    managedRole: 'ADMIN' | 'STAFF';
    totalItems: number;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onResetFilters: () => void;
}

const statusLabels: Record<string, string> = {
    active: 'Hoạt động',
    deactivated: 'Đã vô hiệu hóa',
};

const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Hoạt động' },
    { value: 'deactivated', label: 'Đã vô hiệu hóa' },
];

export function StaffFilters({
    search,
    filterStatus,
    managedRole,
    totalItems,
    onSearchChange,
    onStatusChange,
    onResetFilters,
}: StaffFiltersProps) {
    const hasActiveFilters = Boolean(search || filterStatus);
    const isAdminScope = managedRole === 'ADMIN';
    const itemLabel = isAdminScope ? 'quản trị viên' : 'nhân viên';

    return (
        <div className="mb-5 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-3 shadow-sm sm:mb-6 sm:p-4">
            <div className="flex flex-wrap items-stretch gap-3 sm:items-center">
                <div className="relative w-full min-w-0 flex-1">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant" aria-hidden="true">search</span>
                    <label htmlFor="search-users" className="sr-only">{isAdminScope ? 'Tìm kiếm quản trị viên' : 'Tìm kiếm nhân viên'}</label>
                    <input
                        id="search-users"
                        type="search"
                        autoComplete="off"
                        name="staff-search"
                        placeholder={isAdminScope ? 'Tìm quản trị viên theo tên hoặc email…' : 'Tìm nhân viên theo tên hoặc email…'}
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        className="w-full rounded-xl border border-outline-variant/15 bg-surface-container-low py-2.5 pl-11 pr-11 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            aria-label="Xóa từ khóa tìm kiếm"
                            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">close</span>
                        </button>
                    )}
                </div>
                <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface-variant">
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                            {isAdminScope ? 'admin_panel_settings' : 'badge'}
                        </span>
                        {isAdminScope ? 'Đối tượng: Quản trị viên' : 'Đối tượng: Nhân viên'}
                    </div>
                    <label htmlFor="filter-status" className="sr-only">Lọc theo trạng thái</label>
                    <StaffSelect
                        id="filter-status"
                        label="Lọc theo trạng thái"
                        value={filterStatus}
                        options={statusOptions}
                        onChange={onStatusChange}
                        icon="filter_alt"
                        className="w-full sm:w-52"
                    />
                </div>
            </div>

            <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-on-surface-variant" aria-live="polite">
                        {totalItems.toLocaleString('vi-VN')} {itemLabel}
                    </span>
                    {search && (
                        <FilterChip label={`Từ khóa: ${search}`} onRemove={() => onSearchChange('')} />
                    )}
                    {filterStatus && (
                        <FilterChip label={`Trạng thái: ${statusLabels[filterStatus]}`} onRemove={() => onStatusChange('')} />
                    )}
                </div>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onResetFilters}
                        className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-outline-variant/20 px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto"
                    >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">filter_alt_off</span>
                        Xóa bộ lọc
                    </button>
                )}
            </div>
        </div>
    );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <button
            type="button"
            onClick={onRemove}
            aria-label={`Bỏ bộ lọc ${label}`}
            className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:max-w-[280px]"
        >
            <span className="truncate">{label}</span>
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
        </button>
    );
}

interface StaffBulkActionBarProps {
    selectedCount: number;
    activeCount: number;
    deactivatedCount: number;
    itemLabel: string;
    isBulkUpdating: boolean;
    onRequestStatusChange: (status: BulkStatusAction) => void;
    onExport: () => void;
    onClear: () => void;
}

export function StaffBulkActionBar({
    selectedCount,
    activeCount,
    deactivatedCount,
    itemLabel,
    isBulkUpdating,
    onRequestStatusChange,
    onExport,
    onClear,
}: StaffBulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div
            role="toolbar"
            aria-label={`Đã chọn ${selectedCount} ${itemLabel}`}
            className="sticky top-0 z-30 mb-3 rounded-xl border border-primary/20 bg-surface-container-lowest/95 px-3 py-2.5 shadow-sm ring-1 ring-primary/5 backdrop-blur"
        >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                        <span className="material-symbols-outlined text-[18px]">checklist</span>
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-on-surface">
                            Đã chọn <strong className="text-primary">{selectedCount}</strong> {itemLabel}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                            {activeCount} hoạt động · {deactivatedCount} đã vô hiệu hóa
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <button
                        type="button"
                        onClick={onExport}
                        disabled={isBulkUpdating}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant/20 bg-surface px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
                        Xuất CSV ({selectedCount})
                    </button>

                    {activeCount > 0 && (
                        <button
                            type="button"
                            onClick={() => onRequestStatusChange('deactivated')}
                            disabled={isBulkUpdating}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                            <span className={`material-symbols-outlined text-[14px] ${isBulkUpdating ? 'animate-spin' : ''}`} aria-hidden="true">
                                {isBulkUpdating ? 'progress_activity' : 'block'}
                            </span>
                            Vô hiệu hóa ({activeCount})
                        </button>
                    )}

                    {deactivatedCount > 0 && (
                        <button
                            type="button"
                            onClick={() => onRequestStatusChange('active')}
                            disabled={isBulkUpdating}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <span className={`material-symbols-outlined text-[14px] ${isBulkUpdating ? 'animate-spin' : ''}`} aria-hidden="true">
                                {isBulkUpdating ? 'progress_activity' : 'lock_open'}
                            </span>
                            Kích hoạt ({deactivatedCount})
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClear}
                        disabled={isBulkUpdating}
                        className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        Bỏ chọn
                    </button>
                </div>
            </div>
        </div>
    );
}

interface StaffUsersTableProps {
    users: User[];
    isLoading: boolean;
    meta: Meta;
    pageSize: number;
    currentUserRole: string;
    canEditRoles: boolean;
    canBulkSelect: boolean;
    itemLabel: string;
    sortBy: StaffSortKey;
    sortDir: SortDirection;
    hasActiveFilters: boolean;
    selectedStaffIds: Set<number>;
    allCurrentPageSelected: boolean;
    someCurrentPageSelected: boolean;
    onOpenDetail: (id: number, edit?: boolean) => void;
    onChangeRole: (user: User) => void;
    onToggleStatus: (user: User) => void;
    onSortChange: (key: StaffSortKey) => void;
    onResetFilters: () => void;
    onToggleSelected: (id: number) => void;
    onToggleCurrentPage: () => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}

const sortableColumns: Array<{
    key: StaffSortKey;
    label: string;
    align?: 'left' | 'right';
}> = [
    { key: 'fullName', label: 'Tài khoản' },
    { key: 'createdAt', label: 'Ngày tạo' },
    { key: 'status', label: 'Trạng thái' },
];

function SortHeader({
    column,
    sortBy,
    sortDir,
    onSortChange,
}: {
    column: (typeof sortableColumns)[number];
    sortBy: StaffSortKey;
    sortDir: SortDirection;
    onSortChange: (key: StaffSortKey) => void;
}) {
    const active = sortBy === column.key;

    return (
        <th
            scope="col"
            aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            className="py-3.5 px-4 xl:px-5"
        >
            <button
                type="button"
                disabled={active}
                onClick={() => onSortChange(column.key)}
                className={`group inline-flex w-full items-center gap-1.5 rounded-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default disabled:text-primary ${
                    column.align === 'right' ? 'justify-end' : 'justify-start'
                }`}
            >
                <span>{column.label}</span>
            </button>
        </th>
    );
}

export function StaffUsersTable({
    users,
    isLoading,
    meta,
    pageSize,
    currentUserRole,
    canEditRoles,
    canBulkSelect,
    itemLabel,
    sortBy,
    sortDir,
    hasActiveFilters,
    selectedStaffIds,
    allCurrentPageSelected,
    someCurrentPageSelected,
    onOpenDetail,
    onChangeRole,
    onToggleStatus,
    onSortChange,
    onResetFilters,
    onToggleSelected,
    onToggleCurrentPage,
    onPageChange,
    onPageSizeChange,
}: StaffUsersTableProps) {
    const getSortableColumn = (key: StaffSortKey) => sortableColumns.find(column => column.key === key)!;

    return (
        <div id="users-table" className="overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
            <div className="border-b border-outline-variant/10 bg-surface-container/30 p-3 lg:hidden">
                <label htmlFor="mobile-staff-sort" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Sắp xếp danh sách
                </label>
                <div className="flex gap-2">
                    <StaffSelect
                        id="mobile-staff-sort"
                        label="Sắp xếp danh sách"
                        value={sortBy}
                        options={sortableColumns.map(column => ({ value: column.key, label: column.label }))}
                        onChange={value => onSortChange(value as StaffSortKey)}
                        icon="sort"
                        className="min-w-0 flex-1"
                    />
                </div>
            </div>

            <div className="space-y-3 bg-surface-container-low p-3 lg:hidden">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <div key={`mobile-skeleton-${index}`} className="animate-pulse rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4">
                            <div className="flex gap-3">
                                <div className="h-11 w-11 rounded-full bg-surface-container-high" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 w-2/3 rounded bg-surface-container-high" />
                                    <div className="h-3 w-full rounded bg-surface-container" />
                                </div>
                            </div>
                            <div className="mt-4 h-14 rounded-xl bg-surface-container" />
                        </div>
                    ))
                ) : users.length === 0 ? (
                    <StaffEmptyState hasActiveFilters={hasActiveFilters} onResetFilters={onResetFilters} compact />
                ) : (
                    users.map(user => (
                        <StaffMobileCard
                            key={user.id}
                            user={user}
                            currentUserRole={currentUserRole}
                            canEditRoles={canEditRoles}
                            canSelect={canBulkSelect}
                            isSelected={selectedStaffIds.has(user.id)}
                            onOpenDetail={onOpenDetail}
                            onChangeRole={onChangeRole}
                            onToggleStatus={onToggleStatus}
                            onToggleSelected={onToggleSelected}
                        />
                    ))
                )}
            </div>

            <div className="hidden overflow-x-auto lg:block xl:overflow-x-visible">
                <table className="w-full min-w-[900px] table-fixed text-left border-collapse lg:min-w-0">
                    <colgroup>
                        {canBulkSelect && <col className="w-[4%]" />}
                        <col className={canBulkSelect ? 'w-[18%]' : 'w-[20%]'} />
                        <col className="w-[24%]" />
                        <col className="w-[14%]" />
                        <col className="w-[14%]" />
                        <col className="w-[15%]" />
                        <col className="w-[15%]" />
                    </colgroup>
                    <thead>
                        <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                            {canBulkSelect && (
                                <th scope="col" className="pl-4 pr-2 py-3.5 xl:pl-5">
                                    <input
                                        type="checkbox"
                                        checked={allCurrentPageSelected}
                                        aria-label={allCurrentPageSelected ? 'Bỏ chọn tất cả tài khoản trên trang này' : 'Chọn tất cả tài khoản trên trang này'}
                                        aria-checked={allCurrentPageSelected ? 'true' : someCurrentPageSelected ? 'mixed' : 'false'}
                                        onChange={onToggleCurrentPage}
                                        className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                                    />
                                </th>
                            )}
                            <SortHeader column={getSortableColumn('fullName')} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Liên hệ</th>
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Quyền</th>
                            <SortHeader column={getSortableColumn('createdAt')} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
                            <SortHeader column={getSortableColumn('status')} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={`skel-${i}`} className="animate-pulse">
                                    {canBulkSelect && <td className="py-4 pl-4 pr-2 xl:pl-5"><div className="h-4 w-4 rounded bg-surface-container-high" /></td>}
                                    <td className="py-4 px-4 xl:px-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-surface-container-high" /><div className="space-y-2"><div className="h-3.5 w-28 bg-surface-container-high rounded" /><div className="h-2.5 w-20 bg-surface-container rounded" /></div></div></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="space-y-2"><div className="h-3 w-36 bg-surface-container-high rounded" /><div className="h-2.5 w-24 bg-surface-container rounded" /></div></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="h-6 w-20 bg-surface-container-high rounded-lg" /></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="h-3 w-20 bg-surface-container-high rounded" /></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="h-6 w-20 bg-surface-container-high rounded-lg" /></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="h-6 w-20 bg-surface-container-high rounded ml-auto" /></td>
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={canBulkSelect ? 7 : 6} className="py-20 text-center">
                                    <StaffEmptyState hasActiveFilters={hasActiveFilters} onResetFilters={onResetFilters} />
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <StaffTableRow
                                    key={user.id}
                                    user={user}
                                    currentUserRole={currentUserRole}
                                    canEditRoles={canEditRoles}
                                    canSelect={canBulkSelect}
                                    isSelected={selectedStaffIds.has(user.id)}
                                    onOpenDetail={onOpenDetail}
                                    onChangeRole={onChangeRole}
                                    onToggleStatus={onToggleStatus}
                                    onToggleSelected={onToggleSelected}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-outline-variant/10 bg-surface-container-lowest px-3 py-3 sm:px-6">
                <AdminPagination
                    currentPage={meta.currentPage}
                    totalPages={meta.totalPages}
                    totalItems={meta.totalItems}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                    itemLabel={itemLabel}
                />
            </div>
        </div>
    );
}

function StaffEmptyState({
    hasActiveFilters,
    onResetFilters,
    compact = false,
}: {
    hasActiveFilters: boolean;
    onResetFilters: () => void;
    compact?: boolean;
}) {
    return (
        <div className={`rounded-2xl bg-surface-container-lowest px-4 text-center ${compact ? 'py-12' : ''}`}>
            <span className="material-symbols-outlined mb-2 block text-4xl text-outline" aria-hidden="true">person_search</span>
            <p className="font-bold text-on-surface">
                {hasActiveFilters ? 'Không tìm thấy tài khoản phù hợp' : 'Chưa có tài khoản nào'}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-on-surface-variant">
                {hasActiveFilters
                    ? 'Không có tài khoản nào khớp với bộ lọc hiện tại.'
                    : 'Danh sách tài khoản sẽ xuất hiện tại đây khi được tạo.'}
            </p>
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={onResetFilters}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">filter_alt_off</span>
                    Xóa bộ lọc
                </button>
            )}
        </div>
    );
}

interface StaffToastProps {
    toast: ToastState | null;
}

export function StaffToast({ toast }: StaffToastProps) {
    return (
        <>
            <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.message}</div>
            {toast && (
                <div
                    role="status"
                    className={`fixed bottom-3 left-3 right-3 z-[60] flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl animate-fade-slide-up sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md sm:px-5 sm:py-4 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                    {toast.message}
                </div>
            )}
        </>
    );
}

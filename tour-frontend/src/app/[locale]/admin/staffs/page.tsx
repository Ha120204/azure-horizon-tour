'use client';

import { StaffOverlays } from './_components/StaffOverlays';
import { StaffBulkActionBar, StaffFilters, StaffKpiGrid, StaffPageHeader, StaffUsersTable } from './_components/StaffPageSections';
import { useStaffManagement } from './_hooks/useStaffManagement';

export default function StaffManagementPage() {
    const staff = useStaffManagement();
    const canManageStaff = staff.currentUserRole !== 'STAFF';
    const itemLabel = staff.managedRoleLabel;
    const managedRole = staff.managedRole;

    return (
        <main className="mx-auto w-full max-w-[1600px] flex-1 overflow-y-auto px-3 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <a href="#users-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
                Nhảy đến bảng dữ liệu
            </a>

            <StaffPageHeader
                title={staff.pageTitle}
                description={staff.pageDescription}
                createButtonLabel={staff.createButtonLabel}
                canCreate={canManageStaff}
                onCreate={() => staff.setShowCreateModal(true)}
            />

            {staff.isSuperAdminView && (
                <div className="mb-5 inline-flex rounded-xl border border-outline-variant/15 bg-surface-container p-1" role="tablist" aria-label="Lọc theo nhóm tài khoản">
                    {([['ADMIN', 'Quản trị viên'], ['STAFF', 'Nhân viên']] as const).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={staff.staffRoleScope === value}
                            onClick={() => staff.setStaffRoleScope(value)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                staff.staffRoleScope === value
                                    ? 'bg-primary text-on-primary shadow-sm'
                                    : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <StaffKpiGrid kpis={staff.kpis} />

            <StaffFilters
                search={staff.search}
                filterStatus={staff.filterStatus}
                managedRole={managedRole}
                totalItems={staff.meta.totalItems}
                onSearchChange={staff.setSearch}
                onStatusChange={staff.changeStatusFilter}
                onResetFilters={staff.resetFilters}
            />

            <StaffBulkActionBar
                selectedCount={staff.selectedStaffUsers.length}
                activeCount={staff.selectedActiveCount}
                deactivatedCount={staff.selectedDeactivatedCount}
                itemLabel={itemLabel}
                isBulkUpdating={staff.isBulkUpdating}
                onRequestStatusChange={staff.requestBulkStatusChange}
                onClear={staff.clearSelection}
            />

            <div className={`transition-opacity duration-200 ${staff.isFetching ? 'opacity-60' : 'opacity-100'}`}>
                <StaffUsersTable
                    users={staff.users}
                    isLoading={staff.isLoading}
                    meta={staff.meta}
                    pageSize={staff.pageSize}
                    currentUserRole={staff.currentUserRole}
                    canEditRoles={staff.canEditRoles}
                    canBulkSelect={canManageStaff}
                    itemLabel={itemLabel}
                    sortBy={staff.sortBy}
                    sortDir={staff.sortDir}
                    hasActiveFilters={Boolean(staff.search || staff.filterStatus)}
                    selectedStaffIds={staff.selectedStaffIds}
                    allCurrentPageSelected={staff.allCurrentPageSelected}
                    someCurrentPageSelected={staff.someCurrentPageSelected}
                    onOpenDetail={staff.openDetail}
                    onChangeRole={staff.requestRoleChange}
                    onToggleStatus={staff.setToggleTarget}
                    onSortChange={staff.changeSort}
                    onResetFilters={staff.resetFilters}
                    onToggleSelected={staff.toggleSelectedStaff}
                    onToggleCurrentPage={staff.toggleCurrentPageSelection}
                    onPageChange={staff.setPage}
                    onPageSizeChange={staff.changePageSize}
                />
            </div>

            <StaffOverlays model={staff} />
        </main>
    );
}

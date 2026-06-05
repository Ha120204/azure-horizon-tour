'use client';

import { StaffOverlays } from './_components/StaffOverlays';
import { StaffBulkActionBar, StaffFilters, StaffKpiGrid, StaffPageHeader, StaffUsersTable } from './_components/StaffPageSections';
import { useStaffManagement } from './_hooks/useStaffManagement';

export default function StaffManagementPage() {
    const staff = useStaffManagement();
    const canManageStaff = staff.currentUserRole !== 'STAFF';
    const itemLabel = staff.isSuperAdminView ? 'quản trị viên' : 'nhân viên';

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

            <StaffKpiGrid kpis={staff.kpis} />

            <StaffFilters
                search={staff.search}
                filterStatus={staff.filterStatus}
                isSuperAdminView={staff.isSuperAdminView}
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

            <StaffOverlays model={staff} />
        </main>
    );
}

'use client';

import { StaffOverlays } from './_components/StaffOverlays';
import { StaffFilters, StaffKpiGrid, StaffPageHeader, StaffUsersTable } from './_components/StaffPageSections';
import { useStaffManagement } from './_hooks/useStaffManagement';

export default function StaffManagementPage() {
    const staff = useStaffManagement();

    return (
        <main className="flex-1 w-full max-w-[1600px] mx-auto overflow-y-auto px-4 pb-12 pt-8 sm:px-6 lg:px-8" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <a href="#users-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
                Nhảy đến bảng dữ liệu
            </a>

            <StaffPageHeader
                title={staff.pageTitle}
                description={staff.pageDescription}
                createButtonLabel={staff.createButtonLabel}
                canCreate={staff.currentUserRole !== 'STAFF'}
                onCreate={() => staff.setShowCreateModal(true)}
            />

            <StaffKpiGrid kpis={staff.kpis} />

            <StaffFilters
                search={staff.search}
                filterStatus={staff.filterStatus}
                isSuperAdminView={staff.isSuperAdminView}
                onSearchChange={staff.setSearch}
                onStatusChange={staff.changeStatusFilter}
            />

            <StaffUsersTable
                users={staff.users}
                isLoading={staff.isLoading}
                meta={staff.meta}
                pageSize={staff.pageSize}
                currentUserRole={staff.currentUserRole}
                canEditRoles={staff.canEditRoles}
                itemLabel={staff.isSuperAdminView ? 'admin' : 'nhân sự'}
                onOpenDetail={staff.openDetail}
                onChangeRole={staff.requestRoleChange}
                onToggleStatus={staff.setToggleTarget}
                onPageChange={staff.setPage}
                onPageSizeChange={staff.changePageSize}
            />

            <StaffOverlays model={staff} />
        </main>
    );
}

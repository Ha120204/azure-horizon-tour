'use client';

import { CustomerDetailModal } from './_components/CustomerDetailModal';
import { CustomerFilters } from './_components/CustomerFilters';
import { CustomerKpiGrid } from './_components/CustomerKpiGrid';
import { CustomerPageHeader } from './_components/CustomerPageHeader';
import { CustomerTable } from './_components/CustomerTable';
import { ToastMessage } from './_components/ToastMessage';
import { ToggleStatusDialog } from './_components/ToggleStatusDialog';
import { useCustomerManagement } from './_hooks/useCustomerManagement';

export default function CustomerManagementPage() {
    const customer = useCustomerManagement();

    return (
        <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <a href="#users-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
                Nhảy đến bảng dữ liệu
            </a>

            <CustomerPageHeader
                hasFreshData={customer.hasFreshData}
                lastSyncedAt={customer.lastSyncedAt}
                onRefresh={customer.refreshCustomers}
            />

            <CustomerKpiGrid kpis={customer.kpis} />

            <CustomerFilters
                search={customer.search}
                filterStatus={customer.filterStatus}
                totalItems={customer.meta.totalItems}
                onSearchChange={customer.setSearch}
                onStatusChange={customer.changeStatusFilter}
            />

            <CustomerTable
                users={customer.users}
                isLoading={customer.isLoading}
                meta={customer.meta}
                pageSize={customer.pageSize}
                currentUserRole={customer.currentUserRole}
                onOpenDetail={customer.openDetail}
                onToggleStatus={customer.setToggleTarget}
                onPageChange={customer.setPage}
                onPageSizeChange={customer.changePageSize}
            />

            {(customer.detailUser || customer.isLoadingDetail) && (
                <CustomerDetailModal
                    user={customer.detailUser}
                    isLoading={customer.isLoadingDetail}
                    isEditing={customer.isEditing}
                    editForm={customer.editForm}
                    isSaving={customer.isSaving}
                    onClose={customer.closeDetail}
                    onStartEditing={customer.startEditing}
                    onCancelEditing={() => customer.setIsEditing(false)}
                    onEditFormChange={customer.updateEditForm}
                    onSaveInfo={customer.handleSaveInfo}
                    onToggleStatus={customer.setToggleTarget}
                />
            )}

            {customer.toggleTarget && (
                <ToggleStatusDialog
                    user={customer.toggleTarget}
                    isToggling={customer.isToggling}
                    onCancel={() => customer.setToggleTarget(null)}
                    onConfirm={customer.handleToggleStatus}
                />
            )}

            <div aria-live="polite" aria-atomic="true" className="sr-only">{customer.toast?.message}</div>
            {customer.toast && <ToastMessage toast={customer.toast} />}
        </main>
    );
}

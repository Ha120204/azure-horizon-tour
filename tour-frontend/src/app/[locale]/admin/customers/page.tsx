'use client';

import Dialog from '@/components/ui/Dialog';
import { CustomerBulkActionBar } from './_components/CustomerBulkActionBar';
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
    // SUPER_ADMIN chỉ xem (read-only) khu vận hành — không quản lý khách hàng
    const canManageCustomers = customer.currentUserRole === 'ADMIN';

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
                bookingFilter={customer.bookingFilter}
                segmentFilter={customer.segmentFilter}
                totalItems={customer.meta.totalItems}
                onSearchChange={customer.setSearch}
                onStatusChange={customer.changeStatusFilter}
                onBookingFilterChange={customer.changeBookingFilter}
                onSegmentFilterChange={customer.changeSegmentFilter}
                onResetFilters={customer.resetFilters}
            />

            <CustomerBulkActionBar
                selectedCount={customer.selectedCustomers.length}
                activeCount={customer.selectedActiveCount}
                deactivatedCount={customer.selectedDeactivatedCount}
                canManage={canManageCustomers}
                isBulkUpdating={customer.isBulkUpdating}
                onExport={customer.exportSelectedCustomers}
                onBulkDeactivate={customer.bulkDeactivateSelected}
                onBulkActivate={customer.bulkActivateSelected}
                onClear={customer.clearSelection}
            />

            <CustomerTable
                users={customer.users}
                isLoading={customer.isLoading}
                meta={customer.meta}
                pageSize={customer.pageSize}
                currentUserRole={customer.currentUserRole}
                sortBy={customer.sortBy}
                sortDir={customer.sortDir}
                selectedCustomerIds={customer.selectedCustomerIds}
                allCurrentPageSelected={customer.allCurrentPageSelected}
                someCurrentPageSelected={customer.someCurrentPageSelected}
                onOpenDetail={customer.openDetail}
                onToggleStatus={customer.setToggleTarget}
                onSortChange={customer.changeSort}
                onToggleSelected={customer.toggleSelectedCustomer}
                onToggleCurrentPage={customer.toggleCurrentPageSelection}
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
                    canManage={canManageCustomers}
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

            {customer.bulkConfirm && (
                <Dialog
                    open
                    onClose={customer.cancelBulkUpdate}
                    variant={customer.bulkConfirm.status === 'deactivated' ? 'danger' : 'success'}
                    icon={customer.bulkConfirm.status === 'deactivated' ? 'block' : 'lock_open'}
                    title={customer.bulkConfirm.status === 'deactivated' ? 'Khóa tài khoản hàng loạt?' : 'Mở khóa tài khoản hàng loạt?'}
                    description={
                        customer.bulkConfirm.status === 'deactivated' ? (
                            <>Bạn sắp khóa <strong className="text-on-surface">{customer.bulkConfirm.ids.length}</strong> tài khoản khách hàng. Những tài khoản này sẽ không thể đăng nhập cho đến khi được mở khóa lại.</>
                        ) : (
                            <>Bạn sắp mở khóa <strong className="text-on-surface">{customer.bulkConfirm.ids.length}</strong> tài khoản khách hàng để có thể đăng nhập bình thường.</>
                        )
                    }
                    confirmLabel={customer.bulkConfirm.status === 'deactivated' ? 'Khóa tất cả' : 'Mở khóa tất cả'}
                    onConfirm={customer.confirmBulkUpdate}
                    loading={customer.isBulkUpdating}
                />
            )}

            <div aria-live="polite" aria-atomic="true" className="sr-only">{customer.toast?.message}</div>
            {customer.toast && <ToastMessage toast={customer.toast} />}
        </main>
    );
}

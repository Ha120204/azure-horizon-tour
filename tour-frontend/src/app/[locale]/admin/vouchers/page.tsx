'use client';

import VoucherDetailDrawer from '@/components/admin/VoucherDetailDrawer';
import VoucherFormModal from '@/components/admin/VoucherFormModal';
import { VoucherBulkActionBar } from './_components/VoucherBulkActionBar';
import { DeleteVoucherDialog, VoucherToast } from './_components/VoucherDialogs';
import { VoucherFilters, VoucherKpiGrid, VoucherPageHeader } from './_components/VoucherPageSections';
import { VoucherTable } from './_components/VoucherTable';
import { useVoucherManagement } from './_hooks/useVoucherManagement';

export default function VoucherManagementPage() {
  const voucher = useVoucherManagement();

  return (
    <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <a href="#vouchers-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
        Nhảy đến bảng dữ liệu
      </a>

      <VoucherPageHeader
        currentUserRole={voucher.currentUserRole}
        onCreate={voucher.openCreate}
      />

      <VoucherKpiGrid kpis={voucher.kpis} />

      <VoucherFilters
        search={voucher.search}
        filterType={voucher.filterType}
        filterStatus={voucher.filterStatus}
        meta={voucher.meta}
        isLoadingList={voucher.isLoadingList}
        hasFilter={voucher.hasFilter}
        onSearchChange={voucher.handleSearchChange}
        onTypeChange={voucher.changeTypeFilter}
        onStatusChange={voucher.changeStatusFilter}
        onClearFilters={voucher.clearVoucherFilters}
      />

      <VoucherBulkActionBar
        selectedCount={voucher.selectedCount}
        activeCount={voucher.selectedActiveCount}
        inactiveCount={voucher.selectedInactiveCount}
        canManage={voucher.currentUserRole !== null && voucher.currentUserRole !== 'STAFF'}
        isBulkUpdating={voucher.isBulkUpdating}
        onExport={voucher.exportSelectedVouchers}
        onBulkDeactivate={voucher.bulkDeactivate}
        onBulkActivate={voucher.bulkActivate}
        onClear={voucher.clearSelection}
      />

      <VoucherTable
        vouchers={voucher.vouchers}
        isLoadingList={voucher.isLoadingList}
        meta={voucher.meta}
        page={voucher.page}
        limit={voucher.limit}
        currentUserRole={voucher.currentUserRole}
        toggleLoadingId={voucher.toggleLoadingId}
        sortBy={voucher.sortBy}
        sortOrder={voucher.sortOrder}
        selectedVoucherIds={voucher.selectedVoucherIds}
        allCurrentPageSelected={voucher.allCurrentPageSelected}
        someCurrentPageSelected={voucher.someCurrentPageSelected}
        onOpenDetail={voucher.setDetailId}
        onEdit={voucher.openEdit}
        onDuplicate={voucher.openDuplicate}
        onToggle={voucher.handleToggle}
        onDelete={voucher.setDeleteTarget}
        onCopyCode={voucher.copyVoucherCode}
        onCopyShareLink={voucher.copyVoucherShareLink}
        onToggleSelected={voucher.toggleSelectedVoucher}
        onToggleCurrentPage={voucher.toggleCurrentPageSelection}
        onSortChange={voucher.changeSort}
        onPageChange={voucher.changePage}
        onPageSizeChange={voucher.changePageSize}
      />

      {voucher.modalMode && (
        <VoucherFormModal
          mode={voucher.modalMode}
          initialData={voucher.selectedVoucher ?? undefined}
          onSuccess={voucher.handleFormSuccess}
          onClose={voucher.closeForm}
        />
      )}

      <VoucherDetailDrawer
        voucherId={voucher.detailId}
        onClose={() => voucher.setDetailId(null)}
      />

      {voucher.deleteTarget && (
        <DeleteVoucherDialog
          voucher={voucher.deleteTarget}
          isDeleting={voucher.isDeleting}
          onCancel={() => voucher.setDeleteTarget(null)}
          onConfirm={voucher.confirmDelete}
        />
      )}

      <VoucherToast toast={voucher.toast} />
    </main>
  );
}

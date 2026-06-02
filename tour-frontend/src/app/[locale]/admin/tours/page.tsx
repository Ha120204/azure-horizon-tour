'use client';

import { ActiveToursTable, TrashToursTable } from './_components/TourTables';
import { PendingReviewBanner, StaffDraftBanner } from './_components/TourWorkflowBanners';
import { TourBulkActionBar } from './_components/TourBulkActionBar';
import { TourFilters } from './_components/TourFilters';
import { TourKpiGrid } from './_components/TourKpiGrid';
import { TourOverlays } from './_components/TourOverlays';
import { TourPageHeader } from './_components/TourPageHeader';
import { TourTabs } from './_components/TourTabs';
import { TrashTourControls } from './_components/TrashTourControls';
import { useTourManagement } from './_hooks/useTourManagement';

export default function AdminToursPage() {
    const tour = useTourManagement();
    const trash = tour.trash;

    return (
        <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <a href="#tours-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
                Nhảy đến bảng dữ liệu
            </a>

            <TourPageHeader
                isStaff={tour.isStaff}
                onExportCSV={tour.handleExportCSV}
                onCreate={tour.openCreateModal}
            />

            {tour.isAdmin && (
                <PendingReviewBanner
                    pendingCount={tour.pendingCount}
                    onViewPending={tour.viewPendingTours}
                />
            )}

            <TourKpiGrid isAdmin={tour.isAdmin} filterStatus={tour.filterStatus} kpis={tour.kpis} />

            {tour.isAdmin && (
                <TourTabs
                    activeTab={tour.activeTab}
                    activeCount={tour.meta.totalItems}
                    trashCount={trash.trashMeta.totalItems}
                    onTabChange={tour.setActiveTab}
                />
            )}

            {tour.isStaff && <StaffDraftBanner draftCount={tour.draftCount} />}

            {tour.activeTab === 'active' && (
                <TourFilters
                    searchInput={tour.searchInput}
                    destinations={tour.destinations}
                    filterDest={tour.filterDest}
                    sortBy={tour.sortBy}
                    filterStatus={tour.filterStatus}
                    filterDateFrom={tour.filterDateFrom}
                    filterDateTo={tour.filterDateTo}
                    filterSeats={tour.filterSeats}
                    isAdmin={tour.isAdmin}
                    isStaff={tour.isStaff}
                    onSearchInputChange={tour.setSearchInput}
                    onFilterDestChange={tour.changeFilterDest}
                    onSortByChange={tour.changeSortBy}
                    onFilterStatusChange={tour.changeFilterStatus}
                    onFilterDateFromChange={tour.changeFilterDateFrom}
                    onFilterDateToChange={tour.changeFilterDateTo}
                    onFilterSeatsChange={tour.changeFilterSeats}
                />
            )}

            {tour.activeTab === 'active' && (
                <TourBulkActionBar
                    selectedCount={tour.selectedIds.size}
                    submitCount={tour.selectedBulkSubmitCount}
                    hideCount={tour.selectedBulkHideCount}
                    isStaff={tour.isStaff}
                    isAdmin={tour.isAdmin}
                    isBulkDeleting={tour.isBulkDeleting}
                    isBulkSubmitting={tour.isBulkSubmitting}
                    onClear={() => tour.setSelectedIds(new Set())}
                    onConfirm={() => tour.setShowBulkConfirm(true)}
                    onBulkSubmit={tour.isStaff ? tour.handleBulkSubmit : undefined}
                    onBulkExport={tour.handleExportSelectedCSV}
                />
            )}

            {tour.activeTab === 'trash' && tour.isAdmin && (
                <TrashTourControls
                    searchInput={trash.trashSearchInput}
                    status={trash.trashStatus}
                    deletable={trash.trashDeletable}
                    selectedCount={trash.trashSelectedIds.size}
                    isBulkRestoring={trash.isTrashBulkRestoring}
                    isBulkDeleting={trash.isTrashBulkDeleting}
                    onSearchInputChange={trash.setTrashSearchInput}
                    onStatusChange={tour.changeTrashStatus}
                    onDeletableChange={tour.changeTrashDeletable}
                    onClearSelection={() => trash.setTrashSelectedIds(new Set())}
                    onBulkRestore={trash.handleTrashBulkRestore}
                    onBulkDelete={() => trash.setShowTrashBulkDeleteConfirm(true)}
                />
            )}

            {tour.activeTab === 'trash' && tour.isAdmin && (
                <TrashToursTable
                    trashedTours={trash.trashedTours}
                    isLoading={trash.isLoadingTrash}
                    meta={trash.trashMeta}
                    selectedIds={trash.trashSelectedIds}
                    isAllSelected={trash.isTrashAllSelected}
                    restoringTourId={trash.restoring}
                    onToggleSelectAll={trash.toggleTrashSelectAll}
                    onToggleSelect={trash.toggleTrashSelectOne}
                    onRestore={trash.handleRestore}
                    onPermanentDelete={trash.setPermDeleteTarget}
                    onPageChange={trash.setTrashPage}
                />
            )}

            {tour.activeTab === 'active' && (
                <ActiveToursTable
                    tours={tour.tours}
                    isLoading={tour.isLoading}
                    meta={tour.meta}
                    page={tour.page}
                    pageSize={tour.pageSize}
                    selectedIds={tour.selectedIds}
                    isAllSelected={tour.isAllSelected}
                    userId={tour.userId}
                    isStaff={tour.isStaff}
                    isAdmin={tour.isAdmin}
                    submittingTourId={tour.isSubmitting}
                    onToggleSelectAll={tour.toggleSelectAll}
                    onToggleSelect={tour.toggleSelectOne}
                    canSelectTour={tour.canSelectTour}
                    onOpenDetail={tour.handleOpenDetail}
                    onOpenContent={tour.handleOpenContent}
                    onEdit={tour.handleEdit}
                    onSubmit={tour.handleOpenSubmitForReview}
                    onReview={tour.setReviewTarget}
                    onDelete={tour.setDeleteTarget}
                    onPageChange={tour.setPage}
                    onPageSizeChange={tour.changePageSize}
                />
            )}

            <TourOverlays
                showBulkConfirm={tour.showBulkConfirm}
                selectedCount={tour.selectedIds.size}
                isBulkDeleting={tour.isBulkDeleting}
                onCancelBulkConfirm={() => tour.setShowBulkConfirm(false)}
                onConfirmBulkHide={tour.confirmBulkHide}
                showTrashBulkDeleteConfirm={trash.showTrashBulkDeleteConfirm}
                trashSelectedCount={trash.trashSelectedIds.size}
                isTrashBulkDeleting={trash.isTrashBulkDeleting}
                onCancelTrashBulkDelete={() => trash.setShowTrashBulkDeleteConfirm(false)}
                onConfirmTrashBulkDelete={trash.handleTrashBulkPermanentDelete}
                permDeleteTarget={trash.permDeleteTarget}
                isPermDeleting={trash.isPermDeleting}
                onCancelPermanentDelete={() => trash.setPermDeleteTarget(null)}
                onConfirmPermanentDelete={trash.handlePermanentDelete}
                contentDrawerTour={tour.contentDrawerTour}
                onCloseContentDrawer={() => tour.setContentDrawerTour(null)}
                onContentSuccess={tour.handleContentSuccess}
                detailDrawerTour={tour.detailDrawerTour}
                isDetailLoading={tour.isDetailLoading}
                onCloseDetailDrawer={() => tour.setDetailDrawerTour(null)}
                onCreateDraftFromReference={tour.handleCreateDraftFromReference}
                submitTarget={tour.submitTarget}
                submittingTourId={tour.isSubmitting}
                onConfirmSubmit={tour.handleSubmitForReview}
                onCancelSubmit={() => tour.setSubmitTarget(null)}
                modalMode={tour.modalMode}
                selectedTour={tour.selectedTour}
                destinations={tour.destinations}
                userRole={tour.userRole}
                onFormSuccess={tour.handleFormSuccess}
                onCloseForm={tour.closeForm}
                onDestinationCreated={tour.handleDestinationCreated}
                reviewTarget={tour.reviewTarget}
                onConfirmReview={tour.handleReviewTour}
                onCloseReview={() => tour.setReviewTarget(null)}
                deleteTarget={tour.deleteTarget}
                isStaff={tour.isStaff}
                isDeleting={tour.isDeleting}
                onCancelDelete={() => tour.setDeleteTarget(null)}
                onConfirmDelete={tour.confirmDelete}
                toast={tour.toast}
            />
        </main>
    );
}

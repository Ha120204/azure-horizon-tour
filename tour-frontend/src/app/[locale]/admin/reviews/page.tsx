'use client';

import { DeleteDialog } from './_components/DeleteDialog';
import { Lightbox } from './_components/Lightbox';
import { ReplyModal } from './_components/ReplyModal';
import {
    RatingBreakdown,
    ReviewBulkActionBar,
    ReviewFilters,
    ReviewKpiGrid,
    ReviewList,
    ReviewPageHeader,
    ReviewQuickFilters,
} from './_components/ReviewPageSections';
import { useReviewManagement } from './_hooks/useReviewManagement';

export default function ReviewManagementPage() {
    const review = useReviewManagement();

    return (
        <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1400px] mx-auto">
            <ReviewPageHeader onRefresh={review.refreshReviewData} />

            <ReviewKpiGrid kpis={review.kpis} />

            <ReviewQuickFilters
                activeQuickFilter={review.activeQuickFilter}
                onQuickFilter={review.applyQuickFilter}
            />

            <RatingBreakdown
                stats={review.stats}
                selectedRatings={review.selectedRatings}
                onRatingClick={review.filterByRating}
            />

            <ReviewFilters
                search={review.search}
                ratingFilter={review.ratingFilter}
                statusFilter={review.statusFilter}
                replyFilter={review.replyFilter}
                sortBy={review.sortBy}
                hasFilter={review.hasFilter}
                isLoading={review.isLoading}
                totalItems={review.meta.totalItems}
                onSearchChange={review.setSearch}
                onRatingChange={review.changeRatingFilter}
                onStatusChange={review.changeStatusFilter}
                onReplyChange={review.changeReplyFilter}
                onSortChange={review.changeSortBy}
                onReset={review.resetFilters}
            />

            <ReviewBulkActionBar
                selectedCount={review.selected.length}
                selectedReviews={review.selectedReviews}
                bulkLoading={review.bulkLoading}
                onBulkVisibility={review.handleBulkVisibility}
                onBulkDelete={() => review.setDeleteTarget(review.selected)}
                onExport={review.exportSelectedReviews}
                onClear={review.clearSelection}
            />

            <ReviewList
                reviews={review.reviews}
                locale={review.locale}
                isLoading={review.isLoading}
                hasFilter={review.hasFilter}
                selected={review.selected}
                isAllSelected={review.isAllSelected}
                loadingId={review.loadingId}
                meta={review.meta}
                pageSize={review.pageSize}
                onToggleSelectAll={review.toggleSelectAll}
                onToggleSelect={review.toggleSelect}
                onToggleVisibility={review.handleToggleVisibility}
                onDelete={review.setDeleteTarget}
                onReply={review.setReplyTarget}
                onImageClick={review.openLightbox}
                onResetFilters={review.resetFilters}
                onPageChange={review.changePage}
                onPageSizeChange={review.changePageSize}
            />

            {review.lightbox && (
                <Lightbox
                    images={review.lightbox.images}
                    initial={review.lightbox.idx}
                    onClose={() => review.setLightbox(null)}
                />
            )}

            {review.deleteTarget && (
                <DeleteDialog
                    count={review.deleteTarget.length}
                    onConfirm={review.handleDelete}
                    onCancel={() => review.setDeleteTarget(null)}
                    isLoading={review.isDeleting}
                />
            )}

            {review.replyTarget && (
                <ReplyModal
                    review={review.replyTarget}
                    onSave={review.handleReply}
                    onClose={() => review.setReplyTarget(null)}
                />
            )}

        </main>
    );
}

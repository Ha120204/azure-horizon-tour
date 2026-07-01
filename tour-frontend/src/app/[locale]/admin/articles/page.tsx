'use client';

import { ArticleFilters } from './_components/ArticleFilters';
import { ArticleKpiGrid } from './_components/ArticleKpiGrid';
import { ArticleOverlays } from './_components/ArticleOverlays';
import { ArticlePageHeader } from './_components/ArticlePageHeader';
import { ArticleGridView, ArticleListView } from './_components/ArticleViews';
import { ArticleWorkflowBanners } from './_components/ArticleWorkflowBanners';
import { useArticleManagement } from './_hooks/useArticleManagement';

export default function ArticleManagementPage() {
  const article = useArticleManagement();

  return (
    <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto">
      <a href="#articles-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
        Nhảy đến bảng dữ liệu
      </a>

      <ArticlePageHeader
        viewMode={article.viewMode}
        isAdmin={article.isAdmin}
        canWrite={article.canWrite}
        showTrash={article.showTrash}
        trashCount={article.trashCount}
        onViewModeChange={article.setViewMode}
        onRefresh={article.fetchArticles}
        onToggleTrash={article.toggleTrashPanel}
        onCreate={article.openCreate}
      />

      <ArticleKpiGrid isAdmin={article.isAdmin} kpiCards={article.kpiCards} />

      <ArticleWorkflowBanners
        isAdmin={article.isAdmin}
        stats={article.articleStats}
        onViewStatus={article.viewWorkflowStatus}
        onCreate={article.openCreate}
      />

      <ArticleFilters
        search={article.search}
        categoryFilter={article.categoryFilter}
        featuredFilter={article.featuredFilter}
        statusFilter={article.statusFilter}
        hasFilter={article.hasFilter}
        isAdmin={article.isAdmin}
        userRole={article.userRole}
        isLoading={article.isLoading}
        meta={article.meta}
        topCategory={article.topCategorySummary}
        onSearchChange={article.setSearch}
        onCategoryChange={article.changeCategoryFilter}
        onFeaturedChange={article.changeFeaturedFilter}
        onStatusChange={article.changeStatusFilter}
        onResetFilters={article.resetFilters}
      />

      {article.viewMode === 'list' && (
        <ArticleListView
          articles={article.articles}
          isLoading={article.isLoading}
          hasFilter={article.hasFilter}
          isAdmin={article.isAdmin}
          canWrite={article.canWrite}
          userId={article.userId}
          isSubmitting={article.isSubmitting}
          meta={article.meta}
          pageSize={article.pageSize}
          sortBy={article.sortBy}
          sortDir={article.sortDir}
          selectedArticleIds={article.selectedArticleIds}
          selectedArticles={article.selectedArticles}
          selectedCount={article.selectedArticles.length}
          allCurrentPageSelected={article.allCurrentPageSelected}
          someCurrentPageSelected={article.someCurrentPageSelected}
          isBulkActionLoading={article.isBulkActionLoading}
          onCreate={article.openCreate}
          onOpenEdit={article.openEdit}
          onToggleFeatured={article.handleToggleFeatured}
          onReview={article.setReviewTarget}
          onSubmit={article.setSubmitTarget}
          onDelete={article.setDeleteTarget}
          onToggleSelected={article.toggleSelectedArticle}
          onToggleCurrentPage={article.toggleCurrentPageSelection}
          onClearSelection={article.clearArticleSelection}
          onBulkAction={article.handleBulkAction}
          onSortChange={article.changeSort}
          onPageChange={article.setPage}
          onPageSizeChange={article.changePageSize}
        />
      )}

      {article.viewMode === 'grid' && (
        <ArticleGridView
          articles={article.articles}
          isLoading={article.isLoading}
          hasFilter={article.hasFilter}
          isAdmin={article.isAdmin}
          canWrite={article.canWrite}
          userId={article.userId}
          isSubmitting={article.isSubmitting}
          meta={article.meta}
          pageSize={article.pageSize}
          onCreate={article.openCreate}
          onOpenEdit={article.openEdit}
          onToggleFeatured={article.handleToggleFeatured}
          onReview={article.setReviewTarget}
          onSubmit={article.setSubmitTarget}
          onDelete={article.setDeleteTarget}
          onPageChange={article.setPage}
          onPageSizeChange={article.changePageSize}
        />
      )}

      <ArticleOverlays
        drawerMode={article.drawerMode}
        editTarget={article.editTarget}
        userRole={article.userRole}
        onCloseDrawer={article.closeDrawer}
        onDrawerSuccess={article.handleDrawerSuccess}
        reviewTarget={article.reviewTarget}
        rejectNote={article.rejectNote}
        isReviewing={article.isReviewing}
        onRejectNoteChange={article.setRejectNote}
        onCancelReview={article.cancelReview}
        onConfirmReview={article.handleReview}
        submitTarget={article.submitTarget}
        isSubmitting={article.isSubmitting}
        onConfirmSubmit={article.handleSubmitForReview}
        onCancelSubmit={() => article.setSubmitTarget(null)}
        deleteTarget={article.deleteTarget}
        isDeleting={article.isDeleting}
        onConfirmDelete={article.handleDelete}
        onCancelDelete={() => article.setDeleteTarget(null)}
        showTrash={article.showTrash}
        isAdmin={article.canWrite}
        trashArticles={article.trashArticles}
        trashMeta={article.trashMeta}
        trashSearch={article.trashSearch}
        trashLoading={article.trashLoading}
        isRestoring={article.isRestoring}
        onCloseTrash={() => article.setShowTrash(false)}
        onTrashSearchChange={article.changeTrashSearch}
        onTrashPageChange={article.setTrashPage}
        onRestore={article.handleRestore}
        onHardDelete={article.setHardDeleteTarget}
        hardDeleteTarget={article.hardDeleteTarget}
        isHardDeleting={article.isHardDeleting}
        onCancelHardDelete={() => article.setHardDeleteTarget(null)}
        onConfirmHardDelete={article.handleHardDelete}
        toast={article.toast}
      />
    </main>
  );
}

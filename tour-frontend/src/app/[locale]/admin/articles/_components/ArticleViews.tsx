'use client';

import { useEffect, useRef } from 'react';
import AdminPagination from '@/components/admin/AdminPagination';
import type { Article } from './ArticleDrawer';
import { SkeletonRow } from './SkeletonRow';
import { ArticleSelectionBar } from './ArticleSelectionBar';
import { ArticleTableRow } from './ArticleTableRow';
import { ArticleGridCard } from './ArticleGridCard';
import type { ArticleBulkAction, ArticleBulkActionOptions, ArticleMeta, ArticleSortKey, SharedArticleViewProps, SortDirection } from '../_lib/types';

interface ArticleListViewProps extends SharedArticleViewProps {
  meta: ArticleMeta;
  pageSize: number;
  sortBy: ArticleSortKey;
  sortDir: SortDirection;
  selectedArticleIds: Set<number>;
  selectedArticles: Article[];
  selectedCount: number;
  allCurrentPageSelected: boolean;
  someCurrentPageSelected: boolean;
  isBulkActionLoading: boolean;
  onToggleSelected: (articleId: number) => void;
  onToggleCurrentPage: () => void;
  onClearSelection: () => void;
  onBulkAction: (action: ArticleBulkAction, options?: ArticleBulkActionOptions) => void;
  onSortChange: (key: ArticleSortKey) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const articleTableColumns: Array<{
  id: string;
  label: string;
  sortKey?: ArticleSortKey;
  className?: string;
}> = [
  { id: 'cover', label: '', className: 'w-[92px]' },
  { id: 'title', label: 'Bài viết', sortKey: 'title', className: 'min-w-[300px]' },
  { id: 'category', label: 'Danh mục', sortKey: 'category', className: 'min-w-[130px]' },
  { id: 'author', label: 'Tác giả', sortKey: 'author', className: 'min-w-[150px]' },
  { id: 'time', label: 'Thời gian', sortKey: 'publishedAt', className: 'min-w-[180px]' },
  { id: 'status', label: 'Trạng thái', sortKey: 'status', className: 'min-w-[140px]' },
  { id: 'featured', label: 'Nổi bật', sortKey: 'isFeatured', className: 'min-w-[105px]' },
  { id: 'actions', label: 'Thao tác', className: 'min-w-[150px] text-right' },
];

export function ArticleListView({
  articles,
  isLoading,
  hasFilter,
  isAdmin,
  canWrite,
  userId,
  isSubmitting,
  meta,
  pageSize,
  sortBy,
  sortDir,
  selectedArticleIds,
  selectedArticles,
  selectedCount,
  allCurrentPageSelected,
  someCurrentPageSelected,
  isBulkActionLoading,
  onCreate,
  onOpenEdit,
  onToggleFeatured,
  onReview,
  onSubmit,
  onDelete,
  onToggleSelected,
  onToggleCurrentPage,
  onClearSelection,
  onBulkAction,
  onSortChange,
  onPageChange,
  onPageSizeChange,
}: ArticleListViewProps) {
  // SUPER_ADMIN xem read-only: ẩn ô chọn để không kích hoạt bulk
  const isReadOnly = isAdmin && !canWrite;
  return (
    <div id="articles-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
      <ArticleSelectionBar
        selectedArticles={selectedArticles}
        selectedCount={selectedCount}
        isAdmin={isAdmin}
        canWrite={canWrite}
        userId={userId}
        isLoading={isBulkActionLoading}
        onClear={onClearSelection}
        onBulkAction={onBulkAction}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
              <th className="py-3.5 pl-5 pr-2 w-10">
                {!isReadOnly && (
                  <IndeterminateCheckbox
                    checked={allCurrentPageSelected}
                    indeterminate={!allCurrentPageSelected && someCurrentPageSelected}
                    disabled={articles.length === 0 || isLoading}
                    onChange={onToggleCurrentPage}
                    ariaLabel={allCurrentPageSelected ? 'Bỏ chọn tất cả bài viết đang hiển thị' : 'Chọn tất cả bài viết đang hiển thị'}
                  />
                )}
              </th>
              {articleTableColumns.map(column => (
                <SortableHeaderCell
                  key={column.id}
                  column={column}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSortChange={onSortChange}
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-24 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-3xl text-outline">article</span>
                    </div>
                    <p className="font-bold text-on-surface">Không tìm thấy bài viết nào</p>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {hasFilter ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.' : 'Hãy tạo bài viết đầu tiên của bạn!'}
                    </p>
                    {!hasFilter && (
                      <button
                        onClick={onCreate}
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-colors outline-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">post_add</span>{isAdmin ? 'Tạo bài viết đầu tiên' : 'Tạo bản nháp đầu tiên'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              articles.map(article => (
                <ArticleTableRow
                  key={article.id}
                  article={article}
                  isSelected={selectedArticleIds.has(article.id)}
                  isAdmin={isAdmin}
                  canWrite={canWrite}
                  userId={userId}
                  isSubmitting={isSubmitting}
                  onToggleSelected={onToggleSelected}
                  onOpenEdit={onOpenEdit}
                  onToggleFeatured={onToggleFeatured}
                  onReview={onReview}
                  onSubmit={onSubmit}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="py-3 px-6 border-t border-outline-variant/10 bg-surface-container-lowest">
        <AdminPagination
          currentPage={meta.currentPage}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={hasFilter ? 'kết quả' : 'bài viết'}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>
    </div>
  );
}

function SortableHeaderCell({
  column,
  sortBy,
  sortDir,
  onSortChange,
}: {
  column: (typeof articleTableColumns)[number];
  sortBy: ArticleSortKey;
  sortDir: SortDirection;
  onSortChange: (key: ArticleSortKey) => void;
}) {
  const isActive = column.sortKey === sortBy;
  const ariaSort = !column.sortKey ? undefined : isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`py-3.5 px-5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${column.className ?? ''}`}
    >
      {column.sortKey ? (
        <button
          type="button"
          onClick={() => onSortChange(column.sortKey!)}
          className={`group inline-flex w-full items-center gap-1.5 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 ${column.id === 'actions' ? 'justify-end' : 'justify-start'}`}
        >
          <span>{column.label}</span>
          <span
            className={`material-symbols-outlined text-[15px] transition-opacity ${isActive ? 'opacity-100 text-primary' : 'opacity-30 group-hover:opacity-70'}`}
            aria-hidden="true"
          >
            {isActive && sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        </button>
      ) : (
        <span>{column.label}</span>
      )}
    </th>
  );
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
      aria-label={ariaLabel}
      aria-checked={checked ? 'true' : indeterminate ? 'mixed' : 'false'}
      title={ariaLabel}
    />
  );
}

interface ArticleGridViewProps extends SharedArticleViewProps {
  meta: ArticleMeta;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ArticleGridView({
  articles,
  isLoading,
  hasFilter,
  isAdmin,
  canWrite,
  userId,
  isSubmitting,
  meta,
  pageSize,
  onCreate,
  onOpenEdit,
  onToggleFeatured,
  onReview,
  onSubmit,
  onDelete,
  onPageChange,
  onPageSizeChange,
}: ArticleGridViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 animate-pulse">
            <div className="aspect-video bg-surface-container-high" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-surface-container-high rounded w-3/4" />
              <div className="h-3 bg-surface-container rounded w-full" />
              <div className="h-3 bg-surface-container rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {articles.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <div className="col-span-full py-24 text-center">
            <p className="font-bold text-on-surface">Không có bài viết nào</p>
            <button onClick={onCreate} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold mx-auto hover:bg-primary/90 outline-none">
              <span className="material-symbols-outlined text-[16px]">post_add</span>{isAdmin ? 'Tạo bài viết' : 'Tạo bản nháp'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {articles.map(article => (
            <ArticleGridCard
              key={article.id}
              article={article}
              isAdmin={isAdmin}
              canWrite={canWrite}
              userId={userId}
              isSubmitting={isSubmitting}
              onOpenEdit={onOpenEdit}
              onToggleFeatured={onToggleFeatured}
              onReview={onReview}
              onSubmit={onSubmit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm py-3 px-6">
        <AdminPagination
          currentPage={meta.currentPage}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={hasFilter ? 'kết quả' : 'bài viết'}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>
    </div>
  );
}

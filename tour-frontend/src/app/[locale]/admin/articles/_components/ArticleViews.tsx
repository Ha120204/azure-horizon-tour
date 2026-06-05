'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Article } from '@/components/admin/ArticleDrawer';
import AdminPagination from '@/components/admin/AdminPagination';
import { SkeletonRow } from './SkeletonRow';
import { fmtDate, getCatCfg, getStatusCfg } from '../_lib/helpers';
import type { ArticleBulkAction, ArticleBulkActionOptions, ArticleMeta, ArticleReviewAction, ArticleSortKey, ArticleStatus, SortDirection } from '../_lib/types';

interface SharedArticleViewProps {
  articles: Article[];
  isLoading: boolean;
  hasFilter: boolean;
  isAdmin: boolean;
  userId: number | null;
  isSubmitting: number | null;
  onCreate: () => void;
  onOpenEdit: (article: Article) => void;
  onToggleFeatured: (article: Article) => void;
  onReview: (target: { article: Article; action: ArticleReviewAction }) => void;
  onSubmit: (article: Article) => void;
  onDelete: (article: Article) => void;
}

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
  return (
    <div id="articles-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
      <ArticleSelectionBar
        selectedArticles={selectedArticles}
        selectedCount={selectedCount}
        isAdmin={isAdmin}
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
                <IndeterminateCheckbox
                  checked={allCurrentPageSelected}
                  indeterminate={!allCurrentPageSelected && someCurrentPageSelected}
                  disabled={articles.length === 0 || isLoading}
                  onChange={onToggleCurrentPage}
                  ariaLabel={allCurrentPageSelected ? 'Bỏ chọn tất cả bài viết đang hiển thị' : 'Chọn tất cả bài viết đang hiển thị'}
                />
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

function ArticleSelectionBar({
  selectedArticles,
  selectedCount,
  isAdmin,
  userId,
  isLoading,
  onClear,
  onBulkAction,
}: {
  selectedArticles: Article[];
  selectedCount: number;
  isAdmin: boolean;
  userId: number | null;
  isLoading: boolean;
  onClear: () => void;
  onBulkAction: (action: ArticleBulkAction, options?: ArticleBulkActionOptions) => void;
}) {
  const [confirmAction, setConfirmAction] = useState<ConfirmableBulkAction | null>(null);

  if (selectedCount === 0) return null;

  const publishCount = selectedArticles.filter(article => (article.status ?? 'PUBLISHED') !== 'PUBLISHED').length;
  const draftCount = selectedArticles.filter(article => (article.status ?? 'PUBLISHED') !== 'DRAFT').length;
  const submitCount = selectedArticles.filter(article => {
    const status = article.status ?? 'PUBLISHED';
    return !isAdmin && (article.createdById == null || article.createdById === userId) && (status === 'DRAFT' || status === 'REJECTED');
  }).length;
  const confirmCount = confirmAction === 'publish' ? publishCount : draftCount;

  return (
    <>
      <div
        role="toolbar"
        aria-label={`Đã chọn ${selectedCount} bài viết`}
        className="border-b border-primary/15 bg-primary/[0.035] px-5 py-3"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
              <span className="material-symbols-outlined text-[18px]">checklist</span>
            </span>
            <p className="truncate text-sm font-semibold text-on-surface">
              Đã chọn <strong className="text-primary">{selectedCount}</strong> bài viết
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {isAdmin ? (
              <>
                {publishCount > 0 && (
                  <BulkActionButton
                    icon="publish"
                    label={`Xuất bản (${publishCount})`}
                    disabled={isLoading}
                    onClick={() => setConfirmAction('publish')}
                    className="border-emerald-300/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                  />
                )}
                {draftCount > 0 && (
                  <BulkActionButton
                    icon="edit_note"
                    label={`Chuyển nháp (${draftCount})`}
                    disabled={isLoading}
                    onClick={() => setConfirmAction('draft')}
                    className="border-outline-variant/20 bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  />
                )}
                <BulkActionButton
                  icon="delete"
                  label={`Thùng rác (${selectedCount})`}
                  disabled={isLoading}
                  onClick={() => onBulkAction('trash')}
                  className="border-red-300/40 bg-red-600 text-white hover:bg-red-700"
                />
              </>
            ) : submitCount > 0 ? (
              <BulkActionButton
                icon="send"
                label={`Gửi duyệt (${submitCount})`}
                disabled={isLoading}
                onClick={() => onBulkAction('submit')}
                className="border-amber-300/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
              />
            ) : null}
            <button
              type="button"
              onClick={onClear}
              disabled={isLoading}
              className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      </div>
      {confirmAction ? (
        <BulkWorkflowConfirmDialog
          action={confirmAction}
          count={confirmCount}
          isLoading={isLoading}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            onBulkAction(confirmAction, { skipConfirm: true });
            setConfirmAction(null);
          }}
        />
      ) : null}
    </>
  );
}

type ConfirmableBulkAction = Extract<ArticleBulkAction, 'publish' | 'draft'>;

function BulkWorkflowConfirmDialog({
  action,
  count,
  isLoading,
  onCancel,
  onConfirm,
}: {
  action: ConfirmableBulkAction;
  count: number;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isPublish = action === 'publish';
  const config = isPublish
    ? {
        icon: 'publish',
        title: `Xuất bản ${count} bài viết đã chọn?`,
        description: 'Các bài đủ điều kiện sẽ chuyển sang trạng thái đã xuất bản và có thể hiển thị với khách.',
        primaryLabel: 'Xuất bản',
        toneIcon: 'bg-emerald-100 text-emerald-700',
        primaryClass: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-400',
        detailIcon: 'visibility',
        details: ['Chuyển trạng thái sang Đã xuất bản', 'Ghi nhận thời điểm xuất bản mới', 'Bài thiếu dữ liệu bắt buộc sẽ được bỏ qua'],
      }
    : {
        icon: 'edit_note',
        title: `Chuyển ${count} bài viết về bản nháp?`,
        description: 'Các bài được chọn sẽ rời trạng thái xuất bản/chờ duyệt và trở lại bản nháp nội bộ.',
        primaryLabel: 'Chuyển nháp',
        toneIcon: 'bg-surface-container text-on-surface-variant',
        primaryClass: 'bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary',
        detailIcon: 'visibility_off',
        details: ['Ẩn khỏi trang khách nếu đang xuất bản', 'Bỏ trạng thái nổi bật nếu có', 'Có thể chỉnh sửa rồi xuất bản lại sau'],
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bulk-confirm-title"
        aria-describedby="bulk-confirm-description"
        className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-2xl"
      >
        <div className="flex items-start gap-4 px-6 pt-6">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.toneIcon}`} aria-hidden="true">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Xác nhận thao tác</p>
            <h3 id="bulk-confirm-title" className="mt-1 text-lg font-extrabold leading-snug text-on-surface">
              {config.title}
            </h3>
            <p id="bulk-confirm-description" className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              {config.description}
            </p>
          </div>
        </div>

        <div className="mx-6 mt-5 rounded-xl border border-outline-variant/12 bg-surface-container-low px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-on-surface">
            <span className="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">{config.detailIcon}</span>
            Ảnh hưởng sau khi xác nhận
          </div>
          <ul className="space-y-1.5">
            {config.details.map(detail => (
              <li key={detail} className="flex items-start gap-2 text-xs leading-relaxed text-on-surface-variant">
                <span className="material-symbols-outlined mt-0.5 text-[13px] text-primary" aria-hidden="true">check_circle</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-outline-variant/10 bg-surface-container-lowest px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary outline-none disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold shadow-sm transition-colors focus-visible:ring-2 outline-none disabled:opacity-60 ${config.primaryClass}`}
          >
            <span className={`material-symbols-outlined text-[17px] ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true">
              {isLoading ? 'progress_activity' : config.icon}
            </span>
            {config.primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkActionButton({
  icon,
  label,
  disabled,
  onClick,
  className,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary outline-none ${className}`}
    >
      <span className={`material-symbols-outlined text-[14px] ${disabled ? 'animate-spin' : ''}`} aria-hidden="true">
        {disabled ? 'progress_activity' : icon}
      </span>
      {label}
    </button>
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

function ArticleTableRow({
  article,
  isSelected,
  isAdmin,
  userId,
  isSubmitting,
  onToggleSelected,
  onOpenEdit,
  onToggleFeatured,
  onReview,
  onSubmit,
  onDelete,
}: Omit<SharedArticleViewProps, 'articles' | 'isLoading' | 'hasFilter' | 'onCreate'> & {
  article: Article;
  isSelected: boolean;
  onToggleSelected: (articleId: number) => void;
}) {
  const categoryConfig = getCatCfg(article.category);
  const articleStatus = article.status ?? 'PUBLISHED';
  const staffCanManage = !isAdmin && (article.createdById == null || article.createdById === userId) && (articleStatus === 'DRAFT' || articleStatus === 'REJECTED');
  const canEditArticle = isAdmin || staffCanManage;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <tr
      className={`transition-colors group ${canEditArticle ? 'cursor-pointer hover:bg-primary/[0.025]' : 'cursor-default'} ${isSelected ? 'bg-primary/[0.045]' : ''}`}
      onClick={() => {
        if (canEditArticle) onOpenEdit(article);
      }}
    >
      <td className="py-3.5 pl-5 pr-2" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelected(article.id)}
          className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer"
          aria-label={`Chọn bài viết ${article.title || 'chưa có tiêu đề'}`}
          title={`Chọn bài viết ${article.title || 'chưa có tiêu đề'}`}
        />
      </td>
      <td className="py-3.5 px-5" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-11 rounded-lg overflow-hidden bg-surface-container shrink-0">
          {article.imageUrl && !imageFailed ? (
            <Image
              src={article.imageUrl}
              alt={article.title || 'Bản nháp bài viết'}
              width={64}
              height={44}
              sizes="64px"
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <ArticleCoverPlaceholder />
          )}
        </div>
      </td>
      <td className="py-3.5 px-5 max-w-[280px]">
        <p className="font-semibold text-on-surface text-sm line-clamp-1 group-hover:text-primary transition-colors">{article.title || 'Bản nháp chưa có tiêu đề'}</p>
        <p className="text-xs text-on-surface-variant/60 line-clamp-1 mt-0.5">{article.excerpt || 'Chưa có tóm tắt'}</p>
      </td>
      <td className="py-3.5 px-5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${categoryConfig.badge}`}>
          <span className={`material-symbols-outlined text-[12px] ${categoryConfig.color}`}>{categoryConfig.icon}</span>
          {categoryConfig.label}
        </span>
      </td>
      <td className="py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap">{article.author || '—'}</td>
      <td className="py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap">
        <ArticleTimeCell article={article} />
      </td>
      <td className="py-3.5 px-5 whitespace-nowrap">
        <ArticleStatusCell article={article} />
      </td>
      <td className="py-3.5 px-5" onClick={e => e.stopPropagation()}>
        {articleStatus === 'PUBLISHED' ? (
          <div className="relative group/tip inline-block">
            <button
              onClick={() => onToggleFeatured(article)}
              aria-label="Toggle nổi bật"
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors outline-none ${article.isFeatured ? 'text-amber-500 hover:bg-amber-50' : 'text-on-surface-variant/30 hover:bg-amber-50 hover:text-amber-400'}`}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: article.isFeatured ? "'FILL' 1" : "'FILL' 0" }}>star</span>
            </button>
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
              {article.isFeatured ? 'Bỏ nổi bật' : 'Đặt nổi bật'}<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
            </span>
          </div>
        ) : <span className="text-xs text-on-surface-variant/40">—</span>}
      </td>
      <td className="py-3.5 px-5 text-right" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {articleStatus === 'PUBLISHED' && (
            <TooltipIconButton
              icon="open_in_new"
              label="Xem"
              onClick={() => window.open(`/vi/journal/${article.slug}`, '_blank')}
              className="hover:bg-primary/10 hover:text-primary"
            />
          )}
          {isAdmin && articleStatus === 'PENDING_REVIEW' && (
            <>
              <TooltipIconButton
                icon="check_circle"
                label="Duyệt"
                onClick={() => onReview({ article, action: 'approve' })}
                className="hover:bg-emerald-500/10 hover:text-emerald-600"
                tooltipClassName="bg-emerald-700 text-white"
                arrowClassName="border-t-emerald-700"
              />
              <TooltipIconButton
                icon="cancel"
                label="Từ chối"
                onClick={() => onReview({ article, action: 'reject' })}
                className="hover:bg-error/10 hover:text-error"
                tooltipClassName="bg-error text-on-error"
                arrowClassName="border-t-error"
              />
            </>
          )}
          {canEditArticle && (
            <div className="relative group/tip">
              <button
                onClick={() => onOpenEdit(article)}
                aria-label="Chỉnh sửa"
                className={`${staffCanManage ? 'w-auto px-2.5 gap-1 text-xs font-bold' : 'w-8'} h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors outline-none`}
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                {staffCanManage && <span>Chỉnh sửa</span>}
              </button>
              {!staffCanManage && (
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                  Chỉnh sửa<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                </span>
              )}
            </div>
          )}
          {staffCanManage && (
            <button
              onClick={() => onSubmit(article)}
              disabled={isSubmitting === article.id}
              aria-label="Gửi duyệt"
              className="h-8 w-auto px-2.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors outline-none disabled:opacity-50"
            >
              {isSubmitting === article.id
                ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[18px]">send</span>}
              <span>Gửi duyệt</span>
            </button>
          )}
          {isAdmin && (
            <TooltipIconButton
              icon="delete"
              label="Xóa"
              onClick={() => onDelete(article)}
              className="hover:bg-error/10 hover:text-error"
              tooltipClassName="bg-error text-on-error"
              arrowClassName="border-t-error"
            />
          )}
        </div>
      </td>
    </tr>
  );
}

function ArticleCoverPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-surface-container text-outline">
      <span className="material-symbols-outlined text-[17px]" aria-hidden="true">image_not_supported</span>
      <span className="text-[9px] font-semibold leading-none">Chưa ảnh</span>
    </div>
  );
}

function ArticleTimeCell({ article }: { article: Article }) {
  const status = article.status ?? 'PUBLISHED';
  const date = status === 'PUBLISHED'
    ? article.publishedAt
    : article.updatedAt ?? article.createdAt ?? article.publishedAt;
  const dateLabel = status === 'PUBLISHED' ? 'Xuất bản' : 'Cập nhật';

  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-on-surface-variant">
        <span className="material-symbols-outlined text-[13px]" aria-hidden="true">schedule</span>
        {article.readTime} phút
      </span>
      <span className="text-[11px] text-on-surface-variant/70">
        {dateLabel}: {fmtDate(date)}
      </span>
    </div>
  );
}

function getArticleWorkflowHint(status: ArticleStatus) {
  const hints: Record<ArticleStatus, string> = {
    DRAFT: 'Có thể chỉnh sửa',
    PENDING_REVIEW: 'Đang chờ Admin',
    PUBLISHED: 'Đang hiển thị',
    REJECTED: 'Cần sửa rồi gửi lại',
  };
  return hints[status];
}

function ArticleStatusCell({ article }: { article: Article }) {
  const articleStatus = (article.status ?? 'PUBLISHED') as ArticleStatus;
  const statusConfig = getStatusCfg(articleStatus);
  const reviewNote = article.reviewNote;

  return (
    <div className="flex flex-col gap-1">
      <span
        title={`Trạng thái: ${statusConfig.label}`}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${statusConfig.cls}`}
      >
        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{statusConfig.icon}</span>
        {statusConfig.label}
      </span>
      <span className="text-[10px] font-medium leading-tight text-on-surface-variant/65">
        {getArticleWorkflowHint(articleStatus)}
      </span>
      {articleStatus === 'REJECTED' && reviewNote && (
        <p className="text-[10px] text-error font-medium max-w-[140px] leading-tight cursor-help" title={reviewNote}>
          ↳ {reviewNote.length > 50 ? reviewNote.slice(0, 50) + '…' : reviewNote}
        </p>
      )}
    </div>
  );
}

interface TooltipIconButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
  tooltipClassName?: string;
  arrowClassName?: string;
}

function TooltipIconButton({
  icon,
  label,
  onClick,
  className = '',
  tooltipClassName = 'bg-on-surface text-surface',
  arrowClassName = 'border-t-on-surface',
}: TooltipIconButtonProps) {
  return (
    <div className="relative group/tip">
      <button
        onClick={onClick}
        aria-label={label}
        className={`w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant transition-colors outline-none ${className}`}
      >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </button>
      <span className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20 ${tooltipClassName}`}>
        {label}<span className={`absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent ${arrowClassName}`} />
      </span>
    </div>
  );
}

export function ArticleGridView({
  articles,
  isLoading,
  isAdmin,
  userId,
  isSubmitting,
  onCreate,
  onOpenEdit,
  onToggleFeatured,
  onReview,
  onSubmit,
  onDelete,
}: SharedArticleViewProps) {
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

  if (articles.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <div className="col-span-full py-24 text-center">
          <p className="font-bold text-on-surface">Không có bài viết nào</p>
          <button onClick={onCreate} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold mx-auto hover:bg-primary/90 outline-none">
            <span className="material-symbols-outlined text-[16px]">post_add</span>{isAdmin ? 'Tạo bài viết' : 'Tạo bản nháp'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {articles.map(article => (
        <ArticleGridCard
          key={article.id}
          article={article}
          isAdmin={isAdmin}
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
  );
}

function ArticleGridCard({
  article,
  isAdmin,
  userId,
  isSubmitting,
  onOpenEdit,
  onToggleFeatured,
  onReview,
  onSubmit,
  onDelete,
}: Omit<SharedArticleViewProps, 'articles' | 'isLoading' | 'hasFilter' | 'onCreate'> & { article: Article }) {
  const categoryConfig = getCatCfg(article.category);
  const articleStatus = (article.status ?? 'PUBLISHED') as ArticleStatus;
  const statusConfig = getStatusCfg(articleStatus);
  const staffCanManage = !isAdmin && (article.createdById == null || article.createdById === userId) && (articleStatus === 'DRAFT' || articleStatus === 'REJECTED');
  const canEditArticle = isAdmin || staffCanManage;

  return (
    <article
      className={`flex flex-col group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm transition-all duration-300 relative ${canEditArticle ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : 'cursor-default'}`}
      onClick={() => {
        if (canEditArticle) onOpenEdit(article);
      }}
    >
      <div className="relative aspect-video overflow-hidden bg-surface-container">
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title || 'Bản nháp bài viết'}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x225/e2e8f0/94a3b8?text=No+Image'; }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-outline">
            <span className="material-symbols-outlined text-3xl">article</span>
            <span className="text-xs font-semibold">Chưa có ảnh bìa</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md ${categoryConfig.badge}`}>
          {categoryConfig.label}
        </span>
        {article.isFeatured && (
          <span className="absolute top-3 right-3 text-amber-400 drop-shadow">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </span>
        )}
        <span className={`absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm ${statusConfig.cls}`}>
          <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{statusConfig.icon}</span>
          {statusConfig.label}
        </span>
        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={e => e.stopPropagation()}>
          {canEditArticle && (
            <button
              onClick={() => onOpenEdit(article)}
              aria-label="Chỉnh sửa"
              className="w-10 h-10 bg-white/90 backdrop-blur-sm text-primary rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          )}
          {staffCanManage && (
            <button
              onClick={() => onSubmit(article)}
              disabled={isSubmitting === article.id}
              aria-label="Gửi duyệt"
              className="w-10 h-10 bg-amber-500/90 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-amber-500 hover:scale-110 transition-all shadow-md disabled:opacity-60"
            >
              {isSubmitting === article.id
                ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[18px]">send</span>}
            </button>
          )}
          {isAdmin && articleStatus === 'PENDING_REVIEW' && (
            <>
              <button
                onClick={() => onReview({ article, action: 'approve' })}
                aria-label="Duyệt"
                className="w-10 h-10 bg-emerald-600/95 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 hover:scale-110 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </button>
              <button
                onClick={() => onReview({ article, action: 'reject' })}
                aria-label="Từ chối"
                className="w-10 h-10 bg-error/95 text-on-error rounded-full flex items-center justify-center hover:bg-error hover:scale-110 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
              </button>
            </>
          )}
          {isAdmin && (
            <>
              {articleStatus === 'PUBLISHED' && (
                <button
                  onClick={() => onToggleFeatured(article)}
                  aria-label="Toggle nổi bật"
                  className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-md ${article.isFeatured ? 'bg-amber-400/90 text-white hover:bg-amber-400' : 'bg-white/90 text-amber-400 hover:bg-white'}`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </button>
              )}
              <button
                onClick={() => onDelete(article)}
                aria-label="Xóa"
                className="w-10 h-10 bg-error/90 backdrop-blur-sm text-on-error rounded-full flex items-center justify-center hover:bg-error hover:scale-110 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">{article.title || 'Bản nháp chưa có tiêu đề'}</h3>
        <p className="text-xs text-on-surface-variant line-clamp-2 flex-1">{article.excerpt || 'Chưa có tóm tắt'}</p>
        <p className="mt-2 text-[11px] font-medium text-on-surface-variant/70">{getArticleWorkflowHint(articleStatus)}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/10 text-[11px] text-on-surface-variant">
          <span className="font-medium">{article.author || '—'}</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">schedule</span>{article.readTime} phút
          </span>
        </div>
      </div>
    </article>
  );
}

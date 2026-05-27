'use client';

import Image from 'next/image';
import type { Article } from '@/components/admin/ArticleDrawer';
import AdminPagination from '@/components/admin/AdminPagination';
import { SkeletonRow } from './SkeletonRow';
import { fmtDate, getCatCfg, getStatusCfg } from '../_lib/helpers';
import type { ArticleMeta, ArticleReviewAction } from '../_lib/types';

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
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ArticleListView({
  articles,
  isLoading,
  hasFilter,
  isAdmin,
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
}: ArticleListViewProps) {
  return (
    <div id="articles-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
              {['', 'Bài viết', 'Danh mục', 'Tác giả', 'Thời gian', 'Trạng thái', 'Nổi bật', 'Thao tác'].map((header, index) => (
                <th key={header || index} className={`py-3.5 px-5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${index === 7 ? 'text-right' : ''}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-24 text-center">
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
                  isAdmin={isAdmin}
                  userId={userId}
                  isSubmitting={isSubmitting}
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
          itemLabel="bài viết"
        />
      </div>
    </div>
  );
}

function ArticleTableRow({
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
  const articleStatus = article.status ?? 'PUBLISHED';
  const staffCanManage = !isAdmin && (article.createdById == null || article.createdById === userId) && (articleStatus === 'DRAFT' || articleStatus === 'REJECTED');
  const canEditArticle = isAdmin || staffCanManage;

  return (
    <tr className="hover:bg-primary/[0.025] transition-colors group cursor-pointer" onClick={() => onOpenEdit(article)}>
      <td className="py-3.5 px-5" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-11 rounded-lg overflow-hidden bg-surface-container shrink-0">
          {article.imageUrl ? (
            <Image
              src={article.imageUrl}
              alt={article.title || 'Bản nháp bài viết'}
              width={64}
              height={44}
              sizes="64px"
              className="h-full w-full object-cover"
              loading="lazy"
              onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/64x44/e2e8f0/94a3b8?text=No+Img'; }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-outline">
              <span className="material-symbols-outlined text-[18px]">article</span>
            </div>
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
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">schedule</span>
          {article.readTime} phút · {fmtDate(article.publishedAt)}
        </span>
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

function ArticleStatusCell({ article }: { article: Article }) {
  const articleStatus = article.status ?? 'PUBLISHED';
  const statusConfig = getStatusCfg(articleStatus);
  const reviewNote = article.reviewNote;

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${statusConfig.cls}`}>
        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{statusConfig.icon}</span>
        {statusConfig.label}
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
  onSubmit,
  onDelete,
}: Omit<SharedArticleViewProps, 'articles' | 'isLoading' | 'hasFilter' | 'onCreate' | 'onReview'> & { article: Article }) {
  const categoryConfig = getCatCfg(article.category);
  const articleStatus = article.status ?? 'PUBLISHED';
  const staffCanManage = !isAdmin && (article.createdById == null || article.createdById === userId) && (articleStatus === 'DRAFT' || articleStatus === 'REJECTED');

  return (
    <article
      className="flex flex-col group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
      onClick={() => onOpenEdit(article)}
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
        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onOpenEdit(article)}
            aria-label="Chỉnh sửa"
            className="w-10 h-10 bg-white/90 backdrop-blur-sm text-primary rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
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
          {isAdmin && (
            <>
              <button
                onClick={() => onToggleFeatured(article)}
                aria-label="Toggle nổi bật"
                className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-md ${article.isFeatured ? 'bg-amber-400/90 text-white hover:bg-amber-400' : 'bg-white/90 text-amber-400 hover:bg-white'}`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </button>
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

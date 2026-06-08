'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Article } from './ArticleDrawer';
import type { ArticleReviewAction, ArticleStatus, SharedArticleViewProps } from '../_lib/types';
import { getCatCfg, getStatusCfg, fmtDate, getWorkflowHint } from '../_lib/helpers';

type ArticleTableRowProps = Omit<SharedArticleViewProps, 'articles' | 'isLoading' | 'hasFilter' | 'onCreate'> & {
  article: Article;
  isSelected: boolean;
  onToggleSelected: (articleId: number) => void;
};

export function ArticleTableRow({
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
}: ArticleTableRowProps) {
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
                onClick={() => onReview({ article, action: 'approve' as ArticleReviewAction })}
                className="hover:bg-emerald-500/10 hover:text-emerald-600"
                tooltipClassName="bg-emerald-700 text-white"
                arrowClassName="border-t-emerald-700"
              />
              <TooltipIconButton
                icon="cancel"
                label="Từ chối"
                onClick={() => onReview({ article, action: 'reject' as ArticleReviewAction })}
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
        {getWorkflowHint(articleStatus)}
      </span>
      {articleStatus === 'REJECTED' && reviewNote && (
        <p className="text-[10px] text-error font-medium max-w-[140px] leading-tight cursor-help" title={reviewNote}>
          ↳ {reviewNote.length > 50 ? reviewNote.slice(0, 50) + '…' : reviewNote}
        </p>
      )}
    </div>
  );
}

function TooltipIconButton({
  icon,
  label,
  onClick,
  className = '',
  tooltipClassName = 'bg-on-surface text-surface',
  arrowClassName = 'border-t-on-surface',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
  tooltipClassName?: string;
  arrowClassName?: string;
}) {
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

'use client';

import Image from 'next/image';
import type { Article } from './ArticleDrawer';
import type { ArticleStatus, SharedArticleViewProps } from '../_lib/types';
import { getCatCfg, getStatusCfg, getWorkflowHint } from '../_lib/helpers';

type ArticleGridCardProps = Omit<SharedArticleViewProps, 'articles' | 'isLoading' | 'hasFilter' | 'onCreate'> & {
  article: Article;
};

export function ArticleGridCard({
  article,
  isAdmin,
  userId,
  isSubmitting,
  onOpenEdit,
  onToggleFeatured,
  onReview,
  onSubmit,
  onDelete,
}: ArticleGridCardProps) {
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
        <p className="mt-2 text-[11px] font-medium text-on-surface-variant/70">{getWorkflowHint(articleStatus)}</p>
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

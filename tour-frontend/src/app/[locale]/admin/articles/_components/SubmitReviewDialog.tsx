'use client';

import { useEffect } from 'react';
import type { Article } from './ArticleDrawer';
import { getStatusCfg } from '../_lib/helpers';

export function SubmitReviewDialog({ article, onConfirm, onCancel, isSubmitting }: {
  article: Article;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSubmitting) onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isSubmitting, onCancel]);

  const title = article.title?.trim() || 'Bản nháp chưa có tiêu đề';
  const excerpt = article.excerpt?.trim() || 'Chưa có tóm tắt';
  const statusLabel = getStatusCfg(article.status ?? 'DRAFT').label;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="submit-review-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!isSubmitting) onCancel(); }} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl animate-fade-slide-up">
        <div className="border-b border-outline-variant/10 bg-amber-50/80 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>outgoing_mail</span>
            </div>
            <div className="min-w-0">
              <h3 id="submit-review-title" className="text-lg font-bold text-on-surface">Gửi bài viết để Admin duyệt?</h3>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                Sau khi gửi, bài viết sẽ chuyển sang trạng thái chờ duyệt và bạn sẽ chỉnh sửa tiếp khi Admin phản hồi.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-bold text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">edit_note</span>{statusLabel}
              </span>
              <span className="text-[11px] font-semibold text-on-surface-variant">{article.readTime || 1} phút đọc</span>
            </div>
            <p className="line-clamp-2 text-sm font-bold leading-snug text-on-surface">&ldquo;{title}&rdquo;</p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">{excerpt}</p>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-outline-variant/20 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {isSubmitting
              ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang gửi…</>
              : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>Xác nhận gửi</>}
          </button>
        </div>
      </div>
    </div>
  );
}

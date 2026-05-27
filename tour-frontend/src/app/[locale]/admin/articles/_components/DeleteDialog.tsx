'use client';

import { useEffect } from 'react';
import type { Article } from '@/components/admin/ArticleDrawer';

export function DeleteDialog({ article, onConfirm, onCancel, isDeleting }: {
  article: Article;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-slide-up">
        <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-error text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
        </div>
        <h3 className="text-lg font-bold text-on-surface text-center mb-2">Chuyển vào thùng rác?</h3>
        <p className="text-sm text-on-surface-variant text-center leading-relaxed mb-1">Bài viết sẽ bị ẩn khỏi trang khách hàng và có thể khôi phục sau</p>
        <p className="text-sm font-bold text-on-surface text-center mb-5 line-clamp-2">&ldquo;{article.title}&rdquo;</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors disabled:opacity-50 outline-none">
            Hủy bỏ
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-error text-on-error hover:bg-error/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-error">
            {isDeleting
              ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang chuyển…</>
              : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>Chuyển vào thùng rác</>}
          </button>
        </div>
      </div>
    </div>
  );
}

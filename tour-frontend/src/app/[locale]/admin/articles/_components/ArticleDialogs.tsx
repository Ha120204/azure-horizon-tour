'use client';

import Image from 'next/image';
import type { Article } from './ArticleDrawer';
import type { ArticleReviewAction, ArticleToastState, TrashArticle } from '../_lib/types';

interface ArticleReviewDialogProps {
  article: Article;
  action: ArticleReviewAction;
  rejectNote: string;
  isReviewing: boolean;
  onRejectNoteChange: (note: string) => void;
  onCancel: () => void;
  onConfirm: (action: ArticleReviewAction) => void;
}

export function ArticleReviewDialog({
  article,
  action,
  rejectNote,
  isReviewing,
  onRejectNoteChange,
  onCancel,
  onConfirm,
}: ArticleReviewDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-slide-up">
        {action === 'approve' ? (
          <>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-emerald-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface text-center mb-2">Duyệt bài viết?</h3>
            <p className="text-sm text-on-surface-variant text-center mb-1">Bài viết sẽ được đăng lên trang khách ngay lập tức.</p>
            <p className="text-sm font-bold text-on-surface text-center mb-6 line-clamp-2">“{article.title}”</p>
            <div className="flex gap-3">
              <button onClick={onCancel} disabled={isReviewing} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors disabled:opacity-50 outline-none">
                Hủy
              </button>
              <button onClick={() => onConfirm('approve')} disabled={isReviewing} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none">
                {isReviewing
                  ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang duyệt…</>
                  : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>Xác nhận duyệt</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-error text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface text-center mb-2">Từ chối bài viết?</h3>
            <p className="text-sm text-on-surface-variant text-center mb-4 line-clamp-2">“{article.title}”</p>
            <div className="mb-4">
              <label htmlFor="reject-note" className="block text-sm font-semibold text-on-surface mb-2">
                Lý do từ chối <span className="text-error">*</span>
              </label>
              <textarea
                id="reject-note"
                value={rejectNote}
                onChange={e => onRejectNoteChange(e.target.value)}
                placeholder="Nhập lý do để Staff biết cần chỉnh sửa gì…"
                rows={4}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-error outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={onCancel} disabled={isReviewing} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors disabled:opacity-50 outline-none">
                Hủy
              </button>
              <button onClick={() => onConfirm('reject')} disabled={isReviewing || !rejectNote.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-error text-on-error hover:bg-error/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 outline-none">
                {isReviewing
                  ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xử lý…</>
                  : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>Xác nhận từ chối</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ArticleTrashPanelProps {
  trashArticles: TrashArticle[];
  trashMeta: { totalItems: number; totalPages: number; currentPage: number };
  trashSearch: string;
  trashLoading: boolean;
  isRestoring: number | null;
  onClose: () => void;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onRestore: (id: number, title: string) => void;
  onHardDelete: (article: TrashArticle) => void;
}

export function ArticleTrashPanel({
  trashArticles,
  trashMeta,
  trashSearch,
  trashLoading,
  isRestoring,
  onClose,
  onSearchChange,
  onPageChange,
  onRestore,
  onHardDelete,
}: ArticleTrashPanelProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col bg-surface rounded-3xl shadow-2xl overflow-hidden animate-fade-slide-up">
        <div className="flex items-center gap-4 px-7 py-5 border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-on-surface">Thùng Rác</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{trashMeta.totalItems} bài viết đã xóa</p>
          </div>
          <div className="relative w-52">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base pointer-events-none">search</span>
            <input
              type="search"
              placeholder="Tìm bài viết..."
              value={trashSearch}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {trashLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
            </div>
          ) : trashArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <span className="material-symbols-outlined text-6xl text-outline-variant/50">delete_sweep</span>
              <p className="text-on-surface-variant font-medium">Thùng rác trống</p>
              <p className="text-sm text-on-surface-variant/60">Không có bài viết nào trong thùng rác</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/8">
              {trashArticles.map(article => (
                <div key={article.id} className="flex items-center gap-4 px-7 py-4 hover:bg-surface-container/50 transition-colors">
                  <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                    {article.imageUrl
                      ? <Image src={article.imageUrl} alt="" width={56} height={40} sizes="56px" className="h-full w-full object-cover opacity-60" />
                      : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-sm text-outline">image</span></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{article.title}</p>
                    <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                      {article.author} • Xóa {article.deletedAt ? new Date(article.deletedAt).toLocaleDateString('vi-VN') : ''}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/10 text-on-surface-variant font-medium shrink-0">
                    {article.status === 'DRAFT' ? 'Nháp' : article.status === 'REJECTED' ? 'Từ chối' : article.status === 'PENDING_REVIEW' ? 'Chờ duyệt' : 'Xuất bản'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRestore(article.id, article.title)}
                      disabled={isRestoring === article.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50 outline-none"
                    >
                      {isRestoring === article.id
                        ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-sm">restore_from_trash</span>}
                      Khôi phục
                    </button>
                    <button
                      onClick={() => onHardDelete(article)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors outline-none"
                    >
                      <span className="material-symbols-outlined text-sm">delete_forever</span>
                      Xóa vĩnh viễn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {trashMeta.totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between px-7 py-4 border-t border-outline-variant/10 bg-surface-container-lowest">
            <p className="text-xs text-on-surface-variant">{trashMeta.totalItems} bài viết</p>
            <div className="flex gap-2">
              {Array.from({ length: trashMeta.totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${page === trashMeta.currentPage ? 'bg-primary text-on-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ArticleHardDeleteDialogProps {
  article: TrashArticle;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ArticleHardDeleteDialog({ article, isDeleting, onCancel, onConfirm }: ArticleHardDeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-sm">Xóa vĩnh viễn?</h3>
            <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">&ldquo;{article.title}&rdquo;</p>
          </div>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          Hành động này <strong className="text-error">không thể hoàn tác</strong>. Bài viết sẽ bị xóa hoàn toàn khỏi hệ thống.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
            Hủy
          </button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl bg-error text-on-error text-sm font-bold hover:bg-error/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {isDeleting
              ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xóa…</>
              : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>Xác nhận xóa</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

interface ArticleToastProps {
  toast: ArticleToastState | null;
}

export function ArticleToast({ toast }: ArticleToastProps) {
  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.msg}</div>
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.ok ? 'bg-tertiary text-on-tertiary' : 'bg-error text-on-error'}`}
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            {toast.ok ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}
    </>
  );
}

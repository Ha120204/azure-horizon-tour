'use client';

import ArticleDrawer, { type Article } from '@/components/admin/ArticleDrawer';
import { ArticleHardDeleteDialog, ArticleReviewDialog, ArticleToast, ArticleTrashPanel } from './ArticleDialogs';
import { DeleteDialog } from './DeleteDialog';
import { SubmitReviewDialog } from './SubmitReviewDialog';
import type { ArticleMeta, ArticleReviewAction, ArticleToastState, TrashArticle } from '../_lib/types';

interface ArticleOverlaysProps {
  drawerMode: 'create' | 'edit' | null;
  editTarget: Article | null;
  userRole: string;
  onCloseDrawer: () => void;
  onDrawerSuccess: (message: string) => void;
  reviewTarget: { article: Article; action: ArticleReviewAction } | null;
  rejectNote: string;
  isReviewing: boolean;
  onRejectNoteChange: (note: string) => void;
  onCancelReview: () => void;
  onConfirmReview: (action: ArticleReviewAction) => void;
  submitTarget: Article | null;
  isSubmitting: number | null;
  onConfirmSubmit: (articleId: number) => void;
  onCancelSubmit: () => void;
  deleteTarget: Article | null;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  showTrash: boolean;
  isAdmin: boolean;
  trashArticles: TrashArticle[];
  trashMeta: ArticleMeta;
  trashSearch: string;
  trashLoading: boolean;
  isRestoring: number | null;
  onCloseTrash: () => void;
  onTrashSearchChange: (value: string) => void;
  onTrashPageChange: (page: number) => void;
  onRestore: (id: number, title: string) => void;
  onHardDelete: (article: TrashArticle) => void;
  hardDeleteTarget: TrashArticle | null;
  isHardDeleting: boolean;
  onCancelHardDelete: () => void;
  onConfirmHardDelete: () => void;
  toast: ArticleToastState | null;
}

export function ArticleOverlays({
  drawerMode,
  editTarget,
  userRole,
  onCloseDrawer,
  onDrawerSuccess,
  reviewTarget,
  rejectNote,
  isReviewing,
  onRejectNoteChange,
  onCancelReview,
  onConfirmReview,
  submitTarget,
  isSubmitting,
  onConfirmSubmit,
  onCancelSubmit,
  deleteTarget,
  isDeleting,
  onConfirmDelete,
  onCancelDelete,
  showTrash,
  isAdmin,
  trashArticles,
  trashMeta,
  trashSearch,
  trashLoading,
  isRestoring,
  onCloseTrash,
  onTrashSearchChange,
  onTrashPageChange,
  onRestore,
  onHardDelete,
  hardDeleteTarget,
  isHardDeleting,
  onCancelHardDelete,
  onConfirmHardDelete,
  toast,
}: ArticleOverlaysProps) {
  return (
    <>
      {drawerMode && (
        <ArticleDrawer
          mode={drawerMode}
          article={editTarget}
          userRole={userRole}
          onClose={onCloseDrawer}
          onSuccess={onDrawerSuccess}
        />
      )}

      {reviewTarget && (
        <ArticleReviewDialog
          article={reviewTarget.article}
          action={reviewTarget.action}
          rejectNote={rejectNote}
          isReviewing={isReviewing}
          onRejectNoteChange={onRejectNoteChange}
          onCancel={onCancelReview}
          onConfirm={onConfirmReview}
        />
      )}

      {submitTarget && (
        <SubmitReviewDialog
          article={submitTarget}
          onConfirm={() => onConfirmSubmit(submitTarget.id)}
          onCancel={onCancelSubmit}
          isSubmitting={isSubmitting === submitTarget.id}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          article={deleteTarget}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
          isDeleting={isDeleting}
        />
      )}

      {showTrash && isAdmin && (
        <ArticleTrashPanel
          trashArticles={trashArticles}
          trashMeta={trashMeta}
          trashSearch={trashSearch}
          trashLoading={trashLoading}
          isRestoring={isRestoring}
          onClose={onCloseTrash}
          onSearchChange={onTrashSearchChange}
          onPageChange={onTrashPageChange}
          onRestore={onRestore}
          onHardDelete={onHardDelete}
        />
      )}

      {hardDeleteTarget && (
        <ArticleHardDeleteDialog
          article={hardDeleteTarget}
          isDeleting={isHardDeleting}
          onCancel={onCancelHardDelete}
          onConfirm={onConfirmHardDelete}
        />
      )}

      <ArticleToast toast={toast} />
    </>
  );
}

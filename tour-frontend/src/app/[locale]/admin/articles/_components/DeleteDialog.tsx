'use client';

import Dialog from '@/components/ui/Dialog';
import type { Article } from './ArticleDrawer';

export function DeleteDialog({ article, onConfirm, onCancel, isDeleting }: {
  article: Article;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <Dialog
      open
      onClose={onCancel}
      variant="danger"
      icon="delete"
      title="Chuyển vào thùng rác?"
      description={
        <>
          <p>Bài viết sẽ bị ẩn khỏi trang khách hàng và có thể khôi phục sau.</p>
          <p className="mt-2 font-bold text-on-surface line-clamp-2">&ldquo;{article.title}&rdquo;</p>
        </>
      }
      confirmLabel="Chuyển vào thùng rác"
      onConfirm={onConfirm}
      loading={isDeleting}
    />
  );
}

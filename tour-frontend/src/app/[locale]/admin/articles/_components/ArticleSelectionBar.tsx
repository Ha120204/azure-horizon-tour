'use client';

import { useState } from 'react';
import type { Article } from './ArticleDrawer';
import type { ArticleBulkAction, ArticleBulkActionOptions } from '../_lib/types';

type ConfirmableBulkAction = Extract<ArticleBulkAction, 'publish' | 'draft'>;

interface ArticleSelectionBarProps {
  selectedArticles: Article[];
  selectedCount: number;
  isAdmin: boolean;
  canWrite: boolean;
  userId: number | null;
  isLoading: boolean;
  onClear: () => void;
  onBulkAction: (action: ArticleBulkAction, options?: ArticleBulkActionOptions) => void;
}

export function ArticleSelectionBar({
  selectedArticles,
  selectedCount,
  isAdmin,
  canWrite,
  userId,
  isLoading,
  onClear,
  onBulkAction,
}: ArticleSelectionBarProps) {
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
            {canWrite ? (
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

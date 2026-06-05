'use client';

import type { ArticleStats, ArticleStatus } from '../_lib/types';

interface ArticleWorkflowBannersProps {
  isAdmin: boolean;
  stats: ArticleStats;
  onViewStatus: (status: ArticleStatus) => void;
  onCreate: () => void;
}

export function ArticleWorkflowBanners({
  isAdmin,
  stats,
  onViewStatus,
  onCreate,
}: ArticleWorkflowBannersProps) {
  const primaryCount = isAdmin ? stats.pending : stats.rejected || stats.draft;
  const primaryStatus: ArticleStatus = isAdmin ? 'PENDING_REVIEW' : stats.rejected > 0 ? 'REJECTED' : 'DRAFT';
  const showPrimary = primaryCount > 0;

  if (!showPrimary) return null;

  return (
    <section className="mb-5" aria-label="Luồng xử lý bài viết">
      <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`} aria-hidden="true">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isAdmin ? 'rule_settings' : 'assignment_late'}
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface">
                {isAdmin
                  ? `Có ${stats.pending} bài viết đang chờ duyệt`
                  : stats.rejected > 0
                    ? `Có ${stats.rejected} bài viết cần chỉnh sửa`
                    : `Bạn có ${stats.draft} bản nháp chưa gửi duyệt`}
              </p>
              <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-on-surface-variant">
                {isAdmin
                  ? 'Mở danh sách chờ duyệt để kiểm tra nội dung, xuất bản bài đạt yêu cầu hoặc trả về kèm lý do rõ ràng.'
                  : stats.rejected > 0
                    ? 'Xem ghi chú từ Admin, chỉnh sửa nội dung rồi gửi duyệt lại để tiếp tục quy trình.'
                    : 'Bản nháp chưa public. Khi đủ tiêu đề, ảnh bìa, tóm tắt và nội dung, hãy gửi Admin duyệt.'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:justify-end">
            {!isAdmin && stats.draft === 0 && (
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-outline-variant/20 bg-surface px-3 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary outline-none"
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">post_add</span>
                Tạo nháp
              </button>
            )}
            <button
              type="button"
              onClick={() => onViewStatus(primaryStatus)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
              Xem ngay
            </button>
          </div>
        </div>
    </section>
  );
}

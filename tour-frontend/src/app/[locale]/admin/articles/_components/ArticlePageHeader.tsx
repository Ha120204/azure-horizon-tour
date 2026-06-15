'use client';

import type { ArticleViewMode } from '../_lib/types';

interface ArticlePageHeaderProps {
  viewMode: ArticleViewMode;
  isAdmin: boolean;
  canWrite: boolean;
  showTrash: boolean;
  trashCount: number;
  onViewModeChange: (mode: ArticleViewMode) => void;
  onRefresh: () => void;
  onToggleTrash: () => void;
  onCreate: () => void;
}

export function ArticlePageHeader({
  viewMode,
  isAdmin,
  canWrite,
  showTrash,
  trashCount,
  onViewModeChange,
  onRefresh,
  onToggleTrash,
  onCreate,
}: ArticlePageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
      <div>
        <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface">Quản Lý Bài Viết</h1>
        <p className="text-on-surface-variant text-sm mt-1">Tạo và quản lý các bài viết, hướng dẫn du lịch cho khách hàng.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant/10">
          {(['list', 'grid'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              aria-label={mode === 'list' ? 'Xem dạng danh sách' : 'Xem dạng lưới'}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all outline-none ${viewMode === mode ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: viewMode === mode ? "'FILL' 1" : "'FILL' 0" }}>
                {mode === 'list' ? 'view_list' : 'grid_view'}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors outline-none"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>Làm mới
        </button>
        {canWrite && (
          <button
            onClick={onToggleTrash}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors outline-none ${
              showTrash
                ? 'bg-red-50 border-red-300 text-red-600'
                : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Thùng rác
            {trashCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {trashCount}
              </span>
            )}
          </button>
        )}
        {(canWrite || !isAdmin) && (
          <button
            id="create-article-btn"
            onClick={onCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined text-[18px]">post_add</span>{isAdmin ? 'Thêm bài viết' : 'Tạo bản nháp'}
          </button>
        )}
      </div>
    </div>
  );
}

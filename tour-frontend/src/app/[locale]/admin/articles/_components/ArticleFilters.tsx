'use client';

import type { ArticleMeta } from '../_lib/types';

interface ArticleFiltersProps {
  search: string;
  categoryFilter: string;
  featuredFilter: string;
  statusFilter: string;
  hasFilter: boolean;
  isAdmin: boolean;
  userRole: string;
  isLoading: boolean;
  meta: ArticleMeta;
  topCategory?: { label: string; icon: string; color: string; count: number } | null;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onFeaturedChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onResetFilters: () => void;
}

export function ArticleFilters({
  search,
  categoryFilter,
  featuredFilter,
  statusFilter,
  hasFilter,
  isAdmin,
  userRole,
  isLoading,
  meta,
  topCategory,
  onSearchChange,
  onCategoryChange,
  onFeaturedChange,
  onStatusChange,
  onResetFilters,
}: ArticleFiltersProps) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-4 mb-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">search</span>
          <label htmlFor="art-search" className="sr-only">Tìm kiếm bài viết</label>
          <input
            id="art-search"
            type="search"
            placeholder="Tìm tiêu đề, tác giả…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
          />
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <label htmlFor="art-cat" className="sr-only">Lọc danh mục</label>
          <select
            id="art-cat"
            value={categoryFilter}
            onChange={e => onCategoryChange(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          >
            <option value="">Tất cả danh mục</option>
            <option value="GUIDES">Hướng dẫn</option>
            <option value="INSPIRATION">Cảm hứng</option>
            <option value="CULTURE">Văn hóa</option>
            <option value="GASTRONOMY">Ẩm thực</option>
          </select>

          <label htmlFor="art-feat" className="sr-only">Lọc nổi bật</label>
          <select
            id="art-feat"
            value={featuredFilter}
            onChange={e => onFeaturedChange(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          >
            <option value="">Tất cả</option>
            <option value="true">⭐ Bài nổi bật</option>
            <option value="false">Bài thường</option>
          </select>

          {(isAdmin || userRole === 'STAFF') && (
            <>
              <label htmlFor="art-status" className="sr-only">Lọc trạng thái</label>
              <select
                id="art-status"
                value={statusFilter}
                onChange={e => onStatusChange(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="DRAFT">Nháp</option>
                <option value="PENDING_REVIEW">Chờ duyệt</option>
                <option value="PUBLISHED">Đã duyệt</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </>
          )}

          {hasFilter && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-error border border-error/30 hover:bg-error/5 transition-colors outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>Xóa bộ lọc
            </button>
          )}
        </div>
        {!isLoading && (
          <div className="ml-auto flex items-center gap-3 pl-2 text-xs text-on-surface-variant whitespace-nowrap">
            {topCategory && (
              <span className="hidden xl:inline-flex items-center gap-1.5">
                <span className={`material-symbols-outlined text-[15px] ${topCategory.color}`}>{topCategory.icon}</span>
                {topCategory.label}: {topCategory.count}
              </span>
            )}
            <span className="font-medium">
              Trang {meta.currentPage}/{meta.totalPages} · {meta.totalItems} bài viết
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

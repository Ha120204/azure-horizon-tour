'use client';

import { useEffect, useRef, useState } from 'react';
import { CATEGORY_CFG, STATUS_CFG } from '../_lib/config';
import type { ArticleMeta, ArticleStatus } from '../_lib/types';

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
  const categoryOptions = [
    { value: '', label: 'Tất cả danh mục', icon: 'category' },
    ...Object.entries(CATEGORY_CFG).map(([value, config]) => ({
      value,
      label: config.label,
      icon: config.icon,
      iconClassName: config.color,
    })),
  ];
  const featuredOptions = [
    { value: '', label: 'Tất cả', icon: 'select_all' },
    { value: 'true', label: 'Bài nổi bật', icon: 'star', iconClassName: 'text-amber-500' },
    { value: 'false', label: 'Bài thường', icon: 'star_outline' },
  ];
  const statusOptions = [
    { value: '', label: 'Tất cả trạng thái', icon: 'flag' },
    ...Object.entries(STATUS_CFG).map(([value, config]) => ({
      value,
      label: config.label,
      icon: config.icon,
    })),
  ];

  const filterChips = [
    search.trim() ? { icon: 'search', label: `Từ khóa: ${search.trim()}` } : null,
    categoryFilter ? { icon: CATEGORY_CFG[categoryFilter]?.icon ?? 'category', label: `Danh mục: ${CATEGORY_CFG[categoryFilter]?.label ?? categoryFilter}` } : null,
    featuredFilter ? { icon: featuredFilter === 'true' ? 'star' : 'star_outline', label: featuredFilter === 'true' ? 'Bài nổi bật' : 'Bài thường' } : null,
    statusFilter ? { icon: STATUS_CFG[statusFilter as ArticleStatus]?.icon ?? 'flag', label: `Trạng thái: ${STATUS_CFG[statusFilter as ArticleStatus]?.label ?? statusFilter}` } : null,
  ].filter((chip): chip is { icon: string; label: string } => Boolean(chip));

  const resultLabel = hasFilter
    ? `${meta.totalItems} kết quả phù hợp`
    : `${meta.totalItems} bài viết`;

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-4 mb-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">search</span>
          <label htmlFor="art-search" className="sr-only">Tìm kiếm bài viết</label>
          <input
            id="art-search"
            type="search"
            placeholder="Tìm tiêu đề, tác giả..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
          />
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <FilterDropdown
            id="art-cat"
            label="Lọc danh mục"
            value={categoryFilter}
            options={categoryOptions}
            onChange={onCategoryChange}
            active={Boolean(categoryFilter)}
            className="min-w-[168px]"
          />

          <FilterDropdown
            id="art-feat"
            label="Lọc nổi bật"
            value={featuredFilter}
            options={featuredOptions}
            onChange={onFeaturedChange}
            active={Boolean(featuredFilter)}
            className="min-w-[150px]"
          />

          {(isAdmin || userRole === 'STAFF') && (
            <FilterDropdown
              id="art-status"
              label="Lọc trạng thái"
              value={statusFilter}
              options={statusOptions}
              onChange={onStatusChange}
              active={Boolean(statusFilter)}
              className="min-w-[168px]"
            />
          )}

          {hasFilter && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-error border border-error/30 hover:bg-error/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-error/40"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-outline-variant/10 pt-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {filterChips.length > 0 ? (
            <>
              <span className="text-xs font-semibold text-on-surface-variant">Đang lọc</span>
              {filterChips.map(chip => (
                <span key={chip.label} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{chip.icon}</span>
                  <span className="truncate">{chip.label}</span>
                </span>
              ))}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">select_all</span>
              Đang xem toàn bộ bài viết
            </span>
          )}
        </div>

        {!isLoading && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant lg:justify-end">
            {topCategory && !categoryFilter && (
              <span className="hidden xl:inline-flex items-center gap-1.5">
                <span className={`material-symbols-outlined text-[15px] ${topCategory.color}`}>{topCategory.icon}</span>
                Danh mục nhiều nhất: {topCategory.label} ({topCategory.count})
              </span>
            )}
            <span className="font-semibold text-on-surface">
              {resultLabel}
            </span>
            <span className="font-medium">
              Trang {meta.currentPage}/{meta.totalPages}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

type FilterOption = {
  value: string;
  label: string;
  icon?: string;
  iconClassName?: string;
};

function FilterDropdown({
  id,
  label,
  value,
  options,
  onChange,
  active,
  className = '',
}: {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  active: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen(open => !open)}
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-xl border bg-surface-container-low px-4 text-sm text-on-surface shadow-[0_1px_0_rgba(15,23,42,0.02)] outline-none transition-colors hover:border-primary/35 hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary ${
          active ? 'border-primary/55 ring-1 ring-primary/15' : 'border-outline-variant/15'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption.icon ? (
            <span className={`material-symbols-outlined text-[16px] ${selectedOption.iconClassName ?? 'text-on-surface-variant'}`} aria-hidden="true">
              {selectedOption.icon}
            </span>
          ) : null}
          <span className="truncate">{selectedOption.label}</span>
        </span>
        <span
          className={`material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 top-full z-40 mt-2 max-h-72 w-full min-w-[190px] overflow-y-auto rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-1.5 shadow-xl shadow-black/10"
        >
          {options.map(option => {
            const selected = option.value === value;
            return (
              <button
                key={option.value || 'all'}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                  selected
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface hover:bg-primary/[0.055]'
                }`}
              >
                {option.icon ? (
                  <span className={`material-symbols-outlined text-[16px] ${selected ? 'text-on-primary' : option.iconClassName ?? 'text-on-surface-variant'}`} aria-hidden="true">
                    {option.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {selected ? (
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

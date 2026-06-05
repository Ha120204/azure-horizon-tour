'use client';

import { useState } from 'react';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZES = [10, 20, 50];

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page += 1) pages.push(page);

  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export default function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'mục',
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: AdminPaginationProps) {
  const [jumpValue, setJumpValue] = useState('');

  const safeTotalPages = Math.max(totalPages || 1, 1);
  const safeCurrentPage = clampPage(currentPage || 1, safeTotalPages);
  const from = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const to = Math.min(safeCurrentPage * pageSize, totalItems);
  const pageNums = generatePageNumbers(safeCurrentPage, safeTotalPages);
  const pageSizeChoices = [...new Set([...pageSizeOptions, pageSize])].sort((a, b) => a - b);
  const progress = safeTotalPages > 1 ? Math.round((safeCurrentPage / safeTotalPages) * 100) : 100;

  const goToPage = (page: number) => {
    const nextPage = clampPage(page, safeTotalPages);
    if (nextPage !== safeCurrentPage) onPageChange(nextPage);
  };

  const submitJump = () => {
    const page = Number.parseInt(jumpValue, 10);
    if (!Number.isNaN(page)) goToPage(page);
    setJumpValue('');
  };

  return (
    <nav className="space-y-3" aria-label={`Phân trang ${itemLabel}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
          <label className="inline-flex items-center gap-2">
            <span className="font-medium">Dòng mỗi trang</span>
            <select
              value={pageSize}
              onChange={event => onPageSizeChange(Number(event.target.value))}
              className="h-9 rounded-lg border border-outline-variant/20 bg-surface px-2.5 text-sm font-semibold text-on-surface outline-none transition-colors hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Chọn số dòng mỗi trang"
            >
              {pageSizeChoices.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>

          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">table_rows</span>
            {totalItems === 0 ? (
              <span>Không có dữ liệu</span>
            ) : (
              <span>
                Hiển thị <strong className="tabular-nums text-on-surface">{from}-{to}</strong>
                {' '}trong <strong className="tabular-nums text-primary">{totalItems.toLocaleString('vi-VN')}</strong>
                {' '}{itemLabel}
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">auto_stories</span>
            Trang <span className="tabular-nums text-on-surface">{safeCurrentPage}</span>/<span className="tabular-nums">{safeTotalPages}</span>
          </span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {safeTotalPages > 1 && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <PaginationButton
              icon="first_page"
              label="Trang đầu"
              disabled={safeCurrentPage <= 1}
              onClick={() => goToPage(1)}
            />
            <PaginationButton
              icon="chevron_left"
              label="Trước"
              disabled={safeCurrentPage <= 1}
              onClick={() => goToPage(safeCurrentPage - 1)}
              showLabel
            />

            <div className="flex items-center gap-1">
              {pageNums.map((page, index) => page === '...' ? (
                <span key={`dots-${index}`} className="flex h-9 w-9 items-center justify-center text-sm text-on-surface-variant/60">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  aria-current={page === safeCurrentPage ? 'page' : undefined}
                  className={`h-9 min-w-9 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none ${
                    page === safeCurrentPage
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'border border-outline-variant/20 bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                  aria-label={`Trang ${page}`}
                >
                  {page}
                </button>
              ))}
            </div>

            <PaginationButton
              icon="chevron_right"
              label="Sau"
              disabled={safeCurrentPage >= safeTotalPages}
              onClick={() => goToPage(safeCurrentPage + 1)}
              showLabel
            />
            <PaginationButton
              icon="last_page"
              label="Trang cuối"
              disabled={safeCurrentPage >= safeTotalPages}
              onClick={() => goToPage(safeTotalPages)}
            />
          </div>

          {safeTotalPages > 5 && (
            <form
              className="flex items-center gap-2 text-sm text-on-surface-variant"
              onSubmit={event => {
                event.preventDefault();
                submitJump();
              }}
            >
              <label htmlFor="admin-page-jump" className="font-medium">Đến trang</label>
              <input
                id="admin-page-jump"
                type="number"
                min={1}
                max={safeTotalPages}
                value={jumpValue}
                onChange={event => setJumpValue(event.target.value)}
                placeholder={String(safeCurrentPage)}
                className="h-9 w-16 rounded-lg border border-outline-variant/20 bg-surface text-center text-sm font-semibold text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary outline-none"
              >
                Đi
              </button>
            </form>
          )}
        </div>
      )}
    </nav>
  );
}

function PaginationButton({
  icon,
  label,
  disabled,
  showLabel = false,
  onClick,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  showLabel?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-outline-variant/20 bg-surface px-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary outline-none ${showLabel ? 'min-w-[82px]' : 'w-9'}`}
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{icon}</span>
      {showLabel && <span>{label}</span>}
    </button>
  );
}

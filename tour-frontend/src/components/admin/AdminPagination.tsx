'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
          <div className="flex flex-col items-start gap-2 text-sm text-on-surface-variant min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center min-[420px]:gap-3">
          <div className="inline-flex items-center gap-2">
            <span className="font-medium">Dòng mỗi trang</span>
            <PageSizeSelect
              value={pageSize}
              options={pageSizeChoices}
              onChange={onPageSizeChange}
            />
          </div>

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

          <div className="flex items-center justify-between gap-3 text-xs text-on-surface-variant lg:justify-start">
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
          <div className="flex items-center justify-between gap-1.5 sm:justify-start">
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

            <div className="hidden items-center gap-1 sm:flex">
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

function PageSizeSelect({
  value,
  options,
  onChange,
}: {
  value: number;
  options: number[];
  onChange: (size: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const positionMenu = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMenuStyle({
      left: rect.left,
      top: rect.bottom + 8,
      width: Math.max(rect.width, 64),
    });
  }, []);

  const openMenu = () => {
    positionMenu();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleReposition = () => positionMenu();

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, positionMenu]);

  return (
    <div ref={selectRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Chọn số dòng mỗi trang"
        onClick={() => {
          if (isOpen) setIsOpen(false);
          else openMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openMenu();
          }
        }}
        className={`flex h-9 min-w-[64px] items-center justify-between gap-2 rounded-lg border bg-surface px-3 text-left text-sm font-bold text-on-surface shadow-sm outline-none transition-all hover:border-primary/35 hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary ${
          isOpen ? 'border-primary/45 bg-primary/5 ring-2 ring-primary/15' : 'border-outline-variant/20'
        }`}
      >
        <span className="tabular-nums">{value}</span>
        <span
          className={`material-symbols-outlined shrink-0 text-[17px] text-outline transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {isOpen && menuStyle && (
        <div
          role="listbox"
          style={{ left: menuStyle.left, top: menuStyle.top, width: menuStyle.width }}
          className="fixed z-[120] overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1 shadow-xl shadow-slate-900/10"
        >
          {options.map(size => {
            const selected = size === value;
            return (
              <button
                key={size}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  if (!selected) onChange(size);
                  setIsOpen(false);
                }}
                className={`flex h-8 w-full items-center justify-center rounded-lg px-2 text-sm font-bold tabular-nums transition-colors ${
                  selected
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-outline-variant/20 bg-surface px-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary outline-none ${showLabel ? 'min-w-9 min-[380px]:min-w-[82px]' : 'hidden w-9 sm:inline-flex'}`}
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{icon}</span>
      {showLabel && <span className="hidden min-[380px]:inline">{label}</span>}
    </button>
  );
}

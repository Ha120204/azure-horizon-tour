'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Meta, VoucherKpiItem, VoucherStatusFilter } from '../_lib/types';

const filterTypeLabels: Record<string, string> = {
  PERCENTAGE: 'Phần trăm',
  FIXED_AMOUNT: 'Số tiền cố định',
};

const filterStatusLabels: Record<VoucherStatusFilter, string> = {
  active: 'Đang hoạt động',
  expiringSoon: 'Sắp hết hạn 7 ngày',
  expiredThisMonth: 'Hết hạn tháng này',
  redeemed: 'Đã từng được dùng',
  scheduled: 'Chưa bắt đầu',

  expired: 'Đã hết hạn',
  depleted: 'Hết lượt dùng',
  inactive: 'Đã vô hiệu hóa',
};

const filterTypeOptions = [
  { value: '', label: 'Tất cả loại' },
  { value: 'PERCENTAGE', label: 'Phần trăm (%)' },
  { value: 'FIXED_AMOUNT', label: 'Số tiền cố định (đ)' },
];

const filterStatusOptions: Array<{ value: VoucherStatusFilter | ''; label: string }> = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'scheduled', label: 'Chưa bắt đầu' },
  { value: 'expiringSoon', label: 'Sắp hết hạn 7 ngày' },
  { value: 'expiredThisMonth', label: 'Hết hạn tháng này' },
  { value: 'redeemed', label: 'Đã từng được dùng' },
  { value: 'expired', label: 'Đã hết hạn' },
  { value: 'depleted', label: 'Hết lượt dùng' },
  { value: 'inactive', label: 'Đã vô hiệu hóa' },
];

interface VoucherPageHeaderProps {
  currentUserRole: string | null;
  onCreate: () => void;
}

export function VoucherPageHeader({ currentUserRole, onCreate }: VoucherPageHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
      <div>
        <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface">
          Quản Lý Voucher
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Theo dõi lượt sử dụng, trạng thái và hiệu quả của từng chiến dịch mã giảm giá.
        </p>
      </div>
      {currentUserRole !== null && currentUserRole !== 'STAFF' && (
        <button
          id="btn-create-voucher"
          onClick={onCreate}
          aria-label="Tạo voucher mới"
          className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md hover:opacity-90 transition-[box-shadow,opacity,transform] active:scale-[0.98] flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
          Tạo Voucher Mới
        </button>
      )}
    </div>
  );
}

export function VoucherKpiGrid({ kpis }: { kpis: VoucherKpiItem[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
      {kpis.map((kpi) => {
        const content = (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                <span className="material-symbols-outlined text-xl" aria-hidden="true">{kpi.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-on-surface-variant font-medium truncate">{kpi.label}</p>
                <p className="text-xl font-bold text-on-surface leading-tight mt-0.5 truncate">{kpi.value}</p>
              </div>
              <span
                className={`material-symbols-outlined text-[18px] ${kpi.active ? 'text-primary' : kpi.onClick ? 'text-on-surface-variant/50' : 'text-on-surface-variant/35'}`}
                aria-hidden="true"
              >
                {kpi.onClick ? (kpi.active ? 'filter_alt_off' : 'filter_alt') : 'monitoring'}
              </span>
            </div>
            {kpi.hint && (
              <p className={`text-[11px] font-medium leading-4 ${kpi.active ? 'text-primary' : 'text-on-surface-variant'}`}>
                {kpi.active ? 'Đang lọc theo chỉ số này' : kpi.hint}
              </p>
            )}
          </div>
        );

        return kpi.onClick ? (
          <button
            key={kpi.label}
            type="button"
            onClick={kpi.onClick}
            aria-pressed={kpi.active}
            className={`bg-surface-container-lowest rounded-2xl p-5 border shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-[box-shadow,transform,border-color] active:scale-[0.99] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary ${kpi.active ? 'border-primary/50 ring-2 ring-primary/15' : 'border-outline-variant/10'}`}
          >
            {content}
          </button>
        ) : (
          <div
            key={kpi.label}
            className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm text-left"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

interface VoucherFiltersProps {
  search: string;
  filterType: string;
  filterStatus: VoucherStatusFilter | '';
  meta: Meta;
  isLoadingList: boolean;
  hasFilter: boolean;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: VoucherStatusFilter | '') => void;
  onClearFilters: () => void;
}

export function VoucherFilters({
  search,
  filterType,
  filterStatus,
  meta,
  isLoadingList,
  hasFilter,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onClearFilters,
}: VoucherFiltersProps) {
  const filterChips = [
    ...(search.trim()
      ? [{ icon: 'search', label: `Từ khóa: ${search.trim()}`, onRemove: () => onSearchChange('') }]
      : []),
    ...(filterType
      ? [{ icon: 'category', label: `Loại: ${filterTypeLabels[filterType] ?? filterType}`, onRemove: () => onTypeChange('') }]
      : []),
    ...(filterStatus
      ? [{ icon: 'flag', label: `Trạng thái: ${filterStatusLabels[filterStatus]}`, onRemove: () => onStatusChange('') }]
      : []),
  ];

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 border border-outline-variant/10 shadow-sm">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none" aria-hidden="true">search</span>
          <label htmlFor="search-vouchers" className="sr-only">Tìm kiếm voucher</label>
          <input
            id="search-vouchers"
            type="search"
            autoComplete="off"
            placeholder="Tìm theo mã hoặc tên chiến dịch…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <FilterDropdown
            id="filter-type"
            label="Lọc theo loại"
            value={filterType}
            options={filterTypeOptions}
            onChange={onTypeChange}
            minWidthClassName="min-w-[176px]"
          />

          <FilterDropdown
            id="filter-status"
            label="Lọc theo trạng thái"
            value={filterStatus}
            options={filterStatusOptions}
            onChange={(value) => onStatusChange(value as VoucherStatusFilter | '')}
            minWidthClassName="min-w-[196px]"
          />
        </div>

        {hasFilter && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">filter_alt_off</span>
            Xóa bộ lọc
          </button>
        )}
        {!isLoadingList && (
          <span className="text-xs text-on-surface-variant ml-auto">
            {meta.totalItems} voucher
          </span>
        )}
      </div>

      {filterChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-variant/10 pt-3">
          <span className="text-xs font-bold text-on-surface-variant">Bộ lọc đang áp dụng:</span>
          {filterChips.map((chip) => (
            <span key={chip.label} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-primary/15">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{chip.icon}</span>
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Bỏ ${chip.label}`}
                className="-mr-1 rounded p-0.5 text-primary/70 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary outline-none"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterDropdownProps {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  minWidthClassName?: string;
}

function FilterDropdown({
  id,
  label,
  value,
  options,
  onChange,
  minWidthClassName = 'min-w-[176px]',
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const buttonId = `${id}-${generatedId}`;
  const listboxId = `${buttonId}-listbox`;
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative ${minWidthClassName}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setIsOpen(false);
      }}
    >
      <label id={`${buttonId}-label`} htmlFor={buttonId} className="sr-only">
        {label}
      </label>
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={`${buttonId}-label ${buttonId}`}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-surface-container-low px-4 text-sm font-medium text-on-surface shadow-sm outline-none transition-[border-color,box-shadow,background-color] hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary ${
          isOpen ? 'border-primary ring-2 ring-primary/15' : 'border-outline-variant/15'
        }`}
      >
        <span className="truncate">{selectedOption.label}</span>
        <span
          className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-40 mt-2 w-full overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-1 shadow-xl shadow-slate-900/12">
          <div id={listboxId} role="listbox" aria-labelledby={`${buttonId}-label`} className="max-h-72 overflow-y-auto">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value || 'all'}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                    selected
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {selected && (
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

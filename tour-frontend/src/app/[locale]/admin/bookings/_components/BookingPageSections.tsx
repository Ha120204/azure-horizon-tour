'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { CONFIRMED_SOURCE_LABEL, PAY_CFG, PAYMENT_METHOD_CFG, STATUS_CFG } from '../_lib/config';
import { fmt, fmtCompact } from '../_lib/helpers';
import type { Booking, BookingSavedViewKey, PaymentStats, Stats } from '../_lib/types';

type BookingFilterSelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
};

function BookingFilterSelect({
  value,
  options,
  onChange,
  ariaLabel,
  active = false,
  className = '',
}: {
  value: string;
  options: BookingFilterSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  active?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => setIsOpen(open => !open)}
        onKeyDown={event => {
          if (event.key === 'Escape') setIsOpen(false);
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary ${
          active
            ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
            : 'border-outline-variant/15 bg-surface-container-low text-on-surface hover:border-outline-variant/30'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selectedOption?.icon && (
            <span className="material-symbols-outlined text-[17px] text-primary" aria-hidden="true">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate">{selectedOption?.label ?? options[0]?.label ?? 'Chọn...'}</span>
        </span>
        <span className={`material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-[95] mt-2 min-w-[280px] overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-1.5 shadow-2xl shadow-slate-900/12"
        >
          <div className="max-h-72 overflow-y-auto">
            {options.map(option => {
              const selected = option.value === value;
              return (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span className={`material-symbols-outlined mt-0.5 text-[18px] ${selected ? 'text-primary' : 'text-on-surface-variant/70'}`} aria-hidden="true">
                    {option.icon ?? (selected ? 'check_circle' : 'radio_button_unchecked')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-normal break-words text-sm font-bold leading-5">{option.label}</span>
                    {option.description && (
                      <span className={`mt-0.5 block text-xs font-semibold ${selected ? 'text-primary/70' : 'text-on-surface-variant'}`}>
                        {option.description}
                      </span>
                    )}
                  </span>
                  {selected && <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">done</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_FILTER_OPTIONS: BookingFilterSelectOption[] = [
  { value: '', label: 'Tất cả trạng thái', description: 'Không giới hạn trạng thái đơn', icon: 'filter_list' },
  { value: 'PENDING', label: STATUS_CFG.PENDING.label, description: 'Đơn mới, cần xử lý', icon: STATUS_CFG.PENDING.icon },
  { value: 'CONFIRMED', label: STATUS_CFG.CONFIRMED.label, description: 'Đơn đã xác nhận thành công', icon: STATUS_CFG.CONFIRMED.icon },
  { value: 'CANCEL_REQUESTED', label: STATUS_CFG.CANCEL_REQUESTED.label, description: 'Khách đã gửi yêu cầu hủy', icon: STATUS_CFG.CANCEL_REQUESTED.icon },
  { value: 'CANCELLED', label: STATUS_CFG.CANCELLED.label, description: 'Đơn đã hủy hoặc quá hạn', icon: STATUS_CFG.CANCELLED.icon },
];

const PAYMENT_FILTER_OPTIONS: BookingFilterSelectOption[] = [
  { value: '', label: 'Tất cả thanh toán', description: 'Không giới hạn trạng thái thanh toán', icon: 'payments' },
  { value: 'PAID', label: PAY_CFG.PAID.label, description: 'Đã ghi nhận đủ tiền', icon: PAY_CFG.PAID.icon },
  { value: 'UNPAID', label: PAY_CFG.UNPAID.label, description: 'Chưa hoàn tất thanh toán', icon: PAY_CFG.UNPAID.icon },
  { value: 'PROCESSING', label: PAY_CFG.PROCESSING.label, description: 'Đang xử lý hoặc cần đồng bộ', icon: PAY_CFG.PROCESSING.icon },
  { value: 'FAILED', label: PAY_CFG.FAILED.label, description: 'Giao dịch lỗi hoặc thất bại', icon: PAY_CFG.FAILED.icon },
];

const PAYMENT_METHOD_FILTER_OPTIONS: BookingFilterSelectOption[] = [
  { value: '', label: 'Tất cả phương thức', description: 'Không giới hạn phương thức thanh toán', icon: 'account_balance_wallet' },
  { value: 'PAYOS', label: PAYMENT_METHOD_CFG.PAYOS.label, description: 'Thanh toán qua cổng PayOS', icon: PAYMENT_METHOD_CFG.PAYOS.icon },
  { value: 'IN_STORE', label: PAYMENT_METHOD_CFG.IN_STORE.label, description: 'Thanh toán tại quầy hoặc thủ công', icon: PAYMENT_METHOD_CFG.IN_STORE.icon },
];

interface BookingPageHeaderProps {
  hasFreshData: boolean;
  lastSyncedAt: Date | null;
  isExporting: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export function BookingPageHeader({
  hasFreshData,
  lastSyncedAt,
  isExporting,
  onRefresh,
  onExport,
}: BookingPageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
      <div>
        <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface" style={{ textWrap: 'balance' } as React.CSSProperties}>
          Quản Lý Đặt Tour
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Theo dõi toàn bộ đơn đặt tour, thanh toán và trạng thái xử lý.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {hasFreshData && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="material-symbols-outlined text-[18px]">fiber_new</span>
            Có dữ liệu mới
          </button>
        )}
        {lastSyncedAt && !hasFreshData && (
          <span className="hidden xl:inline text-xs font-medium text-on-surface-variant">
            Cập nhật {lastSyncedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          id="export-bookings-btn"
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {isExporting ? (
            <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Đang xuất…</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]">table_view</span>Xuất Excel</>
          )}
        </button>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Làm mới
        </button>
      </div>
    </div>
  );
}

interface BookingKpiGridProps {
  stats: Stats;
  statusFilter: string;
  paymentFilter: string;
  onFilterStatus: (status: Booking['status']) => void;
  onFilterPayment: (paymentStatus: Booking['paymentStatus']) => void;
}

export function BookingKpiGrid({
  stats,
  statusFilter,
  paymentFilter,
  onFilterStatus,
  onFilterPayment,
}: BookingKpiGridProps) {
  const kpis = [
    {
      icon: 'payments', label: 'Tổng doanh thu',
      value: fmtCompact(stats.totalRevenue),
      sub: `${stats.paidCount} đơn đã thanh toán`,
      bg: 'bg-blue-50', ic: 'text-blue-600',
      onClick: () => onFilterPayment('PAID'), active: paymentFilter === 'PAID',
    },
    {
      icon: 'check_circle', label: 'Đã xác nhận',
      value: stats.confirmed.toLocaleString('vi-VN'),
      sub: 'đơn thành công',
      bg: 'bg-emerald-50', ic: 'text-emerald-600',
      onClick: () => onFilterStatus('CONFIRMED'), active: statusFilter === 'CONFIRMED',
    },
    {
      icon: 'schedule', label: 'Chờ xử lý',
      value: stats.pending.toLocaleString('vi-VN'),
      sub: 'đơn cần xử lý',
      bg: 'bg-amber-50', ic: 'text-amber-600',
      onClick: () => onFilterStatus('PENDING'), active: statusFilter === 'PENDING',
    },
    {
      icon: 'cancel', label: 'Đã hủy',
      value: stats.cancelled.toLocaleString('vi-VN'),
      sub: 'đã hủy / quá hạn',
      bg: 'bg-red-50', ic: 'text-red-500',
      onClick: () => onFilterStatus('CANCELLED'), active: statusFilter === 'CANCELLED',
    },
    {
      icon: 'assignment_late', label: 'Chờ duyệt hủy',
      value: stats.cancelRequested.toLocaleString('vi-VN'),
      sub: 'cần admin xử lý',
      bg: 'bg-orange-50', ic: 'text-orange-600',
      onClick: () => onFilterStatus('CANCEL_REQUESTED'), active: statusFilter === 'CANCEL_REQUESTED',
    },
    {
      icon: 'account_balance_wallet', label: 'Chưa thanh toán',
      value: stats.unpaidCount.toLocaleString('vi-VN'),
      sub: 'đang chờ thanh toán',
      bg: 'bg-violet-50', ic: 'text-violet-600',
      onClick: () => onFilterPayment('UNPAID'), active: paymentFilter === 'UNPAID',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {kpis.map(k => (
        <button
          key={k.label}
          type="button"
          onClick={k.onClick}
          className={`relative text-left bg-surface-container-lowest rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all active:scale-[0.99] overflow-hidden group outline-none focus-visible:ring-2 focus-visible:ring-primary ${k.active ? 'border-primary/50 ring-2 ring-primary/15' : 'border-outline-variant/10'}`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-xl ${k.ic}`} style={{ fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
            </div>
            <span className={`material-symbols-outlined text-[18px] ${k.active ? 'text-primary' : 'text-on-surface-variant/40'}`}>filter_alt</span>
          </div>
          <p className="text-2xl font-extrabold text-on-surface leading-tight">{k.value}</p>
          <p className="text-xs font-medium text-on-surface-variant mt-1">{k.label}</p>
          <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{k.sub}</p>
        </button>
      ))}
    </div>
  );
}

interface PaymentStatsSectionProps {
  paymentStats: PaymentStats | null;
  isLoading: boolean;
  error: string;
  statsDateFrom: string;
  statsDateTo: string;
  defaultStatsDateTo: string;
  onStatsDateFromChange: (value: string) => void;
  onStatsDateToChange: (value: string) => void;
  onClearDates: () => void;
}

function getDateInputValue(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthStartDateInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function PaymentStatsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_2fr]">
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4">
          <div className="h-3 w-36 rounded bg-surface-container-high" />
          <div className="mt-3 h-8 w-48 rounded bg-surface-container-high" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-14 rounded-xl bg-surface-container" />
            <div className="h-14 rounded-xl bg-surface-container" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-32 rounded-2xl bg-surface-container-low" />
          <div className="h-32 rounded-2xl bg-surface-container-low" />
          <div className="h-32 rounded-2xl bg-surface-container-low" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-8 rounded-xl bg-surface-container-low" />
        <div className="h-8 rounded-xl bg-surface-container-low" />
        <div className="h-8 rounded-xl bg-surface-container-low" />
      </div>
    </div>
  );
}

export function PaymentStatsSection({
  paymentStats,
  isLoading,
  error,
  statsDateFrom,
  statsDateTo,
  defaultStatsDateTo,
  onStatsDateFromChange,
  onStatsDateToChange,
  onClearDates,
}: PaymentStatsSectionProps) {
  const today = getDateInputValue(0);
  const presetRanges = [
    { label: '7 ngày', from: getDateInputValue(-6), to: today },
    { label: '30 ngày', from: getDateInputValue(-29), to: today },
    { label: 'Tháng này', from: getMonthStartDateInputValue(), to: today },
  ];
  const activePreset = presetRanges.find(preset => preset.from === statsDateFrom && preset.to === statsDateTo)?.label ?? null;
  const topSource = paymentStats?.breakdown[0] ?? null;
  const hasRevenue = !!paymentStats && paymentStats.totalRevenue > 0;
  const isPermissionError = error.toLowerCase().includes('admin') || error.toLowerCase().includes('quyền');
  const rangeLabel = statsDateFrom || statsDateTo
    ? `${statsDateFrom || '...'} - ${statsDateTo || '...'}`
    : 'Toàn thời gian';

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-5 mb-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>donut_small</span>
          <h2 className="text-sm font-bold text-on-surface">Nguồn Doanh Thu</h2>
          {paymentStats && !isLoading && (
            <span className="text-xs text-on-surface-variant">
              · {paymentStats.totalCount} giao dịch · {fmtCompact(paymentStats.totalRevenue)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presetRanges.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onStatsDateFromChange(preset.from);
                onStatsDateToChange(preset.to);
              }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                activePreset === preset.label
                  ? 'border-primary/30 bg-primary text-on-primary'
                  : 'border-outline-variant/15 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <input
            type="date"
            value={statsDateFrom}
            onChange={e => onStatsDateFromChange(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/15 rounded-lg py-1.5 px-2.5 text-xs text-on-surface outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <span className="text-xs text-on-surface-variant">–</span>
          <input
            type="date"
            value={statsDateTo}
            onChange={e => onStatsDateToChange(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/15 rounded-lg py-1.5 px-2.5 text-xs text-on-surface outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          {(statsDateFrom || statsDateTo !== defaultStatsDateTo) && (
            <button onClick={onClearDates} className="text-xs text-error hover:underline">
              Xóa
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <PaymentStatsSkeleton />
      ) : error ? (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-4 ${
          isPermissionError
            ? 'border-amber-100 bg-amber-50 text-amber-800'
            : 'border-red-100 bg-red-50 text-red-700'
        }`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="material-symbols-outlined text-2xl">{isPermissionError ? 'lock' : 'error'}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold">
                {isPermissionError ? 'Doanh thu chỉ hiển thị cho Admin' : 'Không tải được thống kê doanh thu'}
              </p>
              <p className="mt-0.5 text-xs opacity-75">{error}</p>
            </div>
          </div>
          {isPermissionError && (
            <span className="rounded-full bg-white/60 px-3 py-1 text-[11px] font-bold ring-1 ring-amber-200">
              Không ảnh hưởng thao tác đặt tour
            </span>
          )}
        </div>
      ) : hasRevenue ? (
        <div className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_2fr]">
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Tổng doanh thu trong kỳ</p>
              <p className="mt-2 text-2xl font-extrabold text-on-surface">{fmt(paymentStats.totalRevenue)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white/70 p-2 ring-1 ring-primary/10">
                  <p className="text-on-surface-variant">Giao dịch</p>
                  <p className="mt-0.5 font-extrabold text-on-surface">{paymentStats.totalCount.toLocaleString('vi-VN')}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-2 ring-1 ring-primary/10">
                  <p className="text-on-surface-variant">Khoảng ngày</p>
                  <p className="mt-0.5 truncate font-bold text-on-surface">{rangeLabel}</p>
                </div>
              </div>
              {topSource && (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Nguồn mạnh nhất</p>
                  <p className="mt-1 text-sm font-extrabold text-emerald-800">{CONFIRMED_SOURCE_LABEL[topSource.source] ?? topSource.source}</p>
                  <p className="text-xs text-emerald-700/75">{topSource.percentage}% · {fmtCompact(topSource.revenue)}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { key: 'IN_STORE', label: 'Tại quầy', icon: 'storefront', color: 'teal' },
                { key: 'PAYOS', label: 'PayOS', icon: 'account_balance', color: 'sky' },
                { key: 'OTHER', label: 'Khác', icon: 'more_horiz', color: 'slate' },
              ].map(({ key, label, icon, color }) => {
                const group = paymentStats.byGroup[key] ?? { revenue: 0, percentage: 0 };
                const colorMap: Record<string, string> = {
                  teal: 'bg-teal-50 border-teal-100 text-teal-700',
                  sky: 'bg-sky-50 border-sky-100 text-sky-700',
                  slate: 'bg-slate-50 border-slate-100 text-slate-600',
                };
                return (
                  <div key={key} className={`rounded-2xl border p-4 ${colorMap[color]}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">{icon}</span>
                        <span className="text-[11px] font-bold">{label}</span>
                      </div>
                      <span className="text-xs font-extrabold">{group.percentage}%</span>
                    </div>
                    <p className="text-lg font-extrabold">{fmtCompact(group.revenue)}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                      <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${group.percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {paymentStats.breakdown.map(row => {
              const srcLabel = CONFIRMED_SOURCE_LABEL[row.source] ?? row.source;
              const isPayos = row.source.startsWith('PAYOS');
              const barColor = isPayos ? 'bg-sky-400' : row.source.startsWith('IN_STORE') ? 'bg-teal-400' : 'bg-slate-300';
              return (
                <div key={row.source}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-on-surface">{srcLabel}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-on-surface-variant">{row.count} giao dịch</span>
                      <span className="font-bold text-on-surface">{fmt(row.revenue)}</span>
                      <span className="text-on-surface-variant w-10 text-right">{row.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
                    <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${row.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-8 text-center">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/50">query_stats</span>
          <p className="mt-2 text-sm font-bold text-on-surface">Chưa có giao dịch nào trong kỳ</p>
          <p className="mt-1 text-xs text-on-surface-variant">Thử đổi khoảng ngày hoặc kiểm tra các đơn đã thanh toán.</p>
        </div>
      )}
    </div>
  );
}

interface BookingSavedViewsProps {
  activeView: BookingSavedViewKey | null;
  stats: Stats;
  onViewChange: (view: BookingSavedViewKey) => void;
}

export function BookingSavedViews({ activeView, stats, onViewChange }: BookingSavedViewsProps) {
  const views: Array<{
    key: BookingSavedViewKey;
    label: string;
    icon: string;
    count?: number;
    tone: string;
  }> = [
    { key: 'all', label: 'Tất cả', icon: 'view_list', count: stats.total, tone: 'text-slate-700' },
    { key: 'pending', label: 'Chờ xử lý', icon: 'pending_actions', count: stats.pending, tone: 'text-amber-700' },
    { key: 'unpaid', label: 'Chưa thanh toán', icon: 'account_balance_wallet', count: stats.unpaidCount, tone: 'text-violet-700' },
    { key: 'upcoming', label: 'Sắp khởi hành', icon: 'event_upcoming', tone: 'text-blue-700' },
    { key: 'cancelled', label: 'Đã hủy', icon: 'cancel', count: stats.cancelled, tone: 'text-red-700' },
    { key: 'needsCall', label: 'Cần gọi khách', icon: 'phone_in_talk', tone: 'text-emerald-700' },
  ];

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {views.map(view => {
        const active = activeView === view.key;
        return (
          <button
            key={view.key}
            type="button"
            onClick={() => onViewChange(view.key)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active
                ? 'border-primary/30 bg-primary text-on-primary shadow-sm'
                : `border-outline-variant/15 bg-surface-container-lowest hover:bg-surface-container ${view.tone}`
            }`}
            aria-pressed={active}
          >
            <span className="material-symbols-outlined text-[17px]">{view.icon}</span>
            <span>{view.label}</span>
            {typeof view.count === 'number' && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/18 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {view.count.toLocaleString('vi-VN')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface BookingFiltersProps {
  search: string;
  statusFilter: string;
  paymentFilter: string;
  paymentMethodFilter: string;
  needsReconciliation: boolean;
  needsCustomerCall: boolean;
  dateFrom: string;
  dateTo: string;
  departureFrom: string;
  departureTo: string;
  hasFilter: boolean;
  isLoading: boolean;
  totalItems: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPaymentChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onNeedsReconciliationChange: (value: boolean) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onResetFilters: () => void;
}

export function BookingFilters({
  search,
  statusFilter,
  paymentFilter,
  paymentMethodFilter,
  needsReconciliation,
  needsCustomerCall,
  dateFrom,
  dateTo,
  departureFrom,
  departureTo,
  hasFilter,
  isLoading,
  totalItems,
  onSearchChange,
  onStatusChange,
  onPaymentChange,
  onPaymentMethodChange,
  onNeedsReconciliationChange,
  onDateFromChange,
  onDateToChange,
  onResetFilters,
}: BookingFiltersProps) {
  const hiddenFilterChips = [
    ...(departureFrom || departureTo
      ? [{ icon: 'event_upcoming', label: `Khởi hành ${departureFrom || '...'} - ${departureTo || '...'}` }]
      : []),
    ...(needsCustomerCall ? [{ icon: 'phone_in_talk', label: 'Cần gọi khách' }] : []),
  ];

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-4 mb-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">search</span>
          <label htmlFor="bk-search" className="sr-only">Tìm kiếm đơn đặt tour</label>
          <input
            id="bk-search"
            type="search"
            placeholder="Tìm mã đặt, tên khách hàng, email, tên tour…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
          />
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <BookingFilterSelect
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={onStatusChange}
            ariaLabel="Lọc trạng thái đơn"
            active={Boolean(statusFilter)}
            className="w-[210px] max-w-full"
          />

          <BookingFilterSelect
            value={paymentFilter}
            options={PAYMENT_FILTER_OPTIONS}
            onChange={onPaymentChange}
            ariaLabel="Lọc trạng thái thanh toán"
            active={Boolean(paymentFilter)}
            className="w-[220px] max-w-full"
          />

          <BookingFilterSelect
            value={paymentMethodFilter}
            options={PAYMENT_METHOD_FILTER_OPTIONS}
            onChange={onPaymentMethodChange}
            ariaLabel="Lọc phương thức thanh toán"
            active={Boolean(paymentMethodFilter)}
            className="w-[230px] max-w-full"
          />

          <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2.5 rounded-xl border border-outline-variant/15 bg-surface-container-low hover:bg-surface-container transition-colors">
            <input
              type="checkbox"
              checked={needsReconciliation}
              onChange={e => onNeedsReconciliationChange(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-on-surface whitespace-nowrap">Cần đối soát</span>
            {needsReconciliation && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          </label>

          <div className="flex items-center gap-1.5">
            <label htmlFor="bk-from" className="text-xs text-on-surface-variant whitespace-nowrap">Từ ngày</label>
            <input
              id="bk-from"
              type="date"
              value={dateFrom}
              onChange={e => onDateFromChange(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 px-3 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="bk-to" className="text-xs text-on-surface-variant whitespace-nowrap">Đến ngày</label>
            <input
              id="bk-to"
              type="date"
              value={dateTo}
              onChange={e => onDateToChange(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 px-3 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            />
          </div>

          {hasFilter && (
            <button onClick={onResetFilters} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-error border border-error/30 hover:bg-error/5 transition-colors outline-none">
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Xóa bộ lọc
            </button>
          )}
        </div>

        {!isLoading && (
          <span className="ml-auto text-xs text-on-surface-variant whitespace-nowrap font-medium pl-2">
            {totalItems.toLocaleString('vi-VN')} đơn
          </span>
        )}
      </div>
      {hiddenFilterChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-variant/10 pt-3">
          <span className="text-xs font-bold text-on-surface-variant">View đang áp dụng:</span>
          {hiddenFilterChips.map(chip => (
            <span key={chip.label} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
              <span className="material-symbols-outlined text-[14px]">{chip.icon}</span>
              {chip.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface BookingToastProps {
  toast: { msg: string; ok: boolean } | null;
}

export function BookingToast({ toast }: BookingToastProps) {
  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.msg}</div>
      {toast && (
        <div role="status" className={`fixed bottom-6 right-6 z-[120] flex max-w-md items-start gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.ok ? 'bg-tertiary text-on-tertiary' : 'bg-error text-on-error'}`}>
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            {toast.ok ? 'check_circle' : 'error'}
          </span>
          <span className="leading-5">{toast.msg}</span>
        </div>
      )}
    </>
  );
}

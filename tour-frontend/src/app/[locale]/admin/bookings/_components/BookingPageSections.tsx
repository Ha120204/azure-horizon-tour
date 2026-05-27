'use client';

import type React from 'react';
import { CONFIRMED_SOURCE_LABEL } from '../_lib/config';
import { fmt, fmtCompact } from '../_lib/helpers';
import type { Booking, PaymentStats, Stats } from '../_lib/types';

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
  statsDateFrom: string;
  statsDateTo: string;
  defaultStatsDateTo: string;
  onStatsDateFromChange: (value: string) => void;
  onStatsDateToChange: (value: string) => void;
  onClearDates: () => void;
}

export function PaymentStatsSection({
  paymentStats,
  statsDateFrom,
  statsDateTo,
  defaultStatsDateTo,
  onStatsDateFromChange,
  onStatsDateToChange,
  onClearDates,
}: PaymentStatsSectionProps) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-5 mb-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>donut_small</span>
          <h2 className="text-sm font-bold text-on-surface">Nguồn Doanh Thu</h2>
          {paymentStats && (
            <span className="text-xs text-on-surface-variant">
              · {paymentStats.totalCount} giao dịch · {fmtCompact(paymentStats.totalRevenue)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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

      {paymentStats && paymentStats.totalRevenue > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 mb-2">
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
                <div key={key} className={`rounded-xl border p-3 ${colorMap[color]}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-[14px]">{icon}</span>
                    <span className="text-[11px] font-bold">{label}</span>
                  </div>
                  <p className="text-base font-extrabold">{fmtCompact(group.revenue)}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{group.percentage}%</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
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
                  <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${row.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant text-center py-4">
          {paymentStats ? 'Chưa có giao dịch nào trong kỳ.' : 'Đang tải…'}
        </p>
      )}
    </div>
  );
}

interface BookingFiltersProps {
  search: string;
  statusFilter: string;
  paymentFilter: string;
  paymentMethodFilter: string;
  needsReconciliation: boolean;
  dateFrom: string;
  dateTo: string;
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
  dateFrom,
  dateTo,
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
          <label htmlFor="bk-status" className="sr-only">Lọc trạng thái</label>
          <select
            id="bk-status"
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="CANCEL_REQUESTED">Chờ Duyệt Hủy ⚠️</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>

          <label htmlFor="bk-payment" className="sr-only">Lọc thanh toán</label>
          <select
            id="bk-payment"
            value={paymentFilter}
            onChange={e => onPaymentChange(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          >
            <option value="">Tất cả thanh toán</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="FAILED">Thất bại</option>
          </select>

          <label htmlFor="bk-method" className="sr-only">Lọc phương thức</label>
          <select
            id="bk-method"
            value={paymentMethodFilter}
            onChange={e => onPaymentMethodChange(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          >
            <option value="">Tất cả phương thức</option>
            <option value="PAYOS">PayOS</option>
            <option value="IN_STORE">Tại quầy</option>
          </select>

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

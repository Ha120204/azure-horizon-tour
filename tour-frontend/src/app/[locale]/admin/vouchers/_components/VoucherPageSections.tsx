import type { Meta, VoucherKpiItem, VoucherStatusFilter } from '../_lib/types';

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
          Tạo và quản lý mã khuyến mãi, xem lịch sử đổi thưởng và kiểm soát chiến dịch.
        </p>
      </div>
      {currentUserRole !== null && currentUserRole !== 'STAFF' && (
        <button
          id="btn-create-voucher"
          onClick={onCreate}
          aria-label="Tạo voucher mới"
          className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md hover:opacity-90 transition-all active:scale-[0.98] flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
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
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
              <span className="material-symbols-outlined text-xl" aria-hidden="true">{kpi.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-on-surface-variant font-medium truncate">{kpi.label}</p>
              <p className="text-xl font-bold text-on-surface leading-tight mt-0.5 truncate">{kpi.value}</p>
            </div>
            <span className={`material-symbols-outlined text-[18px] ${kpi.active ? 'text-primary' : 'text-on-surface-variant/35'}`}>
              {kpi.onClick ? (kpi.active ? 'filter_alt_off' : 'filter_alt') : 'monitoring'}
            </span>
          </div>
        );

        return kpi.onClick ? (
          <button
            key={kpi.label}
            type="button"
            onClick={kpi.onClick}
            aria-pressed={kpi.active}
            className={`bg-surface-container-lowest rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all active:scale-[0.99] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary ${kpi.active ? 'border-primary/50 ring-2 ring-primary/15' : 'border-outline-variant/10'}`}
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
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 border border-outline-variant/10 shadow-sm flex flex-wrap gap-3 items-center">
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
        <label htmlFor="filter-type" className="sr-only">Lọc theo loại</label>
        <select
          id="filter-type"
          value={filterType}
          onChange={(event) => onTypeChange(event.target.value)}
          className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
        >
          <option value="">Tất cả loại</option>
          <option value="PERCENTAGE">Phần trăm (%)</option>
          <option value="FIXED_AMOUNT">Số tiền cố định (₫)</option>
        </select>

        <label htmlFor="filter-status" className="sr-only">Lọc theo trạng thái</label>
        <select
          id="filter-status"
          value={filterStatus}
          onChange={(event) => onStatusChange(event.target.value as VoucherStatusFilter | '')}
          className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="expiringSoon">Sắp hết hạn 7 ngày</option>
          <option value="expiredThisMonth">Hết hạn tháng này</option>
          <option value="redeemed">Đã từng được dùng</option>
          <option value="expired">Đã hết hạn</option>
          <option value="depleted">Hết lượt dùng</option>
          <option value="inactive">Đã vô hiệu hóa</option>
        </select>
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
  );
}

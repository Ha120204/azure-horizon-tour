import AdminPagination from '@/components/admin/AdminPagination';
import { statusConfig, typeConfig, UNLIMITED_USES } from '../_lib/config';
import { formatCurrency, formatDate, isNeverExpires } from '../_lib/helpers';
import type { Meta, ModalMode, Voucher, VoucherSortBy, VoucherSortOrder } from '../_lib/types';

interface VoucherTableProps {
  vouchers: Voucher[];
  isLoadingList: boolean;
  meta: Meta;
  page: number;
  limit: number;
  currentUserRole: string | null;
  toggleLoadingId: number | null;
  sortBy: VoucherSortBy;
  sortOrder: VoucherSortOrder;
  selectedVoucherIds: Set<number>;
  allCurrentPageSelected: boolean;
  someCurrentPageSelected: boolean;
  onOpenDetail: (id: number) => void;
  onEdit: (voucher: Voucher, mode: ModalMode) => void;
  onDuplicate: (voucher: Voucher) => void;
  onToggle: (voucher: Voucher) => void;
  onDelete: (voucher: Voucher) => void;
  onCopyCode: (voucher: Voucher) => void;
  onCopyShareLink: (voucher: Voucher) => void;
  onToggleSelected: (voucherId: number) => void;
  onToggleCurrentPage: () => void;
  onSortChange: (key: VoucherSortBy) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const sortableColumns: Array<{
  key: VoucherSortBy;
  label: string;
  align?: 'left' | 'right';
}> = [
  { key: 'discountValue', label: 'Giá Trị' },
  { key: 'minOrderValue', label: 'Đơn Tối Thiểu' },
  { key: 'usedCount', label: 'Sử Dụng' },
  { key: 'startsAt', label: 'Bắt Đầu' },
  { key: 'expiresAt', label: 'Hết Hạn' },
];

function SortHeader({
  column,
  sortBy,
  sortOrder,
  onSortChange,
}: {
  column: (typeof sortableColumns)[number];
  sortBy: VoucherSortBy;
  sortOrder: VoucherSortOrder;
  onSortChange: (key: VoucherSortBy) => void;
}) {
  const active = sortBy === column.key;
  const justify = column.align === 'right' ? 'justify-end' : 'justify-start';

  return (
    <th
      scope="col"
      aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="py-3.5 px-5 whitespace-nowrap"
    >
      <button
        type="button"
        onClick={() => onSortChange(column.key)}
        className={`group inline-flex w-full items-center gap-1.5 ${justify} rounded-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
      >
        <span>{column.label}</span>
        <span
          className={`material-symbols-outlined text-[16px] transition-opacity ${active ? 'opacity-100 text-primary' : 'opacity-30 group-hover:opacity-70'}`}
          aria-hidden="true"
        >
          {active && sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        </span>
      </button>
    </th>
  );
}

export function VoucherTable({
  vouchers,
  isLoadingList,
  meta,
  page,
  limit,
  currentUserRole,
  toggleLoadingId,
  sortBy,
  sortOrder,
  selectedVoucherIds,
  allCurrentPageSelected,
  someCurrentPageSelected,
  onOpenDetail,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
  onCopyCode,
  onCopyShareLink,
  onToggleSelected,
  onToggleCurrentPage,
  onSortChange,
  onPageChange,
  onPageSizeChange,
}: VoucherTableProps) {
  return (
    <div id="vouchers-table" className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
      <p id="voucher-table-scroll-hint" className="sr-only">
        Bảng có thể cuộn ngang trên màn hình nhỏ. Cột thao tác luôn được giữ ở mép phải.
      </p>
      <div className="overflow-x-auto" role="region" aria-labelledby="vouchers-table-caption" aria-describedby="voucher-table-scroll-hint" tabIndex={0}>
        <table className="w-full min-w-[1280px] text-left border-collapse">
          <caption id="vouchers-table-caption" className="sr-only">
            Danh sách voucher quản trị
          </caption>
          <thead>
            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
              <th scope="col" className="w-12 px-5 py-3.5">
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  aria-label={allCurrentPageSelected ? 'Bỏ chọn tất cả voucher trên trang này' : 'Chọn tất cả voucher trên trang này'}
                  aria-checked={allCurrentPageSelected ? 'true' : someCurrentPageSelected ? 'mixed' : 'false'}
                  onChange={onToggleCurrentPage}
                  className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                />
              </th>
              <th scope="col" className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Mã Voucher</th>
              <th scope="col" className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Loại Giảm</th>
              <SortHeader column={sortableColumns[0]} sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
              <SortHeader column={sortableColumns[1]} sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
              <SortHeader column={sortableColumns[2]} sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
              <SortHeader column={sortableColumns[3]} sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
              <SortHeader column={sortableColumns[4]} sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
              <th scope="col" className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Trạng Thái</th>
              <th scope="col" className="sticky right-0 z-10 bg-surface-container/95 py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-right shadow-[-10px_0_16px_-16px_rgba(15,23,42,0.45)]">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {isLoadingList && vouchers.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-20 text-center">
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin block mx-auto mb-3" aria-hidden="true">progress_activity</span>
                  <p className="text-on-surface-variant text-sm">Đang tải dữ liệu…</p>
                </td>
              </tr>
            ) : vouchers.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-20 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2 block" aria-hidden="true">local_activity</span>
                  <p className="font-bold text-on-surface">Không tìm thấy voucher nào</p>
                  <p className="text-on-surface-variant text-sm mt-1">Thử thay đổi bộ lọc hoặc tạo voucher mới.</p>
                </td>
              </tr>
            ) : (
              vouchers.map((voucher) => (
                <VoucherTableRow
                  key={voucher.id}
                  voucher={voucher}
                  selected={selectedVoucherIds.has(voucher.id)}
                  currentUserRole={currentUserRole}
                  toggleLoadingId={toggleLoadingId}
                  onToggleSelected={onToggleSelected}
                  onOpenDetail={onOpenDetail}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onCopyCode={onCopyCode}
                  onCopyShareLink={onCopyShareLink}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {isLoadingList && vouchers.length > 0 && (
        <div className="absolute inset-x-0 top-[52px] bottom-[57px] z-20 flex items-start justify-center bg-surface-container-lowest/55 pt-6 backdrop-blur-[1px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant/15 bg-surface-container-lowest px-4 py-2 text-xs font-semibold text-on-surface-variant shadow-lg shadow-slate-900/10">
            <span className="material-symbols-outlined text-[16px] animate-spin text-primary" aria-hidden="true">progress_activity</span>
            Đang tải danh sách…
          </div>
        </div>
      )}

      {!isLoadingList && (
        <div className="py-2 px-6 border-t border-outline-variant/10 bg-surface-container-lowest">
          <AdminPagination
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.totalItems}
            onPageChange={onPageChange}
            pageSize={limit}
            onPageSizeChange={onPageSizeChange}
            itemLabel="voucher"
          />
        </div>
      )}
    </div>
  );
}

function VoucherTableRow({
  voucher,
  selected,
  currentUserRole,
  toggleLoadingId,
  onToggleSelected,
  onOpenDetail,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
  onCopyCode,
  onCopyShareLink,
}: {
  voucher: Voucher;
  selected: boolean;
  currentUserRole: string | null;
  toggleLoadingId: number | null;
  onToggleSelected: (voucherId: number) => void;
  onOpenDetail: (id: number) => void;
  onEdit: (voucher: Voucher, mode: ModalMode) => void;
  onDuplicate: (voucher: Voucher) => void;
  onToggle: (voucher: Voucher) => void;
  onDelete: (voucher: Voucher) => void;
  onCopyCode: (voucher: Voucher) => void;
  onCopyShareLink: (voucher: Voucher) => void;
}) {
  const hasFiniteMaxUses = voucher.maxUses > 0 && voucher.maxUses < UNLIMITED_USES;
  const usageRatio = hasFiniteMaxUses ? Math.min(voucher.usedCount / voucher.maxUses, 1) : (voucher.usedCount > 0 ? 0.06 : 0);
  const status = statusConfig[voucher.computedStatus];
  const type = typeConfig[voucher.discountType];
  const isInactive = voucher.computedStatus !== 'active';
  const canManage = currentUserRole === 'ADMIN';
  const signals = getVoucherSignals(voucher, usageRatio);

  return (
    <tr className={`hover:bg-surface-container-low/40 transition-colors group ${selected ? 'bg-primary/5' : ''}`}>
      <td className="px-5 py-3.5 align-top">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelected(voucher.id)}
          aria-label={selected ? `Bỏ chọn voucher ${voucher.code}` : `Chọn voucher ${voucher.code}`}
          className="mt-1 h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
        />
      </td>

      <td className="py-3.5 px-5">
        <button
          onClick={() => onOpenDetail(voucher.id)}
          className="text-left group/code focus-visible:ring-2 focus-visible:ring-primary rounded outline-none"
          aria-label={`Xem chi tiết voucher ${voucher.code}`}
        >
          <p className={`font-mono font-bold text-sm group-hover/code:text-primary transition-colors ${isInactive ? 'text-on-surface-variant' : 'text-primary'}`}>
            {voucher.code}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5 truncate max-w-[160px]">{voucher.label}</p>
          {signals.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {signals.map((signal) => (
                <span key={signal.label} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${signal.className}`}>
                  <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{signal.icon}</span>
                  {signal.label}
                </span>
              ))}
            </span>
          )}
        </button>
      </td>

      <td className="py-3.5 px-5">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${type.cls} ${isInactive ? 'opacity-60' : ''}`}>
          {type.label}
        </span>
      </td>

      <td className={`py-3.5 px-5 font-semibold text-sm text-on-surface whitespace-nowrap ${isInactive ? 'opacity-60' : ''}`}>
        {voucher.discountType === 'PERCENTAGE'
          ? `${voucher.discountValue}%`
          : formatCurrency(voucher.discountValue)}
      </td>

      <td className={`py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap ${isInactive ? 'opacity-60' : ''}`}>
        {voucher.minOrderValue > 0 ? formatCurrency(voucher.minOrderValue) : '—'}
      </td>

      <td className={`py-3.5 px-5 min-w-[140px] ${isInactive ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width,background-color] ${
                usageRatio >= 1 ? 'bg-error' : usageRatio >= 0.8 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.max(usageRatio * 100, voucher.usedCount > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-xs text-on-surface-variant whitespace-nowrap font-label">
            {voucher.usedCount}/{voucher.maxUses >= UNLIMITED_USES ? '∞' : voucher.maxUses}
          </span>
        </div>
      </td>

      <td className={`py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap ${isInactive ? 'opacity-60' : ''}`}>
        {formatDate(voucher.startsAt)}
      </td>

      <td className={`py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap ${isInactive ? 'opacity-60' : ''}`}>
        {isNeverExpires(voucher.expiresAt) ? (
          <span className="inline-flex items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">all_inclusive</span>
            Vĩnh viễn
          </span>
        ) : (
          formatDate(voucher.expiresAt)
        )}
      </td>

      <td className="py-3.5 px-5">
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${status.text}`}>
          <div className={`w-2 h-2 rounded-full ${status.dot}`} aria-hidden="true" />
          {status.label}
        </div>
      </td>

      <td className="sticky right-0 z-10 bg-surface-container-lowest/95 py-3.5 px-5 text-right shadow-[-10px_0_16px_-16px_rgba(15,23,42,0.45)] backdrop-blur group-hover:bg-surface-container-low">
        <div className="flex items-center justify-end gap-1">
          <IconActionButton
            icon="info"
            label={`Xem chi tiết voucher ${voucher.code}`}
            tooltip="Chi tiết"
            onClick={() => onOpenDetail(voucher.id)}
          />

          <IconActionButton
            icon="content_copy"
            label={`Sao chép mã ${voucher.code}`}
            tooltip="Copy mã"
            onClick={() => onCopyCode(voucher)}
          />

          <IconActionButton
            icon="link"
            label={`Sao chép link chia sẻ voucher ${voucher.code}`}
            tooltip="Copy link"
            onClick={() => onCopyShareLink(voucher)}
          />

          {canManage && (
            <IconActionButton
              icon="edit"
              label={`Sửa voucher ${voucher.code}`}
              tooltip="Chỉnh sửa"
              onClick={() => onEdit(voucher, 'edit')}
            />
          )}

          {canManage && (
            <IconActionButton
              icon="library_add"
              label={`Nhân bản voucher ${voucher.code}`}
              tooltip="Nhân bản"
              onClick={() => onDuplicate(voucher)}
            />
          )}

          {canManage && (
            <IconActionButton
              icon={toggleLoadingId === voucher.id ? 'progress_activity' : voucher.isActive ? 'pause_circle' : 'play_circle'}
              label={voucher.isActive ? `Vô hiệu hóa ${voucher.code}` : `Kích hoạt ${voucher.code}`}
              tooltip={voucher.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
              onClick={() => onToggle(voucher)}
              disabled={toggleLoadingId === voucher.id}
              className={voucher.isActive
                ? 'text-on-surface-variant hover:bg-amber-500/10 hover:text-amber-600 focus-visible:ring-amber-500'
                : 'text-on-surface-variant hover:bg-tertiary/10 hover:text-tertiary focus-visible:ring-tertiary'
              }
              iconClassName={toggleLoadingId === voucher.id ? 'animate-spin' : ''}
            />
          )}

          {currentUserRole === 'ADMIN' && (
            <IconActionButton
              icon="delete"
              label={`Xóa voucher ${voucher.code}`}
              tooltip="Xóa"
              onClick={() => onDelete(voucher)}
              tooltipClassName="right-0 bg-error text-on-error"
              tooltipArrowClassName="right-3 border-t-error"
              className="text-on-surface-variant hover:bg-error/10 hover:text-error focus-visible:ring-error"
            />
          )}
        </div>
      </td>
    </tr>
  );
}

function getVoucherSignals(voucher: Voucher, usageRatio: number) {
  const signals: Array<{ icon: string; label: string; className: string }> = [];
  const now = Date.now();
  const expiresAt = new Date(voucher.expiresAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (voucher.computedStatus === 'scheduled') {
    signals.push({
      icon: 'event_upcoming',
      label: formatDate(voucher.startsAt),
      className: 'bg-primary/10 text-primary ring-1 ring-primary/20',
    });
  }

  if (
    voucher.computedStatus === 'active' &&
    !isNeverExpires(voucher.expiresAt) &&
    expiresAt > now &&
    expiresAt <= now + sevenDaysMs
  ) {
    signals.push({
      icon: 'schedule',
      label: 'Sắp hết hạn',
      className: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20',
    });
  }

  if (voucher.computedStatus === 'active' && usageRatio >= 0.8 && usageRatio < 1) {
    signals.push({
      icon: 'priority_high',
      label: 'Gần hết lượt',
      className: 'bg-error/10 text-error ring-1 ring-error/20',
    });
  }

  if (voucher.computedStatus === 'active' && voucher.usedCount === 0) {
    signals.push({
      icon: 'radio_button_unchecked',
      label: 'Chưa dùng',
      className: 'bg-surface-container text-on-surface-variant ring-1 ring-outline-variant/20',
    });
  }

  return signals.slice(0, 2);
}

function IconActionButton({
  icon,
  label,
  tooltip,
  onClick,
  disabled = false,
  className = 'text-on-surface-variant hover:bg-primary/10 hover:text-primary focus-visible:ring-primary',
  iconClassName = '',
  tooltipClassName = 'left-1/2 -translate-x-1/2 bg-on-surface text-surface',
  tooltipArrowClassName = 'left-1/2 -translate-x-1/2 border-t-on-surface',
}: {
  icon: string;
  label: string;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
  tooltipClassName?: string;
  tooltipArrowClassName?: string;
}) {
  const tooltipId = `voucher-action-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="relative group/tip">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-describedby={tooltipId}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors focus-visible:ring-2 outline-none disabled:opacity-50 ${className}`}
      >
        <span className={`material-symbols-outlined text-[18px] ${iconClassName}`} aria-hidden="true">{icon}</span>
      </button>
      <span id={tooltipId} role="tooltip" className={`pointer-events-none absolute -top-8 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 z-20 ${tooltipClassName}`}>
        {tooltip}
        <span className={`absolute top-full border-4 border-transparent ${tooltipArrowClassName}`} />
      </span>
    </div>
  );
}

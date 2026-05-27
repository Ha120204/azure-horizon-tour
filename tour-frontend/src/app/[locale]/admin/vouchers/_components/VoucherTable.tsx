import AdminPagination from '@/components/admin/AdminPagination';
import { statusConfig, typeConfig } from '../_lib/config';
import { formatCurrency, formatDate, isNeverExpires } from '../_lib/helpers';
import type { Meta, ModalMode, Voucher } from '../_lib/types';

interface VoucherTableProps {
  vouchers: Voucher[];
  isLoadingList: boolean;
  meta: Meta;
  page: number;
  limit: number;
  currentUserRole: string | null;
  toggleLoadingId: number | null;
  onOpenDetail: (id: number) => void;
  onEdit: (voucher: Voucher, mode: ModalMode) => void;
  onToggle: (voucher: Voucher) => void;
  onDelete: (voucher: Voucher) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function VoucherTable({
  vouchers,
  isLoadingList,
  meta,
  page,
  limit,
  currentUserRole,
  toggleLoadingId,
  onOpenDetail,
  onEdit,
  onToggle,
  onDelete,
  onPageChange,
  onPageSizeChange,
}: VoucherTableProps) {
  return (
    <div id="vouchers-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
              {['Mã Voucher', 'Loại Giảm', 'Giá Trị', 'Đơn Tối Thiểu', 'Sử Dụng', 'Hết Hạn', 'Trạng Thái', 'Thao Tác'].map((heading, index) => (
                <th
                  key={heading}
                  className={`py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${index === 7 ? 'text-right' : ''}`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {isLoadingList ? (
              <tr>
                <td colSpan={8} className="py-20 text-center">
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin block mx-auto mb-3" aria-hidden="true">progress_activity</span>
                  <p className="text-on-surface-variant text-sm">Đang tải dữ liệu…</p>
                </td>
              </tr>
            ) : vouchers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center">
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
                  currentUserRole={currentUserRole}
                  toggleLoadingId={toggleLoadingId}
                  onOpenDetail={onOpenDetail}
                  onEdit={onEdit}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

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
  currentUserRole,
  toggleLoadingId,
  onOpenDetail,
  onEdit,
  onToggle,
  onDelete,
}: {
  voucher: Voucher;
  currentUserRole: string | null;
  toggleLoadingId: number | null;
  onOpenDetail: (id: number) => void;
  onEdit: (voucher: Voucher, mode: ModalMode) => void;
  onToggle: (voucher: Voucher) => void;
  onDelete: (voucher: Voucher) => void;
}) {
  const usageRatio = voucher.maxUses >= 999_999_999 ? 0.06 : Math.min(voucher.usedCount / voucher.maxUses, 1);
  const status = statusConfig[voucher.computedStatus];
  const type = typeConfig[voucher.discountType];
  const isInactive = voucher.computedStatus !== 'active';
  const canManage = currentUserRole !== null && currentUserRole !== 'STAFF';

  return (
    <tr className="hover:bg-surface-container-low/40 transition-colors group">
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
              className={`h-full rounded-full transition-all ${
                usageRatio >= 1 ? 'bg-error' : usageRatio >= 0.8 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.max(usageRatio * 100, voucher.usedCount > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-xs text-on-surface-variant whitespace-nowrap font-label">
            {voucher.usedCount}/{voucher.maxUses >= 999_999_999 ? '∞' : voucher.maxUses}
          </span>
        </div>
      </td>

      <td className={`py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap ${isInactive ? 'opacity-60' : ''}`}>
        {isNeverExpires(voucher.expiresAt) ? (
          <span className="inline-flex items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">all_inclusive</span>
            Vĩnh viễn
          </span>
        ) : (
          formatDate(voucher.expiresAt)
        )}
      </td>

      <td className="py-3.5 px-5">
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${status.text}`}>
          <div className={`w-2 h-2 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </td>

      <td className="py-3.5 px-5 text-right">
        <div className="flex items-center justify-end gap-1">
          <IconActionButton
            icon="info"
            label={`Xem chi tiết voucher ${voucher.code}`}
            tooltip="Chi tiết"
            onClick={() => onOpenDetail(voucher.id)}
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

          {currentUserRole === 'SUPER_ADMIN' && (
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
  return (
    <div className="relative group/tip">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors focus-visible:ring-2 outline-none disabled:opacity-50 ${className}`}
      >
        <span className={`material-symbols-outlined text-[18px] ${iconClassName}`} aria-hidden="true">{icon}</span>
      </button>
      <span className={`pointer-events-none absolute -top-8 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20 ${tooltipClassName}`}>
        {tooltip}
        <span className={`absolute top-full border-4 border-transparent ${tooltipArrowClassName}`} />
      </span>
    </div>
  );
}

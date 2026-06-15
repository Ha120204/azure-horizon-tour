import { useEffect, useRef } from 'react';
import AdminPagination from '@/components/admin/AdminPagination';
import { CustomerTableRow } from './CustomerTableRow';
import type { CustomerSortKey, Meta, SortDirection, User } from '../_lib/types';

interface CustomerTableProps {
    users: User[];
    isLoading: boolean;
    meta: Meta;
    pageSize: number;
    currentUserRole: string;
    sortBy: CustomerSortKey;
    sortDir: SortDirection;
    selectedCustomerIds: Set<number>;
    allCurrentPageSelected: boolean;
    someCurrentPageSelected: boolean;
    onOpenDetail: (userId: number, editMode?: boolean) => void;
    onToggleStatus: (user: User) => void;
    onSortChange: (key: CustomerSortKey) => void;
    onToggleSelected: (userId: number) => void;
    onToggleCurrentPage: () => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

const sortableColumns: Array<{
    key: CustomerSortKey;
    label: string;
    align?: 'left' | 'center' | 'right';
    className?: string;
}> = [
    { key: 'fullName', label: 'Khách hàng', className: 'min-w-[240px]' },
    { key: 'createdAt', label: 'Ngày tham gia', className: 'min-w-[150px]' },
    { key: 'bookingCount', label: 'Đơn đặt', align: 'center', className: 'min-w-[110px]' },
    { key: 'status', label: 'Trạng thái', className: 'min-w-[130px]' },
];

function SortHeader({
    column,
    sortBy,
    sortDir,
    onSortChange,
}: {
    column: (typeof sortableColumns)[number];
    sortBy: CustomerSortKey;
    sortDir: SortDirection;
    onSortChange: (key: CustomerSortKey) => void;
}) {
    const active = sortBy === column.key;
    const justify = column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start';

    return (
        <th
            scope="col"
            aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={`py-3.5 px-5 ${column.className ?? ''}`}
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
                    {active && sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
            </button>
        </th>
    );
}

export function CustomerTable({
    users,
    isLoading,
    meta,
    pageSize,
    currentUserRole,
    sortBy,
    sortDir,
    selectedCustomerIds,
    allCurrentPageSelected,
    someCurrentPageSelected,
    onOpenDetail,
    onToggleStatus,
    onSortChange,
    onToggleSelected,
    onToggleCurrentPage,
    onPageChange,
    onPageSizeChange,
}: CustomerTableProps) {
    const getSortableColumn = (key: CustomerSortKey) => sortableColumns.find(column => column.key === key)!;

    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.indeterminate = someCurrentPageSelected && !allCurrentPageSelected;
        }
    }, [someCurrentPageSelected, allCurrentPageSelected]);

    return (
        <div id="users-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1230px] text-left border-collapse">
                    <thead>
                        <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                            <th scope="col" className="w-12 px-5 py-3.5">
                                <input
                                    ref={headerCheckboxRef}
                                    type="checkbox"
                                    checked={allCurrentPageSelected}
                                    aria-label={allCurrentPageSelected ? 'Bỏ chọn tất cả khách hàng trên trang này' : 'Chọn tất cả khách hàng trên trang này'}
                                    aria-checked={allCurrentPageSelected ? 'true' : someCurrentPageSelected ? 'mixed' : 'false'}
                                    onChange={onToggleCurrentPage}
                                    className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                                />
                            </th>
                            <SortHeader column={getSortableColumn('fullName')} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
                            <th scope="col" className="py-3.5 px-5 min-w-[230px] font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Liên hệ</th>
                            <SortHeader column={getSortableColumn('createdAt')} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
                            <SortHeader column={getSortableColumn('bookingCount')} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
                            <th scope="col" className="py-3.5 px-5 min-w-[140px] font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-right">Tổng chi tiêu</th>
                            <th scope="col" className="py-3.5 px-5 min-w-[160px] font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Lần đặt gần nhất</th>
                            <SortHeader column={getSortableColumn('status')} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
                            <th scope="col" className="py-3.5 px-5 min-w-[170px] font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <tr key={`skel-${index}`} className="animate-pulse">
                                    <td className="py-4 px-5"><div className="h-4 w-4 rounded bg-surface-container-high" /></td>
                                    <td className="py-4 px-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-surface-container-high" /><div className="space-y-2"><div className="h-3.5 w-28 bg-surface-container-high rounded" /><div className="h-2.5 w-20 bg-surface-container rounded" /></div></div></td>
                                    <td className="py-4 px-5"><div className="space-y-2"><div className="h-3 w-36 bg-surface-container-high rounded" /><div className="h-2.5 w-24 bg-surface-container rounded" /></div></td>
                                    <td className="py-4 px-5"><div className="space-y-2"><div className="h-3 w-24 bg-surface-container-high rounded" /><div className="h-2.5 w-18 bg-surface-container rounded" /></div></td>
                                    <td className="py-4 px-5"><div className="h-3 w-8 bg-surface-container-high rounded mx-auto" /></td>
                                    <td className="py-4 px-5"><div className="h-3 w-24 bg-surface-container-high rounded ml-auto" /></td>
                                    <td className="py-4 px-5"><div className="space-y-2"><div className="h-3 w-24 bg-surface-container-high rounded" /><div className="h-2.5 w-16 bg-surface-container rounded" /></div></td>
                                    <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded-lg" /></td>
                                    <td className="py-4 px-5"><div className="h-8 w-32 bg-surface-container-high rounded-lg mx-auto" /></td>
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="py-20 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined text-3xl text-outline" aria-hidden="true">person_search</span>
                                        </div>
                                        <p className="font-bold text-on-surface">Không tìm thấy khách hàng nào</p>
                                        <p className="text-on-surface-variant text-sm mt-1 max-w-xs">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để hiển thị kết quả.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <CustomerTableRow
                                    key={user.id}
                                    user={user}
                                    currentUserRole={currentUserRole}
                                    isSelected={selectedCustomerIds.has(user.id)}
                                    onToggleSelected={onToggleSelected}
                                    onOpenDetail={onOpenDetail}
                                    onToggleStatus={onToggleStatus}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="py-3 px-6 border-t border-outline-variant/10 bg-surface-container-lowest">
                <AdminPagination
                    currentPage={meta.currentPage}
                    totalPages={meta.totalPages}
                    totalItems={meta.totalItems}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                    itemLabel="khách hàng"
                />
            </div>
        </div>
    );
}

import AdminPagination from '@/components/admin/AdminPagination';
import { CustomerTableRow } from './CustomerTableRow';
import type { Meta, User } from '../_lib/types';

interface CustomerTableProps {
    users: User[];
    isLoading: boolean;
    meta: Meta;
    pageSize: number;
    currentUserRole: string;
    onOpenDetail: (userId: number, editMode?: boolean) => void;
    onToggleStatus: (user: User) => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

export function CustomerTable({
    users,
    isLoading,
    meta,
    pageSize,
    currentUserRole,
    onOpenDetail,
    onToggleStatus,
    onPageChange,
    onPageSizeChange,
}: CustomerTableProps) {
    return (
        <div id="users-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Khách hàng</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Liên hệ</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ngày tham gia</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-center">Đơn đặt</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-center">Đánh giá</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-center w-[120px]">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <tr key={`skel-${index}`} className="animate-pulse">
                                    <td className="py-4 px-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-surface-container-high" /><div className="space-y-2"><div className="h-3.5 w-28 bg-surface-container-high rounded" /><div className="h-2.5 w-20 bg-surface-container rounded" /></div></div></td>
                                    <td className="py-4 px-5"><div className="space-y-2"><div className="h-3 w-36 bg-surface-container-high rounded" /><div className="h-2.5 w-24 bg-surface-container rounded" /></div></td>
                                    <td className="py-4 px-5"><div className="h-3 w-24 bg-surface-container-high rounded" /></td>
                                    <td className="py-4 px-5"><div className="h-3 w-8 bg-surface-container-high rounded mx-auto" /></td>
                                    <td className="py-4 px-5"><div className="h-3 w-8 bg-surface-container-high rounded mx-auto" /></td>
                                    <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded-lg" /></td>
                                    <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded mx-auto" /></td>
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-20 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined text-3xl text-outline" aria-hidden="true">person_search</span>
                                        </div>
                                        <p className="font-bold text-on-surface">Không tìm thấy khách hàng nào</p>
                                        <p className="text-on-surface-variant text-sm mt-1 max-w-xs">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm để hiển thị kết quả.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <CustomerTableRow
                                    key={user.id}
                                    user={user}
                                    currentUserRole={currentUserRole}
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

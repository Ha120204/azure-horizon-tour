'use client';

import AdminPagination from '@/components/admin/AdminPagination';
import { ActiveTourRow } from './ActiveTourRow';
import { TrashTourRow } from './TrashTourRow';
import type { Meta, Tour, TourReviewAction, TrashedTour } from '../_lib/types';

interface ActiveToursTableProps {
    tours: Tour[];
    isLoading: boolean;
    meta: Meta;
    page: number;
    pageSize: number;
    selectedIds: Set<number>;
    isAllSelected: boolean;
    userId: number | null;
    isStaff: boolean;
    isAdmin: boolean;
    submittingTourId: number | null;
    onToggleSelectAll: () => void;
    onToggleSelect: (id: number) => void;
    canSelectTour: (tour: Tour) => boolean;
    onOpenDetail: (tour: Tour) => void;
    onOpenContent: (tour: Tour) => void;
    onEdit: (tour: Tour) => void;
    onSubmit: (tour: Tour) => void;
    onReview: (target: { tour: Tour; action: TourReviewAction }) => void;
    onDelete: (tour: Tour) => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}

export function ActiveToursTable({
    tours,
    isLoading,
    meta,
    page,
    pageSize,
    selectedIds,
    isAllSelected,
    userId,
    isStaff,
    isAdmin,
    submittingTourId,
    onToggleSelectAll,
    onToggleSelect,
    canSelectTour,
    onOpenDetail,
    onOpenContent,
    onEdit,
    onSubmit,
    onReview,
    onDelete,
    onPageChange,
    onPageSizeChange,
}: ActiveToursTableProps) {
    const hasSelectableTours = tours.some(canSelectTour);

    return (
        <div id="tours-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                            <th className="py-3.5 pl-5 pr-2 w-10">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    disabled={!hasSelectableTours}
                                    onChange={onToggleSelectAll}
                                    className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
                                    aria-label={hasSelectableTours ? 'Chọn tất cả tour đang hiển thị' : 'Không có tour nào có thể chọn'}
                                    title={hasSelectableTours ? 'Chọn tất cả tour đang hiển thị' : 'Không có tour nào có thể chọn'}
                                />
                            </th>
                            <th className="py-3.5 px-3 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-center w-12">STT</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Tour</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Điểm Đến</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">
                                Giá
                                <span className="ml-1 normal-case font-normal text-[10px] text-on-surface-variant/50">(VNĐ)</span>
                            </th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ngày KH</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Thời Lượng</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ghế</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Rating</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Trạng Thái</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                        {isLoading ? (
                            <tr>
                                <td colSpan={11} className="py-20 text-center">
                                    <span className="material-symbols-outlined text-4xl text-primary animate-spin" aria-hidden="true">progress_activity</span>
                                    <p className="text-on-surface-variant text-sm mt-3">Đang tải dữ liệu…</p>
                                </td>
                            </tr>
                        ) : tours.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="py-20 text-center">
                                    <span className="material-symbols-outlined text-4xl text-outline mb-2 block" aria-hidden="true">travel_explore</span>
                                    <p className="font-bold text-on-surface">Không tìm thấy tour nào</p>
                                    <p className="text-on-surface-variant text-sm mt-1">Thử thay đổi bộ lọc hoặc {isStaff ? 'tạo bản nháp mới' : 'tạo tour mới'}.</p>
                                </td>
                            </tr>
                        ) : (
                            tours.map((tour, rowIndex) => (
                                <ActiveTourRow
                                    key={tour.id}
                                    tour={tour}
                                    rowIndex={rowIndex}
                                    page={page}
                                    pageSize={pageSize}
                                    isChecked={selectedIds.has(tour.id)}
                                    userId={userId}
                                    isStaff={isStaff}
                                    isAdmin={isAdmin}
                                    submittingTourId={submittingTourId}
                                    canSelectTour={canSelectTour}
                                    onToggleSelect={onToggleSelect}
                                    onOpenDetail={onOpenDetail}
                                    onOpenContent={onOpenContent}
                                    onEdit={onEdit}
                                    onSubmit={onSubmit}
                                    onReview={onReview}
                                    onDelete={onDelete}
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
                    itemLabel="tour"
                />
            </div>
        </div>
    );
}

interface TrashToursTableProps {
    trashedTours: TrashedTour[];
    isLoading: boolean;
    meta: Meta;
    selectedIds: Set<number>;
    isAllSelected: boolean;
    restoringTourId: number | null;
    onToggleSelectAll: () => void;
    onToggleSelect: (id: number) => void;
    onRestore: (tour: TrashedTour) => void;
    onPermanentDelete: (tour: TrashedTour) => void;
    onPageChange: (page: number) => void;
}

export function TrashToursTable({
    trashedTours,
    isLoading,
    meta,
    selectedIds,
    isAllSelected,
    restoringTourId,
    onToggleSelectAll,
    onToggleSelect,
    onRestore,
    onPermanentDelete,
    onPageChange,
}: TrashToursTableProps) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden mb-4">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10 bg-error/5">
                <span className="material-symbols-outlined text-error text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
                <div>
                    <p className="font-semibold text-sm text-on-surface">Thùng Rác — Tour Đã Ẩn</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">Tour đã có booking sẽ được lưu trữ để bảo toàn lịch sử. Admin và Super Admin chỉ xóa vĩnh viễn tour chưa phát sinh booking.</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                            <th className="py-3.5 pl-5 pr-2 w-10">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={onToggleSelectAll}
                                    className="w-4 h-4 rounded border-outline-variant accent-error cursor-pointer"
                                    aria-label="Chọn tất cả tour trong thùng rác"
                                />
                            </th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Tour</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Điểm Đến</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Người Tạo</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Booking</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ngày Ẩn</th>
                            <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                        {isLoading ? (
                            <tr><td colSpan={7} className="py-16 text-center">
                                <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
                            </td></tr>
                        ) : trashedTours.length === 0 ? (
                            <tr><td colSpan={7} className="py-16 text-center">
                                <span className="material-symbols-outlined text-4xl text-outline mb-2 block">delete_sweep</span>
                                <p className="font-semibold text-on-surface">Thùng rác trống</p>
                                <p className="text-sm text-on-surface-variant mt-1">Không có tour nào bị ẩn.</p>
                            </td></tr>
                        ) : trashedTours.map(tour => (
                            <TrashTourRow
                                key={tour.id}
                                tour={tour}
                                isChecked={selectedIds.has(tour.id)}
                                restoringTourId={restoringTourId}
                                onToggleSelect={onToggleSelect}
                                onRestore={onRestore}
                                onPermanentDelete={onPermanentDelete}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {meta.totalPages > 1 && (
                <div className="py-3 px-6 border-t border-outline-variant/10">
                    <AdminPagination
                        currentPage={meta.currentPage}
                        totalPages={meta.totalPages}
                        totalItems={meta.totalItems}
                        pageSize={10}
                        onPageChange={onPageChange}
                        onPageSizeChange={() => { }}
                        itemLabel="tour trong thùng rác"
                        pageSizeOptions={[10]}
                    />
                </div>
            )}
        </div>
    );
}

'use client';

import { TourFilterSelect, type TourFilterSelectOption } from './TourFilterSelect';

interface TrashTourControlsProps {
    searchInput: string;
    status: string;
    deletable: string;
    selectedCount: number;
    isBulkRestoring: boolean;
    isBulkDeleting: boolean;
    onSearchInputChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onDeletableChange: (value: string) => void;
    onClearSelection: () => void;
    onBulkRestore: () => void;
    onBulkDelete: () => void;
}

const TRASH_STATUS_OPTIONS: TourFilterSelectOption[] = [
    { value: '', label: 'Tất cả trạng thái', description: 'Không giới hạn trạng thái', icon: 'filter_list' },
    { value: 'DRAFT', label: 'Bản nháp', description: 'Tour đang soạn nội dung', icon: 'edit_note' },
    { value: 'PENDING_REVIEW', label: 'Chờ duyệt', description: 'Đang chờ admin kiểm tra', icon: 'hourglass_top' },
    { value: 'PUBLISHED', label: 'Đã duyệt', description: 'Tour đã từng hiển thị cho khách', icon: 'verified' },
    { value: 'REJECTED', label: 'Bị từ chối', description: 'Tour cần chỉnh sửa', icon: 'cancel' },
    { value: 'COMPLETED', label: 'Đã kết thúc', description: 'Tour đã qua ngày khởi hành', icon: 'flag' },
];

const DELETABLE_OPTIONS: TourFilterSelectOption[] = [
    { value: '', label: 'Tất cả khả năng xóa', description: 'Hiển thị mọi tour trong thùng rác', icon: 'delete_outline' },
    { value: 'true', label: 'Có thể xóa vĩnh viễn', description: 'Tour chưa phát sinh booking', icon: 'delete_forever' },
    { value: 'false', label: 'Đã có booking', description: 'Chỉ có thể giữ hoặc khôi phục', icon: 'lock' },
];

export function TrashTourControls({
    searchInput,
    status,
    deletable,
    selectedCount,
    isBulkRestoring,
    isBulkDeleting,
    onSearchInputChange,
    onStatusChange,
    onDeletableChange,
    onClearSelection,
    onBulkRestore,
    onBulkDelete,
}: TrashTourControlsProps) {
    return (
        <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-sm">
                <div className="relative min-w-[220px] flex-1">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant" aria-hidden="true">search</span>
                    <label htmlFor="search-trash-tours" className="sr-only">Tìm kiếm tour trong thùng rác</label>
                    <input
                        id="search-trash-tours"
                        type="search"
                        autoComplete="off"
                        placeholder="Tìm theo tên, ID hoặc điểm đến..."
                        value={searchInput}
                        onChange={event => onSearchInputChange(event.target.value)}
                        className="w-full rounded-xl border border-outline-variant/15 bg-surface-container-low py-2.5 pl-11 pr-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    />
                </div>
                <TourFilterSelect
                    value={status}
                    options={TRASH_STATUS_OPTIONS}
                    onChange={onStatusChange}
                    ariaLabel="Lọc trạng thái trong thùng rác"
                    active={Boolean(status)}
                    className="w-[220px] max-w-full"
                />
                <TourFilterSelect
                    value={deletable}
                    options={DELETABLE_OPTIONS}
                    onChange={onDeletableChange}
                    ariaLabel="Lọc khả năng xóa vĩnh viễn"
                    active={Boolean(deletable)}
                    className="w-[240px] max-w-full"
                />
            </div>

            {selectedCount > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-error/20 bg-error/5 px-5 py-3.5">
                    <span className="material-symbols-outlined text-[20px] text-error">delete_sweep</span>
                    <span className="flex-1 text-sm font-semibold text-on-surface">
                        Đã chọn <strong className="text-error">{selectedCount}</strong> tour trong thùng rác
                    </span>
                    <button
                        type="button"
                        onClick={onClearSelection}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                    >
                        Bỏ chọn
                    </button>
                    <button
                        type="button"
                        onClick={onBulkRestore}
                        disabled={isBulkRestoring || isBulkDeleting}
                        className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-[16px] ${isBulkRestoring ? 'animate-spin' : ''}`}>
                            {isBulkRestoring ? 'progress_activity' : 'restore'}
                        </span>
                        Khôi phục
                    </button>
                    <button
                        type="button"
                        onClick={onBulkDelete}
                        disabled={isBulkRestoring || isBulkDeleting}
                        className="flex items-center gap-2 rounded-xl bg-error px-4 py-1.5 text-sm font-semibold text-on-error transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                        Xóa vĩnh viễn
                    </button>
                </div>
            )}
        </div>
    );
}

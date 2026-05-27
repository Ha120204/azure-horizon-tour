'use client';

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
            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[220px] relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none" aria-hidden="true">search</span>
                    <label htmlFor="search-trash-tours" className="sr-only">Tìm kiếm tour trong thùng rác</label>
                    <input
                        id="search-trash-tours"
                        type="search"
                        autoComplete="off"
                        placeholder="Tìm theo tên, ID hoặc điểm đến..."
                        value={searchInput}
                        onChange={e => onSearchInputChange(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                    />
                </div>
                <select
                    value={status}
                    onChange={e => onStatusChange(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                    aria-label="Lọc trạng thái trong thùng rác"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="DRAFT">Bản nháp</option>
                    <option value="PENDING_REVIEW">Chờ duyệt</option>
                    <option value="PUBLISHED">Đã duyệt</option>
                    <option value="REJECTED">Bị từ chối</option>
                    <option value="COMPLETED">Đã kết thúc</option>
                </select>
                <select
                    value={deletable}
                    onChange={e => onDeletableChange(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                    aria-label="Lọc khả năng xóa vĩnh viễn"
                >
                    <option value="">Tất cả khả năng xóa</option>
                    <option value="true">Có thể xóa vĩnh viễn</option>
                    <option value="false">Đã có booking</option>
                </select>
            </div>

            {selectedCount > 0 && (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-error/5 border border-error/20 rounded-2xl">
                    <span className="material-symbols-outlined text-error text-[20px]">delete_sweep</span>
                    <span className="text-sm font-semibold text-on-surface flex-1">
                        Đã chọn <strong className="text-error">{selectedCount}</strong> tour trong thùng rác
                    </span>
                    <button
                        onClick={onClearSelection}
                        className="text-xs text-on-surface-variant hover:text-on-surface font-medium px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
                    >
                        Bỏ chọn
                    </button>
                    <button
                        onClick={onBulkRestore}
                        disabled={isBulkRestoring || isBulkDeleting}
                        className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                        <span className={`material-symbols-outlined text-[16px] ${isBulkRestoring ? 'animate-spin' : ''}`}>
                            {isBulkRestoring ? 'progress_activity' : 'restore'}
                        </span>
                        Khôi phục
                    </button>
                    <button
                        onClick={onBulkDelete}
                        disabled={isBulkRestoring || isBulkDeleting}
                        className="flex items-center gap-2 px-4 py-1.5 bg-error text-on-error rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                        Xóa vĩnh viễn
                    </button>
                </div>
            )}
        </div>
    );
}

interface CustomerBulkActionBarProps {
    selectedCount: number;
    activeCount: number;
    deactivatedCount: number;
    canManage: boolean;
    isBulkUpdating: boolean;
    onExport: () => void;
    onBulkDeactivate: () => void;
    onBulkActivate: () => void;
    onClear: () => void;
}

export function CustomerBulkActionBar({
    selectedCount,
    activeCount,
    deactivatedCount,
    canManage,
    isBulkUpdating,
    onExport,
    onBulkDeactivate,
    onBulkActivate,
    onClear,
}: CustomerBulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div
            role="toolbar"
            aria-label={`Đã chọn ${selectedCount} khách hàng`}
            className="sticky top-0 z-30 mb-3 rounded-xl border border-primary/20 bg-surface-container-lowest/95 px-3 py-2.5 shadow-sm ring-1 ring-primary/5 backdrop-blur"
        >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                        <span className="material-symbols-outlined text-[18px]">checklist</span>
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-on-surface">
                            Đã chọn <strong className="text-primary">{selectedCount}</strong> khách hàng
                        </p>
                        <p className="text-xs text-on-surface-variant">
                            {activeCount} hoạt động · {deactivatedCount} đã khóa
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <button
                        type="button"
                        onClick={onExport}
                        disabled={isBulkUpdating}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant/20 bg-surface px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
                        Xuất CSV ({selectedCount})
                    </button>

                    {canManage && activeCount > 0 && (
                        <button
                            type="button"
                            onClick={onBulkDeactivate}
                            disabled={isBulkUpdating}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                            <span className={`material-symbols-outlined text-[14px] ${isBulkUpdating ? 'animate-spin' : ''}`} aria-hidden="true">
                                {isBulkUpdating ? 'progress_activity' : 'block'}
                            </span>
                            Khóa ({activeCount})
                        </button>
                    )}

                    {canManage && deactivatedCount > 0 && (
                        <button
                            type="button"
                            onClick={onBulkActivate}
                            disabled={isBulkUpdating}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <span className={`material-symbols-outlined text-[14px] ${isBulkUpdating ? 'animate-spin' : ''}`} aria-hidden="true">
                                {isBulkUpdating ? 'progress_activity' : 'lock_open'}
                            </span>
                            Mở khóa ({deactivatedCount})
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClear}
                        disabled={isBulkUpdating}
                        className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        Bỏ chọn
                    </button>
                </div>
            </div>
        </div>
    );
}

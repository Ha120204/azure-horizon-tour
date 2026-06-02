'use client';

interface TourBulkActionBarProps {
    selectedCount: number;
    submitCount: number;
    hideCount: number;
    isStaff: boolean;
    isAdmin: boolean;
    isBulkDeleting: boolean;
    isBulkSubmitting?: boolean;
    onClear: () => void;
    onConfirm: () => void;
    onBulkSubmit?: () => void;
    onBulkExport?: () => void;
}

export function TourBulkActionBar({
    selectedCount,
    submitCount,
    hideCount,
    isStaff,
    isAdmin,
    isBulkDeleting,
    isBulkSubmitting = false,
    onClear,
    onConfirm,
    onBulkSubmit,
    onBulkExport,
}: TourBulkActionBarProps) {
    if (selectedCount === 0) return null;

    const isAnyLoading = isBulkDeleting || isBulkSubmitting;
    const selectedLabel = `Đã chọn ${selectedCount} tour`;

    return (
        <div
            role="toolbar"
            aria-label={selectedLabel}
            className="sticky top-0 z-30 mb-3 rounded-xl border border-primary/20 bg-surface-container-lowest/95 px-3 py-2.5 shadow-sm ring-1 ring-primary/5 backdrop-blur animate-in slide-in-from-top-2 duration-200"
        >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                        <span className="material-symbols-outlined text-[18px]">checklist</span>
                    </span>
                    <p className="truncate text-sm font-semibold text-on-surface">
                        Đã chọn <strong className="text-primary">{selectedCount}</strong> tour
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {onBulkExport && (
                        <button
                            type="button"
                            onClick={onBulkExport}
                            disabled={isAnyLoading}
                            title={`Xuất ${selectedCount} tour đã chọn ra CSV`}
                            aria-label={`Xuất ${selectedCount} tour đã chọn ra CSV`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant/20 bg-surface px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
                            Xuất CSV ({selectedCount})
                        </button>
                    )}

                    {isStaff && onBulkSubmit && submitCount > 0 && (
                        <button
                            type="button"
                            onClick={onBulkSubmit}
                            disabled={isAnyLoading}
                            title={`Gửi ${submitCount} tour để Admin duyệt`}
                            aria-label={`Gửi ${submitCount} tour để Admin duyệt`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-300/40 bg-blue-500/10 px-3 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-500/20 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                        >
                            {isBulkSubmitting ? (
                                <span className="material-symbols-outlined text-[14px] animate-spin" aria-hidden="true">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">send</span>
                            )}
                            Gửi duyệt ({submitCount})
                        </button>
                    )}

                    {hideCount > 0 && (
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isAnyLoading}
                            title={`Chuyển ${hideCount} tour vào thùng rác`}
                            aria-label={`Chuyển ${hideCount} tour vào thùng rác`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-500 outline-none"
                        >
                            {isBulkDeleting ? (
                                <span className="material-symbols-outlined text-[14px] animate-spin" aria-hidden="true">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">hide_source</span>
                            )}
                            {isAdmin ? `Ẩn tour (${hideCount})` : `Xóa bản nháp (${hideCount})`}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClear}
                        disabled={isAnyLoading}
                        className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        Bỏ chọn
                    </button>
                </div>
            </div>
        </div>
    );
}

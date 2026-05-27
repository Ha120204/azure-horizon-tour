'use client';

interface TourBulkActionBarProps {
    selectedCount: number;
    isBulkDeleting: boolean;
    onClear: () => void;
    onConfirm: () => void;
}

export function TourBulkActionBar({ selectedCount, isBulkDeleting, onClear, onConfirm }: TourBulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="mb-4 flex items-center gap-3 px-5 py-3.5 bg-primary/5 border border-primary/20 rounded-2xl animate-in slide-in-from-top-2 duration-200">
            <span className="material-symbols-outlined text-primary text-[20px]">checklist</span>
            <span className="text-sm font-semibold text-on-surface flex-1">
                Đã chọn <strong className="text-primary">{selectedCount}</strong> tour
            </span>
            <button
                onClick={onClear}
                className="text-xs text-on-surface-variant hover:text-on-surface font-medium px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
            >
                Bỏ chọn
            </button>
            <button
                onClick={onConfirm}
                disabled={isBulkDeleting}
                className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
                {isBulkDeleting ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                ) : (
                    <span className="material-symbols-outlined text-[16px]">hide_source</span>
                )}
                Ẩn {selectedCount} tour
            </button>
        </div>
    );
}

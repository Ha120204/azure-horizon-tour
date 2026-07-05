import AdminPagination from '@/components/admin/AdminPagination';
import type { ReactNode } from 'react';
import { KpiCard } from './KpiCard';
import { ReviewCard } from './ReviewCard';
import { SkeletonCard } from './SkeletonCard';
import type { AdminStats, Meta, Review, ReviewKpiItem } from '../_lib/types';

export function ReviewPageHeader({ onRefresh }: { onRefresh: () => void }) {
    return (
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
                <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface">
                    Quản lý đánh giá
                </h1>
                <p className="text-on-surface-variant text-sm mt-1">
                    Kiểm duyệt, phản hồi và quản lý nhận xét từ khách hàng.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    Làm mới
                </button>
            </div>
        </div>
    );
}

export function ReviewKpiGrid({ kpis }: { kpis: ReviewKpiItem[] }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </div>
    );
}

interface ReviewQuickFiltersProps {
    activeQuickFilter: string;
    onQuickFilter: (filter: 'all' | 'unreplied' | 'low' | 'replied' | 'hidden') => void;
}

export function ReviewQuickFilters({ activeQuickFilter, onQuickFilter }: ReviewQuickFiltersProps) {
    const filters = [
        { key: 'all', label: 'Tất cả', icon: 'rate_review' },
        { key: 'unreplied', label: 'Chưa phản hồi', icon: 'forum' },
        { key: 'low', label: 'Cần kiểm tra', icon: 'report' },
        { key: 'replied', label: 'Đã phản hồi', icon: 'mark_chat_read' },
        { key: 'hidden', label: 'Đang ẩn', icon: 'visibility_off' },
    ] as const;

    return (
        <div className="mb-5 flex flex-wrap items-center gap-2">
            {filters.map((filter) => {
                const isActive = activeQuickFilter === filter.key;
                return (
                    <button
                        key={filter.key}
                        type="button"
                        onClick={() => onQuickFilter(filter.key)}
                        aria-pressed={isActive}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${isActive
                            ? 'border-primary/35 bg-primary text-white shadow-sm shadow-primary/20'
                            : 'border-outline-variant/15 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[17px]">{filter.icon}</span>
                        {filter.label}
                    </button>
                );
            })}
        </div>
    );
}

interface RatingBreakdownProps {
    stats: AdminStats;
    selectedRatings: string[];
    onRatingClick: (rating: string) => void;
}

export function RatingBreakdown({ stats, selectedRatings, onRatingClick }: RatingBreakdownProps) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-5 mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">bar_chart</span>
                Phân bố đánh giá
            </p>
            <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                    const count = stats.breakdown[star] ?? 0;
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                        <button
                            key={star}
                            type="button"
                            onClick={() => onRatingClick(String(star))}
                            className={`w-full flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedRatings.includes(String(star)) ? 'bg-primary/5' : 'hover:bg-surface-container'}`}
                        >
                            <div className="flex items-center gap-1 w-14 shrink-0">
                                <span className="text-xs font-semibold text-on-surface-variant">{star}</span>
                                <span className="material-symbols-outlined text-amber-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            </div>
                            <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span className="text-xs text-on-surface-variant w-16 text-right shrink-0">{count} ({pct}%)</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface ReviewFiltersProps {
    search: string;
    ratingFilter: string;
    statusFilter: string;
    replyFilter: string;
    sortBy: string;
    hasFilter: boolean;
    isLoading: boolean;
    totalItems: number;
    onSearchChange: (value: string) => void;
    onRatingChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onReplyChange: (value: string) => void;
    onSortChange: (value: string) => void;
    onReset: () => void;
}

export function ReviewFilters({
    search,
    ratingFilter,
    statusFilter,
    replyFilter,
    sortBy,
    hasFilter,
    isLoading,
    totalItems,
    onSearchChange,
    onRatingChange,
    onStatusChange,
    onReplyChange,
    onSortChange,
    onReset,
}: ReviewFiltersProps) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-4 mb-5">
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[220px] relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">search</span>
                    <input
                        id="rv-search"
                        type="search"
                        aria-label="Tìm kiếm đánh giá"
                        placeholder="Tìm theo khách hàng, tour, nội dung…"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                    />
                </div>

                <SelectFilter id="rv-rating" label="Lọc theo số sao" value={ratingFilter} onChange={onRatingChange}>
                    <option value="">Tất cả sao</option>
                    <option value="1,2">⭐-⭐⭐ Cần kiểm tra</option>
                    <option value="5">⭐⭐⭐⭐⭐ 5 sao</option>
                    <option value="4">⭐⭐⭐⭐ 4 sao</option>
                    <option value="3">⭐⭐⭐ 3 sao</option>
                    <option value="2">⭐⭐ 2 sao</option>
                    <option value="1">⭐ 1 sao</option>
                </SelectFilter>

                <SelectFilter id="rv-status" label="Lọc theo trạng thái hiển thị" value={statusFilter} onChange={onStatusChange}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="visible">Đang hiển thị</option>
                    <option value="hidden">Đang ẩn</option>
                </SelectFilter>

                <SelectFilter id="rv-reply-status" label="Lọc theo trạng thái phản hồi" value={replyFilter} onChange={onReplyChange}>
                    <option value="">Tất cả phản hồi</option>
                    <option value="unreplied">Chưa phản hồi</option>
                    <option value="replied">Đã phản hồi</option>
                </SelectFilter>

                <SelectFilter id="rv-sort" label="Sắp xếp đánh giá" value={sortBy} onChange={onSortChange}>
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="rating_desc">Sao cao nhất</option>
                    <option value="rating_asc">Sao thấp nhất</option>
                </SelectFilter>

                {hasFilter && (
                    <button
                        onClick={onReset}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-error border border-error/30 hover:bg-error/5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                        Xóa lọc
                    </button>
                )}

                {!isLoading && (
                    <span className="ml-auto text-xs text-on-surface-variant whitespace-nowrap font-medium">
                        {totalItems.toLocaleString('vi-VN')} đánh giá
                    </span>
                )}
            </div>

            <ActiveFilterSummary
                search={search}
                ratingFilter={ratingFilter}
                statusFilter={statusFilter}
                replyFilter={replyFilter}
                sortBy={sortBy}
                hasFilter={hasFilter}
                onSearchChange={onSearchChange}
                onRatingChange={onRatingChange}
                onStatusChange={onStatusChange}
                onReplyChange={onReplyChange}
                onSortChange={onSortChange}
                onReset={onReset}
            />
        </div>
    );
}

function ActiveFilterSummary({
    search,
    ratingFilter,
    statusFilter,
    replyFilter,
    sortBy,
    hasFilter,
    onSearchChange,
    onRatingChange,
    onStatusChange,
    onReplyChange,
    onSortChange,
    onReset,
}: Pick<ReviewFiltersProps,
    'search' | 'ratingFilter' | 'statusFilter' | 'replyFilter' | 'sortBy' | 'hasFilter' |
    'onSearchChange' | 'onRatingChange' | 'onStatusChange' | 'onReplyChange' | 'onSortChange' | 'onReset'
>) {
    if (!hasFilter) return null;

    const chips = [
        search ? { key: 'search', label: `Từ khóa: ${search}`, onRemove: () => onSearchChange('') } : null,
        ratingFilter ? { key: 'rating', label: ratingFilter === '1,2' ? '1-2 sao cần kiểm tra' : `${ratingFilter} sao`, onRemove: () => onRatingChange('') } : null,
        statusFilter ? { key: 'status', label: statusFilter === 'hidden' ? 'Đang ẩn' : 'Đang hiển thị', onRemove: () => onStatusChange('') } : null,
        replyFilter ? { key: 'reply', label: replyFilter === 'unreplied' ? 'Chưa phản hồi' : 'Đã phản hồi', onRemove: () => onReplyChange('') } : null,
        sortBy !== 'newest' ? { key: 'sort', label: sortLabel(sortBy), onRemove: () => onSortChange('newest') } : null,
    ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;

    return (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant/10 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Đang xem
            </span>
            {chips.map((chip) => (
                <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                    title={`Bỏ lọc ${chip.label}`}
                >
                    {chip.label}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
            ))}
            <button
                type="button"
                onClick={onReset}
                className="ml-auto text-xs font-bold text-on-surface-variant hover:text-primary"
            >
                Xóa tất cả
            </button>
        </div>
    );
}

function sortLabel(sortBy: string) {
    switch (sortBy) {
        case 'oldest':
            return 'Cũ nhất';
        case 'rating_desc':
            return 'Sao cao nhất';
        case 'rating_asc':
            return 'Sao thấp nhất';
        default:
            return 'Mới nhất';
    }
}

function SelectFilter({
    id,
    label,
    value,
    onChange,
    children,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <select
            id={id}
            aria-label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
            {children}
        </select>
    );
}

interface ReviewListProps {
    reviews: Review[];
    locale: string;
    isLoading: boolean;
    hasFilter: boolean;
    selected: number[];
    isAllSelected: boolean;
    loadingId: number | null;
    meta: Meta;
    pageSize: number;
    onToggleSelectAll: () => void;
    onToggleSelect: (id: number) => void;
    onToggleVisibility: (review: Review) => void;
    onDelete: (ids: number[]) => void;
    onReply: (review: Review) => void;
    onImageClick: (images: string[], idx: number) => void;
    onResetFilters: () => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

export function ReviewList({
    reviews,
    locale,
    isLoading,
    hasFilter,
    selected,
    isAllSelected,
    loadingId,
    meta,
    pageSize,
    onToggleSelectAll,
    onToggleSelect,
    onToggleVisibility,
    onDelete,
    onReply,
    onImageClick,
    onResetFilters,
    onPageChange,
    onPageSizeChange,
}: ReviewListProps) {
    return (
        <>
            {!isLoading && reviews.length > 0 && (
                <div className="flex items-center gap-3 mb-3 px-1">
                    <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={onToggleSelectAll}
                        className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-on-surface-variant font-medium">
                        {isAllSelected ? `Đã chọn tất cả ${reviews.length}` : 'Chọn tất cả trên trang này'}
                    </span>
                </div>
            )}

            <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => <SkeletonCard key={index} />)
                ) : reviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
                        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-outline">rate_review</span>
                        </div>
                        <p className="font-bold text-on-surface">Không tìm thấy đánh giá nào</p>
                        <p className="text-sm text-on-surface-variant mt-1 mb-4">
                            {hasFilter ? 'Thử thay đổi bộ lọc để xem kết quả.' : 'Chưa có đánh giá nào trong hệ thống.'}
                        </p>
                        {hasFilter && (
                            <button onClick={onResetFilters} className="text-sm text-primary font-semibold hover:underline">
                                Xóa tất cả bộ lọc
                            </button>
                        )}
                    </div>
                ) : (
                    reviews.map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            locale={locale}
                            isSelected={selected.includes(review.id)}
                            onToggleSelect={() => onToggleSelect(review.id)}
                            onToggleVisibility={() => onToggleVisibility(review)}
                            onDelete={() => onDelete([review.id])}
                            onReply={() => onReply(review)}
                            onImageClick={(idx) => onImageClick(review.imageUrls, idx)}
                            loadingId={loadingId}
                        />
                    ))
                )}
            </div>

            <div className="mt-8">
                <AdminPagination
                    currentPage={meta.currentPage}
                    totalPages={meta.totalPages}
                    totalItems={meta.totalItems}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                    itemLabel="đánh giá"
                />
            </div>
        </>
    );
}

interface ReviewBulkActionBarProps {
    selectedCount: number;
    selectedReviews: Review[];
    bulkLoading: boolean;
    onBulkVisibility: (isHidden: boolean) => void;
    onBulkDelete: () => void;
    onExport: () => void;
    onClear: () => void;
}

export function ReviewBulkActionBar({
    selectedCount,
    selectedReviews,
    bulkLoading,
    onBulkVisibility,
    onBulkDelete,
    onExport,
    onClear,
}: ReviewBulkActionBarProps) {
    if (selectedCount === 0) return null;
    const lowRatingCount = selectedReviews.filter((review) => review.rating <= 2).length;
    const unrepliedCount = selectedReviews.filter((review) => !review.adminReply?.trim()).length;
    const visibleCount = selectedReviews.filter((review) => !review.isHidden).length;
    const hiddenCount = selectedReviews.filter((review) => review.isHidden).length;
    const selectedLabel = `Đã chọn ${selectedCount} đánh giá`;

    return (
        <div
            role="toolbar"
            aria-label={selectedLabel}
            className="sticky top-0 z-30 mb-3 rounded-xl border border-primary/20 bg-surface-container-lowest/95 px-3 py-2.5 shadow-sm ring-1 ring-primary/5 backdrop-blur"
        >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                        <span className="material-symbols-outlined text-[18px]">checklist</span>
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-on-surface">
                            Đã chọn <strong className="text-primary">{selectedCount}</strong> đánh giá
                        </p>
                        <p className="text-xs text-on-surface-variant">
                            {lowRatingCount} cần kiểm tra · {unrepliedCount} chưa phản hồi
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <button
                        type="button"
                        onClick={onExport}
                        disabled={bulkLoading}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant/20 bg-surface px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
                        Xuất CSV ({selectedCount})
                    </button>

                    {visibleCount > 0 && (
                        <button
                            type="button"
                            onClick={() => onBulkVisibility(true)}
                            disabled={bulkLoading}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                            <span className={`material-symbols-outlined text-[14px] ${bulkLoading ? 'animate-spin' : ''}`} aria-hidden="true">
                                {bulkLoading ? 'progress_activity' : 'visibility_off'}
                            </span>
                            Ẩn ({visibleCount})
                        </button>
                    )}

                    {hiddenCount > 0 && (
                        <button
                            type="button"
                            onClick={() => onBulkVisibility(false)}
                            disabled={bulkLoading}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <span className={`material-symbols-outlined text-[14px] ${bulkLoading ? 'animate-spin' : ''}`} aria-hidden="true">
                                {bulkLoading ? 'progress_activity' : 'visibility'}
                            </span>
                            Hiện lại ({hiddenCount})
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onBulkDelete}
                        disabled={bulkLoading}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">delete</span>
                        Xóa ({selectedCount})
                    </button>

                    <button
                        type="button"
                        onClick={onClear}
                        disabled={bulkLoading}
                        className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        Bỏ chọn
                    </button>
                </div>
            </div>
        </div>
    );
}

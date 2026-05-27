'use client';

import type { Destination } from '../_lib/types';

interface TourFiltersProps {
    searchInput: string;
    destinations: Destination[];
    filterDest: string;
    sortBy: string;
    filterStatus: string;
    isAdmin: boolean;
    isStaff: boolean;
    onSearchInputChange: (value: string) => void;
    onFilterDestChange: (value: string) => void;
    onSortByChange: (value: string) => void;
    onFilterStatusChange: (value: string) => void;
}

export function TourFilters({
    searchInput,
    destinations,
    filterDest,
    sortBy,
    filterStatus,
    isAdmin,
    isStaff,
    onSearchInputChange,
    onFilterDestChange,
    onSortByChange,
    onFilterStatusChange,
}: TourFiltersProps) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 border border-outline-variant/10 shadow-sm flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[220px] relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none" aria-hidden="true">search</span>
                <label htmlFor="search-tours" className="sr-only">Tìm kiếm tour</label>
                <input
                    id="search-tours"
                    name="search"
                    type="search"
                    autoComplete="off"
                    placeholder="Tìm tour theo tên hoặc điểm đến…"
                    value={searchInput}
                    onChange={e => onSearchInputChange(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                />
            </div>
            <div className="flex gap-3 flex-wrap">
                <label htmlFor="filter-dest" className="sr-only">Lọc theo điểm đến</label>
                <select
                    id="filter-dest"
                    value={filterDest}
                    onChange={e => onFilterDestChange(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                >
                    <option value="">Tất cả điểm đến</option>
                    {destinations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
                <label htmlFor="sort-tours" className="sr-only">Sắp xếp</label>
                <select
                    id="sort-tours"
                    value={sortBy}
                    onChange={e => onSortByChange(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                >
                    <option value="recommended">Đề xuất</option>
                    <option value="priceLowHigh">Giá: Thấp → Cao</option>
                    <option value="priceHighLow">Giá: Cao → Thấp</option>
                </select>
                {(isAdmin || isStaff) && (
                    <>
                        <label htmlFor="filter-status" className="sr-only">Lọc theo trạng thái</label>
                        <select
                            id="filter-status"
                            value={filterStatus}
                            onChange={e => onFilterStatusChange(e.target.value)}
                            className={`border rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors ${filterStatus
                                ? 'bg-primary/10 border-primary/40 font-semibold'
                                : 'bg-surface-container-low border-outline-variant/15'
                                }`}
                        >
                            <option value="">Tất cả trạng thái</option>
                            {isStaff && <option value="DRAFT">📝 Bản nháp</option>}
                            {isStaff && <option value="PENDING_REVIEW">⏳ Chờ duyệt</option>}
                            {isStaff && <option value="REJECTED">❌ Bị từ chối</option>}
                            {isStaff && <option value="PUBLISHED">✅ Đã duyệt</option>}
                            {isAdmin && <option value="DRAFT">📝 Bản nháp</option>}
                            {isAdmin && <option value="PUBLISHED">✅ Đã duyệt</option>}
                            {isAdmin && <option value="PENDING_REVIEW">⏳ Chờ duyệt</option>}
                            {isAdmin && <option value="REJECTED">❌ Bị từ chối</option>}
                            {isAdmin && <option value="COMPLETED">🏁 Đã kết thúc</option>}
                        </select>
                    </>
                )}
            </div>
        </div>
    );
}

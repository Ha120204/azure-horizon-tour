'use client';

import { useMemo } from 'react';
import type { Destination } from '../_lib/types';
import { TourFilterSelect, type TourFilterSelectOption } from './TourFilterSelect';

interface TourFiltersProps {
    searchInput: string;
    destinations: Destination[];
    filterDest: string;
    sortBy: string;
    filterStatus: string;
    filterSale: boolean;
    filterDateFrom: string;
    filterDateTo: string;
    filterSeats: string;
    isAdmin: boolean;
    isStaff: boolean;
    onSearchInputChange: (value: string) => void;
    onFilterDestChange: (value: string) => void;
    onSortByChange: (value: string) => void;
    onFilterStatusChange: (value: string) => void;
    onFilterSaleChange: () => void;
    onFilterDateFromChange: (value: string) => void;
    onFilterDateToChange: (value: string) => void;
    onFilterSeatsChange: (value: string) => void;
}

const SORT_OPTIONS: TourFilterSelectOption[] = [
    { value: 'recommended', label: 'Mới nhất', description: 'Tour mới cập nhật lên trước', icon: 'schedule' },
    { value: 'startDateAsc', label: 'Ngày KH: Gần nhất', description: 'Ưu tiên ngày khởi hành sắp tới', icon: 'event_upcoming' },
    { value: 'startDateDesc', label: 'Ngày KH: Xa nhất', description: 'Ưu tiên lịch khởi hành xa hơn', icon: 'event' },
    { value: 'priceLowHigh', label: 'Giá: Thấp đến cao', description: 'Tour rẻ hơn lên trước', icon: 'south_east' },
    { value: 'priceHighLow', label: 'Giá: Cao đến thấp', description: 'Tour giá cao lên trước', icon: 'north_east' },
    { value: 'ratingDesc', label: 'Rating: Cao đến thấp', description: 'Tour được đánh giá tốt hơn lên trước', icon: 'star' },
    { value: 'seatsAsc', label: 'Ghế còn: Ít nhất', description: 'Dễ phát hiện tour sắp đầy', icon: 'airline_seat_recline_normal' },
];

const STAFF_STATUS_OPTIONS: TourFilterSelectOption[] = [
    { value: '', label: 'Tất cả trạng thái', description: 'Không giới hạn trạng thái', icon: 'filter_list' },
    { value: 'DRAFT', label: 'Bản nháp', description: 'Tour đang soạn nội dung', icon: 'edit_note' },
    { value: 'PENDING_REVIEW', label: 'Chờ duyệt', description: 'Đang chờ admin kiểm tra', icon: 'hourglass_top' },
    { value: 'REJECTED', label: 'Bị từ chối', description: 'Cần chỉnh sửa trước khi gửi lại', icon: 'cancel' },
    { value: 'PUBLISHED', label: 'Đã duyệt', description: 'Tour đang hiển thị cho khách', icon: 'verified' },
];

const ADMIN_STATUS_OPTIONS: TourFilterSelectOption[] = [
    ...STAFF_STATUS_OPTIONS,
    { value: 'COMPLETED', label: 'Đã kết thúc', description: 'Tour đã qua ngày khởi hành', icon: 'flag' },
];

const SEAT_OPTIONS: TourFilterSelectOption[] = [
    { value: '', label: 'Tất cả', description: 'Không lọc theo số ghế', icon: 'event_seat' },
    { value: 'available', label: 'Còn chỗ', description: 'Dưới 80% số ghế đã được đặt', icon: 'check_circle' },
    { value: 'filling', label: 'Sắp hết', description: 'Đã đặt khoảng 80-95% số ghế', icon: 'trending_up' },
    { value: 'almostFull', label: 'Gần đầy', description: 'Trên 95% số ghế đã được đặt', icon: 'priority_high' },
    { value: 'soldOut', label: 'Hết chỗ', description: 'Không còn ghế trống', icon: 'block' },
];

export function TourFilters({
    searchInput,
    destinations,
    filterDest,
    sortBy,
    filterStatus,
    filterSale,
    filterDateFrom,
    filterDateTo,
    filterSeats,
    isAdmin,
    isStaff,
    onSearchInputChange,
    onFilterDestChange,
    onSortByChange,
    onFilterStatusChange,
    onFilterSaleChange,
    onFilterDateFromChange,
    onFilterDateToChange,
    onFilterSeatsChange,
}: TourFiltersProps) {
    const hasDateFilter = Boolean(filterDateFrom || filterDateTo);
    const hasSeatsFilter = Boolean(filterSeats);
    const statusOptions = isAdmin ? ADMIN_STATUS_OPTIONS : STAFF_STATUS_OPTIONS;
    const destinationOptions = useMemo<TourFilterSelectOption[]>(
        () => [
            { value: '', label: 'Tất cả điểm đến', description: 'Không giới hạn điểm đến', icon: 'travel_explore' },
            ...destinations.map(destination => ({
                value: String(destination.id),
                label: destination.name,
                description: 'Lọc theo điểm đến',
                icon: 'location_on',
            })),
        ],
        [destinations],
    );

    return (
        <div className="mb-6 space-y-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] flex-1">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant" aria-hidden="true">search</span>
                    <label htmlFor="search-tours" className="sr-only">Tìm kiếm tour</label>
                    <input
                        id="search-tours"
                        name="search"
                        type="search"
                        autoComplete="off"
                        placeholder="Tìm tour theo tên hoặc điểm đến..."
                        value={searchInput}
                        onChange={event => onSearchInputChange(event.target.value)}
                        className="w-full rounded-xl border border-outline-variant/15 bg-surface-container-low py-2.5 pl-11 pr-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <TourFilterSelect
                        value={filterDest}
                        options={destinationOptions}
                        onChange={onFilterDestChange}
                        ariaLabel="Lọc theo điểm đến"
                        active={Boolean(filterDest)}
                        className="w-[260px] max-w-full"
                    />
                    <TourFilterSelect
                        value={sortBy}
                        options={SORT_OPTIONS}
                        onChange={onSortByChange}
                        ariaLabel="Sắp xếp danh sách tour"
                        active={sortBy !== 'recommended'}
                        className="w-[250px] max-w-full"
                    />
                    {(isAdmin || isStaff) && (
                        <TourFilterSelect
                            value={filterStatus}
                            options={statusOptions}
                            onChange={onFilterStatusChange}
                            ariaLabel="Lọc theo trạng thái"
                            active={Boolean(filterStatus)}
                            className="w-[220px] max-w-full"
                        />
                    )}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={onFilterSaleChange}
                            aria-pressed={filterSale}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                filterSale
                                    ? 'border-rose-400/60 bg-rose-50 text-rose-700 ring-1 ring-rose-400/40'
                                    : 'border-outline-variant/15 bg-surface-container-low text-on-surface-variant hover:border-rose-300/50 hover:bg-rose-50/60 hover:text-rose-600'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true" style={{ fontVariationSettings: filterSale ? "'FILL' 1" : "'FILL' 0" }}>local_offer</span>
                            Đang Sale
                            {filterSale && (
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant/8 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="material-symbols-outlined shrink-0 text-[16px] text-on-surface-variant" aria-hidden="true">calendar_month</span>
                    <span className="whitespace-nowrap text-xs font-semibold text-on-surface-variant">Ngày KH:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <label htmlFor="filter-date-from" className="sr-only">Từ ngày khởi hành</label>
                        <input
                            id="filter-date-from"
                            type="date"
                            value={filterDateFrom}
                            onChange={event => onFilterDateFromChange(event.target.value)}
                            title="Từ ngày khởi hành"
                            className={`cursor-pointer rounded-xl border px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                                filterDateFrom
                                    ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                                    : 'border-outline-variant/15 bg-surface-container-low text-on-surface'
                            }`}
                        />
                        <span className="text-xs font-medium text-on-surface-variant">→</span>
                        <label htmlFor="filter-date-to" className="sr-only">Đến ngày khởi hành</label>
                        <input
                            id="filter-date-to"
                            type="date"
                            value={filterDateTo}
                            min={filterDateFrom || undefined}
                            onChange={event => onFilterDateToChange(event.target.value)}
                            title="Đến ngày khởi hành"
                            className={`cursor-pointer rounded-xl border px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                                filterDateTo
                                    ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                                    : 'border-outline-variant/15 bg-surface-container-low text-on-surface'
                            }`}
                        />
                        {hasDateFilter && (
                            <button
                                type="button"
                                onClick={() => {
                                    onFilterDateFromChange('');
                                    onFilterDateToChange('');
                                }}
                                title="Xóa filter ngày"
                                aria-label="Xóa filter ngày khởi hành"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant outline-none transition-colors hover:bg-error/10 hover:text-error focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">close</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined shrink-0 text-[16px] text-on-surface-variant" aria-hidden="true">airline_seat_recline_normal</span>
                    <span className="whitespace-nowrap text-xs font-semibold text-on-surface-variant">Chỗ trống:</span>
                    <TourFilterSelect
                        value={filterSeats}
                        options={SEAT_OPTIONS}
                        onChange={onFilterSeatsChange}
                        ariaLabel="Lọc theo số chỗ trống"
                        active={hasSeatsFilter}
                        className="w-[230px] max-w-full"
                    />
                </div>

                {(hasDateFilter || hasSeatsFilter) && (
                    <button
                        type="button"
                        onClick={() => {
                            onFilterDateFromChange('');
                            onFilterDateToChange('');
                            onFilterSeatsChange('');
                        }}
                        aria-label="Xóa tất cả filter nâng cao"
                        className="ml-auto flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant outline-none transition-colors hover:bg-error/10 hover:text-error focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-outlined text-[13px]" aria-hidden="true">filter_alt_off</span>
                        Xóa filter nâng cao
                    </button>
                )}
            </div>
        </div>
    );
}

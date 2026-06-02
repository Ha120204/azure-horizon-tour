import { CustomerSelect, type CustomerSelectOption } from './CustomerSelect';
import type { CustomerBookingFilter, CustomerSegmentFilter } from '../_lib/types';

interface CustomerFiltersProps {
    search: string;
    filterStatus: string;
    bookingFilter: CustomerBookingFilter;
    segmentFilter: CustomerSegmentFilter;
    totalItems: number;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onBookingFilterChange: (value: CustomerBookingFilter) => void;
    onSegmentFilterChange: (value: CustomerSegmentFilter) => void;
    onResetFilters: () => void;
}

const STATUS_OPTIONS: CustomerSelectOption[] = [
    { value: '', label: 'Tất cả trạng thái', description: 'Hiển thị mọi khách hàng', icon: 'filter_list' },
    { value: 'active', label: 'Hoạt động', description: 'Tài khoản đang sử dụng bình thường', icon: 'check_circle' },
    { value: 'deactivated', label: 'Đã khóa', description: 'Tài khoản đang bị khóa', icon: 'lock' },
];

const BOOKING_OPTIONS: CustomerSelectOption[] = [
    { value: '', label: 'Tất cả booking', description: 'Không lọc theo lịch sử đặt tour', icon: 'luggage' },
    { value: 'has_bookings', label: 'Đã từng đặt', description: 'Khách có ít nhất một booking', icon: 'verified' },
    { value: 'no_bookings', label: 'Chưa đặt tour', description: 'Khách chưa phát sinh booking', icon: 'person_search' },
];

const SEGMENT_OPTIONS: CustomerSelectOption[] = [
    { value: '', label: 'Tất cả phân khúc', description: 'Không áp dụng phân khúc nhanh', icon: 'tune' },
    { value: 'new_7_days', label: 'Mới 7 ngày', description: 'Tài khoản tạo trong 7 ngày gần đây', icon: 'fiber_new' },
    { value: 'new_30_days', label: 'Mới 30 ngày', description: 'Tài khoản tạo trong 30 ngày gần đây', icon: 'calendar_month' },
    { value: 'has_phone', label: 'Có SĐT', description: 'Thông tin liên hệ đủ số điện thoại', icon: 'phone_enabled' },
    { value: 'missing_phone', label: 'Thiếu SĐT', description: 'Cần bổ sung số điện thoại', icon: 'phone_disabled' },
];

export function CustomerFilters({
    search,
    filterStatus,
    bookingFilter,
    segmentFilter,
    totalItems,
    onSearchChange,
    onStatusChange,
    onBookingFilterChange,
    onSegmentFilterChange,
    onResetFilters,
}: CustomerFiltersProps) {
    const hasActiveFilters = Boolean(search || filterStatus || bookingFilter || segmentFilter);

    return (
        <div className="mb-6 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[280px] flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none" aria-hidden="true">search</span>
                    <label htmlFor="search-users" className="sr-only">Tìm kiếm khách hàng</label>
                    <input
                        id="search-users"
                        type="search"
                        autoComplete="off"
                        placeholder="Tìm theo tên, email, SĐT hoặc ID…"
                        value={search}
                        onChange={event => onSearchChange(event.target.value)}
                        className="w-full rounded-xl border border-outline-variant/15 bg-surface-container-low py-2.5 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-on-surface-variant/50 focus-visible:ring-2 focus-visible:ring-primary"
                    />
                </div>

                <CustomerSelect
                    value={filterStatus}
                    options={STATUS_OPTIONS}
                    onChange={onStatusChange}
                    ariaLabel="Lọc trạng thái khách hàng"
                    active={Boolean(filterStatus)}
                    className="w-[190px] max-w-full"
                />

                <CustomerSelect
                    value={bookingFilter}
                    options={BOOKING_OPTIONS}
                    onChange={value => onBookingFilterChange(value as CustomerBookingFilter)}
                    ariaLabel="Lọc theo lịch sử booking"
                    active={Boolean(bookingFilter)}
                    className="w-[190px] max-w-full"
                />

                <CustomerSelect
                    value={segmentFilter}
                    options={SEGMENT_OPTIONS}
                    onChange={value => onSegmentFilterChange(value as CustomerSegmentFilter)}
                    ariaLabel="Lọc phân khúc khách hàng"
                    active={Boolean(segmentFilter)}
                    className="w-[200px] max-w-full"
                />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium text-on-surface-variant" aria-live="polite">
                    {totalItems.toLocaleString('vi-VN')} khách hàng
                </span>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onResetFilters}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant/20 px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">filter_alt_off</span>
                        Xóa lọc
                    </button>
                )}
            </div>
        </div>
    );
}

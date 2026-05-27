interface CustomerFiltersProps {
    search: string;
    filterStatus: string;
    totalItems: number;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
}

export function CustomerFilters({
    search,
    filterStatus,
    totalItems,
    onSearchChange,
    onStatusChange,
}: CustomerFiltersProps) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 border border-outline-variant/10 shadow-sm flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[260px] relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none" aria-hidden="true">search</span>
                <label htmlFor="search-users" className="sr-only">Tìm kiếm khách hàng</label>
                <input
                    id="search-users"
                    type="search"
                    autoComplete="off"
                    placeholder="Tìm theo tên, email hoặc số điện thoại…"
                    value={search}
                    onChange={event => onSearchChange(event.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors placeholder:text-on-surface-variant/50"
                />
            </div>
            <div className="flex gap-3 flex-wrap items-center">
                <select
                    id="filter-status"
                    value={filterStatus}
                    onChange={event => onStatusChange(event.target.value)}
                    className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Hoạt động</option>
                    <option value="deactivated">Đã khóa</option>
                </select>

                <span className="text-xs text-on-surface-variant font-medium px-2" aria-live="polite">
                    {totalItems} khách hàng
                </span>
            </div>
        </div>
    );
}

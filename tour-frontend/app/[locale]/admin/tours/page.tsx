'use client';

import { useState, useEffect, useCallback } from 'react';
import TourFormModal from '@/app/components/admin/TourFormModal';
import TourContentDrawer from '@/app/components/admin/TourContentDrawer';
import AdminPagination from '@/app/components/admin/AdminPagination';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

// ── Types ────────────────────────────────────────────────────────────
interface Tour {
    id: number;
    name: string;
    imageUrl: string;
    price: number;
    availableSeats: number;
    duration: string;
    tourType: string;
    averageRating: number;
    startDate: string;
    destination: { id: number; name: string };
}

interface Destination { id: number; name: string; }

interface ToastState { message: string; type: 'success' | 'error' }

type ModalMode = 'create' | 'edit' | null;

// ── Helpers ──────────────────────────────────────────────────────────
// Format full: 1.500.000 ₫
const formatCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

// Format compact for KPI card: 1,5 tr ₫ / 2 tỷ ₫
const formatCurrencyCompact = (n: number): string => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ ₫`;
    if (n >= 1_000_000)     return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr ₫`;
    return formatCurrency(n);
};

const formatDate = (d: string) =>
    new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

const getStatusLabel = (seats: number): { label: string; cls: string } => {
    if (seats === 0) return { label: 'Full', cls: 'bg-error/10 text-error' };
    if (seats <= 5)  return { label: 'Sắp đầy', cls: 'bg-amber-500/10 text-amber-600' };
    return { label: 'Available', cls: 'bg-tertiary/10 text-tertiary' };
};

// ── Main Component ───────────────────────────────────────────────────
export default function AdminToursPage() {
    // State: data
    const [tours, setTours] = useState<Tour[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [meta, setMeta] = useState({ totalItems: 0, totalPages: 1, currentPage: 1 });

    // State: filters
    const [searchInput, setSearchInput] = useState('')   // giá trị hiển thị ngay
    const [search, setSearch] = useState('')             // giá trị gửi API (debounced)
    const [filterDest, setFilterDest] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sortBy, setSortBy] = useState('recommended');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);


    // State: UI
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [contentDrawerTour, setContentDrawerTour] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    // State: Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // State: Aggregate stats (tính trên toàn bộ hệ thống, không chỉ trang hiện tại)
    const [tourStats, setTourStats] = useState({ active: 0, totalSeats: 0, avgPrice: 0, loaded: false });

    // ── Fetch ──────────────────────────────────────────────────────
    const fetchTours = useCallback(async () => {
        setIsLoading(true);
        try {
            const qs = new URLSearchParams();
            if (search) qs.append('dest', search);
            if (filterDest) qs.append('dest', filterDest);
            qs.append('sortBy', sortBy);
            qs.append('page', String(page));
            qs.append('limit', String(pageSize));

            const res = await fetch(`${API_BASE_URL}/tour?${qs}`);
            const json = await res.json();
            // Interceptor: service trả { data: Tour[], meta } → interceptor pull lên, nên json.data = Tour[]
            const data = json.data ?? (Array.isArray(json) ? json : []);
            setTours(data);
            if (json.meta) setMeta(json.meta);
        } catch {
            showToast('Lỗi tải danh sách tour. Vui lòng thử lại.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [search, filterDest, sortBy, page, pageSize]);


    useEffect(() => { fetchTours(); }, [fetchTours]);

    // Debounce: chờ 350ms sau khi user gõ xong mới gửi request
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch aggregate stats (toàn bộ hệ thống — chỉ gọi 1 lần khi mount)
    useEffect(() => {
        fetch(`${API_BASE_URL}/tour?limit=9999&sortBy=recommended`)
            .then(r => r.json())
            .then(json => {
                const all: Tour[] = json.data ?? [];
                setTourStats({
                    active:     all.filter(t => t.availableSeats > 0).length,
                    totalSeats: all.reduce((s, t) => s + t.availableSeats, 0),
                    avgPrice:   all.length > 0 ? all.reduce((s, t) => s + t.price, 0) / all.length : 0,
                    loaded:     true,
                });
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetch(`${API_BASE_URL}/search/destinations`)
            .then(r => r.json())
            .then(j => setDestinations(j.data ?? j))
            .catch(() => {});
    }, []);

    // ── Toast ──────────────────────────────────────────────────────
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Delete ─────────────────────────────────────────────────────
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${deleteTarget.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error();
            showToast(`Đã xóa tour "${deleteTarget.name}" thành công!`);
            setDeleteTarget(null);
            fetchTours();
        } catch {
            showToast('Xóa tour thất bại. Vui lòng thử lại.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = async (tour: Tour) => {
        try {
            const res = await fetch(`${API_BASE_URL}/tour/${tour.id}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setSelectedTour(json.data ?? json);
            setModalMode('edit');
        } catch {
            showToast('Lỗi tải dữ liệu chi tiết tour. Vui lòng thử lại.', 'error');
        }
    };

    const handleOpenContent = async (tour: Tour) => {
        try {
            const res = await fetch(`${API_BASE_URL}/tour/${tour.id}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setContentDrawerTour(json.data ?? json);
        } catch {
            showToast('Lỗi tải dữ liệu tour. Vui lòng thử lại.', 'error');
        }
    };

    // ── KPIs — dùng dữ liệu aggregate toàn hệ thống —————————————————
    const totalTours = meta.totalItems;

    const kpis = [
        { icon: 'travel_explore', label: 'Tổng Số Tour',
          value: String(totalTours), unit: null, color: 'bg-primary/10 text-primary' },
        { icon: 'check_circle', label: 'Đang Hoạt Động',
          value: tourStats.loaded ? String(tourStats.active) : '…',
          unit: null, color: 'bg-tertiary/10 text-tertiary' },
        { icon: 'airline_seat_recline_normal', label: 'Ghế Còn Trống',
          value: tourStats.loaded ? String(tourStats.totalSeats) : '…',
          unit: null, color: 'bg-secondary/10 text-secondary' },
        { icon: 'payments', label: 'Giá Trung Bình',
          value: tourStats.loaded ? formatCurrencyCompact(tourStats.avgPrice) : '…',
          unit: 'VNĐ', color: 'bg-amber-500/10 text-amber-600' },
    ];

    // ── Bulk helpers ——————————————————————————————————
    const isAllSelected = tours.length > 0 && tours.every(t => selectedIds.has(t.id));
    const isSomeSelected = selectedIds.size > 0;

    const toggleSelectAll = () => {
        setSelectedIds(isAllSelected ? new Set() : new Set(tours.map(t => t.id)));
    };
    const toggleSelectOne = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const handleBulkHide = async () => {
        if (selectedIds.size === 0) return;
        setIsBulkDeleting(true);
        let ok = 0;
        const ids = [...selectedIds];
        for (const id of ids) {
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/tour/${id}`, { method: 'DELETE' });
                if (res.ok) ok++;
            } catch { /* tiếp tục */ }
        }
        setIsBulkDeleting(false);
        setSelectedIds(new Set());
        showToast(`Ẩn ${ok}/${ids.length} tour thành công.`);
        fetchTours();
    };

    // ── Export CSV ——————————————————————————————————
    const handleExportCSV = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/tour?limit=9999&sortBy=recommended`);
            const json = await res.json();
            const all: Tour[] = json.data ?? [];
            const headers = ['ID', 'Tên Tour', 'Điểm Đến', 'Giá (VNĐ)', 'Ngày KH', 'Thời Lượng', 'Ghế Còn', 'Rating', 'Loại'];
            const rows = all.map(t => [
                t.id,
                `"${t.name.replace(/"/g, '""')}"`,
                `"${(t.destination?.name ?? '').replace(/"/g, '""')}"`,
                t.price,
                t.startDate ? new Date(t.startDate).toLocaleDateString('vi-VN') : '',
                t.duration ?? '',
                t.availableSeats,
                t.averageRating > 0 ? t.averageRating.toFixed(1) : '0',
                t.tourType ?? '',
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `azure-horizon-tours-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`Xuất ${all.length} tour ra CSV thành công!`);
        } catch {
            showToast('Xuất file thất bại.', 'error');
        }
    };

    return (
        <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {/* Skip link for a11y */}
            <a href="#tours-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
                Nhảy đến bảng dữ liệu
            </a>

            {/* ── Page Header ─── */}
            <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface" style={{ textWrap: 'balance' } as React.CSSProperties}>
                        Quản Lý Tour
                    </h1>
                    <p className="text-on-surface-variant text-sm mt-1">Quản lý và giám sát toàn bộ danh sách tour của Azure&nbsp;Horizon.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Export CSV */}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest text-on-surface-variant text-sm font-semibold hover:bg-surface-container hover:text-on-surface transition-all shadow-sm"
                        title="Xuất danh sách tour ra file CSV"
                    >
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">download</span>
                        Xuất CSV
                    </button>
                    {/* Tạo mới */}
                    <button
                        onClick={() => { setSelectedTour(null); setModalMode('create'); }}
                        aria-label="Tạo tour mới"
                        className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                        Tạo Tour Mới
                    </button>
                </div>
            </div>

            {/* ── Bulk Action Bar — hiện khi có item được chọn ─── */}
            {isSomeSelected && (
                <div className="mb-4 flex items-center gap-3 px-5 py-3.5 bg-primary/5 border border-primary/20 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                    <span className="material-symbols-outlined text-primary text-[20px]">checklist</span>
                    <span className="text-sm font-semibold text-on-surface flex-1">
                        Đã chọn <strong className="text-primary">{selectedIds.size}</strong> tour
                    </span>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-xs text-on-surface-variant hover:text-on-surface font-medium px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
                    >
                        Bỏ chọn
                    </button>
                    <button
                        onClick={handleBulkHide}
                        disabled={isBulkDeleting}
                        className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                        {isBulkDeleting ? (
                            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined text-[16px]">hide_source</span>
                        )}
                        Ẩn {selectedIds.size} tour
                    </button>
                </div>
            )}

            {/* ── KPI Cards ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map(kpi => (
                    <div key={kpi.label} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${kpi.color}`}>
                                <span className="material-symbols-outlined text-xl" aria-hidden="true">{kpi.icon}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-on-surface-variant font-medium truncate">{kpi.label}</p>
                                <p className="text-xl font-bold text-on-surface leading-tight mt-0.5 truncate">{kpi.value}</p>
                                {kpi.unit && (
                                    <p className="text-[10px] text-on-surface-variant/60 mt-0.5 font-medium tracking-wider">{kpi.unit}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ─── */}
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
                        onChange={e => setSearchInput(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                    />
                </div>
                <div className="flex gap-3 flex-wrap">
                    <label htmlFor="filter-dest" className="sr-only">Lọc theo điểm đến</label>
                    <select
                        id="filter-dest"
                        value={filterDest}
                        onChange={e => { setFilterDest(e.target.value); setPage(1); }}
                        className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                    >
                        <option value="">Tất cả điểm đến</option>
                        {destinations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                    <label htmlFor="sort-tours" className="sr-only">Sắp xếp</label>
                    <select
                        id="sort-tours"
                        value={sortBy}
                        onChange={e => { setSortBy(e.target.value); setPage(1); }}
                        className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                    >
                        <option value="recommended">Đề xuất</option>
                        <option value="priceLowHigh">Giá: Thấp → Cao</option>
                        <option value="priceHighLow">Giá: Cao → Thấp</option>
                    </select>
                </div>
            </div>

            {/* ── Table ─── */}
            <div id="tours-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                                {/* Checkbox select-all */}
                                <th className="py-3.5 pl-5 pr-2 w-10">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer"
                                        aria-label="Chọn tất cả"
                                    />
                                </th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Tour</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Điểm Đến</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">
                                    Giá
                                    <span className="ml-1 normal-case font-normal text-[10px] text-on-surface-variant/50">(VNĐ)</span>
                                </th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ngày KH</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Thời Lượng</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ghế</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Rating</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Trạng Thái</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="py-20 text-center">
                                        <span className="material-symbols-outlined text-4xl text-primary animate-spin" aria-hidden="true">progress_activity</span>
                                        <p className="text-on-surface-variant text-sm mt-3">Đang tải dữ liệu…</p>
                                    </td>
                                </tr>
                            ) : tours.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-20 text-center">
                                        <span className="material-symbols-outlined text-4xl text-outline mb-2 block" aria-hidden="true">travel_explore</span>
                                        <p className="font-bold text-on-surface">Không tìm thấy tour nào</p>
                                        <p className="text-on-surface-variant text-sm mt-1">Thử thay đổi bộ lọc hoặc tạo tour mới.</p>
                                    </td>
                                </tr>
                            ) : (
                                tours.map(tour => {
                                    const status = getStatusLabel(tour.availableSeats);
                                    const isChecked = selectedIds.has(tour.id);
                                    return (
                                        <tr key={tour.id} className={`hover:bg-surface-container-low/40 transition-colors group ${isChecked ? 'bg-primary/5' : ''}`}>
                                            {/* Checkbox */}
                                            <td className="py-3 pl-5 pr-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleSelectOne(tour.id)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer"
                                                    aria-label={`Chọn tour ${tour.name}`}
                                                />
                                            </td>
                                            {/* Tour name + image */}
                                            <td className="py-3 px-5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container shrink-0">
                                                        {tour.imageUrl ? (
                                                            <img
                                                                src={tour.imageUrl}
                                                                alt={tour.name}
                                                                width={56}
                                                                height={56}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-outline">
                                                                <span className="material-symbols-outlined" aria-hidden="true">image</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-on-surface truncate max-w-[200px]">{tour.name}</p>
                                                        <p className="text-xs text-on-surface-variant mt-0.5">
                                                            <span translate="no" className="font-mono">#{tour.id}</span>
                                                            {' · '}
                                                            <span className="inline-flex items-center px-1.5 py-0.5 bg-surface-container rounded text-[10px] font-medium">{tour.tourType || 'Tour'}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-5 text-sm text-on-surface-variant whitespace-nowrap">{tour.destination?.name ?? '—'}</td>
                                            <td className="py-3 px-5 whitespace-nowrap">
                                                <span className="text-sm font-semibold text-on-surface">{formatCurrency(tour.price)}</span>
                                            </td>
                                            <td className="py-3 px-5 text-sm text-on-surface-variant whitespace-nowrap">{tour.startDate ? formatDate(tour.startDate) : '—'}</td>
                                            <td className="py-3 px-5 text-sm text-on-surface-variant whitespace-nowrap">{tour.duration ?? '—'}</td>
                                            <td className="py-3 px-5 text-sm font-semibold text-on-surface whitespace-nowrap">{tour.availableSeats}</td>
                                            <td className="py-3 px-5 whitespace-nowrap">
                                                {tour.averageRating > 0 ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-amber-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">star</span>
                                                        <span className="text-sm font-semibold text-on-surface">{tour.averageRating.toFixed(1)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-on-surface-variant">Chưa có</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-5 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${status.cls}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1">
                                                    {/* View */}
                                                    <div className="relative group/tip">
                                                        <button onClick={() => window.open(`/vi/tour/${tour.id}`, '_blank')} aria-label={`Xem tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                                                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                                        </button>
                                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Xem tour<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                                                    </div>
                                                    {/* Content */}
                                                    <div className="relative group/tip">
                                                        <button onClick={() => handleOpenContent(tour)} aria-label={`Quản lý nội dung tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-violet-500/10 hover:text-violet-600 transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                                                            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                                        </button>
                                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Nội dung<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                                                    </div>
                                                    {/* Edit */}
                                                    <div className="relative group/tip">
                                                        <button onClick={() => handleEdit(tour)} aria-label={`Chỉnh sửa tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>
                                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Chỉnh sửa<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                                                    </div>
                                                    {/* Delete */}
                                                    <div className="relative group/tip">
                                                        <button onClick={() => setDeleteTarget(tour)} aria-label={`Xóa tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors focus-visible:ring-2 focus-visible:ring-error outline-none">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-error px-2 py-1 text-[10px] font-medium text-on-error opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Xóa tour<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-error" /></span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="py-3 px-6 border-t border-outline-variant/10 bg-surface-container-lowest">
                    <AdminPagination
                        currentPage={meta.currentPage}
                        totalPages={meta.totalPages}
                        totalItems={meta.totalItems}
                        pageSize={pageSize}
                        onPageChange={(p) => setPage(p)}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                        itemLabel="tour"
                    />
                </div>

            </div>

            {/* ── Content Drawer ─── */}
            {contentDrawerTour && (
                <TourContentDrawer
                    tour={contentDrawerTour}
                    onClose={() => setContentDrawerTour(null)}
                    onSuccess={(msg) => { showToast(msg); setContentDrawerTour(null); }}
                />
            )}

            {/* ── Create / Edit Modal ─── */}
            {modalMode && (
                <TourFormModal
                    mode={modalMode}
                    initialData={selectedTour ?? undefined}
                    destinations={destinations}
                    onSuccess={(msg) => { showToast(msg); fetchTours(); }}
                    onClose={() => { setModalMode(null); setSelectedTour(null); }}
                    onDestinationCreated={(dest) => setDestinations(prev =>
                        [...prev, dest].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
                    )}
                />
            )}

            {/* ── Delete Confirmation Dialog ─── */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-dialog-title"
                    style={{ overscrollBehavior: 'contain' }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-7">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-5">
                                <span className="material-symbols-outlined text-amber-600 text-2xl" aria-hidden="true">hide_source</span>
                            </div>
                            <h2 id="delete-dialog-title" className="text-lg font-bold text-on-surface mb-2">Xác nhận Ẩn Tour?</h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed">
                                Tour <strong className="text-on-surface">"{deleteTarget.name}"</strong> sẽ bị ẩn khỏi danh sách và không hiển thị với khách hàng. Dữ liệu vẫn được lưu trữ và có thể khôi phục bởi quản trị viên.
                            </p>
                        </div>
                        <div className="px-7 pb-6 flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-6 py-2.5 bg-error text-on-error rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-error outline-none"
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                                        Đang xử lý…
                                    </>
                                ) : (
                                    'Ẩn Tour'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ─── */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {toast?.message}
            </div>
            {toast && (
                <div
                    role="status"
                    className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.type === 'error' ? 'bg-error text-on-error' : 'bg-tertiary text-on-tertiary'}`}
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                    {toast.message}
                </div>
            )}
        </main>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import TourFormModal from '@/app/components/admin/TourFormModal';
import TourContentDrawer from '@/app/components/admin/TourContentDrawer';
import ReviewTourModal from '@/app/components/admin/ReviewTourModal';
import AdminPagination from '@/app/components/admin/AdminPagination';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

// ── Types ────────────────────────────────────────────────────────────
type TourStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'COMPLETED';

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
    status: TourStatus;
    reviewNote?: string;
    createdById?: number;
    createdBy?: { id: number; fullName: string };
}

/** Tour đã bị soft-delete — có thêm `deletedAt` từ backend */
interface TrashedTour extends Tour {
    deletedAt: string | null;
    bookingCount?: number;
    canPermanentDelete?: boolean;
}

interface Destination {
    id: number;
    name: string;
    travelScope?: 'DOMESTIC' | 'INTERNATIONAL';
    countryCode?: string | null;
}

interface ToastState { message: string; type: 'success' | 'error' }

type ModalMode = 'create' | 'edit' | null;

interface TourStats {
    totalVisible: number;
    total: number;
    published: number;
    draft: number;
    pending: number;
    rejected: number;
    completed: number;
    active: number;
    totalSeats: number;
    avgPrice: number;
    loaded: boolean;
}

const EMPTY_TOUR_STATS: TourStats = {
    totalVisible: 0,
    total: 0,
    published: 0,
    draft: 0,
    pending: 0,
    rejected: 0,
    completed: 0,
    active: 0,
    totalSeats: 0,
    avgPrice: 0,
    loaded: false,
};

// ── Helpers ──────────────────────────────────────────────────────────
// Format full: 1.500.000 ₫
const formatCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

// Format compact for KPI card: 1,5 tr ₫ / 2 tỷ ₫
const formatCurrencyCompact = (n: number): string => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ ₫`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr ₫`;
    return formatCurrency(n);
};

const formatDate = (d: string) =>
    new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

const getTourStatusBadge = (status: TourStatus): { label: string; cls: string; icon: string } => {
    switch (status) {
        case 'DRAFT': return { label: 'Nháp', cls: 'bg-surface-container text-on-surface-variant border border-outline-variant/20', icon: 'edit_note' };
        case 'PENDING_REVIEW': return { label: 'Chờ duyệt', cls: 'bg-amber-500/10 text-amber-700 border border-amber-300/40', icon: 'pending' };
        case 'PUBLISHED': return { label: 'Đã duyệt', cls: 'bg-emerald-500/10 text-emerald-700 border border-emerald-300/40', icon: 'check_circle' };
        case 'REJECTED': return { label: 'Bị từ chối', cls: 'bg-error/10 text-error border border-error/20', icon: 'cancel' };
        case 'COMPLETED': return { label: 'Đã kết thúc', cls: 'bg-slate-500/10 text-slate-700 border border-slate-300/40', icon: 'history' };
    }
};

// ── Main Component ───────────────────────────────────────────────────
function SubmitTourReviewDialog({ tour, onConfirm, onCancel, isSubmitting }: {
    tour: Tour;
    onConfirm: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
}) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSubmitting) onCancel(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isSubmitting, onCancel]);

    const status = getTourStatusBadge(tour.status ?? 'DRAFT');
    const title = tour.name?.trim() || 'Bản nháp chưa có tên tour';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="submit-tour-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!isSubmitting) onCancel(); }} />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl animate-fade-slide-up">
                <div className="border-b border-outline-variant/10 bg-amber-50/80 px-6 py-5">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>approval</span>
                        </div>
                        <div className="min-w-0">
                            <h3 id="submit-tour-title" className="text-lg font-bold text-on-surface">Gửi tour để Admin duyệt?</h3>
                            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                                Sau khi gửi, tour sẽ chuyển sang trạng thái chờ duyệt. Bạn chỉ chỉnh sửa tiếp khi Admin từ chối và gửi phản hồi.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5">
                    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${status.cls}`}>
                                <span className="material-symbols-outlined text-[14px]">{status.icon}</span>{status.label}
                            </span>
                            <span className="text-[11px] font-semibold text-on-surface-variant">{tour.destination?.name ?? 'Chưa chọn điểm đến'}</span>
                        </div>
                        <p className="line-clamp-2 text-sm font-bold leading-snug text-on-surface">&ldquo;{title}&rdquo;</p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-on-surface-variant">
                            <span className="rounded-lg bg-surface-container px-2 py-1">{tour.duration || 'Chưa có thời lượng'}</span>
                            <span className="rounded-lg bg-surface-container px-2 py-1">{tour.availableSeats || 0} ghế</span>
                            <span className="rounded-lg bg-surface-container px-2 py-1">{formatCurrency(tour.price || 0)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 px-6 pb-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 rounded-xl border border-outline-variant/20 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                        {isSubmitting
                            ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang gửi…</>
                            : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>Xác nhận gửi</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

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
    const [contentDrawerTour, setContentDrawerTour] = useState<Tour | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    // State: Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // State: KPI stats
    const [tourStats, setTourStats] = useState<TourStats>(EMPTY_TOUR_STATS);

    // State: Workflow
    const [reviewTarget, setReviewTarget] = useState<{ tour: Tour; action: 'approve' | 'reject' } | null>(null);
    const [submitTarget, setSubmitTarget] = useState<Tour | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

    // State: Trash tab
    const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
    const [trashedTours, setTrashedTours] = useState<TrashedTour[]>([]);
    const [trashMeta, setTrashMeta] = useState({ totalItems: 0, totalPages: 1, currentPage: 1 });
    const [trashPage, setTrashPage] = useState(1);
    const [isLoadingTrash, setIsLoadingTrash] = useState(false);
    const [trashSearchInput, setTrashSearchInput] = useState('');
    const [trashSearch, setTrashSearch] = useState('');
    const [trashStatus, setTrashStatus] = useState('');
    const [trashDeletable, setTrashDeletable] = useState('');
    const [trashSelectedIds, setTrashSelectedIds] = useState<Set<number>>(new Set());
    const [restoring, setRestoring] = useState<number | null>(null);
    const [permDeleteTarget, setPermDeleteTarget] = useState<TrashedTour | null>(null);
    const [isPermDeleting, setIsPermDeleting] = useState(false);
    const [isTrashBulkRestoring, setIsTrashBulkRestoring] = useState(false);
    const [isTrashBulkDeleting, setIsTrashBulkDeleting] = useState(false);
    const [showTrashBulkDeleteConfirm, setShowTrashBulkDeleteConfirm] = useState(false);

    // State: Bulk confirm dialog
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);

    // Role-based access
    const [userRole, setUserRole] = useState<string>('');
    const [userId, setUserId] = useState<number | null>(null);
    const isStaff = userRole === 'STAFF';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    // ── Fetch ──────────────────────────────────────────────────────
    const fetchTours = useCallback(async () => {
        setIsLoading(true);
        try {
            const qs = new URLSearchParams();
            if (search) qs.append('dest', search);
            if (filterDest) qs.append('dest', filterDest);
            if (filterStatus) qs.append('status', filterStatus);
            qs.append('sortBy', sortBy);
            qs.append('page', String(page));
            qs.append('limit', String(pageSize));

            // Dùng fetchWithAuth để gửi JWT token:
            // - STAFF: backend trả tour của mình (DRAFT/PENDING/REJECTED)
            // - ADMIN: backend trả tất cả tour
            // - Nếu dùng fetch thường → backend nghĩ là public → chỉ trả PUBLISHED
            const res = await fetchWithAuth(`${API_BASE_URL}/tour?${qs}`);
            const json = await res.json();
            const data = json.data ?? (Array.isArray(json) ? json : []);
            setTours(data);
            if (json.meta) setMeta(json.meta);
        } catch {
            showToast('Lỗi tải danh sách tour. Vui lòng thử lại.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [search, filterDest, filterStatus, sortBy, page, pageSize]);


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
    // Dùng fetchWithAuth để Admin thấy đúng số liệu toàn bộ (kể cả DRAFT)
    const fetchStats = useCallback(async () => {
        if (!userRole) return;
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/admin/stats`);
            const json = await res.json();
            const data = json?.data ?? json;
            setTourStats({ ...EMPTY_TOUR_STATS, ...data, loaded: true });
        } catch {
            setTourStats(EMPTY_TOUR_STATS);
        }
    }, [userRole]);

    // Fetch role từ API thay vì localStorage để tránh spoof qua DevTools
    // Backend verify JWT → trả role thực sự từ DB, không thể giả mạo
    useEffect(() => {
        fetchWithAuth(`${API_BASE_URL}/auth/profile`)
            .then(r => r.json())
            .then(d => {
                const profile = d?.data ?? d;
                if (profile?.role) setUserRole(profile.role);
                if (profile?.id) setUserId(profile.id);
            })
            .catch(() => {
                // Fallback: đọc localStorage nếu API lỗi (offline, network issue)
                const savedRole = localStorage.getItem('userRole');
                if (savedRole) setUserRole(savedRole);
                const savedUserId = localStorage.getItem('userId');
                if (savedUserId) setUserId(Number(savedUserId));
            });
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/search/destinations`)
            .then(r => r.json())
            .then(j => setDestinations(j.data ?? j))
            .catch(() => { });
    }, []);

    // ── Toast ──────────────────────────────────────────────────────
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Workflow Handlers ───────────────────────────────────────────
    const handleSubmitForReview = async (tourId: number) => {
        setIsSubmitting(tourId);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/submit`, { method: 'POST' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Gửi duyệt thất bại');
            }
            showToast('Đã gửi tour để Admin duyệt!');
            setSubmitTarget(null);
            fetchTours();
            fetchStats();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Gửi duyệt thất bại', 'error');
        } finally {
            setIsSubmitting(null);
        }
    };

    const handleReviewTour = async (action: 'approve' | 'reject', note?: string) => {
        if (!reviewTarget) return;
        const res = await fetchWithAuth(`${API_BASE_URL}/tour/${reviewTarget.tour.id}/review`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, note }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Thao tác thất bại');
        }
        showToast(action === 'approve' ? 'Đã duyệt và phát hành tour!' : 'Đã từ chối tour.');
        setReviewTarget(null);
        fetchTours();
        fetchStats();
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
            showToast(
                isStaff
                    ? `Đã xóa bản nháp "${deleteTarget.name}" thành công!`
                    : `Đã xóa tour "${deleteTarget.name}" thành công!`
            );
            setDeleteTarget(null);
            fetchTours();
            fetchStats();
            if (isAdmin) setActiveTab('trash');
        } catch {
            showToast(
                isStaff
                    ? 'Xóa bản nháp thất bại. Vui lòng thử lại.'
                    : 'Xóa tour thất bại. Vui lòng thử lại.',
                'error'
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = async (tour: Tour) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}`);
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
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setContentDrawerTour(json.data ?? json);
        } catch {
            showToast('Lỗi tải dữ liệu tour. Vui lòng thử lại.', 'error');
        }
    };

    // ── KPIs — dùng dữ liệu aggregate toàn hệ thống —————————————————
    const totalTours = isAdmin ? tourStats.total : tourStats.totalVisible;
    const pendingCount = tourStats.pending;
    const rejectedCount = tourStats.rejected;
    const draftCount = tourStats.draft;
    const staffPendingCount = tourStats.pending;

    const kpis = [
        {
            icon: 'travel_explore', label: 'Tổng Số Tour',
            value: String(totalTours), unit: null, color: 'bg-primary/10 text-primary', highlight: false, onClick: null
        },
        {
            icon: 'check_circle', label: 'Đang Hoạt Động',
            value: tourStats.loaded ? String(tourStats.active) : '…',
            unit: null, color: 'bg-tertiary/10 text-tertiary', highlight: false, onClick: null
        },
        {
            icon: 'airline_seat_recline_normal', label: 'Ghế Còn Trống',
            value: tourStats.loaded ? String(tourStats.totalSeats) : '…',
            unit: null, color: 'bg-secondary/10 text-secondary', highlight: false, onClick: null
        },
        {
            icon: 'payments', label: 'Giá Trung Bình',
            value: tourStats.loaded ? formatCurrencyCompact(tourStats.avgPrice) : '…',
            unit: 'VNĐ', color: 'bg-amber-500/10 text-amber-600', highlight: false, onClick: null
        },
        ...(isAdmin ? [
            {
                icon: 'pending_actions', label: 'Chờ Duyệt',
                value: String(pendingCount), unit: null,
                color: pendingCount > 0 ? 'bg-amber-500/15 text-amber-700' : 'bg-surface-container text-on-surface-variant',
                highlight: pendingCount > 0,
                // Toggle: nếu đang lọc thì bỏ lọc, ngược lại thì lọc
                onClick: (pendingCount > 0 || filterStatus === 'PENDING_REVIEW')
                    ? () => { setFilterStatus(f => f === 'PENDING_REVIEW' ? '' : 'PENDING_REVIEW'); setPage(1); setActiveTab('active'); }
                    : null
            },
            {
                icon: 'cancel', label: 'Bị Từ Chối',
                value: String(rejectedCount), unit: null,
                color: rejectedCount > 0 ? 'bg-error/10 text-error' : 'bg-surface-container text-on-surface-variant',
                highlight: false,
                onClick: (rejectedCount > 0 || filterStatus === 'REJECTED')
                    ? () => { setFilterStatus(f => f === 'REJECTED' ? '' : 'REJECTED'); setPage(1); setActiveTab('active'); }
                    : null
            },
        ] : []),
        ...(isStaff ? [
            {
                icon: 'edit_note', label: 'Bản Nháp',
                value: String(draftCount),
                unit: null,
                color: 'bg-surface-container text-on-surface-variant',
                highlight: draftCount > 0,
                onClick: (filterStatus === 'DRAFT' || draftCount > 0)
                    ? () => { setFilterStatus(f => f === 'DRAFT' ? '' : 'DRAFT'); setPage(1); }
                    : null
            },
            {
                icon: 'pending', label: 'Chờ Duyệt',
                value: String(staffPendingCount),
                unit: null,
                color: 'bg-amber-500/10 text-amber-700',
                highlight: staffPendingCount > 0,
                onClick: (filterStatus === 'PENDING_REVIEW' || staffPendingCount > 0)
                    ? () => { setFilterStatus(f => f === 'PENDING_REVIEW' ? '' : 'PENDING_REVIEW'); setPage(1); setActiveTab('active'); }
                    : null
            },
        ] : []),
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
            if (next.has(id)) next.delete(id);
            else next.add(id);
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
        // Cập nhật KPI và chuyển sang Thùng rác
        fetchTours();
        fetchStats();
        setActiveTab('trash');
    };

    // ── Trash handlers ——————————————————————————————
    const fetchTrashedTours = useCallback(async () => {
        setIsLoadingTrash(true);
        try {
            const qs = new URLSearchParams();
            qs.set('page', String(trashPage));
            qs.set('limit', '10');
            if (trashSearch) qs.set('search', trashSearch);
            if (trashStatus) qs.set('status', trashStatus);
            if (trashDeletable) qs.set('deletable', trashDeletable);
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/trash?${qs.toString()}`);
            const json = await res.json();
            setTrashedTours(json.data ?? []);
            if (json.meta) setTrashMeta(json.meta);
        } catch {
            showToast('Lỗi tải thùng rác.', 'error');
        } finally {
            setIsLoadingTrash(false);
        }
    }, [trashPage, trashSearch, trashStatus, trashDeletable]);

    useEffect(() => {
        if (activeTab === 'trash' && isAdmin) fetchTrashedTours();
    }, [activeTab, fetchTrashedTours, isAdmin]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setTrashSearch(trashSearchInput);
            setTrashPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [trashSearchInput]);

    useEffect(() => {
        setTrashSelectedIds(new Set());
    }, [trashPage, trashSearch, trashStatus, trashDeletable, activeTab]);

    // Fetch trash count khi mount để tab "Thùng rác" hiện số lượng đúng ngay từ đầu
    useEffect(() => {
        if (!isAdmin) return;
        fetchWithAuth(`${API_BASE_URL}/tour/trash?page=1&limit=1`)
            .then(r => r.json())
            .then(json => {
                if (json.meta) setTrashMeta(prev => ({ ...prev, totalItems: json.meta.totalItems, totalPages: json.meta.totalPages }));
            })
            .catch(() => { });
    }, [isAdmin]);

    const handleRestore = async (tour: Tour) => {
        setRestoring(tour.id);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}/restore`, { method: 'PATCH' });
            if (!res.ok) throw new Error();
            showToast(`Đã khôi phục tour "${tour.name}".`);
            fetchTrashedTours();
            fetchTours(); // cập nhật lại tab active
        } catch {
            showToast('Khôi phục thất bại.', 'error');
        } finally {
            setRestoring(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!permDeleteTarget) return;
        setIsPermDeleting(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${permDeleteTarget.id}/permanent`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Xóa vĩnh viễn thất bại.');
            }
            showToast(`Đã xóa vĩnh viễn "${permDeleteTarget.name}".`);
            setPermDeleteTarget(null);
            fetchTrashedTours();
        } catch {
            showToast(
                permDeleteTarget.bookingCount
                    ? 'Tour đã có booking, không thể xóa vĩnh viễn.'
                    : 'Xóa vĩnh viễn thất bại.',
                'error'
            );
        } finally {
            setIsPermDeleting(false);
        }
    };

    const isTrashAllSelected = trashedTours.length > 0 && trashedTours.every(t => trashSelectedIds.has(t.id));
    const isTrashSomeSelected = trashSelectedIds.size > 0;

    const toggleTrashSelectAll = () => {
        setTrashSelectedIds(isTrashAllSelected ? new Set() : new Set(trashedTours.map(t => t.id)));
    };

    const toggleTrashSelectOne = (id: number) => {
        setTrashSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleTrashBulkRestore = async () => {
        const ids = [...trashSelectedIds];
        if (ids.length === 0) return;
        setIsTrashBulkRestoring(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/trash/bulk-restore`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.message || 'Khôi phục thất bại.');
            const data = json.data ?? json;
            showToast(`Đã khôi phục ${data.restored ?? 0}/${data.requested ?? ids.length} tour.`);
            setTrashSelectedIds(new Set());
            fetchTrashedTours();
            fetchTours();
            fetchStats();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Khôi phục thất bại.', 'error');
        } finally {
            setIsTrashBulkRestoring(false);
        }
    };

    const handleTrashBulkPermanentDelete = async () => {
        const ids = [...trashSelectedIds];
        if (ids.length === 0) return;
        setIsTrashBulkDeleting(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/trash/bulk-permanent`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.message || 'Xóa vĩnh viễn thất bại.');
            const data = json.data ?? json;
            const blockedCount = Array.isArray(data.blocked) ? data.blocked.length : 0;
            showToast(
                blockedCount > 0
                    ? `Đã xóa ${data.deleted ?? 0} tour. ${blockedCount} tour bị giữ lại vì đã có booking.`
                    : `Đã xóa vĩnh viễn ${data.deleted ?? 0} tour.`
            );
            setShowTrashBulkDeleteConfirm(false);
            setTrashSelectedIds(new Set());
            fetchTrashedTours();
            fetchStats();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Xóa vĩnh viễn thất bại.', 'error');
        } finally {
            setIsTrashBulkDeleting(false);
        }
    };

    // ── Export CSV ——————————————————————————————————
    const handleExportCSV = async () => {
        try {
            // Dùng fetchWithAuth để Admin export được tất cả tours (kể cả DRAFT/PENDING)
            // Nếu dùng fetch thường → backend trả PUBLISHED only
            const res = await fetchWithAuth(`${API_BASE_URL}/tour?limit=9999&sortBy=recommended`);
            const json = await res.json();
            const all: Tour[] = json.data ?? [];
            const headers = ['ID', 'Tên Tour', 'Điểm Đến', 'Giá (VNĐ)', 'Ngày KH', 'Thời Lượng', 'Ghế Còn', 'Rating', 'Loại', 'Trạng Thái'];
            const statusLabel: Record<string, string> = {
                PUBLISHED: 'Đã duyệt',
                PENDING_REVIEW: 'Chờ duyệt',
                DRAFT: 'Nháp',
                REJECTED: 'Bị từ chối',
                COMPLETED: 'Đã kết thúc',
            };
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
                statusLabel[t.status] ?? t.status,
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
                    {/* Tạo mới — tất cả role có thể tạo, STAFF sẽ lưu dưới dạng Nháp */}
                    <button
                        onClick={() => { setSelectedTour(null); setModalMode('create'); }}
                        aria-label={isStaff ? 'Tạo bản nháp tour' : 'Tạo tour hoặc bản nháp'}
                        className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">{isStaff ? 'draft' : 'add'}</span>
                        {isStaff ? 'Tạo bản nháp' : 'Tạo Tour / Nháp'}
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
                        onClick={() => setShowBulkConfirm(true)}
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

            {/* ── Bulk Confirm Dialog ─── */}
            {showBulkConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBulkConfirm(false)} />
                    <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-amber-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>hide_source</span>
                        </div>
                        <h3 className="text-lg font-bold text-on-surface text-center mb-2">Xác nhận ẩn tour?</h3>
                        <p className="text-sm text-on-surface-variant text-center leading-relaxed mb-5">
                            Bạn sắp ẩn <strong className="text-amber-600">{selectedIds.size} tour</strong> khỏi khách hàng.
                            <br />Các tour này sẽ được chuyển vào <strong>Thùng rác</strong> và có thể khôi phục sau.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBulkConfirm(false)}
                                disabled={isBulkDeleting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={async () => { setShowBulkConfirm(false); await handleBulkHide(); }}
                                disabled={isBulkDeleting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                            >
                                {isBulkDeleting
                                    ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang ẩn...</>
                                    : <><span className="material-symbols-outlined text-base">hide_source</span> Xác nhận ẩn</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Pending Alert Banner (Admin only) ─── */}
            {isAdmin && pendingCount > 0 && (
                <div className="mb-4 flex items-center gap-3 px-5 py-3.5 bg-amber-50 border border-amber-300/50 rounded-2xl">
                    <span className="material-symbols-outlined text-amber-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                    <span className="text-sm font-semibold text-amber-800 flex-1">
                        Có <strong>{pendingCount}</strong> tour đang chờ bạn duyệt.
                    </span>
                    <button
                        onClick={() => { setFilterStatus('PENDING_REVIEW'); setPage(1); setActiveTab('active'); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        Xem ngay
                    </button>
                </div>
            )}

            {/* ── KPI Cards ─── */}
            <div className={`grid gap-4 mb-8 ${isAdmin ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 lg:grid-cols-4'
                }`}>
                {kpis.map(kpi => {
                    const isActive =
                        (kpi.label === 'Chờ Duyệt' && filterStatus === 'PENDING_REVIEW') ||
                        (kpi.label === 'Bị Từ Chối' && filterStatus === 'REJECTED');
                    const Tag = kpi.onClick ? 'button' : 'div';
                    return (
                        <Tag
                            key={kpi.label}
                            onClick={kpi.onClick ?? undefined}
                            className={`bg-surface-container-lowest rounded-2xl p-5 border shadow-sm transition-all text-left w-full ${isActive
                                    ? 'border-amber-400/60 ring-2 ring-amber-400/40 shadow-md'
                                    : kpi.highlight
                                        ? 'border-amber-300/60 ring-1 ring-amber-400/30 hover:shadow-md hover:scale-[1.02]'
                                        : 'border-outline-variant/10 hover:shadow-md'
                                } ${kpi.onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${kpi.color}`}>
                                    <span className="material-symbols-outlined text-xl" aria-hidden="true">{kpi.icon}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-on-surface-variant font-medium truncate">{kpi.label}</p>
                                    <p className="text-xl font-bold text-on-surface leading-tight mt-0.5 truncate">{kpi.value}</p>
                                    {kpi.unit && (
                                        <p className="text-[10px] text-on-surface-variant/60 mt-0.5 font-medium tracking-wider">{kpi.unit}</p>
                                    )}
                                </div>
                                {kpi.onClick && (
                                    <span className={`material-symbols-outlined text-[18px] shrink-0 ${isActive ? 'text-amber-600' : 'text-amber-400'
                                        }`}>arrow_forward</span>
                                )}
                            </div>
                            {isActive && (
                                <p className="text-[10px] font-semibold text-amber-600 mt-2">Đang lọc • Nhấn để bỏ lọc</p>
                            )}
                        </Tag>
                    );
                })}
            </div>

            {/* ── Tab switcher: Hoạt động / Thùng rác ─── */}
            {isAdmin && (
                <div className="flex items-center gap-1 mb-6 bg-surface-container-lowest rounded-2xl p-1 border border-outline-variant/10 shadow-sm w-fit">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'active'
                                ? 'bg-primary text-on-primary shadow-sm'
                                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                        Đang quản lý
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                            }`}>{meta.totalItems}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('trash')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'trash'
                                ? 'bg-error text-on-error shadow-sm'
                                : 'text-on-surface-variant hover:bg-error/5 hover:text-error'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Thùng rác
                        {trashMeta.totalItems > 0 && (
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${activeTab === 'trash' ? 'bg-white/20 text-white' : 'bg-error/10 text-error'
                                }`}>{trashMeta.totalItems}</span>
                        )}
                    </button>
                </div>
            )}

            {/* ── Staff Info Banner — hướng dẫn workflow ở trạng thái DRAFT —— */}
            {isStaff && draftCount > 0 && (
                <div className="mb-4 flex items-start gap-3 px-5 py-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                    <div>
                        <p className="text-sm font-semibold text-on-surface">Bạn có bản nháp chưa gửi duyệt</p>
                        <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                            Tour ở trạng thái <span className="font-semibold text-on-surface">Bản Nháp</span> có thể chỉnh sửa tự do. Khi đã hoàn thiện, nhấn <span className="font-semibold text-amber-600">Gửi Duyệt</span> để chuyển cho Admin kiểm tra và phê duyệt.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Filters (chỉ hiện ở tab active) ─── */}
            {activeTab === 'active' && <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 border border-outline-variant/10 shadow-sm flex flex-wrap gap-3 items-center">
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
                    {/* Lọc theo trạng thái — Admin và Staff đều có, options khác nhau */}
                    {(isAdmin || isStaff) && (
                        <>
                            <label htmlFor="filter-status" className="sr-only">Lọc theo trạng thái</label>
                            <select
                                id="filter-status"
                                value={filterStatus}
                                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
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
            </div>}

            {activeTab === 'trash' && isAdmin && (
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
                                value={trashSearchInput}
                                onChange={e => setTrashSearchInput(e.target.value)}
                                className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                            />
                        </div>
                        <select
                            value={trashStatus}
                            onChange={e => { setTrashStatus(e.target.value); setTrashPage(1); }}
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
                            value={trashDeletable}
                            onChange={e => { setTrashDeletable(e.target.value); setTrashPage(1); }}
                            className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                            aria-label="Lọc khả năng xóa vĩnh viễn"
                        >
                            <option value="">Tất cả khả năng xóa</option>
                            <option value="true">Có thể xóa vĩnh viễn</option>
                            <option value="false">Đã có booking</option>
                        </select>
                    </div>

                    {isTrashSomeSelected && (
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-error/5 border border-error/20 rounded-2xl">
                            <span className="material-symbols-outlined text-error text-[20px]">delete_sweep</span>
                            <span className="text-sm font-semibold text-on-surface flex-1">
                                Đã chọn <strong className="text-error">{trashSelectedIds.size}</strong> tour trong thùng rác
                            </span>
                            <button
                                onClick={() => setTrashSelectedIds(new Set())}
                                className="text-xs text-on-surface-variant hover:text-on-surface font-medium px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
                            >
                                Bỏ chọn
                            </button>
                            <button
                                onClick={handleTrashBulkRestore}
                                disabled={isTrashBulkRestoring || isTrashBulkDeleting}
                                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                            >
                                <span className={`material-symbols-outlined text-[16px] ${isTrashBulkRestoring ? 'animate-spin' : ''}`}>
                                    {isTrashBulkRestoring ? 'progress_activity' : 'restore'}
                                </span>
                                Khôi phục
                            </button>
                            <button
                                onClick={() => setShowTrashBulkDeleteConfirm(true)}
                                disabled={isTrashBulkRestoring || isTrashBulkDeleting}
                                className="flex items-center gap-2 px-4 py-1.5 bg-error text-on-error rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                                Xóa vĩnh viễn
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── TRASH TABLE ─── */}
            {activeTab === 'trash' && isAdmin && (
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden mb-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10 bg-error/5">
                        <span className="material-symbols-outlined text-error text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
                        <div>
                            <p className="font-semibold text-sm text-on-surface">Thùng Rác — Tour Đã Ẩn</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">Tour đã có booking sẽ được lưu trữ để bảo toàn lịch sử. Admin và Super Admin chỉ xóa vĩnh viễn tour chưa phát sinh booking.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                                    <th className="py-3.5 pl-5 pr-2 w-10">
                                        <input
                                            type="checkbox"
                                            checked={isTrashAllSelected}
                                            onChange={toggleTrashSelectAll}
                                            className="w-4 h-4 rounded border-outline-variant accent-error cursor-pointer"
                                            aria-label="Chọn tất cả tour trong thùng rác"
                                        />
                                    </th>
                                    <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Tour</th>
                                    <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Điểm Đến</th>
                                    <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Người Tạo</th>
                                    <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Booking</th>
                                    <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ngày Ẩn</th>
                                    <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10">
                                {isLoadingTrash ? (
                                    <tr><td colSpan={7} className="py-16 text-center">
                                        <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
                                    </td></tr>
                                ) : trashedTours.length === 0 ? (
                                    <tr><td colSpan={7} className="py-16 text-center">
                                        <span className="material-symbols-outlined text-4xl text-outline mb-2 block">delete_sweep</span>
                                        <p className="font-semibold text-on-surface">Thùng rác trống</p>
                                        <p className="text-sm text-on-surface-variant mt-1">Không có tour nào bị ẩn.</p>
                                    </td></tr>
                                ) : trashedTours.map(tour => {
                                    const isTrashChecked = trashSelectedIds.has(tour.id);
                                    const bookingCount = tour.bookingCount ?? 0;
                                    const canPermanentDelete = tour.canPermanentDelete ?? bookingCount === 0;
                                    return (
                                    <tr key={tour.id} className={`hover:bg-error/5 transition-colors ${isTrashChecked ? 'bg-error/5' : ''}`}>
                                        <td className="py-3 pl-5 pr-2">
                                            <input
                                                type="checkbox"
                                                checked={isTrashChecked}
                                                onChange={() => toggleTrashSelectOne(tour.id)}
                                                className="w-4 h-4 rounded border-outline-variant accent-error cursor-pointer"
                                                aria-label={`Chọn tour ${tour.name}`}
                                            />
                                        </td>
                                        <td className="py-3 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container shrink-0 opacity-60">
                                                    {tour.imageUrl
                                                        ? <img src={tour.imageUrl} alt={tour.name} width={48} height={48} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-outline">image</span></div>
                                                    }
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm text-on-surface/70 line-through">{tour.name}</p>
                                                    <p className="text-xs text-on-surface-variant">#{tour.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-5 text-sm text-on-surface-variant">{tour.destination?.name ?? '—'}</td>
                                        <td className="py-3 px-5 text-sm text-on-surface-variant">{tour.createdBy?.fullName ?? '—'}</td>
                                        <td className="py-3 px-5">
                                            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${bookingCount > 0 ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                                                <span className="material-symbols-outlined text-[13px]">{bookingCount > 0 ? 'lock' : 'delete_forever'}</span>
                                                {bookingCount > 0 ? `${bookingCount} booking` : 'Có thể xóa'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-5 text-sm text-on-surface-variant">
                                            {tour.deletedAt
                                                ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(tour.deletedAt))
                                                : '—'}
                                        </td>
                                        <td className="py-3 px-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* Restore */}
                                                <button
                                                    onClick={() => handleRestore(tour)}
                                                    disabled={restoring === tour.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
                                                >
                                                    {restoring === tour.id
                                                        ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                                        : <span className="material-symbols-outlined text-[14px]">restore</span>
                                                    }
                                                    Khôi phục
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (canPermanentDelete) setPermDeleteTarget(tour);
                                                    }}
                                                    disabled={!canPermanentDelete}
                                                    title={canPermanentDelete ? 'Xóa vĩnh viễn' : 'Tour đã có booking, chỉ được lưu trữ'}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${canPermanentDelete
                                                            ? 'bg-error/10 text-error hover:bg-error/20'
                                                            : 'bg-surface-container text-on-surface-variant/50 cursor-not-allowed'
                                                        }`}
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">{canPermanentDelete ? 'delete_forever' : 'lock'}</span>
                                                    {canPermanentDelete ? 'Xóa vĩnh viễn' : 'Không thể xóa'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {trashMeta.totalPages > 1 && (
                        <div className="py-3 px-6 border-t border-outline-variant/10">
                            <AdminPagination
                                currentPage={trashMeta.currentPage}
                                totalPages={trashMeta.totalPages}
                                totalItems={trashMeta.totalItems}
                                pageSize={10}
                                onPageChange={p => setTrashPage(p)}
                                onPageSizeChange={() => { }}
                                itemLabel="tour trong thùng rác"
                                pageSizeOptions={[10]}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ── ACTIVE TABLE ─── */}
            {activeTab === 'active' && <div id="tours-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                                <th className="py-3.5 pl-5 pr-2 w-10">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer"
                                        aria-label="Chọn tất cả"
                                    />
                                </th>
                                {/* STT */}
                                <th className="py-3.5 px-3 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-center w-12">STT</th>
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
                                        <p className="text-on-surface-variant text-sm mt-1">Thử thay đổi bộ lọc hoặc {isStaff ? 'tạo bản nháp mới' : 'tạo tour mới'}.</p>
                                    </td>
                                </tr>
                            ) : (
                                tours.map((tour, rowIndex) => {
                                    const tourStatusBadge = getTourStatusBadge(tour.status ?? 'PUBLISHED');
                                    const isChecked = selectedIds.has(tour.id);
                                    const isMyTour = tour.createdById === userId;
                                    // Staff có thể sửa: tour của mình ở DRAFT hoặc REJECTED
                                    const canStaffEdit = isStaff && isMyTour && (tour.status === 'DRAFT' || tour.status === 'REJECTED');
                                    // Staff có thể gửi duyệt: tour của mình ở DRAFT hoặc REJECTED
                                    const canStaffSubmit = isStaff && isMyTour && (tour.status === 'DRAFT' || tour.status === 'REJECTED');
                                    const canStaffDeleteDraft = isStaff && isMyTour && (tour.status === 'DRAFT' || tour.status === 'REJECTED');
                                    const canAdminReview = isAdmin && tour.status === 'PENDING_REVIEW';
                                    const stt = (page - 1) * pageSize + rowIndex + 1;
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
                                            {/* STT */}
                                            <td className="py-3 px-3 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface-container text-xs font-bold text-on-surface-variant">
                                                    {stt}
                                                </span>
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
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${tourStatusBadge.cls}`}>
                                                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{tourStatusBadge.icon}</span>
                                                        {tourStatusBadge.label}
                                                    </span>
                                                    {/* Lý do từ chối — hiện nổi bật để Staff biết cần sửa gì */}
                                                    {tour.status === 'REJECTED' && tour.reviewNote && (
                                                        <p
                                                            className="text-[10px] text-error font-medium mt-1 max-w-[160px] leading-tight cursor-help"
                                                            title={tour.reviewNote}
                                                        >
                                                            ↳ {tour.reviewNote.length > 60
                                                                ? tour.reviewNote.slice(0, 60) + '…'
                                                                : tour.reviewNote}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1">
                                                    {/* View — chỉ khi PUBLISHED (tour chưa duyệt không hiển thị với khách) */}
                                                    {tour.status === 'PUBLISHED' && (
                                                        <div className="relative group/tip">
                                                            <button onClick={() => window.open(`/vi/tour/${tour.id}`, '_blank')} aria-label={`Xem tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                                                                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                                            </button>
                                                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Xem trang khách<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                                                        </div>
                                                    )}
                                                    {/* Content — chỉ khi PUBLISHED và là Admin hoặc Staff chủ sở hữu */}
                                                    {(isAdmin || isMyTour) && tour.status === 'PUBLISHED' && (
                                                        <div className="relative group/tip">
                                                            <button onClick={() => handleOpenContent(tour)} aria-label={`Quản lý nội dung tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-violet-500/10 hover:text-violet-600 transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                                                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                                            </button>
                                                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Nội dung<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                                                        </div>
                                                    )}
                                                    {/* Edit:
                                                        - Admin có thể sửa mọi tour (trừ COMPLETED)
                                                        - Staff owner sửa tour của mình ở trạng thái DRAFT hoặc REJECTED
                                                    */}
                                                    {(
                                                        (isAdmin && tour.status !== 'COMPLETED') ||
                                                        canStaffEdit
                                                    ) && (
                                                            <div className="relative group/tip">
                                                                <button onClick={() => handleEdit(tour)} aria-label={`Chỉnh sửa tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                                </button>
                                                                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Chỉnh sửa<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                                                            </div>
                                                        )}
                                                    {/* Gửi Duyệt — Staff owner khi DRAFT hoặc REJECTED: hiện nút text rõ ràng */}
                                                    {canStaffSubmit && (
                                                        <button
                                                            onClick={() => setSubmitTarget(tour)}
                                                            disabled={isSubmitting === tour.id}
                                                            aria-label={`Gửi duyệt tour ${tour.name}`}
                                                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-300/40 text-xs font-semibold transition-all disabled:opacity-50 whitespace-nowrap"
                                                        >
                                                            {isSubmitting === tour.id
                                                                ? <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                                                                : <span className="material-symbols-outlined text-[13px]">send</span>
                                                            }
                                                            Gửi Duyệt
                                                        </button>
                                                    )}
                                                    {/* Approve / Reject — Admin khi tour PENDING_REVIEW */}
                                                    {canAdminReview && (<>
                                                        <div className="relative group/tip">
                                                            <button
                                                                onClick={() => setReviewTarget({ tour, action: 'approve' })}
                                                                aria-label={`Duyệt tour ${tour.name}`}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                            </button>
                                                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Duyệt<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-emerald-700" /></span>
                                                        </div>
                                                        <div className="relative group/tip">
                                                            <button
                                                                onClick={() => setReviewTarget({ tour, action: 'reject' })}
                                                                aria-label={`Từ chối tour ${tour.name}`}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors focus-visible:ring-2 focus-visible:ring-error outline-none"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                            </button>
                                                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-error px-2 py-1 text-[10px] font-medium text-on-error opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Từ chối<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-error" /></span>
                                                        </div>
                                                    </>)}
                                                    {/* Delete: Admin xóa/ẩn tour; Staff chỉ xóa nháp hoặc tour bị từ chối của mình */}
                                                    {(isAdmin || canStaffDeleteDraft) && (
                                                        <div className="relative group/tip">
                                                            <button onClick={() => setDeleteTarget(tour)} aria-label={`${canStaffDeleteDraft ? 'Xóa bản nháp' : 'Xóa tour'} ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors focus-visible:ring-2 focus-visible:ring-error outline-none">
                                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                            </button>
                                                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-error px-2 py-1 text-[10px] font-medium text-on-error opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">{canStaffDeleteDraft ? 'Xóa bản nháp' : 'Xóa tour'}<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-error" /></span>
                                                        </div>
                                                    )}
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

            </div>}

            {/* ── Permanent Delete Confirmation (Super Admin) ─── */}
            {showTrashBulkDeleteConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="bulk-perm-delete-dialog-title"
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-7">
                            <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center mb-5">
                                <span className="material-symbols-outlined text-error text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
                            </div>
                            <h2 id="bulk-perm-delete-dialog-title" className="text-lg font-bold text-on-surface mb-2">Xóa vĩnh viễn tour đã chọn?</h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed mb-3">
                                Bạn đang chọn <strong className="text-on-surface">{trashSelectedIds.size}</strong> tour. Hệ thống chỉ xóa vĩnh viễn tour chưa phát sinh booking; tour đã có booking sẽ được giữ lại.
                            </p>
                            <div className="flex items-start gap-2 p-3 bg-error/8 rounded-xl border border-error/20">
                                <span className="material-symbols-outlined text-error text-[16px] mt-0.5">warning</span>
                                <p className="text-xs text-error font-semibold">Hành động này không thể hoàn tác với các tour đủ điều kiện xóa.</p>
                            </div>
                        </div>
                        <div className="px-7 pb-6 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowTrashBulkDeleteConfirm(false)}
                                disabled={isTrashBulkDeleting}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-60"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleTrashBulkPermanentDelete}
                                disabled={isTrashBulkDeleting}
                                className="px-6 py-2.5 bg-error text-on-error rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
                            >
                                {isTrashBulkDeleting ? (
                                    <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xóa...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-base">delete_forever</span>Xóa vĩnh viễn</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {permDeleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="perm-delete-dialog-title"
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-7">
                            <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center mb-5">
                                <span className="material-symbols-outlined text-error text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
                            </div>
                            <h2 id="perm-delete-dialog-title" className="text-lg font-bold text-on-surface mb-2">Xóa Vĩnh Viễn?</h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed mb-3">
                                Tour <strong className="text-on-surface">&ldquo;{permDeleteTarget.name}&rdquo;</strong> sẽ bị <strong className="text-error">xóa hoàn toàn khỏi cơ sở dữ liệu</strong>, bao gồm hình ảnh, gói tour và ngày khởi hành liên quan.
                            </p>
                            <div className="flex items-start gap-2 p-3 bg-error/8 rounded-xl border border-error/20">
                                <span className="material-symbols-outlined text-error text-[16px] mt-0.5">warning</span>
                                <p className="text-xs text-error font-semibold">Hành động này không thể hoàn tác. Tour đã có booking sẽ bị backend chặn xóa vĩnh viễn.</p>
                            </div>
                        </div>
                        <div className="px-7 pb-6 flex gap-3 justify-end">
                            <button
                                onClick={() => setPermDeleteTarget(null)}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handlePermanentDelete}
                                disabled={isPermDeleting}
                                className="px-6 py-2.5 bg-error text-on-error rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
                            >
                                {isPermDeleting ? (
                                    <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xóa…</>
                                ) : (
                                    <><span className="material-symbols-outlined text-base">delete_forever</span>Xóa vĩnh viễn</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {contentDrawerTour && (
                <TourContentDrawer
                    tour={contentDrawerTour}
                    onClose={() => setContentDrawerTour(null)}
                    onSuccess={(msg) => { showToast(msg); setContentDrawerTour(null); }}
                />
            )}

            {submitTarget && (
                <SubmitTourReviewDialog
                    tour={submitTarget}
                    onConfirm={() => handleSubmitForReview(submitTarget.id)}
                    onCancel={() => setSubmitTarget(null)}
                    isSubmitting={isSubmitting === submitTarget.id}
                />
            )}

            {/* ── Create / Edit Modal ─── */}
            {modalMode && (
                <TourFormModal
                    mode={modalMode}
                    initialData={selectedTour ?? undefined}
                    destinations={destinations}
                    userRole={userRole}
                    onSuccess={(msg, _savedTour, action) => {
                        showToast(msg);
                        fetchStats();

                        if ((isStaff || isAdmin) && action === 'draft') {
                            setActiveTab('active');
                            setFilterStatus('DRAFT');
                            setPage(1);
                            if (filterStatus === 'DRAFT' && page === 1) fetchTours();
                            return;
                        }

                        fetchTours();
                    }}
                    onClose={() => { setModalMode(null); setSelectedTour(null); }}
                    onDestinationCreated={(dest) => setDestinations(prev =>
                        [...prev, dest].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
                    )}
                />
            )}

            {/* ── Review Tour Modal (Admin approve/reject) ─── */}
            {reviewTarget && (
                <ReviewTourModal
                    tour={reviewTarget.tour}
                    action={reviewTarget.action}
                    onConfirm={handleReviewTour}
                    onClose={() => setReviewTarget(null)}
                />
            )}

            {/* ── Delete Confirmation Dialog ─── */}
            {deleteTarget && (
                (() => {
                    const isDraftDelete = isStaff && (deleteTarget.status === 'DRAFT' || deleteTarget.status === 'REJECTED');
                    return (
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
                            <h2 id="delete-dialog-title" className="text-lg font-bold text-on-surface mb-2">
                                {isDraftDelete ? 'Xác nhận xóa bản nháp?' : 'Xác nhận Ẩn Tour?'}
                            </h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed">
                                {isDraftDelete
                                    ? <>Bản nháp <strong className="text-on-surface">&ldquo;{deleteTarget.name}&rdquo;</strong> sẽ bị xóa khỏi danh sách của bạn.</>
                                    : <>Tour <strong className="text-on-surface">&ldquo;{deleteTarget.name}&rdquo;</strong> sẽ bị ẩn khỏi danh sách và không hiển thị với khách hàng. Dữ liệu vẫn được lưu trữ và có thể khôi phục bởi quản trị viên.</>}
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
                                    isDraftDelete ? 'Xóa bản nháp' : 'Ẩn Tour'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                    );
                })()
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

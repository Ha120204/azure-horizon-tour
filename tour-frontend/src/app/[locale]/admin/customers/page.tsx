'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import AdminPagination from '@/components/admin/AdminPagination';


// ── Types ────────────────────────────────────────────────────────────
interface User {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    createdAt: string;
    deletedAt: string | null;
    status: string;
    bookingCount: number;
    reviewCount: number;
    dob?: string | null;
    gender?: string | null;
    recentBookings?: {
        id: number;
        bookingCode: string;
        totalPrice: number;
        status: string;
        createdAt: string;
        tour: { name: string };
    }[];
}

interface Stats {
    totalUsers: number;
    activeUsers: number;
    newThisMonth: number;
    staffAndAdmin: number;
}

interface Meta {
    totalItems: number;
    totalPages: number;
    currentPage: number;
}

interface ToastState {
    message: string;
    type: 'success' | 'error';
}

// ── Helpers ──────────────────────────────────────────────────────────
const statusConfig: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    Active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-500/10', label: 'Hoạt động' },
    Deactivated: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-500/10', label: 'Đã khóa' },
};

const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const formatRelativeDate = (d: string | null | undefined) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
    return formatDate(d);
};

const formatDateToISOInputValue = (d: string | null | undefined) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const avatarGradients = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-teal-400 to-cyan-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-green-600',
];

const getAvatarGradient = (id: number) => avatarGradients[id % avatarGradients.length];

const bookingStatusStyle: Record<string, { bg: string; text: string; label: string }> = {
    CONFIRMED: { bg: 'bg-emerald-500/10', text: 'text-emerald-700', label: 'Xác nhận' },
    PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-700', label: 'Chờ duyệt' },
    CANCELLED: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Đã hủy' },
};

// ── Component ────────────────────────────────────────────────────────
export default function CustomerManagementPage() {
    // Data state
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');

    // Fetch current user role
    useEffect(() => {
        const { API_BASE_URL: API } = require('@/lib/constants');
        fetchWithAuth(`${API_BASE_URL}/auth/profile`)
            .then((r: Response) => r.json())
            .then((d: any) => setCurrentUserRole(d.role || d.data?.role || ''))
            .catch(() => {});
    }, []);

    // Filter state
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);


    // UI & Action state
    const [toast, setToast] = useState<ToastState | null>(null);
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [toggleTarget, setToggleTarget] = useState<User | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    
    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        fullName: '',
        phone: '',
        dob: '',
        gender: ''
    });

    // Debounce ref
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // ── Debounce search ─────────────────────────────────────────
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [search]);

    // ── Fetch users ─────────────────────────────────────────────
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const qs = new URLSearchParams();
            if (debouncedSearch) qs.append('search', debouncedSearch);
            qs.append('role', 'CUSTOMER');
            if (filterStatus) qs.append('status', filterStatus);
            qs.append('page', String(page));
            qs.append('limit', String(pageSize));


            const res = await fetchWithAuth(`${API_BASE_URL}/user?${qs}`);
            if (!res.ok) { const err = await res.json(); throw new Error(JSON.stringify(err)); }
            const json = await res.json();
            // Interceptor: service trả { data: User[], meta } → interceptor pull lên, nên json.data = User[]
            setUsers(json.data ?? []);
            if (json.meta) setMeta(json.meta);
        } catch (error: any) {
            showToast('Lỗi tải danh sách khách hàng.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, filterStatus, page, pageSize]);


    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // ── Fetch stats ─────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/stats`);
            if (res.ok) {
                const json = await res.json();
                // TransformInterceptor wraps: { statusCode, message, data: Stats, timestamp }
                setStats(json?.data ?? json);
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    // ── Toast ───────────────────────────────────────────────────
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── View Detail ─────────────────────────────────────────────
    const openDetail = async (userId: number, editMode: boolean = false) => {
        setIsLoadingDetail(true);
        setDetailUser(null);
        setIsEditing(false);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/${userId}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            const payload = json.data || json;
            setDetailUser({ ...payload, status: payload.deletedAt ? 'Deactivated' : 'Active' });
            
            if (editMode) {
                startEditing({ ...payload, status: payload.deletedAt ? 'Deactivated' : 'Active' });
            }
        } catch {
            showToast('Không thể tải thông tin khách hàng.', 'error');
        } finally {
            setIsLoadingDetail(false);
        }
    };

    // ── Edit Handlers ───────────────────────────────────────────
    const startEditing = (user: User) => {
        setEditForm({
            fullName: user.fullName || '',
            phone: user.phone || '',
            dob: user.dob ? formatDateToISOInputValue(user.dob) : '',
            gender: user.gender || ''
        });
        setIsEditing(true);
    };

    const handleSaveInfo = async () => {
        if (!detailUser) return;
        setIsSaving(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/${detailUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: editForm.fullName || "",
                    phone: editForm.phone || "",
                    dob: editForm.dob ? new Date(editForm.dob).toISOString() : "",
                    gender: editForm.gender || ""
                })
            });
            
            if (!res.ok) {
                const errJson = await res.json().catch(() => null);
                throw new Error(errJson?.message || 'Không thể lưu, server từ chối.');
            }
            
            showToast('Lưu thông tin thành công!');
            setIsEditing(false);
            // Refresh detailed user data & list
            openDetail(detailUser.id);
            fetchUsers();
            
        } catch (error: any) {
            showToast('Lỗi: ' + (error.message || 'Lỗi lưu thông tin'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Toggle Status ───────────────────────────────────────────
    const handleToggleStatus = async () => {
        if (!toggleTarget) return;
        setIsToggling(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/${toggleTarget.id}/toggle-status`, {
                method: 'PATCH',
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed');
            }
            const result = await res.json();
            // TransformInterceptor wraps: { statusCode, message, data: { status, deletedAt }, timestamp }
            const payload = result?.data ?? result;
            const action = payload.status === 'Active' ? 'kích hoạt' : 'vô hiệu hóa';
            showToast(`Đã ${action} tài khoản "${toggleTarget.fullName}"`);
            setToggleTarget(null);
            fetchUsers();
            fetchStats();
            
            // Nếu đang mở modal detail người đó, cập nhật lại trạng thái
            if (detailUser && detailUser.id === toggleTarget.id) {
                setDetailUser({ ...detailUser, status: payload.status, deletedAt: payload.deletedAt });
            }
        } catch (e: any) {
            showToast(e.message || 'Thao tác thất bại.', 'error');
        } finally {
            setIsToggling(false);
        }
    };

    // ── KPI Cards Data ──────────────────────────────────────────
    const kpis = [
        {
            icon: 'group',
            label: 'Tổng Khách Hàng',
            value: stats?.totalUsers ?? '—',
            color: 'from-blue-500/20 to-blue-600/5',
            iconColor: 'text-blue-600 bg-blue-500/10',
            trend: null,
        },
        {
            icon: 'verified_user',
            label: 'Đang Hoạt Động',
            value: stats?.activeUsers ?? '—',
            color: 'from-emerald-500/20 to-emerald-600/5',
            iconColor: 'text-emerald-600 bg-emerald-500/10',
            trend: stats ? `${Math.round(((stats.activeUsers ?? 0) / (stats.totalUsers || 1)) * 100)}%` : null,
        },
        {
            icon: 'person_add',
            label: 'Mới Tháng Này',
            value: stats?.newThisMonth ?? '—',
            color: 'from-violet-500/20 to-violet-600/5',
            iconColor: 'text-violet-600 bg-violet-500/10',
            trend: null,
        },
        {
            icon: 'block',
            label: 'Đã Vô Hiệu',
            value: stats ? (Number(stats.totalUsers || 0) - Number(stats.activeUsers || 0)) : '—',
            color: 'from-red-500/20 to-red-600/5',
            iconColor: 'text-red-500 bg-red-500/10',
            trend: null,
        },
    ];

    // ── Render ───────────────────────────────────────────────────
    return (
        <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {/* Skip link */}
            <a href="#users-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
                Nhảy đến bảng dữ liệu
            </a>

            {/* ── Page Header ─── */}
            <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface" style={{ textWrap: 'balance' } as React.CSSProperties}>
                        Quản lý Khách Hàng
                    </h1>
                    <p className="text-on-surface-variant text-sm mt-1">Theo dõi và quản lý tài khoản khách hàng đã đăng ký trên hệ thống.</p>
                </div>
            </div>

            {/* ── KPI Cards ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map(kpi => (
                    <div key={kpi.label} className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-5 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconColor}`}>
                                <span className="material-symbols-outlined text-xl" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{kpi.icon}</span>
                            </div>
                            {kpi.trend && (
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">{kpi.trend}</span>
                            )}
                        </div>
                        <p className="text-2xl font-bold text-on-surface leading-tight">{kpi.value}</p>
                        <p className="text-xs text-on-surface-variant font-medium mt-1">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Filters ─── */}
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
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors placeholder:text-on-surface-variant/50"
                    />
                </div>
                <div className="flex gap-3 flex-wrap items-center">
                    <select
                        id="filter-status"
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Hoạt động</option>
                        <option value="deactivated">Đã khóa</option>
                    </select>

                    <span className="text-xs text-on-surface-variant font-medium px-2" aria-live="polite">
                        {meta.totalItems} khách hàng
                    </span>
                </div>
            </div>

            {/* ── Table ─── */}
            <div id="users-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Khách hàng</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Liên hệ</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ngày tham gia</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-center">Đơn đặt</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-center">Đánh giá</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-center w-[120px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {isLoading ? (
                                /* Loading skeleton */
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={`skel-${i}`} className="animate-pulse">
                                        <td className="py-4 px-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-surface-container-high" /><div className="space-y-2"><div className="h-3.5 w-28 bg-surface-container-high rounded" /><div className="h-2.5 w-20 bg-surface-container rounded" /></div></div></td>
                                        <td className="py-4 px-5"><div className="space-y-2"><div className="h-3 w-36 bg-surface-container-high rounded" /><div className="h-2.5 w-24 bg-surface-container rounded" /></div></td>
                                        <td className="py-4 px-5"><div className="h-3 w-24 bg-surface-container-high rounded" /></td>
                                        <td className="py-4 px-5"><div className="h-3 w-8 bg-surface-container-high rounded mx-auto" /></td>
                                        <td className="py-4 px-5"><div className="h-3 w-8 bg-surface-container-high rounded mx-auto" /></td>
                                        <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded-lg" /></td>
                                        <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded mx-auto" /></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                                                <span className="material-symbols-outlined text-3xl text-outline" aria-hidden="true">person_search</span>
                                            </div>
                                            <p className="font-bold text-on-surface">Không tìm thấy khách hàng nào</p>
                                            <p className="text-on-surface-variant text-sm mt-1 max-w-xs">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm để hiển thị kết quả.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => {
                                    const sc = statusConfig[user.status] || statusConfig.Active;
                                    return (
                                        <tr
                                            key={user.id}
                                            className={`hover:bg-primary/[0.03] transition-colors group cursor-pointer ${user.status === 'Deactivated' ? 'opacity-60' : ''}`}
                                            onClick={() => openDetail(user.id)}
                                        >
                                            {/* Avatar + Name */}
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {user.avatarUrl ? (
                                                        <img
                                                            src={user.avatarUrl}
                                                            alt={user.fullName}
                                                            className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-outline-variant/10 ${user.status === 'Deactivated' ? 'grayscale' : ''}`}
                                                        />
                                                    ) : (
                                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(user.id)} flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-sm`}>
                                                            {getInitials(user.fullName)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-on-surface truncate max-w-[180px] group-hover:text-primary transition-colors">{user.fullName || 'Chưa cập nhật'}</p>
                                                        <p className="text-xs text-on-surface-variant/60 mt-0.5 font-mono">
                                                            ID #{user.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Contact */}
                                            <td className="py-3.5 px-5">
                                                <div className="min-w-0">
                                                    <p className="text-sm text-on-surface truncate max-w-[200px]">{user.email}</p>
                                                    <p className="text-xs text-on-surface-variant/60 mt-0.5">{user.phone || 'Chưa cập nhật SĐT'}</p>
                                                </div>
                                            </td>
                                            {/* Created */}
                                            <td className="py-3.5 px-5">
                                                <p className="text-sm text-on-surface whitespace-nowrap">{formatDate(user.createdAt)}</p>
                                                <p className="text-xs text-on-surface-variant/60 mt-0.5">{formatRelativeDate(user.createdAt)}</p>
                                            </td>
                                            {/* Bookings count */}
                                            <td className="py-3.5 px-5 text-center">
                                                <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg text-sm font-bold ${
                                                    user.bookingCount > 0
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-on-surface-variant/50'
                                                }`}>
                                                    {user.bookingCount}
                                                </span>
                                            </td>
                                            {/* Reviews count */}
                                            <td className="py-3.5 px-5 text-center">
                                                <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg text-sm font-bold ${
                                                    user.reviewCount > 0
                                                        ? 'bg-amber-500/10 text-amber-600'
                                                        : 'text-on-surface-variant/50'
                                                }`}>
                                                    {user.reviewCount}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td className="py-3.5 px-5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                    {sc.label}
                                                </span>
                                            </td>
                                            {/* Hành động được thiết kế đồng bộ với dạng outline icon, có tooltip */}
                                            <td className="py-3.5 px-5 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* Xem */}
                                                    <div className="relative group/tip">
                                                        <button
                                                            onClick={() => openDetail(user.id)}
                                                            aria-label="Xem chi tiết"
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>visibility</span>
                                                        </button>
                                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                                                            Xem chi tiết
                                                            <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                                                        </span>
                                                    </div>
                                                    {/* Sửa thông tin — chỉ ADMIN trở lên */}
                                                    {currentUserRole !== 'STAFF' && (
                                                    <div className="relative group/tip">
                                                        <button
                                                            onClick={() => openDetail(user.id, true)}
                                                            aria-label="Chỉnh sửa"
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-blue-500/10 hover:text-blue-500 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>edit</span>
                                                        </button>
                                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                                                            Chỉnh sửa
                                                            <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                                                        </span>
                                                    </div>
                                                    )}
                                                    {/* Khóa/Mở khóa — chỉ ADMIN trở lên */}
                                                    {currentUserRole !== 'STAFF' && (
                                                    <div className="relative group/tip">
                                                        <button
                                                            onClick={() => setToggleTarget(user)}
                                                            aria-label="Đổi trạng thái"
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant transition-colors focus-visible:ring-2 outline-none ${
                                                                user.status === 'Active'
                                                                    ? 'hover:bg-error/10 hover:text-error focus-visible:ring-error'
                                                                    : 'text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 focus-visible:ring-emerald-500'
                                                            }`}
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>
                                                                {user.status === 'Active' ? 'block' : 'lock_open'}
                                                            </span>
                                                        </button>
                                                        <span className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20 ${
                                                            user.status === 'Active' ? 'bg-error text-on-error' : 'bg-emerald-500 text-white'
                                                        }`}>
                                                            {user.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa'}
                                                            <span className={`absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent ${
                                                                user.status === 'Active' ? 'border-t-error' : 'border-t-emerald-500'
                                                            }`} />
                                                        </span>
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
                        itemLabel="khách hàng"
                    />
                </div>
            </div>


            {/* ════════════════════════════════════════════════════════
                 MODAL: Centered Detail & Edit Panel
                 ════════════════════════════════════════════════════════ */}
            {(detailUser || isLoadingDetail) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="detail-title">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setDetailUser(null); setIsLoadingDetail(false); }} />

                    <div className="relative bg-surface-container-lowest rounded-[24px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-slide-up overflow-hidden">

                        {isLoadingDetail && !detailUser ? (
                            <div className="flex-1 flex items-center justify-center py-32">
                                <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
                            </div>
                        ) : detailUser && (
                            <>
                                {/* ── Header (Hero style) ── */}
                                <div className="relative flex-shrink-0 min-h-[140px]">
                                    {/* Gradient background */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${getAvatarGradient(detailUser.id)} opacity-90`} />
                                    <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px, 40px 40px' }} />

                                    {/* Actions */}
                                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                                        {!isEditing ? (
                                            <button
                                                onClick={() => startEditing(detailUser)}
                                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                                                title="Sửa thông tin"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-4 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors text-sm font-semibold"
                                            >
                                                Hủy sửa
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setDetailUser(null); setIsLoadingDetail(false); }}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 transition-colors"
                                            title="Đóng"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                    </div>

                                    {/* Profile summary */}
                                    <div className="relative z-[1] px-8 pt-8 pb-12 flex items-center gap-5">
                                        {/* Avatar */}
                                        {detailUser.avatarUrl ? (
                                            <img src={detailUser.avatarUrl} alt={detailUser.fullName || ''} className="w-24 h-24 rounded-full object-cover ring-4 ring-white/30 shadow-lg flex-shrink-0 bg-white" />
                                        ) : (
                                            <div className={`w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-3xl ring-4 ring-white/30 shadow-lg flex-shrink-0`}>
                                                {getInitials(detailUser.fullName)}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <h2 id="detail-title" className="font-headline text-2xl font-bold text-white drop-shadow-sm truncate">
                                                {detailUser.fullName || 'Chưa cập nhật'}
                                            </h2>
                                            <p className="text-white/90 font-medium text-sm mt-1 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px]">mail</span>
                                                {detailUser.email}
                                            </p>
                                            {/* Status badge */}
                                            <div className="flex items-center gap-3 mt-3">
                                                {(() => {
                                                    const sc = statusConfig[detailUser.status] || statusConfig.Active;
                                                    return (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                                            detailUser.status === 'Active'
                                                                ? 'bg-emerald-400/20 text-white border border-emerald-300/30'
                                                                : 'bg-red-500/30 text-white border border-red-300/30'
                                                        } backdrop-blur-sm shadow-sm`}>
                                                            <span className={`w-2 h-2 rounded-full ${detailUser.status === 'Active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                                            {sc.label}
                                                        </span>
                                                    );
                                                })()}
                                                <span className="text-white/70 text-xs font-mono bg-black/10 px-2 py-1 rounded-md backdrop-blur-sm">ID #{detailUser.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Content Area ── */}
                                <div className="flex-1 overflow-y-auto bg-surface-container-lowest -mt-4 relative rounded-t-[20px] z-[2]">
                                    
                                    {!isEditing ? (
                                        <div className="px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
                                            {/* Cột trái: Thông tin */}
                                            <div className="space-y-8">
                                                <div>
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-4">
                                                        <span className="material-symbols-outlined text-primary text-[18px]">account_box</span>
                                                        Hồ sơ cá nhân
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <DetailInfoCard icon="badge" label="Họ và tên" value={detailUser.fullName || '—'} />
                                                        <DetailInfoCard icon="call" label="Điện thoại" value={detailUser.phone || '—'} />
                                                        <DetailInfoCard icon="cake" label="Ngày sinh" value={detailUser.dob ? formatDate(detailUser.dob) : '—'} />
                                                        <DetailInfoCard icon="wc" label="Giới tính" value={detailUser.gender || '—'} />
                                                        <DetailInfoCard icon="calendar_month" label="Ngày tham gia" value={formatDate(detailUser.createdAt)} />
                                                        {detailUser.deletedAt && (
                                                            <DetailInfoCard icon="event_busy" label="Bị khóa vào ngày" value={formatDate(detailUser.deletedAt)} isWarning />
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-4">
                                                        <span className="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
                                                        Lịch sử đặt tour gần đây
                                                    </h3>
                                                    {detailUser.recentBookings && detailUser.recentBookings.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {detailUser.recentBookings.map(b => {
                                                                const bs = bookingStatusStyle[b.status] || { bg: 'bg-surface-container', text: 'text-on-surface-variant', label: b.status };
                                                                return (
                                                                    <div key={b.id} className="p-4 border border-outline-variant/20 rounded-2xl hover:bg-surface-container-lowest transition-colors flex items-center justify-between shadow-sm">
                                                                        <div className="min-w-0 flex-1 mr-4">
                                                                            <p className="text-sm font-bold text-on-surface truncate mb-1">{b.tour.name}</p>
                                                                            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                                                                                <span className="font-mono bg-surface-container-low px-1.5 py-0.5 rounded text-[11px] text-on-surface">{b.bookingCode.substring(0, 14)}</span>
                                                                                <span>•</span>
                                                                                <span>{formatDate(b.createdAt)}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${bs.bg} ${bs.text}`}>
                                                                                {bs.label}
                                                                            </span>
                                                                            <span className="text-sm font-bold text-primary">{formatCurrency(b.totalPrice)}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 border border-dashed border-outline-variant/40 rounded-2xl bg-surface-container-low/30">
                                                            <span className="material-symbols-outlined text-3xl text-outline mb-2" aria-hidden="true">luggage</span>
                                                            <p className="text-sm font-semibold text-on-surface-variant">Chưa có dữ liệu đặt tour</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Cột phải: Thống kê & Thao tác */}
                                            <div className="space-y-6">
                                                <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10">
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">Hoạt động</h3>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center pb-4 border-b border-outline-variant/10">
                                                            <span className="text-sm text-on-surface-variant">Tổng đơn đặt</span>
                                                            <span className="text-lg font-bold text-on-surface">{detailUser.bookingCount}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-on-surface-variant">Lượt đánh giá</span>
                                                            <span className="text-lg font-bold text-on-surface">{detailUser.reviewCount}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10">
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[18px]">settings</span>
                                                        Thao tác nhanh
                                                    </h3>
                                                    <button
                                                        onClick={() => {
                                                            setToggleTarget(detailUser);
                                                        }}
                                                        className={`w-full py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 border ${
                                                            detailUser.status === 'Active'
                                                                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                                                                : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                                            {detailUser.status === 'Active' ? 'block' : 'lock_open'}
                                                        </span>
                                                        {detailUser.status === 'Active' ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* FORM SỬA THÔNG TIN */
                                        <div className="px-8 py-8 animate-fade-slide-up">
                                            <div className="max-w-2xl mx-auto">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-primary text-[22px]">manage_accounts</span>
                                                        Chỉnh sửa thông tin cơ bản
                                                    </h3>
                                                    <span className="text-xs font-medium bg-surface-container px-3 py-1 rounded-full text-on-surface-variant">ID #{detailUser.id}</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
                                                    {/* Full Name */}
                                                    <div className="space-y-2">
                                                        <label htmlFor="edit-fullname" className="text-sm font-bold text-on-surface-variant block">Họ và tên</label>
                                                        <div className="relative">
                                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">person</span>
                                                            <input 
                                                                id="edit-fullname"
                                                                type="text" 
                                                                value={editForm.fullName}
                                                                onChange={(e) => setEditForm(prev => ({...prev, fullName: e.target.value}))}
                                                                placeholder="Nhập họ và tên..."
                                                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl pl-10 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors text-on-surface font-medium"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Phone */}
                                                    <div className="space-y-2">
                                                        <label htmlFor="edit-phone" className="text-sm font-bold text-on-surface-variant block">Số điện thoại</label>
                                                        <div className="relative">
                                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">call</span>
                                                            <input 
                                                                id="edit-phone"
                                                                type="tel" 
                                                                value={editForm.phone}
                                                                onChange={(e) => setEditForm(prev => ({...prev, phone: e.target.value}))}
                                                                placeholder="Nhập số điện thoại..."
                                                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl pl-10 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors text-on-surface font-medium"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Gender */}
                                                    <div className="space-y-2">
                                                        <label htmlFor="edit-gender" className="text-sm font-bold text-on-surface-variant block">Giới tính</label>
                                                        <div className="relative">
                                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] z-10 pointer-events-none">wc</span>
                                                            <select 
                                                                id="edit-gender"
                                                                value={editForm.gender}
                                                                onChange={(e) => setEditForm(prev => ({...prev, gender: e.target.value}))}
                                                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl pl-10 pr-10 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors text-on-surface font-medium appearance-none cursor-pointer"
                                                            >
                                                                <option value="">Chưa cập nhật</option>
                                                                <option value="Nam">Nam</option>
                                                                <option value="Nữ">Nữ</option>
                                                                <option value="Khác">Khác</option>
                                                            </select>
                                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                                                        </div>
                                                    </div>

                                                    {/* DOB */}
                                                    <div className="space-y-2">
                                                        <label htmlFor="edit-dob" className="text-sm font-bold text-on-surface-variant block">Ngày sinh</label>
                                                        <div className="relative">
                                                            <input 
                                                                id="edit-dob"
                                                                type="date" 
                                                                value={editForm.dob}
                                                                onChange={(e) => setEditForm(prev => ({...prev, dob: e.target.value}))}
                                                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors text-on-surface font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action buttons */}
                                                <div className="mt-8 flex items-center gap-4 justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditing(false)}
                                                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                                                    >
                                                        Hủy bỏ
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveInfo}
                                                        disabled={isSaving}
                                                        className="px-8 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20 transition-all flex items-center gap-2"
                                                    >
                                                        {isSaving ? (
                                                            <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Đang lưu...</>
                                                        ) : (
                                                            <><span className="material-symbols-outlined text-[18px]">save</span> Lưu thay đổi</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════
                 MODAL: Toggle Status Confirmation
                 ════════════════════════════════════════════════════════ */}
            {toggleTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center" role="alertdialog" aria-modal="true" aria-labelledby="toggle-dialog-title">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setToggleTarget(null)} />
                    <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-slide-up">
                        <div className="p-7">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${toggleTarget.status === 'Active' ? 'bg-red-500/10' : 'bg-emerald-500/10'
                                }`}>
                                <span className={`material-symbols-outlined text-2xl ${toggleTarget.status === 'Active' ? 'text-red-600' : 'text-emerald-600'
                                    }`} aria-hidden="true">
                                    {toggleTarget.status === 'Active' ? 'block' : 'lock_open'}
                                </span>
                            </div>
                            <h2 id="toggle-dialog-title" className="text-lg font-bold text-on-surface mb-2">
                                {toggleTarget.status === 'Active' ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
                            </h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed">
                                {toggleTarget.status === 'Active' ? (
                                    <>Tài khoản <strong className="text-on-surface">&quot;{toggleTarget.fullName}&quot;</strong> sẽ bị khóa và không thể đăng nhập cho đến khi được mở khóa lại.</>
                                ) : (
                                    <>Tài khoản <strong className="text-on-surface">&quot;{toggleTarget.fullName}&quot;</strong> sẽ được mở khóa và có thể đăng nhập bình thường.</>
                                )}
                            </p>
                        </div>
                        <div className="px-7 pb-6 flex gap-3 justify-end">
                            <button
                                onClick={() => setToggleTarget(null)}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleToggleStatus}
                                disabled={isToggling}
                                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 outline-none ${toggleTarget.status === 'Active'
                                        ? 'bg-red-600 text-white hover:opacity-90 focus-visible:ring-red-500'
                                        : 'bg-emerald-600 text-white hover:opacity-90 focus-visible:ring-emerald-500'
                                    }`}
                            >
                                {isToggling ? (
                                    <>
                                        <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                                        Đang xử lý…
                                    </>
                                ) : (
                                    toggleTarget.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ─── */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.message}</div>
            {toast && (
                <div
                    role="status"
                    className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                        }`}
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                    {toast.message}
                </div>
            )}

        </main>
    );
}

// ── Sub-components ───────────────────────────────────────────────────
function DetailInfoCard({ icon, label, value, isWarning = false }: { icon: string; label: string; value: string; isWarning?: boolean }) {
    return (
        <div className={`p-4 rounded-2xl border ${isWarning ? 'border-red-500/20 bg-red-50' : 'border-outline-variant/15 bg-surface-container-lowest'}`}>
            <div className="flex items-center gap-3 mb-1">
                <span className={`material-symbols-outlined text-[18px] ${isWarning ? 'text-red-500' : 'text-on-surface-variant'}`} aria-hidden="true">{icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</span>
            </div>
            <p className={`text-sm font-semibold pl-8 ${isWarning ? 'text-red-700' : 'text-on-surface'}`}>{value}</p>
        </div>
    );
}

// ── Pagination helper ────────────────────────────────────────────────
function generatePageNumbers(current: number, total: number): (number | string)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | string)[] = [];
    if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
    } else if (current >= total - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
    }
    return pages;
}

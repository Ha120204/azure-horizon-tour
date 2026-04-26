'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import AdminPagination from '@/app/components/admin/AdminPagination';


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
const roleConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    SUPER_ADMIN: {
        label: 'Super Admin',
        bg: 'bg-gradient-to-r from-amber-500/15 to-orange-500/15',
        text: 'text-amber-700',
        icon: 'shield_with_heart',
    },
    ADMIN: {
        label: 'Admin',
        bg: 'bg-gradient-to-r from-violet-500/15 to-purple-500/15',
        text: 'text-violet-700',
        icon: 'admin_panel_settings',
    },
    STAFF: {
        label: 'Staff',
        bg: 'bg-gradient-to-r from-sky-500/15 to-blue-500/15',
        text: 'text-sky-700',
        icon: 'support_agent',
    },
    CUSTOMER: {
        label: 'Customer',
        bg: 'bg-surface-container',
        text: 'text-on-surface-variant',
        icon: 'person',
    },
};

const statusConfig: Record<string, { dot: string; text: string; bg: string }> = {
    Active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-500/10' },
    Deactivated: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-500/10' },
};

const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
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

const bookingStatusStyle: Record<string, string> = {
    CONFIRMED: 'bg-emerald-500/10 text-emerald-700',
    PENDING: 'bg-amber-500/10 text-amber-700',
    CANCELLED: 'bg-red-500/10 text-red-600',
};

// ── Component ────────────────────────────────────────────────────────
export default function StaffManagementPage() {
    // Data state
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');

    // Filter state
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);


    // UI state
    const [toast, setToast] = useState<ToastState | null>(null);
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [roleEditUser, setRoleEditUser] = useState<User | null>(null);
    const [newRole, setNewRole] = useState('');
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [toggleTarget, setToggleTarget] = useState<User | null>(null);
    const [isToggling, setIsToggling] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ fullName: '', phone: '', dob: '', gender: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Create user state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ email: '', password: '', fullName: '', phone: '', role: 'STAFF', sendEmail: true });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

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

    // ── Fetch current user role ─────────────────────────────────
    useEffect(() => {
        fetchWithAuth(`${API_BASE_URL}/auth/profile`)
            .then((r: Response) => r.json())
            .then((d: any) => setCurrentUserRole(d.role || d.data?.role || ''))
            .catch(() => { });
    }, []);

    // ── Fetch users ─────────────────────────────────────────────
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const qs = new URLSearchParams();
            if (debouncedSearch) qs.append('search', debouncedSearch);
            if (filterRole) qs.append('role', filterRole);
            else qs.append('role', 'STAFF,ADMIN');
            if (filterStatus) qs.append('status', filterStatus);
            qs.append('page', String(page));
            qs.append('limit', String(pageSize));


            const res = await fetchWithAuth(`${API_BASE_URL}/user?${qs}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setUsers(json.data ?? []);
            if (json.meta) setMeta(json.meta);
        } catch {
            showToast('Lỗi tải danh sách người dùng.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, filterRole, filterStatus, page, pageSize]);


    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // ── Fetch stats ─────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/stats`);
            if (res.ok) {
                const json = await res.json();
                setStats(json);
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
            showToast('Không thể tải thông tin người dùng.', 'error');
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
            openDetail(detailUser.id);
            fetchUsers();
        } catch (error: any) {
            showToast('Lỗi: ' + (error.message || 'Lỗi lưu thông tin'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Update Role ─────────────────────────────────────────────
    const handleUpdateRole = async () => {
        if (!roleEditUser || !newRole) return;
        setIsUpdatingRole(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/${roleEditUser.id}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed');
            }
            showToast(`Đã đổi role của "${roleEditUser.fullName}" thành ${roleConfig[newRole]?.label || newRole}`);
            setRoleEditUser(null);
            setNewRole('');
            fetchUsers();
            fetchStats();
        } catch (e: any) {
            showToast(e.message || 'Đổi role thất bại.', 'error');
        } finally {
            setIsUpdatingRole(false);
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
            const action = result.status === 'Active' ? 'kích hoạt' : 'vô hiệu hóa';
            showToast(`Đã ${action} tài khoản "${toggleTarget.fullName}"`);
            setToggleTarget(null);
            fetchUsers();
            fetchStats();
        } catch (e: any) {
            showToast(e.message || 'Thao tác thất bại.', 'error');
        } finally {
            setIsToggling(false);
        }
    };

    // ── Create User ─────────────────────────────────────────────
    const handleCreateUser = async () => {
        const errors: Record<string, string> = {};
        if (!createForm.email.trim()) errors.email = 'Vui lòng nhập email';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) errors.email = 'Email không hợp lệ';
        if (!createForm.password) errors.password = 'Vui lòng nhập mật khẩu';
        else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(createForm.password)) {
            errors.password = 'Mật khẩu chưa đúng yêu cầu';
        }
        if (!confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
        else if (confirmPassword !== createForm.password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        if (!createForm.fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên';
        if (Object.keys(errors).length) { setCreateErrors(errors); return; }
        setCreateErrors({});
        setIsCreating(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Tạo tài khoản thất bại');
            }
            showToast(`Tạo tài khoản "${createForm.fullName}" thành công!`);
            setShowCreateModal(false);
            setCreateForm({ email: '', password: '', fullName: '', phone: '', role: 'STAFF', sendEmail: true });
            setConfirmPassword('');
            fetchUsers();
            fetchStats();
        } catch (e: any) {
            showToast(e.message || 'Tạo tài khoản thất bại.', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    // ── KPI Cards Data ──────────────────────────────────────────
    const kpis = [
        { icon: 'shield_person', label: 'Tổng Nhân Sự', value: stats?.staffAndAdmin ?? '—', color: 'bg-amber-500/10 text-amber-600' },
        { icon: 'verified_user', label: 'Hoạt Động (All)', value: stats?.activeUsers ?? '—', color: 'bg-emerald-500/10 text-emerald-600' },
        { icon: 'person_add', label: 'Mới Tháng Này (All)', value: stats?.newThisMonth ?? '—', color: 'bg-violet-500/10 text-violet-600' },
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
                        Danh sách Nhân Sự
                    </h1>
                    <p className="text-on-surface-variant text-sm mt-1">Quản lý tài khoản quản trị và nhân viên nội bộ của hệ thống.</p>
                </div>
                {currentUserRole !== 'STAFF' && (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">person_add</span>
                    Tạo tài khoản
                </button>
                )}
            </div>

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
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ─── */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 border border-outline-variant/10 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[220px] relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none" aria-hidden="true">search</span>
                    <label htmlFor="search-users" className="sr-only">Tìm kiếm người dùng</label>
                    <input
                        id="search-users"
                        type="search"
                        autoComplete="off"
                        placeholder="Tìm theo tên hoặc email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                    />
                </div>
                <div className="flex gap-3 flex-wrap">
                    <label htmlFor="filter-role" className="sr-only">Lọc theo role</label>
                    <select
                        id="filter-role"
                        value={filterRole}
                        onChange={e => { setFilterRole(e.target.value); setPage(1); }}
                        className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                    >
                        <option value="">Tất cả Role</option>
                        <option value="ADMIN">Admin</option>
                        <option value="STAFF">Staff</option>
                    </select>
                    <label htmlFor="filter-status" className="sr-only">Lọc theo trạng thái</label>
                    <select
                        id="filter-status"
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Active</option>
                        <option value="deactivated">Deactivated</option>
                    </select>
                </div>
            </div>

            {/* ── Table ─── */}
            <div id="users-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Người dùng</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Liên hệ</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Role</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ngày tạo</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Bookings</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
                                <th className="py-3.5 px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {isLoading ? (
                                /* Loading skeleton */
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={`skel-${i}`} className="animate-pulse">
                                        <td className="py-4 px-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-surface-container-high" /><div className="space-y-2"><div className="h-3.5 w-28 bg-surface-container-high rounded" /><div className="h-2.5 w-20 bg-surface-container rounded" /></div></div></td>
                                        <td className="py-4 px-5"><div className="space-y-2"><div className="h-3 w-36 bg-surface-container-high rounded" /><div className="h-2.5 w-24 bg-surface-container rounded" /></div></td>
                                        <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded-lg" /></td>
                                        <td className="py-4 px-5"><div className="h-3 w-20 bg-surface-container-high rounded" /></td>
                                        <td className="py-4 px-5"><div className="h-3 w-8 bg-surface-container-high rounded" /></td>
                                        <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded-lg" /></td>
                                        <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <span className="material-symbols-outlined text-4xl text-outline mb-2 block" aria-hidden="true">person_search</span>
                                        <p className="font-bold text-on-surface">Không tìm thấy người dùng nào</p>
                                        <p className="text-on-surface-variant text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => {
                                    const rc = roleConfig[user.role] || roleConfig.CUSTOMER;
                                    const sc = statusConfig[user.status] || statusConfig.Active;
                                    return (
                                        <tr key={user.id} className={`hover:bg-surface-container-low/40 transition-colors group ${user.status === 'Deactivated' ? 'opacity-60' : ''}`}>
                                            {/* Avatar + Name */}
                                            <td className="py-3 px-5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {user.avatarUrl ? (
                                                        <img
                                                            src={user.avatarUrl}
                                                            alt={user.fullName}
                                                            className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-outline-variant/10 ${user.status === 'Deactivated' ? 'grayscale' : ''}`}
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs ring-2 ring-outline-variant/10">
                                                            {getInitials(user.fullName)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-on-surface truncate max-w-[180px]">{user.fullName || 'Chưa cập nhật'}</p>
                                                        <p className="text-xs text-on-surface-variant mt-0.5">
                                                            <span translate="no" className="font-mono">#{user.id}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Contact */}
                                            <td className="py-3 px-5">
                                                <p className="text-sm text-on-surface-variant truncate max-w-[200px]">{user.email}</p>
                                                <p className="text-xs text-outline mt-0.5">{user.phone || '—'}</p>
                                            </td>
                                            {/* Role Badge */}
                                            <td className="py-3 px-5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${rc.bg} ${rc.text}`}>
                                                    <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{rc.icon}</span>
                                                    {rc.label}
                                                </span>
                                            </td>
                                            {/* Created */}
                                            <td className="py-3 px-5 text-sm text-on-surface-variant whitespace-nowrap">
                                                {formatDate(user.createdAt)}
                                            </td>
                                            {/* Bookings count */}
                                            <td className="py-3 px-5 text-sm font-semibold text-on-surface">
                                                {user.bookingCount}
                                            </td>
                                            {/* Status */}
                                            <td className="py-3 px-5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                    {user.status}
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="py-3 px-5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1">
                                                    {/* View detail */}
                                                    <div className="relative group/tip">
                                                        <button
                                                            onClick={() => openDetail(user.id)}
                                                            aria-label={`Xem chi tiết ${user.fullName}`}
                                                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all focus-visible:ring-2 focus-visible:ring-primary outline-none"
                                                        >
                                                            <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>visibility</span>
                                                        </button>
                                                        <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-on-surface text-surface text-[11px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none shadow-lg">Xem chi tiết</span>
                                                    </div>
                                                    {/* Edit info — chỉ ADMIN trở lên */}
                                                    {currentUserRole !== 'STAFF' && (
                                                    <div className="relative group/tip">
                                                        <button
                                                            onClick={() => openDetail(user.id, true)}
                                                            aria-label={`Sửa thông tin ${user.fullName}`}
                                                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 outline-none"
                                                        >
                                                            <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>edit</span>
                                                        </button>
                                                        <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-on-surface text-surface text-[11px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none shadow-lg">Sửa thông tin</span>
                                                    </div>
                                                    )}
                                                    {/* Edit role — only SUPER_ADMIN */}
                                                    {currentUserRole === 'SUPER_ADMIN' && (
                                                        <div className="relative group/tip">
                                                            <button
                                                                onClick={() => { setRoleEditUser(user); setNewRole(user.role); }}
                                                                aria-label={`Đổi role ${user.fullName}`}
                                                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/30 transition-all focus-visible:ring-2 focus-visible:ring-violet-500 outline-none"
                                                            >
                                                                <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>shield</span>
                                                            </button>
                                                            <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-on-surface text-surface text-[11px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none shadow-lg">Đổi quyền</span>
                                                        </div>
                                                    )}
                                                    {/* Toggle status — chỉ ADMIN trở lên */}
                                                    {currentUserRole !== 'STAFF' && (
                                                    <div className="relative group/tip">
                                                        <button
                                                            onClick={() => setToggleTarget(user)}
                                                            aria-label={user.status === 'Active' ? `Vô hiệu hóa ${user.fullName}` : `Kích hoạt ${user.fullName}`}
                                                            className={`w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/20 transition-all focus-visible:ring-2 outline-none ${user.status === 'Active'
                                                                    ? 'text-on-surface-variant hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 focus-visible:ring-red-500'
                                                                    : 'text-on-surface-variant hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 focus-visible:ring-emerald-500'
                                                                }`}
                                                        >
                                                            <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>
                                                                {user.status === 'Active' ? 'block' : 'lock_open'}
                                                            </span>
                                                        </button>
                                                        <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-on-surface text-surface text-[11px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none shadow-lg">{user.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt'}</span>
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
                        itemLabel="nhân sự"
                    />
                </div>
            </div>


            {/* ════════════════════════════════════════════════════════
                 MODAL: User Detail — Centered Premium with Edit
                 ════════════════════════════════════════════════════════ */}
            {(detailUser || isLoadingDetail) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="detail-title">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setDetailUser(null); setIsLoadingDetail(false); setIsEditing(false); }} />

                    <div className="relative bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-slide-up">

                        {isLoadingDetail && !detailUser ? (
                            <div className="flex items-center justify-center py-32">
                                <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
                            </div>
                        ) : detailUser && (
                            <>
                                {/* ── Hero Header ── */}
                                <div className="relative overflow-hidden">
                                    {/* Gradient background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px, 40px 40px' }} />

                                    {/* Action buttons */}
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
                                            onClick={() => { setDetailUser(null); setIsLoadingDetail(false); setIsEditing(false); }}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 transition-colors"
                                            title="Đóng"
                                        >
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                    </div>

                                    {/* Profile content */}
                                    <div className="relative z-[1] px-8 pt-8 pb-14 text-center">
                                        {/* Avatar */}
                                        {detailUser.avatarUrl ? (
                                            <img src={detailUser.avatarUrl} alt={detailUser.fullName || ''} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg mx-auto" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/20 shadow-lg mx-auto">
                                                {getInitials(detailUser.fullName)}
                                            </div>
                                        )}
                                        <h2 id="detail-title" className="font-headline text-xl font-bold text-white mt-4">
                                            {detailUser.fullName || 'Chưa cập nhật'}
                                        </h2>
                                        <p className="text-white/70 text-sm mt-1">{detailUser.email}</p>

                                        {/* Role & Status badges */}
                                        <div className="flex items-center justify-center gap-2 mt-3">
                                            {(() => {
                                                const rc = roleConfig[detailUser.role] || roleConfig.CUSTOMER;
                                                const sc = statusConfig[detailUser.status] || statusConfig.Active;
                                                return (
                                                    <>
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-sm text-white">
                                                            <span className="material-symbols-outlined text-[13px]">{rc.icon}</span>
                                                            {rc.label}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${detailUser.status === 'Active'
                                                                ? 'bg-emerald-400/20 text-emerald-200'
                                                                : 'bg-red-400/20 text-red-200'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                            {detailUser.status}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Stats Cards (overlapping hero) ── */}
                                <div className="px-8 -mt-7 relative z-[2]">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-surface-container-lowest rounded-2xl p-4 text-center shadow-md border border-outline-variant/10">
                                            <span className="material-symbols-outlined text-primary text-xl mb-1 block">confirmation_number</span>
                                            <p className="text-2xl font-bold text-on-surface">{detailUser.bookingCount ?? 0}</p>
                                            <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Bookings</p>
                                        </div>
                                        <div className="bg-surface-container-lowest rounded-2xl p-4 text-center shadow-md border border-outline-variant/10">
                                            <span className="material-symbols-outlined text-amber-500 text-xl mb-1 block">star</span>
                                            <p className="text-2xl font-bold text-on-surface">{detailUser.reviewCount ?? 0}</p>
                                            <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Reviews</p>
                                        </div>
                                        <div className="bg-surface-container-lowest rounded-2xl p-4 text-center shadow-md border border-outline-variant/10">
                                            <span className="material-symbols-outlined text-violet-500 text-xl mb-1 block">calendar_month</span>
                                            <p className="text-sm font-bold text-on-surface">{formatDate(detailUser.createdAt)}</p>
                                            <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Ngày tạo</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Scrollable body ── */}
                                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

                                    {/* ── EDIT MODE: Form ── */}
                                    {isEditing ? (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary">edit_note</span>
                                                    Chỉnh sửa thông tin cơ bản
                                                </h4>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/8 text-primary text-[11px] font-bold">
                                                    <span className="material-symbols-outlined text-[13px]">badge</span>
                                                    ID #{detailUser.id}
                                                </span>
                                            </div>

                                            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 space-y-5">
                                                {/* Row 1: Full Name + Phone */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Họ và tên</label>
                                                        <div className="relative">
                                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">person</span>
                                                            <input
                                                                type="text"
                                                                value={editForm.fullName}
                                                                onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/30 outline-none transition-all"
                                                                placeholder="Nhập họ và tên"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Số điện thoại</label>
                                                        <div className="relative">
                                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">call</span>
                                                            <input
                                                                type="tel"
                                                                value={editForm.phone}
                                                                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/30 outline-none transition-all"
                                                                placeholder="0901234567"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Row 2: Gender + DOB */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Giới tính</label>
                                                        <div className="relative">
                                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">wc</span>
                                                            <select
                                                                value={editForm.gender}
                                                                onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-9 py-3 text-sm font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/30 outline-none appearance-none cursor-pointer transition-all"
                                                            >
                                                                <option value="">Chọn giới tính</option>
                                                                <option value="Nam">Nam</option>
                                                                <option value="Nữ">Nữ</option>
                                                                <option value="Khác">Khác</option>
                                                            </select>
                                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base pointer-events-none">expand_more</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Ngày sinh</label>
                                                        <div className="relative">
                                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">cake</span>
                                                            <input
                                                                type="date"
                                                                value={editForm.dob}
                                                                onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))}
                                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/30 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Save / Cancel buttons */}
                                            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-outline-variant/10">
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                                                >
                                                    Hủy bỏ
                                                </button>
                                                <button
                                                    onClick={handleSaveInfo}
                                                    disabled={isSaving}
                                                    className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 shadow-sm"
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                                            Đang lưu…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined text-base">save</span>
                                                            Lưu thay đổi
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── VIEW MODE: Read-only Info ── */
                                        <>
                                            {/* Personal Info */}
                                            <div>
                                                <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-3 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary">person</span>
                                                    Thông tin cá nhân
                                                </h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                                                            <span className="material-symbols-outlined text-primary text-base">call</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Điện thoại</p>
                                                            <p className="text-sm text-on-surface font-medium mt-0.5 truncate">{detailUser.phone || '—'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-amber-500/8 flex items-center justify-center flex-shrink-0">
                                                            <span className="material-symbols-outlined text-amber-600 text-base">cake</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Ngày sinh</p>
                                                            <p className="text-sm text-on-surface font-medium mt-0.5 truncate">{detailUser.dob ? formatDate(detailUser.dob) : '—'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-violet-500/8 flex items-center justify-center flex-shrink-0">
                                                            <span className="material-symbols-outlined text-violet-600 text-base">wc</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Giới tính</p>
                                                            <p className="text-sm text-on-surface font-medium mt-0.5 truncate">{detailUser.gender || '—'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-emerald-500/8 flex items-center justify-center flex-shrink-0">
                                                            <span className="material-symbols-outlined text-emerald-600 text-base">tag</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Mã ID</p>
                                                            <p className="text-sm text-on-surface font-mono font-medium mt-0.5">#{detailUser.id}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Actions */}
                                            <div>
                                                <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-3 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary">tune</span>
                                                    Thao tác nhanh
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => startEditing(detailUser)}
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant/20 text-on-surface-variant hover:bg-amber-500/8 hover:text-amber-700 hover:border-amber-500/30 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        Sửa thông tin
                                                    </button>
                                                    {currentUserRole === 'SUPER_ADMIN' && (
                                                        <button
                                                            onClick={() => { setRoleEditUser(detailUser); setNewRole(detailUser.role); }}
                                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant/20 text-on-surface-variant hover:bg-violet-500/8 hover:text-violet-700 hover:border-violet-500/30 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">shield</span>
                                                            Đổi quyền
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setToggleTarget(detailUser)}
                                                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant/20 transition-all ${
                                                            detailUser.status === 'Active'
                                                                ? 'text-on-surface-variant hover:bg-red-500/8 hover:text-red-600 hover:border-red-500/30'
                                                                : 'text-on-surface-variant hover:bg-emerald-500/8 hover:text-emerald-600 hover:border-emerald-500/30'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            {detailUser.status === 'Active' ? 'block' : 'lock_open'}
                                                        </span>
                                                        {detailUser.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Recent Bookings */}
                                            {detailUser.recentBookings && detailUser.recentBookings.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-3 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-sm text-primary">receipt_long</span>
                                                        Booking gần đây
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {detailUser.recentBookings.map(b => (
                                                            <div key={b.id} className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                                                                        <span className="material-symbols-outlined text-primary text-base">flight_takeoff</span>
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-semibold text-on-surface truncate">{b.tour.name}</p>
                                                                        <p className="text-xs text-on-surface-variant mt-0.5">
                                                                            <span className="font-mono">{b.bookingCode.substring(0, 14)}</span>
                                                                            {' · '}
                                                                            {formatDate(b.createdAt)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                                    <span className="text-sm font-bold text-on-surface">{formatCurrency(b.totalPrice)}</span>
                                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${bookingStatusStyle[b.status] || 'bg-surface-container text-on-surface-variant'}`}>
                                                                        {b.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Empty state for bookings */}
                                            {(!detailUser.recentBookings || detailUser.recentBookings.length === 0) && (
                                                <div className="text-center py-6 bg-surface-container-low rounded-2xl">
                                                    <span className="material-symbols-outlined text-3xl text-outline mb-2 block">luggage</span>
                                                    <p className="text-sm font-semibold text-on-surface-variant">Chưa có booking nào</p>
                                                    <p className="text-xs text-outline mt-1">Người dùng này chưa thực hiện đặt tour.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════
                 MODAL: Edit Role
                 ════════════════════════════════════════════════════════ */}
            {roleEditUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRoleEditUser(null)} />
                    <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-7">
                            <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-5">
                                <span className="material-symbols-outlined text-violet-600 text-2xl" aria-hidden="true">admin_panel_settings</span>
                            </div>
                            <h2 id="role-dialog-title" className="text-lg font-bold text-on-surface mb-1">Đổi Role</h2>
                            <p className="text-on-surface-variant text-sm mb-5">
                                Đổi quyền cho <strong className="text-on-surface">{roleEditUser.fullName}</strong>
                            </p>

                            <div className="space-y-2">
                                {Object.entries(roleConfig).filter(([key]) => key !== 'SUPER_ADMIN').map(([key, cfg]) => (
                                    <label
                                        key={key}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${newRole === key
                                                ? 'border-primary bg-primary/5'
                                                : 'border-transparent hover:bg-surface-container-low'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value={key}
                                            checked={newRole === key}
                                            onChange={() => setNewRole(key)}
                                            className="accent-primary w-4 h-4"
                                        />
                                        <span className={`material-symbols-outlined text-lg ${cfg.text}`}>{cfg.icon}</span>
                                        <span className="text-sm font-medium text-on-surface">{cfg.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="px-7 pb-6 flex gap-3 justify-end">
                            <button
                                onClick={() => setRoleEditUser(null)}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpdateRole}
                                disabled={isUpdatingRole || newRole === roleEditUser.role}
                                className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                            >
                                {isUpdatingRole ? (
                                    <>
                                        <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                                        Đang cập nhật…
                                    </>
                                ) : (
                                    'Xác nhận'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════
                 MODAL: Toggle Status Confirmation
                 ════════════════════════════════════════════════════════ */}
            {toggleTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" role="alertdialog" aria-modal="true" aria-labelledby="toggle-dialog-title">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setToggleTarget(null)} />
                    <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-7">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${toggleTarget.status === 'Active' ? 'bg-red-500/10' : 'bg-emerald-500/10'
                                }`}>
                                <span className={`material-symbols-outlined text-2xl ${toggleTarget.status === 'Active' ? 'text-red-600' : 'text-emerald-600'
                                    }`} aria-hidden="true">
                                    {toggleTarget.status === 'Active' ? 'person_off' : 'how_to_reg'}
                                </span>
                            </div>
                            <h2 id="toggle-dialog-title" className="text-lg font-bold text-on-surface mb-2">
                                {toggleTarget.status === 'Active' ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?'}
                            </h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed">
                                {toggleTarget.status === 'Active' ? (
                                    <>Tài khoản <strong className="text-on-surface">&quot;{toggleTarget.fullName}&quot;</strong> sẽ bị vô hiệu hóa và không thể đăng nhập cho đến khi được kích hoạt lại.</>
                                ) : (
                                    <>Tài khoản <strong className="text-on-surface">&quot;{toggleTarget.fullName}&quot;</strong> sẽ được kích hoạt lại và có thể đăng nhập bình thường.</>
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
                                    toggleTarget.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════
                 MODAL: Create User
                 ════════════════════════════════════════════════════════ */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="create-dialog-title">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-slide-up">
                        {/* Header */}
                        <div className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
                            <div className="relative z-[1] px-8 py-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-xl">person_add</span>
                                    </div>
                                    <div>
                                        <h2 id="create-dialog-title" className="text-lg font-bold text-white">Tạo tài khoản mới</h2>
                                        <p className="text-white/60 text-xs mt-0.5">Thêm nhân viên hoặc quản trị viên</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="px-8 py-6 space-y-4">
                            {/* Full Name */}
                            <div>
                                <label htmlFor="create-name" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                                    Họ tên <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">badge</span>
                                    <input
                                        id="create-name"
                                        type="text"
                                        value={createForm.fullName}
                                        onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                                        placeholder="Nguyễn Văn A"
                                        className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${createErrors.fullName ? 'border-red-400' : 'border-outline-variant/15'}`}
                                    />
                                </div>
                                {createErrors.fullName && <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.fullName}</p>}
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="create-email" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">mail</span>
                                    <input
                                        id="create-email"
                                        type="email"
                                        value={createForm.email}
                                        onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                                        placeholder="email@example.com"
                                        className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${createErrors.email ? 'border-red-400' : 'border-outline-variant/15'}`}
                                    />
                                </div>
                                {createErrors.email && <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.email}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="create-password" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                                    Mật khẩu <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">lock</span>
                                    <input
                                        id="create-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={createForm.password}
                                        onChange={e => { setCreateForm(f => ({ ...f, password: e.target.value })); setCreateErrors(e2 => ({ ...e2, password: '' })); }}
                                        placeholder="Nhập mật khẩu"
                                        className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-11 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${createErrors.password ? 'border-red-400' : 'border-outline-variant/15'}`}
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
                                    </button>
                                </div>
                                {createErrors.password && <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.password}</p>}
                                {/* Password requirements */}
                                <div className="mt-2 p-3 bg-surface-container-low/50 border border-outline-variant/10 rounded-xl">
                                    <p className="text-[11px] font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">info</span>
                                        Yêu cầu mật khẩu:
                                    </p>
                                    <ul className="text-[11px] text-on-surface-variant/80 space-y-0.5 pl-4">
                                        <li className={`flex items-center gap-1.5 ${createForm.password.length >= 8 ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{createForm.password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 8 ký tự
                                        </li>
                                        <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{/[A-Z]/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 1 chữ in hoa (A-Z)
                                        </li>
                                        <li className={`flex items-center gap-1.5 ${/[a-z]/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{/[a-z]/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 1 chữ in thường (a-z)
                                        </li>
                                        <li className={`flex items-center gap-1.5 ${/\d/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{/\d/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 1 chữ số (0-9)
                                        </li>
                                        <li className={`flex items-center gap-1.5 ${/[@$!%*?&]/.test(createForm.password) ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{/[@$!%*?&]/.test(createForm.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 1 ký tự đặc biệt (@$!%*?&)
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="create-confirm-password" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className={`material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none ${confirmPassword && confirmPassword !== createForm.password ? 'text-red-500' : 'text-on-surface-variant'}`}>lock_reset</span>
                                    <input
                                        id="create-confirm-password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => { setConfirmPassword(e.target.value); setCreateErrors(e2 => ({ ...e2, confirmPassword: '' })); }}
                                        placeholder="Nhập lại mật khẩu"
                                        className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-11 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${(createErrors.confirmPassword || (confirmPassword && confirmPassword !== createForm.password)) ? 'border-red-400' : 'border-outline-variant/15'}`}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">{showConfirmPassword ? 'visibility' : 'visibility_off'}</span>
                                    </button>
                                </div>
                                {confirmPassword && confirmPassword !== createForm.password && (
                                    <p className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        Mật khẩu xác nhận không khớp
                                    </p>
                                )}
                                {confirmPassword && confirmPassword === createForm.password && createForm.password && (
                                    <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                        Mật khẩu khớp
                                    </p>
                                )}
                                {createErrors.confirmPassword && <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.confirmPassword}</p>}
                            </div>

                            {/* Role Row */}
                            <div>
                                <label htmlFor="create-role" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                                    Vai trò <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="create-role"
                                    value={createForm.role}
                                    onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                                    className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                                >
                                    <option value="STAFF">Staff</option>
                                    <option value="ADMIN">Admin</option>

                                </select>
                            </div>
                            
                            {/* Send Email Checkbox */}
                            <div className="mt-4 pt-4 border-t border-outline-variant/15 flex items-center">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input 
                                            type="checkbox" 
                                            checked={createForm.sendEmail}
                                            onChange={(e) => setCreateForm(f => ({ ...f, sendEmail: e.target.checked }))}
                                            className="appearance-none w-5 h-5 border-2 border-outline-variant rounded bg-surface-container-low checked:bg-primary checked:border-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none peer" 
                                        />
                                        <span className="material-symbols-outlined absolute text-[16px] text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                                    </div>
                                    <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                                        Gửi thông tin đăng nhập qua Email này
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-8 pb-7 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateUser}
                                disabled={isCreating}
                                className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                            >
                                {isCreating ? (
                                    <>
                                        <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                                        Đang tạo…
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-base" aria-hidden="true">person_add</span>
                                        Tạo tài khoản
                                    </>
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
                    className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
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
function InfoItem({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-base mt-0.5" aria-hidden="true">{icon}</span>
            <div>
                <p className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">{label}</p>
                <p className="text-sm text-on-surface font-medium mt-0.5">{value}</p>
            </div>
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

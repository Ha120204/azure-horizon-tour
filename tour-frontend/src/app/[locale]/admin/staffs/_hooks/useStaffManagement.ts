'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { roleConfig } from '../_lib/config';
import { exportStaffCsv } from '../_lib/exportCsv';
import {
    formatDateToISOInputValue,
    getApiMessage,
    getErrorMessage,
    getProfileRole,
} from '../_lib/helpers';
import type { BulkStatusAction, Meta, SortDirection, StaffCreateForm, StaffEditForm, StaffKpiItem, StaffSortKey, Stats, ToastState, User } from '../_lib/types';

const createBlankStaffForm = (role: string): StaffCreateForm => ({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role,
    sendEmail: true,
});

export function useStaffManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const everLoadedRef = useRef(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState<StaffSortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    const [toast, setToast] = useState<ToastState | null>(null);
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [roleEditUser, setRoleEditUser] = useState<User | null>(null);
    const [newRole, setNewRole] = useState('');
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [toggleTarget, setToggleTarget] = useState<User | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
    const [bulkActionStatus, setBulkActionStatus] = useState<BulkStatusAction | null>(null);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<StaffEditForm>({ fullName: '', phone: '', dob: '', gender: '' });
    const [isSaving, setIsSaving] = useState(false);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState<StaffCreateForm>(() => createBlankStaffForm('STAFF'));
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

    const isSuperAdminView = currentUserRole === 'SUPER_ADMIN';
    // SUPER_ADMIN quản cả admin lẫn nhân viên — chọn nhóm đang xem qua bộ lọc role
    const [staffRoleScope, setStaffRoleScope] = useState<'ADMIN' | 'STAFF'>('ADMIN');
    const managedRole = isSuperAdminView ? staffRoleScope : 'STAFF';
    const managedRoleLabel = managedRole === 'ADMIN' ? 'quản trị viên' : 'nhân viên';
    const pageTitle = isSuperAdminView ? 'Quản lý nhân sự' : 'Quản lý nhân viên';
    const pageDescription = isSuperAdminView
        ? 'Quản lý tài khoản quản trị viên và nhân viên nội bộ của hệ thống.'
        : 'Quản lý tài khoản nhân viên nội bộ của hệ thống.';
    const createTitle = `Thêm ${managedRoleLabel} mới`;
    const createDescription = `Tạo tài khoản ${managedRoleLabel} nội bộ`;
    const createButtonLabel = `Thêm ${managedRoleLabel}`;
    const canEditRoles = false;

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        setCreateForm(form => ({ ...form, role: managedRole }));
        // Đổi nhóm role → reset trang & bỏ chọn (tránh selection lẫn role khi bulk)
        setPage(1);
        setSelectedStaffIds(new Set());
    }, [managedRole]);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [search]);

    useEffect(() => {
        fetchWithAuth(`${API_BASE_URL}/auth/profile`)
            .then((response: Response) => response.json())
            .then((payload: unknown) => setCurrentUserRole(getProfileRole(payload)))
            .catch(() => { });
    }, []);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const fetchUsers = useCallback(async () => {
        if (!currentUserRole) return;
        if (!everLoadedRef.current) {
            setIsLoading(true);
        } else {
            setIsFetching(true);
        }
        try {
            const qs = new URLSearchParams();
            if (debouncedSearch) qs.append('search', debouncedSearch);
            qs.append('role', managedRole);
            if (filterStatus) qs.append('status', filterStatus);
            qs.append('sortBy', sortBy);
            qs.append('sortDir', sortDir);
            qs.append('page', String(page));
            qs.append('limit', String(pageSize));

            const res = await fetchWithAuth(`${API_BASE_URL}/user?${qs}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setUsers(json.data ?? []);
            if (json.meta) setMeta(json.meta);
            everLoadedRef.current = true;
        } catch {
            showToast('Lỗi tải danh sách tài khoản.', 'error');
        } finally {
            setIsLoading(false);
            setIsFetching(false);
        }
    }, [currentUserRole, debouncedSearch, filterStatus, managedRole, page, pageSize, showToast, sortBy, sortDir]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    useEffect(() => {
        const currentIds = new Set(users.map(user => user.id));
        setSelectedStaffIds(previous => new Set([...previous].filter(id => currentIds.has(id))));
    }, [users]);

    const fetchStats = useCallback(async () => {
        if (!currentUserRole) return;
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/stats?role=${managedRole}`);
            if (res.ok) {
                const json = await res.json();
                setStats(json?.data ?? json);
            }
        } catch {
            // Stats are supplementary; keep the user table usable.
        }
    }, [currentUserRole, managedRole]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const refreshStaffData = useCallback(async () => {
        await Promise.all([fetchUsers(), fetchStats()]);
    }, [fetchStats, fetchUsers]);

    useAdminAutoRefresh({
        intervalMs: 120 * 1000,
        pause: Boolean(
            detailUser || roleEditUser || toggleTarget || showCreateModal ||
            bulkActionStatus || isSaving || isUpdatingRole || isToggling || isCreating || isBulkUpdating
        ),
        onRefresh: refreshStaffData,
    });

    const startEditing = useCallback((user: User) => {
        setEditForm({
            fullName: user.fullName || '',
            phone: user.phone || '',
            dob: user.dob ? formatDateToISOInputValue(user.dob) : '',
            gender: user.gender || '',
        });
        setIsEditing(true);
    }, []);

    const openDetail = useCallback(async (userId: number, editMode = false) => {
        setIsLoadingDetail(true);
        setDetailUser(null);
        setIsEditing(false);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/${userId}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            const payload = json.data || json;
            const nextUser = { ...payload, status: payload.deletedAt ? 'Deactivated' : 'Active' };
            setDetailUser(nextUser);

            if (editMode) {
                startEditing(nextUser);
            }
        } catch {
            showToast('Không thể tải thông tin tài khoản.', 'error');
        } finally {
            setIsLoadingDetail(false);
        }
    }, [showToast, startEditing]);

    const closeDetail = useCallback(() => {
        setDetailUser(null);
        setIsLoadingDetail(false);
        setIsEditing(false);
    }, []);

    const handleSaveInfo = useCallback(async () => {
        if (!detailUser) return;
        setIsSaving(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/${detailUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: editForm.fullName || '',
                    phone: editForm.phone || '',
                    dob: editForm.dob ? new Date(editForm.dob).toISOString() : '',
                    gender: editForm.gender || '',
                }),
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => null);
                throw new Error(errJson?.message || 'Không thể lưu, server từ chối.');
            }

            showToast('Lưu thông tin thành công!');
            setIsEditing(false);
            openDetail(detailUser.id);
            fetchUsers();
        } catch (error: unknown) {
            showToast('Lỗi: ' + getErrorMessage(error, 'Lỗi lưu thông tin'), 'error');
        } finally {
            setIsSaving(false);
        }
    }, [detailUser, editForm, fetchUsers, openDetail, showToast]);

    const handleUpdateRole = useCallback(async () => {
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
                throw new Error(getApiMessage(err, 'Failed'));
            }
            showToast(`Đã đổi quyền của "${roleEditUser.fullName}" thành ${roleConfig[newRole]?.label || newRole}`);
            setRoleEditUser(null);
            setNewRole('');
            fetchUsers();
            fetchStats();
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Đổi quyền thất bại.'), 'error');
        } finally {
            setIsUpdatingRole(false);
        }
    }, [fetchStats, fetchUsers, newRole, roleEditUser, showToast]);

    const handleToggleStatus = useCallback(async () => {
        if (!toggleTarget) return;
        setIsToggling(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/${toggleTarget.id}/toggle-status`, {
                method: 'PATCH',
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(getApiMessage(err, 'Failed'));
            }
            const result = await res.json();
            const payload = result?.data ?? result;
            const nextStatus = payload?.status ?? (payload?.deletedAt ? 'Deactivated' : 'Active');
            const nextDeletedAt = nextStatus === 'Active' ? null : (payload?.deletedAt ?? new Date().toISOString());
            const action = nextStatus === 'Active' ? 'kích hoạt' : 'vô hiệu hóa';
            showToast(`Đã ${action} tài khoản "${toggleTarget.fullName}"`);
            setUsers(prev => prev.map(user => (
                user.id === toggleTarget.id
                    ? { ...user, deletedAt: nextDeletedAt, status: nextStatus }
                    : user
            )));
            setDetailUser(prev => (
                prev?.id === toggleTarget.id
                    ? { ...prev, deletedAt: nextDeletedAt, status: nextStatus }
                    : prev
            ));
            setToggleTarget(null);
            const shouldClearStatusFilter =
                (filterStatus === 'active' && nextStatus === 'Deactivated') ||
                (filterStatus === 'deactivated' && nextStatus === 'Active');
            if (shouldClearStatusFilter) {
                setFilterStatus('');
                setPage(1);
            } else {
                fetchUsers();
            }
            fetchStats();
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Thao tác thất bại.'), 'error');
        } finally {
            setIsToggling(false);
        }
    }, [fetchStats, fetchUsers, filterStatus, showToast, toggleTarget]);

    const handleCreateUser = useCallback(async () => {
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
        if (Object.keys(errors).length) {
            setCreateErrors(errors);
            return;
        }

        setCreateErrors({});
        setIsCreating(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...createForm,
                    role: managedRole,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(getApiMessage(err, `Thêm ${managedRoleLabel} thất bại`));
            }
            showToast(`Thêm ${managedRoleLabel} "${createForm.fullName}" thành công!`);
            setShowCreateModal(false);
            setCreateForm(createBlankStaffForm(managedRole));
            setConfirmPassword('');
            fetchUsers();
            fetchStats();
        } catch (error: unknown) {
            showToast(getErrorMessage(error, `Thêm ${managedRoleLabel} thất bại.`), 'error');
        } finally {
            setIsCreating(false);
        }
    }, [confirmPassword, createForm, fetchStats, fetchUsers, managedRole, managedRoleLabel, showToast]);

    const changeStatusFilter = useCallback((value: string) => {
        setFilterStatus(value);
        setPage(1);
    }, []);

    const resetFilters = useCallback(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        setSearch('');
        setDebouncedSearch('');
        setFilterStatus('');
        setPage(1);
    }, []);

    const changePageSize = useCallback((size: number) => {
        setPageSize(size);
        setPage(1);
    }, []);

    const changeSort = useCallback((key: StaffSortKey) => {
        if (sortBy === key) {
            return;
        }
        setSortBy(key);
        setSortDir(key === 'fullName' ? 'asc' : 'desc');
        setPage(1);
    }, [sortBy]);

    const requestRoleChange = useCallback((target: User) => {
        setRoleEditUser(target);
        setNewRole(target.role);
    }, []);

    const updateEditForm = useCallback((patch: Partial<StaffEditForm>) => {
        setEditForm(form => ({ ...form, ...patch }));
    }, []);

    const selectedStaffUsers = useMemo(
        () => users.filter(user => selectedStaffIds.has(user.id)),
        [selectedStaffIds, users],
    );
    const selectedActiveCount = selectedStaffUsers.filter(user => user.status === 'Active').length;
    const selectedDeactivatedCount = selectedStaffUsers.filter(user => user.status === 'Deactivated').length;
    const allCurrentPageSelected = users.length > 0 && users.every(user => selectedStaffIds.has(user.id));
    const someCurrentPageSelected = users.some(user => selectedStaffIds.has(user.id));

    const toggleSelectedStaff = useCallback((userId: number) => {
        setSelectedStaffIds(previous => {
            const next = new Set(previous);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    }, []);

    const toggleCurrentPageSelection = useCallback(() => {
        setSelectedStaffIds(previous => {
            const next = new Set(previous);
            if (users.length > 0 && users.every(user => next.has(user.id))) {
                users.forEach(user => next.delete(user.id));
            } else {
                users.forEach(user => next.add(user.id));
            }
            return next;
        });
    }, [users]);

    const clearSelection = useCallback(() => {
        setSelectedStaffIds(new Set());
    }, []);

    const exportSelectedStaff = useCallback(() => {
        const exportedCount = exportStaffCsv(selectedStaffUsers);
        if (exportedCount === 0) {
            showToast('Chưa có tài khoản nào để xuất.', 'error');
            return;
        }
        showToast(`Đã xuất ${exportedCount} tài khoản ra CSV.`);
    }, [selectedStaffUsers, showToast]);

    const requestBulkStatusChange = useCallback((status: BulkStatusAction) => {
        const targetCount = selectedStaffUsers.filter(user => (
            status === 'active' ? user.status === 'Deactivated' : user.status === 'Active'
        )).length;
        if (targetCount === 0) return;
        setBulkActionStatus(status);
    }, [selectedStaffUsers]);

    const handleBulkStatusChange = useCallback(async () => {
        if (!bulkActionStatus) return;
        const targets = selectedStaffUsers.filter(user => (
            bulkActionStatus === 'active' ? user.status === 'Deactivated' : user.status === 'Active'
        ));
        if (targets.length === 0) {
            setBulkActionStatus(null);
            return;
        }

        setIsBulkUpdating(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/bulk-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: targets.map(user => user.id),
                    status: bulkActionStatus,
                    role: managedRole,
                }),
            });
            const payload = await res.json().catch(() => null);
            if (!res.ok) throw new Error(payload?.message || 'Không thể cập nhật hàng loạt.');

            const result = payload?.data ?? payload;
            const actionLabel = bulkActionStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa';
            showToast(`Đã ${actionLabel} ${result?.updatedCount ?? targets.length} tài khoản.`);
            setBulkActionStatus(null);
            clearSelection();
            await refreshStaffData();
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Thao tác hàng loạt thất bại.'), 'error');
        } finally {
            setIsBulkUpdating(false);
        }
    }, [bulkActionStatus, clearSelection, managedRole, refreshStaffData, selectedStaffUsers, showToast]);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthLabel = new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: 'numeric' }).format(new Date());
    const visibleActiveCount = users.filter(user => user.status === 'Active').length;
    const visibleNewThisMonth = users.filter(user => user.createdAt?.slice(0, 7) === currentMonth).length;
    const totalManagedCount = stats?.totalUsers ?? meta.totalItems;
    const activeManagedCount = stats?.activeUsers ?? visibleActiveCount;
    const newManagedCount = stats?.newThisMonth ?? visibleNewThisMonth;
    const isAdminScope = managedRole === 'ADMIN';
    const kpis = useMemo<StaffKpiItem[]>(() => [
        {
            icon: isAdminScope ? 'admin_panel_settings' : 'shield_person',
            label: isAdminScope ? 'Tổng quản trị viên' : 'Tổng nhân viên',
            value: totalManagedCount,
            helper: isAdminScope ? 'Tài khoản quản trị viên nội bộ' : 'Tài khoản nhân viên nội bộ',
            color: 'bg-amber-500/10 text-amber-600',
        },
        {
            icon: 'verified_user',
            label: isAdminScope ? 'Quản trị viên hoạt động' : 'Nhân viên hoạt động',
            value: activeManagedCount,
            helper: `${activeManagedCount.toLocaleString('vi-VN')}/${totalManagedCount.toLocaleString('vi-VN')} tài khoản có thể đăng nhập`,
            color: 'bg-emerald-500/10 text-emerald-600',
        },
        {
            icon: 'person_add',
            label: isAdminScope ? 'Quản trị viên mới tháng này' : 'Nhân viên mới tháng này',
            value: newManagedCount,
            helper: `Tính trong tháng ${currentMonthLabel}`,
            color: 'bg-violet-500/10 text-violet-600',
        },
    ], [activeManagedCount, currentMonthLabel, isAdminScope, newManagedCount, totalManagedCount]);

    return {
        users,
        meta,
        isLoading,
        isFetching,
        managedRole,
        currentUserRole,
        search,
        filterStatus,
        pageSize,
        sortBy,
        sortDir,
        toast,
        detailUser,
        isLoadingDetail,
        roleEditUser,
        newRole,
        isUpdatingRole,
        toggleTarget,
        isToggling,
        selectedStaffIds,
        selectedStaffUsers,
        selectedActiveCount,
        selectedDeactivatedCount,
        allCurrentPageSelected,
        someCurrentPageSelected,
        bulkActionStatus,
        isBulkUpdating,
        isEditing,
        editForm,
        isSaving,
        showCreateModal,
        createForm,
        confirmPassword,
        showPassword,
        showConfirmPassword,
        isCreating,
        createErrors,
        isSuperAdminView,
        staffRoleScope,
        setStaffRoleScope,
        managedRoleLabel,
        pageTitle,
        pageDescription,
        createTitle,
        createDescription,
        createButtonLabel,
        canEditRoles,
        kpis,
        setSearch,
        setPage,
        setShowCreateModal,
        setConfirmPassword,
        setShowPassword,
        setShowConfirmPassword,
        setCreateForm,
        setCreateErrors,
        setIsEditing,
        setNewRole,
        setRoleEditUser,
        setToggleTarget,
        setBulkActionStatus,
        openDetail,
        closeDetail,
        startEditing,
        updateEditForm,
        handleSaveInfo,
        handleUpdateRole,
        handleToggleStatus,
        handleCreateUser,
        changeStatusFilter,
        resetFilters,
        changePageSize,
        changeSort,
        requestRoleChange,
        toggleSelectedStaff,
        toggleCurrentPageSelection,
        clearSelection,
        exportSelectedStaff,
        requestBulkStatusChange,
        handleBulkStatusChange,
    };
}

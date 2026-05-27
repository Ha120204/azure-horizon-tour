'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { roleConfig } from '../_lib/config';
import {
    formatDateToISOInputValue,
    getApiMessage,
    getErrorMessage,
    getProfileRole,
} from '../_lib/helpers';
import type { Meta, StaffCreateForm, StaffEditForm, StaffKpiItem, Stats, ToastState, User } from '../_lib/types';

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
    const [currentUserRole, setCurrentUserRole] = useState<string>('');

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [toast, setToast] = useState<ToastState | null>(null);
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [roleEditUser, setRoleEditUser] = useState<User | null>(null);
    const [newRole, setNewRole] = useState('');
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [toggleTarget, setToggleTarget] = useState<User | null>(null);
    const [isToggling, setIsToggling] = useState(false);

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
    const managedRole = isSuperAdminView ? 'ADMIN' : 'STAFF';
    const managedRoleLabel = isSuperAdminView ? 'Admin' : 'nhân viên';
    const pageTitle = isSuperAdminView ? 'Quản lý Admin' : 'Danh sách Nhân Sự';
    const pageDescription = isSuperAdminView
        ? 'Quản lý các tài khoản Admin được phân quyền vận hành hệ thống.'
        : 'Quản lý tài khoản nhân viên nội bộ của hệ thống.';
    const createTitle = isSuperAdminView ? 'Thêm admin mới' : 'Thêm nhân viên mới';
    const createDescription = isSuperAdminView ? 'Tạo tài khoản Admin nội bộ' : 'Tạo tài khoản nhân viên nội bộ';
    const createButtonLabel = isSuperAdminView ? 'Thêm admin' : 'Thêm nhân viên';
    const canEditRoles = false;

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        setCreateForm(form => ({ ...form, role: managedRole }));
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
        setIsLoading(true);
        try {
            const qs = new URLSearchParams();
            if (debouncedSearch) qs.append('search', debouncedSearch);
            qs.append('role', managedRole);
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
    }, [currentUserRole, debouncedSearch, filterStatus, managedRole, page, pageSize, showToast]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/user/stats`);
            if (res.ok) {
                const json = await res.json();
                setStats(json?.data ?? json);
            }
        } catch {
            // Stats are supplementary; keep the user table usable.
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const refreshStaffData = useCallback(async () => {
        await Promise.all([fetchUsers(), fetchStats()]);
    }, [fetchStats, fetchUsers]);

    useAdminAutoRefresh({
        intervalMs: 120 * 1000,
        pause: Boolean(
            detailUser || roleEditUser || toggleTarget || showCreateModal ||
            isSaving || isUpdatingRole || isToggling || isCreating
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
            showToast('Không thể tải thông tin người dùng.', 'error');
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
            showToast(`Đã đổi role của "${roleEditUser.fullName}" thành ${roleConfig[newRole]?.label || newRole}`);
            setRoleEditUser(null);
            setNewRole('');
            fetchUsers();
            fetchStats();
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Đổi role thất bại.'), 'error');
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

    const changePageSize = useCallback((size: number) => {
        setPageSize(size);
        setPage(1);
    }, []);

    const requestRoleChange = useCallback((target: User) => {
        setRoleEditUser(target);
        setNewRole(target.role);
    }, []);

    const updateEditForm = useCallback((patch: Partial<StaffEditForm>) => {
        setEditForm(form => ({ ...form, ...patch }));
    }, []);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthLabel = new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: 'numeric' }).format(new Date());
    const visibleActiveCount = users.filter(user => user.status === 'Active').length;
    const visibleNewThisMonth = users.filter(user => user.createdAt?.slice(0, 7) === currentMonth).length;
    const activeManagedCount = isSuperAdminView ? visibleActiveCount : (stats?.staffActive ?? visibleActiveCount);
    const newManagedCount = isSuperAdminView ? visibleNewThisMonth : (stats?.staffNewThisMonth ?? visibleNewThisMonth);
    const kpis = useMemo<StaffKpiItem[]>(() => [
        {
            icon: isSuperAdminView ? 'admin_panel_settings' : 'shield_person',
            label: isSuperAdminView ? 'Tổng Admin' : 'Tổng nhân sự',
            value: meta.totalItems,
            helper: isSuperAdminView ? 'Tài khoản admin trong phạm vi quản lý' : 'Tài khoản nhân sự nội bộ',
            color: 'bg-amber-500/10 text-amber-600',
        },
        {
            icon: 'verified_user',
            label: isSuperAdminView ? 'Đang hoạt động' : 'Nhân sự hoạt động',
            value: activeManagedCount,
            helper: `${activeManagedCount.toLocaleString('vi-VN')}/${meta.totalItems.toLocaleString('vi-VN')} tài khoản có thể đăng nhập`,
            color: 'bg-emerald-500/10 text-emerald-600',
        },
        {
            icon: 'person_add',
            label: isSuperAdminView ? 'Admin mới tháng này' : 'Nhân sự mới tháng này',
            value: newManagedCount,
            helper: `Tính trong tháng ${currentMonthLabel}`,
            color: 'bg-violet-500/10 text-violet-600',
        },
    ], [activeManagedCount, currentMonthLabel, isSuperAdminView, meta.totalItems, newManagedCount]);

    return {
        users,
        meta,
        isLoading,
        currentUserRole,
        search,
        filterStatus,
        pageSize,
        toast,
        detailUser,
        isLoadingDetail,
        roleEditUser,
        newRole,
        isUpdatingRole,
        toggleTarget,
        isToggling,
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
        openDetail,
        closeDetail,
        startEditing,
        updateEditForm,
        handleSaveInfo,
        handleUpdateRole,
        handleToggleStatus,
        handleCreateUser,
        changeStatusFilter,
        changePageSize,
        requestRoleChange,
    };
}

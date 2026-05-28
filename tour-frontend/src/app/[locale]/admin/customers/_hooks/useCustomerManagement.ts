'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import {
    formatDateToISOInputValue,
    getErrorMessage,
} from '../_lib/helpers';
import { buildCustomerKpis } from '../_lib/kpis';
import type {
    CustomerEditForm,
    CustomerListPayload,
    Meta,
    ProfilePayload,
    Stats,
    ToastState,
    User,
} from '../_lib/types';

export function useCustomerManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState('');

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [toast, setToast] = useState<ToastState | null>(null);
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [toggleTarget, setToggleTarget] = useState<User | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [hasFreshData, setHasFreshData] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState<CustomerEditForm>({
        fullName: '',
        phone: '',
        dob: '',
        gender: '',
    });

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCustomerSignature = useRef('');

    useEffect(() => {
        fetchWithAuth(`${API_BASE_URL}/auth/profile`)
            .then((response: Response) => response.json())
            .then((payload: ProfilePayload) => setCurrentUserRole(payload.role || payload.data?.role || ''))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);

        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current);
        };
    }, [search]);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const buildCustomerSignature = useCallback((payload: CustomerListPayload) => JSON.stringify({
        total: payload.meta?.totalItems ?? 0,
        rows: payload.users.map(user => ({
            id: user.id,
            status: user.status,
            deletedAt: user.deletedAt,
            bookingCount: user.bookingCount,
            reviewCount: user.reviewCount,
            createdAt: user.createdAt,
        })),
    }), []);

    const getUsersPayload = useCallback(async (): Promise<CustomerListPayload> => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        params.append('role', 'CUSTOMER');
        if (filterStatus) params.append('status', filterStatus);
        params.append('page', String(page));
        params.append('limit', String(pageSize));

        const response = await fetchWithAuth(`${API_BASE_URL}/user?${params}`);
        if (!response.ok) {
            const errorPayload = await response.json();
            throw new Error(JSON.stringify(errorPayload));
        }

        const payload = await response.json();
        return { users: payload.data ?? [], meta: payload.meta };
    }, [debouncedSearch, filterStatus, page, pageSize]);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const payload = await getUsersPayload();
            setUsers(payload.users);
            if (payload.meta) setMeta(payload.meta);
            lastCustomerSignature.current = buildCustomerSignature(payload);
            setHasFreshData(false);
            setLastSyncedAt(new Date());
        } catch {
            showToast('Lỗi tải danh sách khách hàng.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [buildCustomerSignature, getUsersPayload, showToast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        const checkForFreshData = async () => {
            if (document.visibilityState !== 'visible' || detailUser || toggleTarget) return;

            try {
                const payload = await getUsersPayload();
                const nextSignature = buildCustomerSignature(payload);
                if (!lastCustomerSignature.current) {
                    lastCustomerSignature.current = nextSignature;
                    return;
                }
                if (nextSignature !== lastCustomerSignature.current) {
                    setHasFreshData(true);
                }
            } catch {
                // Background refresh is best-effort; keep the current table stable.
            }
        };

        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible') void checkForFreshData();
        };

        const intervalId = window.setInterval(checkForFreshData, 45 * 1000);
        window.addEventListener('focus', handleVisibilityOrFocus);
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleVisibilityOrFocus);
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        };
    }, [buildCustomerSignature, detailUser, getUsersPayload, toggleTarget]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/user/stats`);
            if (response.ok) {
                const payload = await response.json();
                setStats(payload?.data ?? payload);
            }
        } catch {
            // Statistics are supplemental for this screen.
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const refreshCustomers = useCallback(async () => {
        await fetchUsers();
        await fetchStats();
    }, [fetchStats, fetchUsers]);
    const shouldRefreshFromRealtime = useCallback((detail: { resourceType: string; type: string; href?: string | null }) => (
        detail.resourceType === 'User' ||
        detail.type === 'customer_new' ||
        detail.href?.startsWith('/admin/customers') === true
    ), []);

    useAdminRealtime({
        onRefresh: refreshCustomers,
        shouldRefresh: shouldRefreshFromRealtime,
        pause: isSaving || isToggling,
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
            const response = await fetchWithAuth(`${API_BASE_URL}/user/${userId}`);
            if (!response.ok) throw new Error();

            const payload = await response.json();
            const user = payload.data || payload;
            const normalizedUser = { ...user, status: user.deletedAt ? 'Deactivated' : 'Active' };
            setDetailUser(normalizedUser);

            if (editMode) {
                startEditing(normalizedUser);
            }
        } catch {
            showToast('Không thể tải thông tin khách hàng.', 'error');
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
            const response = await fetchWithAuth(`${API_BASE_URL}/user/${detailUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: editForm.fullName || '',
                    phone: editForm.phone || '',
                    dob: editForm.dob ? new Date(editForm.dob).toISOString() : '',
                    gender: editForm.gender || '',
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.message || 'Không thể lưu, server từ chối.');
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

    const handleToggleStatus = useCallback(async () => {
        if (!toggleTarget) return;
        setIsToggling(true);

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/user/${toggleTarget.id}/toggle-status`, {
                method: 'PATCH',
            });
            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                throw new Error(errorPayload.message || 'Failed');
            }

            const result = await response.json();
            const payload = result?.data ?? result;
            const action = payload.status === 'Active' ? 'kích hoạt' : 'vô hiệu hóa';
            showToast(`Đã ${action} tài khoản "${toggleTarget.fullName}"`);
            setToggleTarget(null);
            fetchUsers();
            fetchStats();

            if (detailUser && detailUser.id === toggleTarget.id) {
                setDetailUser({ ...detailUser, status: payload.status, deletedAt: payload.deletedAt });
            }
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Thao tác thất bại.'), 'error');
        } finally {
            setIsToggling(false);
        }
    }, [detailUser, fetchStats, fetchUsers, showToast, toggleTarget]);

    const changeStatusFilter = useCallback((value: string) => {
        setFilterStatus(value);
        setPage(1);
    }, []);

    const changePageSize = useCallback((size: number) => {
        setPageSize(size);
        setPage(1);
    }, []);

    const updateEditForm = useCallback((patch: Partial<CustomerEditForm>) => {
        setEditForm(form => ({ ...form, ...patch }));
    }, []);

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
        toggleTarget,
        isToggling,
        hasFreshData,
        lastSyncedAt,
        isEditing,
        isSaving,
        editForm,
        kpis: buildCustomerKpis(stats),
        setSearch,
        setPage,
        setToggleTarget,
        setIsEditing,
        setToast,
        refreshCustomers,
        openDetail,
        closeDetail,
        startEditing,
        updateEditForm,
        handleSaveInfo,
        handleToggleStatus,
        changeStatusFilter,
        changePageSize,
    };
}

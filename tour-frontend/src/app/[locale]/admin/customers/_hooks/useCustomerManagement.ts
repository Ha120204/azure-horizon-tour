'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminRealtime } from '@/hooks/admin/useAdminRealtime';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import {
    formatDateToISOInputValue,
    getErrorMessage,
} from '../_lib/helpers';
import { exportCustomersCsv } from '../_lib/exportCsv';
import { buildCustomerKpis } from '../_lib/kpis';
import type {
    CustomerEditForm,
    CustomerBookingFilter,
    CustomerListPayload,
    CustomerSegmentFilter,
    CustomerSortKey,
    Meta,
    ProfilePayload,
    SortDirection,
    Stats,
    ToastState,
    User,
} from '../_lib/types';

const digitsOnly = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');

export function useCustomerManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState('');

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [bookingFilter, setBookingFilter] = useState<CustomerBookingFilter>('');
    const [segmentFilter, setSegmentFilter] = useState<CustomerSegmentFilter>('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState<CustomerSortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [toast, setToast] = useState<ToastState | null>(null);
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [toggleTarget, setToggleTarget] = useState<User | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [selectedCustomerMap, setSelectedCustomerMap] = useState<Map<number, User>>(new Map());
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [bulkConfirm, setBulkConfirm] = useState<{ status: 'active' | 'deactivated'; ids: number[] } | null>(null);
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
            totalSpent: user.totalSpent,
            lastBookingAt: user.lastBookingAt,
            createdAt: user.createdAt,
        })),
    }), []);

    const getUsersPayload = useCallback(async (): Promise<CustomerListPayload> => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        params.append('role', 'CUSTOMER');
        if (filterStatus) params.append('status', filterStatus);
        if (bookingFilter) params.append('bookingFilter', bookingFilter);
        if (segmentFilter) params.append('segmentFilter', segmentFilter);
        params.append('sortBy', sortBy);
        params.append('sortDir', sortDir);
        params.append('page', String(page));
        params.append('limit', String(pageSize));

        const response = await fetchWithAuth(`${API_BASE_URL}/user?${params}`);
        if (!response.ok) {
            const errorPayload = await response.json();
            throw new Error(JSON.stringify(errorPayload));
        }

        const payload = await response.json();
        return { users: payload.data ?? [], meta: payload.meta };
    }, [bookingFilter, debouncedSearch, filterStatus, page, pageSize, segmentFilter, sortBy, sortDir]);

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

    // Giữ lựa chọn xuyên suốt các trang; chỉ làm tươi dữ liệu cho những dòng đang hiển thị.
    useEffect(() => {
        setSelectedCustomerMap(previous => {
            if (previous.size === 0) return previous;
            let changed = false;
            const next = new Map(previous);
            users.forEach(user => {
                if (next.has(user.id)) {
                    next.set(user.id, user);
                    changed = true;
                }
            });
            return changed ? next : previous;
        });
    }, [users]);

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
            phone: digitsOnly(user.phone),
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
                    phone: digitsOnly(editForm.phone),
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

    const changeBookingFilter = useCallback((value: CustomerBookingFilter) => {
        setBookingFilter(value);
        setPage(1);
    }, []);

    const changeSegmentFilter = useCallback((value: CustomerSegmentFilter) => {
        setSegmentFilter(value);
        setPage(1);
    }, []);

    const resetFilters = useCallback(() => {
        setSearch('');
        setDebouncedSearch('');
        setFilterStatus('');
        setBookingFilter('');
        setSegmentFilter('');
        setPage(1);
    }, []);

    const changePageSize = useCallback((size: number) => {
        setPageSize(size);
        setPage(1);
    }, []);

    const changeSort = useCallback((key: CustomerSortKey) => {
        if (sortBy === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDir(key === 'fullName' ? 'asc' : 'desc');
        }
        setPage(1);
    }, [sortBy, sortDir]);

    const updateEditForm = useCallback((patch: Partial<CustomerEditForm>) => {
        setEditForm(form => ({ ...form, ...patch }));
    }, []);

    const selectedCustomerIds = useMemo(() => new Set(selectedCustomerMap.keys()), [selectedCustomerMap]);
    const selectedCustomers = useMemo(() => [...selectedCustomerMap.values()], [selectedCustomerMap]);
    const selectedActiveCount = selectedCustomers.filter(user => user.status === 'Active').length;
    const selectedDeactivatedCount = selectedCustomers.filter(user => user.status === 'Deactivated').length;
    const allCurrentPageSelected = users.length > 0 && users.every(user => selectedCustomerMap.has(user.id));
    const someCurrentPageSelected = users.some(user => selectedCustomerMap.has(user.id));

    const toggleSelectedCustomer = useCallback((userId: number) => {
        setSelectedCustomerMap(previous => {
            const next = new Map(previous);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                const user = users.find(item => item.id === userId);
                if (user) next.set(userId, user);
            }
            return next;
        });
    }, [users]);

    const toggleCurrentPageSelection = useCallback(() => {
        setSelectedCustomerMap(previous => {
            const next = new Map(previous);
            if (users.length > 0 && users.every(user => next.has(user.id))) {
                users.forEach(user => next.delete(user.id));
            } else {
                users.forEach(user => next.set(user.id, user));
            }
            return next;
        });
    }, [users]);

    const clearSelection = useCallback(() => {
        setSelectedCustomerMap(new Map());
    }, []);

    const exportSelectedCustomers = useCallback(() => {
        const exportedCount = exportCustomersCsv(selectedCustomers);
        if (exportedCount === 0) {
            showToast('Chưa có khách hàng nào để xuất.', 'error');
            return;
        }
        showToast(`Đã xuất ${exportedCount} khách hàng ra CSV.`);
    }, [selectedCustomers, showToast]);

    const requestBulkUpdate = useCallback((status: 'active' | 'deactivated') => {
        const targets = selectedCustomers.filter(user => (
            status === 'active' ? user.status === 'Deactivated' : user.status === 'Active'
        ));
        if (targets.length === 0) return;

        if (targets.length > 200) {
            showToast('Chỉ xử lý tối đa 200 tài khoản mỗi lần. Vui lòng bớt lựa chọn.', 'error');
            return;
        }

        setBulkConfirm({ status, ids: targets.map(user => user.id) });
    }, [selectedCustomers, showToast]);

    const confirmBulkUpdate = useCallback(async () => {
        if (!bulkConfirm) return;
        const { status, ids } = bulkConfirm;
        const actionLabel = status === 'active' ? 'mở khóa' : 'khóa';

        setIsBulkUpdating(true);
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/user/bulk-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, status }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.message || 'Không thể cập nhật hàng loạt.');
            }

            const result = payload?.data ?? payload;
            showToast(`Đã ${actionLabel} ${result?.updatedCount ?? ids.length} tài khoản.`);
            setBulkConfirm(null);
            clearSelection();
            await refreshCustomers();
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Thao tác hàng loạt thất bại.'), 'error');
        } finally {
            setIsBulkUpdating(false);
        }
    }, [bulkConfirm, clearSelection, refreshCustomers, showToast]);

    return {
        users,
        meta,
        isLoading,
        currentUserRole,
        selectedCustomerIds,
        selectedCustomers,
        selectedActiveCount,
        selectedDeactivatedCount,
        allCurrentPageSelected,
        someCurrentPageSelected,
        isBulkUpdating,
        bulkConfirm,
        search,
        filterStatus,
        bookingFilter,
        segmentFilter,
        sortBy,
        sortDir,
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
        toggleSelectedCustomer,
        toggleCurrentPageSelection,
        clearSelection,
        exportSelectedCustomers,
        bulkActivateSelected: () => requestBulkUpdate('active'),
        bulkDeactivateSelected: () => requestBulkUpdate('deactivated'),
        confirmBulkUpdate,
        cancelBulkUpdate: () => setBulkConfirm(null),
        openDetail,
        closeDetail,
        startEditing,
        updateEditForm,
        handleSaveInfo,
        handleToggleStatus,
        changeStatusFilter,
        changeBookingFilter,
        changeSegmentFilter,
        resetFilters,
        changePageSize,
        changeSort,
    };
}

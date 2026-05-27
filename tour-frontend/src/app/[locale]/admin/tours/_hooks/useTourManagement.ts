'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { TourFormModalProps } from '@/components/admin/tourForm/types';
import { useTourTrash } from './useTourTrash';
import { EMPTY_TOUR_STATS } from '../_lib/constants';
import { exportToursCsv } from '../_lib/exportCsv';
import { buildTourKpis } from '../_lib/kpis';
import type { Destination, Meta, ModalMode, ToastState, Tour, TourStats, TourTab, TourReviewAction } from '../_lib/types';

export function useTourManagement() {
    const searchParams = useSearchParams();
    const initialStatus = searchParams.get('status') ?? '';

    const [tours, setTours] = useState<Tour[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filterDest, setFilterDest] = useState('');
    const [filterStatus, setFilterStatus] = useState(initialStatus);
    const [sortBy, setSortBy] = useState('recommended');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [contentDrawerTour, setContentDrawerTour] = useState<Tour | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [tourStats, setTourStats] = useState<TourStats>(EMPTY_TOUR_STATS);

    const [reviewTarget, setReviewTarget] = useState<{ tour: Tour; action: TourReviewAction } | null>(null);
    const [submitTarget, setSubmitTarget] = useState<Tour | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<TourTab>('active');
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);

    const [userRole, setUserRole] = useState<string>('');
    const [userId, setUserId] = useState<number | null>(null);
    const isStaff = userRole === 'STAFF';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

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
    }, [search, filterDest, filterStatus, sortBy, page, pageSize, showToast]);

    useEffect(() => { fetchTours(); }, [fetchTours]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

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

    useEffect(() => {
        fetchWithAuth(`${API_BASE_URL}/auth/profile`)
            .then(r => r.json())
            .then(d => {
                const profile = d?.data ?? d;
                if (profile?.role) setUserRole(profile.role);
                if (profile?.id) setUserId(profile.id);
            })
            .catch(() => {
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

    const trash = useTourTrash({ activeTab, isAdmin, fetchTours, fetchStats, showToast });

    const handleSubmitForReview = useCallback(async (tourId: number) => {
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
    }, [fetchStats, fetchTours, showToast]);

    const handleReviewTour = useCallback(async (action: TourReviewAction, note?: string) => {
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
    }, [fetchStats, fetchTours, reviewTarget, showToast]);

    const confirmDelete = useCallback(async () => {
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
    }, [deleteTarget, fetchStats, fetchTours, isAdmin, isStaff, showToast]);

    const handleEdit = useCallback(async (tour: Tour) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setSelectedTour(json.data ?? json);
            setModalMode('edit');
        } catch {
            showToast('Lỗi tải dữ liệu chi tiết tour. Vui lòng thử lại.', 'error');
        }
    }, [showToast]);

    const handleOpenContent = useCallback(async (tour: Tour) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setContentDrawerTour(json.data ?? json);
        } catch {
            showToast('Lỗi tải dữ liệu tour. Vui lòng thử lại.', 'error');
        }
    }, [showToast]);

    const kpis = buildTourKpis({
        isAdmin,
        isStaff,
        filterStatus,
        tourStats,
        onStatusToggle: (status, activateTab = false) => {
            setFilterStatus(current => current === status ? '' : status);
            setPage(1);
            if (activateTab) setActiveTab('active');
        },
    });

    const isAllSelected = tours.length > 0 && tours.every(t => selectedIds.has(t.id));

    const toggleSelectAll = useCallback(() => {
        setSelectedIds(current => {
            const allSelected = tours.length > 0 && tours.every(t => current.has(t.id));
            return allSelected ? new Set() : new Set(tours.map(t => t.id));
        });
    }, [tours]);

    const toggleSelectOne = useCallback((id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleBulkHide = useCallback(async () => {
        if (selectedIds.size === 0) return;
        setIsBulkDeleting(true);
        let ok = 0;
        const ids = [...selectedIds];
        for (const id of ids) {
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/tour/${id}`, { method: 'DELETE' });
                if (res.ok) ok++;
            } catch {
                // Continue with remaining rows.
            }
        }
        setIsBulkDeleting(false);
        setSelectedIds(new Set());
        showToast(`Ẩn ${ok}/${ids.length} tour thành công.`);
        fetchTours();
        fetchStats();
        setActiveTab('trash');
    }, [fetchStats, fetchTours, selectedIds, showToast]);

    const confirmBulkHide = useCallback(async () => {
        setShowBulkConfirm(false);
        await handleBulkHide();
    }, [handleBulkHide]);

    const refreshTourData = useCallback(async () => {
        if (activeTab === 'trash' && isAdmin) {
            await Promise.all([trash.fetchTrashedTours(), fetchStats()]);
            return;
        }
        await Promise.all([fetchTours(), fetchStats()]);
    }, [activeTab, fetchStats, fetchTours, isAdmin, trash]);

    useAdminAutoRefresh({
        intervalMs: 90 * 1000,
        pause: Boolean(
            modalMode || contentDrawerTour || deleteTarget || reviewTarget || submitTarget ||
            trash.permDeleteTarget || showBulkConfirm || trash.showTrashBulkDeleteConfirm || isDeleting ||
            isBulkDeleting || trash.isPermDeleting || trash.isTrashBulkRestoring || trash.isTrashBulkDeleting ||
            trash.restoring || isSubmitting
        ),
        onRefresh: refreshTourData,
    });

    const handleExportCSV = useCallback(async () => {
        try {
            const exportedCount = await exportToursCsv();
            showToast(`Xuất ${exportedCount} tour ra CSV thành công!`);
        } catch {
            showToast('Xuất file thất bại.', 'error');
        }
    }, [showToast]);

    const openCreateModal = useCallback(() => {
        setSelectedTour(null);
        setModalMode('create');
    }, []);

    const changeFilterDest = useCallback((value: string) => {
        setFilterDest(value);
        setPage(1);
    }, []);

    const changeSortBy = useCallback((value: string) => {
        setSortBy(value);
        setPage(1);
    }, []);

    const changeFilterStatus = useCallback((value: string) => {
        setFilterStatus(value);
        setPage(1);
    }, []);

    const changeTrashStatus = useCallback((value: string) => {
        trash.setTrashStatus(value);
        trash.setTrashPage(1);
    }, [trash]);

    const changeTrashDeletable = useCallback((value: string) => {
        trash.setTrashDeletable(value);
        trash.setTrashPage(1);
    }, [trash]);

    const changePageSize = useCallback((size: number) => {
        setPageSize(size);
        setPage(1);
    }, []);

    const viewPendingTours = useCallback(() => {
        setFilterStatus('PENDING_REVIEW');
        setPage(1);
        setActiveTab('active');
    }, []);

    const handleFormSuccess: TourFormModalProps['onSuccess'] = useCallback((msg, _savedTour, action) => {
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
    }, [fetchStats, fetchTours, filterStatus, isAdmin, isStaff, page, showToast]);

    const closeForm = useCallback(() => {
        setModalMode(null);
        setSelectedTour(null);
    }, []);

    const handleDestinationCreated: TourFormModalProps['onDestinationCreated'] = useCallback((dest: Destination) => {
        setDestinations(prev =>
            [...prev, dest].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
        );
    }, []);

    const handleContentSuccess = useCallback((msg: string) => {
        showToast(msg);
        setContentDrawerTour(null);
    }, [showToast]);

    return {
        tours,
        destinations,
        isLoading,
        meta,
        searchInput,
        filterDest,
        filterStatus,
        sortBy,
        page,
        pageSize,
        modalMode,
        selectedTour,
        contentDrawerTour,
        deleteTarget,
        isDeleting,
        toast,
        selectedIds,
        isBulkDeleting,
        reviewTarget,
        submitTarget,
        isSubmitting,
        activeTab,
        showBulkConfirm,
        userRole,
        userId,
        isStaff,
        isAdmin,
        pendingCount: tourStats.pending,
        draftCount: tourStats.draft,
        kpis,
        isAllSelected,
        trash,
        setSearchInput,
        setPage,
        setActiveTab,
        setSelectedIds,
        setShowBulkConfirm,
        setContentDrawerTour,
        setSubmitTarget,
        setReviewTarget,
        setDeleteTarget,
        openCreateModal,
        handleExportCSV,
        viewPendingTours,
        changeFilterDest,
        changeSortBy,
        changeFilterStatus,
        changeTrashStatus,
        changeTrashDeletable,
        changePageSize,
        toggleSelectAll,
        toggleSelectOne,
        handleOpenContent,
        handleEdit,
        handleSubmitForReview,
        handleReviewTour,
        confirmDelete,
        confirmBulkHide,
        handleFormSuccess,
        closeForm,
        handleDestinationCreated,
        handleContentSuccess,
    };
}

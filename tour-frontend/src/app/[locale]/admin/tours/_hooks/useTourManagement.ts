'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import type { TourFormModalProps } from '../_components/tourForm/types';
import { useTourTrash } from './useTourTrash';
import { useTourSelection } from './useTourSelection';
import { useTourOverlays } from './useTourOverlays';
import { EMPTY_TOUR_STATS } from '../_lib/constants';
import { exportToursCsv } from '../_lib/exportCsv';
import { buildTourKpis } from '../_lib/kpis';
import type { Destination, Meta, Tour, TourStats, TourTab } from '../_lib/types';
import { toastEmitter } from '@/lib/http/toastEmitter';

export function useTourManagement() {
    const searchParams = useSearchParams();
    const initialStatus = searchParams.get('status') ?? '';

    const [tours, setTours] = useState<Tour[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filterDest, setFilterDest] = useState('');
    const [filterStatus, setFilterStatus] = useState(initialStatus);
    const [sortBy, setSortBy] = useState('recommended');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterSeats, setFilterSeats] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [activeTab, setActiveTab] = useState<TourTab>('active');
    const [togglingFeaturedId, setTogglingFeaturedId] = useState<number | null>(null);

    const [tourStats, setTourStats] = useState<TourStats>(EMPTY_TOUR_STATS);

    const [userRole, setUserRole] = useState<string>('');
    const [userId, setUserId] = useState<number | null>(null);
    const isStaff = userRole === 'STAFF';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    // SUPER_ADMIN chỉ xem (read-only) khu vận hành: giữ isAdmin cho layout/đọc, dùng canWrite để gate thao tác.
    const canWrite = isAdmin && userRole !== 'SUPER_ADMIN';

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        if (type === 'error') toastEmitter.error(message);
        else toastEmitter.success(message);
    }, []);

    const fetchTours = useCallback(async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            const qs = new URLSearchParams();
            if (search) qs.append('dest', search);
            if (filterDest) qs.append('destinationId', filterDest);
            if (filterStatus) qs.append('status', filterStatus);
            if (filterDateFrom) qs.append('startDateFrom', filterDateFrom);
            if (filterDateTo) qs.append('startDateTo', filterDateTo);
            qs.append('sortBy', sortBy);
            qs.append('page', String(page));
            qs.append('limit', String(pageSize));

            const res = await fetchWithAuth(`${API_BASE_URL}/tour?${qs}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            const data = json.data ?? (Array.isArray(json) ? json : []);
            setTours(data);
            if (json.meta) setMeta(json.meta);
        } catch {
            setIsError(true);
            showToast('Lỗi tải danh sách tour. Vui lòng thử lại.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [search, filterDest, filterStatus, filterDateFrom, filterDateTo, sortBy, page, pageSize, showToast]);

    useEffect(() => { fetchTours(); }, [fetchTours]);

    const toggleFeatured = useCallback(async (tour: Tour) => {
        const next = !tour.isFeatured;
        setTogglingFeaturedId(tour.id);
        setTours(prev => prev.map(t => t.id === tour.id ? { ...t, isFeatured: next } : t));
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFeatured: next }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Không thể cập nhật trạng thái nổi bật.');
            }
            showToast(next ? 'Đã bật nổi bật cho tour.' : 'Đã tắt nổi bật.');
        } catch (e) {
            setTours(prev => prev.map(t => t.id === tour.id ? { ...t, isFeatured: !next } : t));
            showToast(e instanceof Error ? e.message : 'Không thể cập nhật trạng thái nổi bật.', 'error');
        } finally {
            setTogglingFeaturedId(null);
        }
    }, [showToast]);

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
            if (!res.ok) throw new Error();
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
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(j => setDestinations(j.data ?? j))
            .catch(() => { });
    }, []);

    const trash = useTourTrash({ activeTab, isAdmin, fetchTours, fetchStats, showToast });

    const clearStatusFilterIfRemovalEmptiesView = useCallback((removedTours: Pick<Tour, 'status'>[]) => {
        if (!filterStatus) return false;
        const removedFromActiveStatus = removedTours.filter(tour => tour.status === filterStatus).length;
        if (removedFromActiveStatus === 0) return false;
        if (meta.totalItems - removedFromActiveStatus > 0) return false;

        setFilterStatus('');
        setPage(1);
        return true;
    }, [filterStatus, meta.totalItems]);

    const filteredTours = useMemo(() => {
        if (!filterSeats) return tours;
        return tours.filter(tour => {
            const booked = tour.bookedSeats ?? 0;
            const total = tour.totalSeats ?? tour.availableSeats;
            const fillRate = total > 0 ? booked / total : 0;
            if (filterSeats === 'available') return fillRate < 0.80 && tour.availableSeats > 0;
            if (filterSeats === 'filling') return fillRate >= 0.80 && fillRate < 0.95;
            if (filterSeats === 'almostFull') return fillRate >= 0.95 && tour.availableSeats > 0;
            if (filterSeats === 'soldOut') return tour.availableSeats === 0;
            return true;
        });
    }, [tours, filterSeats]);

    const selection = useTourSelection({
        tours: filteredTours,
        isAdmin: canWrite,
        isStaff,
        userId,
        showToast,
        fetchTours,
        fetchStats,
        clearStatusFilterIfRemovalEmptiesView,
        setActiveTab,
    });

    const overlays = useTourOverlays({
        isAdmin,
        isStaff,
        showToast,
        fetchTours,
        fetchStats,
        clearStatusFilterIfRemovalEmptiesView,
        setActiveTab,
        setDestinations,
    });

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
            overlays.modalMode || overlays.contentDrawerTour || overlays.detailDrawerTour ||
            overlays.deleteTarget || overlays.reviewTarget || overlays.submitTarget ||
            trash.permDeleteTarget || selection.showBulkConfirm || trash.showTrashBulkDeleteConfirm ||
            overlays.isDeleting || selection.isBulkDeleting || selection.isBulkSubmitting ||
            overlays.isDetailLoading || trash.isPermDeleting || trash.isTrashBulkRestoring ||
            trash.isTrashBulkDeleting || trash.restoring || overlays.isSubmitting
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

    const changeFilterDateFrom = useCallback((value: string) => {
        setFilterDateFrom(value);
        setPage(1);
    }, []);

    const changeFilterDateTo = useCallback((value: string) => {
        setFilterDateTo(value);
        setPage(1);
    }, []);

    const changeFilterSeats = useCallback((value: string) => {
        setFilterSeats(value);
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

    return {
        // Tour list
        tours: filteredTours,
        destinations,
        isLoading,
        isError,
        fetchTours,
        meta,
        // Filters & pagination
        searchInput,
        filterDest,
        filterStatus,
        filterDateFrom,
        filterDateTo,
        filterSeats,
        sortBy,
        page,
        pageSize,
        activeTab,
        // Auth
        userRole,
        userId,
        isStaff,
        isAdmin,
        canWrite,
        // Featured toggle
        toggleFeatured,
        togglingFeaturedId,
        // Stats
        pendingCount: tourStats.pending,
        draftCount: tourStats.draft,
        kpis,
        // Sub-hooks
        trash,
        // Filter/pagination setters
        setSearchInput,
        setPage,
        setActiveTab,
        viewPendingTours,
        changeFilterDest,
        changeSortBy,
        changeFilterStatus,
        changeFilterDateFrom,
        changeFilterDateTo,
        changeFilterSeats,
        changeTrashStatus,
        changeTrashDeletable,
        changePageSize,
        // Export
        handleExportCSV,
        handleFormSuccess,
        // From useTourSelection
        selectedIds: selection.selectedIds,
        setSelectedIds: selection.setSelectedIds,
        isBulkDeleting: selection.isBulkDeleting,
        isBulkSubmitting: selection.isBulkSubmitting,
        showBulkConfirm: selection.showBulkConfirm,
        setShowBulkConfirm: selection.setShowBulkConfirm,
        isAllSelected: selection.isAllSelected,
        selectedBulkSubmitCount: selection.selectedBulkSubmitCount,
        selectedBulkHideCount: selection.selectedBulkHideCount,
        canSelectTour: selection.canSelectTour,
        canBulkHideTour: selection.canBulkHideTour,
        toggleSelectAll: selection.toggleSelectAll,
        toggleSelectOne: selection.toggleSelectOne,
        confirmBulkHide: selection.confirmBulkHide,
        handleBulkSubmit: selection.handleBulkSubmit,
        handleExportSelectedCSV: selection.handleExportSelectedCSV,
        // From useTourOverlays
        modalMode: overlays.modalMode,
        selectedTour: overlays.selectedTour,
        contentDrawerTour: overlays.contentDrawerTour,
        setContentDrawerTour: overlays.setContentDrawerTour,
        detailDrawerTour: overlays.detailDrawerTour,
        setDetailDrawerTour: overlays.setDetailDrawerTour,
        isDetailLoading: overlays.isDetailLoading,
        deleteTarget: overlays.deleteTarget,
        setDeleteTarget: overlays.setDeleteTarget,
        isDeleting: overlays.isDeleting,
        reviewTarget: overlays.reviewTarget,
        setReviewTarget: overlays.setReviewTarget,
        submitTarget: overlays.submitTarget,
        setSubmitTarget: overlays.setSubmitTarget,
        isSubmitting: overlays.isSubmitting,
        handleEdit: overlays.handleEdit,
        handleOpenContent: overlays.handleOpenContent,
        handleOpenDetail: overlays.handleOpenDetail,
        handleSubmitForReview: overlays.handleSubmitForReview,
        handleOpenSubmitForReview: overlays.handleOpenSubmitForReview,
        handleReviewTour: overlays.handleReviewTour,
        confirmDelete: overlays.confirmDelete,
        openCreateModal: overlays.openCreateModal,
        closeForm: overlays.closeForm,
        handleCreateDraftFromReference: overlays.handleCreateDraftFromReference,
        handleContentSuccess: overlays.handleContentSuccess,
        handleDestinationCreated: overlays.handleDestinationCreated,
    };
}

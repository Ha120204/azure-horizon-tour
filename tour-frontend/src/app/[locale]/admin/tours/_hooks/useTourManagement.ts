'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import type { TourFormModalProps } from '../_components/tourForm/types';
import { useTourTrash } from './useTourTrash';
import { EMPTY_TOUR_STATS } from '../_lib/constants';
import { exportToursCsv } from '../_lib/exportCsv';
import { getTourReviewMissingItems } from '../_lib/helpers';
import { buildTourKpis } from '../_lib/kpis';
import type { Destination, Meta, ModalMode, Tour, TourStats, TourTab, TourReviewAction } from '../_lib/types';
import { toastEmitter } from '@/lib/http/toastEmitter';

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
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterSeats, setFilterSeats] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [contentDrawerTour, setContentDrawerTour] = useState<Tour | null>(null);
    const [detailDrawerTour, setDetailDrawerTour] = useState<Tour | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
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
        if (type === 'error') toastEmitter.error(message);
        else toastEmitter.success(message);
    }, []);

    const fetchTours = useCallback(async () => {
        setIsLoading(true);
        try {
            const qs = new URLSearchParams();
            if (search) qs.append('dest', search);
            if (filterDest) qs.append('dest', filterDest);
            if (filterStatus) qs.append('status', filterStatus);
            if (filterDateFrom) qs.append('startDateFrom', filterDateFrom);
            if (filterDateTo) qs.append('startDateTo', filterDateTo);
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
    }, [search, filterDest, filterStatus, filterDateFrom, filterDateTo, sortBy, page, pageSize, showToast]);

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

    const clearStatusFilterIfRemovalEmptiesView = useCallback((removedTours: Pick<Tour, 'status'>[]) => {
        if (!filterStatus) return false;
        const removedFromActiveStatus = removedTours.filter(tour => tour.status === filterStatus).length;
        if (removedFromActiveStatus === 0) return false;
        if (meta.totalItems - removedFromActiveStatus > 0) return false;

        setFilterStatus('');
        setPage(1);
        return true;
    }, [filterStatus, meta.totalItems]);

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

    const handleOpenSubmitForReview = useCallback(async (tour: Tour) => {
        setIsSubmitting(tour.id);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            const detail: Tour = json.data ?? json;
            const missingItems = getTourReviewMissingItems(detail);

            if (missingItems.length > 0) {
                setSelectedTour(detail);
                setModalMode('edit');
                showToast(
                    `Vui lòng hoàn thiện thông tin trước khi gửi duyệt: ${missingItems.join(', ')}`,
                    'error'
                );
                return;
            }

            setSubmitTarget(detail);
        } catch {
            showToast('Không thể kiểm tra thông tin tour. Vui lòng thử lại.', 'error');
        } finally {
            setIsSubmitting(null);
        }
    }, [showToast]);

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
            const clearedEmptyStatusFilter = clearStatusFilterIfRemovalEmptiesView([deleteTarget]);
            setDeleteTarget(null);
            if (!clearedEmptyStatusFilter) fetchTours();
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
    }, [clearStatusFilterIfRemovalEmptiesView, deleteTarget, fetchStats, fetchTours, isAdmin, isStaff, showToast]);

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

    const handleOpenDetail = useCallback(async (tour: Tour) => {
        setDetailDrawerTour(tour);
        setIsDetailLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            const detail = json.data ?? json;
            setDetailDrawerTour(current => current?.id === tour.id ? detail : current);
        } catch {
            setDetailDrawerTour(current => current?.id === tour.id ? null : current);
            showToast('Lỗi tải chi tiết tour. Vui lòng thử lại.', 'error');
        } finally {
            setIsDetailLoading(false);
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

    const canSelectTour = useCallback((tour: Tour) => {
        void tour;
        return isAdmin || isStaff;
    }, [isAdmin, isStaff]);

    const canBulkSubmitTour = useCallback((tour: Tour) => {
        if (!isStaff || !userId) return false;
        return tour.createdById === userId && (tour.status === 'DRAFT' || tour.status === 'REJECTED');
    }, [isStaff, userId]);

    const canBulkHideTour = useCallback((tour: Tour) => {
        if (isAdmin) return true;
        return canBulkSubmitTour(tour);
    }, [canBulkSubmitTour, isAdmin]);

    const selectableTours = useMemo(
        () => filteredTours.filter(canSelectTour),
        [canSelectTour, filteredTours]
    );
    const isAllSelected = selectableTours.length > 0 && selectableTours.every(t => selectedIds.has(t.id));

    const selectedTours = useMemo(
        () => tours.filter(tour => selectedIds.has(tour.id)),
        [selectedIds, tours]
    );
    const selectedBulkSubmitCount = useMemo(
        () => selectedTours.filter(canBulkSubmitTour).length,
        [canBulkSubmitTour, selectedTours]
    );
    const selectedBulkHideCount = useMemo(
        () => selectedTours.filter(canBulkHideTour).length,
        [canBulkHideTour, selectedTours]
    );

    useEffect(() => {
        const selectableIds = new Set(selectableTours.map(tour => tour.id));
        setSelectedIds(current => {
            const next = new Set([...current].filter(id => selectableIds.has(id)));
            return next.size === current.size ? current : next;
        });
    }, [selectableTours]);

    const toggleSelectAll = useCallback(() => {
        setSelectedIds(current => {
            const selectableIds = selectableTours.map(t => t.id);
            const allSelected = selectableIds.length > 0 && selectableIds.every(id => current.has(id));
            return allSelected ? new Set() : new Set(selectableIds);
        });
    }, [selectableTours]);

    const toggleSelectOne = useCallback((id: number) => {
        const tour = tours.find(item => item.id === id);
        if (!tour || !canSelectTour(tour)) {
            showToast('Bạn không có quyền chọn tour này.', 'error');
            return;
        }
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, [canSelectTour, showToast, tours]);

    const handleBulkHide = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const eligibleTours = tours.filter(tour => selectedIds.has(tour.id) && canBulkHideTour(tour));
        const eligibleIds = eligibleTours.map(tour => tour.id);
        const skipped = selectedIds.size - eligibleIds.length;
        if (eligibleIds.length === 0) {
            showToast(
                isStaff
                    ? 'Không có tour nào đủ điều kiện. Nhân viên chỉ có thể chuyển vào thùng rác bản nháp hoặc tour bị từ chối do mình tạo.'
                    : 'Không có tour nào đủ điều kiện để ẩn.',
                'error'
            );
            return;
        }
        setIsBulkDeleting(true);
        let ok = 0;
        let lastError = '';
        const succeededIds = new Set<number>();
        try {
            for (const id of eligibleIds) {
                try {
                    const res = await fetchWithAuth(`${API_BASE_URL}/tour/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        ok++;
                        succeededIds.add(id);
                    } else {
                        const payload = await res.json().catch(() => ({}));
                        const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
                        lastError = typeof message === 'string' && message.trim() ? message : 'Một số tour không thể ẩn.';
                    }
                } catch (error) {
                    lastError = error instanceof Error ? error.message : 'Một số tour không thể ẩn.';
                }
            }
            if (ok === 0) {
                showToast(lastError || 'Ẩn tour thất bại. Vui lòng kiểm tra quyền hoặc thử lại.', 'error');
                return;
            }
            setSelectedIds(new Set());
            showToast(
                skipped > 0 || ok < eligibleIds.length
                    ? `Đã ẩn ${ok}/${selectedIds.size} tour. ${skipped > 0 ? `${skipped} tour không đủ điều kiện.` : 'Một số tour không thể ẩn.'}`
                    : `Đã chuyển ${ok} tour vào thùng rác.`
            );
            const clearedEmptyStatusFilter = clearStatusFilterIfRemovalEmptiesView(
                eligibleTours.filter(tour => succeededIds.has(tour.id))
            );
            if (clearedEmptyStatusFilter) {
                await fetchStats();
            } else {
                await Promise.all([fetchTours(), fetchStats()]);
            }
            if (isAdmin) {
                setActiveTab('trash');
            }
        } finally {
            setIsBulkDeleting(false);
        }
    }, [canBulkHideTour, clearStatusFilterIfRemovalEmptiesView, fetchStats, fetchTours, isAdmin, isStaff, selectedIds, showToast, tours]);

    const confirmBulkHide = useCallback(async () => {
        setShowBulkConfirm(false);
        await handleBulkHide();
    }, [handleBulkHide]);

    const handleBulkSubmit = useCallback(async () => {
        const eligibleTours = tours.filter(tour => selectedIds.has(tour.id) && canBulkSubmitTour(tour));
        if (eligibleTours.length === 0) {
            showToast('Không có tour nào đủ điều kiện gửi duyệt. Chỉ bản nháp/bị từ chối do bạn tạo mới được gửi.', 'error');
            return;
        }
        setIsBulkSubmitting(true);
        let ok = 0;
        let lastError = '';
        for (const tour of eligibleTours) {
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}/submit`, { method: 'POST' });
                if (res.ok) {
                    ok++;
                } else {
                    const err = await res.json().catch(() => ({}));
                    lastError = err.message || 'Một số tour không thể gửi duyệt.';
                }
            } catch (e) {
                lastError = e instanceof Error ? e.message : 'Lỗi khi gửi duyệt.';
            }
        }
        setIsBulkSubmitting(false);
        if (ok === 0) {
            showToast(lastError || 'Gửi duyệt hàng loạt thất bại.', 'error');
        } else {
            const skipped = eligibleTours.length - ok;
            showToast(
                skipped > 0
                    ? `Đã gửi duyệt ${ok}/${eligibleTours.length} tour. ${skipped} tour không thể gửi.`
                    : `Đã gửi duyệt ${ok} tour thành công!`
            );
            setSelectedIds(new Set());
            fetchTours();
            fetchStats();
        }
    }, [canBulkSubmitTour, fetchStats, fetchTours, selectedIds, showToast, tours]);

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
            modalMode || contentDrawerTour || detailDrawerTour || deleteTarget || reviewTarget || submitTarget ||
            trash.permDeleteTarget || showBulkConfirm || trash.showTrashBulkDeleteConfirm || isDeleting ||
            isBulkDeleting || isBulkSubmitting || isDetailLoading || trash.isPermDeleting || trash.isTrashBulkRestoring || trash.isTrashBulkDeleting ||
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

    const handleExportSelectedCSV = useCallback(async () => {
        if (selectedTours.length === 0) return;
        try {
            const exportedCount = await exportToursCsv(selectedTours);
            showToast(`Xuất ${exportedCount} tour đã chọn ra CSV thành công!`);
        } catch {
            showToast('Xuất file thất bại.', 'error');
        }
    }, [selectedTours, showToast]);

    const openCreateModal = useCallback(() => {
        setSelectedTour(null);
        setModalMode('create');
    }, []);

    const handleCreateDraftFromReference = useCallback(() => {
        setDetailDrawerTour(null);
        openCreateModal();
    }, [openCreateModal]);

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
        tours: filteredTours,
        destinations,
        isLoading,
        meta,
        searchInput,
        filterDest,
        filterStatus,
        filterDateFrom,
        filterDateTo,
        filterSeats,
        sortBy,
        page,
        pageSize,
        modalMode,
        selectedTour,
        contentDrawerTour,
        detailDrawerTour,
        isDetailLoading,
        deleteTarget,
        isDeleting,
        selectedIds,
        isBulkDeleting,
        isBulkSubmitting,
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
        selectedBulkSubmitCount,
        selectedBulkHideCount,
        canSelectTour,
        canBulkHideTour,
        trash,
        setSearchInput,
        setPage,
        setActiveTab,
        setSelectedIds,
        setShowBulkConfirm,
        setContentDrawerTour,
        setDetailDrawerTour,
        setSubmitTarget,
        setReviewTarget,
        setDeleteTarget,
        openCreateModal,
        handleExportCSV,
        handleExportSelectedCSV,
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
        toggleSelectAll,
        toggleSelectOne,
        handleOpenDetail,
        handleOpenContent,
        handleEdit,
        handleOpenSubmitForReview,
        handleSubmitForReview,
        handleReviewTour,
        confirmDelete,
        confirmBulkHide,
        handleBulkSubmit,
        handleCreateDraftFromReference,
        handleFormSuccess,
        closeForm,
        handleDestinationCreated,
        handleContentSuccess,
    };
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { exportToursCsv } from '../_lib/exportCsv';
import type { Tour, TourTab } from '../_lib/types';

interface UseTourSelectionOptions {
    tours: Tour[];
    isAdmin: boolean;
    isStaff: boolean;
    userId: number | null;
    showToast: (message: string, type?: 'success' | 'error') => void;
    fetchTours: () => void | Promise<void>;
    fetchStats: () => void | Promise<void>;
    clearStatusFilterIfRemovalEmptiesView: (tours: Pick<Tour, 'status'>[]) => boolean;
    setActiveTab: (tab: TourTab) => void;
}

export function useTourSelection({
    tours,
    isAdmin,
    isStaff,
    userId,
    showToast,
    fetchTours,
    fetchStats,
    clearStatusFilterIfRemovalEmptiesView,
    setActiveTab,
}: UseTourSelectionOptions) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);

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
        () => tours.filter(canSelectTour),
        [canSelectTour, tours]
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
        if (eligibleTours.length === 0) {
            showToast(
                isStaff
                    ? 'Không có tour nào đủ điều kiện. Nhân viên chỉ có thể chuyển vào thùng rác bản nháp hoặc tour bị từ chối do mình tạo.'
                    : 'Không có tour nào đủ điều kiện để ẩn.',
                'error'
            );
            return;
        }
        setIsBulkDeleting(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/bulk`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: eligibleTours.map(t => t.id) }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.message || 'Ẩn tour thất bại.');
            const data = json.data ?? json;
            const deleted: number = data.deleted ?? 0;
            if (deleted === 0) {
                showToast('Ẩn tour thất bại. Vui lòng kiểm tra quyền hoặc thử lại.', 'error');
                return;
            }
            setSelectedIds(new Set());
            const totalSkipped = selectedIds.size - deleted;
            showToast(
                totalSkipped > 0
                    ? `Đã chuyển ${deleted}/${selectedIds.size} tour vào thùng rác. ${totalSkipped} tour không đủ điều kiện.`
                    : `Đã chuyển ${deleted} tour vào thùng rác.`
            );
            const clearedEmptyStatusFilter = clearStatusFilterIfRemovalEmptiesView(eligibleTours);
            if (clearedEmptyStatusFilter) {
                await fetchStats();
            } else {
                await Promise.all([fetchTours(), fetchStats()]);
            }
            if (isAdmin) setActiveTab('trash');
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Ẩn tour thất bại.', 'error');
        } finally {
            setIsBulkDeleting(false);
        }
    }, [canBulkHideTour, clearStatusFilterIfRemovalEmptiesView, fetchStats, fetchTours, isAdmin, isStaff, selectedIds, setActiveTab, showToast, tours]);

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
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/bulk-submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: eligibleTours.map(t => t.id) }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.message || 'Gửi duyệt hàng loạt thất bại.');
            const data = json.data ?? json;
            const submitted: number = data.submitted ?? 0;
            if (submitted === 0) {
                showToast('Không có tour nào đủ điều kiện gửi duyệt. Vui lòng hoàn thiện thông tin tour trước.', 'error');
                return;
            }
            const skipped = eligibleTours.length - submitted;
            showToast(
                skipped > 0
                    ? `Đã gửi duyệt ${submitted}/${eligibleTours.length} tour. ${skipped} tour chưa đủ thông tin.`
                    : `Đã gửi duyệt ${submitted} tour thành công!`
            );
            setSelectedIds(new Set());
            fetchTours();
            fetchStats();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Gửi duyệt hàng loạt thất bại.', 'error');
        } finally {
            setIsBulkSubmitting(false);
        }
    }, [canBulkSubmitTour, fetchStats, fetchTours, selectedIds, showToast, tours]);

    const handleExportSelectedCSV = useCallback(async () => {
        if (selectedTours.length === 0) return;
        try {
            const exportedCount = await exportToursCsv(selectedTours);
            showToast(`Xuất ${exportedCount} tour đã chọn ra CSV thành công!`);
        } catch {
            showToast('Xuất file thất bại.', 'error');
        }
    }, [selectedTours, showToast]);

    return {
        selectedIds,
        setSelectedIds,
        isBulkDeleting,
        isBulkSubmitting,
        showBulkConfirm,
        setShowBulkConfirm,
        isAllSelected,
        selectedBulkSubmitCount,
        selectedBulkHideCount,
        canSelectTour,
        canBulkHideTour,
        toggleSelectAll,
        toggleSelectOne,
        confirmBulkHide,
        handleBulkSubmit,
        handleExportSelectedCSV,
    };
}

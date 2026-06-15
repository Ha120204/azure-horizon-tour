'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { getTourReviewMissingItems } from '../_lib/helpers';
import type { Destination, ModalMode, Tour, TourReviewAction, TourTab } from '../_lib/types';
import type { TourFormModalProps } from '../_components/tourForm/types';

interface UseTourOverlaysOptions {
    isAdmin: boolean;
    isStaff: boolean;
    showToast: (message: string, type?: 'success' | 'error') => void;
    fetchTours: () => void | Promise<void>;
    fetchStats: () => void | Promise<void>;
    clearStatusFilterIfRemovalEmptiesView: (tours: Pick<Tour, 'status'>[]) => boolean;
    setActiveTab: (tab: TourTab) => void;
    setDestinations: Dispatch<SetStateAction<Destination[]>>;
}

export function useTourOverlays({
    isAdmin,
    isStaff,
    showToast,
    fetchTours,
    fetchStats,
    clearStatusFilterIfRemovalEmptiesView,
    setActiveTab,
    setDestinations,
}: UseTourOverlaysOptions) {
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [contentDrawerTour, setContentDrawerTour] = useState<Tour | null>(null);
    const [detailDrawerTour, setDetailDrawerTour] = useState<Tour | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [reviewTarget, setReviewTarget] = useState<{ tour: Tour; action: TourReviewAction } | null>(null);
    const [submitTarget, setSubmitTarget] = useState<Tour | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

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
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${deleteTarget.id}`, { method: 'DELETE' });
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
    }, [clearStatusFilterIfRemovalEmptiesView, deleteTarget, fetchStats, fetchTours, isAdmin, isStaff, setActiveTab, showToast]);

    const openCreateModal = useCallback(() => {
        setSelectedTour(null);
        setModalMode('create');
    }, []);

    const closeForm = useCallback(() => {
        setModalMode(null);
        setSelectedTour(null);
    }, []);

    const handleCreateDraftFromReference = useCallback(() => {
        setDetailDrawerTour(null);
        openCreateModal();
    }, [openCreateModal]);

    const handleContentSuccess = useCallback((msg: string) => {
        showToast(msg);
        setContentDrawerTour(null);
    }, [showToast]);

    const handleDestinationCreated: TourFormModalProps['onDestinationCreated'] = useCallback((dest: Destination) => {
        setDestinations(prev =>
            [...prev, dest].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
        );
    }, [setDestinations]);

    return {
        modalMode,
        selectedTour,
        setSelectedTour,
        contentDrawerTour,
        setContentDrawerTour,
        detailDrawerTour,
        setDetailDrawerTour,
        isDetailLoading,
        deleteTarget,
        setDeleteTarget,
        isDeleting,
        reviewTarget,
        setReviewTarget,
        submitTarget,
        setSubmitTarget,
        isSubmitting,
        handleEdit,
        handleOpenContent,
        handleOpenDetail,
        handleSubmitForReview,
        handleOpenSubmitForReview,
        handleReviewTour,
        confirmDelete,
        openCreateModal,
        closeForm,
        handleCreateDraftFromReference,
        handleContentSuccess,
        handleDestinationCreated,
    };
}

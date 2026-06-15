'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import type { Meta, ToastState, Tour, TourTab, TrashedTour } from '../_lib/types';

interface UseTourTrashOptions {
    activeTab: TourTab;
    isAdmin: boolean;
    fetchTours: () => void | Promise<void>;
    fetchStats: () => void | Promise<void>;
    showToast: (message: string, type?: ToastState['type']) => void;
}

export function useTourTrash({ activeTab, isAdmin, fetchTours, fetchStats, showToast }: UseTourTrashOptions) {
    const [trashedTours, setTrashedTours] = useState<TrashedTour[]>([]);
    const [trashMeta, setTrashMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
    const [trashPage, setTrashPage] = useState(1);
    const [isLoadingTrash, setIsLoadingTrash] = useState(false);
    const [isTrashError, setIsTrashError] = useState(false);
    const [trashSearchInput, setTrashSearchInput] = useState('');
    const [trashSearch, setTrashSearch] = useState('');
    const [trashStatus, setTrashStatus] = useState('');
    const [trashDeletable, setTrashDeletable] = useState('');
    const [trashSelectedIds, setTrashSelectedIds] = useState<Set<number>>(new Set());
    const [restoring, setRestoring] = useState<number | null>(null);
    const [permDeleteTarget, setPermDeleteTarget] = useState<TrashedTour | null>(null);
    const [isPermDeleting, setIsPermDeleting] = useState(false);
    const [isTrashBulkRestoring, setIsTrashBulkRestoring] = useState(false);
    const [isTrashBulkDeleting, setIsTrashBulkDeleting] = useState(false);
    const [showTrashBulkDeleteConfirm, setShowTrashBulkDeleteConfirm] = useState(false);

    const fetchTrashedTours = useCallback(async () => {
        setIsLoadingTrash(true);
        setIsTrashError(false);
        try {
            const qs = new URLSearchParams();
            qs.set('page', String(trashPage));
            qs.set('limit', '10');
            if (trashSearch) qs.set('search', trashSearch);
            if (trashStatus) qs.set('status', trashStatus);
            if (trashDeletable) qs.set('deletable', trashDeletable);
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/trash?${qs.toString()}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setTrashedTours(json.data ?? []);
            if (json.meta) setTrashMeta(json.meta);
        } catch {
            setIsTrashError(true);
            showToast('Lỗi tải thùng rác.', 'error');
        } finally {
            setIsLoadingTrash(false);
        }
    }, [showToast, trashDeletable, trashPage, trashSearch, trashStatus]);

    useEffect(() => {
        if (activeTab === 'trash' && isAdmin) fetchTrashedTours();
    }, [activeTab, fetchTrashedTours, isAdmin]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setTrashSearch(trashSearchInput);
            setTrashPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [trashSearchInput]);

    useEffect(() => {
        setTrashSelectedIds(new Set());
    }, [trashPage, trashSearch, trashStatus, trashDeletable, activeTab]);

    useEffect(() => {
        if (!isAdmin) return;
        fetchWithAuth(`${API_BASE_URL}/tour/trash?page=1&limit=1`)
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(json => {
                if (json.meta) {
                    setTrashMeta(prev => ({
                        ...prev,
                        totalItems: json.meta.totalItems,
                        totalPages: json.meta.totalPages,
                    }));
                }
            })
            .catch(() => { });
    }, [isAdmin]);

    const handleRestore = useCallback(async (tour: Tour) => {
        setRestoring(tour.id);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}/restore`, { method: 'PATCH' });
            if (!res.ok) throw new Error();
            showToast(`Đã khôi phục tour "${tour.name}".`);
            fetchTrashedTours();
            fetchTours();
        } catch {
            showToast('Khôi phục thất bại.', 'error');
        } finally {
            setRestoring(null);
        }
    }, [fetchTours, fetchTrashedTours, showToast]);

    const handlePermanentDelete = useCallback(async () => {
        if (!permDeleteTarget) return;
        setIsPermDeleting(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${permDeleteTarget.id}/permanent`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Xóa vĩnh viễn thất bại.');
            }
            showToast(`Đã xóa vĩnh viễn "${permDeleteTarget.name}".`);
            setPermDeleteTarget(null);
            fetchTrashedTours();
        } catch {
            showToast(
                permDeleteTarget.bookingCount
                    ? 'Tour đã có booking, không thể xóa vĩnh viễn.'
                    : 'Xóa vĩnh viễn thất bại.',
                'error'
            );
        } finally {
            setIsPermDeleting(false);
        }
    }, [fetchTrashedTours, permDeleteTarget, showToast]);

    const isTrashAllSelected = trashedTours.length > 0 && trashedTours.every(t => trashSelectedIds.has(t.id));

    const toggleTrashSelectAll = useCallback(() => {
        setTrashSelectedIds(isTrashAllSelected ? new Set() : new Set(trashedTours.map(t => t.id)));
    }, [isTrashAllSelected, trashedTours]);

    const toggleTrashSelectOne = useCallback((id: number) => {
        setTrashSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleTrashBulkRestore = useCallback(async () => {
        const ids = [...trashSelectedIds];
        if (ids.length === 0) return;
        setIsTrashBulkRestoring(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/trash/bulk-restore`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.message || 'Khôi phục thất bại.');
            const data = json.data ?? json;
            showToast(`Đã khôi phục ${data.restored ?? 0}/${data.requested ?? ids.length} tour.`);
            setTrashSelectedIds(new Set());
            fetchTrashedTours();
            fetchTours();
            fetchStats();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Khôi phục thất bại.', 'error');
        } finally {
            setIsTrashBulkRestoring(false);
        }
    }, [fetchStats, fetchTours, fetchTrashedTours, showToast, trashSelectedIds]);

    const handleTrashBulkPermanentDelete = useCallback(async () => {
        const ids = [...trashSelectedIds];
        if (ids.length === 0) return;
        setIsTrashBulkDeleting(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/tour/trash/bulk-permanent`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.message || 'Xóa vĩnh viễn thất bại.');
            const data = json.data ?? json;
            const blockedCount = Array.isArray(data.blocked) ? data.blocked.length : 0;
            showToast(
                blockedCount > 0
                    ? `Đã xóa ${data.deleted ?? 0} tour. ${blockedCount} tour bị giữ lại vì đã có booking.`
                    : `Đã xóa vĩnh viễn ${data.deleted ?? 0} tour.`
            );
            setShowTrashBulkDeleteConfirm(false);
            setTrashSelectedIds(new Set());
            fetchTrashedTours();
            fetchStats();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Xóa vĩnh viễn thất bại.', 'error');
        } finally {
            setIsTrashBulkDeleting(false);
        }
    }, [fetchStats, fetchTrashedTours, showToast, trashSelectedIds]);

    return {
        trashedTours,
        trashMeta,
        trashPage,
        setTrashPage,
        isLoadingTrash,
        isTrashError,
        trashSearchInput,
        setTrashSearchInput,
        trashStatus,
        setTrashStatus,
        trashDeletable,
        setTrashDeletable,
        trashSelectedIds,
        setTrashSelectedIds,
        restoring,
        permDeleteTarget,
        setPermDeleteTarget,
        isPermDeleting,
        isTrashBulkRestoring,
        isTrashBulkDeleting,
        showTrashBulkDeleteConfirm,
        setShowTrashBulkDeleteConfirm,
        fetchTrashedTours,
        handleRestore,
        handlePermanentDelete,
        isTrashAllSelected,
        toggleTrashSelectAll,
        toggleTrashSelectOne,
        handleTrashBulkRestore,
        handleTrashBulkPermanentDelete,
    };
}

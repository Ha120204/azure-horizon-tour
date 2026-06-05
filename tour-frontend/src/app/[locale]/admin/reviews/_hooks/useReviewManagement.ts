'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { EMPTY_ADMIN_STATS } from '../_lib/config';
import type { AdminStats, Meta, Review, ReviewKpiItem } from '../_lib/types';

const REVIEW_REALTIME_TYPES = ['review_good', 'review_bad'] as const;
type ReviewQuickFilter = 'all' | 'unreplied' | 'low' | 'replied' | 'hidden';

export function useReviewManagement() {
    const params = useParams<{ locale?: string }>();
    const locale = params?.locale ?? 'vi';
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<AdminStats>(EMPTY_ADMIN_STATS);
    const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 });
    const [isLoading, setIsLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [ratingFilter, setRatingFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [replyFilter, setReplyFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [selected, setSelected] = useState<number[]>([]);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<number[] | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [replyTarget, setReplyTarget] = useState<Review | null>(null);
    const [lightbox, setLightbox] = useState<{ images: string[]; idx: number } | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/stats`);
            const json = await res.json();
            const nextStats = json?.data ?? json;
            setStats((prev) => ({
                ...prev,
                ...nextStats,
                replied: nextStats?.replied ?? 0,
                unreplied: nextStats?.unreplied ?? 0,
                breakdown: nextStats?.breakdown ?? prev.breakdown,
            }));
        } catch {
            // Stats are supplemental for this screen.
        }
    }, []);

    const fetchReviews = useCallback(async () => {
        setIsLoading(true);
        try {
            const qs = new URLSearchParams();
            qs.set('page', String(page));
            qs.set('limit', String(pageSize));

            if (debouncedSearch) qs.set('search', debouncedSearch);
            if (ratingFilter.includes(',')) qs.set('ratings', ratingFilter);
            else if (ratingFilter) qs.set('rating', ratingFilter);
            if (statusFilter) qs.set('status', statusFilter);
            if (replyFilter) qs.set('replyStatus', replyFilter);
            if (sortBy) qs.set('sortBy', sortBy);

            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/all?${qs}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message ?? 'Lỗi API');

            const data: Review[] = Array.isArray(json?.data) ? json.data : [];
            setReviews(data);
            if (json?.meta) setMeta(json.meta);
        } catch (error: unknown) {
            console.error('[ReviewPage] fetchReviews error:', error);
            showToast('Lỗi tải danh sách đánh giá', false);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, debouncedSearch, ratingFilter, statusFilter, replyFilter, sortBy, showToast]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const refreshReviewData = useCallback(async () => {
        await Promise.all([fetchReviews(), fetchStats()]);
    }, [fetchReviews, fetchStats]);

    useAdminRealtime({
        notificationTypes: REVIEW_REALTIME_TYPES,
        onRefresh: refreshReviewData,
        pause: Boolean(deleteTarget || replyTarget || lightbox || loadingId || bulkLoading || isDeleting),
    });

    useAdminAutoRefresh({
        intervalMs: 60 * 1000,
        pause: Boolean(deleteTarget || replyTarget || lightbox || loadingId || bulkLoading || isDeleting),
        onRefresh: refreshReviewData,
    });

    useEffect(() => {
        setSelected([]);
    }, [debouncedSearch, ratingFilter, statusFilter, replyFilter, sortBy, pageSize]);

    const toggleSelect = useCallback((id: number) => {
        setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    }, []);

    const isAllSelected = reviews.length > 0 && reviews.every((review) => selected.includes(review.id));

    const toggleSelectAll = useCallback(() => {
        setSelected((current) => {
            const allSelected = reviews.length > 0 && reviews.every((review) => current.includes(review.id));
            return allSelected ? [] : reviews.map((review) => review.id);
        });
    }, [reviews]);

    const clearSelection = useCallback(() => setSelected([]), []);
    const selectedReviews = useMemo(
        () => reviews.filter((review) => selected.includes(review.id)),
        [reviews, selected],
    );

    const handleToggleVisibility = useCallback(async (review: Review) => {
        setLoadingId(review.id);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/${review.id}/visibility`, { method: 'PATCH' });
            const json = await res.json();
            if (!res.ok) throw new Error();
            const updated: Review = json?.data ?? json;
            setReviews((prev) => prev.map((item) => item.id === review.id ? updated : item));
            setStats((prev) => ({
                ...prev,
                hidden: updated.isHidden ? prev.hidden + 1 : Math.max(0, prev.hidden - 1),
            }));
            showToast(updated.isHidden ? 'Đã ẩn đánh giá' : 'Đã hiện đánh giá');
            fetchReviews();
            fetchStats();
        } catch {
            showToast('Không thể thay đổi trạng thái', false);
        } finally {
            setLoadingId(null);
        }
    }, [fetchReviews, fetchStats, showToast]);

    const handleDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            if (deleteTarget.length === 1) {
                const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/${deleteTarget[0]}`, { method: 'DELETE' });
                if (!res.ok) throw new Error();
            } else {
                const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/bulk/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: deleteTarget }),
                });
                if (!res.ok) throw new Error();
            }
            setReviews((prev) => prev.filter((review) => !deleteTarget.includes(review.id)));
            setSelected((prev) => prev.filter((id) => !deleteTarget.includes(id)));
            showToast(`Đã xóa ${deleteTarget.length} đánh giá`);
            fetchReviews();
            fetchStats();
        } catch {
            showToast('Xóa thất bại. Vui lòng thử lại.', false);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    }, [deleteTarget, fetchReviews, fetchStats, showToast]);

    const handleReply = useCallback(async (content: string) => {
        if (!replyTarget) return;
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/${replyTarget.id}/reply`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error();
            const updated: Review = json?.data ?? json;
            setReviews((prev) => prev.map((review) => review.id === replyTarget.id ? updated : review));
            showToast('Đã lưu phản hồi');
            setReplyTarget(null);
            fetchReviews();
            fetchStats();
        } catch {
            showToast('Không thể lưu phản hồi', false);
        }
    }, [fetchReviews, fetchStats, replyTarget, showToast]);

    const handleBulkVisibility = useCallback(async (isHidden: boolean) => {
        setBulkLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/bulk/${isHidden ? 'hide' : 'show'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selected }),
            });
            if (!res.ok) throw new Error();
            setReviews((prev) => prev.map((review) => selected.includes(review.id) ? { ...review, isHidden } : review));
            showToast(`${isHidden ? 'Đã ẩn' : 'Đã hiện'} ${selected.length} đánh giá`);
            fetchReviews();
            fetchStats();
            clearSelection();
        } catch {
            showToast('Thao tác thất bại', false);
        } finally {
            setBulkLoading(false);
        }
    }, [clearSelection, fetchReviews, fetchStats, selected, showToast]);

    const resetFilters = useCallback(() => {
        setSearch('');
        setRatingFilter('');
        setStatusFilter('');
        setReplyFilter('');
        setSortBy('newest');
        setPage(1);
    }, []);

    const filterByRating = useCallback((rating: string) => {
        setRatingFilter((current) => current === rating ? '' : rating);
        setPage(1);
    }, []);

    const filterByStatus = useCallback((status: string) => {
        setStatusFilter((current) => current === status ? '' : status);
        setPage(1);
    }, []);

    const filterLowRatings = useCallback(() => {
        setRatingFilter((current) => current === '1,2' ? '' : '1,2');
        setStatusFilter('');
        setPage(1);
    }, []);

    const filterByReply = useCallback((status: string) => {
        setReplyFilter((current) => current === status ? '' : status);
        setPage(1);
    }, []);

    const changeRatingFilter = useCallback((value: string) => {
        setRatingFilter(value);
        setPage(1);
    }, []);

    const changeStatusFilter = useCallback((value: string) => {
        setStatusFilter(value);
        setPage(1);
    }, []);

    const changeReplyFilter = useCallback((value: string) => {
        setReplyFilter(value);
        setPage(1);
    }, []);

    const changeSortBy = useCallback((value: string) => {
        setSortBy(value);
        setPage(1);
    }, []);

    const changePage = useCallback((nextPage: number) => {
        setPage(nextPage);
        setSelected([]);
    }, []);

    const changePageSize = useCallback((nextPageSize: number) => {
        setPageSize(nextPageSize);
        setPage(1);
        setSelected([]);
    }, []);

    const applyQuickFilter = useCallback((filter: ReviewQuickFilter) => {
        if (filter === 'all') {
            resetFilters();
            return;
        }

        setPage(1);

        if (filter === 'unreplied') {
            setRatingFilter('');
            setStatusFilter('');
            setReplyFilter('unreplied');
            return;
        }

        if (filter === 'low') {
            setRatingFilter('1,2');
            setStatusFilter('');
            setReplyFilter('');
            return;
        }

        if (filter === 'replied') {
            setRatingFilter('');
            setStatusFilter('');
            setReplyFilter('replied');
            return;
        }

        setRatingFilter('');
        setStatusFilter('hidden');
        setReplyFilter('');
    }, [resetFilters]);

    const openLightbox = useCallback((images: string[], idx: number) => {
        setLightbox({ images, idx });
    }, []);

    const hasFilter = Boolean(search || ratingFilter || statusFilter || replyFilter || sortBy !== 'newest');
    const lowRatingCount = (stats.breakdown[1] ?? 0) + (stats.breakdown[2] ?? 0);
    const selectedRatings = ratingFilter.split(',').filter(Boolean);
    const activeQuickFilter = useMemo<ReviewQuickFilter | ''>(() => {
        if (!ratingFilter && !statusFilter && !replyFilter) return 'all';
        if (!ratingFilter && !statusFilter && replyFilter === 'unreplied') return 'unreplied';
        if (ratingFilter === '1,2' && !statusFilter && !replyFilter) return 'low';
        if (!ratingFilter && !statusFilter && replyFilter === 'replied') return 'replied';
        if (!ratingFilter && statusFilter === 'hidden' && !replyFilter) return 'hidden';
        return '';
    }, [ratingFilter, replyFilter, statusFilter]);

    const kpis = useMemo<ReviewKpiItem[]>(() => [
        {
            icon: 'rate_review', label: 'Tổng đánh giá', value: stats.total.toLocaleString('vi-VN'),
            sub: `${stats.total - stats.hidden} đang hiển thị`,
            gradient: 'from-blue-600 to-indigo-600', iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
            onClick: resetFilters,
            active: !hasFilter,
        },
        {
            icon: 'star', label: 'Điểm trung bình', value: `${stats.averageRating} ★`,
            sub: 'trên thang điểm 5',
            gradient: 'from-amber-400 to-orange-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-500',
        },
        {
            icon: 'forum', label: 'Chưa phản hồi', value: stats.unreplied.toLocaleString('vi-VN'),
            sub: `${stats.replied.toLocaleString('vi-VN')} đã phản hồi`,
            gradient: 'from-cyan-500 to-blue-600', iconBg: 'bg-cyan-50', iconColor: 'text-cyan-600',
            onClick: () => filterByReply('unreplied'),
            active: replyFilter === 'unreplied',
        },
        {
            icon: 'workspace_premium', label: 'Tỷ lệ 5 sao', value: `${stats.fiveStarRate}%`,
            sub: `${stats.breakdown[5] ?? 0} đánh giá xuất sắc`,
            gradient: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
            onClick: () => filterByRating('5'),
            active: ratingFilter === '5',
        },
        {
            icon: 'report', label: 'Cần kiểm tra', value: lowRatingCount.toLocaleString('vi-VN'),
            sub: 'đánh giá 1-2 sao',
            gradient: 'from-orange-400 to-red-500', iconBg: 'bg-orange-50', iconColor: 'text-orange-600',
            onClick: filterLowRatings,
            active: ratingFilter === '1,2',
        },
        {
            icon: 'visibility_off', label: 'Đang ẩn', value: stats.hidden.toLocaleString('vi-VN'),
            sub: 'đánh giá bị ẩn',
            gradient: 'from-red-400 to-rose-500', iconBg: 'bg-red-50', iconColor: 'text-red-500',
            onClick: () => filterByStatus('hidden'),
            active: statusFilter === 'hidden',
        },
    ], [filterByRating, filterByReply, filterByStatus, filterLowRatings, hasFilter, lowRatingCount, ratingFilter, replyFilter, resetFilters, stats, statusFilter]);

    return {
        locale,
        reviews,
        stats,
        meta,
        isLoading,
        search,
        ratingFilter,
        statusFilter,
        replyFilter,
        sortBy,
        pageSize,
        selected,
        selectedReviews,
        loadingId,
        bulkLoading,
        deleteTarget,
        isDeleting,
        replyTarget,
        lightbox,
        toast,
        isAllSelected,
        hasFilter,
        selectedRatings,
        activeQuickFilter,
        kpis,
        setSearch,
        setDeleteTarget,
        setReplyTarget,
        setLightbox,
        setToast,
        refreshReviewData,
        toggleSelect,
        toggleSelectAll,
        clearSelection,
        handleToggleVisibility,
        handleDelete,
        handleReply,
        handleBulkVisibility,
        resetFilters,
        filterByRating,
        applyQuickFilter,
        changeRatingFilter,
        changeStatusFilter,
        changeReplyFilter,
        changeSortBy,
        changePage,
        changePageSize,
        openLightbox,
    };
}

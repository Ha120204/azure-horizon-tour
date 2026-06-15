'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import type { Article } from '../_components/ArticleDrawer';
import { EMPTY_STATS } from '../_lib/config';
import { getCatCfg } from '../_lib/helpers';
import { buildArticleKpiCards } from '../_lib/kpis';
import type {
  ArticleMeta,
  ArticleBulkAction,
  ArticleBulkActionOptions,
  ArticleReviewAction,
  ArticleSortKey,
  ArticleStats,
  ArticleStatus,
  ArticleToastState,
  ArticleViewMode,
  SortDirection,
  TrashArticle,
} from '../_lib/types';

const emptyArticleMeta: ArticleMeta = {
  totalItems: 0,
  totalPages: 1,
  currentPage: 1,
  itemsPerPage: 10,
};

export function useArticleManagement() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';

  const [articles, setArticles] = useState<Article[]>([]);
  const [meta, setMeta] = useState<ArticleMeta>(emptyArticleMeta);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [viewMode, setViewMode] = useState<ArticleViewMode>('list');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<ArticleSortKey>('publishedAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<number>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [articleStats, setArticleStats] = useState<ArticleStats>(EMPTY_STATS);
  const [reviewTarget, setReviewTarget] = useState<{ article: Article; action: ArticleReviewAction } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<Article | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Article | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ArticleToastState | null>(null);

  const [showTrash, setShowTrash] = useState(false);
  const [trashArticles, setTrashArticles] = useState<TrashArticle[]>([]);
  const [trashMeta, setTrashMeta] = useState<ArticleMeta>({ totalItems: 0, totalPages: 1, currentPage: 1 });
  const [trashPage, setTrashPage] = useState(1);
  const [trashSearch, setTrashSearch] = useState('');
  const [trashLoading, setTrashLoading] = useState(false);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<TrashArticle | null>(null);
  const [isHardDeleting, setIsHardDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState<number | null>(null);
  const [trashCount, setTrashCount] = useState(0);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  // SUPER_ADMIN chỉ xem (read-only): giữ isAdmin cho layout/phân biệt staff, dùng canWrite để gate thao tác.
  const canWrite = isAdmin && userRole !== 'SUPER_ADMIN';

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/auth/profile`)
      .then(r => r.json())
      .then(d => {
        const profile = d?.data ?? d;
        if (profile?.role) setUserRole(profile.role);
        if (profile?.id) setUserId(profile.id);
      })
      .catch(() => {
        setUserRole(localStorage.getItem('userRole') ?? '');
        const uid = localStorage.getItem('userId');
        if (uid) setUserId(Number(uid));
      });
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/stats`);
      const json = await res.json();
      const payload = json?.data ?? json;
      setArticleStats({
        totalVisible: payload?.totalVisible ?? payload?.total ?? 0,
        published: payload?.published ?? 0,
        draft: payload?.draft ?? 0,
        pending: payload?.pending ?? 0,
        rejected: payload?.rejected ?? 0,
        featured: payload?.featured ?? 0,
        topCategory: payload?.topCategory ?? null,
      });
    } catch {
      // KPI stats are supplementary.
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(pageSize));
      qs.set('sortBy', sortBy);
      qs.set('sortDir', sortDir);

      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (categoryFilter) qs.set('category', categoryFilter);
      if (featuredFilter) qs.set('isFeatured', featuredFilter);
      if (statusFilter) qs.set('status', statusFilter);

      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/all?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error();
      const payload = json?.data ?? json;
      setArticles(payload.articles ?? []);
      if (payload.meta) setMeta(payload.meta);
    } catch {
      showToast('Lỗi tải danh sách bài viết', false);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir, debouncedSearch, categoryFilter, featuredFilter, statusFilter, showToast]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const selectedArticles = useMemo(
    () => articles.filter(article => selectedArticleIds.has(article.id)),
    [articles, selectedArticleIds]
  );
  const allCurrentPageSelected = articles.length > 0 && articles.every(article => selectedArticleIds.has(article.id));
  const someCurrentPageSelected = articles.some(article => selectedArticleIds.has(article.id));

  useEffect(() => {
    const currentArticleIds = new Set(articles.map(article => article.id));
    setSelectedArticleIds(current => {
      const next = new Set([...current].filter(id => currentArticleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [articles]);

  const toggleSelectedArticle = useCallback((articleId: number) => {
    setSelectedArticleIds(current => {
      const next = new Set(current);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  }, []);

  const toggleCurrentPageSelection = useCallback(() => {
    setSelectedArticleIds(current => {
      const next = new Set(current);
      const allSelected = articles.length > 0 && articles.every(article => next.has(article.id));
      if (allSelected) {
        articles.forEach(article => next.delete(article.id));
      } else {
        articles.forEach(article => next.add(article.id));
      }
      return next;
    });
  }, [articles]);

  const clearArticleSelection = useCallback(() => {
    setSelectedArticleIds(new Set());
  }, []);

  const fetchTrash = useCallback(async () => {
    if (!isAdmin) return;
    setTrashLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(trashPage));
      qs.set('limit', '10');
      if (trashSearch) qs.set('search', trashSearch);
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/trash?${qs}`);
      const json = await res.json();
      if (!res.ok) {
        const message = json?.message;
        throw new Error(Array.isArray(message) ? message.join(', ') : String(message ?? 'Không tải được thùng rác'));
      }
      const payload = json?.data ?? json;
      setTrashArticles(payload.articles ?? []);
      setTrashMeta(payload.meta ?? { totalItems: 0, totalPages: 1, currentPage: 1 });
      setTrashCount(payload.meta?.totalItems ?? 0);
    } catch (error) {
      console.error('[ArticlePage] fetchTrash error:', error);
      showToast('Không tải được thùng rác bài viết', false);
      setTrashArticles([]);
      setTrashMeta({ totalItems: 0, totalPages: 1, currentPage: 1 });
      setTrashCount(0);
    } finally {
      setTrashLoading(false);
    }
  }, [isAdmin, trashPage, trashSearch, showToast]);

  useEffect(() => { if (showTrash) fetchTrash(); }, [showTrash, fetchTrash]);

  const handleBulkAction = useCallback(async (action: ArticleBulkAction, options?: ArticleBulkActionOptions) => {
    const ids = [...selectedArticleIds];
    if (ids.length === 0) return;
    if (action === 'category' && !options?.category) {
      showToast('Vui lòng chọn danh mục cần đổi', false);
      return;
    }

    const actionLabels: Record<ArticleBulkAction, string> = {
      publish: 'xuất bản',
      draft: 'chuyển về bản nháp',
      trash: 'đưa vào thùng rác',
      feature: 'gắn nổi bật',
      unfeature: 'bỏ nổi bật',
      category: 'đổi danh mục',
      submit: 'gửi duyệt',
    };

    if (!options?.skipConfirm && (action === 'trash' || action === 'draft' || action === 'publish')) {
      const confirmed = window.confirm(`Xác nhận ${actionLabels[action]} ${ids.length} bài viết đã chọn?`);
      if (!confirmed) return;
    }

    setIsBulkActionLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, category: options?.category }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = json?.message;
        throw new Error(Array.isArray(message) ? message.join(', ') : String(message ?? 'Thao tác hàng loạt thất bại'));
      }

      const payload = json?.data ?? json;
      const updated = Number(payload?.updated ?? 0);
      const requested = Number(payload?.requested ?? ids.length);
      const skipped = Number(payload?.skipped ?? Math.max(requested - updated, 0));
      showToast(
        skipped > 0
          ? `Đã ${actionLabels[action]} ${updated}/${requested} bài viết. ${skipped} bài không đủ điều kiện.`
          : `Đã ${actionLabels[action]} ${updated} bài viết.`
      );
      clearArticleSelection();
      await Promise.all([fetchArticles(), fetchStats(), fetchTrash()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Thao tác hàng loạt thất bại', false);
    } finally {
      setIsBulkActionLoading(false);
    }
  }, [clearArticleSelection, fetchArticles, fetchStats, fetchTrash, selectedArticleIds, showToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast(`Đã chuyển "${deleteTarget.title}" vào thùng rác ♻️`);
      setDeleteTarget(null);
      fetchArticles();
      fetchStats();
      fetchTrash();
    } catch {
      showToast('Xóa bài viết thất bại', false);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, fetchArticles, fetchStats, fetchTrash, showToast]);

  const refreshArticleData = useCallback(async () => {
    if (showTrash) {
      await Promise.all([fetchTrash(), fetchStats()]);
      return;
    }
    await Promise.all([fetchArticles(), fetchStats()]);
  }, [fetchArticles, fetchStats, fetchTrash, showTrash]);

  useAdminAutoRefresh({
    intervalMs: 90 * 1000,
    pause: Boolean(
      drawerMode || deleteTarget || hardDeleteTarget || reviewTarget || submitTarget ||
      isDeleting || isHardDeleting || isRestoring || isReviewing || isSubmitting
      || isBulkActionLoading
    ),
    onRefresh: refreshArticleData,
  });

  const handleRestore = useCallback(async (id: number, title: string) => {
    setIsRestoring(id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/${id}/restore`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      showToast(`Đã khôi phục "${title}"`);
      fetchTrash();
      fetchArticles();
      fetchStats();
    } catch {
      showToast('Khôi phục thất bại', false);
    } finally {
      setIsRestoring(null);
    }
  }, [fetchArticles, fetchStats, fetchTrash, showToast]);

  const handleHardDelete = useCallback(async () => {
    if (!hardDeleteTarget) return;
    setIsHardDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/${hardDeleteTarget.id}/hard-delete`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast(`Đã xóa vĩnh viễn "${hardDeleteTarget.title}"`);
      setHardDeleteTarget(null);
      fetchTrash();
    } catch {
      showToast('Xóa vĩnh viễn thất bại', false);
    } finally {
      setIsHardDeleting(false);
    }
  }, [fetchTrash, hardDeleteTarget, showToast]);

  const handleToggleFeatured = useCallback(async (article: Article) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/${article.id}/toggle-featured`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, isFeatured: !a.isFeatured } : a));
      fetchStats();
      showToast(article.isFeatured ? 'Đã bỏ nổi bật' : '⭐ Đã đặt làm nổi bật');
    } catch {
      showToast('Thao tác thất bại', false);
    }
  }, [fetchStats, showToast]);

  const handleSubmitForReview = useCallback(async (id: number) => {
    setIsSubmitting(id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/${id}/submit`, { method: 'POST' });
      if (!res.ok) throw new Error();
      showToast('Đã gửi bài viết để Admin duyệt!');
      setSubmitTarget(null);
      fetchArticles();
      fetchStats();
    } catch {
      showToast('Gửi duyệt thất bại', false);
    } finally {
      setIsSubmitting(null);
    }
  }, [fetchArticles, fetchStats, showToast]);

  const handleReview = useCallback(async (action: ArticleReviewAction) => {
    if (!reviewTarget) return;
    if (action === 'reject' && !rejectNote.trim()) {
      showToast('Vui lòng nhập lý do từ chối', false);
      return;
    }
    setIsReviewing(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/${reviewTarget.article.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: rejectNote }),
      });
      if (!res.ok) throw new Error();
      showToast(action === 'approve' ? 'Đã duyệt bài viết!' : 'Đã từ chối bài viết.');
      setReviewTarget(null);
      setRejectNote('');
      fetchArticles();
      fetchStats();
    } catch {
      showToast('Thao tác thất bại', false);
    } finally {
      setIsReviewing(false);
    }
  }, [fetchArticles, fetchStats, rejectNote, reviewTarget, showToast]);

  const hasFilter = !!(search || categoryFilter || featuredFilter || statusFilter);

  const resetFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setCategoryFilter('');
    setFeaturedFilter('');
    setStatusFilter('');
    setPage(1);
  }, []);

  const filterByStatus = useCallback((status: ArticleStatus) => {
    setFeaturedFilter('');
    setStatusFilter(current => current === status ? '' : status);
    setPage(1);
  }, []);

  const viewWorkflowStatus = useCallback((status: ArticleStatus) => {
    setFeaturedFilter('');
    setStatusFilter(status);
    setPage(1);
  }, []);

  const filterFeatured = useCallback(() => {
    setStatusFilter('');
    setFeaturedFilter(current => current === 'true' ? '' : 'true');
    setPage(1);
  }, []);

  const openEdit = useCallback((article: Article) => {
    setEditTarget(article);
    setDrawerMode('edit');
  }, []);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setDrawerMode('create');
  }, []);

  const changeCategoryFilter = useCallback((value: string) => {
    setCategoryFilter(value);
    setPage(1);
  }, []);

  const changeFeaturedFilter = useCallback((value: string) => {
    setFeaturedFilter(value);
    setPage(1);
  }, []);

  const changeStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const changeSort = useCallback((key: ArticleSortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir(key === 'title' || key === 'author' || key === 'category' ? 'asc' : 'desc');
    }
    setPage(1);
  }, [sortBy, sortDir]);

  const toggleTrashPanel = useCallback(() => {
    setShowTrash(value => !value);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerMode(null);
    setEditTarget(null);
  }, []);

  const handleDrawerSuccess = useCallback((msg: string) => {
    showToast(msg);
    fetchArticles();
    fetchStats();
  }, [fetchArticles, fetchStats, showToast]);

  const cancelReview = useCallback(() => {
    setReviewTarget(null);
    setRejectNote('');
  }, []);

  const changeTrashSearch = useCallback((value: string) => {
    setTrashSearch(value);
    setTrashPage(1);
  }, []);

  const topCategoryCfg = articleStats.topCategory ? getCatCfg(articleStats.topCategory.category) : null;
  const topCategorySummary = topCategoryCfg && articleStats.topCategory
    ? { ...topCategoryCfg, count: articleStats.topCategory.count }
    : null;

  const kpiCards = buildArticleKpiCards({
    isAdmin,
    hasFilter,
    articleStats,
    statusFilter,
    featuredFilter,
    onResetFilters: resetFilters,
    onFilterByStatus: filterByStatus,
    onFilterFeatured: filterFeatured,
  });

  return {
    articles,
    meta,
    isLoading,
    search,
    categoryFilter,
    featuredFilter,
    statusFilter,
    viewMode,
    pageSize,
    sortBy,
    sortDir,
    userRole,
    userId,
    isAdmin,
    canWrite,
    articleStats,
    drawerMode,
    editTarget,
    deleteTarget,
    isDeleting,
    toast,
    showTrash,
    trashArticles,
    trashMeta,
    trashSearch,
    trashLoading,
    hardDeleteTarget,
    isHardDeleting,
    isRestoring,
    trashCount,
    reviewTarget,
    rejectNote,
    isReviewing,
    submitTarget,
    isSubmitting,
    selectedArticleIds,
    selectedArticles,
    allCurrentPageSelected,
    someCurrentPageSelected,
    isBulkActionLoading,
    hasFilter,
    topCategorySummary,
    kpiCards,
    setSearch,
    setViewMode,
    setPage,
    setReviewTarget,
    setSubmitTarget,
    setDeleteTarget,
    setShowTrash,
    setTrashPage,
    setHardDeleteTarget,
    setRejectNote,
    fetchArticles,
    openCreate,
    openEdit,
    handleToggleFeatured,
    handleSubmitForReview,
    handleReview,
    handleDelete,
    handleRestore,
    handleHardDelete,
    toggleSelectedArticle,
    toggleCurrentPageSelection,
    clearArticleSelection,
    handleBulkAction,
    resetFilters,
    viewWorkflowStatus,
    changeCategoryFilter,
    changeFeaturedFilter,
    changeStatusFilter,
    changePageSize,
    changeSort,
    toggleTrashPanel,
    closeDrawer,
    handleDrawerSuccess,
    cancelReview,
    changeTrashSearch,
  };
}

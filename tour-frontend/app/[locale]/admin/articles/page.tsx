'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import ArticleDrawer, { type Article } from '@/app/components/admin/ArticleDrawer';
import AdminPagination from '@/app/components/admin/AdminPagination';

// ─── Helpers ──────────────────────────────────────────────────────────────────
import { API_BASE_URL } from '@/app/lib/constants';

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
};

const CATEGORY_CFG: Record<string, { label: string; icon: string; color: string; badge: string }> = {
  GUIDES:      { label: 'Hướng dẫn',  icon: 'map',          color: 'text-blue-600',   badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  INSPIRATION: { label: 'Cảm hứng',   icon: 'auto_awesome', color: 'text-violet-600', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  CULTURE:     { label: 'Văn hóa',    icon: 'museum',       color: 'text-teal-600',   badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  GASTRONOMY:  { label: 'Ẩm thực',    icon: 'restaurant',   color: 'text-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
};
const getCatCfg = (cat: string) => CATEGORY_CFG[cat] ?? { label: cat, icon: 'article', color: 'text-on-surface-variant', badge: 'bg-surface-container text-on-surface-variant border-outline-variant/20' };

type ArticleStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
const STATUS_CFG: Record<ArticleStatus, { label: string; icon: string; cls: string }> = {
  DRAFT:          { label: 'Nháp',       icon: 'edit_note',       cls: 'bg-surface-container text-on-surface-variant' },
  PENDING_REVIEW: { label: 'Chờ duyệt', icon: 'pending_actions',  cls: 'bg-amber-100 text-amber-700' },
  PUBLISHED:      { label: 'Đã duyệt',  icon: 'check_circle',     cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:       { label: 'Từ chối',   icon: 'cancel',           cls: 'bg-red-100 text-red-700' },
};
const getStatusCfg = (s: string) => STATUS_CFG[s as ArticleStatus] ?? STATUS_CFG.DRAFT;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-outline-variant/8 animate-pulse">
      <td className="py-4 px-5"><div className="w-16 h-11 bg-surface-container-high rounded-lg" /></td>
      <td className="py-4 px-5"><div className="h-4 w-56 bg-surface-container-high rounded mb-2" /><div className="h-3 w-36 bg-surface-container rounded" /></td>
      <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded-full" /></td>
      <td className="py-4 px-5"><div className="h-3.5 w-24 bg-surface-container-high rounded" /></td>
      <td className="py-4 px-5"><div className="h-3.5 w-16 bg-surface-container-high rounded" /></td>
      <td className="py-4 px-5"><div className="h-6 w-16 bg-surface-container-high rounded-full" /></td>
      <td className="py-4 px-5 text-right"><div className="h-8 w-24 bg-surface-container-high rounded-lg ml-auto" /></td>
    </tr>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────
function DeleteDialog({ article, onConfirm, onCancel, isDeleting }: {
  article: Article;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-slide-up">
        <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-error text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
        </div>
        <h3 className="text-lg font-bold text-on-surface text-center mb-2">Xóa bài viết?</h3>
        <p className="text-sm text-on-surface-variant text-center leading-relaxed mb-1">Bạn sắp xóa vĩnh viễn bài viết</p>
        <p className="text-sm font-bold text-on-surface text-center mb-5 line-clamp-2">"{article.title}"</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors disabled:opacity-50 outline-none">
            Hủy bỏ
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-error text-on-error hover:bg-error/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-error">
            {isDeleting
              ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xóa…</>
              : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>Xóa ngay</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ArticleManagementPage() {
  // Data
  const [articles, setArticles] = useState<Article[]>([]);
  const [meta, setMeta] = useState({ totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Auth & workflow
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [reviewTarget, setReviewTarget] = useState<{ article: Article; action: 'approve' | 'reject' } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  // UI
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Article | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Trash
  const [showTrash, setShowTrash] = useState(false);
  const [trashArticles, setTrashArticles] = useState<any[]>([]);
  const [trashMeta, setTrashMeta] = useState({ totalItems: 0, totalPages: 1, currentPage: 1 });
  const [trashPage, setTrashPage] = useState(1);
  const [trashSearch, setTrashSearch] = useState('');
  const [trashLoading, setTrashLoading] = useState(false);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<any | null>(null);
  const [isHardDeleting, setIsHardDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState<number | null>(null);
  const [trashCount, setTrashCount] = useState(0);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch role từ API thay vì localStorage để tránh spoof qua DevTools
  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/auth/profile`)
      .then(r => r.json())
      .then(d => {
        const profile = d?.data ?? d;
        if (profile?.role) setUserRole(profile.role);
        if (profile?.id)   setUserId(profile.id);
      })
      .catch(() => {
        // Fallback nếu API lỗi
        setUserRole(localStorage.getItem('userRole') ?? '');
        const uid = localStorage.getItem('userId');
        if (uid) setUserId(Number(uid));
      });
  }, []);

  // Fetch KPI stats (pending + rejected)
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/stats`);
      const json = await res.json();
      setPendingCount(json?.pending ?? 0);
      setRejectedCount(json?.rejected ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(pageSize));

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
  }, [page, pageSize, debouncedSearch, categoryFilter, featuredFilter, statusFilter]);


  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast(`Đã chuyển "${deleteTarget.title}" vào thùng rác ♻️`);
      setDeleteTarget(null);
      fetchArticles();
      fetchStats();
      fetchTrash(); // cập nhật trash count
    } catch {
      showToast('Xóa bài viết thất bại', false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch trash
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
      const payload = json?.data ?? json;
      setTrashArticles(payload.articles ?? []);
      setTrashMeta(payload.meta ?? { totalItems: 0, totalPages: 1, currentPage: 1 });
      setTrashCount(payload.meta?.totalItems ?? 0);
    } catch { /* silent */ } finally {
      setTrashLoading(false);
    }
  }, [isAdmin, trashPage, trashSearch]);

  useEffect(() => { if (showTrash) fetchTrash(); }, [showTrash, fetchTrash]);

  const handleRestore = async (id: number, title: string) => {
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
  };

  const handleHardDelete = async () => {
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
  };

  const handleToggleFeatured = async (article: Article) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/${article.id}/toggle-featured`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, isFeatured: !a.isFeatured } : a));
      showToast(article.isFeatured ? 'Đã bỏ nổi bật' : '⭐ Đã đặt làm nổi bật');
    } catch {
      showToast('Thao tác thất bại', false);
    }
  };

  // Staff gửi duyệt
  const handleSubmitForReview = async (id: number) => {
    setIsSubmitting(id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/${id}/submit`, { method: 'POST' });
      if (!res.ok) throw new Error();
      showToast('Đã gửi bài viết để Admin duyệt!');
      fetchArticles();
    } catch {
      showToast('Gửi duyệt thất bại', false);
    } finally {
      setIsSubmitting(null);
    }
  };

  // Admin duyệt / từ chối
  const handleReview = async (action: 'approve' | 'reject') => {
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
  };

  const hasFilter = !!(search || categoryFilter || featuredFilter || statusFilter);
  const resetFilters = () => { setSearch(''); setCategoryFilter(''); setFeaturedFilter(''); setStatusFilter(''); setPage(1); };

  const openEdit = (article: Article) => { setEditTarget(article); setDrawerMode('edit'); };
  const openCreate = () => { setEditTarget(null); setDrawerMode('create'); };

  // Stats quick compute
  const totalFeatured = articles.filter(a => a.isFeatured).length;
  const categoryCounts = articles.reduce<Record<string, number>>((acc, a) => { acc[a.category] = (acc[a.category] ?? 0) + 1; return acc; }, {});
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto">
      <a href="#articles-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
        Nhảy đến bảng dữ liệu
      </a>

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface">Quản Lý Bài Viết</h1>
          <p className="text-on-surface-variant text-sm mt-1">Tạo và quản lý các bài viết, hướng dẫn du lịch cho khách hàng.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant/10">
            {(['list', 'grid'] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                aria-label={v === 'list' ? 'Xem dạng danh sách' : 'Xem dạng lưới'}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all outline-none ${viewMode === v ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: viewMode === v ? "'FILL' 1" : "'FILL' 0" }}>
                  {v === 'list' ? 'view_list' : 'grid_view'}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={fetchArticles}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors outline-none"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>Làm mới
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowTrash(v => !v)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors outline-none ${
                showTrash
                  ? 'bg-red-50 border-red-300 text-red-600'
                  : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Thùng rác
              {trashCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {trashCount}
                </span>
              )}
            </button>
          )}
          <button
            id="create-article-btn"
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined text-[18px]">post_add</span>Thêm bài viết
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className={`grid gap-4 mb-8 ${
        isAdmin ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 lg:grid-cols-5'
      }`}>
        {[
          { icon: 'article', label: 'Tổng bài viết', value: meta.totalItems, sub: 'bài viết trong hệ thống', gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50', ic: 'text-blue-600', onClick: null, activeColor: '' },
          { icon: 'star', label: 'Đang nổi bật', value: totalFeatured, sub: 'bài viết được ghim đầu', gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', ic: 'text-amber-600', onClick: null, activeColor: '' },
          { icon: topCategory ? getCatCfg(topCategory).icon : 'category', label: 'Danh mục phổ biến', value: topCategory ? getCatCfg(topCategory).label : '—', sub: topCategory ? `${categoryCounts[topCategory]} bài viết` : 'Chưa có dữ liệu', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', ic: 'text-violet-600', onClick: null, activeColor: '' },
          { icon: 'auto_stories', label: 'Trang hiện tại', value: `${meta.currentPage}/${meta.totalPages}`, sub: `${pageSize} bài/trang`, gradient: 'from-teal-400 to-cyan-600', bg: 'bg-teal-50', ic: 'text-teal-600', onClick: null, activeColor: '' },
          ...(isAdmin ? [{
            icon: 'pending_actions', label: 'Chờ duyệt',
            value: pendingCount, sub: 'bài viết chờ Admin',
            gradient: 'from-amber-400 to-orange-400',
            bg: pendingCount > 0 ? 'bg-amber-100' : 'bg-surface-container',
            ic: pendingCount > 0 ? 'text-amber-700' : 'text-on-surface-variant',
            onClick: () => { setStatusFilter(f => f === 'PENDING_REVIEW' ? '' : 'PENDING_REVIEW'); setPage(1); },
            activeColor: 'amber',
          }] : []),
          {
            icon: 'cancel', label: isAdmin ? 'Bị từ chối' : 'Bài bị từ chối',
            value: rejectedCount,
            sub: isAdmin ? 'bài viết từ chối' : 'bài cần chỉnh sửa lại',
            gradient: 'from-red-400 to-rose-500',
            bg: rejectedCount > 0 ? 'bg-red-50' : 'bg-surface-container',
            ic: rejectedCount > 0 ? 'text-red-600' : 'text-on-surface-variant',
            onClick: () => { setStatusFilter(f => f === 'REJECTED' ? '' : 'REJECTED'); setPage(1); },
            activeColor: 'red',
          },
        ].map(k => {
          const isActive = (
            (k.activeColor === 'amber' && statusFilter === 'PENDING_REVIEW') ||
            (k.activeColor === 'red'   && statusFilter === 'REJECTED')
          );
          const Tag = k.onClick ? 'button' : 'div';
          const borderCls = isActive
            ? k.activeColor === 'amber'
              ? 'border-amber-400 ring-2 ring-amber-300/50'
              : 'border-red-400 ring-2 ring-red-300/50'
            : 'border-outline-variant/10 hover:shadow-md hover:-translate-y-0.5';
          return (
            <Tag key={k.label}
              {...(k.onClick ? { onClick: k.onClick, type: 'button' as const } : {})}
              className={`relative bg-surface-container-lowest rounded-2xl p-5 border shadow-sm transition-all overflow-hidden group text-left ${borderCls} ${k.onClick ? 'cursor-pointer' : ''}`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-gradient-to-br ${k.gradient} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity`} />
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center mb-4`}>
                <span className={`material-symbols-outlined text-xl ${k.ic}`} style={{ fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
              </div>
              <p className="text-2xl font-extrabold text-on-surface leading-tight truncate">{k.value}</p>
              <p className="text-xs font-medium text-on-surface-variant mt-1">{k.label}</p>
              {isActive
                ? <p className={`text-[10px] font-semibold mt-0.5 ${k.activeColor === 'red' ? 'text-red-500' : 'text-amber-600'}`}>Đang lọc • Nhấn để bỏ</p>
                : <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{k.sub}</p>
              }
            </Tag>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[220px] relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">search</span>
            <label htmlFor="art-search" className="sr-only">Tìm kiếm bài viết</label>
            <input
              id="art-search"
              type="search"
              placeholder="Tìm tiêu đề, tác giả…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
            />
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <label htmlFor="art-cat" className="sr-only">Lọc danh mục</label>
            <select id="art-cat" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
              <option value="">Tất cả danh mục</option>
              <option value="GUIDES">Hướng dẫn</option>
              <option value="INSPIRATION">Cảm hứng</option>
              <option value="CULTURE">Văn hóa</option>
              <option value="GASTRONOMY">Ẩm thực</option>
            </select>

            <label htmlFor="art-feat" className="sr-only">Lọc nổi bật</label>
            <select id="art-feat" value={featuredFilter} onChange={e => { setFeaturedFilter(e.target.value); setPage(1); }}
              className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
              <option value="">Tất cả</option>
              <option value="true">⭐ Bài nổi bật</option>
              <option value="false">Bài thường</option>
            </select>

            {isAdmin && (
              <>
                <label htmlFor="art-status" className="sr-only">Lọc trạng thái</label>
                <select id="art-status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
                  <option value="">Tất cả trạng thái</option>
                  <option value="DRAFT">Nháp</option>
                  <option value="PENDING_REVIEW">Chờ duyệt</option>
                  <option value="PUBLISHED">Đã duyệt</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
              </>
            )}

            {hasFilter && (
              <button onClick={resetFilters}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-error border border-error/30 hover:bg-error/5 transition-colors outline-none">
                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>Xóa bộ lọc
              </button>
            )}
          </div>
          {!isLoading && (
            <span className="ml-auto text-xs text-on-surface-variant whitespace-nowrap font-medium pl-2">
              {meta.totalItems} bài viết
            </span>
          )}
        </div>
      </div>

      {/* ══════════════════ TABLE VIEW ══════════════════ */}
      {viewMode === 'list' && (
        <div id="articles-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                  {['', 'Bài viết', 'Danh mục', 'Tác giả', 'Thời gian', 'Trạng thái', 'Nổi bật', 'Thao tác'].map((h, i) => (
                    <th key={h || i} className={`py-3.5 px-5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${i === 7 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/8">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : articles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                          <span className="material-symbols-outlined text-3xl text-outline">article</span>
                        </div>
                        <p className="font-bold text-on-surface">Không tìm thấy bài viết nào</p>
                        <p className="text-sm text-on-surface-variant mt-1">
                          {hasFilter ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.' : 'Hãy tạo bài viết đầu tiên của bạn!'}
                        </p>
                        {!hasFilter && (
                          <button onClick={openCreate}
                            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-colors outline-none">
                            <span className="material-symbols-outlined text-[16px]">post_add</span>Tạo bài viết đầu tiên
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  articles.map(a => {
                    const cc = getCatCfg(a.category);
                    return (
                      <tr key={a.id} className="hover:bg-primary/[0.025] transition-colors group cursor-pointer" onClick={() => openEdit(a)}>
                        <td className="py-3.5 px-5" onClick={e => e.stopPropagation()}>
                          <div className="w-16 h-11 rounded-lg overflow-hidden bg-surface-container shrink-0">
                            <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" loading="lazy"
                              onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/64x44/e2e8f0/94a3b8?text=No+Img'; }} />
                          </div>
                        </td>
                        <td className="py-3.5 px-5 max-w-[280px]">
                          <p className="font-semibold text-on-surface text-sm line-clamp-1 group-hover:text-primary transition-colors">{a.title}</p>
                          <p className="text-xs text-on-surface-variant/60 line-clamp-1 mt-0.5">{a.excerpt}</p>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${cc.badge}`}>
                            <span className={`material-symbols-outlined text-[12px] ${cc.color}`}>{cc.icon}</span>
                            {cc.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap">{a.author}</td>
                        <td className="py-3.5 px-5 text-sm text-on-surface-variant whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            {a.readTime} phút · {fmtDate(a.publishedAt)}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {(() => {
                            const sc = getStatusCfg((a as any).status ?? 'PUBLISHED');
                            const rn = (a as any).reviewNote;
                            return (
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${sc.cls}`}>
                                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{sc.icon}</span>
                                  {sc.label}
                                </span>
                                {(a as any).status === 'REJECTED' && rn && (
                                  <p className="text-[10px] text-error font-medium max-w-[140px] leading-tight cursor-help" title={rn}>
                                    ↳ {rn.length > 50 ? rn.slice(0, 50) + '…' : rn}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-5" onClick={e => e.stopPropagation()}>
                          {(a as any).status === 'PUBLISHED' ? (
                            <div className="relative group/tip inline-block">
                              <button onClick={() => handleToggleFeatured(a)} aria-label="Toggle nổi bật"
                                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors outline-none ${a.isFeatured ? 'text-amber-500 hover:bg-amber-50' : 'text-on-surface-variant/30 hover:bg-amber-50 hover:text-amber-400'}`}>
                                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: a.isFeatured ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                              </button>
                              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                                {a.isFeatured ? 'Bỏ nổi bật' : 'Đặt nổi bật'}<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                              </span>
                            </div>
                          ) : <span className="text-xs text-on-surface-variant/40">—</span>}
                        </td>
                        <td className="py-3.5 px-5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {/* Xem — chỉ PUBLISHED */}
                            {(a as any).status === 'PUBLISHED' && (
                              <div className="relative group/tip">
                                <button onClick={() => window.open(`/vi/journal/${(a as any).slug}`, '_blank')} aria-label="Xem trang khách"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors outline-none">
                                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                </button>
                                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Xem<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                              </div>
                            )}
                            {/* Duyệt / Từ chối — Admin khi PENDING_REVIEW */}
                            {isAdmin && (a as any).status === 'PENDING_REVIEW' && (<>
                              <div className="relative group/tip">
                                <button onClick={() => setReviewTarget({ article: a, action: 'approve' })} aria-label="Duyệt"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors outline-none">
                                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                </button>
                                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Duyệt<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-emerald-700" /></span>
                              </div>
                              <div className="relative group/tip">
                                <button onClick={() => setReviewTarget({ article: a, action: 'reject' })} aria-label="Từ chối"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors outline-none">
                                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                                </button>
                                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-error px-2 py-1 text-[10px] font-medium text-on-error opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Từ chối<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-error" /></span>
                              </div>
                            </>)}
                            {/* Sửa — Admin (PENDING) | Staff owner (DRAFT/REJECTED) */}
                            {(isAdmin && (a as any).status === 'PENDING_REVIEW') ||
                             (!isAdmin && ((a as any).status === 'DRAFT' || (a as any).status === 'REJECTED') && (a as any).createdById === userId)
                              ? (
                              <div className="relative group/tip">
                                <button onClick={() => openEdit(a)} aria-label="Chỉnh sửa"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors outline-none">
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Chỉnh sửa<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                              </div>
                            ) : null}
                            {/* Gửi duyệt — Staff owner khi DRAFT hoặc REJECTED */}
                            {!isAdmin && ((a as any).status === 'DRAFT' || (a as any).status === 'REJECTED') && (a as any).createdById === userId && (
                              <div className="relative group/tip">
                                <button onClick={() => handleSubmitForReview(a.id)} disabled={isSubmitting === a.id} aria-label="Gửi duyệt"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-amber-500/10 hover:text-amber-600 transition-colors outline-none disabled:opacity-50">
                                  {isSubmitting === a.id
                                    ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                    : <span className="material-symbols-outlined text-[18px]">send</span>}
                                </button>
                                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-amber-700 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Gửi duyệt<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-amber-700" /></span>
                              </div>
                            )}
                            {/* Xóa — chỉ Admin */}
                            {isAdmin && (
                              <div className="relative group/tip">
                                <button onClick={() => setDeleteTarget(a)} aria-label="Xóa bài viết"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors outline-none">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-error px-2 py-1 text-[10px] font-medium text-on-error opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Xóa<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-error" /></span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="py-3 px-6 border-t border-outline-variant/10 bg-surface-container-lowest">
            <AdminPagination
              currentPage={meta.currentPage}
              totalPages={meta.totalPages}
              totalItems={meta.totalItems}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              itemLabel="bài viết"
            />
          </div>
        </div>
      )}


      {/* ══════════════════ GRID VIEW ══════════════════ */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 animate-pulse">
                <div className="aspect-video bg-surface-container-high" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-surface-container-high rounded w-3/4" />
                  <div className="h-3 bg-surface-container rounded w-full" />
                  <div className="h-3 bg-surface-container rounded w-2/3" />
                </div>
              </div>
            ))
          ) : articles.length === 0 ? (
            <div className="col-span-full py-24 text-center">
              <p className="font-bold text-on-surface">Không có bài viết nào</p>
              <button onClick={openCreate} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold mx-auto hover:bg-primary/90 outline-none">
                <span className="material-symbols-outlined text-[16px]">post_add</span>Tạo bài viết
              </button>
            </div>
          ) : (
            articles.map(a => {
              const cc = getCatCfg(a.category);
              return (
                <article key={a.id} className="flex flex-col group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
                  onClick={() => openEdit(a)}>
                  {/* Cover */}
                  <div className="relative aspect-video overflow-hidden bg-surface-container">
                    <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x225/e2e8f0/94a3b8?text=No+Image'; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Category badge */}
                    <span className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md ${cc.badge}`}>
                      {cc.label}
                    </span>
                    {/* Featured star */}
                    {a.isFeatured && (
                      <span className="absolute top-3 right-3 text-amber-400 drop-shadow">
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      </span>
                    )}
                    {/* Hover actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(a)} aria-label="Chỉnh sửa"
                        className="w-10 h-10 bg-white/90 backdrop-blur-sm text-primary rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-md">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleToggleFeatured(a)} aria-label="Toggle nổi bật"
                        className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-md ${a.isFeatured ? 'bg-amber-400/90 text-white hover:bg-amber-400' : 'bg-white/90 text-amber-400 hover:bg-white'}`}>
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      </button>
                      <button onClick={() => setDeleteTarget(a)} aria-label="Xóa"
                        className="w-10 h-10 bg-error/90 backdrop-blur-sm text-on-error rounded-full flex items-center justify-center hover:bg-error hover:scale-110 transition-all shadow-md">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">{a.title}</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 flex-1">{a.excerpt}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/10 text-[11px] text-on-surface-variant">
                      <span className="font-medium">{a.author}</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>{a.readTime} phút
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* ── Drawer (Create/Edit) ── */}
      {drawerMode && (
        <ArticleDrawer
          mode={drawerMode}
          article={editTarget}
          onClose={() => { setDrawerMode(null); setEditTarget(null); }}
          onSuccess={msg => { showToast(msg); fetchArticles(); }}
        />
      )}

      {/* ── Review Modal (Duyệt / Từ chối) ── */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setReviewTarget(null); setRejectNote(''); }} />
          <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-slide-up">
            {reviewTarget.action === 'approve' ? (
              <>
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-emerald-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface text-center mb-2">Duyệt bài viết?</h3>
                <p className="text-sm text-on-surface-variant text-center mb-1">Bài viết sẽ được đăng lên trang khách ngay lập tức.</p>
                <p className="text-sm font-bold text-on-surface text-center mb-6 line-clamp-2">“{reviewTarget.article.title}”</p>
                <div className="flex gap-3">
                  <button onClick={() => { setReviewTarget(null); setRejectNote(''); }} disabled={isReviewing}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors disabled:opacity-50 outline-none">
                    Hủy
                  </button>
                  <button onClick={() => handleReview('approve')} disabled={isReviewing}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none">
                    {isReviewing
                      ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang duyệt…</>
                      : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>Xác nhận duyệt</>}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-error text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface text-center mb-2">Từ chối bài viết?</h3>
                <p className="text-sm text-on-surface-variant text-center mb-4 line-clamp-2">“{reviewTarget.article.title}”</p>
                <div className="mb-4">
                  <label htmlFor="reject-note" className="block text-sm font-semibold text-on-surface mb-2">
                    Lý do từ chối <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="reject-note"
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="Nhập lý do để Staff biết cần chỉnh sửa gì…"
                    rows={4}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-error outline-none transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setReviewTarget(null); setRejectNote(''); }} disabled={isReviewing}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors disabled:opacity-50 outline-none">
                    Hủy
                  </button>
                  <button onClick={() => handleReview('reject')} disabled={isReviewing || !rejectNote.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-error text-on-error hover:bg-error/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 outline-none">
                    {isReviewing
                      ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xử lý…</>
                      : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>Xác nhận từ chối</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Dialog ── */}
      {deleteTarget && (
        <DeleteDialog
          article={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* ── Trash Panel ── */}
      {showTrash && isAdmin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTrash(false)} />
          <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col bg-surface rounded-3xl shadow-2xl overflow-hidden animate-fade-slide-up">
            {/* Header */}
            <div className="flex items-center gap-4 px-7 py-5 border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-on-surface">Thùng Rác</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">{trashMeta.totalItems} bài viết đã xóa</p>
              </div>
              {/* Search */}
              <div className="relative w-52">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base pointer-events-none">search</span>
                <input
                  type="search" placeholder="Tìm bài viết..."
                  value={trashSearch}
                  onChange={e => { setTrashSearch(e.target.value); setTrashPage(1); }}
                  className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <button onClick={() => setShowTrash(false)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {trashLoading ? (
                <div className="flex items-center justify-center py-20">
                  <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
                </div>
              ) : trashArticles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <span className="material-symbols-outlined text-6xl text-outline-variant/50">delete_sweep</span>
                  <p className="text-on-surface-variant font-medium">Thùng rác trống</p>
                  <p className="text-sm text-on-surface-variant/60">Không có bài viết nào trong thùng rác</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/8">
                  {trashArticles.map(a => (
                    <div key={a.id} className="flex items-center gap-4 px-7 py-4 hover:bg-surface-container/50 transition-colors">
                      {/* Thumbnail */}
                      <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                        {a.imageUrl
                          ? <img src={a.imageUrl} alt="" className="w-full h-full object-cover opacity-60" />
                          : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-sm text-outline">image</span></div>
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{a.title}</p>
                        <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                          {a.author} • Xóa {a.deletedAt ? new Date(a.deletedAt).toLocaleDateString('vi-VN') : ''}
                        </p>
                      </div>
                      {/* Status badge */}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/10 text-on-surface-variant font-medium shrink-0">
                        {a.status === 'DRAFT' ? 'Nháp' : a.status === 'REJECTED' ? 'Từ chối' : a.status === 'PENDING_REVIEW' ? 'Chờ duyệt' : 'Xuất bản'}
                      </span>
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRestore(a.id, a.title)}
                          disabled={isRestoring === a.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50 outline-none"
                        >
                          {isRestoring === a.id
                            ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                            : <span className="material-symbols-outlined text-sm">restore_from_trash</span>}
                          Khôi phục
                        </button>
                        <button
                          onClick={() => setHardDeleteTarget(a)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors outline-none"
                        >
                          <span className="material-symbols-outlined text-sm">delete_forever</span>
                          Xóa vĩnh viễn
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer pagination */}
            {trashMeta.totalPages > 1 && (
              <div className="shrink-0 flex items-center justify-between px-7 py-4 border-t border-outline-variant/10 bg-surface-container-lowest">
                <p className="text-xs text-on-surface-variant">{trashMeta.totalItems} bài viết</p>
                <div className="flex gap-2">
                  {Array.from({ length: trashMeta.totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setTrashPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        p === trashMeta.currentPage ? 'bg-primary text-on-primary' : 'hover:bg-surface-container text-on-surface-variant'
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Hard Delete Confirm Dialog ── */}
      {hardDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHardDeleteTarget(null)} />
          <div className="relative bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
              </div>
              <div>
                <h3 className="font-bold text-on-surface text-sm">Xóa vĩnh viễn?</h3>
                <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">&ldquo;{hardDeleteTarget.title}&rdquo;</p>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant mb-5">
              Hành động này <strong className="text-error">không thể hoàn tác</strong>. Bài viết sẽ bị xóa hoàn toàn khỏi hệ thống.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setHardDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
                Hủy
              </button>
              <button onClick={handleHardDelete} disabled={isHardDeleting}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error text-sm font-bold hover:bg-error/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {isHardDeleting
                  ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xóa…</>
                  : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>Xác nhận xóa</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.msg}</div>
      {toast && (
        <div role="status"
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.ok ? 'bg-tertiary text-on-tertiary' : 'bg-error text-on-error'}`}>
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            {toast.ok ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}
    </main>
  );
}

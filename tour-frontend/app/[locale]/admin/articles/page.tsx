'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import ArticleDrawer, { type Article } from '@/app/components/admin/ArticleDrawer';
import AdminPagination from '@/app/components/admin/AdminPagination';


// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = 'http://localhost:3000';

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

const CATEGORY_CFG: Record<string, { label: string; icon: string; color: string; badge: string }> = {
  GUIDES:      { label: 'Hướng dẫn',  icon: 'map',         color: 'text-blue-600',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  INSPIRATION: { label: 'Cảm hứng',   icon: 'auto_awesome', color: 'text-violet-600',  badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  CULTURE:     { label: 'Văn hóa',    icon: 'museum',       color: 'text-teal-600',    badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  GASTRONOMY:  { label: 'Ẩm thực',    icon: 'restaurant',   color: 'text-orange-500',  badge: 'bg-orange-50 text-orange-700 border-orange-200' },
};

const getCatCfg = (cat: string) => CATEGORY_CFG[cat] ?? { label: cat, icon: 'article', color: 'text-on-surface-variant', badge: 'bg-surface-container text-on-surface-variant border-outline-variant/20' };

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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);


  // UI
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Article | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

  // Fetch
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(pageSize));

      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (categoryFilter) qs.set('category', categoryFilter);
      if (featuredFilter) qs.set('isFeatured', featuredFilter);

      const res = await fetchWithAuth(`${API}/article/admin/all?${qs}`);
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
  }, [page, pageSize, debouncedSearch, categoryFilter, featuredFilter]);


  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`${API}/article/admin/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast(`Đã xóa bài viết "${deleteTarget.title}"`);
      setDeleteTarget(null);
      fetchArticles();
    } catch {
      showToast('Xóa bài viết thất bại', false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleFeatured = async (article: Article) => {
    try {
      const res = await fetchWithAuth(`${API}/article/admin/${article.id}/toggle-featured`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, isFeatured: !a.isFeatured } : a));
      showToast(article.isFeatured ? 'Đã bỏ nổi bật' : '⭐ Đã đặt làm nổi bật');
    } catch {
      showToast('Thao tác thất bại', false);
    }
  };

  const hasFilter = !!(search || categoryFilter || featuredFilter);
  const resetFilters = () => { setSearch(''); setCategoryFilter(''); setFeaturedFilter(''); setPage(1); };

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: 'article', label: 'Tổng bài viết', value: meta.totalItems, sub: 'bài viết trong hệ thống', gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50', ic: 'text-blue-600' },
          { icon: 'star', label: 'Đang nổi bật', value: totalFeatured, sub: 'bài viết được ghim đầu', gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', ic: 'text-amber-600' },
          { icon: topCategory ? (getCatCfg(topCategory).icon) : 'category', label: 'Danh mục phổ biến', value: topCategory ? getCatCfg(topCategory).label : '—', sub: topCategory ? `${categoryCounts[topCategory]} bài viết` : 'Chưa có dữ liệu', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', ic: 'text-violet-600' },
          { icon: 'auto_stories', label: 'Trang hiện tại', value: `${meta.currentPage}/${meta.totalPages}`, sub: `${pageSize} bài/trang`, gradient: 'from-teal-400 to-cyan-600', bg: 'bg-teal-50', ic: 'text-teal-600' },

        ].map(k => (
          <div key={k.label} className="relative bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-gradient-to-br ${k.gradient} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity`} />
            <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center mb-4`}>
              <span className={`material-symbols-outlined text-xl ${k.ic}`} style={{ fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
            </div>
            <p className="text-2xl font-extrabold text-on-surface leading-tight truncate">{k.value}</p>
            <p className="text-xs font-medium text-on-surface-variant mt-1">{k.label}</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{k.sub}</p>
          </div>
        ))}
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
                  {['', 'Bài viết', 'Danh mục', 'Tác giả', 'Thời gian', 'Nổi bật', 'Thao tác'].map((h, i) => (
                    <th key={h || i} className={`py-3.5 px-5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${i === 6 ? 'text-right' : ''}`}>{h}</th>
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
                        <td className="py-3.5 px-5" onClick={e => e.stopPropagation()}>
                          <div className="relative group/tip inline-block">
                            <button
                              onClick={() => handleToggleFeatured(a)}
                              aria-label="Toggle nổi bật"
                              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors outline-none ${a.isFeatured ? 'text-amber-500 hover:bg-amber-50' : 'text-on-surface-variant/30 hover:bg-amber-50 hover:text-amber-400'}`}
                            >
                              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: a.isFeatured ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                              {a.isFeatured ? 'Bỏ nổi bật' : 'Đặt nổi bật'}
                              <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit */}
                            <div className="relative group/tip">
                              <button onClick={() => openEdit(a)} aria-label="Chỉnh sửa"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                                Chỉnh sửa<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                              </span>
                            </div>
                            {/* Delete */}
                            <div className="relative group/tip">
                              <button onClick={() => setDeleteTarget(a)} aria-label="Xóa bài viết"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors outline-none focus-visible:ring-2 focus-visible:ring-error">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-error px-2 py-1 text-[10px] font-medium text-on-error opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                                Xóa bài viết<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-error" />
                              </span>
                            </div>
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

      {/* ── Delete Dialog ── */}
      {deleteTarget && (
        <DeleteDialog
          article={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
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

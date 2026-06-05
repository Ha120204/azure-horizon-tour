'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { Article, ArticleDrawerProps, ArticleForm, SaveAction } from './articleDrawer/types';
import { EMPTY_FORM, CATEGORIES, QUILL_MODULES, QUILL_FORMATS, getErrorMessage, articleToForm } from './articleDrawer/types';

// Re-export Article so consumers can import it from this file directly
export type { Article } from './articleDrawer/types';

type DrawerArticleStatus = NonNullable<Article['status']>;

const DRAWER_STATUS_COPY: Record<DrawerArticleStatus, {
  label: string;
  icon: string;
  className: string;
  adminHint: string;
  staffHint: string;
}> = {
  DRAFT: {
    label: 'Bản nháp',
    icon: 'edit_note',
    className: 'bg-surface-container text-on-surface-variant',
    adminHint: 'Bài chưa public. Có thể tiếp tục chỉnh sửa hoặc xuất bản khi đủ nội dung.',
    staffHint: 'Bản nháp chỉ lưu nội bộ. Hoàn thiện nội dung rồi gửi Admin duyệt.',
  },
  PENDING_REVIEW: {
    label: 'Chờ duyệt',
    icon: 'pending_actions',
    className: 'bg-amber-100 text-amber-700',
    adminHint: 'Bài đang chờ duyệt. Kiểm tra nội dung rồi duyệt hoặc từ chối ở danh sách.',
    staffHint: 'Bài đã gửi Admin. Bạn nên chờ phản hồi trước khi chỉnh sửa tiếp.',
  },
  PUBLISHED: {
    label: 'Đã xuất bản',
    icon: 'check_circle',
    className: 'bg-emerald-100 text-emerald-700',
    adminHint: 'Bài đang hiển thị với khách. Lưu thay đổi sẽ cập nhật nội dung public.',
    staffHint: 'Bài đã được duyệt và đang hiển thị với khách.',
  },
  REJECTED: {
    label: 'Bị từ chối',
    icon: 'cancel',
    className: 'bg-red-100 text-red-700',
    adminHint: 'Bài đã được trả về. Có thể chỉnh sửa hoặc xuất bản lại nếu cần.',
    staffHint: 'Xem ghi chú từ Admin, chỉnh sửa nội dung rồi gửi duyệt lại.',
  },
};

function normalizeSeoSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}


// Dynamic import - tránh SSR error
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center min-h-[300px]">
      <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
    </div>
  ),
});

import 'react-quill-new/dist/quill.snow.css';


export default function ArticleDrawer({ mode, article, userRole = '', onClose, onSuccess }: ArticleDrawerProps) {
  const isEdit = mode === 'edit';
  const isStaff = userRole === 'STAFF';
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [submitAction, setSubmitAction] = useState<SaveAction | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [imgError, setImgError]     = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // ── Load bài viết khi edit ──
  useEffect(() => {
    if (isEdit && article) {
      setForm(articleToForm(article));
      setErrors({});
      setImgError(false);
      setIsSlugEdited(true);
      setIsLoadingContent(true);
      fetchWithAuth(`${API_BASE_URL}/article/admin/${article.id}`)
        .then(async r => {
          const json = await r.json();
          if (!r.ok) {
            const message = json?.message;
            throw new Error(Array.isArray(message) ? message.join(', ') : String(message ?? 'Không tải được bài viết'));
          }
          return json;
        })
        .then(json => {
          const d = json?.data ?? json;
          setForm(articleToForm({ ...article, ...d }));
        })
        .catch((err: unknown) => {
          setErrors(p => ({
            ...p,
            _server: getErrorMessage(err, 'Không tải được nội dung chi tiết. Đang hiển thị dữ liệu trong danh sách.'),
          }));
        })
        .finally(() => setIsLoadingContent(false));
    } else {
      setForm(EMPTY_FORM);
      setErrors({});
      setImgError(false);
      setIsSlugEdited(false);
    }
  }, [isEdit, article?.id, article]);

  // ── Keyboard + scroll lock ──
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isPreviewOpen) {
        setIsPreviewOpen(false);
        return;
      }
      if (isPublishConfirmOpen) {
        setIsPublishConfirmOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    setTimeout(() => titleRef.current?.focus(), 200);
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [isPreviewOpen, isPublishConfirmOpen, onClose]);

  // ── Auto Calculate Read Time ──
  useEffect(() => {
    if (!form.content || form.content === '<p><br></p>') {
      if (form.readTime !== 1) setForm(p => ({ ...p, readTime: 1 }));
      return;
    }
    
    // Thay thế thẻ HTML thành dấu cách để tránh dính chữ (ví dụ: <p>A</p><p>B</p> -> A B)
    // Thay thế &nbsp; thành dấu cách
    const plainText = form.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();
      
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const computedTime = Math.max(1, Math.ceil(wordCount / 200));
    
    if (computedTime !== form.readTime) {
      setForm(p => ({ ...p, readTime: computedTime }));
    }
  }, [form.content, form.readTime]);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
    if (key === 'imageUrl') setImgError(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setErrors(p => ({ ...p, imageUrl: '' }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetchWithAuth(`${API_BASE_URL}/article/admin/upload`, {
        method: 'POST',
        headers: {}, // Do NOT set Content-Type header when sending FormData!
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Lỗi upload ảnh');
      setField('imageUrl', json.data?.url ?? json.url);
    } catch (err: unknown) {
      setErrors(p => ({ ...p, imageUrl: getErrorMessage(err, 'Lỗi upload ảnh') }));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const validateForPublish = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim())    e.title   = 'Tiêu đề không được để trống';
    if (!form.excerpt.trim())  e.excerpt  = 'Tóm tắt không được để trống';
    if (!form.imageUrl.trim()) e.imageUrl = 'URL ảnh bìa không được để trống';
    if (!form.author.trim())   e.author   = 'Tên tác giả không được để trống';
    if (!form.content || form.content === '<p><br></p>') e.content = 'Nội dung không được để trống';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (action: SaveAction) => {
    if ((action === 'submit' || action === 'publish') && !validateForPublish()) return;

    setSubmitAction(action);
    try {
      const url    = isEdit ? `${API_BASE_URL}/article/admin/${article!.id}` : `${API_BASE_URL}/article/admin`;
      const method = isEdit ? 'PATCH' : 'POST';
      const payload = isAdmin
        ? { ...form, saveMode: action === 'draft' ? 'draft' : 'publish' }
        : form;
      const res    = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.message;
        throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Thao tác thất bại'));
      }

      const saved: Article = json?.data ?? json;
      if (isStaff && action === 'submit') {
        const submitRes = await fetchWithAuth(`${API_BASE_URL}/article/admin/${saved.id}/submit`, { method: 'POST' });
        const submitJson = await submitRes.json();
        if (!submitRes.ok) {
          const msg = submitJson?.message;
          throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Gửi duyệt thất bại'));
        }
      }

      if (isStaff) {
        onSuccess(action === 'submit'
          ? `Đã lưu và gửi duyệt "${form.title.trim() || 'bản nháp'}"`
          : `Đã lưu bản nháp "${form.title.trim() || 'chưa có tiêu đề'}"`);
      } else {
        onSuccess(action === 'draft'
          ? `Đã lưu bản nháp "${form.title.trim() || 'chưa có tiêu đề'}"`
          : isEdit
            ? `Đã cập nhật và xuất bản "${form.title.trim()}"`
            : `Đã xuất bản "${form.title.trim()}"`);
      }
      onClose();
    } catch (err: unknown) {
      setErrors(p => ({ ...p, _server: getErrorMessage(err, 'Thao tác thất bại') }));
    } finally {
      setSubmitAction(null);
    }
  };

  const handleTitleChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      title: value,
      slug: isSlugEdited ? prev.slug : normalizeSeoSlug(value),
      seoTitle: prev.seoTitle || value.slice(0, 70),
    }));
    if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
  };

  const handleSlugChange = (value: string) => {
    setIsSlugEdited(true);
    setField('slug', normalizeSeoSlug(value));
  };

  const handlePrimaryAction = () => {
    if (isStaff) {
      void handleSave('submit');
      return;
    }
    if (!validateForPublish()) return;
    setIsPublishConfirmOpen(true);
  };

  const isSubmitting = submitAction !== null;

  const activeCat = CATEGORIES.find(c => c.value === form.category) ?? CATEGORIES[0];
  const workflowStatus: DrawerArticleStatus = isEdit ? article?.status ?? 'DRAFT' : 'DRAFT';
  const workflowCopy = DRAWER_STATUS_COPY[workflowStatus];
  const workflowHint = isStaff ? workflowCopy.staffHint : workflowCopy.adminHint;
  const canSaveArticle = isAdmin || (isStaff && (!isEdit || workflowStatus === 'DRAFT' || workflowStatus === 'REJECTED'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="am-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal shell */}
      <div className="relative w-full max-w-[1240px] max-h-[92vh] flex flex-col bg-surface rounded-3xl shadow-2xl overflow-hidden animate-fade-slide-up">

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-4 px-7 py-4 border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.isFeatured ? 'bg-amber-50' : 'bg-primary/10'}`}>
            <span className={`material-symbols-outlined text-xl ${form.isFeatured ? 'text-amber-500' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {isEdit ? 'edit_note' : 'post_add'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="am-title" className="text-base font-bold text-on-surface leading-tight">
              {isEdit ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5 truncate">
              {isEdit
                ? article?.slug
                : isStaff
                  ? 'Lưu nháp trước, hoàn thiện sau rồi gửi Admin duyệt'
                  : 'Có thể lưu nháp nội bộ hoặc xuất bản ngay lên trang khách'}
            </p>
          </div>
          {/* Visibility pill */}
          {form.isFeatured && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>Nổi bật
            </span>
          )}
          <button onClick={onClose} aria-label="Đóng"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 border-b border-outline-variant/10 bg-surface px-7 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${workflowCopy.className}`}>
              <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{workflowCopy.icon}</span>
              {workflowCopy.label}
            </span>
            <p className="truncate text-xs text-on-surface-variant">{workflowHint}</p>
          </div>
          {workflowStatus === 'REJECTED' && article?.reviewNote ? (
            <p className="max-w-xl truncate text-xs font-medium text-error" title={article.reviewNote}>
              Lý do: {article.reviewNote}
            </p>
          ) : null}
        </div>

        {/* ══ BODY ════════════════════════════════════════════════════════════ */}
        {isLoadingContent ? (
          <div className="flex-1 flex items-center justify-center py-32">
            <div className="text-center space-y-3">
              <span className="material-symbols-outlined text-5xl text-primary animate-spin block">progress_activity</span>
              <p className="text-sm text-on-surface-variant">Đang tải nội dung bài viết…</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* ╔═ LEFT PANEL (metadata) ═══════════════════════════════════════╗ */}
            <aside className="w-[340px] shrink-0 flex flex-col border-r border-outline-variant/10 bg-surface-container-lowest overflow-y-auto">
              <div className="p-5 space-y-4">

                {/* Cover image preview & dropzone */}
                <section className="space-y-2.5 rounded-2xl border border-outline-variant/12 bg-surface p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Ảnh bìa</p>
                      <p className="mt-0.5 text-[11px] text-on-surface-variant/60">Tỷ lệ khuyến nghị 16:9, bắt buộc khi xuất bản</p>
                    </div>
                    {form.imageUrl && !imgError && !isUploadingImage ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Đã có ảnh
                      </span>
                    ) : null}
                  </div>

                  <label htmlFor="cover-upload" className={`cursor-pointer block relative aspect-[4/3] rounded-2xl overflow-hidden bg-surface-container border transition-all ${isUploadingImage ? 'opacity-75 pointer-events-none border-primary' : 'border-outline-variant/25 hover:border-primary border-dashed group'} ${errors.imageUrl ? 'border-error' : ''}`}>
                    {form.imageUrl && !imgError && !isUploadingImage ? (
                      <div className="w-full h-full relative">
                        <Image
                          src={form.imageUrl}
                          alt="Cover preview"
                          fill
                          sizes="340px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={() => setImgError(true)}
                        />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 px-3 py-2 text-white backdrop-blur-sm">
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold">
                            <span className="material-symbols-outlined text-[15px]">image</span>
                            <span className="truncate">Ảnh bìa bài viết</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/18 px-2 py-1 text-[11px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
                            Đổi ảnh
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center text-outline-variant group-hover:text-primary transition-colors">
                        {isUploadingImage ? (
                          <>
                            <span className="material-symbols-outlined text-4xl animate-spin text-primary block">progress_activity</span>
                            <span className="text-sm font-bold text-primary">Đang tải ảnh lên...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-14 h-14 rounded-2xl bg-surface-container-high group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                              <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-on-surface">Tải ảnh bìa lên</p>
                              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant/60">JPEG, PNG hoặc WEBP. Ảnh rõ, sáng và đúng chủ đề bài viết.</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {form.imageUrl && !imgError && !isUploadingImage && (
                      <div className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-sm shadow-sm ${activeCat.bg}`}>
                        <span className={`material-symbols-outlined text-[12px] ${activeCat.color}`}>{activeCat.icon}</span>
                        <span className={activeCat.color}>{activeCat.label}</span>
                      </div>
                    )}

                    <input
                      id="cover-upload"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="sr-only"
                      onChange={handleImageUpload}
                    />
                  </label>
                  {errors.imageUrl ? (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-error">
                      <span className="material-symbols-outlined text-[13px]">error</span>
                      {errors.imageUrl}
                    </p>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant/55">Ảnh này sẽ dùng cho card bài viết, preview chia sẻ và đầu trang bài chi tiết.</p>
                  )}
                </section>

                {/* Category */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Danh mục</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setField('category', c.value)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary ${form.category === c.value ? `${c.bg} ${c.color} border-current/30` : 'border-outline-variant/15 text-on-surface-variant hover:bg-surface-container'}`}
                      >
                        <span className={`material-symbols-outlined text-lg ${form.category === c.value ? c.color : 'text-outline'}`} style={{ fontVariationSettings: form.category === c.value ? "'FILL' 1" : "'FILL' 0" }}>{c.icon}</span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Author */}
                <div className="space-y-1.5">
                  <label htmlFor="am-author" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Tác giả <span className="text-on-surface-variant/40 normal-case">({isStaff ? 'khi gửi duyệt' : 'khi xuất bản'})</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">person</span>
                    <input
                      id="am-author"
                      type="text"
                      value={form.author}
                      onChange={e => setField('author', e.target.value)}
                      placeholder="Tên tác giả"
                      className={`w-full bg-surface border rounded-xl pl-9 pr-3 py-2.5 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors placeholder:text-on-surface-variant/55 ${errors.author ? 'border-error/50' : 'border-outline-variant/25'}`}
                    />
                  </div>
                  {errors.author && <p className="text-[10px] text-error">{errors.author}</p>}
                </div>

                {/* Read time (Auto Calculated) */}
                <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[14px]">psychology</span> AI ước lượng
                  </div>
                  <p className="text-sm font-semibold text-on-surface flex justify-between items-center">
                    Thời gian đọc
                    <span className="px-2.5 py-0.5 bg-white rounded-md text-primary shadow-sm border border-primary/10">
                      ~ {form.readTime} phút
                    </span>
                  </p>
                </div>

                {/* Visibility */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Hiển thị</p>
                  <label htmlFor="am-featured"
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.isFeatured ? 'bg-amber-50 border-amber-300' : 'bg-surface-container-low border-outline-variant/15 hover:bg-surface-container'}`}>
                    <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.isFeatured ? 'bg-amber-400' : 'bg-outline-variant/40'}`}>
                      <input type="checkbox" id="am-featured" checked={form.isFeatured}
                        onChange={e => setField('isFeatured', e.target.checked)} className="sr-only" />
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${form.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold leading-tight ${form.isFeatured ? 'text-amber-700' : 'text-on-surface-variant'}`}>
                        {form.isFeatured ? 'Nổi bật trên danh sách' : 'Không ghim nổi bật'}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
                        {form.isFeatured ? 'Ưu tiên hiển thị ở khu vực bài nổi bật' : 'Vẫn hiển thị bình thường sau khi xuất bản'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* SEO */}
                <div className="space-y-3 rounded-2xl border border-outline-variant/12 bg-surface-container-lowest p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">SEO</p>
                    <span className="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">travel_explore</span>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="am-slug" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Đường dẫn</label>
                    <div className="flex overflow-hidden rounded-xl border border-outline-variant/25 bg-surface">
                      <span className="flex items-center border-r border-outline-variant/12 px-3 text-xs font-semibold text-on-surface-variant">/journal/</span>
                      <input
                        id="am-slug"
                        type="text"
                        value={form.slug}
                        onChange={e => handleSlugChange(e.target.value)}
                        placeholder="duong-dan-bai-viet"
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/55"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSlugEdited(false);
                        setField('slug', normalizeSeoSlug(form.title));
                      }}
                      className="text-[10px] font-bold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary outline-none rounded"
                    >
                      Tạo lại từ tiêu đề
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="am-seo-title" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">SEO title</label>
                    <input
                      id="am-seo-title"
                      type="text"
                      value={form.seoTitle}
                      onChange={e => setField('seoTitle', e.target.value)}
                      maxLength={70}
                      placeholder="Tiêu đề hiển thị trên Google"
                      className="w-full rounded-xl border border-outline-variant/25 bg-surface px-3 py-2.5 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/55 focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <p className={`text-[10px] ${form.seoTitle.length > 60 ? 'text-amber-600' : 'text-on-surface-variant/45'}`}>
                      {form.seoTitle.length}/70 ký tự
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="am-seo-desc" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Meta description</label>
                    <textarea
                      id="am-seo-desc"
                      value={form.seoDescription}
                      onChange={e => setField('seoDescription', e.target.value)}
                      maxLength={170}
                      rows={3}
                      placeholder="Mô tả ngắn để tối ưu kết quả tìm kiếm"
                      className="w-full resize-none rounded-xl border border-outline-variant/25 bg-surface px-3 py-2.5 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/55 focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <p className={`text-[10px] ${form.seoDescription.length > 155 ? 'text-amber-600' : 'text-on-surface-variant/45'}`}>
                      {form.seoDescription.length}/170 ký tự
                    </p>
                  </div>

                  <div className="rounded-xl border border-outline-variant/10 bg-surface px-3 py-2.5">
                    <p className="truncate text-xs font-bold text-primary">{form.seoTitle || form.title || 'Tiêu đề bài viết'}</p>
                    <p className="mt-0.5 truncate text-[10px] text-emerald-700">azurehorizon.vn/journal/{form.slug || normalizeSeoSlug(form.title) || 'duong-dan-bai-viet'}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-on-surface-variant">
                      {form.seoDescription || form.excerpt || 'Meta description sẽ hiển thị tại đây.'}
                    </p>
                  </div>
                </div>

              </div>
            </aside>

            {/* ╔═ RIGHT PANEL (editor) ════════════════════════════════════════╗ */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

              {/* Server error */}
              {errors._server && (
                <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-error/10 text-error rounded-xl border border-error/20 text-sm font-medium shrink-0">
                  <span className="material-symbols-outlined text-lg shrink-0">error</span>
                  {errors._server}
                </div>
              )}

              {/* Title + Excerpt */}
              <div className="px-7 pt-6 pb-4 space-y-3 shrink-0">
                {/* Title */}
                <div>
                  <label htmlFor="am-title" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                    Tiêu đề bài viết <span className="text-on-surface-variant/40 normal-case">({isStaff ? 'khi gửi duyệt' : 'khi xuất bản'})</span>
                  </label>
                  <input
                    id="am-title"
                    ref={titleRef}
                    type="text"
                    value={form.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="Nhập tiêu đề hấp dẫn cho bài viết…"
                    className={`w-full bg-transparent border-0 border-b-2 text-xl font-bold text-on-surface placeholder:text-on-surface-variant/55 outline-none focus:border-primary transition-colors pb-2 ${errors.title ? 'border-error' : 'border-outline-variant/30'}`}
                  />
                  {errors.title && <p className="text-xs text-error mt-1">{errors.title}</p>}
                </div>

                {/* Excerpt */}
                <div>
                  <label htmlFor="am-excerpt" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                    Tóm tắt <span className="text-on-surface-variant/40 normal-case">({isStaff ? 'khi gửi duyệt' : 'khi xuất bản'})</span>
                    <span className="normal-case font-normal ml-1 text-on-surface-variant/50">(hiển thị dưới card bài)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="am-excerpt"
                      value={form.excerpt}
                      onChange={e => setField('excerpt', e.target.value)}
                      rows={2}
                      maxLength={300}
                      placeholder="1–2 câu mô tả ngắn thu hút người đọc…"
                      className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none placeholder:text-on-surface-variant/55 transition-colors ${errors.excerpt ? 'border-error/50' : 'border-outline-variant/25'}`}
                    />
                    <span className={`absolute bottom-2 right-3 text-[10px] ${form.excerpt.length > 250 ? 'text-amber-500' : 'text-on-surface-variant/40'}`}>
                      {form.excerpt.length}/300
                    </span>
                  </div>
                  {errors.excerpt && <p className="text-xs text-error mt-1">{errors.excerpt}</p>}
                </div>
              </div>

              {/* Divider with label */}
              <div className="flex items-center gap-3 px-7 mb-0 shrink-0">
                <div className="flex-1 h-px bg-outline-variant/10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Nội dung bài viết</span>
                <div className="flex-1 h-px bg-outline-variant/10" />
              </div>
              {errors.content && (
                <p className="text-xs text-error px-7 mt-1 shrink-0">{errors.content}</p>
              )}

              {/* Rich Text Editor — grows to fill remaining height */}
              <div className="flex-1 overflow-hidden mx-7 mb-0 mt-3">
                <style>{`
                  .am-quill-wrap .ql-toolbar {
                    background: var(--color-surface, #ffffff);
                    border: 1px solid rgba(0,0,0,0.12) !important;
                    border-bottom: none !important;
                    border-radius: 12px 12px 0 0;
                    padding: 8px 12px;
                  }
                  .am-quill-wrap .ql-container {
                    background: var(--color-surface, #ffffff);
                    border: 1px solid rgba(0,0,0,0.12) !important;
                    border-top: none !important;
                    border-radius: 0 0 12px 12px;
                    font-size: 15px;
                    height: calc(100% - 42px);
                  }
                  .am-quill-wrap .ql-editor {
                    height: 100%;
                    line-height: 1.85;
                    padding: 16px 20px;
                    color: var(--color-on-surface, #191c21);
                  }
                  .am-quill-wrap .ql-editor.ql-blank::before {
                    color: rgba(25,28,33,0.48);
                    font-style: italic;
                  }
                  .am-quill-wrap .ql-editor h1, .am-quill-wrap .ql-editor h2, .am-quill-wrap .ql-editor h3 {
                    font-weight: 700;
                    margin-bottom: 0.5em;
                  }
                  .am-quill-wrap .ql-toolbar .ql-stroke { stroke: var(--color-on-surface-variant, #424752); }
                  .am-quill-wrap .ql-toolbar .ql-fill   { fill:   var(--color-on-surface-variant, #424752); }
                  .am-quill-wrap .ql-toolbar button:hover .ql-stroke { stroke: var(--color-primary, #003f87); }
                  .am-quill-wrap .ql-toolbar button:hover .ql-fill   { fill:   var(--color-primary, #003f87); }
                  .am-quill-wrap-wrap { height: 100%; }
                `}</style>
                <div className="am-quill-wrap h-full">
                  <ReactQuill
                    theme="snow"
                    value={form.content}
                    onChange={val => setField('content', val)}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="Bắt đầu viết nội dung bài viết ở đây…"
                    style={{ height: '100%' }}
                  />
                </div>
              </div>

              {/* Spacer so footer doesn't overlap quill */}
              <div className="h-4 shrink-0" />
            </div>
          </div>
        )}

        {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-7 py-4 border-t border-outline-variant/10 bg-surface-container-lowest">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
            <span className="material-symbols-outlined text-[14px]">info</span>
            {!canSaveArticle
              ? 'Trạng thái này chỉ xem, không thể chỉnh sửa hoặc gửi duyệt.'
              : isStaff
              ? 'Lưu nháp không bắt buộc đủ thông tin. Chỉ “Lưu & gửi duyệt” mới kiểm tra đủ trường.'
              : 'Lưu nháp không public. Chỉ “Xuất bản ngay” mới kiểm tra đủ trường và hiển thị với khách.'}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              disabled={isLoadingContent}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container disabled:opacity-60 transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="material-symbols-outlined text-base">visibility</span>
              Xem trước
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Hủy
            </button>
            {canSaveArticle && (isStaff || isAdmin) && (
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={isSubmitting || isLoadingContent}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container disabled:opacity-60 transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {submitAction === 'draft'
                  ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</>
                  : <><span className="material-symbols-outlined text-base">draft</span>Lưu nháp</>
                }
              </button>
            )}
            {canSaveArticle && (
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isSubmitting || isLoadingContent}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-[0.98] shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {(submitAction === 'submit' || submitAction === 'publish')
                  ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</>
                  : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{isStaff ? 'send' : 'publish'}</span>{isStaff ? 'Lưu & gửi duyệt' : 'Xuất bản ngay'}</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
      {isPreviewOpen && (
        <ArticlePreviewDialog
          form={form}
          category={activeCat}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
      {isPublishConfirmOpen && (
        <ArticlePublishConfirmDialog
          form={form}
          category={activeCat}
          isSubmitting={submitAction === 'publish'}
          onCancel={() => setIsPublishConfirmOpen(false)}
          onConfirm={() => {
            setIsPublishConfirmOpen(false);
            void handleSave('publish');
          }}
        />
      )}
    </div>
  );
}

function ArticlePublishConfirmDialog({
  form,
  category,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  form: ArticleForm;
  category: (typeof CATEGORIES)[number];
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Hủy xuất bản" onClick={onCancel} />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="publish-confirm-title"
        aria-describedby="publish-confirm-description"
        className="relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-2xl"
      >
        <div className="flex items-start gap-4 px-6 pt-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>publish</span>
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Xác nhận xuất bản</p>
            <h3 id="publish-confirm-title" className="mt-1 text-lg font-extrabold leading-snug text-on-surface">
              Xuất bản bài viết này?
            </h3>
            <p id="publish-confirm-description" className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Bài viết sẽ chuyển sang trạng thái đã xuất bản và có thể hiển thị với khách trên trang Journal.
            </p>
          </div>
        </div>

        <div className="mx-6 mt-5 rounded-xl border border-outline-variant/12 bg-surface-container-low px-4 py-3">
          <p className="line-clamp-2 text-sm font-bold text-on-surface">{form.title.trim()}</p>
          <div className="mt-3 grid gap-2 text-xs text-on-surface-variant sm:grid-cols-2">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className={`material-symbols-outlined text-[14px] ${category.color}`} aria-hidden="true">{category.icon}</span>
              <span className="truncate">{category.label}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">person</span>
              <span className="truncate">{form.author.trim()}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>
              {form.readTime} phút đọc
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">image</span>
              Ảnh bìa đã sẵn sàng
            </span>
          </div>
        </div>

        <div className="mx-6 mt-4 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          Sau khi xuất bản, các thay đổi đang có trong form sẽ được lưu và public ngay. Hãy dùng `Xem trước` nếu cần rà lại bố cục trước khi xác nhận.
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-outline-variant/10 bg-surface-container-lowest px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary outline-none disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary outline-none disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[17px] ${isSubmitting ? 'animate-spin' : ''}`} aria-hidden="true">
              {isSubmitting ? 'progress_activity' : 'publish'}
            </span>
            Xác nhận xuất bản
          </button>
        </div>
      </section>
    </div>
  );
}

function ArticlePreviewDialog({
  form,
  category,
  onClose,
}: {
  form: ArticleForm;
  category: (typeof CATEGORIES)[number];
  onClose: () => void;
}) {
  const hasContent = Boolean(form.content && form.content !== '<p><br></p>');
  const title = form.title.trim() || 'Tiêu đề bài viết';
  const excerpt = form.excerpt.trim() || 'Tóm tắt ngắn của bài viết sẽ hiển thị tại đây.';
  const author = form.author.trim() || 'Azure Horizon Editorial';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Đóng xem trước" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-preview-title"
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-outline-variant/15 bg-surface shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-outline-variant/10 bg-surface-container-lowest px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Xem trước bài viết</p>
            <h3 id="article-preview-title" className="truncate text-base font-extrabold text-on-surface">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary outline-none"
            aria-label="Đóng xem trước"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </header>

        <div className="overflow-y-auto bg-surface">
          <article className="mx-auto max-w-3xl px-6 py-8">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${category.bg}`}>
                <span className={`material-symbols-outlined text-[14px] ${category.color}`}>{category.icon}</span>
                <span className={category.color}>{category.label}</span>
              </span>
              {form.isFeatured && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  Nổi bật
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold leading-tight text-on-surface md:text-4xl">
              {title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
              {excerpt}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">person</span>
                {author}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                {form.readTime} phút đọc
              </span>
            </div>

            <div className="mt-7 overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container">
              {form.imageUrl ? (
                <div className="relative aspect-[16/9]">
                  <Image
                    src={form.imageUrl}
                    alt={title}
                    fill
                    sizes="(min-width: 1024px) 768px, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl">image</span>
                  <span className="text-sm font-semibold">Chưa có ảnh bìa</span>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-6 py-6">
              {hasContent ? (
                <div
                  className="article-preview-content text-[15px] leading-8 text-on-surface"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl">article</span>
                  <p className="text-sm font-semibold">Chưa có nội dung bài viết</p>
                </div>
              )}
            </div>
          </article>
        </div>

        <style>{`
          .article-preview-content p { margin: 0 0 1.1rem; }
          .article-preview-content h1,
          .article-preview-content h2,
          .article-preview-content h3 {
            color: var(--color-on-surface, #191c21);
            font-weight: 800;
            line-height: 1.25;
            margin: 1.4rem 0 0.75rem;
          }
          .article-preview-content h1 { font-size: 1.8rem; }
          .article-preview-content h2 { font-size: 1.45rem; }
          .article-preview-content h3 { font-size: 1.2rem; }
          .article-preview-content ul,
          .article-preview-content ol { margin: 0 0 1rem 1.25rem; padding-left: 1rem; }
          .article-preview-content li { margin: 0.25rem 0; }
          .article-preview-content blockquote {
            margin: 1.25rem 0;
            border: 1px solid rgba(0,0,0,0.08);
            border-radius: 12px;
            padding: 0.9rem 1rem;
            background: rgba(0,0,0,0.025);
            font-weight: 600;
          }
          .article-preview-content img { border-radius: 12px; max-width: 100%; height: auto; }
          .article-preview-content a { color: var(--color-primary, #003f87); font-weight: 700; text-decoration: underline; }
        `}</style>
      </section>
    </div>
  );
}

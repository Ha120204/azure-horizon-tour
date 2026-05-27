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
  const [imgError, setImgError]     = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // ── Load bài viết khi edit ──
  useEffect(() => {
    if (isEdit && article) {
      setForm(articleToForm(article));
      setErrors({});
      setImgError(false);
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
    }
  }, [isEdit, article?.id, article]);

  // ── Keyboard + scroll lock ──
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    setTimeout(() => titleRef.current?.focus(), 200);
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

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

  const isSubmitting = submitAction !== null;

  const activeCat = CATEGORIES.find(c => c.value === form.category) ?? CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="am-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal shell */}
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-surface rounded-3xl shadow-2xl overflow-hidden animate-fade-slide-up">

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
          {/* Status pill */}
          {form.isFeatured && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>Bài nổi bật
            </span>
          )}
          <button onClick={onClose} aria-label="Đóng"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
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
            <aside className="w-72 shrink-0 flex flex-col border-r border-outline-variant/10 bg-surface-container-lowest overflow-y-auto">
              <div className="p-5 space-y-5">

                {/* Cover image preview & dropzone */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex justify-between items-center">
                    Ảnh bìa
                    {isUploadingImage && <span className="text-primary normal-case font-medium">Đang tải lên...</span>}
                  </p>
                  
                  <label htmlFor="cover-upload" className={`cursor-pointer block relative aspect-video rounded-xl overflow-hidden bg-surface-container border transition-all ${isUploadingImage ? 'opacity-70 pointer-events-none border-primary' : 'border-outline-variant/30 hover:border-primary border-dashed group'} ${errors.imageUrl ? 'border-error' : ''}`}>
                    {form.imageUrl && !imgError && !isUploadingImage ? (
                      <div className="w-full h-full relative">
                        <Image
                          src={form.imageUrl}
                          alt="Cover preview"
                          fill
                          sizes="288px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={() => setImgError(true)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white text-xs font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">cloud_upload</span>Tải ảnh khác
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-outline-variant group-hover:text-primary transition-colors">
                        {isUploadingImage ? (
                          <span className="material-symbols-outlined text-3xl animate-spin text-primary block">progress_activity</span>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-surface-container-high group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                              <span className="material-symbols-outlined text-2xl group-hover:block hidden">cloud_upload</span>
                              <span className="material-symbols-outlined text-2xl group-hover:hidden block text-outline">image</span>
                            </div>
                            <span className="text-[11px] font-medium px-4 text-center">Bấm để tải ảnh lên<br/>(JPEG, PNG, WEBP)</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Category badge overlay */}
                    {form.imageUrl && !imgError && !isUploadingImage && (
                      <div className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm shadow-sm ${activeCat.bg}`}>
                        <span className={`material-symbols-outlined text-[11px] ${activeCat.color}`}>{activeCat.icon}</span>
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
                  {errors.imageUrl && <p className="text-[10px] text-error">{errors.imageUrl}</p>}
                </div>

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
                      className={`w-full bg-surface-container-low border rounded-xl pl-9 pr-3 py-2.5 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors placeholder:text-on-surface-variant/40 ${errors.author ? 'border-error/50' : 'border-outline-variant/15'}`}
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

                {/* Featured toggle */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Trạng thái</p>
                  <label htmlFor="am-featured"
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.isFeatured ? 'bg-amber-50 border-amber-300' : 'bg-surface-container-low border-outline-variant/15 hover:bg-surface-container'}`}>
                    <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.isFeatured ? 'bg-amber-400' : 'bg-outline-variant/40'}`}>
                      <input type="checkbox" id="am-featured" checked={form.isFeatured}
                        onChange={e => setField('isFeatured', e.target.checked)} className="sr-only" />
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${form.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold leading-tight ${form.isFeatured ? 'text-amber-700' : 'text-on-surface-variant'}`}>
                        {form.isFeatured ? '⭐ Bài nổi bật' : 'Bài thường'}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
                        {form.isFeatured ? 'Hiển thị ở vị trí hero' : 'Hiển thị trong danh sách'}
                      </p>
                    </div>
                  </label>
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
                    onChange={e => setField('title', e.target.value)}
                    placeholder="Nhập tiêu đề hấp dẫn cho bài viết…"
                    className={`w-full bg-transparent border-0 border-b-2 text-xl font-bold text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-primary transition-colors pb-2 ${errors.title ? 'border-error' : 'border-outline-variant/20'}`}
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
                      className={`w-full bg-surface-container-low border rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none placeholder:text-on-surface-variant/40 transition-colors ${errors.excerpt ? 'border-error/50' : 'border-outline-variant/15'}`}
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
                    background: var(--color-surface-container-low, #f2f3fc);
                    border: 1px solid rgba(0,0,0,0.06) !important;
                    border-bottom: none !important;
                    border-radius: 12px 12px 0 0;
                    padding: 8px 12px;
                  }
                  .am-quill-wrap .ql-container {
                    background: var(--color-surface-container-low, #f2f3fc);
                    border: 1px solid rgba(0,0,0,0.06) !important;
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
                    color: rgba(0,0,0,0.25);
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
            {isStaff
              ? 'Lưu nháp không bắt buộc đủ thông tin. Chỉ “Lưu & gửi duyệt” mới kiểm tra đủ trường.'
              : 'Lưu nháp không public. Chỉ “Xuất bản ngay” mới kiểm tra đủ trường và hiển thị với khách.'}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Hủy
            </button>
            {(isStaff || isAdmin) && (
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
            <button
              type="button"
              onClick={() => handleSave(isStaff ? 'submit' : 'publish')}
              disabled={isSubmitting || isLoadingContent}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-[0.98] shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {(submitAction === 'submit' || submitAction === 'publish')
                ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</>
                : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{isStaff ? 'send' : 'publish'}</span>{isStaff ? 'Lưu & gửi duyệt' : 'Xuất bản ngay'}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

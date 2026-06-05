import Image from 'next/image';
import { CATEGORIES, normalizeSeoSlug, type ArticleForm } from './types';

type Props = {
    form: ArticleForm;
    errors: Record<string, string>;
    imgError: boolean;
    setImgError: (v: boolean) => void;
    isUploadingImage: boolean;
    activeCat: (typeof CATEGORIES)[number];
    isStaff: boolean;
    setField: <K extends keyof ArticleForm>(key: K, value: ArticleForm[K]) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSlugChange: (value: string) => void;
    handleResetSlug: () => void;
};

export function ArticleMetaPanel({
    form, errors, imgError, setImgError, isUploadingImage, activeCat, isStaff,
    setField, handleImageUpload, handleSlugChange, handleResetSlug,
}: Props) {
    return (
        <aside className="w-[340px] shrink-0 flex flex-col border-r border-outline-variant/10 bg-surface-container-lowest overflow-y-auto">
            <div className="p-5 space-y-4">

                {/* Cover image */}
                <section className="space-y-2.5 rounded-2xl border border-outline-variant/12 bg-surface p-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Ảnh bìa</p>
                            <p className="mt-0.5 text-[11px] text-on-surface-variant/60">Tỷ lệ khuyến nghị 16:9, bắt buộc khi xuất bản</p>
                        </div>
                        {form.imageUrl && !imgError && !isUploadingImage && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                Đã có ảnh
                            </span>
                        )}
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

                {/* Read time */}
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
                            onClick={handleResetSlug}
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
    );
}

import Image from 'next/image';
import Modal, { ModalBody } from '@/components/ui/Modal';
import IconButton from '@/components/ui/IconButton';
import { CATEGORIES, type ArticleForm } from './types';

type Props = {
    form: ArticleForm;
    category: (typeof CATEGORIES)[number];
    onClose: () => void;
};

export function ArticlePreviewDialog({ form, category, onClose }: Props) {
    const hasContent = Boolean(form.content && form.content !== '<p><br></p>');
    const title = form.title.trim() || 'Tiêu đề bài viết';
    const excerpt = form.excerpt.trim() || 'Tóm tắt ngắn của bài viết sẽ hiển thị tại đây.';
    const author = form.author.trim() || 'Azure Horizon Editorial';

    return (
        <Modal open onClose={onClose} zIndex={70} labelledBy="article-preview-title" className="max-w-5xl rounded-3xl border border-outline-variant/15">
            <header className="flex items-center justify-between gap-4 border-b border-outline-variant/10 bg-surface-container-lowest px-6 py-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Xem trước bài viết</p>
                    <h3 id="article-preview-title" className="truncate text-base font-extrabold text-on-surface">{title}</h3>
                </div>
                <IconButton icon="close" onClick={onClose} aria-label="Đóng xem trước" />
            </header>

            <ModalBody className="bg-surface">
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

                    <h1 className="text-3xl font-extrabold leading-tight text-on-surface md:text-4xl">{title}</h1>
                    <p className="mt-4 text-base leading-relaxed text-on-surface-variant">{excerpt}</p>

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
            </ModalBody>

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
        </Modal>
    );
}

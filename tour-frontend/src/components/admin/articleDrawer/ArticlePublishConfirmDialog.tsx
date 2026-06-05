import { CATEGORIES, type ArticleForm } from './types';

type Props = {
    form: ArticleForm;
    category: (typeof CATEGORIES)[number];
    isSubmitting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export function ArticlePublishConfirmDialog({ form, category, isSubmitting, onCancel, onConfirm }: Props) {
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

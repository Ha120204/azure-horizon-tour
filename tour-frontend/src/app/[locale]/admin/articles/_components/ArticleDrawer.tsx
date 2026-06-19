'use client';

import type { ArticleDrawerProps } from './articleDrawer/types';
import { useArticleForm } from './articleDrawer/useArticleForm';
import { ArticleMetaPanel } from './articleDrawer/ArticleMetaPanel';
import { ArticleEditorPanel } from './articleDrawer/ArticleEditorPanel';
import { ArticlePreviewDialog } from './articleDrawer/ArticlePreviewDialog';
import { ArticlePublishConfirmDialog } from './articleDrawer/ArticlePublishConfirmDialog';
import { UnsavedChangesDialog } from '@/components/admin/UnsavedChangesDialog';

// Re-export Article so consumers can import it from this file directly
export type { Article } from './articleDrawer/types';

export default function ArticleDrawer({ mode, article, userRole = '', onClose, onSuccess }: ArticleDrawerProps) {
    const {
        form, errors, submitAction, isSubmitting,
        isLoadingContent, isUploadingImage,
        isPreviewOpen, setIsPreviewOpen,
        isPublishConfirmOpen, setIsPublishConfirmOpen,
        imgError, setImgError,
        titleRef,
        isEdit, isStaff, isAdmin,
        activeCat, workflowStatus, workflowCopy, workflowHint, canSaveArticle,
        setField, handleImageUpload, handleTitleChange, handleSlugChange, handleResetSlug,
        handleSave, handlePrimaryAction,
        isDirty,
        showConfirmClose, setShowConfirmClose,
    } = useArticleForm({ mode, article, userRole, onClose, onSuccess });

    const handleClose = () => {
        if (isDirty.current) {
            setShowConfirmClose(true);
            return;
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="am-title">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            <div className="relative w-full max-w-[1240px] max-h-[92vh] flex flex-col bg-surface rounded-3xl shadow-2xl overflow-hidden animate-fade-slide-up">

                {/* Header */}
                <div className="flex items-center gap-4 px-7 py-4 border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
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
                    {form.isFeatured && (
                        <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>Nổi bật
                        </span>
                    )}
                    <button onClick={handleClose} aria-label="Đóng"
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Workflow status bar */}
                <div className="flex flex-col gap-2 border-b border-outline-variant/10 bg-surface px-7 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${workflowCopy.className}`}>
                            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{workflowCopy.icon}</span>
                            {workflowCopy.label}
                        </span>
                        <p className="truncate text-xs text-on-surface-variant">{workflowHint}</p>
                    </div>
                    {workflowStatus === 'REJECTED' && article?.reviewNote && (
                        <p className="max-w-xl truncate text-xs font-medium text-error" title={article.reviewNote}>
                            Lý do: {article.reviewNote}
                        </p>
                    )}
                </div>

                {/* Body */}
                {isLoadingContent ? (
                    <div className="flex-1 flex items-center justify-center py-32">
                        <div className="text-center space-y-3">
                            <span className="material-symbols-outlined text-5xl text-primary animate-spin block">progress_activity</span>
                            <p className="text-sm text-on-surface-variant">Đang tải nội dung bài viết…</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden min-h-0">
                        <ArticleMetaPanel
                            form={form}
                            errors={errors}
                            imgError={imgError}
                            setImgError={setImgError}
                            isUploadingImage={isUploadingImage}
                            activeCat={activeCat}
                            isStaff={isStaff}
                            setField={setField}
                            handleImageUpload={handleImageUpload}
                            handleSlugChange={handleSlugChange}
                            handleResetSlug={handleResetSlug}
                        />
                        <ArticleEditorPanel
                            form={form}
                            errors={errors}
                            titleRef={titleRef}
                            isStaff={isStaff}
                            handleTitleChange={handleTitleChange}
                            setField={setField}
                        />
                    </div>
                )}

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-between gap-4 px-7 py-4 border-t border-outline-variant/10 bg-surface-container-lowest">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        {!canSaveArticle
                            ? 'Trạng thái này chỉ xem, không thể chỉnh sửa hoặc gửi duyệt.'
                            : isEdit && workflowStatus === 'PUBLISHED'
                                ? 'Bài đang hiển thị với khách. Bấm "Cập nhật" sẽ lưu và áp dụng thay đổi ngay.'
                                : isStaff
                                    ? 'Lưu nháp không bắt buộc đủ thông tin. Chỉ "Lưu & gửi duyệt" mới kiểm tra đủ trường.'
                                    : 'Lưu nháp không public. Chỉ "Xuất bản ngay" mới kiểm tra đủ trường và hiển thị với khách.'}
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
                        <button type="button" onClick={handleClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            Hủy
                        </button>
                        {canSaveArticle && (isStaff || isAdmin) && !(isEdit && workflowStatus === 'PUBLISHED') && (
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
                                    : isEdit && workflowStatus === 'PUBLISHED'
                                        ? <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>Cập nhật</>
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
            {showConfirmClose && (
                <UnsavedChangesDialog
                    onContinue={() => setShowConfirmClose(false)}
                    onLeave={() => {
                        setShowConfirmClose(false);
                        onClose();
                    }}
                />
            )}
        </div>
    );
}

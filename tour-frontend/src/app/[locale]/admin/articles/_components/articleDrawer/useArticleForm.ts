'use client';

import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import {
    EMPTY_FORM, CATEGORIES, getErrorMessage, articleToForm, normalizeSeoSlug,
    type Article, type ArticleDrawerProps, type ArticleForm, type SaveAction,
} from './types';

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

export function useArticleForm({ mode, article, userRole = '', onClose, onSuccess }: ArticleDrawerProps) {
    const isEdit = mode === 'edit';
    const isStaff = userRole === 'STAFF';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitAction, setSubmitAction] = useState<SaveAction | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
    const [isSlugEdited, setIsSlugEdited] = useState(false);
    const [imgError, setImgError] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (isPreviewOpen) { setIsPreviewOpen(false); return; }
            if (isPublishConfirmOpen) { setIsPublishConfirmOpen(false); return; }
            onClose();
        };
        window.addEventListener('keydown', h);
        document.body.style.overflow = 'hidden';
        setTimeout(() => titleRef.current?.focus(), 200);
        return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
    }, [isPreviewOpen, isPublishConfirmOpen, onClose]);

    useEffect(() => {
        if (!form.content || form.content === '<p><br></p>') {
            if (form.readTime !== 1) setForm(p => ({ ...p, readTime: 1 }));
            return;
        }
        const plainText = form.content
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .trim();
        const wordCount = plainText.split(/\s+/).filter(Boolean).length;
        const computedTime = Math.max(1, Math.ceil(wordCount / 200));
        if (computedTime !== form.readTime) setForm(p => ({ ...p, readTime: computedTime }));
    }, [form.content, form.readTime]);

    const setField = <K extends keyof ArticleForm>(key: K, value: ArticleForm[K]) => {
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
                headers: {},
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
            const res = await fetchWithAuth(url, {
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

    const handleResetSlug = () => {
        setIsSlugEdited(false);
        setField('slug', normalizeSeoSlug(form.title));
    };

    const handlePrimaryAction = () => {
        if (isStaff) { void handleSave('submit'); return; }
        if (!validateForPublish()) return;
        setIsPublishConfirmOpen(true);
    };

    const isSubmitting = submitAction !== null;
    const activeCat = CATEGORIES.find(c => c.value === form.category) ?? CATEGORIES[0];
    const workflowStatus: DrawerArticleStatus = isEdit ? article?.status ?? 'DRAFT' : 'DRAFT';
    const workflowCopy = DRAWER_STATUS_COPY[workflowStatus];
    const workflowHint = isStaff ? workflowCopy.staffHint : workflowCopy.adminHint;
    const canSaveArticle = isAdmin || (isStaff && (!isEdit || workflowStatus === 'DRAFT' || workflowStatus === 'REJECTED'));

    return {
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
    };
}

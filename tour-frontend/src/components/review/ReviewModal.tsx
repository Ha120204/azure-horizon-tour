import React, { useState } from 'react';
import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import Modal from '@/components/ui/Modal';

type ReviewModalProps = {
    isOpen: boolean;
    onClose: () => void;
    tourId: number;
    onSuccess?: () => void;
};

const MAX_REVIEW_IMAGES = 5;
const MAX_COMMENT_LENGTH = 1000;
const MIN_COMMENT_LENGTH = 20;

type ReviewImage = { file: File; preview: string };

export default function ReviewModal({ isOpen, onClose, tourId, onSuccess }: ReviewModalProps) {
    const { t } = useLocale();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [images, setImages] = useState<ReviewImage[]>([]);

    const titleId = 'review-modal-title';
    const errorId = 'review-modal-error';
    const commentId = 'review-modal-comment';
    const imageInputId = 'review-modal-images';

    const handleCloseModal = () => {
        images.forEach(img => URL.revokeObjectURL(img.preview));
        setImages([]);
        setRating(5);
        setComment('');
        setErrorMsg('');
        onClose();
    };

    const handleRatingKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, star: number) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            setRating(Math.min(5, star + 1));
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            setRating(Math.max(1, star - 1));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const filesArray = Array.from(e.target.files);
        e.target.value = '';
        if (images.length + filesArray.length > MAX_REVIEW_IMAGES) {
            setErrorMsg(t('reviews.maxImages', { count: MAX_REVIEW_IMAGES }));
            return;
        }
        setErrorMsg('');
        setImages(prev => [
            ...prev,
            ...filesArray.map(file => ({ file, preview: URL.createObjectURL(file) })),
        ]);
    };

    const removeImage = (index: number) => {
        setImages(prev => {
            const removed = prev[index];
            if (removed) URL.revokeObjectURL(removed.preview);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (comment.trim().length < MIN_COMMENT_LENGTH) {
            setErrorMsg(t('reviews.commentMinChars'));
            return;
        }
        setIsSubmitting(true);
        setErrorMsg('');
        try {
            const formData = new FormData();
            formData.append('rating', String(rating));
            formData.append('content', comment);
            images.forEach(img => formData.append('images', img.file));

            const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/reviews`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setIsSubmitted(true);
                if (onSuccess) onSuccess();
                setTimeout(() => {
                    setIsSubmitted(false);
                    handleCloseModal();
                }, 2000);
            } else {
                const data = await res.json();
                setErrorMsg(data.message || t('reviews.errorSubmit'));
            }
        } catch {
            setErrorMsg(t('reviews.errorSubmit'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const commentLength = comment.length;
    const isCommentTooShort = commentLength > 0 && commentLength < MIN_COMMENT_LENGTH;

    return (
        <Modal
            open={isOpen}
            onClose={handleCloseModal}
            size="sm"
            labelledBy={titleId}
            className="bg-surface-container-lowest"
        >
            <button
                type="button"
                onClick={handleCloseModal}
                aria-label={t('reviews.cancel')}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            >
                <span className="material-symbols-outlined text-sm">close</span>
            </button>

            <div className="p-8">
                <h2 id={titleId} className="text-2xl font-headline font-bold text-on-surface mb-6">
                    {t('reviews.modalTitle')}
                </h2>

                {isSubmitted ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-tertiary-container/10 text-tertiary-container rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">check_circle</span>
                        </div>
                        <p className="font-bold text-lg text-on-surface">{t('reviews.successMessage')}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {errorMsg && (
                            <div id={errorId} role="alert" className="p-4 bg-error/10 text-error rounded-xl text-sm font-semibold flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {errorMsg}
                            </div>
                        )}

                        {/* Star rating */}
                        <div>
                            <label className="block text-sm font-bold text-on-surface mb-3">
                                {t('reviews.ratingLabel')}
                            </label>
                            <div role="radiogroup" aria-label={t('reviews.ratingLabel')} className="flex gap-2 text-outline-variant">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        role="radio"
                                        aria-checked={rating === star}
                                        aria-label={`${star} ${star === 1 ? t('reviews.star') : t('reviews.stars', { count: star })}`}
                                        tabIndex={rating === star ? 0 : -1}
                                        onClick={() => setRating(star)}
                                        onKeyDown={(event) => handleRatingKeyDown(event, star)}
                                        className={`transition-colors ${star <= rating ? 'text-secondary-container' : 'hover:text-secondary-container/50'}`}
                                    >
                                        <span
                                            className="material-symbols-outlined text-3xl"
                                            style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
                                        >
                                            star
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comment + counter */}
                        <div>
                            <label htmlFor={commentId} className="block text-sm font-bold text-on-surface mb-2">
                                {t('reviews.commentLabel')}
                            </label>
                            <div className="relative">
                                <textarea
                                    id={commentId}
                                    required
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                                    placeholder={t('reviews.commentPlaceholder')}
                                    className={`w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-2 outline-none resize-none min-h-[120px] text-sm text-on-surface pb-8 ${
                                        isCommentTooShort ? 'ring-2 ring-error/50' : 'focus:ring-primary'
                                    }`}
                                />
                                <div className={`absolute bottom-2.5 right-3 text-[11px] font-medium pointer-events-none ${
                                    commentLength >= MAX_COMMENT_LENGTH ? 'text-error' :
                                    isCommentTooShort ? 'text-amber-500' : 'text-outline'
                                }`}>
                                    {commentLength}/{MAX_COMMENT_LENGTH}
                                </div>
                            </div>
                            {isCommentTooShort && (
                                <p className="mt-1 text-xs text-amber-600 font-medium">{t('reviews.commentMinChars')}</p>
                            )}
                        </div>

                        {/* Image attachment */}
                        <div>
                            <label htmlFor={imageInputId} className="inline-flex items-center gap-2 px-4 py-2 border border-outline-variant/30 rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors text-sm font-bold text-on-surface">
                                <span className="material-symbols-outlined text-[20px] text-primary">add_photo_alternate</span>
                                {t('reviews.attachImages')}
                            </label>
                            <input id={imageInputId} type="file" multiple accept="image/*" className="sr-only" onChange={handleImageUpload} />
                            {images.length > 0 && (
                                <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-thin">
                                    {images.map((img, idx) => (
                                        <div key={img.preview} className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 border border-outline-variant/20 group">
                                            <Image src={img.preview} alt={`Review image ${idx + 1}`} fill sizes="64px" className="object-cover" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                aria-label={`Remove image ${idx + 1}`}
                                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-error"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-outline-variant/20">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="flex-1 rounded-full bg-surface-container-high px-4 py-3 text-sm font-bold text-on-surface-variant transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-surface-variant hover:shadow-md active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                {t('reviews.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="group flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-primary disabled:hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                {isSubmitting && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
                                {t('reviews.submit')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
}

import React, { useState } from 'react';
import { useLocale } from '@/app/context/LocaleContext';
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';

type ReviewModalProps = {
    isOpen: boolean;
    onClose: () => void;
    tourId: number;
    onSuccess?: () => void;
};

export default function ReviewModal({ isOpen, onClose, tourId, onSuccess }: ReviewModalProps) {
    const { t } = useLocale();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [images, setImages] = useState<string[]>([]);

    if (!isOpen) return null;

    const handleCloseModal = () => {
        setImages([]);
        setRating(5);
        setComment('');
        setErrorMsg('');
        onClose();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            const base64Promises = filesArray.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });
            const base64Strings = await Promise.all(base64Promises);
            setImages(prev => [...prev, ...base64Strings]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetchWithAuth(`http://localhost:3000/tour/${tourId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating,
                    content: comment,
                    imageUrls: images
                })
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
                setErrorMsg(data.message || t('reviews.errorSubmit') || 'Gửi đánh giá không thành công.');
            }
        } catch (error) {
            setErrorMsg(t('reviews.errorSubmit') || 'Có lỗi xảy ra.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
                <button 
                    onClick={handleCloseModal}
                    className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>

                <div className="p-8">
                    <h2 className="text-2xl font-headline font-bold text-on-surface mb-6">
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
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {errorMsg && (
                                <div className="p-4 bg-error/10 text-error rounded-xl text-sm font-semibold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {errorMsg}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-on-surface mb-3">
                                    {t('reviews.ratingLabel')}
                                </label>
                                <div className="flex gap-2 text-outline-variant">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
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

                            <div>
                                <label className="block text-sm font-bold text-on-surface mb-2">
                                    {t('reviews.commentLabel')}
                                </label>
                                <textarea
                                    required
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder={t('reviews.commentPlaceholder')}
                                    className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-2 focus:ring-primary outline-none resize-none min-h-[120px] text-sm text-on-surface"
                                ></textarea>
                                
                                <div className="mt-4">
                                    <label className="inline-flex items-center gap-2 px-4 py-2 border border-outline-variant/30 rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors text-sm font-bold text-on-surface">
                                        <span className="material-symbols-outlined text-[20px] text-primary">add_photo_alternate</span>
                                        {t('reviews.attachImages')}
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                    
                                    {images.length > 0 && (
                                        <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-thin">
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 border border-outline-variant/20 group">
                                                    <img src={img} alt="review" className="w-full h-full object-cover" />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeImage(idx)} 
                                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error"
                                                    >
                                                        <span className="material-symbols-outlined text-[12px]">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-outline-variant/20">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-3 px-4 rounded-full font-bold text-sm text-on-surface-variant bg-surface-container-high hover:bg-surface-variant transition-colors"
                                >
                                    {t('reviews.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 px-4 rounded-full font-bold text-sm text-on-primary bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {isSubmitting && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
                                    {t('reviews.submit')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

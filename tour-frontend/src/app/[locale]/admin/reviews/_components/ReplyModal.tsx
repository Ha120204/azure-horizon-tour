'use client';

import { useEffect, useRef, useState } from 'react';
import { fmtDate } from '../_lib/helpers';
import type { Review } from '../_lib/types';
import { StarRating } from './StarRating';

export function ReplyModal({
    review,
    onSave,
    onClose,
}: {
    review: Review;
    onSave: (content: string) => Promise<void>;
    onClose: () => void;
}) {
    const [value, setValue] = useState(review.adminReply || '');
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose]);

    const handleSave = async () => {
        if (!value.trim()) return;
        setIsSaving(true);
        await onSave(value.trim());
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface rounded-3xl shadow-2xl w-full max-w-lg animate-fade-slide-up overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-secondary p-5 pr-14 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Phản hồi đánh giá</p>
                    <p className="text-white font-bold truncate">{review.user.fullName}</p>
                    <p className="text-white/60 text-xs mt-0.5 truncate">{review.tour.name}</p>
                </div>
                <div className="px-5 pt-4 pb-3">
                    <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/10">
                        <div className="flex items-center gap-2 mb-2">
                            <StarRating rating={review.rating} size={14} />
                            <span className="text-xs text-on-surface-variant">{fmtDate(review.createdAt)}</span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">{review.content}</p>
                    </div>
                </div>
                <div className="px-5 pb-5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                        Phản hồi của Admin
                    </label>
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        rows={4}
                        placeholder="Viết phản hồi của bạn... Hãy thân thiện, chuyên nghiệp và hữu ích."
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3.5 text-sm text-on-surface resize-none focus:ring-2 focus:ring-primary outline-none transition-colors placeholder:text-outline"
                    />
                    <div className="flex gap-3 mt-3">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors">
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !value.trim()}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</>
                            ) : (
                                <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>Gửi phản hồi</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

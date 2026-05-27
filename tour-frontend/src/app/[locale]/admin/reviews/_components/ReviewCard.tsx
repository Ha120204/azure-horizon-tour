'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AVATAR_COLORS } from '../_lib/config';
import { fmtDate, getInitials } from '../_lib/helpers';
import type { Review } from '../_lib/types';
import { StarRating } from './StarRating';

export function ReviewCard({
    review,
    locale,
    isSelected,
    onToggleSelect,
    onToggleVisibility,
    onDelete,
    onReply,
    onImageClick,
    loadingId,
}: {
    review: Review;
    locale: string;
    isSelected: boolean;
    onToggleSelect: () => void;
    onToggleVisibility: () => void;
    onDelete: () => void;
    onReply: () => void;
    onImageClick: (idx: number) => void;
    loadingId: number | null;
}) {
    const [expanded, setExpanded] = useState(false);
    const isLoading = loadingId === review.id;
    const colorIdx = review.user.id % AVATAR_COLORS.length;
    const isLong = review.content.length > 200;

    return (
        <div className={`group bg-surface-container-lowest rounded-2xl border transition-all duration-300 hover:shadow-lg
      ${isSelected ? 'border-primary shadow-md shadow-primary/10' : 'border-outline-variant/10'}
      ${review.isHidden ? 'opacity-60' : ''}`}
        >
            <div className="p-5 flex gap-4">
                <div className="pt-0.5 shrink-0">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggleSelect}
                        className="w-4.5 h-4.5 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                    />
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            {review.user.avatarUrl ? (
                                <div className={`relative w-10 h-10 rounded-full ring-2 ring-outline-variant/10 shrink-0 overflow-hidden ${review.isHidden ? 'grayscale' : ''}`}>
                                    <Image
                                        src={review.user.avatarUrl}
                                        alt={review.user.fullName}
                                        fill
                                        unoptimized
                                        sizes="40px"
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                    {getInitials(review.user.fullName)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-sm text-on-surface">{review.user.fullName}</span>
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                        Đã xác minh
                                    </span>
                                    {review.isHidden && (
                                        <span className="text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">visibility_off</span>Ẩn
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[12px]">map</span>
                                    <span className="font-medium truncate max-w-[200px]">{review.tour.name}</span>
                                    <span className="text-outline-variant">·</span>
                                    <span>{fmtDate(review.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0"><StarRating rating={review.rating} size={18} /></div>
                    </div>

                    <div>
                        <p className={`text-sm text-on-surface-variant leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                            {review.content}
                        </p>
                        {isLong && (
                            <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary font-semibold mt-1 hover:underline">
                                {expanded ? 'Thu gọn' : 'Xem thêm'}
                            </button>
                        )}
                    </div>

                    {review.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {review.imageUrls.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => onImageClick(i)}
                                    className="relative group/img w-20 h-20 overflow-hidden rounded-lg border border-outline-variant/15"
                                >
                                    <Image
                                        src={img}
                                        alt={`Ảnh ${i + 1}`}
                                        fill
                                        unoptimized
                                        sizes="80px"
                                        className="object-cover transition-opacity hover:opacity-90"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-black/30 rounded-lg transition-opacity">
                                        <span className="material-symbols-outlined text-white text-xl">zoom_in</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {review.adminReply && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 relative">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
                                <span className="text-xs font-bold text-primary uppercase tracking-wide">Azure Horizon</span>
                            </div>
                            <p className="text-sm text-on-surface leading-relaxed">{review.adminReply}</p>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-outline-variant/10">
                        <button
                            onClick={onReply}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-[15px]">reply</span>
                            {review.adminReply ? 'Sửa phản hồi' : 'Phản hồi'}
                        </button>

                        <button
                            onClick={onToggleVisibility}
                            disabled={isLoading}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50
                ${review.isHidden
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-on-surface-variant hover:bg-surface-container'
                                }`}
                        >
                            {isLoading ? (
                                <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-[15px]">
                                    {review.isHidden ? 'visibility' : 'visibility_off'}
                                </span>
                            )}
                            {review.isHidden ? 'Hiện' : 'Ẩn'}
                        </button>

                        <button
                            onClick={onDelete}
                            className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                            Xóa
                        </button>

                        <a
                            href={`/${locale}/tour/${review.tour.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                            Xem tour
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

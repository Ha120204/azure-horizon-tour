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
    const isUnreplied = !review.adminReply?.trim();
    const needsReview = review.rating <= 2;
    const cardTone = isSelected
        ? 'border-primary shadow-md shadow-primary/10'
        : needsReview && !review.isHidden
            ? 'border-orange-200 bg-orange-50/20 shadow-sm shadow-orange-100/40'
            : 'border-outline-variant/10';

    return (
        <div className={`group bg-surface-container-lowest rounded-2xl border transition-all duration-300 hover:shadow-lg ${cardTone} ${review.isHidden ? 'opacity-60' : ''}`}>
            <div className="flex gap-4 p-5">
                <div className="shrink-0 pt-0.5">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggleSelect}
                        aria-label={`Chọn đánh giá của ${review.user.fullName}`}
                        className="h-4.5 w-4.5 cursor-pointer rounded border-outline-variant accent-primary focus:ring-primary focus:ring-offset-0"
                    />
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            {review.user.avatarUrl ? (
                                <div className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-outline-variant/10 ${review.isHidden ? 'grayscale' : ''}`}>
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
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} text-xs font-bold text-white`}>
                                    {getInitials(review.user.fullName)}
                                </div>
                            )}

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-sm font-semibold text-on-surface">{review.user.fullName}</span>
                                    <StatusPill icon="verified" label="Đã xác minh" className="bg-primary/10 text-primary" />
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[12px]">map</span>
                                    <span className="max-w-[240px] truncate font-medium">{review.tour.name}</span>
                                    {review.tour.tourCode && (
                                        <>
                                            <span className="text-outline-variant">·</span>
                                            <span className="font-medium">{review.tour.tourCode}</span>
                                        </>
                                    )}
                                    <span className="text-outline-variant">·</span>
                                    <span>{fmtDate(review.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                            <div className="flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5">
                                <StarRating rating={review.rating} size={17} />
                                <span className="text-xs font-bold text-on-surface">{review.rating}/5</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-start gap-1.5 lg:justify-end">
                                {needsReview && (
                                    <StatusPill icon="priority_high" label="Cần kiểm tra" className="bg-orange-100 text-orange-700" />
                                )}
                                <StatusPill
                                    icon={isUnreplied ? 'forum' : 'mark_chat_read'}
                                    label={isUnreplied ? 'Chưa phản hồi' : 'Đã phản hồi'}
                                    className={isUnreplied ? 'bg-cyan-50 text-cyan-700' : 'bg-emerald-50 text-emerald-700'}
                                />
                                {review.isHidden && (
                                    <StatusPill icon="visibility_off" label="Đang ẩn" className="bg-surface-variant text-on-surface-variant" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className={`max-w-[78ch] text-sm leading-relaxed text-on-surface-variant ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                            {review.content}
                        </p>
                        {isLong && (
                            <button
                                type="button"
                                onClick={() => setExpanded(!expanded)}
                                className="mt-1 text-xs font-semibold text-primary hover:underline"
                            >
                                {expanded ? 'Thu gọn' : 'Xem thêm'}
                            </button>
                        )}
                    </div>

                    {review.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {review.imageUrls.map((img, i) => (
                                <button
                                    key={`${img}-${i}`}
                                    type="button"
                                    onClick={() => onImageClick(i)}
                                    className="group/img relative h-20 w-20 overflow-hidden rounded-lg border border-outline-variant/15"
                                >
                                    <Image
                                        src={img}
                                        alt={`Ảnh đánh giá ${i + 1}`}
                                        fill
                                        unoptimized
                                        sizes="80px"
                                        className="object-cover transition-opacity hover:opacity-90"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 opacity-0 transition-opacity group-hover/img:opacity-100">
                                        <span className="material-symbols-outlined text-xl text-white">zoom_in</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {review.adminReply && (
                        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                            <div className="mb-1.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
                                <span className="text-xs font-bold uppercase tracking-wide text-primary">Phản hồi từ Azure Horizon</span>
                            </div>
                            <p className="text-sm leading-relaxed text-on-surface">{review.adminReply}</p>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/10 pt-3">
                        <button
                            type="button"
                            onClick={onReply}
                            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${isUnreplied
                                ? 'bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary/90'
                                : 'bg-primary/10 text-primary hover:bg-primary/15'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[15px]">reply</span>
                            {isUnreplied ? 'Phản hồi ngay' : 'Sửa phản hồi'}
                        </button>

                        <button
                            type="button"
                            onClick={onToggleVisibility}
                            disabled={isLoading}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${review.isHidden
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-on-surface-variant hover:bg-surface-container'
                                }`}
                        >
                            {isLoading ? (
                                <span className="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-[15px]">
                                    {review.isHidden ? 'visibility' : 'visibility_off'}
                                </span>
                            )}
                            {review.isHidden ? 'Hiện lại' : 'Ẩn'}
                        </button>

                        <a
                            href={`/${locale}/tour/${review.tour.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary"
                        >
                            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                            Xem tour
                        </a>

                        <button
                            type="button"
                            onClick={onDelete}
                            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Xóa đánh giá"
                            aria-label={`Xóa đánh giá của ${review.user.fullName}`}
                        >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                            <span className="hidden sm:inline">Xóa</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusPill({ icon, label, className }: { icon: string; label: string; className: string }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}>
            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            {label}
        </span>
    );
}

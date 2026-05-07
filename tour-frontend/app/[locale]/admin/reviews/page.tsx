'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import AdminPagination from '@/app/components/admin/AdminPagination';
import { API_BASE_URL } from '@/app/lib/constants';


// ─── Types ───────────────────────────────────────────────────────────────────

interface ReviewUser {
    id: number;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
}

interface ReviewTour {
    id: number;
    name: string;
    tourCode: string;
}

interface Review {
    id: number;
    rating: number;
    content: string;
    imageUrls: string[];
    isHidden: boolean;
    adminReply?: string | null;
    createdAt: string;
    updatedAt: string;
    user: ReviewUser;
    tour: ReviewTour;
}

interface AdminStats {
    total: number;
    hidden: number;
    averageRating: number;
    fiveStarRate: number;
    breakdown: Record<number, number>;
}

interface Meta {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
}


const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(d));

const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-teal-400 to-cyan-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-green-600',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <span
                    key={i}
                    className={`material-symbols-outlined ${i <= rating ? 'text-amber-400' : 'text-outline-variant/40'}`}
                    style={{ fontSize: size, fontVariationSettings: "'FILL' 1" }}
                >
                    star
                </span>
            ))}
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 animate-pulse space-y-4">
            <div className="flex gap-4 items-center">
                <div className="w-11 h-11 rounded-full bg-surface-container-high shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-36 bg-surface-container-high rounded" />
                    <div className="h-3 w-24 bg-surface-container rounded" />
                </div>
                <div className="h-4 w-20 bg-surface-container-high rounded" />
            </div>
            <div className="space-y-2">
                <div className="h-3 w-full bg-surface-container-high rounded" />
                <div className="h-3 w-4/5 bg-surface-container rounded" />
                <div className="h-3 w-3/5 bg-surface-container rounded" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-outline-variant/10">
                <div className="h-8 w-20 bg-surface-container-high rounded-lg" />
                <div className="h-8 w-16 bg-surface-container-high rounded-lg" />
                <div className="h-8 w-16 bg-surface-container-high rounded-lg" />
            </div>
        </div>
    );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, ok, onDone }: { msg: string; ok: boolean; onDone: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3500);
        return () => clearTimeout(t);
    }, [onDone]);
    return (
        <div className={`fixed bottom-28 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold animate-fade-in-up max-w-sm
      ${ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {ok ? 'check_circle' : 'error'}
            </span>
            {msg}
        </div>
    );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ images, initial, onClose }: { images: string[]; initial: number; onClose: () => void }) {
    const [idx, setIdx] = useState(initial);
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setIdx((p) => (p + 1) % images.length);
            if (e.key === 'ArrowLeft') setIdx((p) => (p - 1 + images.length) % images.length);
        };
        window.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose, images.length]);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10">
                <span className="material-symbols-outlined">close</span>
            </button>
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIdx((p) => (p - 1 + images.length) % images.length); }}
                        className="absolute left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIdx((p) => (p + 1) % images.length); }}
                        className="absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </>
            )}
            <img
                src={images[idx]}
                alt={`Ảnh ${idx + 1}`}
                className="relative z-10 max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
            {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                            className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white w-5' : 'bg-white/40'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteDialog({
    count,
    onConfirm,
    onCancel,
    isLoading,
}: {
    count: number;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel]);

    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-slide-up">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-red-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface text-center mb-2">Xác nhận xóa?</h3>
                <p className="text-sm text-on-surface-variant text-center leading-relaxed mb-6">
                    Bạn sẽ xóa <strong className="text-on-surface">{count}</strong> đánh giá.{' '}
                    <span className="text-red-600 font-semibold">Thao tác này không thể hoàn tác.</span>
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors disabled:opacity-50"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xóa…</>
                        ) : (
                            <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>Xóa ngay</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Reply Modal ──────────────────────────────────────────────────────────────

function ReplyModal({
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
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-secondary p-5 pr-14 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Phản hồi đánh giá</p>
                    <p className="text-white font-bold truncate">{review.user.fullName}</p>
                    <p className="text-white/60 text-xs mt-0.5 truncate">{review.tour.name}</p>
                </div>
                {/* Original review */}
                <div className="px-5 pt-4 pb-3">
                    <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/10">
                        <div className="flex items-center gap-2 mb-2">
                            <StarRating rating={review.rating} size={14} />
                            <span className="text-xs text-on-surface-variant">{fmtDate(review.createdAt)}</span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">{review.content}</p>
                    </div>
                </div>
                {/* Reply area */}
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

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({
    review,
    isSelected,
    onToggleSelect,
    onToggleVisibility,
    onDelete,
    onReply,
    onImageClick,
    loadingId,
}: {
    review: Review;
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
                {/* Checkbox */}
                <div className="pt-0.5 shrink-0">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggleSelect}
                        className="w-4.5 h-4.5 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                    />
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                    {/* Header row */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            {review.user.avatarUrl ? (
                                <img src={review.user.avatarUrl} alt={review.user.fullName}
                                    className={`w-10 h-10 rounded-full object-cover ring-2 ring-outline-variant/10 shrink-0 ${review.isHidden ? 'grayscale' : ''}`}
                                />
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
                        {/* Stars */}
                        <div className="shrink-0"><StarRating rating={review.rating} size={18} /></div>
                    </div>

                    {/* Content */}
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

                    {/* Images */}
                    {review.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {review.imageUrls.map((img, i) => (
                                <button key={i} onClick={() => onImageClick(i)} className="relative group/img">
                                    <img
                                        src={img}
                                        alt={`Ảnh ${i + 1}`}
                                        className="w-20 h-20 object-cover rounded-lg border border-outline-variant/15 hover:opacity-90 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-black/30 rounded-lg transition-opacity">
                                        <span className="material-symbols-outlined text-white text-xl">zoom_in</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Admin Reply */}
                    {review.adminReply && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 relative">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
                                <span className="text-xs font-bold text-primary uppercase tracking-wide">Azure Horizon</span>
                            </div>
                            <p className="text-sm text-on-surface leading-relaxed">{review.adminReply}</p>
                        </div>
                    )}

                    {/* Action bar */}
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
                            href={`/vi/tour/${review.tour.id}`}
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
    icon, label, value, sub, gradient, iconBg, iconColor,
}: {
    icon: string; label: string; value: string | number; sub: string;
    gradient: string; iconBg: string; iconColor: string;
}) {
    return (
        <div className="relative bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-gradient-to-br ${gradient} opacity-[0.07] group-hover:opacity-[0.13] transition-opacity`} />
            <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
                <span className={`material-symbols-outlined text-xl ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <p className="text-2xl font-extrabold text-on-surface leading-tight">{value}</p>
            <p className="text-xs font-semibold text-on-surface-variant mt-1">{label}</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{sub}</p>
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ meta, onChange }: { meta: Meta; onChange: (page: number) => void }) {
    if (meta.totalPages <= 1) return null;
    const pages: (number | '...')[] = [];
    const { currentPage: cp, totalPages: tp } = meta;
    if (tp <= 7) {
        for (let i = 1; i <= tp; i++) pages.push(i);
    } else {
        pages.push(1);
        if (cp > 3) pages.push('...');
        for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i);
        if (cp < tp - 2) pages.push('...');
        pages.push(tp);
    }
    return (
        <div className="flex items-center justify-center gap-1.5 mt-8">
            <button disabled={cp === 1} onClick={() => onChange(cp - 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-30 transition-colors">
                <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-on-surface-variant text-sm">…</span>
                ) : (
                    <button key={p} onClick={() => onChange(p as number)}
                        className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors
              ${cp === p ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}>
                        {p}
                    </button>
                )
            )}
            <button disabled={cp === tp} onClick={() => onChange(cp + 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-30 transition-colors">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReviewManagementPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<AdminStats>({
        total: 0, hidden: 0, averageRating: 0, fiveStarRate: 0,
        breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
    const [meta, setMeta] = useState<Meta>({ totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 });
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [ratingFilter, setRatingFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);


    // UI state
    const [selected, setSelected] = useState<number[]>([]);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<number[] | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [replyTarget, setReplyTarget] = useState<Review | null>(null);
    const [lightbox, setLightbox] = useState<{ images: string[]; idx: number } | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce search
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [search]);

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
    }, []);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/stats`);
            const json = await res.json();
            setStats(json?.data ?? json);
        } catch { /* silent */ }
    }, []);

    // Fetch reviews
    const fetchReviews = useCallback(async () => {
        setIsLoading(true);
        try {
            const qs = new URLSearchParams();
            qs.set('page', String(page));
            qs.set('limit', String(pageSize));

            if (debouncedSearch) qs.set('search', debouncedSearch);
            if (ratingFilter) qs.set('rating', ratingFilter);
            if (statusFilter) qs.set('status', statusFilter);
            if (sortBy) qs.set('sortBy', sortBy);

            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/all?${qs}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message ?? 'Lỗi API');

            // TransformInterceptor giữ meta/stats ngoài, chỉ unwrap data:
            // Service trả: { data: Review[], meta: {...} }
            // Interceptor xử lý: responseData = service.data (vì service.data được set)
            // Kết quả JSON: { statusCode, data: Review[], meta: {...}, timestamp }
            const reviews: Review[] = Array.isArray(json?.data) ? json.data : [];
            const metaFromRes = json?.meta;

            setReviews(reviews);
            if (metaFromRes) setMeta(metaFromRes);
        } catch (err: any) {
            console.error('[ReviewPage] fetchReviews error:', err);
            showToast('Lỗi tải danh sách đánh giá', false);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, debouncedSearch, ratingFilter, statusFilter, sortBy]);


    useEffect(() => { fetchReviews(); }, [fetchReviews]);
    useEffect(() => { fetchStats(); }, [fetchStats]);

    // Selection helpers
    const toggleSelect = (id: number) =>
        setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    const isAllSelected = reviews.length > 0 && reviews.every((r) => selected.includes(r.id));
    const toggleSelectAll = () =>
        setSelected(isAllSelected ? [] : reviews.map((r) => r.id));
    const clearSelection = () => setSelected([]);

    // Actions
    const handleToggleVisibility = async (review: Review) => {
        setLoadingId(review.id);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/${review.id}/visibility`, { method: 'PATCH' });
            const json = await res.json();
            if (!res.ok) throw new Error();
            const updated: Review = json?.data ?? json;
            setReviews((prev) => prev.map((r) => r.id === review.id ? updated : r));
            setStats((prev) => ({
                ...prev,
                hidden: updated.isHidden ? prev.hidden + 1 : Math.max(0, prev.hidden - 1),
            }));
            showToast(updated.isHidden ? 'Đã ẩn đánh giá' : 'Đã hiện đánh giá');
        } catch {
            showToast('Không thể thay đổi trạng thái', false);
        } finally {
            setLoadingId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            if (deleteTarget.length === 1) {
                const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/${deleteTarget[0]}`, { method: 'DELETE' });
                if (!res.ok) throw new Error();
            } else {
                const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/bulk/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: deleteTarget }),
                });
                if (!res.ok) throw new Error();
            }
            setReviews((prev) => prev.filter((r) => !deleteTarget.includes(r.id)));
            setSelected((prev) => prev.filter((id) => !deleteTarget.includes(id)));
            showToast(`Đã xóa ${deleteTarget.length} đánh giá`);
            fetchStats();
        } catch {
            showToast('Xóa thất bại. Vui lòng thử lại.', false);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    const handleReply = async (content: string) => {
        if (!replyTarget) return;
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/${replyTarget.id}/reply`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error();
            const updated: Review = json?.data ?? json;
            setReviews((prev) => prev.map((r) => r.id === replyTarget.id ? updated : r));
            showToast('Đã lưu phản hồi');
            setReplyTarget(null);
        } catch {
            showToast('Không thể lưu phản hồi', false);
        }
    };

    const handleBulkHide = async () => {
        setBulkLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/review/admin/bulk/hide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selected }),
            });
            if (!res.ok) throw new Error();
            setReviews((prev) => prev.map((r) => selected.includes(r.id) ? { ...r, isHidden: true } : r));
            showToast(`Đã ẩn ${selected.length} đánh giá`);
            fetchStats();
            clearSelection();
        } catch {
            showToast('Thao tác thất bại', false);
        } finally {
            setBulkLoading(false);
        }
    };

    const resetFilters = () => {
        setSearch(''); setRatingFilter(''); setStatusFilter(''); setSortBy('newest'); setPage(1);
    };
    const hasFilter = !!(search || ratingFilter || statusFilter || sortBy !== 'newest');

    const kpis = [
        {
            icon: 'rate_review', label: 'Tổng đánh giá', value: stats.total.toLocaleString('vi-VN'),
            sub: `${stats.total - stats.hidden} đang hiển thị`,
            gradient: 'from-blue-600 to-indigo-600', iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
        },
        {
            icon: 'star', label: 'Điểm trung bình', value: `${stats.averageRating} ★`,
            sub: 'trên thang điểm 5',
            gradient: 'from-amber-400 to-orange-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-500',
        },
        {
            icon: 'workspace_premium', label: 'Tỷ lệ 5 sao', value: `${stats.fiveStarRate}%`,
            sub: `${stats.breakdown[5] ?? 0} đánh giá xuất sắc`,
            gradient: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
        },
        {
            icon: 'visibility_off', label: 'Đang ẩn', value: stats.hidden.toLocaleString('vi-VN'),
            sub: 'đánh giá bị ẩn',
            gradient: 'from-red-400 to-rose-500', iconBg: 'bg-red-50', iconColor: 'text-red-500',
        },
    ];

    return (
        <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1400px] mx-auto">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface">
                        Quản Lý Đánh Giá
                    </h1>
                    <p className="text-on-surface-variant text-sm mt-1">
                        Kiểm duyệt, phản hồi và quản lý feedback từ khách hàng.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { fetchReviews(); fetchStats(); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                        Làm mới
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
            </div>

            {/* ── Rating Breakdown Bar ─────────────────────────────── */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-5 mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">bar_chart</span>
                    Phân bố đánh giá
                </p>
                <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = stats.breakdown[star] ?? 0;
                        const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                        return (
                            <div key={star} className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-14 shrink-0">
                                    <span className="text-xs font-semibold text-on-surface-variant">{star}</span>
                                    <span className="material-symbols-outlined text-amber-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                </div>
                                <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="text-xs text-on-surface-variant w-16 text-right shrink-0">{count} ({pct}%)</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Filters ─────────────────────────────────────────── */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-4 mb-5">
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="flex-1 min-w-[220px] relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">search</span>
                        <input
                            id="rv-search"
                            type="search"
                            placeholder="Tìm theo khách hàng, tour, nội dung…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                        />
                    </div>

                    {/* Rating filter */}
                    <select
                        id="rv-rating"
                        value={ratingFilter}
                        onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
                        className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <option value="">Tất cả sao</option>
                        <option value="5">⭐⭐⭐⭐⭐ 5 sao</option>
                        <option value="4">⭐⭐⭐⭐ 4 sao</option>
                        <option value="3">⭐⭐⭐ 3 sao</option>
                        <option value="2">⭐⭐ 2 sao</option>
                        <option value="1">⭐ 1 sao</option>
                    </select>

                    {/* Status filter */}
                    <select
                        id="rv-status"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="visible">Đang hiển thị</option>
                        <option value="hidden">Đang ẩn</option>
                    </select>

                    {/* Sort */}
                    <select
                        id="rv-sort"
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                        className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm text-on-surface appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <option value="newest">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                        <option value="rating_desc">Sao cao nhất</option>
                        <option value="rating_asc">Sao thấp nhất</option>
                    </select>

                    {hasFilter && (
                        <button onClick={resetFilters}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-error border border-error/30 hover:bg-error/5 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                            Xóa lọc
                        </button>
                    )}

                    {!isLoading && (
                        <span className="ml-auto text-xs text-on-surface-variant whitespace-nowrap font-medium">
                            {meta.totalItems.toLocaleString('vi-VN')} đánh giá
                        </span>
                    )}
                </div>
            </div>

            {/* ── Review List ─────────────────────────────────────── */}
            {/* Select all row */}
            {!isLoading && reviews.length > 0 && (
                <div className="flex items-center gap-3 mb-3 px-1">
                    <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-on-surface-variant font-medium">
                        {isAllSelected ? `Đã chọn tất cả ${reviews.length}` : `Chọn tất cả trên trang này`}
                    </span>
                </div>
            )}

            <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                ) : reviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
                        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-outline">rate_review</span>
                        </div>
                        <p className="font-bold text-on-surface">Không tìm thấy đánh giá nào</p>
                        <p className="text-sm text-on-surface-variant mt-1 mb-4">
                            {hasFilter ? 'Thử thay đổi bộ lọc để xem kết quả.' : 'Chưa có đánh giá nào trong hệ thống.'}
                        </p>
                        {hasFilter && (
                            <button onClick={resetFilters} className="text-sm text-primary font-semibold hover:underline">
                                Xóa tất cả bộ lọc
                            </button>
                        )}
                    </div>
                ) : (
                    reviews.map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            isSelected={selected.includes(review.id)}
                            onToggleSelect={() => toggleSelect(review.id)}
                            onToggleVisibility={() => handleToggleVisibility(review)}
                            onDelete={() => setDeleteTarget([review.id])}
                            onReply={() => setReplyTarget(review)}
                            onImageClick={(idx) => setLightbox({ images: review.imageUrls, idx })}
                            loadingId={loadingId}
                        />
                    ))
                )}
            </div>

            {/* ── Pagination ─────────────────────────────────────── */}
            <div className="mt-8">
                <AdminPagination
                    currentPage={meta.currentPage}
                    totalPages={meta.totalPages}
                    totalItems={meta.totalItems}
                    pageSize={pageSize}
                    onPageChange={(p) => { setPage(p); setSelected([]); }}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); setSelected([]); }}
                    itemLabel="đánh giá"
                />
            </div>

            {/* ── Bulk Action Bar ─────────────────────────────────── */}
            {selected.length > 0 && (
                <div className="fixed bottom-8 left-1/2 md:translate-x-[calc(-50%+128px)] -translate-x-1/2 bg-surface-container-lowest/95 backdrop-blur-md px-6 py-3.5 rounded-full shadow-2xl border border-outline-variant/20 flex items-center gap-4 z-50 animate-fade-in-up">
                    <span className="text-sm font-bold text-on-surface">
                        {selected.length} đã chọn
                    </span>
                    <div className="h-5 w-px bg-outline-variant/30" />
                    <button
                        onClick={handleBulkHide}
                        disabled={bulkLoading}
                        className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                        Ẩn
                    </button>
                    <button
                        onClick={() => setDeleteTarget(selected)}
                        disabled={bulkLoading}
                        className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Xóa
                    </button>
                    <button
                        onClick={clearSelection}
                        className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            )}

            {/* ── Overlays ─────────────────────────────────────────── */}
            {lightbox && (
                <Lightbox
                    images={lightbox.images}
                    initial={lightbox.idx}
                    onClose={() => setLightbox(null)}
                />
            )}

            {deleteTarget && (
                <DeleteDialog
                    count={deleteTarget.length}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                    isLoading={isDeleting}
                />
            )}

            {replyTarget && (
                <ReplyModal
                    review={replyTarget}
                    onSave={handleReply}
                    onClose={() => setReplyTarget(null)}
                />
            )}

            {toast && (
                <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
            )}
        </main>
    );
}

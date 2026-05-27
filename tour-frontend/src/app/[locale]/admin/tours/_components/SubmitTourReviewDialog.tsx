'use client';

import { useEffect } from 'react';
import { formatCurrency, getTourStatusBadge } from '../_lib/helpers';
import type { Tour } from '../_lib/types';

export function SubmitTourReviewDialog({ tour, onConfirm, onCancel, isSubmitting }: {
    tour: Tour;
    onConfirm: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
}) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSubmitting) onCancel(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isSubmitting, onCancel]);

    const status = getTourStatusBadge(tour.status ?? 'DRAFT');
    const title = tour.name?.trim() || 'Bản nháp chưa có tên tour';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="submit-tour-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!isSubmitting) onCancel(); }} />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl animate-fade-slide-up">
                <div className="border-b border-outline-variant/10 bg-amber-50/80 px-6 py-5">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>approval</span>
                        </div>
                        <div className="min-w-0">
                            <h3 id="submit-tour-title" className="text-lg font-bold text-on-surface">Gửi tour để Admin duyệt?</h3>
                            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                                Sau khi gửi, tour sẽ chuyển sang trạng thái chờ duyệt. Bạn chỉ chỉnh sửa tiếp khi Admin từ chối và gửi phản hồi.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5">
                    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${status.cls}`}>
                                <span className="material-symbols-outlined text-[14px]">{status.icon}</span>{status.label}
                            </span>
                            <span className="text-[11px] font-semibold text-on-surface-variant">{tour.destination?.name ?? 'Chưa chọn điểm đến'}</span>
                        </div>
                        <p className="line-clamp-2 text-sm font-bold leading-snug text-on-surface">&ldquo;{title}&rdquo;</p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-on-surface-variant">
                            <span className="rounded-lg bg-surface-container px-2 py-1">{tour.duration || 'Chưa có thời lượng'}</span>
                            <span className="rounded-lg bg-surface-container px-2 py-1">{tour.availableSeats || 0} ghế</span>
                            <span className="rounded-lg bg-surface-container px-2 py-1">{formatCurrency(tour.price || 0)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 px-6 pb-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 rounded-xl border border-outline-variant/20 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                        {isSubmitting
                            ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang gửi…</>
                            : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>Xác nhận gửi</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

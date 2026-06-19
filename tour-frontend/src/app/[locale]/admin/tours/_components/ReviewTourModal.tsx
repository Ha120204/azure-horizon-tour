'use client';

import { useState } from 'react';

interface ReviewTourModalProps {
    tour: { id: number; name: string };
    action: 'approve' | 'reject';
    onConfirm: (action: 'approve' | 'reject', note?: string) => Promise<void>;
    onClose: () => void;
}

export default function ReviewTourModal({ tour, action, onConfirm, onClose }: ReviewTourModalProps) {
    const [note, setNote] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const isApprove = action === 'approve';

    const handleSubmit = async () => {
        if (!isApprove && !note.trim()) {
            setError('Vui lòng nhập lý do từ chối');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await onConfirm(action, note.trim() || undefined);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-slide-up">
                {/* Header */}
                <div className={`px-7 pt-7 pb-5 flex items-start gap-4`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isApprove ? 'bg-emerald-100' : 'bg-error/10'}`}>
                        <span
                            className={`material-symbols-outlined text-2xl ${isApprove ? 'text-emerald-600' : 'text-error'}`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            {isApprove ? 'verified' : 'cancel'}
                        </span>
                    </div>
                    <div className="flex-1 pt-1">
                        <h2 id="review-modal-title" className="text-base font-bold text-on-surface">
                            {isApprove ? 'Duyệt và Phát hành Tour?' : 'Từ chối Tour này?'}
                        </h2>
                        <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                            {isApprove
                                ? <>Tour <strong className="text-on-surface">&quot;{tour.name}&quot;</strong> sẽ được phát hành công khai và khách hàng có thể đặt ngay.</>
                                : <>Tour <strong className="text-on-surface">&quot;{tour.name}&quot;</strong> sẽ bị trả về cho Staff với lý do từ chối.</>
                            }
                        </p>
                    </div>
                </div>

                {/* Reject note */}
                {!isApprove && (
                    <div className="px-7 pb-2">
                        <label htmlFor="review-note" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                            Lý do từ chối <span className="text-error">*</span>
                        </label>
                        <textarea
                            id="review-note"
                            rows={4}
                            value={note}
                            onChange={e => { setNote(e.target.value); setError(''); }}
                            placeholder="Nhập lý do cụ thể để Staff có thể chỉnh sửa lại…"
                            className={`w-full bg-surface-container-low border rounded-2xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-error resize-none transition-colors ${error ? 'border-error' : 'border-outline-variant/20'}`}
                            autoFocus
                        />
                        {error && (
                            <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">error</span>
                                {error}
                            </p>
                        )}
                    </div>
                )}

                {/* Approve info note */}
                {isApprove && (
                    <div className="mx-7 mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200/60 rounded-2xl">
                        <p className="text-xs text-emerald-700 leading-relaxed flex items-start gap-2">
                            <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">info</span>
                            Tour sẽ ngay lập tức hiển thị công khai trên website và khách hàng có thể tìm kiếm, đặt tour.
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="px-7 pb-7 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-2xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${isApprove
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]'
                            : 'bg-error text-on-error hover:opacity-90 active:scale-[0.98]'
                        }`}
                    >
                        {isLoading ? (
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined text-[18px]">
                                {isApprove ? 'check_circle' : 'cancel'}
                            </span>
                        )}
                        {isLoading ? 'Đang xử lý…' : (isApprove ? 'Xác nhận Duyệt' : 'Xác nhận Từ chối')}
                    </button>
                </div>
            </div>
        </div>
    );
}

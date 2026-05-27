'use client';

import { useEffect } from 'react';

export function DeleteDialog({
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

'use client';

import type { Tour, TrashedTour } from '../_lib/types';

interface BulkHideConfirmDialogProps {
    selectedCount: number;
    isBulkDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export function BulkHideConfirmDialog({ selectedCount, isBulkDeleting, onCancel, onConfirm }: BulkHideConfirmDialogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="bulk-hide-dialog-title">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={isBulkDeleting ? undefined : onCancel} />
            <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-amber-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>hide_source</span>
                </div>
                <h3 id="bulk-hide-dialog-title" className="mb-2 text-center text-lg font-bold text-on-surface">Chuyển tour vào thùng rác?</h3>
                <p className="mb-3 text-center text-sm leading-relaxed text-on-surface-variant">
                    Bạn sắp ẩn <strong className="text-amber-700">{selectedCount} tour</strong> khỏi trang khách hàng.
                    Các tour này sẽ nằm trong <strong className="text-on-surface">Thùng rác</strong> và có thể khôi phục.
                </p>
                <p className="mb-5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                    Nếu bạn là nhân viên, chỉ bản nháp hoặc tour bị từ chối do bạn tạo mới được chọn để thao tác.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isBulkDeleting}
                        className="flex-1 rounded-xl border border-outline-variant/20 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isBulkDeleting}
                        className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-500 outline-none"
                    >
                        {isBulkDeleting
                            ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang chuyển...</>
                            : <><span className="material-symbols-outlined text-base">hide_source</span> Chuyển vào thùng rác</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

interface BulkPermanentDeleteDialogProps {
    selectedCount: number;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export function BulkPermanentDeleteDialog({ selectedCount, isDeleting, onCancel, onConfirm }: BulkPermanentDeleteDialogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="alertdialog" aria-modal="true" aria-labelledby="bulk-perm-delete-dialog-title">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-7">
                    <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center mb-5">
                        <span className="material-symbols-outlined text-error text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
                    </div>
                    <h2 id="bulk-perm-delete-dialog-title" className="text-lg font-bold text-on-surface mb-2">Xóa vĩnh viễn tour đã chọn?</h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed mb-3">
                        Bạn đang chọn <strong className="text-on-surface">{selectedCount}</strong> tour. Hệ thống chỉ xóa vĩnh viễn tour chưa phát sinh booking; tour đã có booking sẽ được giữ lại.
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-error/8 rounded-xl border border-error/20">
                        <span className="material-symbols-outlined text-error text-[16px] mt-0.5">warning</span>
                        <p className="text-xs text-error font-semibold">Hành động này không thể hoàn tác với các tour đủ điều kiện xóa.</p>
                    </div>
                </div>
                <div className="px-7 pb-6 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-60"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-6 py-2.5 bg-error text-on-error rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
                    >
                        {isDeleting ? (
                            <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xóa...</>
                        ) : (
                            <><span className="material-symbols-outlined text-base">delete_forever</span>Xóa vĩnh viễn</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface PermanentDeleteDialogProps {
    tour: TrashedTour;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export function PermanentDeleteDialog({ tour, isDeleting, onCancel, onConfirm }: PermanentDeleteDialogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="alertdialog" aria-modal="true" aria-labelledby="perm-delete-dialog-title">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-7">
                    <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center mb-5">
                        <span className="material-symbols-outlined text-error text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>delete_forever</span>
                    </div>
                    <h2 id="perm-delete-dialog-title" className="text-lg font-bold text-on-surface mb-2">Xóa Vĩnh Viễn?</h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed mb-3">
                        Tour <strong className="text-on-surface">&ldquo;{tour.name}&rdquo;</strong> sẽ bị <strong className="text-error">xóa hoàn toàn khỏi cơ sở dữ liệu</strong>, bao gồm hình ảnh, gói tour và ngày khởi hành liên quan.
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-error/8 rounded-xl border border-error/20">
                        <span className="material-symbols-outlined text-error text-[16px] mt-0.5">warning</span>
                        <p className="text-xs text-error font-semibold">Hành động này không thể hoàn tác. Tour đã có booking sẽ bị backend chặn xóa vĩnh viễn.</p>
                    </div>
                </div>
                <div className="px-7 pb-6 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-6 py-2.5 bg-error text-on-error rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
                    >
                        {isDeleting ? (
                            <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang xóa…</>
                        ) : (
                            <><span className="material-symbols-outlined text-base">delete_forever</span>Xóa vĩnh viễn</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface DeleteTourDialogProps {
    tour: Tour;
    isStaff: boolean;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export function DeleteTourDialog({ tour, isStaff, isDeleting, onCancel, onConfirm }: DeleteTourDialogProps) {
    const isDraftDelete = isStaff && (tour.status === 'DRAFT' || tour.status === 'REJECTED');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            style={{ overscrollBehavior: 'contain' }}
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-7">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-5">
                        <span className="material-symbols-outlined text-amber-600 text-2xl" aria-hidden="true">hide_source</span>
                    </div>
                    <h2 id="delete-dialog-title" className="text-lg font-bold text-on-surface mb-2">
                        {isDraftDelete ? 'Xác nhận xóa bản nháp?' : 'Xác nhận Ẩn Tour?'}
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                        {isDraftDelete
                            ? <>Bản nháp <strong className="text-on-surface">&ldquo;{tour.name}&rdquo;</strong> sẽ bị xóa khỏi danh sách của bạn.</>
                            : <>Tour <strong className="text-on-surface">&ldquo;{tour.name}&rdquo;</strong> sẽ bị ẩn khỏi danh sách và không hiển thị với khách hàng. Dữ liệu vẫn được lưu trữ và có thể khôi phục bởi quản trị viên.</>}
                    </p>
                </div>
                <div className="px-7 pb-6 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-6 py-2.5 bg-error text-on-error rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-error outline-none"
                    >
                        {isDeleting ? (
                            <>
                                <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                                Đang xử lý…
                            </>
                        ) : (
                            isDraftDelete ? 'Xóa bản nháp' : 'Ẩn Tour'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

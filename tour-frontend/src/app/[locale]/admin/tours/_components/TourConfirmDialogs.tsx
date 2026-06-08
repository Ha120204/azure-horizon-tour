'use client';

import Dialog from '@/components/ui/Dialog';
import type { Tour, TrashedTour } from '../_lib/types';

interface BulkHideConfirmDialogProps {
    selectedCount: number;
    isBulkDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export function BulkHideConfirmDialog({ selectedCount, isBulkDeleting, onCancel, onConfirm }: BulkHideConfirmDialogProps) {
    return (
        <Dialog
            open
            onClose={isBulkDeleting ? () => {} : onCancel}
            variant="warning"
            icon="hide_source"
            title="Chuyển tour vào thùng rác?"
            description={
                <>
                    <p>
                        Bạn sắp ẩn <strong className="text-amber-700">{selectedCount} tour</strong> khỏi trang khách hàng.
                        Các tour này sẽ nằm trong <strong className="text-on-surface">Thùng rác</strong> và có thể khôi phục.
                    </p>
                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                        Nếu bạn là nhân viên, chỉ bản nháp hoặc tour bị từ chối do bạn tạo mới được chọn để thao tác.
                    </p>
                </>
            }
            confirmLabel="Chuyển vào thùng rác"
            onConfirm={onConfirm}
            loading={isBulkDeleting}
        />
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
        <Dialog
            open
            onClose={onCancel}
            closeOnBackdrop={false}
            variant="danger"
            icon="delete_forever"
            title="Xóa vĩnh viễn tour đã chọn?"
            description={
                <>
                    <p>
                        Bạn đang chọn <strong className="text-on-surface">{selectedCount}</strong> tour.
                        Hệ thống chỉ xóa vĩnh viễn tour chưa phát sinh booking; tour đã có booking sẽ được giữ lại.
                    </p>
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-error/20 bg-error/5 p-3">
                        <span className="material-symbols-outlined mt-0.5 text-[16px] text-error">warning</span>
                        <p className="text-xs font-semibold text-error">Hành động này không thể hoàn tác với các tour đủ điều kiện xóa.</p>
                    </div>
                </>
            }
            confirmLabel="Xóa vĩnh viễn"
            onConfirm={onConfirm}
            loading={isDeleting}
        />
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
        <Dialog
            open
            onClose={onCancel}
            closeOnBackdrop={false}
            variant="danger"
            icon="delete_forever"
            title="Xóa Vĩnh Viễn?"
            description={
                <>
                    <p>
                        Tour <strong className="text-on-surface">&ldquo;{tour.name}&rdquo;</strong> sẽ bị{' '}
                        <strong className="text-error">xóa hoàn toàn khỏi cơ sở dữ liệu</strong>,
                        bao gồm hình ảnh, gói tour và ngày khởi hành liên quan.
                    </p>
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-error/20 bg-error/5 p-3">
                        <span className="material-symbols-outlined mt-0.5 text-[16px] text-error">warning</span>
                        <p className="text-xs font-semibold text-error">Hành động này không thể hoàn tác. Tour đã có booking sẽ bị backend chặn xóa vĩnh viễn.</p>
                    </div>
                </>
            }
            confirmLabel="Xóa vĩnh viễn"
            onConfirm={onConfirm}
            loading={isDeleting}
        />
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
        <Dialog
            open
            onClose={onCancel}
            variant="warning"
            icon="hide_source"
            title={isDraftDelete ? 'Xác nhận xóa bản nháp?' : 'Xác nhận Ẩn Tour?'}
            description={
                isDraftDelete ? (
                    <>Bản nháp <strong className="text-on-surface">&ldquo;{tour.name}&rdquo;</strong> sẽ bị xóa khỏi danh sách của bạn.</>
                ) : (
                    <>Tour <strong className="text-on-surface">&ldquo;{tour.name}&rdquo;</strong> sẽ bị ẩn khỏi danh sách và không hiển thị với khách hàng. Dữ liệu vẫn được lưu trữ và có thể khôi phục bởi quản trị viên.</>
                )
            }
            confirmLabel={isDraftDelete ? 'Xóa bản nháp' : 'Ẩn Tour'}
            onConfirm={onConfirm}
            loading={isDeleting}
        />
    );
}

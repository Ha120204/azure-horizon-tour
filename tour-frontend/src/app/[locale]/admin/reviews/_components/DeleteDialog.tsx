'use client';

import Dialog from '@/components/ui/Dialog';

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
    return (
        <Dialog
            open
            onClose={onCancel}
            variant="danger"
            icon="delete_forever"
            title="Xác nhận xóa?"
            description={
                <>
                    Bạn sẽ xóa <strong className="text-on-surface">{count}</strong> đánh giá.{' '}
                    <span className="text-error font-semibold">Thao tác này không thể hoàn tác.</span>
                </>
            }
            confirmLabel="Xóa ngay"
            onConfirm={onConfirm}
            loading={isLoading}
        />
    );
}

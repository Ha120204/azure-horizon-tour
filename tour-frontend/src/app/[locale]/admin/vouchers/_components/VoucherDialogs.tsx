import Dialog from '@/components/ui/Dialog';
import type { ToastState, Voucher } from '../_lib/types';

interface DeleteVoucherDialogProps {
  voucher: Voucher;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteVoucherDialog({ voucher, isDeleting, onCancel, onConfirm }: DeleteVoucherDialogProps) {
  const description = (
    <>
      <p>
        Bạn sắp xóa voucher{' '}
        <strong className="text-on-surface font-mono">&ldquo;{voucher.code}&rdquo;</strong>.
      </p>
      {voucher.usedCount > 0 && (
        <div className="mt-3 p-3 bg-error/5 border border-error/20 rounded-xl flex items-start gap-2">
          <span className="material-symbols-outlined text-error text-base mt-0.5" aria-hidden="true">warning</span>
          <p className="text-sm text-error">
            Voucher này đã được sử dụng <strong>{voucher.usedCount} lần</strong>. Server sẽ từ chối xóa — hãy vô hiệu hóa thay thế.
          </p>
        </div>
      )}
    </>
  );

  return (
    <Dialog
      open
      onClose={onCancel}
      variant="danger"
      icon="delete_forever"
      title="Xóa Voucher?"
      description={description}
      confirmLabel="Xóa Voucher"
      onConfirm={onConfirm}
      loading={isDeleting}
    />
  );
}

export function VoucherToast({ toast }: { toast: ToastState | null }) {
  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.message}</div>
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${
            toast.type === 'error' ? 'bg-error text-on-error' : 'bg-tertiary text-on-tertiary'
          }`}
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.message}
        </div>
      )}
    </>
  );
}

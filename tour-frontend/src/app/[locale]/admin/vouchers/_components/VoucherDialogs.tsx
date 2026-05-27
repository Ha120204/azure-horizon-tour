import type { ToastState, Voucher } from '../_lib/types';

interface DeleteVoucherDialogProps {
  voucher: Voucher;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteVoucherDialog({ voucher, isDeleting, onCancel, onConfirm }: DeleteVoucherDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-voucher-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-7">
          <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-error text-2xl" aria-hidden="true">delete_forever</span>
          </div>
          <h2 id="delete-voucher-title" className="text-lg font-bold text-on-surface mb-2">Xóa Voucher?</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">
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
                Đang xóa…
              </>
            ) : (
              'Xóa Voucher'
            )}
          </button>
        </div>
      </div>
    </div>
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

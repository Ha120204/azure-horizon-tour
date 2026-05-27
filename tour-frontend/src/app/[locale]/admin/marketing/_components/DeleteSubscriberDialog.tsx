import type { Subscriber } from '../_lib/types';

interface DeleteSubscriberDialogProps {
  subscriber: Subscriber;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteSubscriberDialog({
  subscriber,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteSubscriberDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-950/50" onClick={onCancel} aria-label="Đóng" />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined">delete</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-950">Xóa người đăng ký?</h2>
          <p className="text-sm text-slate-500 mt-2">
            Email <strong className="text-slate-900">{subscriber.email}</strong> sẽ bị xóa khỏi danh sách nhận tin.
          </p>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onCancel} className="h-10 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-10 px-4 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}

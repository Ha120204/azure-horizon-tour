'use client';

interface UnsavedChangesDialogProps {
  onContinue: () => void;
  onLeave: () => void;
}

export function UnsavedChangesDialog({ onContinue, onLeave }: UnsavedChangesDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm animate-fade-slide-up">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <span
            className="material-symbols-outlined text-amber-600 text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
        </div>
        <h3 className="text-base font-bold text-on-surface text-center mb-2">
          Rời khỏi không lưu?
        </h3>
        <p className="text-sm text-on-surface-variant text-center mb-6 leading-relaxed">
          Bạn có thay đổi chưa được lưu. Nếu rời, mọi chỉnh sửa sẽ mất.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onContinue}
            className="flex-1 py-3 rounded-2xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Tiếp tục chỉnh sửa
          </button>
          <button
            onClick={onLeave}
            className="flex-1 py-3 rounded-2xl bg-error text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Rời khỏi
          </button>
        </div>
      </div>
    </div>
  );
}

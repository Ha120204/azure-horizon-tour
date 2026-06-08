"use client";

interface TourFormFooterProps {
  finalActionText: string;
  isStaff: boolean;
  isAdminLike: boolean;
  isSaving: boolean;
  saveAction: "draft" | "submit" | null;
  primaryIcon: string;
  primaryLabel: string;
  onCloseAttempt: () => void;
  onSave: (action: "draft" | "submit") => void;
}

export function TourFormFooter({
  finalActionText,
  isStaff,
  isAdminLike,
  isSaving,
  saveAction,
  primaryIcon,
  primaryLabel,
  onCloseAttempt,
  onSave,
}: TourFormFooterProps) {
  return (
    <div className="px-5 py-4 sm:px-7 sm:py-5 border-t border-outline-variant/10 bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
      <p className="text-xs text-on-surface-variant sm:max-w-md">
        {`Lưu nháp có thể thiếu thông tin. "${finalActionText}" sẽ kiểm tra các mục bắt buộc trong checklist.`}
      </p>
      <div className="flex w-full sm:w-auto flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCloseAttempt}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
        >
          Hủy
        </button>

        {(isStaff || isAdminLike) && (
          <button
            type="button"
            onClick={() => onSave("draft")}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-outline-variant/20 bg-surface text-on-surface text-sm font-semibold hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            {saveAction === "draft" ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
                Đang lưu…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">
                  draft
                </span>
                Lưu nháp
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => onSave("submit")}
          disabled={isSaving}
          className="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none shadow-sm"
        >
          {saveAction === "submit" ? (
            <>
              <span className="material-symbols-outlined text-base animate-spin">
                progress_activity
              </span>
              Đang lưu…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">
                {primaryIcon}
              </span>
              {primaryLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

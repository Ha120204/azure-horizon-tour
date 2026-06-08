"use client";

interface TourFormHeaderProps {
  mode: "create" | "edit";
  isStaff: boolean;
  tourName?: string;
  onClose: () => void;
}

export function TourFormHeader({
  mode,
  isStaff,
  tourName,
  onClose,
}: TourFormHeaderProps) {
  return (
    <div className="relative overflow-hidden shrink-0">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "50px 50px, 35px 35px",
        }}
      />
      <div className="relative z-[1] px-5 py-5 sm:px-7 sm:py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[22px]">
              {mode === "edit" ? "edit_note" : "add_location_alt"}
            </span>
          </div>
          <div>
            <h2
              id="modal-title"
              className="font-headline text-lg font-bold text-white leading-tight"
            >
              {mode === "edit"
                ? "Chỉnh Sửa Tour"
                : isStaff
                  ? "Tạo Bản Nháp Tour"
                  : "Tạo Tour Mới"}
            </h2>
            <p className="text-white/60 text-xs mt-0.5">
              {mode === "edit"
                ? `Đang sửa: ${tourName || "bản nháp tour"}`
                : isStaff
                  ? "Lưu nháp trước, hoàn thiện sau rồi gửi Admin duyệt"
                  : "Lưu nháp trước, kiểm tra rồi xác nhận public lên trang khách hàng"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng modal"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
}

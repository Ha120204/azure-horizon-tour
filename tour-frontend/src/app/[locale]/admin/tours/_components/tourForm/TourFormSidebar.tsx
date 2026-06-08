"use client";

interface ChecklistItem {
  label: string;
  done: boolean;
  target: string;
  hint?: string;
}

interface TourFormSidebarProps {
  sectionIssueCounts: Record<string, number>;
  requiredChecklist: ChecklistItem[];
  recommendedChecklist: ChecklistItem[];
  requiredDoneCount: number;
  isReadyForReview: boolean;
  missingRequired: ChecklistItem[];
  requiredProgress: number;
  readinessToneClass: string;
}

const EDITOR_SECTIONS = [
  { id: "tour-section-basic", icon: "description", label: "Thông tin cơ bản" },
  { id: "tour-section-location", icon: "location_on", label: "Địa điểm" },
  { id: "tour-section-price", icon: "payments", label: "Giá & Số lượng" },
  { id: "tour-section-departures", icon: "calendar_month", label: "Ngày khởi hành" },
  { id: "tour-section-cover", icon: "image", label: "Ảnh bìa" },
  { id: "tour-section-gallery", icon: "photo_library", label: "Gallery" },
  { id: "tour-section-packages", icon: "package_2", label: "Gói tour" },
  { id: "tour-section-highlights", icon: "auto_awesome", label: "Điểm nổi bật" },
  { id: "tour-section-faqs", icon: "help_outline", label: "FAQ" },
  { id: "tour-section-itinerary", icon: "route", label: "Lịch trình" },
];

function scrollToSection(sectionId: string) {
  document
    .getElementById(sectionId)
    ?.scrollIntoView({ block: "start", behavior: "smooth" });
}

export function TourFormSidebar({
  sectionIssueCounts,
  requiredChecklist,
  recommendedChecklist,
  requiredDoneCount,
  isReadyForReview,
  missingRequired,
  requiredProgress,
  readinessToneClass,
}: TourFormSidebarProps) {
  return (
    <aside className="hidden lg:flex min-h-0 flex-col border-r border-outline-variant/10 bg-surface-container-low/45">
      {/* Readiness header */}
      <div className="p-5 border-b border-outline-variant/10">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-on-surface-variant/70">
          Sẵn sàng gửi duyệt
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-on-surface">
              {requiredDoneCount}/{requiredChecklist.length}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {isReadyForReview
                ? "Đủ điều kiện gửi duyệt"
                : `${missingRequired.length} mục còn thiếu`}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${readinessToneClass}`}
          >
            {requiredProgress}%
          </span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-outline-variant/20 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${isReadyForReview ? "bg-emerald-600" : "bg-primary"}`}
            style={{ width: `${requiredProgress}%` }}
          />
        </div>
        {!isReadyForReview && (
          <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-3">
            <p className="text-xs font-bold text-amber-800">
              Cần hoàn thiện trước khi gửi
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-800/80">
              {missingRequired
                .slice(0, 3)
                .map((item) => item.label)
                .join(", ")}
              {missingRequired.length > 3
                ? ` và ${missingRequired.length - 3} mục khác`
                : ""}
            </p>
            <button
              type="button"
              onClick={() => scrollToSection(missingRequired[0].target)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900"
            >
              Đi tới mục đầu tiên
              <span className="material-symbols-outlined text-[13px]">
                arrow_forward
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Scrollable nav */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
        {/* Section navigation */}
        <div>
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
            Đi tới phần
          </p>
          <div className="mt-2 space-y-1">
            {EDITOR_SECTIONS.map((section) => {
              const issueCount = sectionIssueCounts[section.id] ?? 0;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-on-surface-variant hover:bg-surface-container-lowest hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {section.icon}
                  </span>
                  <span className="truncate">{section.label}</span>
                  {issueCount > 0 && (
                    <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-700">
                      {issueCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Required checklist */}
        <div>
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
            Bắt buộc
          </p>
          <div className="mt-2 space-y-1.5">
            {requiredChecklist.map((item) => (
              <button
                key={item.label}
                type="button"
                title={item.hint}
                onClick={() => scrollToSection(item.target)}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-surface-container-lowest transition-colors"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${item.done ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {item.done ? "check_circle" : "error"}
                </span>
                <span
                  className={
                    item.done ? "text-on-surface" : "text-on-surface-variant"
                  }
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recommended checklist */}
        <div>
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
            Nên có
          </p>
          <div className="mt-2 space-y-1.5">
            {recommendedChecklist.map((item) => (
              <button
                key={item.label}
                type="button"
                title={item.hint}
                onClick={() => scrollToSection(item.target)}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-surface-container-lowest transition-colors"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${item.done ? "text-primary" : "text-on-surface-variant/35"}`}
                >
                  {item.done ? "task_alt" : "add_circle"}
                </span>
                <span
                  className={
                    item.done ? "text-on-surface" : "text-on-surface-variant"
                  }
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

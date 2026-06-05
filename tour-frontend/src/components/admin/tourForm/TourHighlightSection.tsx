import { useState } from "react";
import type { TourHighlightForm } from "./types";

const HIGHLIGHT_ICONS = [
  { value: "auto_awesome", label: "Nổi bật" },
  { value: "beach_access", label: "Bãi biển" },
  { value: "restaurant", label: "Ẩm thực" },
  { value: "hotel", label: "Khách sạn" },
  { value: "directions_boat", label: "Tàu thuyền" },
  { value: "photo_camera", label: "Chụp ảnh" },
  { value: "hiking", label: "Trekking" },
  { value: "museum", label: "Văn hóa" },
  { value: "local_activity", label: "Hoạt động" },
  { value: "spa", label: "Spa" },
];

export const EMPTY_HIGHLIGHT: TourHighlightForm = {
  content: "",
  contentEn: "",
  icon: "auto_awesome",
};

interface TourHighlightSectionProps {
  highlights: TourHighlightForm[];
  showEnglishFields: boolean;
  updateHighlight: (idx: number, patch: Partial<TourHighlightForm>) => void;
  onRemoveHighlight: (idx: number) => void;
  onAddHighlight: () => void;
}

export function TourHighlightSection({
  highlights,
  showEnglishFields,
  updateHighlight,
  onRemoveHighlight,
  onAddHighlight,
}: TourHighlightSectionProps) {
  const [openHighlightIconIndex, setOpenHighlightIconIndex] = useState<
    number | null
  >(null);

  const selectHighlightIcon = (idx: number, icon: string) => {
    updateHighlight(idx, { icon });
    setOpenHighlightIconIndex(null);
  };

  const englishFieldClass = showEnglishFields ? "" : "hidden";

  return (
    <div id="tour-section-highlights" className="scroll-mt-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-amber-600 text-[14px]">
            auto_awesome
          </span>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Điểm nổi bật
        </h3>
        <span className="text-[10px] font-bold text-on-surface-variant/60">
          Khuyến nghị 3-6 ý bán hàng rõ ràng
        </span>
      </div>
      <div className="space-y-3">
        {highlights.map((highlight, idx) => (
          <div
            key={highlight.id ?? idx}
            className="bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Điểm #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemoveHighlight(idx)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                aria-label={`Xóa điểm nổi bật ${idx + 1}`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  delete
                </span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Biểu tượng
                </label>
                <div
                  className="relative"
                  onBlur={() =>
                    window.setTimeout(
                      () => setOpenHighlightIconIndex(null),
                      120,
                    )
                  }
                >
                  {(() => {
                    const selectedIcon =
                      HIGHLIGHT_ICONS.find(
                        (icon) => icon.value === highlight.icon,
                      ) ?? HIGHLIGHT_ICONS[0];
                    return (
                      <>
                        <button
                          type="button"
                          aria-expanded={openHighlightIconIndex === idx}
                          aria-controls={`highlight-icon-options-${idx}`}
                          onClick={() =>
                            setOpenHighlightIconIndex((open) =>
                              open === idx ? null : idx,
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="material-symbols-outlined text-[17px] text-amber-600">
                              {selectedIcon.value}
                            </span>
                            <span className="truncate font-semibold text-on-surface">
                              {selectedIcon.label}
                            </span>
                          </span>
                          <span
                            className={`material-symbols-outlined text-[18px] text-on-surface-variant/40 transition-transform ${openHighlightIconIndex === idx ? "rotate-180" : ""}`}
                          >
                            expand_more
                          </span>
                        </button>
                        {openHighlightIconIndex === idx && (
                          <div
                            id={`highlight-icon-options-${idx}`}
                            role="listbox"
                            className="absolute z-30 mt-2 max-h-64 w-64 overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                          >
                            {HIGHLIGHT_ICONS.map((icon) => {
                              const active = highlight.icon === icon.value;
                              return (
                                <button
                                  key={icon.value}
                                  type="button"
                                  role="option"
                                  aria-selected={active}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() =>
                                    selectHighlightIcon(idx, icon.value)
                                  }
                                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-amber-500 text-white font-semibold shadow-sm" : "text-on-surface hover:bg-surface-container"}`}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className={`material-symbols-outlined text-[17px] ${active ? "text-white" : "text-amber-600"}`}
                                    >
                                      {icon.value}
                                    </span>
                                    <span className="truncate">
                                      {icon.label}
                                    </span>
                                  </span>
                                  {active && (
                                    <span className="material-symbols-outlined text-[16px]">
                                      check
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Nội dung nổi bật *
                </label>
                <input
                  type="text"
                  value={highlight.content}
                  onChange={(e) =>
                    updateHighlight(idx, {
                      content: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: Du thuyền 5 sao ngắm hoàng hôn trên vịnh..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
            <div className={englishFieldClass}>
              <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Highlight (English)
              </label>
              <input
                type="text"
                value={highlight.contentEn}
                onChange={(e) =>
                  updateHighlight(idx, {
                    contentEn: e.target.value,
                  })
                }
                placeholder="Example: 5-star sunset cruise on the bay..."
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={onAddHighlight}
          className="w-full py-3 border-2 border-dashed border-amber-300 rounded-2xl text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            add_circle
          </span>
          Thêm điểm nổi bật
        </button>
      </div>
    </div>
  );
}

import { useState, useId } from "react";
import type { TourItineraryDayForm, TourTimelineEntry } from "./types";
import { TagChipField } from "./TagChipField";

const MEAL_OPTIONS: {
  key: "mealsBreakfast" | "mealsLunch" | "mealsDinner";
  label: string;
  icon: string;
}[] = [
  { key: "mealsBreakfast", label: "Sáng", icon: "wb_sunny" },
  { key: "mealsLunch", label: "Trưa", icon: "wb_twilight" },
  { key: "mealsDinner", label: "Tối", icon: "dark_mode" },
];

const ACTIVITY_PRESETS = [
  "Đón khách tại điểm hẹn",
  "Tham quan danh thắng",
  "Khám phá phố cổ",
  "Tự do chụp ảnh",
  "Dùng bữa theo chương trình",
  "Trải nghiệm văn hóa địa phương",
  "Mua sắm đặc sản",
  "Tắm biển / nghỉ ngơi",
  "Check-in điểm nổi bật",
  "Di chuyển về khách sạn",
];

const ACTIVITY_EN_PRESETS = [
  "Pick up at meeting point",
  "Sightseeing visit",
  "Explore the old town",
  "Free time for photos",
  "Scheduled meal",
  "Local cultural experience",
  "Shopping for local specialties",
  "Beach time / relaxation",
  "Highlight check-in stop",
  "Transfer back to hotel",
];

const ACCOMMODATION_PRESETS = [
  "Không lưu trú",
  "Khách sạn trung tâm",
  "Khách sạn 3 sao",
  "Khách sạn 4 sao",
  "Resort ven biển",
  "Homestay địa phương",
  "Du thuyền nghỉ đêm",
  "Theo tiêu chuẩn gói tour",
];

const ACCOMMODATION_EN_PRESETS = [
  "No accommodation",
  "Central hotel",
  "3-star hotel",
  "4-star hotel",
  "Beachfront resort",
  "Local homestay",
  "Overnight cruise",
  "According to tour package standard",
];

const TRANSPORT_PRESETS = [
  "Xe du lịch",
  "Xe limousine",
  "Tàu cao tốc",
  "Du thuyền",
  "Cáp treo",
  "Máy bay",
  "Xe điện",
  "Đi bộ tham quan",
];

const TRANSPORT_EN_PRESETS = [
  "Tourist coach",
  "Limousine van",
  "Speedboat",
  "Cruise",
  "Cable car",
  "Flight",
  "Electric buggy",
  "Walking tour",
];

const helperTextClass =
  "mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/65";

// ── PresetTextInput ────────────────────────────────────────────────────────────

interface PresetTextInputProps {
  value: string;
  presets: string[];
  placeholder: string;
  icon: string;
  className?: string;
  onChange: (value: string) => void;
}

function PresetTextInput({
  value,
  presets,
  placeholder,
  icon,
  className = "",
  onChange,
}: PresetTextInputProps) {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  const normalizedValue = normalize(value);
  const filtered = presets
    .filter(
      (item) => !normalizedValue || normalize(item).includes(normalizedValue),
    )
    .slice(0, 7);

  const selectPreset = (preset: string) => {
    onChange(preset);
    setIsOpen(false);
  };

  return (
    <div
      className={`relative ${className}`}
      onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
    >
      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[16px] text-indigo-600">
        {icon}
      </span>
      <input
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        autoComplete="off"
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setIsOpen(false);
          if (e.key === "Enter" && isOpen && filtered[0]) {
            e.preventDefault();
            selectPreset(filtered[0]);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-2.5 pl-9 pr-16 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
      />
      {value ? (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange("");
            setIsOpen(true);
          }}
          className="absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-error"
          aria-label="Xóa nội dung"
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
        </button>
      ) : null}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen((open) => !open)}
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-primary"
        aria-label="Mở danh sách gợi ý"
      >
        <span
          className={`material-symbols-outlined text-[15px] transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>
      {isOpen && (
        <div
          id={listboxId}
          className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
        >
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={value === item}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPreset(item)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  value === item
                    ? "bg-indigo-600 text-white"
                    : "text-on-surface hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {value === item ? "check" : "add"}
                </span>
                <span>{item}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-on-surface-variant">
              Không có gợi ý phù hợp. Bạn vẫn có thể giữ nội dung đang nhập.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TourItinerarySection ───────────────────────────────────────────────────────

interface TourItinerarySectionProps {
  itinerary: TourItineraryDayForm[];
  showEnglishFields: boolean;
  updateItineraryDay: (idx: number, patch: Partial<TourItineraryDayForm>) => void;
  updateItineraryTimelineEntry: (
    dayIndex: number,
    field: "timelineItems" | "timelineEnItems",
    entryIndex: number,
    patch: Partial<TourTimelineEntry>,
  ) => void;
  addItineraryTimelineEntry: (
    dayIndex: number,
    field: "timelineItems" | "timelineEnItems",
  ) => void;
  removeItineraryTimelineEntry: (
    dayIndex: number,
    field: "timelineItems" | "timelineEnItems",
    entryIndex: number,
  ) => void;
  onRemoveDay: (idx: number) => void;
  onAddDay: () => void;
}

const EMPTY_TIMELINE_ENTRY: TourTimelineEntry = { time: "", activity: "" };

export function TourItinerarySection({
  itinerary,
  showEnglishFields,
  updateItineraryDay,
  updateItineraryTimelineEntry,
  addItineraryTimelineEntry,
  removeItineraryTimelineEntry,
  onRemoveDay,
  onAddDay,
}: TourItinerarySectionProps) {
  const bilingualGridClass = showEnglishFields
    ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
    : "grid grid-cols-1 gap-3";
  const englishFieldClass = showEnglishFields ? "" : "hidden";

  return (
    <div id="tour-section-itinerary" className="scroll-mt-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-indigo-600 text-[14px]">
            route
          </span>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Lịch trình theo ngày
        </h3>
        <span className="text-[10px] font-bold text-on-surface-variant/60">
          Khuyến nghị có ít nhất 1 ngày đủ tiêu đề và mô tả
        </span>
      </div>
      <div className="space-y-4">
        {itinerary.map((day, idx) => (
          <div
            key={day.id ?? `day-${idx}`}
            className="bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Ngày {idx + 1}
                  </p>
                  <p className="text-[11px] text-on-surface-variant/60">
                    Nội dung hiển thị trên trang chi tiết tour
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveDay(idx)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                aria-label={`Xóa ngày ${idx + 1}`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  delete
                </span>
              </button>
            </div>

            <div className={bilingualGridClass}>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Tiêu đề ngày *
                </label>
                <input
                  type="text"
                  value={day.title}
                  onChange={(e) =>
                    updateItineraryDay(idx, { title: e.target.value })
                  }
                  placeholder="Khám phá phố cổ và ẩm thực địa phương"
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className={englishFieldClass}>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Day title (English)
                </label>
                <input
                  type="text"
                  value={day.titleEn}
                  onChange={(e) =>
                    updateItineraryDay(idx, { titleEn: e.target.value })
                  }
                  placeholder="Explore the old town and local cuisine"
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className={bilingualGridClass}>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Mô tả ngày *
                </label>
                <textarea
                  rows={4}
                  value={day.description}
                  onChange={(e) =>
                    updateItineraryDay(idx, { description: e.target.value })
                  }
                  placeholder="Buổi sáng khởi hành, tham quan các điểm chính, dùng bữa theo chương trình..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                />
              </div>
              <div className={englishFieldClass}>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Description (English)
                </label>
                <textarea
                  rows={4}
                  value={day.descriptionEn}
                  onChange={(e) =>
                    updateItineraryDay(idx, { descriptionEn: e.target.value })
                  }
                  placeholder="Morning departure, key sightseeing stops, and scheduled meals..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest/70 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Bữa ăn bao gồm
                </span>
                <span className="text-[10px] font-semibold text-on-surface-variant/60">
                  Chọn các bữa có trong ngày
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {MEAL_OPTIONS.map((meal) => {
                  const selected = day[meal.key];
                  return (
                    <button
                      key={meal.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        updateItineraryDay(idx, { [meal.key]: !selected })
                      }
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        selected
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border-outline-variant/15 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">
                          {meal.icon}
                        </span>
                        {meal.label}
                      </span>
                      <span
                        className={`material-symbols-outlined text-[16px] ${selected ? "text-indigo-600" : "text-on-surface-variant/35"}`}
                      >
                        {selected ? "check_circle" : "radio_button_unchecked"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Khách sạn / lưu trú
                </label>
                <PresetTextInput
                  value={day.accommodation}
                  presets={ACCOMMODATION_PRESETS}
                  icon="hotel"
                  placeholder="Resort 4 sao hoặc khách sạn trung tâm"
                  onChange={(value) =>
                    updateItineraryDay(idx, { accommodation: value })
                  }
                />
                <PresetTextInput
                  value={day.accommodationEn}
                  presets={ACCOMMODATION_EN_PRESETS}
                  icon="hotel"
                  placeholder="Accommodation in English"
                  className={`mt-2 ${englishFieldClass}`}
                  onChange={(value) =>
                    updateItineraryDay(idx, { accommodationEn: value })
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Phương tiện
                </label>
                <PresetTextInput
                  value={day.transport}
                  presets={TRANSPORT_PRESETS}
                  icon="directions_bus"
                  placeholder="Xe du lịch, tàu cao tốc, cáp treo..."
                  onChange={(value) =>
                    updateItineraryDay(idx, { transport: value })
                  }
                />
                <PresetTextInput
                  value={day.transportEn}
                  presets={TRANSPORT_EN_PRESETS}
                  icon="directions_bus"
                  placeholder="Transport in English"
                  className={`mt-2 ${englishFieldClass}`}
                  onChange={(value) =>
                    updateItineraryDay(idx, { transportEn: value })
                  }
                />
              </div>
            </div>

            <div className={bilingualGridClass}>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Điểm tham quan / hoạt động
                </label>
                <TagChipField
                  items={day.activitiesText
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)}
                  presets={ACTIVITY_PRESETS}
                  color="indigo"
                  onChange={(items) =>
                    updateItineraryDay(idx, {
                      activitiesText: items.join("\n"),
                    })
                  }
                />
                <p className={helperTextClass}>
                  Nên chọn 3-6 hoạt động chính, tránh nhập quá dài như mô tả
                  ngày.
                </p>
              </div>
              <div className={englishFieldClass}>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Activities (English)
                </label>
                <TagChipField
                  items={day.activitiesEnText
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)}
                  presets={ACTIVITY_EN_PRESETS}
                  color="indigo"
                  onChange={(items) =>
                    updateItineraryDay(idx, {
                      activitiesEnText: items.join("\n"),
                    })
                  }
                />
                <p className={helperTextClass}>
                  Giữ tương ứng với danh sách tiếng Việt để bản dịch rõ ràng.
                </p>
              </div>
            </div>

            <div className={bilingualGridClass}>
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    Timeline trong ngày
                  </label>
                  <span className="text-[10px] font-semibold text-on-surface-variant/60">
                    Giờ + hoạt động
                  </span>
                </div>
                <div className="space-y-2">
                  {(day.timelineItems?.length
                    ? day.timelineItems
                    : [EMPTY_TIMELINE_ENTRY]
                  ).map((entry, entryIndex) => (
                    <div
                      key={`timeline-${idx}-${entryIndex}`}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_minmax(0,1fr)_36px]"
                    >
                      <input
                        type="text"
                        value={entry.time}
                        onChange={(e) =>
                          updateItineraryTimelineEntry(
                            idx,
                            "timelineItems",
                            entryIndex,
                            { time: e.target.value },
                          )
                        }
                        placeholder="07:30"
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <input
                        type="text"
                        value={entry.activity}
                        onChange={(e) =>
                          updateItineraryTimelineEntry(
                            idx,
                            "timelineItems",
                            entryIndex,
                            { activity: e.target.value },
                          )
                        }
                        placeholder="Đón khách tại điểm hẹn"
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeItineraryTimelineEntry(
                            idx,
                            "timelineItems",
                            entryIndex,
                          )
                        }
                        className="h-10 w-full rounded-xl text-error transition-colors hover:bg-error/10 sm:w-9"
                        aria-label={`Xóa mốc timeline ${entryIndex + 1}`}
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          delete
                        </span>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addItineraryTimelineEntry(idx, "timelineItems")
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/35 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      add_circle
                    </span>
                    Thêm mốc thời gian
                  </button>
                </div>
                <p className={helperTextClass}>
                  Nên nhập theo thứ tự diễn ra trong ngày, ví dụ 07:30 - Đón
                  khách.
                </p>
              </div>
              <div className={englishFieldClass}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    Timeline tiếng Anh
                  </label>
                  <span className="text-[10px] font-semibold text-on-surface-variant/60">
                    Time + activity
                  </span>
                </div>
                <div className="space-y-2">
                  {(day.timelineEnItems?.length
                    ? day.timelineEnItems
                    : [EMPTY_TIMELINE_ENTRY]
                  ).map((entry, entryIndex) => (
                    <div
                      key={`timeline-en-${idx}-${entryIndex}`}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_minmax(0,1fr)_36px]"
                    >
                      <input
                        type="text"
                        value={entry.time}
                        onChange={(e) =>
                          updateItineraryTimelineEntry(
                            idx,
                            "timelineEnItems",
                            entryIndex,
                            { time: e.target.value },
                          )
                        }
                        placeholder="07:30"
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <input
                        type="text"
                        value={entry.activity}
                        onChange={(e) =>
                          updateItineraryTimelineEntry(
                            idx,
                            "timelineEnItems",
                            entryIndex,
                            { activity: e.target.value },
                          )
                        }
                        placeholder="Pick up at meeting point"
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeItineraryTimelineEntry(
                            idx,
                            "timelineEnItems",
                            entryIndex,
                          )
                        }
                        className="h-10 w-full rounded-xl text-error transition-colors hover:bg-error/10 sm:w-9"
                        aria-label={`Xóa mốc timeline tiếng Anh ${entryIndex + 1}`}
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          delete
                        </span>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addItineraryTimelineEntry(idx, "timelineEnItems")
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/35 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      add_circle
                    </span>
                    Thêm mốc tiếng Anh
                  </button>
                </div>
                <p className={helperTextClass}>
                  Giữ cùng khung giờ với timeline tiếng Việt để khách dễ đối
                  chiếu.
                </p>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={onAddDay}
          className="w-full py-3 border-2 border-dashed border-indigo-300 rounded-2xl text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            add_circle
          </span>
          Thêm ngày lịch trình
        </button>
      </div>
    </div>
  );
}

import type { RefObject } from "react";
import type { TourFormData } from "./types";
import { TOUR_TYPES } from "./constants";

const labelWithBadgeClass =
  "mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant";
const helperTextClass =
  "mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/65";

interface TourBasicInfoSectionProps {
  form: Pick<
    TourFormData,
    "name" | "nameEn" | "description" | "descriptionEn" | "tourType"
  >;
  errors: Partial<Record<"name" | "description", string>>;
  showEnglishFields: boolean;
  firstInputRef: RefObject<HTMLInputElement | null>;
  requiredBadge: React.ReactNode;
  handleChange: (field: keyof TourFormData, value: string) => void;
}

export function TourBasicInfoSection({
  form,
  errors,
  showEnglishFields,
  firstInputRef,
  requiredBadge,
  handleChange,
}: TourBasicInfoSectionProps) {
  const englishFieldClass = showEnglishFields ? "" : "hidden";

  return (
    <div id="tour-section-basic" className="scroll-mt-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[14px]">
            info
          </span>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Thông tin cơ bản
        </h3>
      </div>

      <div className="space-y-4 bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10">
        {/* Tour Name */}
        <div>
          <label htmlFor="field-name" className={labelWithBadgeClass}>
            <span>Tên tour</span>
            {requiredBadge}
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">
              travel_explore
            </span>
            <input
              ref={firstInputRef}
              id="field-name"
              name="name"
              type="text"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "field-name-error" : undefined}
              autoComplete="off"
              placeholder="Ví dụ: Hạ Long: Du thuyền 5 sao kèm ăn trưa"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.name ? "border-error" : "border-outline-variant/20"}`}
            />
          </div>
          <p className={helperTextClass}>
            Nên có điểm đến, loại trải nghiệm và điểm nổi bật. Ví dụ: Hạ Long:
            Du thuyền 5 sao kèm ăn trưa.
          </p>
          {errors.name && (
            <p className="text-error text-xs mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">
                error
              </span>
              <span id="field-name-error">{errors.name}</span>
            </p>
          )}
        </div>

        <div className={englishFieldClass}>
          <label
            htmlFor="field-nameEn"
            className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2"
          >
            Tên tour tiếng Anh
          </label>
          <input
            id="field-nameEn"
            name="nameEn"
            type="text"
            autoComplete="off"
            placeholder="Example: Ha Long Bay 5-Star Lunch Cruise"
            value={form.nameEn}
            onChange={(e) => handleChange("nameEn", e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
          />
        </div>

        {/* Tour Type */}
        <div>
          <label
            htmlFor="field-tourType"
            className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2"
          >
            Nhóm hiển thị chính
          </label>
          <div className="flex flex-wrap gap-2">
            {TOUR_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleChange("tourType", t.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  form.tourType === t.value
                    ? "bg-primary text-on-primary border-primary shadow-sm"
                    : "bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant hover:border-primary/30 hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </div>
          <p className={helperTextClass}>
            Chọn 1 nhóm chính để khách dễ lọc và hiểu phong cách tour.
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="field-description" className={labelWithBadgeClass}>
            <span>Mô tả</span>
            {requiredBadge}
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-on-surface-variant/60 text-base pointer-events-none">
              description
            </span>
            <textarea
              id="field-description"
              name="description"
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? "field-description-error" : undefined
              }
              autoComplete="off"
              placeholder="Mô tả chi tiết về trải nghiệm tour này…"
              rows={3}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors resize-none ${errors.description ? "border-error" : "border-outline-variant/20"}`}
            />
          </div>
          <p className={helperTextClass}>
            Viết 2-4 câu: khách sẽ đi đâu, trải nghiệm gì, tour phù hợp với
            ai.
          </p>
          {errors.description && (
            <p className="text-error text-xs mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">
                error
              </span>
              <span id="field-description-error">{errors.description}</span>
            </p>
          )}
        </div>

        <div className={englishFieldClass}>
          <label
            htmlFor="field-descriptionEn"
            className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2"
          >
            Mô tả tiếng Anh
          </label>
          <textarea
            id="field-descriptionEn"
            name="descriptionEn"
            autoComplete="off"
            placeholder="Describe the tour experience in English..."
            rows={3}
            value={form.descriptionEn}
            onChange={(e) => handleChange("descriptionEn", e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
}

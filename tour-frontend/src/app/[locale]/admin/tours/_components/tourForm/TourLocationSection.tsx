"use client";

import { useRef, useEffect, type ReactNode } from "react";
import type { TourFormData, Destination, TravelScope } from "./types";
import {
  DEPARTURE_POINTS,
  DURATION_PRESETS,
} from "./constants";

interface TourLocationSectionProps {
  form: TourFormData;
  errors: Partial<Record<keyof TourFormData, string>>;
  showEnglishFields: boolean;
  destinations: Destination[];
  requiredBadge: ReactNode;
  showNewDest: boolean;
  setShowNewDest: (v: boolean) => void;
  newDestName: string;
  setNewDestName: (v: string) => void;
  newDestTravelScope: TravelScope;
  setNewDestTravelScope: (v: TravelScope) => void;
  newDestCountryCode: string;
  setNewDestCountryCode: (v: string) => void;
  isCreatingDest: boolean;
  newDestError: string;
  setNewDestError: (v: string) => void;
  destinationQuery: string;
  setDestinationQuery: (v: string) => void;
  isDestinationListOpen: boolean;
  setIsDestinationListOpen: (v: boolean) => void;
  departurePointQuery: string;
  setDeparturePointQuery: (v: string) => void;
  isDeparturePointListOpen: boolean;
  setIsDeparturePointListOpen: (v: boolean) => void;
  durationMode: string;
  customDuration: string;
  setCustomDuration: (v: string) => void;
  isDurationListOpen: boolean;
  setIsDurationListOpen: (v: boolean) => void;
  handleChange: (field: keyof TourFormData, value: string) => void;
  normalizeSearchValue: (v: string) => string;
  getDestinationLabel: (dest: Destination) => string;
  selectDestination: (dest: Destination) => void;
  clearDestination: () => void;
  handleCreateDestination: () => void;
  selectDeparturePoint: (point: string) => void;
  clearDeparturePoint: () => void;
  handleDurationSelect: (duration: string) => void;
  onClearDurationError: () => void;
}

const labelWithBadgeClass =
  "mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant";
const helperTextClass =
  "mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/65";

export function TourLocationSection({
  form,
  errors,
  showEnglishFields,
  destinations,
  requiredBadge,
  showNewDest,
  setShowNewDest,
  newDestName,
  setNewDestName,
  newDestTravelScope,
  setNewDestTravelScope,
  newDestCountryCode,
  setNewDestCountryCode,
  isCreatingDest,
  newDestError,
  setNewDestError,
  destinationQuery,
  setDestinationQuery,
  isDestinationListOpen,
  setIsDestinationListOpen,
  departurePointQuery,
  setDeparturePointQuery,
  isDeparturePointListOpen,
  setIsDeparturePointListOpen,
  durationMode,
  customDuration,
  setCustomDuration,
  isDurationListOpen,
  setIsDurationListOpen,
  handleChange,
  normalizeSearchValue,
  getDestinationLabel,
  selectDestination,
  clearDestination,
  handleCreateDestination,
  selectDeparturePoint,
  clearDeparturePoint,
  handleDurationSelect,
  onClearDurationError,
}: TourLocationSectionProps) {
  const newDestInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewDest) newDestInputRef.current?.focus();
  }, [showNewDest]);

  const englishFieldClass = showEnglishFields ? "" : "hidden";

  const selectedDestination = destinations.find(
    (d) => String(d.id) === form.destinationId,
  );
  const destinationSearchTerm = normalizeSearchValue(
    destinationQuery.replace(/·.*/, ""),
  );
  const filteredDestinations = destinations
    .filter((d) => {
      if (!destinationSearchTerm) return true;
      return normalizeSearchValue(getDestinationLabel(d)).includes(
        destinationSearchTerm,
      );
    })
    .slice(0, 8);

  const departureSearchTerm = normalizeSearchValue(departurePointQuery);
  const filteredDeparturePoints = DEPARTURE_POINTS.filter(
    (point) =>
      !departureSearchTerm ||
      normalizeSearchValue(point).includes(departureSearchTerm),
  ).slice(0, 8);

  const selectedDurationLabel =
    durationMode === "custom"
      ? "Khác (tùy chỉnh)"
      : form.duration || "Chọn thời lượng...";

  return (
    <div id="tour-section-location" className="scroll-mt-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-violet-600 text-[14px]">
            location_on
          </span>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Địa điểm & thời lượng
        </h3>
      </div>

      <div className="space-y-4 bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10">
        {/* Destination */}
        <div>
          <label
            htmlFor="field-destinationId"
            className={labelWithBadgeClass}
          >
            <span>Điểm đến</span>
            {requiredBadge}
          </label>
          {!showNewDest ? (
            <>
              <div
                className="relative"
                onBlur={() =>
                  window.setTimeout(() => setIsDestinationListOpen(false), 120)
                }
              >
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">
                  map
                </span>
                <input
                  id="field-destinationId"
                  name="destinationId"
                  type="text"
                  aria-invalid={Boolean(errors.destinationId)}
                  aria-describedby={
                    errors.destinationId
                      ? "field-destinationId-error"
                      : undefined
                  }
                  role="combobox"
                  aria-expanded={isDestinationListOpen}
                  aria-controls="destination-options"
                  autoComplete="off"
                  placeholder="Gõ để tìm điểm đến..."
                  value={destinationQuery}
                  onFocus={() => setIsDestinationListOpen(true)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDestinationQuery(value);
                    setIsDestinationListOpen(true);
                    if (
                      form.destinationId &&
                      selectedDestination &&
                      value !== getDestinationLabel(selectedDestination)
                    ) {
                      handleChange("destinationId", "");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsDestinationListOpen(false);
                    if (e.key === "Enter" && filteredDestinations.length > 0) {
                      e.preventDefault();
                      selectDestination(filteredDestinations[0]);
                    }
                  }}
                  className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-20 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.destinationId ? "border-error" : "border-outline-variant/20"}`}
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {destinationQuery && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={clearDestination}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-error"
                      aria-label="Xóa điểm đến"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        close
                      </span>
                    </button>
                  )}
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-base pointer-events-none">
                    expand_more
                  </span>
                </div>
                {isDestinationListOpen && (
                  <div
                    id="destination-options"
                    role="listbox"
                    className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                  >
                    {filteredDestinations.length > 0 ? (
                      filteredDestinations.map((destination) => {
                        const active =
                          String(destination.id) === form.destinationId;
                        return (
                          <button
                            key={destination.id}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectDestination(destination)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-primary/10 text-primary" : "text-on-surface hover:bg-surface-container"}`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">
                                travel_explore
                              </span>
                              <span className="truncate font-semibold">
                                {destination.name}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                              {(destination.travelScope ?? "DOMESTIC") ===
                              "DOMESTIC"
                                ? "Trong nước"
                                : "Nước ngoài"}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-3 text-xs text-on-surface-variant">
                        Không tìm thấy điểm đến. Có thể tạo mới bên dưới.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className={helperTextClass}>
                Dùng cho bộ lọc điểm đến và hiển thị trên trang khách hàng.
              </p>
              {errors.destinationId && (
                <p className="text-error text-xs mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">
                    error
                  </span>
                  <span id="field-destinationId-error">
                    {errors.destinationId}
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setNewDestName(destinationQuery.replace(/·.*/, "").trim());
                  setShowNewDest(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">
                  add_circle
                </span>
                Tạo điểm đến mới nếu chưa có
              </button>
            </>
          ) : (
            <div className="border border-primary/30 bg-primary/5 rounded-xl p-4">
              <p className="text-xs font-bold text-primary mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">
                  add_location_alt
                </span>
                Thêm điểm đến mới
              </p>
              <div className="grid gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">
                    edit_location
                  </span>
                  <input
                    ref={newDestInputRef}
                    type="text"
                    value={newDestName}
                    onChange={(e) => {
                      setNewDestName(e.target.value);
                      setNewDestError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateDestination();
                      }
                      if (e.key === "Escape") setShowNewDest(false);
                    }}
                    placeholder="Ví dụ: Phú Yên, Côn Đảo…"
                    className={`w-full bg-surface-container-lowest border rounded-xl pl-10 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${newDestError ? "border-error" : "border-outline-variant/20"}`}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-1">
                    {(
                      [
                        {
                          value: "DOMESTIC" as TravelScope,
                          label: "Trong nước",
                          icon: "home_pin",
                        },
                        {
                          value: "INTERNATIONAL" as TravelScope,
                          label: "Nước ngoài",
                          icon: "public",
                        },
                      ] as const
                    ).map((option) => {
                      const active = newDestTravelScope === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setNewDestTravelScope(option.value);
                            setNewDestCountryCode(
                              option.value === "DOMESTIC" ? "VN" : "",
                            );
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${active ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {option.icon}
                          </span>
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={newDestCountryCode}
                    onChange={(e) =>
                      setNewDestCountryCode(
                        e.target.value.toUpperCase().slice(0, 2),
                      )
                    }
                    placeholder="Mã QG"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-semibold uppercase focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateDestination}
                    disabled={isCreatingDest}
                    className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-1.5 shrink-0"
                  >
                    {isCreatingDest ? (
                      <span className="material-symbols-outlined text-base animate-spin">
                        progress_activity
                      </span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">
                          check
                        </span>
                        Thêm
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewDest(false);
                      setNewDestName("");
                      setNewDestTravelScope("DOMESTIC");
                      setNewDestCountryCode("VN");
                      setNewDestError("");
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                </div>
              </div>
              {newDestError && (
                <p className="text-error text-xs mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">
                    error
                  </span>
                  {newDestError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Departure Point */}
        <div>
          <label
            htmlFor="field-departurePoint"
            className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2"
          >
            Điểm Khởi Hành Mặc Định
          </label>
          <div
            className="relative"
            onBlur={() =>
              window.setTimeout(() => setIsDeparturePointListOpen(false), 120)
            }
          >
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">
              flight_takeoff
            </span>
            <input
              id="field-departurePoint"
              type="text"
              role="combobox"
              aria-expanded={isDeparturePointListOpen}
              aria-controls="departure-point-options"
              autoComplete="off"
              placeholder="Gõ hoặc chọn điểm khởi hành..."
              value={departurePointQuery}
              onFocus={() => setIsDeparturePointListOpen(true)}
              onChange={(e) => {
                const value = e.target.value;
                setDeparturePointQuery(value);
                setIsDeparturePointListOpen(true);
                handleChange("departurePoint", value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsDeparturePointListOpen(false);
                if (
                  e.key === "Enter" &&
                  filteredDeparturePoints.length > 0
                ) {
                  e.preventDefault();
                  selectDeparturePoint(filteredDeparturePoints[0]);
                }
              }}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-20 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {departurePointQuery && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={clearDeparturePoint}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-error"
                  aria-label="Xóa điểm khởi hành"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              )}
              <span className="material-symbols-outlined text-on-surface-variant/40 text-base pointer-events-none">
                expand_more
              </span>
            </div>
            {isDeparturePointListOpen && (
              <div
                id="departure-point-options"
                role="listbox"
                className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
              >
                {filteredDeparturePoints.length > 0 &&
                  filteredDeparturePoints.map((point) => {
                    const active = point === form.departurePoint;
                    return (
                      <button
                        key={point}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectDeparturePoint(point)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${active ? "bg-primary/10 text-primary" : "text-on-surface hover:bg-surface-container"}`}
                      >
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">
                          location_on
                        </span>
                        <span className="truncate">{point}</span>
                      </button>
                    );
                  })}
                {departurePointQuery.trim() &&
                  !DEPARTURE_POINTS.some(
                    (point) =>
                      point.toLowerCase() ===
                      departurePointQuery.trim().toLowerCase(),
                  ) && (
                    <div className="mt-1 border-t border-outline-variant/10 pt-1">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          selectDeparturePoint(departurePointQuery.trim())
                        }
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-primary/10"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          add_location_alt
                        </span>
                        <span>
                          Dùng &quot;{departurePointQuery.trim()}&quot;
                        </span>
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant/60 mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[11px]">info</span>
            Hiển thị trên trang chi tiết tour cho khách hàng
          </p>
          <input
            type="text"
            value={form.departurePointEn}
            onChange={(e) => handleChange("departurePointEn", e.target.value)}
            placeholder="Departure point in English"
            className={`mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${englishFieldClass}`}
          />
        </div>

        {/* Duration */}
        <div>
          <label className={labelWithBadgeClass}>
            <span>Thời lượng</span>
            {requiredBadge}
          </label>
          <div className="space-y-2">
            <div
              className="relative"
              onBlur={() =>
                window.setTimeout(() => setIsDurationListOpen(false), 120)
              }
            >
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">
                schedule
              </span>
              <button
                type="button"
                id="field-duration"
                aria-describedby={
                  errors.duration ? "field-duration-error" : undefined
                }
                aria-expanded={isDurationListOpen}
                aria-controls="duration-options"
                onClick={() => setIsDurationListOpen(!isDurationListOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsDurationListOpen(false);
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIsDurationListOpen(true);
                  }
                }}
                className={`flex w-full items-center rounded-xl border bg-surface-container-lowest py-3 pl-11 pr-10 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${errors.duration ? "border-error" : "border-outline-variant/20"} ${form.duration || durationMode === "custom" ? "text-on-surface" : "text-on-surface-variant/60"}`}
              >
                {selectedDurationLabel}
              </button>
              <span
                className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base pointer-events-none transition-transform ${isDurationListOpen ? "rotate-180" : ""}`}
              >
                expand_more
              </span>
              {isDurationListOpen && (
                <div
                  id="duration-options"
                  role="listbox"
                  className="absolute z-30 mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={!form.duration && durationMode !== "custom"}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleDurationSelect("")}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${!form.duration && durationMode !== "custom" ? "bg-primary/10 text-primary font-semibold" : "text-on-surface-variant hover:bg-surface-container"}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      event_busy
                    </span>
                    Chọn thời lượng...
                  </button>
                  {DURATION_PRESETS.map((duration) => {
                    const active =
                      durationMode === "custom"
                        ? duration === "Khác (tùy chỉnh)"
                        : form.duration === duration;
                    const isCustom = duration === "Khác (tùy chỉnh)";
                    return (
                      <button
                        key={duration}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleDurationSelect(duration)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-primary text-on-primary font-semibold shadow-sm" : "text-on-surface hover:bg-surface-container"}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            {isCustom ? "edit_calendar" : "date_range"}
                          </span>
                          {duration}
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
            </div>
            {durationMode === "custom" && (
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">
                  edit
                </span>
                <input
                  type="text"
                  aria-invalid={Boolean(errors.duration)}
                  aria-describedby={
                    errors.duration ? "field-duration-error" : undefined
                  }
                  value={customDuration}
                  onChange={(e) => {
                    setCustomDuration(e.target.value);
                    onClearDurationError();
                  }}
                  placeholder="Ví dụ: 10 Ngày 9 Đêm…"
                  className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.duration ? "border-error" : "border-primary/30"}`}
                />
              </div>
            )}
          </div>
          <p className={helperTextClass}>
            Hiển thị trực tiếp trên card tour, nên dùng format ngắn như 3 ngày
            2 đêm.
          </p>
          {errors.duration && (
            <p className="text-error text-xs mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">
                error
              </span>
              <span id="field-duration-error">{errors.duration}</span>
            </p>
          )}
          <input
            type="text"
            value={form.durationEn}
            onChange={(e) => handleChange("durationEn", e.target.value)}
            placeholder="Duration in English, e.g. 3 Days 2 Nights"
            className={`mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${englishFieldClass}`}
          />
        </div>
      </div>
    </div>
  );
}

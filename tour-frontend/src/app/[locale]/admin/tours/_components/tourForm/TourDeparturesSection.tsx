"use client";

import { type ReactNode, type Dispatch, type SetStateAction } from "react";
import DatePickerDropdown from "@/components/search/DatePickerDropdown";
import type { TourDeparture, TourFormData, DepartureTransport } from "./types";
import {
  SALE_CATEGORY_OPTIONS,
  FLASH_SALE_TIME_OPTIONS,
  isBookableDepartureDate,
  MIN_START_DATE,
  getDatePart,
  getTimePart,
  formatCurrencyInput,
  stripCurrencyInput,
} from "./constants";
import DepartureTransportForm, { EMPTY_TRANSPORT } from "./DepartureTransportForm";

interface TourDeparturesSectionProps {
  departures: TourDeparture[];
  errors: Partial<Record<keyof TourFormData, string>>;
  showEnglishFields: boolean;
  hasDepartureReviewError: boolean;
  requiredBadge: ReactNode;
  openSaleCategoryIndex: number | null;
  setOpenSaleCategoryIndex: Dispatch<SetStateAction<number | null>>;
  openFlashTimeIndex: number | null;
  setOpenFlashTimeIndex: Dispatch<SetStateAction<number | null>>;
  openTransportIndex: number | null;
  setOpenTransportIndex: Dispatch<SetStateAction<number | null>>;
  defaultPrice: string;
  updateDeparture: (idx: number, patch: Partial<TourDeparture>) => void;
  updateDepartureCategory: (idx: number, category: TourDeparture["category"]) => void;
  updateFlashSaleDate: (idx: number, date: string) => void;
  updateFlashSaleTime: (idx: number, time: string) => void;
  handleRemoveDeparture: (idx: number) => void;
  handleAddDeparture: () => void;
}

const compactLabelWithBadgeClass =
  "mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant";

export function TourDeparturesSection({
  departures,
  errors,
  showEnglishFields,
  hasDepartureReviewError,
  requiredBadge,
  openSaleCategoryIndex,
  setOpenSaleCategoryIndex,
  openFlashTimeIndex,
  setOpenFlashTimeIndex,
  openTransportIndex,
  setOpenTransportIndex,
  defaultPrice,
  updateDeparture,
  updateDepartureCategory,
  updateFlashSaleDate,
  updateFlashSaleTime,
  handleRemoveDeparture,
  handleAddDeparture,
}: TourDeparturesSectionProps) {
  const englishFieldClass = showEnglishFields ? "" : "hidden";

  return (
    <div
      id="tour-section-departures"
      className="scroll-mt-6 outline-none"
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-blue-600 text-[14px]">
            calendar_month
          </span>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Ngày khởi hành
        </h3>
        <span className="text-[10px] font-bold text-primary">
          Cần ít nhất 1 chuyến hợp lệ
        </span>
      </div>

      {hasDepartureReviewError && (
        <div
          className="mb-3 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-3 text-xs text-amber-800"
          role="alert"
        >
          <p className="font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">error</span>
            Chưa có chuyến khởi hành hợp lệ
          </p>
          <p id="field-startDate-error" className="mt-1 leading-relaxed">
            {errors.startDate}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {departures.map((dep, idx) => {
          const departureInvalid =
            hasDepartureReviewError &&
            (!dep.departureDate ||
              !isBookableDepartureDate(dep.departureDate) ||
              Number(dep.availableSeats || 0) <= 0);

          return (
            <div
              key={idx}
              className={`bg-surface-container-low/40 rounded-2xl p-4 border ${departureInvalid ? "border-amber-300/60 bg-amber-500/5" : "border-outline-variant/10"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Chuyến #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveDeparture(idx)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    delete
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Ngày khởi hành */}
                <div>
                  <label className={compactLabelWithBadgeClass}>
                    <span>Ngày khởi hành</span>
                    {requiredBadge}
                  </label>
                  <DatePickerDropdown
                    value={dep.departureDate}
                    minDate={MIN_START_DATE}
                    language="vi"
                    variant="field"
                    placeholder="Chọn ngày khởi hành"
                    onChange={(value) =>
                      updateDeparture(idx, { departureDate: value })
                    }
                  />
                  {departureInvalid &&
                    (!dep.departureDate ||
                      !isBookableDepartureDate(dep.departureDate)) && (
                      <p className="mt-1 text-[10px] text-amber-700">
                        Cần chọn ngày hợp lệ, không ở quá khứ.
                      </p>
                    )}
                </div>

                {/* Phân loại Sale */}
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                    Phân loại (Sale)
                  </label>
                  <div
                    className="relative"
                    onBlur={() =>
                      window.setTimeout(
                        () => setOpenSaleCategoryIndex(null),
                        120,
                      )
                    }
                  >
                    {(() => {
                      const selectedSaleCategory =
                        SALE_CATEGORY_OPTIONS.find(
                          (option) => option.value === dep.category,
                        ) ?? SALE_CATEGORY_OPTIONS[0];
                      return (
                        <>
                          <button
                            type="button"
                            aria-expanded={openSaleCategoryIndex === idx}
                            aria-controls={`sale-category-options-${idx}`}
                            onClick={() =>
                              setOpenSaleCategoryIndex((open) =>
                                open === idx ? null : idx,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Escape")
                                setOpenSaleCategoryIndex(null);
                              if (event.key === "ArrowDown") {
                                event.preventDefault();
                                setOpenSaleCategoryIndex(idx);
                              }
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={`material-symbols-outlined text-[17px] ${selectedSaleCategory.tone}`}
                                aria-hidden="true"
                              >
                                {selectedSaleCategory.icon}
                              </span>
                              <span className="truncate font-semibold text-on-surface">
                                {selectedSaleCategory.label}
                              </span>
                            </span>
                            <span
                              className={`material-symbols-outlined text-[18px] text-on-surface-variant/40 transition-transform ${openSaleCategoryIndex === idx ? "rotate-180" : ""}`}
                              aria-hidden="true"
                            >
                              expand_more
                            </span>
                          </button>

                          {openSaleCategoryIndex === idx && (
                            <div
                              id={`sale-category-options-${idx}`}
                              role="listbox"
                              className="absolute z-[360] mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                            >
                              {SALE_CATEGORY_OPTIONS.map((option) => {
                                const active = dep.category === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onMouseDown={(event) =>
                                      event.preventDefault()
                                    }
                                    onClick={() =>
                                      updateDepartureCategory(idx, option.value)
                                    }
                                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? `${option.activeClass} font-semibold` : "text-on-surface-variant hover:bg-surface-container"}`}
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span
                                        className={`material-symbols-outlined text-[17px] ${active ? "" : option.tone}`}
                                        aria-hidden="true"
                                      >
                                        {option.icon}
                                      </span>
                                      <span className="truncate">
                                        {option.label}
                                      </span>
                                    </span>
                                    {active && (
                                      <span
                                        className="material-symbols-outlined text-[15px]"
                                        aria-hidden="true"
                                      >
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

                {/* Flash Sale end date/time */}
                {dep.category === "flash" && (
                  <div className="sm:col-span-2">
                    <label className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-error">
                      <span className="material-symbols-outlined text-[14px]">
                        timer
                      </span>
                      Kết thúc Flash Sale *
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_168px]">
                      <DatePickerDropdown
                        value={getDatePart(dep.flashSaleEndsAt)}
                        minDate={MIN_START_DATE}
                        language="vi"
                        variant="field"
                        placeholder={
                          dep.departureDate
                            ? "Chọn ngày kết thúc sale"
                            : "Chọn ngày kết thúc"
                        }
                        onChange={(value) => updateFlashSaleDate(idx, value)}
                        dropdownClassName="z-[350]"
                      />
                      <div
                        className="relative"
                        onBlur={() =>
                          window.setTimeout(
                            () => setOpenFlashTimeIndex(null),
                            120,
                          )
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenFlashTimeIndex((open) =>
                              open === idx ? null : idx,
                            )
                          }
                          className="flex h-[42px] w-full items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-3 py-2.5 text-left text-sm font-semibold text-error outline-none transition-colors hover:bg-error/10 focus-visible:ring-2 focus-visible:ring-error"
                          aria-expanded={openFlashTimeIndex === idx}
                          aria-controls={`flash-sale-time-options-${idx}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[17px]">
                              schedule
                            </span>
                            {getTimePart(dep.flashSaleEndsAt) || "23:59"}
                          </span>
                          <span
                            className={`material-symbols-outlined text-[18px] transition-transform ${openFlashTimeIndex === idx ? "rotate-180" : ""}`}
                          >
                            expand_more
                          </span>
                        </button>
                        {openFlashTimeIndex === idx && (
                          <div
                            id={`flash-sale-time-options-${idx}`}
                            role="listbox"
                            className="absolute right-0 z-[360] mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl sm:w-52"
                          >
                            {FLASH_SALE_TIME_OPTIONS.map((time) => {
                              const active =
                                (getTimePart(dep.flashSaleEndsAt) || "23:59") ===
                                time;
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  role="option"
                                  aria-selected={active}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => updateFlashSaleTime(idx, time)}
                                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${active ? "bg-error text-white font-semibold" : "text-on-surface hover:bg-surface-container"}`}
                                >
                                  <span>{time}</span>
                                  {active && (
                                    <span className="material-symbols-outlined text-[15px]">
                                      check
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[10px] text-on-surface-variant/60">
                      Ngày dùng cùng bộ chọn ngày của form. Giờ có thể chọn
                      nhanh theo mốc 30 phút.
                    </p>
                  </div>
                )}

                {/* Số ghế còn */}
                <div>
                  <label className={compactLabelWithBadgeClass}>
                    <span>Số ghế còn</span>
                    {requiredBadge}
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 20"
                    min={0}
                    value={dep.availableSeats}
                    aria-invalid={
                      departureInvalid && Number(dep.availableSeats || 0) <= 0
                    }
                    aria-describedby={
                      hasDepartureReviewError
                        ? "field-startDate-error"
                        : undefined
                    }
                    onChange={(e) =>
                      updateDeparture(idx, { availableSeats: e.target.value })
                    }
                    className={`w-full bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary ${departureInvalid && Number(dep.availableSeats || 0) <= 0 ? "border-amber-400" : "border-outline-variant/20"}`}
                  />
                  <p className="mt-1 text-[10px] text-on-surface-variant/60">
                    Phải lớn hơn 0 để chuyến được tính là hợp lệ.
                  </p>
                </div>

                {/* Tổng số ghế */}
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                    Tổng số ghế (Max)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 30"
                    min={0}
                    value={dep.maxSeats}
                    onChange={(e) =>
                      updateDeparture(idx, { maxSeats: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {/* Giá riêng */}
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                    Giá riêng (VNĐ)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={`Mặc định: ${formatCurrencyInput(defaultPrice) || "giá tour"}`}
                    value={formatCurrencyInput(dep.price)}
                    onChange={(e) =>
                      updateDeparture(idx, {
                        price: stripCurrencyInput(e.target.value),
                      })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    placeholder="Giá ưu đãi cuối tuần..."
                    value={dep.note}
                    onChange={(e) =>
                      updateDeparture(idx, { note: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {/* Ghi chú tiếng Anh */}
                <div className={englishFieldClass}>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                    Note (English)
                  </label>
                  <input
                    type="text"
                    placeholder="Weekend deal..."
                    value={dep.noteEn}
                    onChange={(e) =>
                      updateDeparture(idx, { noteEn: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Transport accordion */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() =>
                    setOpenTransportIndex((prev) =>
                      prev === idx ? null : idx,
                    )
                  }
                  className={`flex w-full items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                    openTransportIndex === idx
                      ? "bg-primary/8 border-primary/30 text-primary"
                      : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <span
                      className={`material-symbols-outlined text-[16px] ${openTransportIndex === idx ? "text-primary" : "text-on-surface-variant"}`}
                    >
                      {dep.transport && dep.transport.type !== "SELF_ARRANGED"
                        ? "flight"
                        : "directions_bus"}
                    </span>
                    Phương tiện
                    {dep.transport &&
                    dep.transport.type !== "SELF_ARRANGED" ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
                        {dep.transport.type === "FLIGHT"
                          ? "Máy bay"
                          : dep.transport.type === "BUS"
                            ? "Xe khách"
                            : dep.transport.type === "PRIVATE_CAR"
                              ? "Xe riêng"
                              : "Combo"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-normal text-on-surface-variant/60 italic">
                        Nhấn để cấu hình
                      </span>
                    )}
                  </span>
                  <span
                    className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${openTransportIndex === idx ? "rotate-180 text-primary" : ""}`}
                  >
                    expand_more
                  </span>
                </button>

                {openTransportIndex === idx && (
                  <div className="mt-2 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-3">
                    <DepartureTransportForm
                      transport={dep.transport ?? { ...EMPTY_TRANSPORT }}
                      minDate={dep.departureDate || undefined}
                      onChange={(patch: Partial<DepartureTransport>) =>
                        updateDeparture(idx, {
                          transport: {
                            ...(dep.transport ?? EMPTY_TRANSPORT),
                            ...patch,
                          },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddDeparture}
          className="w-full py-3 border-2 border-dashed border-blue-300 rounded-2xl text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            add_circle
          </span>
          Thêm ngày khởi hành
        </button>
      </div>
    </div>
  );
}

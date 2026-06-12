"use client";

import { type Dispatch, type SetStateAction } from "react";
import type { TourPackage } from "./types";
import {
  PACKAGE_NAMES,
  PACKAGE_BADGE_OPTIONS,
  formatCurrencyInput,
  stripCurrencyInput,
} from "./constants";
import { TagChipField } from "./TagChipField";

interface TourPackagesSectionProps {
  packages: TourPackage[];
  showEnglishFields: boolean;
  openPackageNameIndex: number | null;
  setOpenPackageNameIndex: Dispatch<SetStateAction<number | null>>;
  openPackageBadgeIndex: number | null;
  setOpenPackageBadgeIndex: Dispatch<SetStateAction<number | null>>;
  includePresets: string[];
  excludePresets: string[];
  canSaveSharedPackagePreset: boolean;
  normalizeSearchValue: (v: string) => string;
  updatePackage: (idx: number, patch: Partial<TourPackage>) => void;
  selectPackageBadge: (idx: number, badge: string) => void;
  handleAddPackage: () => void;
  handleRemovePackage: (idx: number) => void;
  createSharedPackagePreset: (type: "INCLUDE" | "EXCLUDE", label: string) => Promise<string>;
}

export function TourPackagesSection({
  packages,
  showEnglishFields,
  openPackageNameIndex,
  setOpenPackageNameIndex,
  openPackageBadgeIndex,
  setOpenPackageBadgeIndex,
  includePresets,
  excludePresets,
  canSaveSharedPackagePreset,
  normalizeSearchValue,
  updatePackage,
  selectPackageBadge,
  handleAddPackage,
  handleRemovePackage,
  createSharedPackagePreset,
}: TourPackagesSectionProps) {
  const englishFieldClass = showEnglishFields ? "" : "hidden";

  return (
    <div id="tour-section-packages" className="scroll-mt-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-emerald-600 text-[14px]">
            package_2
          </span>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Gói tour
        </h3>
        <span className="text-[10px] font-bold text-primary">
          Cần ít nhất 1 gói dịch vụ
        </span>
      </div>

      <div className="space-y-4">
        {packages.map((pkg, idx) => (
          <div
            key={idx}
            className="bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Gói #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemovePackage(idx)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  delete
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tên gói — combobox */}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Tên gói *
                </label>
                <div
                  className="relative"
                  onBlur={() =>
                    window.setTimeout(() => setOpenPackageNameIndex(null), 120)
                  }
                >
                  <input
                    type="text"
                    role="combobox"
                    aria-expanded={openPackageNameIndex === idx}
                    aria-controls={`package-name-options-${idx}`}
                    autoComplete="off"
                    placeholder="Gõ hoặc chọn tên gói..."
                    value={pkg.name}
                    onFocus={() => setOpenPackageNameIndex(idx)}
                    onChange={(e) => {
                      updatePackage(idx, {
                        name: e.target.value,
                        nameMode: PACKAGE_NAMES.includes(e.target.value)
                          ? "select"
                          : "custom",
                      });
                      setOpenPackageNameIndex(idx);
                    }}
                    onKeyDown={(e) => {
                      const filtered = PACKAGE_NAMES.filter(
                        (name) =>
                          !pkg.name.trim() ||
                          normalizeSearchValue(name).includes(
                            normalizeSearchValue(pkg.name),
                          ),
                      );
                      if (e.key === "Escape") setOpenPackageNameIndex(null);
                      if (e.key === "Enter" && filtered.length > 0) {
                        e.preventDefault();
                        updatePackage(idx, { name: filtered[0], nameMode: "select" });
                        setOpenPackageNameIndex(null);
                      }
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 pr-16 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {pkg.name && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          updatePackage(idx, { name: "", nameMode: "select" });
                          setOpenPackageNameIndex(idx);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-error"
                        aria-label="Xóa tên gói"
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
                  {openPackageNameIndex === idx &&
                    (() => {
                      const filtered = PACKAGE_NAMES.filter(
                        (name) =>
                          !pkg.name.trim() ||
                          normalizeSearchValue(name).includes(
                            normalizeSearchValue(pkg.name),
                          ),
                      );
                      const exactMatch = PACKAGE_NAMES.some(
                        (name) =>
                          normalizeSearchValue(name) ===
                          normalizeSearchValue(pkg.name),
                      );
                      return (
                        <div
                          id={`package-name-options-${idx}`}
                          role="listbox"
                          className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                        >
                          {filtered.map((name) => {
                            const active = pkg.name === name;
                            return (
                              <button
                                key={name}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  updatePackage(idx, { name, nameMode: "select" });
                                  setOpenPackageNameIndex(null);
                                }}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-primary text-on-primary font-semibold shadow-sm" : "text-on-surface hover:bg-surface-container"}`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="material-symbols-outlined text-[16px]">
                                    inventory_2
                                  </span>
                                  <span className="truncate">{name}</span>
                                </span>
                                {active && (
                                  <span className="material-symbols-outlined text-[16px]">
                                    check
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {pkg.name.trim() && !exactMatch && (
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                updatePackage(idx, {
                                  name: pkg.name.trim(),
                                  nameMode: "custom",
                                });
                                setOpenPackageNameIndex(null);
                              }}
                              className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-outline-variant/10 px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-primary/10"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                add_circle
                              </span>
                              <span>
                                Dùng &quot;{pkg.name.trim()}&quot;
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                </div>
              </div>

              {/* Giá gói */}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Giá toàn phần của gói (VNĐ) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatCurrencyInput(pkg.price)}
                  onChange={(e) =>
                    updatePackage(idx, {
                      price: stripCurrencyInput(e.target.value),
                    })
                  }
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <p className="text-[10px] text-on-surface-variant/60 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">
                    info
                  </span>
                  Giá này là giá toàn phần của gói (không cộng thêm giá ngày
                  khởi hành)
                </p>
              </div>
            </div>

            {/* Bản dịch tiếng Anh */}
            <div className={englishFieldClass}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                Bản dịch tiếng Anh của gói
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                    Package name (English)
                  </label>
                  <input
                    type="text"
                    placeholder="Standard Package"
                    value={pkg.nameEn}
                    onChange={(e) =>
                      updatePackage(idx, { nameEn: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                    Short description (English)
                  </label>
                  <input
                    type="text"
                    placeholder="Best for families..."
                    value={pkg.descriptionEn}
                    onChange={(e) =>
                      updatePackage(idx, { descriptionEn: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Mô tả + Nhãn gói */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  placeholder="Phù hợp cho gia đình..."
                  value={pkg.description}
                  onChange={(e) =>
                    updatePackage(idx, { description: e.target.value })
                  }
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Nhãn gói */}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Nhãn gói
                </label>
                <div
                  className="relative"
                  onBlur={() =>
                    window.setTimeout(() => setOpenPackageBadgeIndex(null), 120)
                  }
                >
                  {(() => {
                    const selectedBadge =
                      PACKAGE_BADGE_OPTIONS.find(
                        (option) => option.value === pkg.badge,
                      ) ?? PACKAGE_BADGE_OPTIONS[0];
                    return (
                      <>
                        <button
                          type="button"
                          aria-expanded={openPackageBadgeIndex === idx}
                          aria-controls={`package-badge-options-${idx}`}
                          onClick={() =>
                            setOpenPackageBadgeIndex((open) =>
                              open === idx ? null : idx,
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={`material-symbols-outlined text-[17px] ${selectedBadge.tone}`}
                            >
                              {selectedBadge.icon}
                            </span>
                            <span className="truncate font-semibold text-on-surface">
                              {selectedBadge.label}
                            </span>
                          </span>
                          <span
                            className={`material-symbols-outlined text-[18px] text-on-surface-variant/40 transition-transform ${openPackageBadgeIndex === idx ? "rotate-180" : ""}`}
                          >
                            expand_more
                          </span>
                        </button>

                        {openPackageBadgeIndex === idx && (
                          <div
                            id={`package-badge-options-${idx}`}
                            role="listbox"
                            className="absolute z-30 mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                          >
                            {PACKAGE_BADGE_OPTIONS.map((option) => {
                              const active = pkg.badge === option.value;
                              return (
                                <button
                                  key={option.value || "none"}
                                  type="button"
                                  role="option"
                                  aria-selected={active}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() =>
                                    selectPackageBadge(idx, option.value)
                                  }
                                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-primary text-on-primary font-semibold shadow-sm" : "text-on-surface hover:bg-surface-container"}`}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className={`material-symbols-outlined text-[17px] ${active ? "text-on-primary" : option.tone}`}
                                    >
                                      {option.icon}
                                    </span>
                                    <span className="truncate">
                                      {option.label}
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
            </div>

            {/* Bao gồm / Không bao gồm */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                  <span className="mr-1">✓</span>
                  Bao gồm
                </label>
                <TagChipField
                  items={pkg.includes}
                  presets={includePresets}
                  color="emerald"
                  canSavePreset={canSaveSharedPackagePreset}
                  onCreatePreset={(label) =>
                    createSharedPackagePreset("INCLUDE", label)
                  }
                  onChange={(val) => updatePackage(idx, { includes: val })}
                />
              </div>

              <div className={englishFieldClass}>
                <label className="block text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                  <span className="mr-1">EN</span>
                  Included
                </label>
                <textarea
                  rows={3}
                  value={pkg.includesEn.join("\n")}
                  onChange={(e) =>
                    updatePackage(idx, {
                      includesEn: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder={"Hotel\nMeals\nGuide"}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-error uppercase tracking-wider mb-2">
                  <span className="mr-1">✗</span>
                  Không bao gồm
                </label>
                <TagChipField
                  items={pkg.excludes}
                  presets={excludePresets}
                  color="red"
                  canSavePreset={canSaveSharedPackagePreset}
                  onCreatePreset={(label) =>
                    createSharedPackagePreset("EXCLUDE", label)
                  }
                  onChange={(val) => updatePackage(idx, { excludes: val })}
                />
              </div>

              <div className={englishFieldClass}>
                <label className="block text-[11px] font-semibold text-error uppercase tracking-wider mb-2">
                  <span className="mr-1">EN</span>
                  Not included
                </label>
                <textarea
                  rows={3}
                  value={pkg.excludesEn.join("\n")}
                  onChange={(e) =>
                    updatePackage(idx, {
                      excludesEn: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder={"Personal expenses\nTips"}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddPackage}
          className="w-full py-3 border-2 border-dashed border-emerald-300 rounded-2xl text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            add_circle
          </span>
          Thêm gói tour
        </button>
      </div>
    </div>
  );
}

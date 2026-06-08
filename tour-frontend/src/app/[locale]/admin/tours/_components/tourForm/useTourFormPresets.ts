"use client";

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { API_BASE_URL } from "@/lib/http/constants";
import { fetchWithAuth } from "@/lib/http/fetchWithAuth";
import { INCLUDE_PRESETS, EXCLUDE_PRESETS } from "./TagChipField";
import type { PackagePresetType, PackagePresetResponse } from "./tourFormUtils";

export function useTourFormPresets() {
  const [includePresets, setIncludePresets] = useState<string[]>(INCLUDE_PRESETS);
  const [excludePresets, setExcludePresets] = useState<string[]>(EXCLUDE_PRESETS);

  const normalizeSearchValue = useCallback(
    (value: string) =>
      value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim(),
    [],
  );

  const mergePresetLabels = useCallback(
    (base: string[], remote: string[]) => {
      const seen = new Set<string>();
      return [...base, ...remote].filter((label) => {
        const normalized = normalizeSearchValue(label);
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    },
    [normalizeSearchValue],
  );

  useEffect(() => {
    let cancelled = false;

    const loadPresets = async (
      type: PackagePresetType,
      fallback: string[],
      setter: Dispatch<SetStateAction<string[]>>,
    ) => {
      try {
        const response = await fetchWithAuth(
          `${API_BASE_URL}/tour/package-presets?type=${type}`,
        );
        if (!response.ok) return;
        const raw = await response.json();
        const data = (raw?.data ?? raw) as PackagePresetResponse[];
        if (cancelled || !Array.isArray(data)) return;
        setter(
          mergePresetLabels(
            fallback,
            data.map((item) => item.label).filter(Boolean),
          ),
        );
      } catch {
        // Keep local fallback presets if the shared preset API is unavailable.
      }
    };

    void loadPresets("INCLUDE", INCLUDE_PRESETS, setIncludePresets);
    void loadPresets("EXCLUDE", EXCLUDE_PRESETS, setExcludePresets);

    return () => {
      cancelled = true;
    };
  }, [mergePresetLabels]);

  const createSharedPackagePreset = async (
    type: PackagePresetType,
    label: string,
  ) => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/tour/package-presets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, label }),
      },
    );
    const raw = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(raw?.message)
        ? raw.message.join(", ")
        : raw?.message || "Không thể lưu vào danh mục dùng chung";
      throw new Error(message);
    }
    const preset = (raw?.data ?? raw) as PackagePresetResponse;
    const savedLabel = preset?.label || label.trim();
    const setter = type === "INCLUDE" ? setIncludePresets : setExcludePresets;
    const fallback = type === "INCLUDE" ? INCLUDE_PRESETS : EXCLUDE_PRESETS;
    setter((prev) => mergePresetLabels(fallback, [...prev, savedLabel]));
    return savedLabel;
  };

  return {
    includePresets,
    excludePresets,
    normalizeSearchValue,
    createSharedPackagePreset,
  };
}

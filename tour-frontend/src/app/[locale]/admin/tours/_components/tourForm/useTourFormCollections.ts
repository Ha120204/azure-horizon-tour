"use client";

import { useState } from "react";
import type React from "react";
import type {
  TourPackage,
  TourDeparture,
  TourHighlightForm,
  TourFaqForm,
  TourItineraryDayForm,
  TourTimelineEntry,
  SaleCategory,
  TourFormErrors,
} from "./types";
import { MIN_START_DATE } from "./constants";
import {
  EMPTY_FAQ,
  EMPTY_PKG,
  createEmptyDeparture,
  createEmptyItineraryDay,
  createEmptyTimelineEntry,
  getDatePart,
  getTimePart,
  combineDateTimeLocal,
} from "./tourFormUtils";
import { EMPTY_HIGHLIGHT } from "./TourHighlightSection";

type CollectionsConfig = {
  mode: "create" | "edit";
  setIsDirty: (v: boolean) => void;
  setErrors: React.Dispatch<React.SetStateAction<TourFormErrors>>;
  setGlobalError: (v: string) => void;
};

export function useTourFormCollections({
  mode,
  setIsDirty,
  setErrors,
  setGlobalError,
}: CollectionsConfig) {
  // ── Collection state ───────────────────────────────────────────────
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [departures, setDepartures] = useState<TourDeparture[]>(() =>
    mode === "create" ? [createEmptyDeparture()] : [],
  );
  const [highlights, setHighlights] = useState<TourHighlightForm[]>([]);
  const [faqs, setFaqs] = useState<TourFaqForm[]>([]);
  const [itinerary, setItinerary] = useState<TourItineraryDayForm[]>([]);

  // ── Dropdown UI state ──────────────────────────────────────────────
  const [openFlashTimeIndex, setOpenFlashTimeIndex] = useState<number | null>(null);
  const [openSaleCategoryIndex, setOpenSaleCategoryIndex] = useState<number | null>(null);
  const [openTransportIndex, setOpenTransportIndex] = useState<number | null>(null);
  const [openPackageNameIndex, setOpenPackageNameIndex] = useState<number | null>(null);
  const [openPackageBadgeIndex, setOpenPackageBadgeIndex] = useState<number | null>(null);
  const [openFaqTemplateIndex, setOpenFaqTemplateIndex] = useState<number | null>(null);

  // ── Departure handlers ─────────────────────────────────────────────
  const updateDeparture = (idx: number, patch: Partial<TourDeparture>) => {
    setDepartures((d) => d.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, startDate: undefined }));
    setGlobalError("");
  };

  const updateDepartureCategory = (idx: number, category: SaleCategory) => {
    const departure = departures[idx];
    const defaultFlashDate = departure?.departureDate || MIN_START_DATE;
    setOpenSaleCategoryIndex(null);
    updateDeparture(idx, {
      category,
      flashSaleEndsAt:
        category === "flash"
          ? departure?.flashSaleEndsAt || combineDateTimeLocal(defaultFlashDate, "23:59")
          : departure?.flashSaleEndsAt,
    });
  };

  const updateFlashSaleDate = (idx: number, date: string) => {
    const current = departures[idx]?.flashSaleEndsAt || "";
    updateDeparture(idx, {
      flashSaleEndsAt: combineDateTimeLocal(date, getTimePart(current) || "23:59"),
    });
  };

  const updateFlashSaleTime = (idx: number, time: string) => {
    const current = departures[idx]?.flashSaleEndsAt || "";
    const fallbackDate = departures[idx]?.departureDate || MIN_START_DATE;
    updateDeparture(idx, {
      flashSaleEndsAt: combineDateTimeLocal(getDatePart(current) || fallbackDate, time),
    });
    setOpenFlashTimeIndex(null);
  };

  const handleAddDeparture = () => {
    setDepartures((prev) => [...prev, createEmptyDeparture()]);
    setIsDirty(true);
  };

  const handleRemoveDeparture = (idx: number) => {
    setDepartures((d) => d.filter((_, i) => i !== idx));
    setErrors((prev) => ({ ...prev, startDate: undefined }));
    setIsDirty(true);
  };

  // ── Package handlers ───────────────────────────────────────────────
  const updatePackage = (idx: number, patch: Partial<TourPackage>) => {
    setPackages((prev) => prev.map((pkg, i) => (i === idx ? { ...pkg, ...patch } : pkg)));
    setIsDirty(true);
  };

  const selectPackageBadge = (idx: number, badge: string) => {
    updatePackage(idx, { badge });
    setOpenPackageBadgeIndex(null);
  };

  const handleAddPackage = () => {
    setPackages((prev) => [...prev, { ...EMPTY_PKG }]);
    setIsDirty(true);
  };

  const handleRemovePackage = (idx: number) => {
    setPackages((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  // ── Highlight handlers ─────────────────────────────────────────────
  const updateHighlight = (idx: number, patch: Partial<TourHighlightForm>) => {
    setHighlights((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
    setIsDirty(true);
  };

  const handleRemoveHighlight = (idx: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const handleAddHighlight = () => {
    setHighlights((prev) => [...prev, { ...EMPTY_HIGHLIGHT }]);
    setIsDirty(true);
  };

  // ── FAQ handlers ───────────────────────────────────────────────────
  const updateFaq = (idx: number, patch: Partial<TourFaqForm>) => {
    setFaqs((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
    setIsDirty(true);
  };

  const handleAddFaq = () => {
    setFaqs((prev) => [...prev, { ...EMPTY_FAQ }]);
    setIsDirty(true);
  };

  const handleRemoveFaq = (idx: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const applyFaqTemplate = (idx: number, template: { question: string; questionEn: string }) => {
    updateFaq(idx, { question: template.question, questionEn: template.questionEn });
    setOpenFaqTemplateIndex(null);
  };

  // ── Itinerary handlers ─────────────────────────────────────────────
  const updateItineraryDay = (idx: number, patch: Partial<TourItineraryDayForm>) => {
    setItinerary((prev) => prev.map((day, i) => (i === idx ? { ...day, ...patch } : day)));
    setIsDirty(true);
  };

  const updateItineraryTimelineEntry = (
    dayIndex: number,
    field: "timelineItems" | "timelineEnItems",
    entryIndex: number,
    patch: Partial<TourTimelineEntry>,
  ) => {
    setItinerary((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const entries = day[field]?.length ? day[field] : [createEmptyTimelineEntry()];
        return {
          ...day,
          [field]: entries.map((entry, entryIdx) =>
            entryIdx === entryIndex ? { ...entry, ...patch } : entry,
          ),
        };
      }),
    );
    setIsDirty(true);
  };

  const addItineraryTimelineEntry = (
    dayIndex: number,
    field: "timelineItems" | "timelineEnItems",
  ) => {
    setItinerary((prev) =>
      prev.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              [field]: [...(day[field]?.length ? day[field] : []), createEmptyTimelineEntry()],
            }
          : day,
      ),
    );
    setIsDirty(true);
  };

  const removeItineraryTimelineEntry = (
    dayIndex: number,
    field: "timelineItems" | "timelineEnItems",
    entryIndex: number,
  ) => {
    setItinerary((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const nextEntries = (
          day[field]?.length ? day[field] : [createEmptyTimelineEntry()]
        ).filter((_, itemIndex) => itemIndex !== entryIndex);
        return {
          ...day,
          [field]: nextEntries.length ? nextEntries : [createEmptyTimelineEntry()],
        };
      }),
    );
    setIsDirty(true);
  };

  const handleRemoveItineraryDay = (idx: number) => {
    setItinerary((prev) =>
      prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, dayNumber: i + 1 })),
    );
    setIsDirty(true);
  };

  const handleAddItineraryDay = () => {
    setItinerary((prev) => [...prev, createEmptyItineraryDay(prev.length + 1)]);
    setIsDirty(true);
  };

  return {
    // Collections state + setters
    packages, setPackages,
    departures, setDepartures,
    highlights, setHighlights,
    faqs, setFaqs,
    itinerary, setItinerary,
    // Dropdown UI state + setters
    openFlashTimeIndex, setOpenFlashTimeIndex,
    openSaleCategoryIndex, setOpenSaleCategoryIndex,
    openTransportIndex, setOpenTransportIndex,
    openPackageNameIndex, setOpenPackageNameIndex,
    openPackageBadgeIndex, setOpenPackageBadgeIndex,
    openFaqTemplateIndex, setOpenFaqTemplateIndex,
    // Handlers
    updateDeparture, updateDepartureCategory, updateFlashSaleDate, updateFlashSaleTime,
    handleAddDeparture, handleRemoveDeparture,
    updatePackage, selectPackageBadge, handleAddPackage, handleRemovePackage,
    updateHighlight, handleRemoveHighlight, handleAddHighlight,
    updateFaq, handleAddFaq, handleRemoveFaq, applyFaqTemplate,
    updateItineraryDay, updateItineraryTimelineEntry, addItineraryTimelineEntry,
    removeItineraryTimelineEntry, handleRemoveItineraryDay, handleAddItineraryDay,
  };
}

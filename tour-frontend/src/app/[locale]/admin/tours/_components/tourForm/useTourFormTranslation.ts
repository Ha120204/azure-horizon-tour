"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { API_BASE_URL } from "@/lib/http/constants";
import { fetchWithAuth } from "@/lib/http/fetchWithAuth";
import type {
  TourFormData,
  TourPackage,
  TourDeparture,
  TourHighlightForm,
  TourFaqForm,
  TourItineraryDayForm,
} from "./types";
import {
  splitLines,
  normalizeTimelineEntries,
  timelineToText,
  type TourEnglishTranslation,
  type IndexedTranslation,
} from "./tourFormUtils";
import { cleanTimelineEntries } from "./constants";

interface UseTourFormTranslationParams {
  form: TourFormData;
  packages: TourPackage[];
  departures: TourDeparture[];
  highlights: TourHighlightForm[];
  faqs: TourFaqForm[];
  itinerary: TourItineraryDayForm[];
  durationMode: "preset" | "custom";
  customDuration: string;
  setForm: Dispatch<SetStateAction<TourFormData>>;
  setPackages: Dispatch<SetStateAction<TourPackage[]>>;
  setDepartures: Dispatch<SetStateAction<TourDeparture[]>>;
  setHighlights: Dispatch<SetStateAction<TourHighlightForm[]>>;
  setFaqs: Dispatch<SetStateAction<TourFaqForm[]>>;
  setItinerary: Dispatch<SetStateAction<TourItineraryDayForm[]>>;
  setIsDirty: (v: boolean) => void;
  setGlobalError: (msg: string) => void;
}

export function useTourFormTranslation({
  form,
  packages,
  departures,
  highlights,
  faqs,
  itinerary,
  durationMode,
  customDuration,
  setForm,
  setPackages,
  setDepartures,
  setHighlights,
  setFaqs,
  setItinerary,
  setIsDirty,
  setGlobalError,
}: UseTourFormTranslationParams) {
  const [showEnglishFields, setShowEnglishFields] = useState(false);
  const [isTranslatingEnglish, setIsTranslatingEnglish] = useState(false);

  const buildEnglishTranslationPayload = () => ({
    name: form.name,
    description: form.description,
    departurePoint: form.departurePoint,
    duration: durationMode === "custom" ? customDuration : form.duration,
    packages: packages.map((pkg, index) => ({
      index,
      name: pkg.name,
      description: pkg.description,
      includes: pkg.includes,
      excludes: pkg.excludes,
    })),
    departures: departures.map((departure, index) => ({
      index,
      note: departure.note,
    })),
    highlights: highlights.map((highlight, index) => ({
      index,
      content: highlight.content,
    })),
    faqs: faqs.map((faq, index) => ({
      index,
      question: faq.question,
      answer: faq.answer,
    })),
    itinerary: itinerary.map((day, index) => ({
      index,
      title: day.title,
      description: day.description,
      accommodation: day.accommodation,
      transport: day.transport,
      activities: splitLines(day.activitiesText),
      timeline: cleanTimelineEntries(day.timelineItems),
    })),
  });

  const findTranslationItem = <T extends IndexedTranslation>(
    items: T[] | undefined,
    index: number,
  ) =>
    Array.isArray(items)
      ? items.find((item) => Number(item.index) === index)
      : undefined;

  const applyEnglishTranslation = (translation: TourEnglishTranslation) => {
    setForm((prev) => ({
      ...prev,
      nameEn: translation.nameEn?.trim() || prev.nameEn,
      descriptionEn: translation.descriptionEn?.trim() || prev.descriptionEn,
      departurePointEn:
        translation.departurePointEn?.trim() || prev.departurePointEn,
      durationEn: translation.durationEn?.trim() || prev.durationEn,
    }));
    setPackages((prev) =>
      prev.map((pkg, index) => {
        const item = findTranslationItem(translation.packages, index);
        return item
          ? {
              ...pkg,
              nameEn: item.nameEn?.trim() || pkg.nameEn,
              descriptionEn: item.descriptionEn?.trim() || pkg.descriptionEn,
              includesEn: item.includesEn?.length
                ? item.includesEn
                : pkg.includesEn,
              excludesEn: item.excludesEn?.length
                ? item.excludesEn
                : pkg.excludesEn,
            }
          : pkg;
      }),
    );
    setDepartures((prev) =>
      prev.map((departure, index) => {
        const item = findTranslationItem(translation.departures, index);
        return item
          ? { ...departure, noteEn: item.noteEn?.trim() || departure.noteEn }
          : departure;
      }),
    );
    setHighlights((prev) =>
      prev.map((highlight, index) => {
        const item = findTranslationItem(translation.highlights, index);
        return item
          ? {
              ...highlight,
              contentEn: item.contentEn?.trim() || highlight.contentEn,
            }
          : highlight;
      }),
    );
    setFaqs((prev) =>
      prev.map((faq, index) => {
        const item = findTranslationItem(translation.faqs, index);
        return item
          ? {
              ...faq,
              questionEn: item.questionEn?.trim() || faq.questionEn,
              answerEn: item.answerEn?.trim() || faq.answerEn,
            }
          : faq;
      }),
    );
    setItinerary((prev) =>
      prev.map((day, index) => {
        const item = findTranslationItem(translation.itinerary, index);
        return item
          ? {
              ...day,
              titleEn: item.titleEn?.trim() || day.titleEn,
              descriptionEn: item.descriptionEn?.trim() || day.descriptionEn,
              accommodationEn:
                item.accommodationEn?.trim() || day.accommodationEn,
              transportEn: item.transportEn?.trim() || day.transportEn,
              activitiesEnText: item.activitiesEn?.length
                ? item.activitiesEn.join("\n")
                : day.activitiesEnText,
              timelineEnItems: item.timelineEn?.length
                ? normalizeTimelineEntries(item.timelineEn)
                : day.timelineEnItems,
              timelineEnText: item.timelineEn?.length
                ? timelineToText(item.timelineEn)
                : day.timelineEnText,
            }
          : day;
      }),
    );
    setShowEnglishFields(true);
    setIsDirty(true);
  };

  const handleGenerateEnglishDraft = async () => {
    const payload = buildEnglishTranslationPayload();
    setIsTranslatingEnglish(true);
    setGlobalError("");
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/ai/translate/tour`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(result?.message)
          ? result.message.join(", ")
          : result?.message || "Không thể tạo bản tiếng Anh tự động.";
        throw new Error(message);
      }
      applyEnglishTranslation(
        (result?.data ?? result) as TourEnglishTranslation,
      );
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Không thể tạo bản tiếng Anh tự động.",
      );
    } finally {
      setIsTranslatingEnglish(false);
    }
  };

  return {
    showEnglishFields,
    setShowEnglishFields,
    isTranslatingEnglish,
    handleGenerateEnglishDraft,
  };
}

"use client";

import { useEffect } from "react";
import type {
  TourFormData,
  TourPackage,
  TourDeparture,
  TourHighlightForm,
  TourFaqForm,
  TourItineraryDayForm,
  InitialTourData,
  Destination,
} from "./types";
import { DRAFT_DESTINATION_NAME, DURATION_PRESETS } from "./constants";
import {
  mapPackagesToForm,
  mapDeparturesToForm,
  mapHighlightsToForm,
  mapFaqsToForm,
  mapItineraryToForm,
} from "./_lib/tourFormMappers";

type PrefillConfig = {
  mode: "create" | "edit";
  initialData: InitialTourData | undefined;
  initialDestinations: Destination[];
  setForm: (data: TourFormData) => void;
  setDestinationQuery: (v: string) => void;
  setDeparturePointQuery: (v: string) => void;
  setDurationMode: (v: "preset" | "custom") => void;
  setCustomDuration: (v: string) => void;
  setImagePreview: (v: string) => void;
  setExistingImages: (v: { id: number; url: string }[]) => void;
  setPackages: (v: TourPackage[]) => void;
  setDepartures: (v: TourDeparture[]) => void;
  setHighlights: (v: TourHighlightForm[]) => void;
  setFaqs: (v: TourFaqForm[]) => void;
  setItinerary: (v: TourItineraryDayForm[]) => void;
};

export function useTourFormPrefill({
  mode,
  initialData,
  initialDestinations,
  setForm,
  setDestinationQuery,
  setDeparturePointQuery,
  setDurationMode,
  setCustomDuration,
  setImagePreview,
  setExistingImages,
  setPackages,
  setDepartures,
  setHighlights,
  setFaqs,
  setItinerary,
}: PrefillConfig) {
  useEffect(() => {
    if (mode !== "edit" || !initialData) return;

    const startDate = initialData.startDate
      ? new Date(initialData.startDate).toISOString().split("T")[0]
      : "";
    const duration = initialData.duration || "";
    const isPreset = DURATION_PRESETS.slice(0, -1).includes(duration);
    const destinationId =
      initialData.destination?.name === DRAFT_DESTINATION_NAME
        ? ""
        : String(initialData.destination?.id || initialData.destinationId || "");
    const matchedDestination =
      initialDestinations.find((d) => String(d.id) === destinationId) ??
      initialData.destination;

    setForm({
      name: initialData.name || "",
      nameEn: initialData.nameEn || "",
      description: initialData.description || "",
      descriptionEn: initialData.descriptionEn || "",
      price: String(initialData.price || ""),
      destinationId,
      startDate,
      duration: isPreset ? duration : duration ? "Khác (tùy chỉnh)" : "",
      durationEn: initialData.durationEn || "",
      availableSeats: String(initialData.availableSeats || ""),
      tourType: initialData.tourType || "Tour Gia Đình",
      imageUrl: initialData.imageUrl || "",
      departurePoint: initialData.departurePoint || "",
      departurePointEn: initialData.departurePointEn || "",
    });

    setDestinationQuery(
      matchedDestination?.name
        ? `${matchedDestination.name} · ${(matchedDestination.travelScope ?? "DOMESTIC") === "DOMESTIC" ? "Trong nước" : "Nước ngoài"}`
        : "",
    );
    setDeparturePointQuery(initialData.departurePoint || "");

    if (!isPreset && duration) {
      setDurationMode("custom");
      setCustomDuration(duration);
    }

    setImagePreview(initialData.imageUrl || "");
    setExistingImages(initialData.images ?? []);

    if (initialData.packages?.length) {
      setPackages(mapPackagesToForm(initialData.packages));
    }
    if (initialData.departures?.length) {
      setDepartures(mapDeparturesToForm(initialData.departures));
    }
    setHighlights(
      initialData.highlights?.length ? mapHighlightsToForm(initialData.highlights) : [],
    );
    setFaqs(initialData.faqs?.length ? mapFaqsToForm(initialData.faqs) : []);
    setItinerary(
      initialData.itinerary?.length ? mapItineraryToForm(initialData.itinerary) : [],
    );
  }, [mode, initialData, initialDestinations]);
}

"use client";

import type {
  TourPackage,
  TourDeparture,
  DepartureTransport,
  TourHighlightForm,
  TourFaqForm,
  TourItineraryDayForm,
  ExistingTourPackage,
  ExistingTourDeparture,
  ExistingTourHighlight,
  ExistingTourFaq,
  ExistingTourItineraryDay,
} from "../types";
import { EMPTY_TRANSPORT } from "../DepartureTransportForm";
import { PACKAGE_NAMES, isBookableDepartureDate, toUiDepartureCategory } from "../constants";
import { normalizeTimelineEntries, timelineToText } from "../tourFormUtils";

export const mapPackagesToForm = (packages: ExistingTourPackage[]): TourPackage[] =>
  packages.map((p) => ({
    id: p.id,
    name: p.name || "",
    nameEn: p.nameEn || "",
    description: p.description || "",
    descriptionEn: p.descriptionEn || "",
    nameMode: (PACKAGE_NAMES.includes(p.name || "") ? "select" : "custom") as "select" | "custom",
    price: String(p.price || ""),
    badge: p.badge || "",
    includes: Array.isArray(p.includes)
      ? p.includes
      : (p.includes || "").split("\n").map((s: string) => s.trim()).filter(Boolean),
    includesEn: Array.isArray(p.includesEn)
      ? p.includesEn
      : (p.includesEn || "").split("\n").map((s: string) => s.trim()).filter(Boolean),
    excludes: Array.isArray(p.excludes)
      ? p.excludes
      : (p.excludes || "").split("\n").map((s: string) => s.trim()).filter(Boolean),
    excludesEn: Array.isArray(p.excludesEn)
      ? p.excludesEn
      : (p.excludesEn || "").split("\n").map((s: string) => s.trim()).filter(Boolean),
  }));

export const mapDeparturesToForm = (departures: ExistingTourDeparture[]): TourDeparture[] =>
  departures
    .map((d) => {
      const t = d.transport;
      const transport: DepartureTransport | null = t
        ? {
            ...EMPTY_TRANSPORT,
            type: t.type ?? "SELF_ARRANGED",
            airline: t.airline ?? "",
            flightCode: t.flightCode ?? "",
            departureAirport: t.departureAirport ?? "",
            arrivalAirport: t.arrivalAirport ?? "",
            departureTime: t.departureTime
              ? new Date(t.departureTime).toISOString().slice(0, 16)
              : "",
            arrivalTime: t.arrivalTime
              ? new Date(t.arrivalTime).toISOString().slice(0, 16)
              : "",
            flightClass: t.flightClass ?? "Economy",
            returnFlightCode: t.returnFlightCode ?? "",
            returnAirline: t.returnAirline ?? "",
            returnDepartureAirport: t.returnDepartureAirport ?? "",
            returnArrivalAirport: t.returnArrivalAirport ?? "",
            returnDepartureTime: t.returnDepartureTime
              ? new Date(t.returnDepartureTime).toISOString().slice(0, 16)
              : "",
            returnArrivalTime: t.returnArrivalTime
              ? new Date(t.returnArrivalTime).toISOString().slice(0, 16)
              : "",
            returnFlightClass: t.returnFlightClass ?? "Economy",
            vehicleType: t.vehicleType ?? "",
            operator: t.operator ?? "",
            boardingPoint: t.boardingPoint ?? "",
            boardingTime: t.boardingTime
              ? new Date(t.boardingTime).toISOString().slice(0, 16)
              : "",
            notes: t.notes ?? "",
          }
        : null;
      return {
        id: d.id,
        departureDate:
          d.departureDate && !isNaN(new Date(d.departureDate).getTime())
            ? new Date(d.departureDate).toISOString().split("T")[0]
            : "",
        price: d.price != null ? String(d.price) : "",
        availableSeats: String(d.availableSeats ?? ""),
        maxSeats: String(d.maxSeats ?? d.availableSeats ?? ""),
        note: d.note || "",
        noteEn: d.noteEn || "",
        category: toUiDepartureCategory(d.category),
        flashSaleEndsAt:
          d.flashSaleEndsAt && !isNaN(new Date(d.flashSaleEndsAt).getTime())
            ? new Date(d.flashSaleEndsAt).toISOString().slice(0, 16)
            : "",
        transport,
      };
    })
    .filter((d) => d.departureDate && isBookableDepartureDate(d.departureDate));

export const mapHighlightsToForm = (highlights: ExistingTourHighlight[]): TourHighlightForm[] =>
  highlights.map((h) => ({
    id: h.id,
    content: h.content || "",
    contentEn: h.contentEn || "",
    icon: h.icon || "auto_awesome",
  }));

export const mapFaqsToForm = (faqs: ExistingTourFaq[]): TourFaqForm[] =>
  faqs.map((f) => ({
    id: f.id,
    question: f.question || "",
    questionEn: f.questionEn || "",
    answer: f.answer || "",
    answerEn: f.answerEn || "",
  }));

export const mapItineraryToForm = (
  itinerary: ExistingTourItineraryDay[],
): TourItineraryDayForm[] =>
  [...itinerary]
    .sort((a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0))
    .map((day, index) => ({
      id: day.id,
      dayNumber: day.dayNumber ?? index + 1,
      title: day.title || "",
      titleEn: day.titleEn || "",
      description: day.description || "",
      descriptionEn: day.descriptionEn || "",
      mealsBreakfast: !!day.mealsBreakfast,
      mealsLunch: !!day.mealsLunch,
      mealsDinner: !!day.mealsDinner,
      accommodation: day.accommodation || "",
      accommodationEn: day.accommodationEn || "",
      transport: day.transport || "",
      transportEn: day.transportEn || "",
      activitiesText: Array.isArray(day.activities) ? day.activities.join("\n") : "",
      activitiesEnText: Array.isArray(day.activitiesEn) ? day.activitiesEn.join("\n") : "",
      timelineItems: normalizeTimelineEntries(day.timeline),
      timelineEnItems: normalizeTimelineEntries(day.timelineEn),
      timelineText: timelineToText(day.timeline),
      timelineEnText: timelineToText(day.timelineEn),
    }));

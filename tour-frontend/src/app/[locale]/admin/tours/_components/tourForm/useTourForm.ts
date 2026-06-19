"use client";

import { useState } from "react";
import type {
  TourFormData,
  TourFormErrors,
  TourFormModalProps,
} from "./types";
import { EMPTY_FORM, getTodayDateString } from "./constants";
import { useTourFormPresets } from "./useTourFormPresets";
import { useTourFormDestination } from "./useTourFormDestination";
import { useTourFormTranslation } from "./useTourFormTranslation";
import { useTourFormCollections } from "./useTourFormCollections";
import { useTourFormImages } from "./useTourFormImages";
import { useTourFormPrefill } from "./useTourFormPrefill";
import { getReviewReadiness, focusReviewIssue } from "./_lib/tourFormReview";
import { useTourFormSubmit } from "./useTourFormSubmit";

export type { TourFormErrors };
export { EMPTY_FAQ, EMPTY_PKG, createEmptyItineraryDay } from "./tourFormUtils";

// ── Hook ──────────────────────────────────────────────────────────────────

type UseTourFormParams = Pick<
  TourFormModalProps,
  | "mode"
  | "initialData"
  | "destinations"
  | "userRole"
  | "onSuccess"
  | "onClose"
  | "onDestinationCreated"
>;

export function useTourForm({
  mode,
  initialData,
  destinations: initialDestinations,
  userRole = "",
  onSuccess,
  onClose,
  onDestinationCreated,
}: UseTourFormParams) {
  const isStaff = userRole === "STAFF";
  const isAdminLike = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const canSaveSharedPackagePreset = isAdminLike;

  // ── Core form state ────────────────────────────────────────────────
  const [form, setForm] = useState<TourFormData>(() => ({
    ...EMPTY_FORM,
    startDate: getTodayDateString(),
  }));
  const [errors, setErrors] = useState<TourFormErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [saveAction, setSaveAction] = useState<"draft" | "submit" | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── Collections ────────────────────────────────────────────────────
  const {
    packages, setPackages,
    departures, setDepartures,
    highlights, setHighlights,
    faqs, setFaqs,
    itinerary, setItinerary,
    openFlashTimeIndex, setOpenFlashTimeIndex,
    openSaleCategoryIndex, setOpenSaleCategoryIndex,
    openTransportIndex, setOpenTransportIndex,
    openPackageNameIndex, setOpenPackageNameIndex,
    openPackageBadgeIndex, setOpenPackageBadgeIndex,
    openFaqTemplateIndex, setOpenFaqTemplateIndex,
    updateDeparture, updateDepartureCategory, updateFlashSaleDate, updateFlashSaleTime,
    handleAddDeparture, handleRemoveDeparture,
    updatePackage, selectPackageBadge, handleAddPackage, handleRemovePackage,
    updateHighlight, handleRemoveHighlight, handleAddHighlight,
    updateFaq, handleAddFaq, handleRemoveFaq, applyFaqTemplate,
    updateItineraryDay, updateItineraryTimelineEntry, addItineraryTimelineEntry,
    removeItineraryTimelineEntry, handleRemoveItineraryDay, handleAddItineraryDay,
  } = useTourFormCollections({ mode, setIsDirty, setErrors, setGlobalError });

  // ── Image state ────────────────────────────────────────────────────
  const {
    imageFile, setImageFile,
    imagePreview, setImagePreview,
    galleryFiles, setGalleryFiles,
    galleryPreviews, setGalleryPreviews,
    existingImages, setExistingImages,
    deletingImageId, setDeletingImageId,
    handleImageChange,
  } = useTourFormImages({ setIsDirty });

  // ── Presets ────────────────────────────────────────────────────────
  const { includePresets, excludePresets, normalizeSearchValue, createSharedPackagePreset } =
    useTourFormPresets();

  // ── Dialog state ───────────────────────────────────────────────────
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // ── Destination ────────────────────────────────────────────────────
  const {
    destinations,
    setDestinations,
    destinationQuery,
    setDestinationQuery,
    isDestinationListOpen,
    setIsDestinationListOpen,
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
    getDestinationLabel,
    selectDestination,
    clearDestination,
    handleCreateDestination,
  } = useTourFormDestination({
    initialDestinations,
    onSetDestinationId: (id) => {
      setForm((prev) => ({ ...prev, destinationId: id }));
      setIsDirty(true);
      setErrors((prev) => ({ ...prev, destinationId: undefined }));
    },
    onDestinationCreated,
  });

  // ── Location/Duration UI state ─────────────────────────────────────
  const [departurePointQuery, setDeparturePointQuery] = useState("");
  const [isDeparturePointListOpen, setIsDeparturePointListOpen] =
    useState(false);
  const [showNewDeparture, setShowNewDeparture] = useState(false);
  const [newDepartureName, setNewDepartureName] = useState("");
  const [durationMode, setDurationMode] = useState<"preset" | "custom">(
    "preset",
  );
  const [customDuration, setCustomDuration] = useState("");
  const [isDurationListOpen, setIsDurationListOpen] = useState(false);

  // ── English translation ────────────────────────────────────────────
  const { showEnglishFields, setShowEnglishFields, isTranslatingEnglish, handleGenerateEnglishDraft } =
    useTourFormTranslation({
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
    });

  // ── Pre-fill on edit ───────────────────────────────────────────────
  useTourFormPrefill({
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
  });

  // ── Handlers ───────────────────────────────────────────────────────

  const handleChange = (field: keyof TourFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const selectDeparturePoint = (value: string) => {
    handleChange("departurePoint", value);
    setDeparturePointQuery(value);
    setIsDeparturePointListOpen(false);
  };

  const clearDeparturePoint = () => {
    handleChange("departurePoint", "");
    setDeparturePointQuery("");
    setIsDeparturePointListOpen(true);
  };

  const confirmNewDeparturePoint = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    selectDeparturePoint(trimmed);
    setShowNewDeparture(false);
    setNewDepartureName("");
  };

  const handleDurationSelect = (val: string) => {
    if (val === "Khác (tùy chỉnh)") {
      setDurationMode("custom");
      handleChange("duration", customDuration);
    } else {
      setDurationMode("preset");
      setCustomDuration("");
      handleChange("duration", val);
    }
    setIsDurationListOpen(false);
  };

  // ── Review readiness ───────────────────────────────────────────────
  const buildReviewReadiness = () =>
    getReviewReadiness({
      form,
      durationMode,
      customDuration,
      departures,
      existingImages,
      galleryFiles,
      imagePreview,
      imageFile,
      highlights,
      faqs,
      itinerary,
      packages,
    });

  // ── Validation ─────────────────────────────────────────────────────
  const validateForReview = (): boolean => {
    setGlobalError("");
    const readiness = buildReviewReadiness();
    const newErrors: TourFormErrors = {};
    readiness.required.forEach((item) => {
      if (!item.done && item.field) newErrors[item.field] = item.error;
    });
    setErrors(newErrors);
    if (readiness.missingRequired.length > 0) {
      const actionLabel = isStaff ? "gửi duyệt" : "public";
      setGlobalError(
        `Vui lòng hoàn thiện trước khi ${actionLabel}: ${readiness.missingRequired.map((item) => item.label).join(", ")}.`,
      );
      focusReviewIssue(readiness.missingRequired[0]);
      return false;
    }
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const { handleSave, handleSubmit } = useTourFormSubmit({
    form,
    packages,
    departures,
    highlights,
    faqs,
    itinerary,
    imageFile,
    galleryFiles,
    durationMode,
    customDuration,
    mode,
    initialData,
    isStaff,
    isAdminLike,
    setSaveAction,
    setGlobalError,
    validateForReview,
    onSuccess,
    onClose,
  });

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  return {
    // Role flags
    isStaff,
    isAdminLike,
    canSaveSharedPackagePreset,

    // Core form
    form,
    setForm,
    errors,
    setErrors,
    globalError,
    setGlobalError,
    saveAction,
    isSaving: saveAction !== null,
    isDirty,
    setIsDirty,
    showEnglishFields,
    setShowEnglishFields,
    isTranslatingEnglish,

    // Collections
    destinations,
    setDestinations,
    packages,
    setPackages,
    departures,
    setDepartures,
    highlights,
    setHighlights,
    faqs,
    setFaqs,
    itinerary,
    setItinerary,

    // Image
    imageFile,
    setImageFile,
    imagePreview,
    setImagePreview,
    galleryFiles,
    setGalleryFiles,
    galleryPreviews,
    setGalleryPreviews,
    existingImages,
    setExistingImages,
    deletingImageId,
    setDeletingImageId,

    // Presets
    includePresets,
    excludePresets,

    // Dialog
    showConfirmClose,
    setShowConfirmClose,

    // Destination creation
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

    // Location/Duration
    departurePointQuery,
    setDeparturePointQuery,
    isDeparturePointListOpen,
    setIsDeparturePointListOpen,
    showNewDeparture,
    setShowNewDeparture,
    newDepartureName,
    setNewDepartureName,
    durationMode,
    setDurationMode,
    customDuration,
    setCustomDuration,
    isDurationListOpen,
    setIsDurationListOpen,

    // Dropdown UI
    openFlashTimeIndex,
    setOpenFlashTimeIndex,
    openSaleCategoryIndex,
    setOpenSaleCategoryIndex,
    openTransportIndex,
    setOpenTransportIndex,
    openPackageNameIndex,
    setOpenPackageNameIndex,
    openPackageBadgeIndex,
    setOpenPackageBadgeIndex,
    openFaqTemplateIndex,
    setOpenFaqTemplateIndex,

    // Handlers — form
    handleChange,
    normalizeSearchValue,
    createSharedPackagePreset,

    // Handlers — destination
    getDestinationLabel,
    selectDestination,
    clearDestination,
    handleCreateDestination,

    // Handlers — departure point
    selectDeparturePoint,
    clearDeparturePoint,
    confirmNewDeparturePoint,

    // Handlers — image
    handleImageChange,

    // Handlers — departures
    updateDeparture,
    updateDepartureCategory,
    updateFlashSaleDate,
    updateFlashSaleTime,
    handleAddDeparture,
    handleRemoveDeparture,

    // Handlers — packages
    updatePackage,
    selectPackageBadge,
    handleAddPackage,
    handleRemovePackage,

    // Handlers — highlights
    updateHighlight,
    handleRemoveHighlight,
    handleAddHighlight,

    // Handlers — faqs
    updateFaq,
    handleAddFaq,
    handleRemoveFaq,
    applyFaqTemplate,

    // Handlers — itinerary
    updateItineraryDay,
    updateItineraryTimelineEntry,
    addItineraryTimelineEntry,
    removeItineraryTimelineEntry,
    handleRemoveItineraryDay,
    handleAddItineraryDay,

    // Handlers — duration
    handleDurationSelect,

    // Handlers — review/submit
    getReviewReadiness: buildReviewReadiness,
    handleGenerateEnglishDraft,
    handleSave,
    handleSubmit,
    handleCloseAttempt,
  };
}

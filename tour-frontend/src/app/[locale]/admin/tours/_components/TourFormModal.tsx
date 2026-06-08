"use client";

import { useEffect, useRef } from "react";
import type { TourFormModalProps } from "./tourForm/types";
import { cleanTimelineEntries } from "./tourForm/constants";
import { TourBasicInfoSection } from "./tourForm/TourBasicInfoSection";
import { TourLocationSection } from "./tourForm/TourLocationSection";
import { TourDeparturesSection } from "./tourForm/TourDeparturesSection";
import { TourImagesSection } from "./tourForm/TourImagesSection";
import { TourFaqSection } from "./tourForm/TourFaqSection";
import { TourPackagesSection } from "./tourForm/TourPackagesSection";
import { TourItinerarySection } from "./tourForm/TourItinerarySection";
import { TourHighlightSection } from "./tourForm/TourHighlightSection";
import { TourPricingSection } from "./tourForm/TourPricingSection";
import { TourFormSidebar } from "./tourForm/TourFormSidebar";
import { TourFormHeader } from "./tourForm/TourFormHeader";
import { TourFormFooter } from "./tourForm/TourFormFooter";
import { TourFormConfirmClose } from "./tourForm/TourFormConfirmClose";
import { useTourForm } from "./tourForm/useTourForm";

// ── Component ──────────────────────────────────────────────────────────
export default function TourFormModal({
  mode,
  initialData,
  destinations: initialDestinations,
  userRole = "",
  onSuccess,
  onClose,
  onDestinationCreated,
}: TourFormModalProps) {
  const {
    isStaff,
    isAdminLike,
    canSaveSharedPackagePreset,
    form,
    errors,
    setErrors,
    globalError,
    setGlobalError,
    saveAction,
    isSaving,
    setIsDirty,
    showEnglishFields,
    setShowEnglishFields,
    isTranslatingEnglish,
    destinations,
    packages,
    departures,
    highlights,
    faqs,
    itinerary,
    imageFile,
    imagePreview,
    galleryFiles,
    setGalleryFiles,
    galleryPreviews,
    setGalleryPreviews,
    existingImages,
    setExistingImages,
    deletingImageId,
    setDeletingImageId,
    includePresets,
    excludePresets,
    showConfirmClose,
    setShowConfirmClose,
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
    handleChange,
    normalizeSearchValue,
    createSharedPackagePreset,
    getDestinationLabel,
    selectDestination,
    clearDestination,
    handleCreateDestination,
    selectDeparturePoint,
    clearDeparturePoint,
    handleImageChange,
    updateDeparture,
    updateDepartureCategory,
    updateFlashSaleDate,
    updateFlashSaleTime,
    handleAddDeparture,
    handleRemoveDeparture,
    updatePackage,
    selectPackageBadge,
    handleAddPackage,
    handleRemovePackage,
    updateHighlight,
    handleRemoveHighlight,
    handleAddHighlight,
    updateFaq,
    handleAddFaq,
    handleRemoveFaq,
    applyFaqTemplate,
    updateItineraryDay,
    updateItineraryTimelineEntry,
    addItineraryTimelineEntry,
    removeItineraryTimelineEntry,
    handleRemoveItineraryDay,
    handleAddItineraryDay,
    handleDurationSelect,
    getReviewReadiness,
    handleGenerateEnglishDraft,
    handleSave,
    handleSubmit,
    handleCloseAttempt,
  } = useTourForm({ mode, initialData, destinations: initialDestinations, userRole, onSuccess, onClose, onDestinationCreated });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);
  const isPublishedEdit =
    mode === "edit" && initialData?.status === "PUBLISHED";
  const primaryIcon = isStaff ? "send" : isPublishedEdit ? "save" : "publish";
  const primaryLabel = isStaff
    ? "Lưu & gửi duyệt"
    : isPublishedEdit
      ? "Lưu thay đổi"
      : "Xác nhận public";
  const readiness = getReviewReadiness();
  const requiredChecklist = readiness.required;
  const recommendedChecklist = readiness.recommended;
  const missingRequired = readiness.missingRequired;
  const requiredDoneCount = readiness.completedRequired;
  const requiredProgress = Math.round(
    (requiredDoneCount / requiredChecklist.length) * 100,
  );
  const isReadyForReview = missingRequired.length === 0;
  const readinessToneClass = isReadyForReview
    ? "bg-emerald-500/10 text-emerald-700"
    : "bg-amber-500/10 text-amber-700";
  const hasDepartureReviewError = Boolean(errors.startDate);
  const sectionIssueCounts = requiredChecklist.reduce<Record<string, number>>(
    (acc, item) => {
      if (!item.done) acc[item.target] = (acc[item.target] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const reviewRequirementText = isStaff
    ? "Bắt buộc khi gửi duyệt"
    : "Bắt buộc khi public";
  const finalActionText = isStaff ? "Gửi duyệt" : "Xác nhận public";
  const hasEnglishTranslationSource = Boolean(
    form.name.trim() ||
    form.description.trim() ||
    form.departurePoint.trim() ||
    (durationMode === "custom"
      ? customDuration.trim()
      : form.duration.trim()) ||
    packages.some(
      (pkg) =>
        pkg.name.trim() ||
        pkg.description.trim() ||
        pkg.includes.length ||
        pkg.excludes.length,
    ) ||
    departures.some((departure) => departure.note.trim()) ||
    highlights.some((highlight) => highlight.content.trim()) ||
    faqs.some((faq) => faq.question.trim() || faq.answer.trim()) ||
    itinerary.some(
      (day) =>
        day.title.trim() ||
        day.description.trim() ||
        day.accommodation.trim() ||
        day.transport.trim() ||
        day.activitiesText.trim() ||
        cleanTimelineEntries(day.timelineItems).length > 0,
    ),
  );
  const requiredBadge = (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-primary">
      {reviewRequirementText}
    </span>
  );
  const recommendedBadge = (
    <span className="inline-flex items-center rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-on-surface-variant">
      Khuyến nghị
    </span>
  );
  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ overscrollBehavior: "contain" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Global Error Toast (Top Right) */}
      {globalError && (
        <div className="fixed left-4 right-4 top-4 sm:left-auto sm:right-6 sm:top-6 z-[60] flex items-start gap-3.5 p-4 bg-white border border-error/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl sm:w-[380px] animate-fade-slide-up">
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-error text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-bold text-on-surface mb-1">
              Không thể lưu tour
            </p>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              {globalError}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError("")}
            className="p-2 -mr-1 -mt-1 text-on-surface-variant hover:bg-surface-container hover:text-error rounded-xl transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      {/* ── Custom Confirm-Close Dialog ── */}
      {showConfirmClose && (
        <TourFormConfirmClose
          onContinue={() => setShowConfirmClose(false)}
          onLeave={() => {
            setShowConfirmClose(false);
            onClose();
          }}
        />
      )}

      {/* Panel */}
      <div className="relative w-full max-w-6xl h-[94vh] sm:h-[92vh] max-h-[94vh] sm:max-h-[92vh] flex flex-col bg-surface-container-lowest rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-fade-slide-up">
        {/* ── Hero Header ── */}
        <TourFormHeader
          mode={mode}
          isStaff={isStaff}
          tourName={initialData?.name}
          onClose={handleCloseAttempt}
        />

        <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
          <TourFormSidebar
            sectionIssueCounts={sectionIssueCounts}
            requiredChecklist={requiredChecklist}
            recommendedChecklist={recommendedChecklist}
            requiredDoneCount={requiredDoneCount}
            isReadyForReview={isReadyForReview}
            missingRequired={missingRequired}
            requiredProgress={requiredProgress}
            readinessToneClass={readinessToneClass}
          />

          <div className="min-h-0 flex flex-col">
            {/* ── Form Body ── */}
            <form
              id="tour-form"
              onSubmit={handleSubmit}
              className="overflow-y-auto flex-1 scroll-smooth px-5 py-5 sm:px-7 lg:px-8 lg:py-6 space-y-6 sm:space-y-7"
              noValidate
            >
              <div className="lg:hidden rounded-2xl border border-outline-variant/15 bg-surface-container-low/50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-on-surface-variant/70">
                      Sẵn sàng gửi duyệt
                    </p>
                    <p className="text-sm font-bold text-on-surface mt-1">
                      {isReadyForReview
                        ? "Đủ điều kiện gửi duyệt"
                        : `${requiredDoneCount}/${requiredChecklist.length} mục bắt buộc đã đủ`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${readinessToneClass}`}
                  >
                    {requiredProgress}%
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-outline-variant/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${isReadyForReview ? "bg-emerald-600" : "bg-primary"}`}
                    style={{
                      width: `${requiredProgress}%`,
                    }}
                  />
                </div>
                {!isReadyForReview && (
                  <p className="mt-3 text-[11px] leading-relaxed text-amber-700">
                    Còn thiếu:{" "}
                    {missingRequired
                      .slice(0, 3)
                      .map((item) => item.label)
                      .join(", ")}
                    {missingRequired.length > 3
                      ? ` và ${missingRequired.length - 3} mục khác`
                      : ""}
                    .
                  </p>
                )}
              </div>

              {/* ─── Section 1: Thông tin cơ bản ─── */}
              <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low/45 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[17px]">
                      translate
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      Bản dịch tiếng Anh là tùy chọn
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                      Staff chỉ cần nhập tiếng Việt. Khi khách xem trang tiếng
                      Anh, hệ thống sẽ dùng bản English nếu có, nếu không sẽ tự
                      fallback từ nội dung tiếng Việt.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={handleGenerateEnglishDraft}
                    disabled={
                      !hasEnglishTranslationSource || isTranslatingEnglish
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary outline-none disabled:cursor-not-allowed disabled:bg-outline-variant/40 disabled:text-on-surface-variant sm:w-auto"
                  >
                    <span
                      className={`material-symbols-outlined text-[17px] ${isTranslatingEnglish ? "animate-spin" : ""}`}
                    >
                      {isTranslatingEnglish
                        ? "progress_activity"
                        : "auto_awesome"}
                    </span>
                    {isTranslatingEnglish
                      ? "Đang tạo..."
                      : "Tự tạo bản tiếng Anh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEnglishFields((value) => !value)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface hover:text-primary focus-visible:ring-2 focus-visible:ring-primary outline-none sm:w-auto"
                    aria-expanded={showEnglishFields}
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {showEnglishFields ? "visibility_off" : "edit_note"}
                    </span>
                    {showEnglishFields ? "Ẩn bản dịch" : "Chỉnh bản tiếng Anh"}
                  </button>
                </div>
              </div>

              <TourBasicInfoSection
                form={form}
                errors={errors}
                showEnglishFields={showEnglishFields}
                firstInputRef={firstInputRef}
                requiredBadge={requiredBadge}
                handleChange={handleChange}
              />

              {/* ─── Section 2: Địa điểm & thời lượng ─── */}
              <TourLocationSection
                form={form}
                errors={errors}
                showEnglishFields={showEnglishFields}
                destinations={destinations}
                requiredBadge={requiredBadge}
                showNewDest={showNewDest}
                setShowNewDest={setShowNewDest}
                newDestName={newDestName}
                setNewDestName={setNewDestName}
                newDestTravelScope={newDestTravelScope}
                setNewDestTravelScope={setNewDestTravelScope}
                newDestCountryCode={newDestCountryCode}
                setNewDestCountryCode={setNewDestCountryCode}
                isCreatingDest={isCreatingDest}
                newDestError={newDestError}
                setNewDestError={setNewDestError}
                destinationQuery={destinationQuery}
                setDestinationQuery={setDestinationQuery}
                isDestinationListOpen={isDestinationListOpen}
                setIsDestinationListOpen={setIsDestinationListOpen}
                departurePointQuery={departurePointQuery}
                setDeparturePointQuery={setDeparturePointQuery}
                isDeparturePointListOpen={isDeparturePointListOpen}
                setIsDeparturePointListOpen={setIsDeparturePointListOpen}
                durationMode={durationMode}
                customDuration={customDuration}
                setCustomDuration={setCustomDuration}
                isDurationListOpen={isDurationListOpen}
                setIsDurationListOpen={setIsDurationListOpen}
                handleChange={handleChange}
                normalizeSearchValue={normalizeSearchValue}
                getDestinationLabel={getDestinationLabel}
                selectDestination={selectDestination}
                clearDestination={clearDestination}
                handleCreateDestination={handleCreateDestination}
                selectDeparturePoint={selectDeparturePoint}
                clearDeparturePoint={clearDeparturePoint}
                handleDurationSelect={handleDurationSelect}
                onClearDurationError={() =>
                  setErrors((p) => ({ ...p, duration: undefined }))
                }
              />

              {/* ─── Section 3: Giá & Số lượng ─── */}
              <TourPricingSection
                form={form}
                errors={errors}
                requiredBadge={requiredBadge}
                handleChange={handleChange}
              />

              {/* ─── Section 4: Ngày Khởi Hành ─── */}
              <TourDeparturesSection
                departures={departures}
                errors={errors}
                showEnglishFields={showEnglishFields}
                hasDepartureReviewError={hasDepartureReviewError}
                requiredBadge={requiredBadge}
                openSaleCategoryIndex={openSaleCategoryIndex}
                setOpenSaleCategoryIndex={setOpenSaleCategoryIndex}
                openFlashTimeIndex={openFlashTimeIndex}
                setOpenFlashTimeIndex={setOpenFlashTimeIndex}
                openTransportIndex={openTransportIndex}
                setOpenTransportIndex={setOpenTransportIndex}
                defaultPrice={form.price}
                updateDeparture={updateDeparture}
                updateDepartureCategory={updateDepartureCategory}
                updateFlashSaleDate={updateFlashSaleDate}
                updateFlashSaleTime={updateFlashSaleTime}
                handleRemoveDeparture={handleRemoveDeparture}
                handleAddDeparture={handleAddDeparture}
              />

              {/* ─── Section 5: Hình ảnh ─── */}
              <TourImagesSection
                imagePreview={imagePreview}
                imageFile={imageFile}
                imageUrl={form.imageUrl}
                fileInputRef={fileInputRef}
                handleImageChange={handleImageChange}
                recommendedBadge={recommendedBadge}
                existingImages={existingImages}
                setExistingImages={setExistingImages}
                deletingImageId={deletingImageId}
                setDeletingImageId={setDeletingImageId}
                tourId={initialData?.id}
                galleryInputRef={galleryInputRef}
                galleryFiles={galleryFiles}
                setGalleryFiles={setGalleryFiles}
                galleryPreviews={galleryPreviews}
                setGalleryPreviews={setGalleryPreviews}
                setIsDirty={setIsDirty}
              />

              {/* ─── Section 6: Gói tour ─── */}
              <TourPackagesSection
                packages={packages}
                showEnglishFields={showEnglishFields}
                openPackageNameIndex={openPackageNameIndex}
                setOpenPackageNameIndex={setOpenPackageNameIndex}
                openPackageBadgeIndex={openPackageBadgeIndex}
                setOpenPackageBadgeIndex={setOpenPackageBadgeIndex}
                includePresets={includePresets}
                excludePresets={excludePresets}
                canSaveSharedPackagePreset={canSaveSharedPackagePreset}
                normalizeSearchValue={normalizeSearchValue}
                updatePackage={updatePackage}
                selectPackageBadge={selectPackageBadge}
                handleAddPackage={handleAddPackage}
                handleRemovePackage={handleRemovePackage}
                createSharedPackagePreset={createSharedPackagePreset}
              />

              {/* --- Section 7: Diem noi bat --- */}
              <TourHighlightSection
                highlights={highlights}
                showEnglishFields={showEnglishFields}
                updateHighlight={updateHighlight}
                onRemoveHighlight={handleRemoveHighlight}
                onAddHighlight={handleAddHighlight}
              />

              {/* --- Section 8: FAQ --- */}
              <TourFaqSection
                faqs={faqs}
                showEnglishFields={showEnglishFields}
                openFaqTemplateIndex={openFaqTemplateIndex}
                setOpenFaqTemplateIndex={setOpenFaqTemplateIndex}
                applyFaqTemplate={applyFaqTemplate}
                updateFaq={updateFaq}
                handleRemoveFaq={handleRemoveFaq}
                handleAddFaq={handleAddFaq}
              />

              <TourItinerarySection
                itinerary={itinerary}
                showEnglishFields={showEnglishFields}
                updateItineraryDay={updateItineraryDay}
                updateItineraryTimelineEntry={updateItineraryTimelineEntry}
                addItineraryTimelineEntry={addItineraryTimelineEntry}
                removeItineraryTimelineEntry={removeItineraryTimelineEntry}
                onRemoveDay={handleRemoveItineraryDay}
                onAddDay={handleAddItineraryDay}
              />
            </form>

            {/* ── Footer ── */}
            <TourFormFooter
              finalActionText={finalActionText}
              isStaff={isStaff}
              isAdminLike={isAdminLike}
              isSaving={isSaving}
              saveAction={saveAction}
              primaryIcon={primaryIcon}
              primaryLabel={primaryLabel}
              onCloseAttempt={handleCloseAttempt}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

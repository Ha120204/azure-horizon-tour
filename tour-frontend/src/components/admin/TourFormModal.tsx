"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import DatePickerDropdown from "@/components/search/DatePickerDropdown";
import { API_BASE_URL } from "@/lib/constants";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import type {
  TravelScope,
  SaleCategory,
  TourFormModalProps,
} from "./tourForm/types";
import {
  DEPARTURE_POINTS,
  DURATION_PRESETS,
  isBookableDepartureDate,
  MIN_START_DATE,
  PACKAGE_NAMES,
  formatCurrencyInput,
  stripCurrencyInput,
} from "./tourForm/constants";
import { TagChipField } from "./tourForm/TagChipField";
import { TourBasicInfoSection } from "./tourForm/TourBasicInfoSection";
import { TourItinerarySection } from "./tourForm/TourItinerarySection";
import { TourHighlightSection } from "./tourForm/TourHighlightSection";
import { TourPricingSection } from "./tourForm/TourPricingSection";
import { useTourForm } from "./tourForm/useTourForm";

const FAQ_TEMPLATES = [
  {
    category: "Gia đình",
    question: "Tour có phù hợp cho trẻ em không?",
    questionEn: "Is this tour suitable for children?",
    answerHint: "Nêu độ tuổi phù hợp, cường độ lịch trình và lưu ý nếu có.",
  },
  {
    category: "Điểm đón",
    question: "Điểm đón hoặc điểm hẹn ở đâu?",
    questionEn: "Where is the pickup or meeting point?",
    answerHint:
      "Ghi rõ khu vực đón, thời gian có mặt và cách nhận thông tin chi tiết.",
  },
  {
    category: "Chính sách",
    question: "Tôi có thể hủy hoặc đổi ngày tour không?",
    questionEn: "Can I cancel or reschedule the tour?",
    answerHint: "Nêu điều kiện hủy/đổi ngày, mốc thời gian và cách liên hệ.",
  },
  {
    category: "Chi phí",
    question: "Giá tour đã bao gồm những gì?",
    questionEn: "What is included in the tour price?",
    answerHint:
      "Tóm tắt các khoản chính và nhắc khách xem mục bao gồm/không bao gồm.",
  },
  {
    category: "Chuẩn bị",
    question: "Tôi cần chuẩn bị gì trước chuyến đi?",
    questionEn: "What should I prepare before the trip?",
    answerHint:
      "Nhắc giấy tờ, trang phục, vật dụng cá nhân hoặc yêu cầu sức khỏe.",
  },
  {
    category: "Thời tiết",
    question: "Nếu thời tiết xấu thì tour xử lý như thế nào?",
    questionEn: "What happens if the weather is bad?",
    answerHint:
      "Nêu phương án đổi lịch, điều chỉnh lịch trình hoặc hỗ trợ từ điều hành tour.",
  },
  {
    category: "Phụ thu",
    question: "Tour có phụ thu cuối tuần hoặc ngày lễ không?",
    questionEn: "Are there weekend or holiday surcharges?",
    answerHint: "Nêu rõ trường hợp phát sinh phụ thu và thời điểm thông báo.",
  },
];


const FLASH_SALE_TIME_OPTIONS = [
  ...Array.from({ length: 48 }, (_, index) => {
    const hours = String(Math.floor(index / 2)).padStart(2, "0");
    const minutes = index % 2 === 0 ? "00" : "30";
    return `${hours}:${minutes}`;
  }),
  "23:59",
];

const PACKAGE_BADGE_OPTIONS = [
  {
    value: "",
    label: "Không có",
    icon: "block",
    tone: "text-on-surface-variant",
  },
  {
    value: "POPULAR",
    label: "Được chọn nhiều",
    icon: "local_fire_department",
    tone: "text-orange-600",
  },
  {
    value: "BEST VALUE",
    label: "Đáng tiền nhất",
    icon: "diamond",
    tone: "text-blue-600",
  },
  {
    value: "LUXURY",
    label: "Cao cấp",
    icon: "auto_awesome",
    tone: "text-violet-600",
  },
];

const SALE_CATEGORY_OPTIONS = [
  {
    value: "all",
    label: "Bình thường",
    icon: "sell",
    tone: "text-on-surface-variant",
    activeClass: "bg-primary/10 text-primary",
  },
  {
    value: "flash",
    label: "Flash Sale",
    icon: "bolt",
    tone: "text-error",
    activeClass: "bg-error/10 text-error",
  },
  {
    value: "early",
    label: "Đặt Sớm",
    icon: "event_available",
    tone: "text-emerald-700",
    activeClass: "bg-emerald-500/10 text-emerald-700",
  },
  {
    value: "lastminute",
    label: "Giờ Chót",
    icon: "schedule",
    tone: "text-amber-700",
    activeClass: "bg-amber-500/10 text-amber-700",
  },
] satisfies {
  value: SaleCategory;
  label: string;
  icon: string;
  tone: string;
  activeClass: string;
}[];


const getDatePart = (value: string) => (value ? value.slice(0, 10) : "");
const getTimePart = (value: string) =>
  value && value.length >= 16 ? value.slice(11, 16) : "";
const cleanTimelineEntries = (timeline?: { time: string; activity: string }[] | null) =>
  (Array.isArray(timeline) ? timeline : [])
    .map((item) => ({ time: String(item.time ?? "").trim(), activity: String(item.activity ?? "").trim() }))
    .filter((item) => item.time && item.activity);

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
    setPackages,
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
  const newDestInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (showNewDest) newDestInputRef.current?.focus();
  }, [showNewDest]);
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
  const editorSections = [
    { id: "tour-section-basic", icon: "info", label: "Thông tin cơ bản" },
    {
      id: "tour-section-location",
      icon: "location_on",
      label: "Địa điểm & thời lượng",
    },
    {
      id: "tour-section-pricing",
      icon: "payments",
      label: "Giá & số lượng",
    },
    {
      id: "tour-section-departures",
      icon: "calendar_month",
      label: "Ngày khởi hành",
    },
    { id: "tour-section-cover", icon: "image", label: "Ảnh bìa" },
    { id: "tour-section-gallery", icon: "photo_library", label: "Gallery" },
    { id: "tour-section-packages", icon: "package_2", label: "Gói tour" },
    {
      id: "tour-section-highlights",
      icon: "auto_awesome",
      label: "Điểm nổi bật",
    },
    { id: "tour-section-faqs", icon: "help_outline", label: "FAQ" },
    { id: "tour-section-itinerary", icon: "route", label: "Lịch trình" },
  ];
  const scrollToSection = (sectionId: string) => {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const reviewRequirementText = isStaff
    ? "Bắt buộc khi gửi duyệt"
    : "Bắt buộc khi public";
  const finalActionText = isStaff ? "Gửi duyệt" : "Xác nhận public";
  const englishFieldClass = showEnglishFields ? "" : "hidden";
  const bilingualGridClass = showEnglishFields
    ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
    : "grid grid-cols-1 gap-3";
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
  const selectedDestination = destinations.find(
    (destination) => String(destination.id) === form.destinationId,
  );
  const destinationSearchTerm = normalizeSearchValue(
    destinationQuery.replace(/·.*/, ""),
  );
  const filteredDestinations = destinations
    .filter((destination) => {
      if (!destinationSearchTerm) return true;
      return normalizeSearchValue(getDestinationLabel(destination)).includes(
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
  const helperTextClass =
    "mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/65";
  const labelWithBadgeClass =
    "mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant";
  const compactLabelWithBadgeClass =
    "mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant";

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
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm mx-4 animate-fade-slide-up">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <span
                className="material-symbols-outlined text-amber-600 text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
            </div>
            <h3 className="text-base font-bold text-on-surface text-center mb-2">
              Rời khỏi không lưu?
            </h3>
            <p className="text-sm text-on-surface-variant text-center mb-6 leading-relaxed">
              Bạn có thay đổi chưa được lưu. Nếu rời, mọi chỉnh sửa sẽ mất.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClose(false)}
                className="flex-1 py-3 rounded-2xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                onClick={() => {
                  setShowConfirmClose(false);
                  onClose();
                }}
                className="flex-1 py-3 rounded-2xl bg-error text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Rời khỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel */}
      <div className="relative w-full max-w-6xl h-[94vh] sm:h-[92vh] max-h-[94vh] sm:max-h-[92vh] flex flex-col bg-surface-container-lowest rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-fade-slide-up">
        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
              backgroundSize: "50px 50px, 35px 35px",
            }}
          />
          <div className="relative z-[1] px-5 py-5 sm:px-7 sm:py-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[22px]">
                  {mode === "edit" ? "edit_note" : "add_location_alt"}
                </span>
              </div>
              <div>
                <h2
                  id="modal-title"
                  className="font-headline text-lg font-bold text-white leading-tight"
                >
                  {mode === "edit"
                    ? "Chỉnh Sửa Tour"
                    : isStaff
                      ? "Tạo Bản Nháp Tour"
                      : "Tạo Tour Mới"}
                </h2>
                <p className="text-white/60 text-xs mt-0.5">
                  {mode === "edit"
                    ? `Đang sửa: ${initialData?.name || "bản nháp tour"}`
                    : isStaff
                      ? "Lưu nháp trước, hoàn thiện sau rồi gửi Admin duyệt"
                      : "Lưu nháp trước, kiểm tra rồi xác nhận public lên trang khách hàng"}
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseAttempt}
              aria-label="Đóng modal"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:flex min-h-0 flex-col border-r border-outline-variant/10 bg-surface-container-low/45">
            <div className="p-5 border-b border-outline-variant/10">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-on-surface-variant/70">
                Sẵn sàng gửi duyệt
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-black text-on-surface">
                    {requiredDoneCount}/{requiredChecklist.length}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {isReadyForReview
                      ? "Đủ điều kiện gửi duyệt"
                      : `${missingRequired.length} mục còn thiếu`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${readinessToneClass}`}
                >
                  {requiredProgress}%
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-outline-variant/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${isReadyForReview ? "bg-emerald-600" : "bg-primary"}`}
                  style={{ width: `${requiredProgress}%` }}
                />
              </div>
              {!isReadyForReview && (
                <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-3">
                  <p className="text-xs font-bold text-amber-800">
                    Cần hoàn thiện trước khi gửi
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-800/80">
                    {missingRequired
                      .slice(0, 3)
                      .map((item) => item.label)
                      .join(", ")}
                    {missingRequired.length > 3
                      ? ` và ${missingRequired.length - 3} mục khác`
                      : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => scrollToSection(missingRequired[0].target)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900"
                  >
                    Đi tới mục đầu tiên
                    <span className="material-symbols-outlined text-[13px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                  Đi tới phần
                </p>
                <div className="mt-2 space-y-1">
                  {editorSections.map((section) => {
                    const issueCount = sectionIssueCounts[section.id] ?? 0;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-on-surface-variant hover:bg-surface-container-lowest hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {section.icon}
                        </span>
                        <span className="truncate">{section.label}</span>
                        {issueCount > 0 && (
                          <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-700">
                            {issueCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                  Bắt buộc
                </p>
                <div className="mt-2 space-y-1.5">
                  {requiredChecklist.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      title={item.hint}
                      onClick={() => scrollToSection(item.target)}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-surface-container-lowest transition-colors"
                    >
                      <span
                        className={`material-symbols-outlined text-[16px] ${item.done ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {item.done ? "check_circle" : "error"}
                      </span>
                      <span
                        className={
                          item.done
                            ? "text-on-surface"
                            : "text-on-surface-variant"
                        }
                      >
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                  Nên có
                </p>
                <div className="mt-2 space-y-1.5">
                  {recommendedChecklist.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      title={item.hint}
                      onClick={() => scrollToSection(item.target)}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-surface-container-lowest transition-colors"
                    >
                      <span
                        className={`material-symbols-outlined text-[16px] ${item.done ? "text-primary" : "text-on-surface-variant/35"}`}
                      >
                        {item.done ? "task_alt" : "add_circle"}
                      </span>
                      <span
                        className={
                          item.done
                            ? "text-on-surface"
                            : "text-on-surface-variant"
                        }
                      >
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

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
                            window.setTimeout(
                              () => setIsDestinationListOpen(false),
                              120,
                            )
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
                                value !==
                                  getDestinationLabel(selectedDestination)
                              ) {
                                handleChange("destinationId", "");
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Escape")
                                setIsDestinationListOpen(false);
                              if (
                                e.key === "Enter" &&
                                filteredDestinations.length > 0
                              ) {
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
                                    String(destination.id) ===
                                    form.destinationId;
                                  return (
                                    <button
                                      key={destination.id}
                                      type="button"
                                      role="option"
                                      aria-selected={active}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() =>
                                        selectDestination(destination)
                                      }
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
                                        {(destination.travelScope ??
                                          "DOMESTIC") === "DOMESTIC"
                                          ? "Trong nước"
                                          : "Nước ngoài"}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-3 text-xs text-on-surface-variant">
                                  Không tìm thấy điểm đến. Có thể tạo mới bên
                                  dưới.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <p className={helperTextClass}>
                          Dùng cho bộ lọc điểm đến và hiển thị trên trang khách
                          hàng.
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
                        {/* Create new destination button */}
                        <button
                          type="button"
                          onClick={() => {
                            setNewDestName(
                              destinationQuery.replace(/·.*/, "").trim(),
                            );
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
                      /* Inline new destination creation */
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
                                if (e.key === "Escape") {
                                  setShowNewDest(false);
                                }
                              }}
                              placeholder="Ví dụ: Phú Yên, Côn Đảo…"
                              className={`w-full bg-surface-container-lowest border rounded-xl pl-10 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${newDestError ? "border-error" : "border-outline-variant/20"}`}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-1">
                              {[
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
                              ].map((option) => {
                                const active =
                                  newDestTravelScope === option.value;
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
                        window.setTimeout(
                          () => setIsDeparturePointListOpen(false),
                          120,
                        )
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
                          if (e.key === "Escape")
                            setIsDeparturePointListOpen(false);
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
                                    selectDeparturePoint(
                                      departurePointQuery.trim(),
                                    )
                                  }
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-primary/10"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    add_location_alt
                                  </span>
                                  <span>
                                    Dùng &quot;
                                    {departurePointQuery.trim()}
                                    &quot;
                                  </span>
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-on-surface-variant/60 mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">
                        info
                      </span>
                      Hiển thị trên trang chi tiết tour cho khách hàng
                    </p>
                    <input
                      type="text"
                      value={form.departurePointEn}
                      onChange={(e) =>
                        handleChange("departurePointEn", e.target.value)
                      }
                      placeholder="Departure point in English"
                      className={`mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${englishFieldClass}`}
                    />
                  </div>

                  {/* Duration */}
                  <div className="grid grid-cols-1 gap-4">
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
                            window.setTimeout(
                              () => setIsDurationListOpen(false),
                              120,
                            )
                          }
                        >
                          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">
                            schedule
                          </span>
                          <button
                            type="button"
                            id="field-duration"
                            aria-describedby={
                              errors.duration
                                ? "field-duration-error"
                                : undefined
                            }
                            aria-expanded={isDurationListOpen}
                            aria-controls="duration-options"
                            onClick={() =>
                              setIsDurationListOpen((open) => !open)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Escape")
                                setIsDurationListOpen(false);
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
                                aria-selected={
                                  !form.duration && durationMode !== "custom"
                                }
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
                                const isCustom =
                                  duration === "Khác (tùy chỉnh)";
                                return (
                                  <button
                                    key={duration}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() =>
                                      handleDurationSelect(duration)
                                    }
                                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-primary text-on-primary font-semibold shadow-sm" : "text-on-surface hover:bg-surface-container"}`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[16px]">
                                        {isCustom
                                          ? "edit_calendar"
                                          : "date_range"}
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
                        {/* Custom duration input */}
                        {durationMode === "custom" && (
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">
                              edit
                            </span>
                            <input
                              type="text"
                              aria-invalid={Boolean(errors.duration)}
                              aria-describedby={
                                errors.duration
                                  ? "field-duration-error"
                                  : undefined
                              }
                              value={customDuration}
                              onChange={(e) => {
                                setCustomDuration(e.target.value);
                                setErrors((p) => ({
                                  ...p,
                                  duration: undefined,
                                }));
                              }}
                              placeholder="Ví dụ: 10 Ngày 9 Đêm…"
                              className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.duration ? "border-error" : "border-primary/30"}`}
                            />
                          </div>
                        )}
                      </div>
                      <p className={helperTextClass}>
                        Hiển thị trực tiếp trên card tour, nên dùng format ngắn
                        như 3 ngày 2 đêm.
                      </p>
                      {errors.duration && (
                        <p className="text-error text-xs mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            error
                          </span>
                          <span id="field-duration-error">
                            {errors.duration}
                          </span>
                        </p>
                      )}
                      <input
                        type="text"
                        value={form.durationEn}
                        onChange={(e) =>
                          handleChange("durationEn", e.target.value)
                        }
                        placeholder="Duration in English, e.g. 3 Days 2 Nights"
                        className={`mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${englishFieldClass}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Section 3: Giá & Số lượng ─── */}
              <TourPricingSection
                form={form}
                errors={errors}
                requiredBadge={requiredBadge}
                handleChange={handleChange}
              />

              {/* ─── Section 4: Ngày Khởi Hành ─── */}
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
                      <span className="material-symbols-outlined text-[15px]">
                        error
                      </span>
                      Chưa có chuyến khởi hành hợp lệ
                    </p>
                    <p
                      id="field-startDate-error"
                      className="mt-1 leading-relaxed"
                    >
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
                                updateDeparture(idx, {
                                  departureDate: value,
                                })
                              }
                            />
                            {departureInvalid &&
                              (!dep.departureDate ||
                                !isBookableDepartureDate(
                                  dep.departureDate,
                                )) && (
                                <p className="mt-1 text-[10px] text-amber-700">
                                  Cần chọn ngày hợp lệ, không ở quá khứ.
                                </p>
                              )}
                          </div>
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
                                      aria-expanded={
                                        openSaleCategoryIndex === idx
                                      }
                                      aria-controls={`sale-category-options-${idx}`}
                                      onClick={() =>
                                        setOpenSaleCategoryIndex((open) =>
                                          open === idx ? null : idx,
                                        )
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Escape") {
                                          setOpenSaleCategoryIndex(null);
                                        }
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
                                          const active =
                                            dep.category === option.value;
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
                                                updateDepartureCategory(
                                                  idx,
                                                  option.value,
                                                )
                                              }
                                              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                                                active
                                                  ? `${option.activeClass} font-semibold`
                                                  : "text-on-surface-variant hover:bg-surface-container"
                                              }`}
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
                                  onChange={(value) =>
                                    updateFlashSaleDate(idx, value)
                                  }
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
                                      {getTimePart(dep.flashSaleEndsAt) ||
                                        "23:59"}
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
                                          (getTimePart(dep.flashSaleEndsAt) ||
                                            "23:59") === time;
                                        return (
                                          <button
                                            key={time}
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            onMouseDown={(e) =>
                                              e.preventDefault()
                                            }
                                            onClick={() =>
                                              updateFlashSaleTime(idx, time)
                                            }
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
                                Ngày dùng cùng bộ chọn ngày của form. Giờ có thể
                                chọn nhanh theo mốc 30 phút.
                              </p>
                            </div>
                          )}
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
                                departureInvalid &&
                                Number(dep.availableSeats || 0) <= 0
                              }
                              aria-describedby={
                                hasDepartureReviewError
                                  ? "field-startDate-error"
                                  : undefined
                              }
                              onChange={(e) =>
                                updateDeparture(idx, {
                                  availableSeats: e.target.value,
                                })
                              }
                              className={`w-full bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary ${departureInvalid && Number(dep.availableSeats || 0) <= 0 ? "border-amber-400" : "border-outline-variant/20"}`}
                            />
                            <p className="mt-1 text-[10px] text-on-surface-variant/60">
                              Phải lớn hơn 0 để chuyến được tính là hợp lệ.
                            </p>
                          </div>
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
                                updateDeparture(idx, {
                                  maxSeats: e.target.value,
                                })
                              }
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                              Giá riêng (VNĐ)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder={`Mặc định: ${formatCurrencyInput(form.price) || "giá tour"}`}
                              value={formatCurrencyInput(dep.price)}
                              onChange={(e) =>
                                updateDeparture(idx, {
                                  price: stripCurrencyInput(e.target.value),
                                })
                              }
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                              Ghi chú
                            </label>
                            <input
                              type="text"
                              placeholder="Giá ưu đãi cuối tuần..."
                              value={dep.note}
                              onChange={(e) =>
                                updateDeparture(idx, {
                                  note: e.target.value,
                                })
                              }
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                          <div className={englishFieldClass}>
                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                              Note (English)
                            </label>
                            <input
                              type="text"
                              placeholder="Weekend deal..."
                              value={dep.noteEn}
                              onChange={(e) =>
                                updateDeparture(idx, {
                                  noteEn: e.target.value,
                                })
                              }
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
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

              {/* ─── Section 5: Hình ảnh ─── */}
              <div id="tour-section-cover" className="scroll-mt-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-md bg-teal-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-teal-600 text-[14px]">
                      image
                    </span>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Ảnh bìa
                  </h3>
                  {recommendedBadge}
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 cursor-pointer hover:border-primary/40 hover:bg-surface-container-lowest/50 transition-all group"
                >
                  {imagePreview ? (
                    <div className="relative shrink-0">
                      <Image
                        src={imagePreview}
                        alt="Tour preview"
                        width={96}
                        height={96}
                        sizes="96px"
                        className="h-24 w-24 object-cover rounded-xl shadow-md"
                      />
                      <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-xl">
                          edit
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-surface-container rounded-xl flex items-center justify-center shrink-0 group-hover:bg-surface-container-low transition-colors">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant/50">
                        add_photo_alternate
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                      {imageFile
                        ? imageFile.name
                        : imagePreview
                          ? "Nhấn để thay đổi ảnh"
                          : "Nhấn để chọn ảnh…"}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      JPG, JPEG hoặc PNG · Tối đa 5&nbsp;MB · Nên dùng ảnh
                      ngang, rõ chủ thể tour
                    </p>
                    {form.imageUrl && !imageFile && (
                      <p className="text-xs text-primary mt-1.5 truncate flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">
                          link
                        </span>
                        {form.imageUrl.split("/").pop()}
                      </p>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleImageChange}
                  aria-label="Chọn ảnh tour"
                />
              </div>

              {/* ─── Section 5b: Gallery ảnh ─── */}
              <div id="tour-section-gallery" className="scroll-mt-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-600 text-[14px]">
                      photo_library
                    </span>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Gallery ảnh
                  </h3>
                  <span className="text-[10px] font-bold text-on-surface-variant/60">
                    Tối đa 10 ảnh
                  </span>
                </div>

                {/* Ảnh đã lưu */}
                {existingImages.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] text-outline mb-2">
                      Ảnh hiện tại
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {existingImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <Image
                            src={img.url}
                            alt="gallery"
                            width={80}
                            height={80}
                            sizes="80px"
                            className="h-20 w-20 object-cover rounded-xl border border-outline-variant/20"
                          />
                          <button
                            type="button"
                            disabled={deletingImageId === img.id}
                            onClick={async () => {
                              setDeletingImageId(img.id);
                              await fetchWithAuth(
                                `${API_BASE_URL}/tour/${initialData?.id}/images/${img.id}`,
                                {
                                  method: "DELETE",
                                },
                              );
                              setExistingImages((prev) =>
                                prev.filter((i) => i.id !== img.id),
                              );
                              setDeletingImageId(null);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          >
                            <span className="material-symbols-outlined text-[11px]">
                              close
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload ảnh mới */}
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant/50 group-hover:text-indigo-500">
                      add_photo_alternate
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface group-hover:text-indigo-600 transition-colors">
                      {galleryFiles.length > 0
                        ? `Đã chọn ${galleryFiles.length} ảnh mới`
                        : "Thêm ảnh vào gallery…"}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      JPG, PNG · Tối đa 5 MB / ảnh · Khuyến nghị 6-9 ảnh
                    </p>
                  </div>
                </div>

                {/* Preview ảnh mới chọn */}
                {galleryPreviews.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {galleryPreviews.map((src, i) => (
                      <div key={i} className="relative group">
                        <Image
                          src={src}
                          alt={`new-${i}`}
                          width={80}
                          height={80}
                          sizes="80px"
                          className="h-20 w-20 object-cover rounded-xl border-2 border-indigo-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setGalleryFiles((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            );
                            setGalleryPreviews((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            );
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                          <span className="material-symbols-outlined text-[11px]">
                            close
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  multiple
                  className="hidden"
                  aria-label="Chọn ảnh gallery"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setGalleryFiles((prev) => [...prev, ...files].slice(0, 10));
                    const newPreviews = files.map((f) =>
                      URL.createObjectURL(f),
                    );
                    setGalleryPreviews((prev) =>
                      [...prev, ...newPreviews].slice(0, 10),
                    );
                    setIsDirty(true);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* ─── Section 6: Gói tour ─── */}
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
                  <span className="text-[10px] font-bold text-on-surface-variant/60">
                    Khuyến nghị nếu tour có hạng nâng cấp
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
                        {/* Tên gói — dropdown + custom */}
                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                            Tên gói *
                          </label>
                          <div
                            className="relative"
                            onBlur={() =>
                              window.setTimeout(
                                () => setOpenPackageNameIndex(null),
                                120,
                              )
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
                                  nameMode: PACKAGE_NAMES.includes(
                                    e.target.value,
                                  )
                                    ? "select"
                                    : "custom",
                                });
                                setOpenPackageNameIndex(idx);
                              }}
                              onKeyDown={(e) => {
                                const filteredPackageNames =
                                  PACKAGE_NAMES.filter(
                                    (name) =>
                                      !pkg.name.trim() ||
                                      normalizeSearchValue(name).includes(
                                        normalizeSearchValue(pkg.name),
                                      ),
                                  );
                                if (e.key === "Escape")
                                  setOpenPackageNameIndex(null);
                                if (
                                  e.key === "Enter" &&
                                  filteredPackageNames.length > 0
                                ) {
                                  e.preventDefault();
                                  updatePackage(idx, {
                                    name: filteredPackageNames[0],
                                    nameMode: "select",
                                  });
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
                                    updatePackage(idx, {
                                      name: "",
                                      nameMode: "select",
                                    });
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
                                const filteredPackageNames =
                                  PACKAGE_NAMES.filter(
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
                                    {filteredPackageNames.map((name) => {
                                      const active = pkg.name === name;
                                      return (
                                        <button
                                          key={name}
                                          type="button"
                                          role="option"
                                          aria-selected={active}
                                          onMouseDown={(e) =>
                                            e.preventDefault()
                                          }
                                          onClick={() => {
                                            updatePackage(idx, {
                                              name,
                                              nameMode: "select",
                                            });
                                            setOpenPackageNameIndex(null);
                                          }}
                                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-primary text-on-primary font-semibold shadow-sm" : "text-on-surface hover:bg-surface-container"}`}
                                        >
                                          <span className="flex min-w-0 items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px]">
                                              inventory_2
                                            </span>
                                            <span className="truncate">
                                              {name}
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
                                          Dùng &quot;
                                          {pkg.name.trim()}
                                          &quot;
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                          </div>
                        </div>
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
                              setPackages((p) =>
                                p.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        price: stripCurrencyInput(
                                          e.target.value,
                                        ),
                                      }
                                    : x,
                                ),
                              )
                            }
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          />
                          <p className="text-[10px] text-on-surface-variant/60 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">info</span>
                            Giá này là giá toàn phần của gói (không cộng thêm giá ngày khởi hành)
                          </p>
                        </div>
                      </div>
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
                                setPackages((p) =>
                                  p.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          nameEn: e.target.value,
                                        }
                                      : x,
                                  ),
                                )
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
                                setPackages((p) =>
                                  p.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          descriptionEn: e.target.value,
                                        }
                                      : x,
                                  ),
                                )
                              }
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
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
                              setPackages((p) =>
                                p.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        description: e.target.value,
                                      }
                                    : x,
                                ),
                              )
                            }
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                            Nhãn gói
                          </label>
                          <div
                            className="relative"
                            onBlur={() =>
                              window.setTimeout(
                                () => setOpenPackageBadgeIndex(null),
                                120,
                              )
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
                                    aria-expanded={
                                      openPackageBadgeIndex === idx
                                    }
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
                                        const active =
                                          pkg.badge === option.value;
                                        return (
                                          <button
                                            key={option.value || "none"}
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            onMouseDown={(e) =>
                                              e.preventDefault()
                                            }
                                            onClick={() =>
                                              selectPackageBadge(
                                                idx,
                                                option.value,
                                              )
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
                      <div className="space-y-3">
                        {/* Bã gồm */}
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
                            onChange={(val) =>
                              setPackages((p) =>
                                p.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        includes: val,
                                      }
                                    : x,
                                ),
                              )
                            }
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
                              setPackages((p) =>
                                p.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        includesEn: e.target.value
                                          .split("\n")
                                          .map((s) => s.trim())
                                          .filter(Boolean),
                                      }
                                    : x,
                                ),
                              )
                            }
                            placeholder={"Hotel\nMeals\nGuide"}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                          />
                        </div>
                        {/* Không bao gồm */}
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
                            onChange={(val) =>
                              setPackages((p) =>
                                p.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        excludes: val,
                                      }
                                    : x,
                                ),
                              )
                            }
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
                              setPackages((p) =>
                                p.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        excludesEn: e.target.value
                                          .split("\n")
                                          .map((s) => s.trim())
                                          .filter(Boolean),
                                      }
                                    : x,
                                ),
                              )
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

              {/* --- Section 7: Diem noi bat --- */}
              <TourHighlightSection
                highlights={highlights}
                showEnglishFields={showEnglishFields}
                updateHighlight={updateHighlight}
                onRemoveHighlight={handleRemoveHighlight}
                onAddHighlight={handleAddHighlight}
              />

              {/* --- Section 8: FAQ --- */}
              <div id="tour-section-faqs" className="scroll-mt-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-md bg-sky-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sky-600 text-[14px]">
                      help_outline
                    </span>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    FAQ
                  </h3>
                  <span className="text-[10px] font-bold text-on-surface-variant/60">
                    Giải đáp trước các câu hỏi hay gặp
                  </span>
                </div>
                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <div
                      key={faq.id ?? idx}
                      className="bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                          FAQ #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(idx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                          aria-label={`Xóa FAQ ${idx + 1}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            delete
                          </span>
                        </button>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                          Câu hỏi mẫu
                        </label>
                        <div
                          className="relative"
                          onBlur={() =>
                            window.setTimeout(
                              () => setOpenFaqTemplateIndex(null),
                              120,
                            )
                          }
                        >
                          <button
                            type="button"
                            aria-expanded={openFaqTemplateIndex === idx}
                            aria-controls={`faq-template-options-${idx}`}
                            onClick={() =>
                              setOpenFaqTemplateIndex((open) =>
                                open === idx ? null : idx,
                              )
                            }
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="material-symbols-outlined text-[17px] text-sky-600">
                                format_list_bulleted_add
                              </span>
                              <span className="truncate font-semibold text-on-surface-variant">
                                Chọn mẫu để điền nhanh câu hỏi
                              </span>
                            </span>
                            <span
                              className={`material-symbols-outlined text-[18px] text-on-surface-variant/40 transition-transform ${openFaqTemplateIndex === idx ? "rotate-180" : ""}`}
                            >
                              expand_more
                            </span>
                          </button>
                          {openFaqTemplateIndex === idx && (
                            <div
                              id={`faq-template-options-${idx}`}
                              role="listbox"
                              className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                            >
                              {FAQ_TEMPLATES.map((template) => (
                                <button
                                  key={template.question}
                                  type="button"
                                  role="option"
                                  aria-selected={
                                    faq.question === template.question
                                  }
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() =>
                                    applyFaqTemplate(idx, template)
                                  }
                                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-container"
                                >
                                  <span className="mt-0.5 rounded-lg bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-700">
                                    {template.category}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-on-surface">
                                      {template.question}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] leading-relaxed text-on-surface-variant/65">
                                      {template.answerHint}
                                    </span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={bilingualGridClass}>
                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                            Câu hỏi *
                          </label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) =>
                              updateFaq(idx, {
                                question: e.target.value,
                              })
                            }
                            placeholder="Tour có phù hợp cho trẻ em không?"
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        </div>
                        <div className={englishFieldClass}>
                          <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                            Question (English)
                          </label>
                          <input
                            type="text"
                            value={faq.questionEn}
                            onChange={(e) =>
                              updateFaq(idx, {
                                questionEn: e.target.value,
                              })
                            }
                            placeholder="Is this tour suitable for children?"
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                      <div className={bilingualGridClass}>
                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                            Câu trả lời *
                          </label>
                          <textarea
                            rows={4}
                            value={faq.answer}
                            onChange={(e) =>
                              updateFaq(idx, {
                                answer: e.target.value,
                              })
                            }
                            placeholder="Có. Lịch trình nhẹ, phù hợp cho gia đình có trẻ em..."
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                          />
                          <p className="mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/65">
                            Nên trả lời ngắn 1-3 câu, nêu rõ điều kiện áp dụng
                            nếu có.
                          </p>
                        </div>
                        <div className={englishFieldClass}>
                          <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                            Answer (English)
                          </label>
                          <textarea
                            rows={4}
                            value={faq.answerEn}
                            onChange={(e) =>
                              updateFaq(idx, {
                                answerEn: e.target.value,
                              })
                            }
                            placeholder="Yes. The itinerary is light and family-friendly..."
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="w-full py-3 border-2 border-dashed border-sky-300 rounded-2xl text-sm font-semibold text-sky-700 hover:bg-sky-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add_circle
                    </span>
                    Thêm FAQ
                  </button>
                </div>
              </div>

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
            <div className="px-5 py-4 sm:px-7 sm:py-5 border-t border-outline-variant/10 bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              <p className="text-xs text-on-surface-variant sm:max-w-md">
                {`Lưu nháp có thể thiếu thông tin. “${finalActionText}” sẽ kiểm tra các mục bắt buộc trong checklist.`}
              </p>
              <div className="flex w-full sm:w-auto flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseAttempt}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                >
                  Hủy
                </button>
                {(isStaff || isAdminLike) && (
                  <button
                    type="button"
                    onClick={() => handleSave("draft")}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl border border-outline-variant/20 bg-surface text-on-surface text-sm font-semibold hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                  >
                    {saveAction === "draft" ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">
                          progress_activity
                        </span>
                        Đang lưu…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">
                          draft
                        </span>
                        Lưu nháp
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSave("submit")}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none shadow-sm"
                >
                  {saveAction === "submit" ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">
                        progress_activity
                      </span>
                      Đang lưu…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">
                        {primaryIcon}
                      </span>
                      {primaryLabel}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

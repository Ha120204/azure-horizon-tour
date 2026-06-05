"use client";

import {
  useState,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import { API_BASE_URL } from "@/lib/constants";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import type {
  TravelScope,
  Destination,
  TourPackage,
  TourDeparture,
  TourFormData,
  SaleCategory,
  ExistingTourPackage,
  ExistingTourDeparture,
  TourHighlightForm,
  TourFaqForm,
  ExistingTourHighlight,
  ExistingTourFaq,
  TourItineraryDayForm,
  TourTimelineEntry,
  ExistingTourItineraryDay,
  TourFormModalProps,
} from "./types";
import {
  EMPTY_FORM,
  DRAFT_DESTINATION_NAME,
  MIN_START_DATE,
  isBookableDepartureDate,
  getTodayDateString,
  UI_TO_API_DEPARTURE_CATEGORY,
  toUiDepartureCategory,
  DURATION_PRESETS,
  PACKAGE_NAMES,
} from "./constants";
import { INCLUDE_PRESETS, EXCLUDE_PRESETS } from "./TagChipField";
import { EMPTY_HIGHLIGHT } from "./TourHighlightSection";

// ── Module-level helpers ───────────────────────────────────────────────────

type IndexedTranslation = { index?: number };
type TourEnglishTranslation = {
  nameEn?: string;
  descriptionEn?: string;
  departurePointEn?: string;
  durationEn?: string;
  packages?: (IndexedTranslation & {
    nameEn?: string;
    descriptionEn?: string;
    includesEn?: string[];
    excludesEn?: string[];
  })[];
  departures?: (IndexedTranslation & { noteEn?: string })[];
  highlights?: (IndexedTranslation & { contentEn?: string })[];
  faqs?: (IndexedTranslation & { questionEn?: string; answerEn?: string })[];
  itinerary?: (IndexedTranslation & {
    titleEn?: string;
    descriptionEn?: string;
    accommodationEn?: string;
    transportEn?: string;
    activitiesEn?: string[];
    timelineEn?: TourTimelineEntry[];
  })[];
};

type PackagePresetType = "INCLUDE" | "EXCLUDE";
type PackagePresetResponse = {
  id: number;
  type: PackagePresetType;
  label: string;
};
export type TourFormErrors = Partial<Record<keyof TourFormData, string>>;

export const EMPTY_FAQ: TourFaqForm = {
  question: "",
  questionEn: "",
  answer: "",
  answerEn: "",
};

export const EMPTY_PKG: TourPackage = {
  name: "",
  nameEn: "",
  nameMode: "select",
  description: "",
  descriptionEn: "",
  price: "",
  badge: "",
  includes: [],
  includesEn: [],
  excludes: [],
  excludesEn: [],
};

const createEmptyTimelineEntry = (): TourTimelineEntry => ({
  time: "",
  activity: "",
});

const createEmptyDeparture = (): TourDeparture => ({
  departureDate: getTodayDateString(),
  price: "",
  availableSeats: "",
  maxSeats: "",
  note: "",
  noteEn: "",
  category: "all",
  flashSaleEndsAt: "",
});

export const createEmptyItineraryDay = (dayNumber: number): TourItineraryDayForm => ({
  dayNumber,
  title: "",
  titleEn: "",
  description: "",
  descriptionEn: "",
  mealsBreakfast: false,
  mealsLunch: false,
  mealsDinner: false,
  accommodation: "",
  accommodationEn: "",
  transport: "",
  transportEn: "",
  activitiesText: "",
  activitiesEnText: "",
  timelineItems: [createEmptyTimelineEntry()],
  timelineEnItems: [createEmptyTimelineEntry()],
  timelineText: "",
  timelineEnText: "",
});

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const timelineToText = (timeline?: TourTimelineEntry[] | null) =>
  Array.isArray(timeline)
    ? timeline
        .filter((item) => item.time || item.activity)
        .map((item) => [item.time, item.activity].filter(Boolean).join(" - "))
        .join("\n")
    : "";

const getDatePart = (value: string) => (value ? value.slice(0, 10) : "");
const getTimePart = (value: string) =>
  value?.includes("T") ? value.slice(11, 16) : "";
const combineDateTimeLocal = (date: string, time: string) =>
  date ? `${date}T${time || "23:59"}` : "";

const normalizeTimelineEntries = (timeline?: TourTimelineEntry[] | null) => {
  const entries = Array.isArray(timeline)
    ? timeline
        .map((item) => ({
          time: String(item.time ?? "").trim(),
          activity: String(item.activity ?? "").trim(),
        }))
        .filter((item) => item.time || item.activity)
    : [];
  return entries.length ? entries : [createEmptyTimelineEntry()];
};

const cleanTimelineEntries = (timeline?: TourTimelineEntry[] | null) =>
  (Array.isArray(timeline) ? timeline : [])
    .map((item) => ({
      time: String(item.time ?? "").trim(),
      activity: String(item.activity ?? "").trim(),
    }))
    .filter((item) => item.time && item.activity);

const LEGACY_TOUR_MESSAGE_MAP: Record<string, string> = {
  "Vui long hoan thien thong tin truoc khi gui duyet":
    "Vui lòng hoàn thiện thông tin trước khi gửi duyệt",
  "Ten tour": "Tên tour",
  "Mo ta": "Mô tả",
  Gia: "Giá",
  "Diem den": "Điểm đến",
  "Thoi luong": "Thời lượng",
  "So ghe": "Số ghế",
  "Ngay khoi hanh": "Ngày khởi hành",
  "It nhat 1 chuyen khoi hanh": "Ít nhất 1 chuyến khởi hành",
  "Ban khong co quyen gui duyet tour nay":
    "Bạn không có quyền gửi duyệt tour này",
  "Ban khong co quyen thao tac tour nay":
    "Bạn không có quyền thao tác tour này",
  "Ban khong co quyen chinh sua tour nay":
    "Bạn không có quyền chỉnh sửa tour này",
  "Ban khong co quyen xoa ban nhap nay": "Bạn không có quyền xóa bản nháp này",
  "Chi co the thao tac tour o trang thai Ban nhap hoac Bi tu choi":
    "Chỉ có thể thao tác tour ở trạng thái Bản nháp hoặc Bị từ chối",
  "Chi co the chinh sua tour o trang thai Ban nhap hoac Bi tu choi":
    "Chỉ có thể chỉnh sửa tour ở trạng thái Bản nháp hoặc Bị từ chối",
  "Chi co the xoa tour o trang thai Ban nhap hoac Bi tu choi":
    "Chỉ có thể xóa tour ở trạng thái Bản nháp hoặc Bị từ chối",
  "Vui long nhap ly do tu choi": "Vui lòng nhập lý do từ chối",
  "Tour da ket thuc, khong the publish lai":
    "Tour đã kết thúc, không thể public lại",
  "Public tour that bai": "Public tour thất bại",
};

const normalizeTourMessage = (
  message: unknown,
  fallback = "Có lỗi xảy ra khi lưu tour. Vui lòng thử lại.",
) => {
  const raw = Array.isArray(message)
    ? message.join(", ")
    : typeof message === "string"
      ? message
      : fallback;
  return Object.entries(LEGACY_TOUR_MESSAGE_MAP).reduce(
    (current, [legacy, localized]) => current.replaceAll(legacy, localized),
    raw,
  );
};

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
  const [showEnglishFields, setShowEnglishFields] = useState(false);
  const [isTranslatingEnglish, setIsTranslatingEnglish] = useState(false);

  // ── Collections ────────────────────────────────────────────────────
  const [destinations, setDestinations] =
    useState<Destination[]>(initialDestinations);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [departures, setDepartures] = useState<TourDeparture[]>(() =>
    mode === "create" ? [createEmptyDeparture()] : [],
  );
  const [highlights, setHighlights] = useState<TourHighlightForm[]>([]);
  const [faqs, setFaqs] = useState<TourFaqForm[]>([]);
  const [itinerary, setItinerary] = useState<TourItineraryDayForm[]>([]);

  // ── Image state ────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<
    { id: number; url: string }[]
  >([]);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  // ── Preset state ───────────────────────────────────────────────────
  const [includePresets, setIncludePresets] =
    useState<string[]>(INCLUDE_PRESETS);
  const [excludePresets, setExcludePresets] =
    useState<string[]>(EXCLUDE_PRESETS);

  // ── Dialog state ───────────────────────────────────────────────────
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // ── Destination creation state ─────────────────────────────────────
  const [showNewDest, setShowNewDest] = useState(false);
  const [newDestName, setNewDestName] = useState("");
  const [newDestTravelScope, setNewDestTravelScope] =
    useState<TravelScope>("DOMESTIC");
  const [newDestCountryCode, setNewDestCountryCode] = useState("VN");
  const [isCreatingDest, setIsCreatingDest] = useState(false);
  const [newDestError, setNewDestError] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [isDestinationListOpen, setIsDestinationListOpen] = useState(false);

  // ── Location/Duration UI state ─────────────────────────────────────
  const [departurePointQuery, setDeparturePointQuery] = useState("");
  const [isDeparturePointListOpen, setIsDeparturePointListOpen] =
    useState(false);
  const [durationMode, setDurationMode] = useState<"preset" | "custom">(
    "preset",
  );
  const [customDuration, setCustomDuration] = useState("");
  const [isDurationListOpen, setIsDurationListOpen] = useState(false);

  // ── Dropdown UI state ──────────────────────────────────────────────
  const [openFlashTimeIndex, setOpenFlashTimeIndex] = useState<number | null>(
    null,
  );
  const [openSaleCategoryIndex, setOpenSaleCategoryIndex] = useState<
    number | null
  >(null);
  const [openPackageNameIndex, setOpenPackageNameIndex] = useState<
    number | null
  >(null);
  const [openPackageBadgeIndex, setOpenPackageBadgeIndex] = useState<
    number | null
  >(null);
  const [openFaqTemplateIndex, setOpenFaqTemplateIndex] = useState<
    number | null
  >(null);

  // ── Pre-fill on edit ───────────────────────────────────────────────
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const startDate = initialData.startDate
        ? new Date(initialData.startDate).toISOString().split("T")[0]
        : "";
      const duration = initialData.duration || "";
      const isPreset = DURATION_PRESETS.slice(0, -1).includes(duration);
      const destinationId =
        initialData.destination?.name === DRAFT_DESTINATION_NAME
          ? ""
          : String(
              initialData.destination?.id || initialData.destinationId || "",
            );
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
        setPackages(
          initialData.packages.map((p: ExistingTourPackage) => ({
            id: p.id,
            name: p.name || "",
            nameEn: p.nameEn || "",
            description: p.description || "",
            descriptionEn: p.descriptionEn || "",
            nameMode: (PACKAGE_NAMES.includes(p.name || "")
              ? "select"
              : "custom") as "select" | "custom",
            price: String(p.price || ""),
            badge: p.badge || "",
            includes: Array.isArray(p.includes)
              ? p.includes
              : (p.includes || "")
                  .split("\n")
                  .map((s: string) => s.trim())
                  .filter(Boolean),
            includesEn: Array.isArray(p.includesEn)
              ? p.includesEn
              : (p.includesEn || "")
                  .split("\n")
                  .map((s: string) => s.trim())
                  .filter(Boolean),
            excludes: Array.isArray(p.excludes)
              ? p.excludes
              : (p.excludes || "")
                  .split("\n")
                  .map((s: string) => s.trim())
                  .filter(Boolean),
            excludesEn: Array.isArray(p.excludesEn)
              ? p.excludesEn
              : (p.excludesEn || "")
                  .split("\n")
                  .map((s: string) => s.trim())
                  .filter(Boolean),
          })),
        );
      }
      if (initialData.departures?.length) {
        setDepartures(
          initialData.departures
            .map((d: ExistingTourDeparture) => ({
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
                d.flashSaleEndsAt &&
                !isNaN(new Date(d.flashSaleEndsAt).getTime())
                  ? new Date(d.flashSaleEndsAt).toISOString().slice(0, 16)
                  : "",
            }))
            .filter(
              (d) =>
                d.departureDate && isBookableDepartureDate(d.departureDate),
            ),
        );
      }
      setHighlights(
        initialData.highlights?.length
          ? initialData.highlights.map((h: ExistingTourHighlight) => ({
              id: h.id,
              content: h.content || "",
              contentEn: h.contentEn || "",
              icon: h.icon || "auto_awesome",
            }))
          : [],
      );
      setFaqs(
        initialData.faqs?.length
          ? initialData.faqs.map((f: ExistingTourFaq) => ({
              id: f.id,
              question: f.question || "",
              questionEn: f.questionEn || "",
              answer: f.answer || "",
              answerEn: f.answerEn || "",
            }))
          : [],
      );
      setItinerary(
        initialData.itinerary?.length
          ? [...initialData.itinerary]
              .sort(
                (a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0),
              )
              .map((day: ExistingTourItineraryDay, index) => ({
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
                activitiesText: Array.isArray(day.activities)
                  ? day.activities.join("\n")
                  : "",
                activitiesEnText: Array.isArray(day.activitiesEn)
                  ? day.activitiesEn.join("\n")
                  : "",
                timelineItems: normalizeTimelineEntries(day.timeline),
                timelineEnItems: normalizeTimelineEntries(day.timelineEn),
                timelineText: timelineToText(day.timeline),
                timelineEnText: timelineToText(day.timelineEn),
              }))
          : [],
      );
    }
  }, [mode, initialData, initialDestinations]);

  useEffect(() => {
    setDestinations(initialDestinations);
  }, [initialDestinations]);

  // ── Load shared package presets ────────────────────────────────────
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

  // ── Handlers ───────────────────────────────────────────────────────

  const handleChange = (field: keyof TourFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

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

  const getDestinationLabel = (destination: Destination) =>
    `${destination.name} · ${(destination.travelScope ?? "DOMESTIC") === "DOMESTIC" ? "Trong nước" : "Nước ngoài"}`;

  const selectDestination = (destination: Destination) => {
    handleChange("destinationId", String(destination.id));
    setDestinationQuery(getDestinationLabel(destination));
    setIsDestinationListOpen(false);
  };

  const clearDestination = () => {
    handleChange("destinationId", "");
    setDestinationQuery("");
    setIsDestinationListOpen(true);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setIsDirty(true);
    setImagePreview(URL.createObjectURL(file));
  };

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
          ? departure?.flashSaleEndsAt ||
            combineDateTimeLocal(defaultFlashDate, "23:59")
          : departure?.flashSaleEndsAt,
    });
  };

  const updateFlashSaleDate = (idx: number, date: string) => {
    const current = departures[idx]?.flashSaleEndsAt || "";
    updateDeparture(idx, {
      flashSaleEndsAt: combineDateTimeLocal(
        date,
        getTimePart(current) || "23:59",
      ),
    });
  };

  const updateFlashSaleTime = (idx: number, time: string) => {
    const current = departures[idx]?.flashSaleEndsAt || "";
    const fallbackDate = departures[idx]?.departureDate || MIN_START_DATE;
    updateDeparture(idx, {
      flashSaleEndsAt: combineDateTimeLocal(
        getDatePart(current) || fallbackDate,
        time,
      ),
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

  const updatePackage = (idx: number, patch: Partial<TourPackage>) => {
    setPackages((prev) =>
      prev.map((pkg, i) => (i === idx ? { ...pkg, ...patch } : pkg)),
    );
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

  const updateHighlight = (idx: number, patch: Partial<TourHighlightForm>) => {
    setHighlights((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );
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

  const updateFaq = (idx: number, patch: Partial<TourFaqForm>) => {
    setFaqs((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );
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

  const applyFaqTemplate = (
    idx: number,
    template: { question: string; questionEn: string },
  ) => {
    updateFaq(idx, {
      question: template.question,
      questionEn: template.questionEn,
    });
    setOpenFaqTemplateIndex(null);
  };

  const updateItineraryDay = (
    idx: number,
    patch: Partial<TourItineraryDayForm>,
  ) => {
    setItinerary((prev) =>
      prev.map((day, i) => (i === idx ? { ...day, ...patch } : day)),
    );
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
        const entries = day[field]?.length
          ? day[field]
          : [createEmptyTimelineEntry()];
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
              [field]: [
                ...(day[field]?.length ? day[field] : []),
                createEmptyTimelineEntry(),
              ],
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
          [field]: nextEntries.length
            ? nextEntries
            : [createEmptyTimelineEntry()],
        };
      }),
    );
    setIsDirty(true);
  };

  const handleRemoveItineraryDay = (idx: number) => {
    setItinerary((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((item, i) => ({ ...item, dayNumber: i + 1 })),
    );
    setIsDirty(true);
  };

  const handleAddItineraryDay = () => {
    setItinerary((prev) => [
      ...prev,
      createEmptyItineraryDay(prev.length + 1),
    ]);
    setIsDirty(true);
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

  // ── Destination creation ───────────────────────────────────────────
  const handleCreateDestination = async () => {
    const name = newDestName.trim();
    if (!name) {
      setNewDestError("Vui lòng nhập tên điểm đến");
      return;
    }
    if (destinations.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      setNewDestError("Điểm đến này đã tồn tại");
      return;
    }
    setIsCreatingDest(true);
    setNewDestError("");
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/search/destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          travelScope: newDestTravelScope,
          countryCode: newDestCountryCode.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể tạo điểm đến");
      }
      const raw = await res.json();
      const newDest: Destination = raw?.data ?? raw;
      if (!newDest?.id || !newDest?.name)
        throw new Error("Phản hồi server không hợp lệ");
      const updated = [...destinations, newDest].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      );
      setDestinations(updated);
      handleChange("destinationId", String(newDest.id));
      onDestinationCreated?.(newDest);
      setNewDestName("");
      setNewDestTravelScope("DOMESTIC");
      setNewDestCountryCode("VN");
      setShowNewDest(false);
    } catch (e: unknown) {
      setNewDestError(e instanceof Error ? e.message : "Tạo điểm đến thất bại");
    } finally {
      setIsCreatingDest(false);
    }
  };

  // ── Review readiness ───────────────────────────────────────────────
  const getReviewReadiness = () => {
    const finalDuration =
      durationMode === "custom" ? customDuration : form.duration;
    const validDepartures = departures.filter(
      (d) =>
        d.departureDate &&
        isBookableDepartureDate(d.departureDate) &&
        Number(d.availableSeats || 0) > 0,
    );
    const galleryImageCount = existingImages.length + galleryFiles.length;
    const hasCoverImage = Boolean(imagePreview || imageFile || form.imageUrl);
    const highlightCount = highlights.filter((item) =>
      item.content.trim(),
    ).length;
    const faqCount = faqs.filter(
      (item) => item.question.trim() && item.answer.trim(),
    ).length;
    const itineraryCount = itinerary.filter(
      (day) => day.title.trim() && day.description.trim(),
    ).length;
    const required = [
      {
        label: "Tên tour",
        done: Boolean(form.name.trim()),
        target: "tour-section-basic",
        fieldId: "field-name",
        field: "name" as keyof TourFormData,
        error: "Tên tour không được để trống",
        hint: "Tên cần đủ rõ để Admin và khách hiểu tour bán gì.",
      },
      {
        label: "Mô tả",
        done: Boolean(form.description.trim()),
        target: "tour-section-basic",
        fieldId: "field-description",
        field: "description" as keyof TourFormData,
        error: "Mô tả không được để trống",
        hint: "Mô tả nên nêu điểm đến, trải nghiệm chính và đối tượng phù hợp.",
      },
      {
        label: "Điểm đến",
        done: Boolean(form.destinationId),
        target: "tour-section-location",
        fieldId: "field-destinationId",
        field: "destinationId" as keyof TourFormData,
        error: "Vui lòng chọn điểm đến",
        hint: "Điểm đến dùng cho bộ lọc và trang chi tiết tour.",
      },
      {
        label: "Thời lượng",
        done: Boolean(finalDuration.trim()),
        target: "tour-section-location",
        fieldId: "field-duration",
        field: "duration" as keyof TourFormData,
        error: "Thời lượng không được để trống",
        hint: "Ví dụ: 3 ngày 2 đêm, 1 ngày, hoặc 5 ngày 4 đêm.",
      },
      {
        label: "Giá niêm yết",
        done: Boolean(form.price) && Number(form.price) > 0,
        target: "tour-section-pricing",
        fieldId: "field-price",
        field: "price" as keyof TourFormData,
        error: "Giá phải là số dương",
        hint: "Giá cơ bản mỗi khách phải lớn hơn 0.",
      },
      {
        label: "Số ghế",
        done: Boolean(form.availableSeats) && Number(form.availableSeats) >= 1,
        target: "tour-section-pricing",
        fieldId: "field-availableSeats",
        field: "availableSeats" as keyof TourFormData,
        error: "Số ghế phải ít nhất là 1",
        hint: "Số ghế mặc định phải từ 1 trở lên.",
      },
      {
        label: "Ít nhất 1 chuyến khởi hành",
        done: validDepartures.length > 0,
        target: "tour-section-departures",
        fieldId: "tour-section-departures",
        field: "startDate" as keyof TourFormData,
        error:
          "Vui lòng thêm ít nhất 1 chuyến khởi hành có ngày hợp lệ và số ghế lớn hơn 0",
        hint: "Chuyến hợp lệ cần ngày không ở quá khứ và số ghế còn lớn hơn 0.",
      },
    ];
    const recommended = [
      {
        label: "Ảnh bìa",
        done: hasCoverImage,
        target: "tour-section-cover",
        hint: "Ảnh bìa giúp tour rõ chủ thể trên card và trang chi tiết.",
      },
      {
        label: "Gallery từ 6 ảnh",
        done: galleryImageCount >= 6,
        target: "tour-section-gallery",
        hint: `Hiện có ${galleryImageCount}/6 ảnh khuyến nghị.`,
      },
      {
        label: "Gói tour",
        done: packages.some(
          (pkg) => Boolean(pkg.name.trim()) && pkg.price !== "",
        ),
        target: "tour-section-packages",
        hint: "Nên thêm nếu tour có gói tiêu chuẩn, cao cấp hoặc luxury.",
      },
      {
        label: "Điểm nổi bật",
        done: highlightCount >= 3,
        target: "tour-section-highlights",
        hint: `Hiện có ${highlightCount}/3 điểm nổi bật khuyến nghị.`,
      },
      {
        label: "FAQ",
        done: faqCount >= 2,
        target: "tour-section-faqs",
        hint: `Hiện có ${faqCount}/2 câu hỏi khuyến nghị.`,
      },
      {
        label: "Lịch trình",
        done: itineraryCount > 0,
        target: "tour-section-itinerary",
        hint: `Hiện có ${itineraryCount} ngày lịch trình đã đủ tiêu đề và mô tả.`,
      },
    ];
    return {
      required,
      recommended,
      validDepartureCount: validDepartures.length,
      missingRequired: required.filter((item) => !item.done),
      completedRequired: required.filter((item) => item.done).length,
      completedRecommended: recommended.filter((item) => item.done).length,
    };
  };

  // ── English translation ────────────────────────────────────────────
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

  // ── Validation ─────────────────────────────────────────────────────
  const focusReviewIssue = (issue: { target: string; fieldId?: string }) => {
    window.setTimeout(() => {
      const target = document.getElementById(issue.fieldId || issue.target);
      const section = document.getElementById(issue.target);
      (target || section)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      window.setTimeout(() => {
        const focusTarget =
          target instanceof HTMLElement
            ? target
            : (section?.querySelector<HTMLElement>(
                "input, select, textarea, button:not([disabled])",
              ) ?? null);
        focusTarget?.focus({ preventScroll: true });
      }, 250);
    }, 0);
  };

  const validateForReview = (): boolean => {
    setGlobalError("");
    const readiness = getReviewReadiness();
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
  const handleSave = async (action: "draft" | "submit") => {
    if (action === "submit" && !validateForReview()) return;
    const editId = initialData?.id;
    if (mode === "edit" && !editId) {
      setGlobalError("Không tìm thấy dữ liệu tour cần chỉnh sửa.");
      return;
    }

    const finalDuration =
      durationMode === "custom" ? customDuration : form.duration;
    const validDepartures = departures
      .filter(
        (d) => d.departureDate && isBookableDepartureDate(d.departureDate),
      )
      .sort(
        (a, b) =>
          new Date(a.departureDate).getTime() -
          new Date(b.departureDate).getTime(),
      );
    const primaryStartDate =
      validDepartures[0]?.departureDate || form.startDate || MIN_START_DATE;
    const shouldPublishAfterSave =
      isAdminLike && action === "submit" && initialData?.status !== "PUBLISHED";
    const nextStatus =
      action === "draft"
        ? "DRAFT"
        : shouldPublishAfterSave
          ? "DRAFT"
          : initialData?.status === "PUBLISHED"
            ? "PUBLISHED"
            : undefined;
    const payload = {
      ...form,
      duration: finalDuration,
      startDate: primaryStartDate,
      status: nextStatus,
    };

    setSaveAction(action);
    try {
      let response: Response;
      const url =
        mode === "edit"
          ? `${API_BASE_URL}/tour/${editId}`
          : `${API_BASE_URL}/tour`;
      const method = mode === "edit" ? "PATCH" : "POST";

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        Object.entries(payload).forEach(([key, val]) => {
          if (key === "imageUrl" || val === "" || val == null) return;
          if (key === "price" || key === "availableSeats") {
            formData.append(key, String(Number(val) || 0));
            return;
          }
          formData.append(key, String(val));
        });
        response = await fetchWithAuth(url, { method, body: formData });
      } else {
        const body = {
          ...payload,
          price: payload.price ? Number(payload.price) : 0,
          destinationId: payload.destinationId
            ? Number(payload.destinationId)
            : undefined,
          availableSeats: payload.availableSeats
            ? Number(payload.availableSeats)
            : 0,
        };
        response = await fetchWithAuth(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(
          normalizeTourMessage(
            err.message,
            "Có lỗi xảy ra khi lưu tour. Vui lòng thử lại.",
          ),
        );
      }
      const saved = await response.json();
      const tourId = saved?.data?.id ?? saved?.id ?? initialData?.id;

      if (tourId && packages.length > 0) {
        const pkgPayload = packages
          .filter((p) => p.name.trim() && p.price)
          .map((p, i) => ({
            name: p.name.trim(),
            nameEn: p.nameEn.trim() || undefined,
            description: p.description.trim(),
            descriptionEn: p.descriptionEn.trim() || undefined,
            price: Number(p.price),
            badge: p.badge.trim() || undefined,
            includes: p.includes.filter(Boolean),
            includesEn: p.includesEn.filter(Boolean),
            excludes: p.excludes.filter(Boolean),
            excludesEn: p.excludesEn.filter(Boolean),
            sortOrder: i,
          }));
        await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/packages/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packages: pkgPayload }),
        });
      }

      if (tourId) {
        const depPayload = validDepartures.map((d, i) => ({
          departureDate: d.departureDate,
          price: d.price ? Number(d.price) : null,
          availableSeats: Number(d.availableSeats) || 0,
          maxSeats: Number(d.maxSeats) || Number(d.availableSeats) || 0,
          note: d.note.trim() || undefined,
          noteEn: d.noteEn.trim() || undefined,
          category: UI_TO_API_DEPARTURE_CATEGORY[d.category],
          flashSaleEndsAt:
            d.category === "flash" && d.flashSaleEndsAt
              ? new Date(d.flashSaleEndsAt).toISOString()
              : null,
          sortOrder: i,
        }));
        const departureResponse = await fetchWithAuth(
          `${API_BASE_URL}/tour/${tourId}/departures/bulk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ departures: depPayload }),
          },
        );
        const departureResult = await departureResponse.json().catch(() => null);
        if (!departureResponse.ok) {
          const message = Array.isArray(departureResult?.message)
            ? departureResult.message.join(", ")
            : departureResult?.message || "Không thể lưu lịch khởi hành.";
          throw new Error(
            normalizeTourMessage(message, "Không thể lưu lịch khởi hành."),
          );
        }
      }

      if (tourId) {
        const highlightPayload = highlights
          .filter((h) => h.content.trim())
          .map((h, i) => ({
            content: h.content.trim(),
            contentEn: h.contentEn.trim() || undefined,
            icon: h.icon || "auto_awesome",
            sortOrder: i,
          }));
        const faqPayload = faqs
          .filter((f) => f.question.trim() && f.answer.trim())
          .map((f, i) => ({
            question: f.question.trim(),
            questionEn: f.questionEn.trim() || undefined,
            answer: f.answer.trim(),
            answerEn: f.answerEn.trim() || undefined,
            sortOrder: i,
          }));
        const itineraryPayload = itinerary
          .filter((day) => day.title.trim() && day.description.trim())
          .map((day, i) => ({
            dayNumber: i + 1,
            title: day.title.trim(),
            titleEn: day.titleEn.trim() || undefined,
            description: day.description.trim(),
            descriptionEn: day.descriptionEn.trim() || undefined,
            mealsBreakfast: day.mealsBreakfast,
            mealsLunch: day.mealsLunch,
            mealsDinner: day.mealsDinner,
            accommodation: day.accommodation.trim() || undefined,
            accommodationEn: day.accommodationEn.trim() || undefined,
            transport: day.transport.trim() || undefined,
            transportEn: day.transportEn.trim() || undefined,
            activities: splitLines(day.activitiesText),
            activitiesEn: splitLines(day.activitiesEnText),
            timeline: cleanTimelineEntries(day.timelineItems),
            timelineEn: cleanTimelineEntries(day.timelineEnItems),
          }));
        const contentSyncs: Promise<{ label: string; response: Response }>[] =
          [];
        if (highlights.length > 0 || initialData?.highlights !== undefined) {
          contentSyncs.push(
            fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/highlights`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ highlights: highlightPayload }),
            }).then((response) => ({ label: "điểm nổi bật", response })),
          );
        }
        if (faqs.length > 0 || initialData?.faqs !== undefined) {
          contentSyncs.push(
            fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/faqs`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ faqs: faqPayload }),
            }).then((response) => ({ label: "FAQ", response })),
          );
        }
        if (itinerary.length > 0 || initialData?.itinerary !== undefined) {
          contentSyncs.push(
            fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/itinerary`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itinerary: itineraryPayload }),
            }).then((response) => ({ label: "lịch trình", response })),
          );
        }
        const contentResponses = await Promise.all(contentSyncs);
        for (const { label, response: contentResponse } of contentResponses) {
          if (!contentResponse.ok) {
            const err = await contentResponse.json().catch(() => ({}));
            throw new Error(
              normalizeTourMessage(err.message, `Không thể lưu ${label}`),
            );
          }
        }
      }

      if (isStaff && action === "submit" && tourId) {
        const submitRes = await fetchWithAuth(
          `${API_BASE_URL}/tour/${tourId}/submit`,
          { method: "POST" },
        );
        if (!submitRes.ok) {
          const err = await submitRes.json().catch(() => ({}));
          throw new Error(
            normalizeTourMessage(err.message, "Gửi duyệt thất bại"),
          );
        }
      }

      if (tourId && galleryFiles.length > 0) {
        const galleryForm = new FormData();
        galleryFiles.forEach((f) => galleryForm.append("images", f));
        await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/images`, {
          method: "POST",
          body: galleryForm,
        });
      }

      if (shouldPublishAfterSave && tourId) {
        const publishRes = await fetchWithAuth(
          `${API_BASE_URL}/tour/${tourId}/publish`,
          { method: "PATCH" },
        );
        if (!publishRes.ok) {
          const err = await publishRes.json().catch(() => ({}));
          throw new Error(
            normalizeTourMessage(err.message, "Public tour thất bại"),
          );
        }
      }

      const successMessage = isStaff
        ? action === "submit"
          ? "Đã lưu và gửi tour để Admin duyệt!"
          : "Đã lưu bản nháp tour!"
        : action === "draft"
          ? "Đã lưu bản nháp tour!"
          : shouldPublishAfterSave
            ? "Đã public tour lên trang khách hàng!"
            : "Cập nhật tour thành công!";

      onSuccess(successMessage, saved?.data ?? saved, action);
      onClose();
    } catch (err: unknown) {
      setGlobalError(
        normalizeTourMessage(err instanceof Error ? err.message : undefined),
      );
    } finally {
      setSaveAction(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSave("submit");
  };

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
    getReviewReadiness,
    handleGenerateEnglishDraft,
    handleSave,
    handleSubmit,
    handleCloseAttempt,
  };
}

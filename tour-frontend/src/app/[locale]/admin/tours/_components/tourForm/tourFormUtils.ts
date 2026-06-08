import type {
  TourDeparture,
  TourItineraryDayForm,
  TourTimelineEntry,
  TourFaqForm,
  TourPackage,
} from "./types";
import { getTodayDateString } from "./constants";

// ── Types ──────────────────────────────────────────────────────────────────

type IndexedTranslation = { index?: number };
export type { IndexedTranslation };

export type TourEnglishTranslation = {
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

export type PackagePresetType = "INCLUDE" | "EXCLUDE";
export type PackagePresetResponse = {
  id: number;
  type: PackagePresetType;
  label: string;
};

// ── Empty state factories ──────────────────────────────────────────────────

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

export const createEmptyTimelineEntry = (): TourTimelineEntry => ({
  time: "",
  activity: "",
});

export const createEmptyDeparture = (): TourDeparture => ({
  departureDate: getTodayDateString(),
  price: "",
  availableSeats: "",
  maxSeats: "",
  note: "",
  noteEn: "",
  category: "all",
  flashSaleEndsAt: "",
  transport: null,
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

// ── Pure helpers ───────────────────────────────────────────────────────────

export const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export const timelineToText = (timeline?: TourTimelineEntry[] | null) =>
  Array.isArray(timeline)
    ? timeline
        .filter((item) => item.time || item.activity)
        .map((item) => [item.time, item.activity].filter(Boolean).join(" - "))
        .join("\n")
    : "";

export const getDatePart = (value: string) => (value ? value.slice(0, 10) : "");

export const getTimePart = (value: string) =>
  value?.includes("T") ? value.slice(11, 16) : "";

export const combineDateTimeLocal = (date: string, time: string) =>
  date ? `${date}T${time || "23:59"}` : "";

export const normalizeTimelineEntries = (timeline?: TourTimelineEntry[] | null) => {
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

// ── Error message normalization ────────────────────────────────────────────

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

export const normalizeTourMessage = (
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

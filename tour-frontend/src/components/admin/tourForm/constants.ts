import type { TourFormData, SaleCategory } from "./types";

export const getTodayDateString = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ── Form Default ────────────────────────────────────────────────────────
export const EMPTY_FORM: TourFormData = {
  name: "",
  nameEn: "",
  description: "",
  descriptionEn: "",
  price: "",
  destinationId: "",
  startDate: getTodayDateString(),
  duration: "",
  durationEn: "",
  availableSeats: "",
  tourType: "Tour Gia Đình",
  imageUrl: "",
  departurePoint: "",
  departurePointEn: "",
};

export const DRAFT_DESTINATION_NAME = "Chưa xác định";

// ── Date Helpers ─────────────────────────────────────────────────────────
export const MIN_START_DATE = getTodayDateString();

export const isBookableDepartureDate = (value: string): boolean =>
  value >= MIN_START_DATE;

// ── Departure Category Mapping ────────────────────────────────────────────
export const UI_TO_API_DEPARTURE_CATEGORY: Record<SaleCategory, string | null> =
  {
    all: null,
    flash: "FLASH_SALE",
    early: "EARLY_BIRD",
    lastminute: "LAST_MINUTE",
  };

const API_TO_UI_DEPARTURE_CATEGORY: Record<string, SaleCategory> = {
  FLASH_SALE: "flash",
  EARLY_BIRD: "early",
  LAST_MINUTE: "lastminute",
};

export const toUiDepartureCategory = (
  category?: string | null,
): SaleCategory => {
  if (!category) return "all";
  if (
    category === "flash" ||
    category === "early" ||
    category === "lastminute" ||
    category === "all"
  ) {
    return category;
  }
  return API_TO_UI_DEPARTURE_CATEGORY[category] ?? "all";
};

// ── UI Option Lists ───────────────────────────────────────────────────────
export const TOUR_TYPES = [
  { value: "Tour Gia Đình", icon: "family_restroom", label: "Tour Gia Đình" },
  { value: "Tour Cao Cấp", icon: "diamond", label: "Tour Cao Cấp" },
  { value: "Nghỉ Dưỡng", icon: "beach_access", label: "Nghỉ Dưỡng" },
  { value: "Khám Phá", icon: "hiking", label: "Khám Phá" },
  { value: "Văn Hóa & Lịch Sử", icon: "museum", label: "Văn Hóa & Lịch Sử" },
  { value: "Tour Ghép Đoàn", icon: "groups", label: "Tour Ghép Đoàn" },
];

export const DURATION_PRESETS = [
  "1 Ngày",
  "2 Ngày 1 Đêm",
  "3 Ngày 2 Đêm",
  "4 Ngày 3 Đêm",
  "5 Ngày 4 Đêm",
  "6 Ngày 5 Đêm",
  "7 Ngày 6 Đêm",
  "Khác (tùy chỉnh)",
];

export const DEPARTURE_POINTS = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Cần Thơ",
  "Hải Phòng",
  "Nha Trang",
  "Đà Lạt",
  "Huế",
  "Vũng Tàu",
  "Quy Nhơn",
  "Phú Quốc",
  "Hội An",
];

export const PACKAGE_NAMES = [
  "Gói Tiêu Chuẩn",
  "Gói Cao Cấp",
  "Gói Luxury",
  "Gói Gia Đình",
  "Gói Cặp Đôi",
  "Gói Quà Tặng",
  "Gói Nhóm",
];

export const INCLUDE_PRESETS = [
  // ── Lưu trú ──────────────────────────────────────────
  "Khách sạn 2★ (phòng đôi/twin)",
  "Khách sạn 3★ (phòng đôi/twin)",
  "Khách sạn 4★ (phòng đôi/twin)",
  "Khách sạn 5★ (phòng đôi/twin)",
  "Resort 4★ (phòng đôi/twin)",
  "Resort 5★ (phòng đôi/twin)",
  // ── Bữa ăn ────────────────────────────────────────────
  "Ăn sáng tại khách sạn",
  "Ăn trưa theo chương trình",
  "Ăn tối theo chương trình",
  "Ăn 3 bữa/ngày theo chương trình",
  "Tiệc hải sản tươi sống",
  "Bữa tiệc Gala Dinner",
  // ── Di chuyển ─────────────────────────────────────────
  "Xe du lịch đời mới, điều hòa khứ hồi",
  "Vé máy bay khứ hồi (hạng phổ thông)",
  "Xe đưa đón sân bay/bến xe",
  "Tàu/ca nô tham quan theo lịch trình",
  // ── Hướng dẫn viên ────────────────────────────────────
  "Hướng dẫn viên tiếng Việt kinh nghiệm",
  "Hướng dẫn viên tiếng Anh",
  "Hướng dẫn viên địa phương",
  // ── Vé tham quan ──────────────────────────────────────
  "Vé tham quan tất cả điểm trong lịch trình",
  "Vé vào cổng điểm du lịch chính",
  // ── Bảo hiểm & An toàn ────────────────────────────────
  "Bảo hiểm du lịch (tối đa 50 triệu/người)",
  // ── Quà tặng & Tiện ích ───────────────────────────────
  "Nước uống 500ml/người/ngày",
  "Khăn lạnh trên xe",
  "Nón và ba lô du lịch Azure Horizon",
  "Hoa quả chào đón tại phòng",
  // ── Dịch vụ nâng cao ──────────────────────────────────
  "Dịch vụ Concierge 24/7",
  "Spa & Massage thư giãn (1 buổi/người)",
  "Chụp ảnh chuyên nghiệp theo tour",
  "Butler riêng phục vụ (Gói Luxury)",
  "Rượu vang chào mừng tại phòng",
];

// ── Currency Helpers ──────────────────────────────────────────────────────
export const stripCurrencyInput = (value: string) =>
  value.replace(/[^\d]/g, "");
export const formatCurrencyInput = (value: string) => {
  const digits = stripCurrencyInput(value);
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
};

export const EXCLUDE_PRESETS = [
  // ── Chi phí cá nhân ───────────────────────────────────
  "Chi phí cá nhân (điện thoại, giặt ủi, minibar...)",
  "Mua sắm cá nhân",
  "Thức ăn và đồ uống ngoài chương trình",
  "Đồ uống có cồn (bia, rượu)",
  // ── Di chuyển ngoài chương trình ──────────────────────
  "Vé máy bay (chưa bao gồm, đặt riêng)",
  "Phương tiện di chuyển ngoài lịch trình",
  "Hành lý quá cước",
  // ── Lưu trú bổ sung ───────────────────────────────────
  "Phụ thu phòng đơn (liên hệ báo giá)",
  "Chi phí lưu trú nếu kéo dài chuyến đi",
  // ── Dịch vụ đặc biệt ──────────────────────────────────
  "Visa và các loại phí xuất nhập cảnh",
  "Tip/Thưởng cho hướng dẫn viên và tài xế",
  "Dịch vụ không có trong chương trình tour",
  // ── Rủi ro & Bất khả kháng ────────────────────────────
  "Chi phí phát sinh do hủy/hoãn chuyến bay",
  "Chi phí y tế nếu vượt mức bảo hiểm",
  "Thiệt hại do thiên tai, sự kiện bất khả kháng",
  // ── Trẻ em ────────────────────────────────────────────
  "Vé tham quan riêng cho trẻ dưới 5 tuổi (miễn phí)",
  "Giường phụ cho trẻ em (thu phí riêng)",
];

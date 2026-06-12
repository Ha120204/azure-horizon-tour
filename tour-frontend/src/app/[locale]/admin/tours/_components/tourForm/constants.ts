import type { TourFormData, SaleCategory } from "./types";
import { TOUR_TYPE_OPTIONS } from "@/lib/tour/tourTypes";

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
// Label admin = chính value (tiếng Việt); value/icon lấy từ nguồn chung để
// không lệch với filter khách hàng.
export const TOUR_TYPES = TOUR_TYPE_OPTIONS.map((option) => ({
  value: option.value,
  icon: option.icon,
  label: option.value,
}));

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

// ── Transport ─────────────────────────────────────────────────────────────
export const TRANSPORT_TYPE_OPTIONS = [
  { value: "SELF_ARRANGED", label: "Chưa xác định", icon: "help_outline" },
  { value: "FLIGHT", label: "Máy bay", icon: "flight" },
  { value: "BUS", label: "Xe khách / Coach", icon: "directions_bus" },
  { value: "PRIVATE_CAR", label: "Xe riêng / Limousine", icon: "directions_car" },
  { value: "COMBO", label: "Hỗn hợp (Combo)", icon: "swap_calls" },
] as const;

export const AIRLINE_PRESETS = [
  // Việt Nam
  { name: "Vietnam Airlines", iata: "VN", country: "VN" },
  { name: "Vietjet Air", iata: "VJ", country: "VN" },
  { name: "Bamboo Airways", iata: "QH", country: "VN" },
  { name: "Pacific Airlines", iata: "BL", country: "VN" },
  { name: "Vietravel Airlines", iata: "VU", country: "VN" },
  // Đông Nam Á
  { name: "AirAsia", iata: "AK", country: "MY" },
  { name: "Singapore Airlines", iata: "SQ", country: "SG" },
  { name: "Thai Airways", iata: "TG", country: "TH" },
  { name: "Bangkok Airways", iata: "PG", country: "TH" },
  { name: "Malaysia Airlines", iata: "MH", country: "MY" },
  { name: "Cebu Pacific", iata: "5J", country: "PH" },
  { name: "Garuda Indonesia", iata: "GA", country: "ID" },
  // Đông Bắc Á
  { name: "Korean Air", iata: "KE", country: "KR" },
  { name: "Asiana Airlines", iata: "OZ", country: "KR" },
  { name: "Japan Airlines", iata: "JL", country: "JP" },
  { name: "ANA", iata: "NH", country: "JP" },
  { name: "Cathay Pacific", iata: "CX", country: "HK" },
  { name: "China Airlines", iata: "CI", country: "TW" },
  { name: "Air China", iata: "CA", country: "CN" },
  { name: "China Southern", iata: "CZ", country: "CN" },
  // Quốc tế xa
  { name: "Emirates", iata: "EK", country: "AE" },
  { name: "Qatar Airways", iata: "QR", country: "QA" },
  { name: "Lufthansa", iata: "LH", country: "DE" },
  { name: "Air France", iata: "AF", country: "FR" },
];

export const AIRPORT_PRESETS = [
  // ── Việt Nam ──────────────────────────────────────────────────────────────
  { code: "HAN", name: "Sân bay Nội Bài", city: "Hà Nội", country: "VN" },
  { code: "SGN", name: "Sân bay Tân Sơn Nhất", city: "TP. Hồ Chí Minh", country: "VN" },
  { code: "DAD", name: "Sân bay Đà Nẵng", city: "Đà Nẵng", country: "VN" },
  { code: "CXR", name: "Sân bay Cam Ranh", city: "Nha Trang", country: "VN" },
  { code: "PQC", name: "Sân bay Phú Quốc", city: "Phú Quốc", country: "VN" },
  { code: "HUI", name: "Sân bay Phú Bài", city: "Huế", country: "VN" },
  { code: "VII", name: "Sân bay Vinh", city: "Vinh", country: "VN" },
  { code: "UIH", name: "Sân bay Phù Cát", city: "Quy Nhơn", country: "VN" },
  { code: "HPH", name: "Sân bay Cát Bi", city: "Hải Phòng", country: "VN" },
  { code: "VDO", name: "Sân bay Vân Đồn", city: "Quảng Ninh", country: "VN" },
  { code: "DLI", name: "Sân bay Liên Khương", city: "Đà Lạt", country: "VN" },
  { code: "VCA", name: "Sân bay Cần Thơ", city: "Cần Thơ", country: "VN" },
  { code: "BMV", name: "Sân bay Buôn Ma Thuột", city: "Buôn Ma Thuột", country: "VN" },
  { code: "PXU", name: "Sân bay Pleiku", city: "Pleiku", country: "VN" },
  { code: "TBB", name: "Sân bay Tuy Hòa", city: "Tuy Hòa", country: "VN" },
  { code: "VCL", name: "Sân bay Chu Lai", city: "Quảng Nam", country: "VN" },
  { code: "DIN", name: "Sân bay Điện Biên Phủ", city: "Điện Biên", country: "VN" },
  { code: "VDH", name: "Sân bay Đồng Hới", city: "Đồng Hới", country: "VN" },
  { code: "THD", name: "Sân bay Thọ Xuân", city: "Thanh Hóa", country: "VN" },
  { code: "CAH", name: "Sân bay Cà Mau", city: "Cà Mau", country: "VN" },
  { code: "VKG", name: "Sân bay Rạch Giá", city: "Rạch Giá", country: "VN" },
  { code: "VCS", name: "Sân bay Côn Đảo", city: "Côn Đảo", country: "VN" },
  // ── Đông Nam Á ────────────────────────────────────────────────────────────
  { code: "BKK", name: "Sân bay Suvarnabhumi", city: "Bangkok", country: "TH" },
  { code: "DMK", name: "Sân bay Don Mueang", city: "Bangkok", country: "TH" },
  { code: "SIN", name: "Sân bay Changi", city: "Singapore", country: "SG" },
  { code: "KUL", name: "Sân bay Kuala Lumpur", city: "Kuala Lumpur", country: "MY" },
  { code: "MNL", name: "Sân bay Ninoy Aquino", city: "Manila", country: "PH" },
  { code: "CGK", name: "Sân bay Soekarno-Hatta", city: "Jakarta", country: "ID" },
  { code: "DPS", name: "Sân bay Ngurah Rai", city: "Bali", country: "ID" },
  { code: "RGN", name: "Sân bay Yangon", city: "Yangon", country: "MM" },
  { code: "PNH", name: "Sân bay Phnom Penh", city: "Phnom Penh", country: "KH" },
  { code: "REP", name: "Sân bay Siem Reap", city: "Siem Reap", country: "KH" },
  { code: "VTE", name: "Sân bay Wattay", city: "Vientiane", country: "LA" },
  // ── Đông Bắc Á ───────────────────────────────────────────────────────────
  { code: "ICN", name: "Sân bay Incheon", city: "Seoul", country: "KR" },
  { code: "GMP", name: "Sân bay Gimpo", city: "Seoul", country: "KR" },
  { code: "NRT", name: "Sân bay Narita", city: "Tokyo", country: "JP" },
  { code: "HND", name: "Sân bay Haneda", city: "Tokyo", country: "JP" },
  { code: "KIX", name: "Sân bay Kansai", city: "Osaka", country: "JP" },
  { code: "HKG", name: "Sân bay Hồng Kông", city: "Hồng Kông", country: "HK" },
  { code: "TPE", name: "Sân bay Đào Viên", city: "Đài Bắc", country: "TW" },
  { code: "PEK", name: "Sân bay Bắc Kinh", city: "Bắc Kinh", country: "CN" },
  { code: "PVG", name: "Sân bay Phố Đông", city: "Thượng Hải", country: "CN" },
  { code: "CAN", name: "Sân bay Quảng Châu", city: "Quảng Châu", country: "CN" },
  // ── Quốc tế xa ───────────────────────────────────────────────────────────
  { code: "DXB", name: "Sân bay Dubai", city: "Dubai", country: "AE" },
  { code: "DOH", name: "Sân bay Hamad", city: "Doha", country: "QA" },
  { code: "CDG", name: "Sân bay Charles de Gaulle", city: "Paris", country: "FR" },
  { code: "LHR", name: "Sân bay Heathrow", city: "London", country: "GB" },
  { code: "SYD", name: "Sân bay Kingsford Smith", city: "Sydney", country: "AU" },
];

export const FLIGHT_CLASS_OPTIONS = [
  { value: "Economy", label: "Phổ thông", sublabel: "Economy", icon: "airline_seat_recline_normal" },
  { value: "Premium Economy", label: "Đặc biệt", sublabel: "Premium Economy", icon: "airline_seat_recline_extra" },
  { value: "Business", label: "Thương gia", sublabel: "Business", icon: "airline_seat_flat" },
];

export const VEHICLE_TYPE_PRESETS = [
  "Xe du lịch 45 chỗ",
  "Xe du lịch 35 chỗ",
  "Xe limousine 16 chỗ",
  "Xe limousine 9 chỗ",
  "Xe điều hòa 29 chỗ",
];

export const BUS_OPERATOR_PRESETS = [
  "Xe riêng công ty",
  "Nhà xe Phương Trang",
  "Nhà xe Hoàng Long",
  "Nhà xe Thành Bưởi",
];

// ── FAQ Templates ─────────────────────────────────────────────────────────
export const FAQ_TEMPLATES = [
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

// ── Flash Sale Time Options ────────────────────────────────────────────────
export const FLASH_SALE_TIME_OPTIONS = [
  ...Array.from({ length: 48 }, (_, index) => {
    const hours = String(Math.floor(index / 2)).padStart(2, "0");
    const minutes = index % 2 === 0 ? "00" : "30";
    return `${hours}:${minutes}`;
  }),
  "23:59",
];

// ── Package Badge Options ──────────────────────────────────────────────────
export const PACKAGE_BADGE_OPTIONS = [
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

// ── Sale Category Options ──────────────────────────────────────────────────
export const SALE_CATEGORY_OPTIONS = [
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

// ── Departure Date Helpers ─────────────────────────────────────────────────
export const getDatePart = (value: string) => (value ? value.slice(0, 10) : "");
export const getTimePart = (value: string) =>
  value && value.length >= 16 ? value.slice(11, 16) : "";
export const cleanTimelineEntries = (
  timeline?: { time: string; activity: string }[] | null,
) =>
  (Array.isArray(timeline) ? timeline : [])
    .map((item) => ({
      time: String(item.time ?? "").trim(),
      activity: String(item.activity ?? "").trim(),
    }))
    .filter((item) => item.time && item.activity);

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

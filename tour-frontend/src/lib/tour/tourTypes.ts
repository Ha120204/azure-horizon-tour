// Nguồn chân lý duy nhất cho các loại tour (tourType).
// `value` được lưu thẳng vào cột Tour.tourType ở DB, nên admin form (lúc lưu) và
// filter khách (lúc truy vấn) phải dùng chung danh sách này để không lệch nhau.
export const TOUR_TYPE_OPTIONS = [
  { value: 'Tour Gia Đình', icon: 'family_restroom', labelKey: 'filter.tourType_family', descKey: 'filter.tourType_familyDesc' },
  { value: 'Tour Cao Cấp', icon: 'diamond', labelKey: 'filter.tourType_premium', descKey: 'filter.tourType_premiumDesc' },
  { value: 'Nghỉ Dưỡng', icon: 'beach_access', labelKey: 'filter.tourType_resort', descKey: 'filter.tourType_resortDesc' },
  { value: 'Khám Phá', icon: 'hiking', labelKey: 'filter.tourType_adventure', descKey: 'filter.tourType_adventureDesc' },
  { value: 'Văn Hóa & Lịch Sử', icon: 'museum', labelKey: 'filter.tourType_culture', descKey: 'filter.tourType_cultureDesc' },
  { value: 'Tour Ghép Đoàn', icon: 'groups', labelKey: 'filter.tourType_group', descKey: 'filter.tourType_groupDesc' },
] as const;

export type TourTypeValue = (typeof TOUR_TYPE_OPTIONS)[number]['value'];

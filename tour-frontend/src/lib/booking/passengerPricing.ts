// Phải đồng bộ với backend PASSENGER_MULTIPLIERS trong
// tour-backend/src/booking/helpers/booking-helpers.ts
// LƯU Ý: "(4-11)"/"(<4)" trong key chỉ là định danh nội bộ ổn định (đã lưu ở booking cũ),
// KHÔNG phải mốc tuổi thật. Mốc thật: Child 2-11, Infant 0-2 (thực thi ở passengerDetails/PassengerSection).
export const PASSENGER_MULTIPLIERS = {
  'Adult (12+)': 1,
  'Child (4-11)': 0.75,
  'Infant (<4)': 0.1,
} as const;

export type PassengerTypeKey = keyof typeof PASSENGER_MULTIPLIERS;

// Giá đơn vị sau khi áp flash sale: khi departure có giá thấp hơn tour.price (giá gốc),
// giảm cùng TỶ LỆ đó lên giá gói khách chọn (mọi gói cùng % giảm).
// Phải đồng bộ với backend getSaleAdjustedUnitPrice trong booking-helpers.ts.
export function getSaleAdjustedUnitPrice(
  packagePrice: number,
  tourPrice: number | null | undefined,
  departurePrice: number | null | undefined,
): number {
  const dep = Number(departurePrice);
  const regular = Number(tourPrice);
  if (Number.isFinite(dep) && Number.isFinite(regular) && regular > 0 && dep < regular) {
    return Math.round(packagePrice * (dep / regular));
  }
  return packagePrice;
}

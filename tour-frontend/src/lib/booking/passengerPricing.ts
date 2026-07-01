// Phải đồng bộ với backend PASSENGER_MULTIPLIERS trong
// tour-backend/src/booking/helpers/booking-helpers.ts
export const PASSENGER_MULTIPLIERS = {
  'Adult (12+)': 1,
  'Child (4-11)': 0.7,
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

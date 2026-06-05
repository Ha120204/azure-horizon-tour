/**
 * Nguồn sự thật duy nhất cho hệ số giá hành khách (frontend).
 *
 * Cả checkout/page.tsx và admin/bookings/_lib/config.ts đều import từ đây.
 * Khi cần thay đổi giá, CHỈ sửa file này — tất cả nơi hiển thị tự cập nhật.
 *
 * QUAN TRỌNG: Phải đồng bộ với backend PASSENGER_MULTIPLIERS trong
 * tour-backend/src/booking/helpers/booking-helpers.ts
 */
export const PASSENGER_MULTIPLIERS = {
  'Adult (12+)': 1,
  'Child (4-11)': 0.7,
  'Infant (<4)': 0.1,
} as const;

export type PassengerTypeKey = keyof typeof PASSENGER_MULTIPLIERS;

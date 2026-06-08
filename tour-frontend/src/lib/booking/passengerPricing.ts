// Phải đồng bộ với backend PASSENGER_MULTIPLIERS trong
// tour-backend/src/booking/helpers/booking-helpers.ts
export const PASSENGER_MULTIPLIERS = {
  'Adult (12+)': 1,
  'Child (4-11)': 0.7,
  'Infant (<4)': 0.1,
} as const;

export type PassengerTypeKey = keyof typeof PASSENGER_MULTIPLIERS;

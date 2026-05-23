export const SALE_DEPARTURE_CATEGORIES = [
  'FLASH_SALE',
  'EARLY_BIRD',
  'LAST_MINUTE',
] as const;

const SALE_DEPARTURE_CATEGORY_SET = new Set<string>(SALE_DEPARTURE_CATEGORIES);

type SaleDepartureLike = {
  category?: string | null;
  note?: string | null;
  flashSaleEndsAt?: Date | string | null;
  price?: number | null;
  tour?: { price?: number | null } | null;
};

type SaleDepartureOptions = {
  now?: Date;
  regularPrice?: number | null;
};

export const SALE_TOUR_NO_VOUCHER_MESSAGE =
  'SALE_TOUR_NO_VOUCHER:Tour dang trong chuong trinh uu dai nen khong the ap dung them voucher';

export function isSaleDeparture(
  departure: SaleDepartureLike | null | undefined,
  options: SaleDepartureOptions = {},
) {
  if (!departure) return false;

  const now = options.now ?? new Date();
  const departurePrice = Number(departure.price);
  const regularPrice = Number(options.regularPrice ?? departure.tour?.price);
  if (
    Number.isFinite(departurePrice) &&
    Number.isFinite(regularPrice) &&
    regularPrice > 0 &&
    departurePrice < regularPrice
  ) {
    return true;
  }

  const category = departure.category?.trim();
  const legacyNote = departure.note?.trim();
  const hasSaleCategory =
    (category != null && SALE_DEPARTURE_CATEGORY_SET.has(category)) ||
    (!category && legacyNote != null && SALE_DEPARTURE_CATEGORY_SET.has(legacyNote));

  if (!hasSaleCategory) return false;

  if (departure.flashSaleEndsAt) {
    const endsAt = new Date(departure.flashSaleEndsAt);
    if (!Number.isNaN(endsAt.getTime()) && endsAt <= now) return false;
  }

  return true;
}

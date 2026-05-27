import { PASSENGER_PRICING, passengerTypeOrder } from './config';
import type { AssistedDraftForm, DraftPassenger, PassengerType, TourDepartureOption, TourOption } from './types';

export const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

export const fmtCompact = (n: number) => fmt(n);

export const parsePassengerCount = (value: string, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

export const normalizePassengerTypeLabel = (type?: string): PassengerType => {
  const normalized = String(type ?? '').toUpperCase();
  if (normalized === 'CHILD' || normalized === 'CHILD (4-11)') return 'Child (4-11)';
  if (normalized === 'INFANT' || normalized === 'INFANT (<4)') return 'Infant (<4)';
  return 'Adult (12+)';
};

export const getPassengerCounts = (passengers?: DraftPassenger[] | null, fallbackPeople = 1) => {
  const counts: Record<PassengerType, number> = {
    'Adult (12+)': 0,
    'Child (4-11)': 0,
    'Infant (<4)': 0,
  };

  if (Array.isArray(passengers) && passengers.length > 0) {
    passengers.forEach(passenger => {
      counts[normalizePassengerTypeLabel(String(passenger?.type ?? 'Adult (12+)'))] += 1;
    });
  } else {
    counts['Adult (12+)'] = Math.max(1, Number(fallbackPeople) || 1);
  }

  return counts;
};

export const formatPassengerBreakdown = (passengers?: DraftPassenger[] | null, fallbackPeople = 1) => {
  const counts = getPassengerCounts(passengers, fallbackPeople);
  const parts = passengerTypeOrder
    .filter(type => counts[type] > 0)
    .map(type => `${counts[type]} ${PASSENGER_PRICING[type].label.toLowerCase()}`);
  return parts.length ? parts.join(' · ') : `${Math.max(1, fallbackPeople)} khách`;
};

export const buildPassengerDraftPayload = (form: AssistedDraftForm): DraftPassenger[] => {
  const adultCount = Math.max(1, parsePassengerCount(form.adultCount, 1));
  const childCount = parsePassengerCount(form.childCount);
  const infantCount = parsePassengerCount(form.infantCount);

  return [
    ...Array.from({ length: adultCount }, (_, index) => ({
      type: 'Adult (12+)' as PassengerType,
      ...(index === 0
        ? {
            fullName: form.customerName.trim() || undefined,
            identityType: 'CCCD',
            identityNo: form.customerIdentityNo.trim() || undefined,
          }
        : {}),
    })),
    ...Array.from({ length: childCount }, () => ({ type: 'Child (4-11)' as PassengerType })),
    ...Array.from({ length: infantCount }, () => ({ type: 'Infant (<4)' as PassengerType })),
  ];
};

export const toValidDate = (d?: string | null) => {
  if (!d) return null;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const fmtDate = (d?: string | null) => {
  const date = toValidDate(d);
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const fmtDateTime = (d?: string | null) => {
  const date = toValidDate(d);
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const getApiErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== 'object') return fallback;
  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join('\n');
  if (typeof message === 'string') return message;
  return fallback;
};

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const normalizePhone = (phone: string) => phone.replace(/[\s.-]/g, '');

export const isValidVietnamPhone = (phone: string) =>
  /^(0|\+84)\d{9}$/.test(normalizePhone(phone));

export const isValidCccd = (value: string) => /^\d{12}$/.test(value.trim());

export const hasDetailedDeparture = (departure: TourDepartureOption) =>
  typeof departure.id === 'number' && Boolean(toValidDate(departure.departureDate));

export const hasLoadedBookingOptions = (tour?: TourOption) =>
  Boolean(
    tour &&
    Array.isArray(tour.packages) &&
    Array.isArray(tour.departures) &&
    tour.departures.every(hasDetailedDeparture),
  );

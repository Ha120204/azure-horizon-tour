import { BadRequestException } from '@nestjs/common';
import type { TourDeparture, Prisma } from '@prisma/client';
import type { PassengerInput, PayosError } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PASSENGER_TYPE_ALIASES: Record<string, string> = {
  ADULT: 'Adult (12+)',
  CHILD: 'Child (4-11)',
  INFANT: 'Infant (<4)',
  'ADULT (12+)': 'Adult (12+)',
  'CHILD (4-11)': 'Child (4-11)',
  'INFANT (<4)': 'Infant (<4)',
};

// ─── Passenger helpers ────────────────────────────────────────────────────────

export function isPassengerInput(value: unknown): value is PassengerInput {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asPassengerInputs(value: unknown): PassengerInput[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isPassengerInput);
}

export function normalizePassengerType(type: unknown): string {
  const raw = typeof type === 'string' ? type.trim() : 'Adult (12+)';
  return PASSENGER_TYPE_ALIASES[raw.toUpperCase()] ?? raw;
}

export function normalizePassengers(
  value: unknown,
  fallbackPeople: number,
): PassengerInput[] {
  const inputs = asPassengerInputs(value);
  if (inputs?.length) {
    return inputs.map((passenger) => {
      const normalized: PassengerInput = {};
      for (const [key, entryValue] of Object.entries(passenger)) {
        if (entryValue !== undefined) normalized[key] = entryValue;
      }
      normalized.type = normalizePassengerType(passenger.type);
      return normalized;
    });
  }

  const people = Math.max(1, Math.floor(Number(fallbackPeople) || 1));
  return Array.from({ length: people }, () => ({ type: 'Adult (12+)' }));
}

// ─── Payment helpers ──────────────────────────────────────────────────────────

export function isPayosDuplicateError(error: unknown): error is PayosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PayosError).code === '231'
  );
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const PAYOS_HOLD_MINUTES = 15;
export const IN_STORE_MAX_HOLD_HOURS = 24;
export const IN_STORE_OPERATIONAL_CUTOFF_HOURS = 6;

type HoldPaymentMethod = 'PAYOS' | 'IN_STORE';

export function calculateBookingHoldExpiresAt({
  paymentMethod,
  departureDate,
  now = new Date(),
}: {
  paymentMethod: HoldPaymentMethod;
  departureDate: Date;
  now?: Date;
}): Date {
  if (departureDate.getTime() <= now.getTime()) {
    throw new BadRequestException('Tour da khoi hanh hoac khong con nhan dat cho.');
  }

  const methodHoldMs =
    paymentMethod === 'IN_STORE'
      ? IN_STORE_MAX_HOLD_HOURS * 60 * 60 * 1000
      : PAYOS_HOLD_MINUTES * 60 * 1000;
  const maxByMethod = new Date(now.getTime() + methodHoldMs);

  if (paymentMethod === 'PAYOS') {
    return maxByMethod.getTime() < departureDate.getTime()
      ? maxByMethod
      : departureDate;
  }

  const operationalDeadline = new Date(
    departureDate.getTime() - IN_STORE_OPERATIONAL_CUTOFF_HOURS * 60 * 60 * 1000,
  );

  if (operationalDeadline.getTime() <= now.getTime()) {
    throw new BadRequestException(
      'Tour sap khoi hanh, vui long thanh toan online hoac lien he nhan vien.',
    );
  }

  return maxByMethod.getTime() < operationalDeadline.getTime()
    ? maxByMethod
    : operationalDeadline;
}

// ─── Voucher helpers ──────────────────────────────────────────────────────────

export function assertVoucherAllowedForDeparture(
  departure: TourDeparture | null,
  voucherCode?: string | null,
  regularPrice?: number | null,
) {
  // Import inline để tránh circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isSaleDeparture, SALE_TOUR_NO_VOUCHER_MESSAGE } = require('../../tour/promotion-rules') as {
    isSaleDeparture: (d: TourDeparture | null, opts?: { regularPrice?: number | null }) => boolean;
    SALE_TOUR_NO_VOUCHER_MESSAGE: string;
  };
  if (!voucherCode?.trim() || !isSaleDeparture(departure, { regularPrice })) return;
  throw new BadRequestException(SALE_TOUR_NO_VOUCHER_MESSAGE);
}

// ─── Enum guards ──────────────────────────────────────────────────────────────

export function isBookingStatus(value: string): boolean {
  const BookingStatus = ['PENDING', 'CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED'];
  return BookingStatus.includes(value);
}

export function isPaymentStatus(value: string): boolean {
  const PaymentStatus = ['UNPAID', 'PROCESSING', 'PAID', 'FAILED'];
  return PaymentStatus.includes(value);
}

export function isAssistedDraftStatus(value: string): boolean {
  const AssistedDraftStatus = ['DRAFT', 'PENDING_APPROVAL', 'NEEDS_REVISION', 'REJECTED', 'CONVERTED'];
  return AssistedDraftStatus.includes(value);
}

// ─── Pricing helpers ──────────────────────────────────────────────────────────

export function getPassengerTotal(
  basePrice: number,
  people: number,
  passengers?: PassengerInput[],
): number {
  const multipliers: Record<string, number> = {
    'Adult (12+)': 1,
    'Child (4-11)': 0.7,
    'Infant (<4)': 0.1,
    ADULT: 1,
    CHILD: 0.7,
    INFANT: 0.1,
  };

  if (Array.isArray(passengers) && passengers.length > 0) {
    return passengers.reduce((sum, p) => {
      const type = String(p?.type ?? 'ADULT');
      return sum + basePrice * (multipliers[type] ?? 1);
    }, 0);
  }

  return basePrice * people;
}

export function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} đ`;
}

export function getPassengerBreakdown(
  passengers: unknown,
  fallbackPeople: number,
): string {
  const counts: Record<string, number> = {
    'Adult (12+)': 0,
    'Child (4-11)': 0,
    'Infant (<4)': 0,
  };

  const normalized = normalizePassengers(passengers, fallbackPeople);
  normalized.forEach((passenger) => {
    const type = normalizePassengerType(passenger.type);
    counts[type] = (counts[type] ?? 0) + 1;
  });

  const parts = [
    counts['Adult (12+)'] ? `${counts['Adult (12+)']} nguoi lon` : '',
    counts['Child (4-11)'] ? `${counts['Child (4-11)']} tre em` : '',
    counts['Infant (<4)'] ? `${counts['Infant (<4)']} em be` : '',
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : `${fallbackPeople} khach`;
}

// ─── Code generators ──────────────────────────────────────────────────────────

export function generateBookingCode(): string {
  const prefix = 'BKG';
  const date = new Date();
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  const dateString = `${d}${m}${y}`;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomString = '';
  for (let i = 0; i < 4; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${dateString}-${randomString}`;
}

export function generateAssistedDraftCode(): string {
  const date = new Date();
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomString = '';
  for (let i = 0; i < 4; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ABD-${d}${m}${y}-${randomString}`;
}

export function buildPayosOrderCode(bookingId: number): number {
  const timeSuffix = (Date.now() % 1000000).toString().padStart(6, '0');
  return Number(bookingId.toString() + timeSuffix);
}

export function buildPaymentRequestContent(
  payload: { bookingCode: string; customerName: string; tourName: string; startDate: string; duration: string; passengerBreakdown: string; totalPrice: string; discountAmount?: string; deadlineText: string },
  paymentUrl: string,
): string {
  return [
    'Azure Horizon xac nhan thong tin dat tour cua anh/chi:',
    '',
    `Ma dat tour: ${payload.bookingCode}`,
    `Khach hang: ${payload.customerName}`,
    `Tour: ${payload.tourName}`,
    `Khoi hanh: ${payload.startDate}`,
    `Thoi gian: ${payload.duration}`,
    `Hanh khach: ${payload.passengerBreakdown}`,
    payload.discountAmount ? `Giam gia: -${payload.discountAmount}` : '',
    `Tong thanh toan: ${payload.totalPrice}`,
    `Han thanh toan: ${payload.deadlineText}`,
    '',
    'Vui long kiem tra thong tin. Neu dung, anh/chi thanh toan tai:',
    paymentUrl,
    '',
    'Neu thong tin chua dung, vui long phan hoi voi nhan vien tu van truoc khi thanh toan.',
  ]
    .filter(Boolean)
    .join('\n');
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export type { Prisma };

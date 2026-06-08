import type { SupportedLocale, UnknownRecord } from './types';

export const normalizeLocale = (locale?: string): SupportedLocale =>
  locale === 'en' ? 'en' : 'vi';

export const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const asRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;

export const arrayValue = (record: UnknownRecord, key: string): unknown[] | undefined =>
  Array.isArray(record[key]) ? record[key] : undefined;

export const recordValue = (record: UnknownRecord, key: string): UnknownRecord | undefined =>
  asRecord(record[key]);

export const destinationNameValue = (tour: UnknownRecord) =>
  recordValue(tour, 'destination')?.name ?? tour.name;

export const stripVietnameseMarks = (value: unknown) =>
  hasText(value)
    ? value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
    : '';

export const normalizeTextKey = (value: unknown) =>
  stripVietnameseMarks(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const cleanSpaces = (value: string) =>
  value.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();

export const sentenceCase = (value: string) => {
  const cleaned = cleanSpaces(value);
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export const withPeriod = (value: string) => {
  const cleaned = cleanSpaces(value);
  if (!cleaned) return '';
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
};

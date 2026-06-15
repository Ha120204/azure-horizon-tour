import { NEVER_YEAR } from './config';

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

export const formatCurrencyCompact = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ ₫`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr ₫`;
  return formatCurrency(n);
};

export const formatDate = (d: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

export const isNeverExpires = (d: string) => new Date(d).getFullYear() >= NEVER_YEAR;

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const getApiMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    return typeof message === 'string' ? message : fallback;
  }
  return fallback;
};

export const escapeCsv = (value: string | number | boolean | null | undefined) => {
  const raw = value == null ? '' : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
};

export const makeDuplicateCode = (code: string) => {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const suffix = `_C${Date.now().toString().slice(-4)}`;
  const base = (normalized || 'VOUCHER').slice(0, 20 - suffix.length);
  return `${base}${suffix}`;
};

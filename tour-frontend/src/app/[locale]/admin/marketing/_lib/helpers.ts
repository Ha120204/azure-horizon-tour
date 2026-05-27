export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const escapeCsv = (value: string | number | boolean) =>
  `"${String(value).replaceAll('"', '""')}"`;

export const toDateTimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const getLocalDatePart = (value: string) => value.slice(0, 10);

export const mergeLocalDateTime = (datePart: string, timePart: string) =>
  datePart && timePart ? `${datePart}T${timePart}` : '';

export const sanitizeTimeInput = (value: string, max: number) => {
  const digits = value.replace(/\D/g, '').slice(0, 2);
  if (!digits) return '';
  return String(Math.min(Number(digits), max));
};

export const normalizeTimeInput = (value: string, max: number) => {
  const digits = value.replace(/\D/g, '').slice(0, 2);
  if (!digits) return '';
  return String(Math.min(Number(digits), max)).padStart(2, '0');
};

export const buildLocalScheduleValue = (datePart: string, hour: string, minute: string) => {
  const normalizedHour = normalizeTimeInput(hour, 23);
  const normalizedMinute = normalizeTimeInput(minute, 59);
  return datePart && normalizedHour && normalizedMinute
    ? mergeLocalDateTime(datePart, `${normalizedHour}:${normalizedMinute}`)
    : '';
};

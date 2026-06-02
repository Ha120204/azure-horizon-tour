import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// ── Date helpers ─────────────────────────────────────────────────────────────

export const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
};

export const getMinBookableDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
};

// ── Search helpers ────────────────────────────────────────────────────────────

export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const parseRatingBuckets = (input?: string): number[] => {
  if (!input) return [];
  const ratings = input
    .split(',')
    .map((r) => Number(r.trim()))
    .filter((r) => !Number.isNaN(r));
  if (ratings.length === 0 || ratings.some((r) => !Number.isInteger(r) || r < 1 || r > 5)) {
    throw new BadRequestException('Bộ lọc đánh giá không hợp lệ');
  }
  return Array.from(new Set(ratings));
};

export const appendAndFilter = (where: Prisma.TourWhereInput, filter: Prisma.TourWhereInput) => {
  where.AND = Array.isArray(where.AND)
    ? [...where.AND, filter]
    : where.AND
      ? [where.AND, filter]
      : [filter];
};

// ── Publishability validation ─────────────────────────────────────────────────

type PublishableTourFields = {
  name?: string | null;
  description?: string | null;
  price?: number | null;
  destinationId?: number | null;
  destination?: { name?: string | null } | null;
  startDate?: Date | string | null;
  duration?: string | null;
  availableSeats?: number | null;
  departures?: Array<{
    departureDate?: Date | null;
    availableSeats?: number | null;
    isActive?: boolean | null;
  }>;
};

const DRAFT_DESTINATION_NAME = 'Chưa xác định';
const hasText = (value?: string | null) => Boolean(value?.trim());

export const requirePublishableTour = (
  tour: PublishableTourFields,
  options: { requireDepartures?: boolean } = {},
) => {
  const errors: string[] = [];
  if (!hasText(tour.name)) errors.push('Tên tour');
  if (!hasText(tour.description)) errors.push('Mô tả');
  if (tour.price == null || Number(tour.price) <= 0) errors.push('Giá');
  if (!tour.destinationId) errors.push('Điểm đến');
  if (tour.destination?.name === DRAFT_DESTINATION_NAME) errors.push('Điểm đến');
  if (!hasText(tour.duration)) errors.push('Thời lượng');
  if (tour.availableSeats == null || Number(tour.availableSeats) < 1) errors.push('Số ghế');

  const startDate = tour.startDate ? new Date(tour.startDate) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) errors.push('Ngày khởi hành');

  if (options.requireDepartures) {
    const validDepartures = (tour.departures ?? []).filter(
      (d) => d.isActive !== false && d.departureDate && Number(d.availableSeats ?? 0) > 0,
    );
    if (validDepartures.length === 0) errors.push('Ít nhất 1 chuyến khởi hành');
  }

  if (errors.length > 0) {
    throw new BadRequestException(
      `Vui lòng hoàn thiện thông tin trước khi gửi duyệt: ${[...new Set(errors)].join(', ')}`,
    );
  }
};

// ── Role helpers ──────────────────────────────────────────────────────────────

export const isAdminLikeRole = (role?: string) =>
  role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'STAFF';

export const sanitizePublicTourDetail = <T extends Record<string, unknown>>(tour: T) => {
  const { createdBy, reviewedBy, createdById, reviewedById, reviewNote, deletedAt, ...publicTour } = tour;
  void createdBy; void reviewedBy; void createdById; void reviewedById; void reviewNote; void deletedAt;
  return publicTour;
};

export const parseTravelScope = (input?: string) => {
  if (!input) return undefined;
  if (input === 'DOMESTIC' || input === 'INTERNATIONAL') return input;
  throw new BadRequestException('Phạm vi điểm đến không hợp lệ');
};

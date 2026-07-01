import { BadRequestException, ConflictException } from '@nestjs/common';
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

/**
 * Tính số ghế thực cần giữ từ danh sách passengers.
 * Infant (<4) không chiếm ghế (ngồi lòng người lớn).
 * Fallback về numberOfPeople nếu không có passengers (e.g. booking cũ).
 */
export function calcSeatCount(
  passengers: unknown,
  fallbackNumberOfPeople: number,
): number {
  const inputs = asPassengerInputs(passengers);
  if (!inputs?.length) return fallbackNumberOfPeople;

  const seatCount = inputs.filter((p) => {
    const normalized = normalizePassengerType(p.type);
    return normalized !== 'Infant (<4)';
  }).length;

  // Đảm bảo ít nhất 1 ghế
  return Math.max(1, seatCount);
}

/** Một slot hành khách được coi là đủ thông tin khi có tên, ngày sinh và giới tính. */
export function isPassengerComplete(passenger: PassengerInput | undefined): boolean {
  if (!passenger) return false;
  const str = (key: string) => {
    const value = passenger[key];
    return typeof value === 'string' ? value.trim() : '';
  };
  return Boolean(str('fullName') && str('dob') && str('gender'));
}

/** Số slot hành khách còn thiếu thông tin (dùng cho luồng "bổ sung sau"). */
export function countIncompletePassengers(passengers: unknown): number {
  const inputs = asPassengerInputs(passengers);
  if (!inputs?.length) return 0;
  return inputs.filter((p) => !isPassengerComplete(p)).length;
}


// ─── Age validation helpers ───────────────────────────────────────────────────

/**
 * Tính tuổi tại một mốc thời gian cụ thể.
 * Mirror logic với frontend calcAge() để backend và frontend nhất quán.
 */
export function calcAgeAt(dob: string, referenceDate = new Date()): number | null {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const m = referenceDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birth.getDate())) age--;
  return age;
}

// ════════════════════════════════════════════════════════════════════════════
// [BOOKING - CHỐNG KHAI GIAN TUỔI / PAYLOAD FORGE] Tính tuổi thực từ DOB
// TẠI NGÀY KHỞI HÀNH (không phải ngày đặt) rồi đối chiếu với loại khai báo.
// Vì sao tại ngày khởi hành? Một em bé có thể qua mốc tuổi giữa lúc đặt và lúc đi.
// Kẻ gian gửi payload type='Infant' cho người 20 tuổi → giá chỉ 10% → bị chặn.
// ════════════════════════════════════════════════════════════════════════════
/**
 * Validate tuổi thực tế (từ DOB) khớp với loại hành khách được khai báo.
 * Chống lại payload forge: ai đó gửi type='Infant (<4)' cho người lớn
 * để hưởng hệ số giá 10%.
 *
 * @param type   Loại hành khách khai báo trong payload (raw string)
 * @param dob    Ngày sinh (YYYY-MM-DD). Bỏ qua nếu undefined/empty.
 * @param departureDate  Mốc tính tuổi — nên là ngày khởi hành.
 */
export function validatePassengerAgeVsType(
  type: string,
  dob: string | null | undefined,
  departureDate?: Date,
): void {
  // Không có DOB → bỏ qua (một số booking cũ không có DOB)
  if (!dob || !dob.trim()) return;

  const age = calcAgeAt(dob, departureDate);
  // DOB không parse được → để backend tự handle ở chỗ khác
  if (age === null) return;

  const normalized = normalizePassengerType(type);

  if (normalized === 'Adult (12+)' && age < 12) {
    throw new BadRequestException(
      `Hành khách khai báo là Người lớn (Adult) nhưng tuổi thực tại ngày khởi hành là ${age} tuổi. Vui lòng chọn đúng loại hành khách.`,
    );
  }
  if (normalized === 'Child (4-11)' && (age < 4 || age > 11)) {
    throw new BadRequestException(
      `Hành khách khai báo là Trẻ em (Child) nhưng tuổi thực tại ngày khởi hành là ${age} tuổi. Vui lòng chọn đúng loại hành khách.`,
    );
  }
  if (normalized === 'Infant (<4)' && age >= 4) {
    throw new BadRequestException(
      `Hành khách khai báo là Em bé (Infant) nhưng tuổi thực tại ngày khởi hành là ${age} tuổi. Vui lòng chọn đúng loại hành khách.`,
    );
  }
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
// Trần giữ chỗ tuyệt đối cho PAYOS tính từ lúc tạo đơn: rolling 15 phút mỗi lần tạo lại QR
// được phép, nhưng tổng thời gian giữ ghế không vượt quá mốc này (chống giữ ghế vô hạn).
export const PAYOS_MAX_HOLD_MINUTES = 60;
export const IN_STORE_MAX_HOLD_HOURS = 24;
export const IN_STORE_OPERATIONAL_CUTOFF_HOURS = 6;

type HoldPaymentMethod = 'PAYOS' | 'IN_STORE';

export function calculateBookingHoldExpiresAt({
  paymentMethod,
  departureDate,
  now = new Date(),
  holdMinutes = PAYOS_HOLD_MINUTES,
}: {
  paymentMethod: HoldPaymentMethod;
  departureDate: Date;
  now?: Date;
  // Cửa sổ giữ chỗ PAYOS (phút) — cấu hình tại Cài đặt hệ thống (booking_hold_minutes).
  // IN_STORE dùng trần giờ riêng nên không chịu ảnh hưởng tham số này.
  holdMinutes?: number;
}): Date {
  if (departureDate.getTime() <= now.getTime()) {
    throw new BadRequestException('Tour da khoi hanh hoac khong con nhan dat cho.');
  }

  const methodHoldMs =
    paymentMethod === 'IN_STORE'
      ? IN_STORE_MAX_HOLD_HOURS * 60 * 60 * 1000
      : holdMinutes * 60 * 1000;
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

// ─── Seat reservation helpers ────────────────────────────────────────────────

// 409 Conflict cho trường hợp hết chỗ ngay lúc đặt (race condition).
// Trả errorCode máy-đọc-được + số chỗ còn lại để frontend hiển thị modal chặn
// và refresh tồn kho, thay vì để client đoán theo chuỗi message.
export class SeatsUnavailableException extends ConflictException {
  constructor(message: string, availableSeats: number) {
    super({ message, errorCode: 'SEATS_UNAVAILABLE', availableSeats });
  }
}

type SeatReservationTx = Pick<Prisma.TransactionClient, 'tour' | 'tourDeparture'>;

type SeatReservationInput = {
  tourId: number;
  departureId?: number | null;
  seats: number;
};

// ════════════════════════════════════════════════════════════════════════════
// [BOOKING - ATOMIC CONDITIONAL UPDATE / TRÁI TIM CHỐNG RACE CONDITION]
// Gộp "kiểm tra còn ghế" + "trừ ghế" vào MỘT câu UPDATE duy nhất (không tách thành 2 bước):
//   WHERE availableSeats >= seats   ← điều kiện nằm TRONG câu ghi
//   SET availableSeats -= seats     ← hành động trong cùng câu
// DB tự khóa dòng khi thực thi UPDATE → 2 request đồng thời:
//   Request A chạy trước → ghế về 0; Request B phải chờ → thấy 0 >= N là sai → count=0 → từ chối.
// count=0 = điều kiện không thỏa = hết ghế → ném SeatsUnavailableException (409).
// Đây là "check-and-set" — không cần lock thủ công, an toàn hơn read-then-write.
// ════════════════════════════════════════════════════════════════════════════
export async function reserveSeatsAtomically(
  tx: SeatReservationTx,
  { tourId, departureId, seats }: SeatReservationInput,
) {
  if (!Number.isInteger(seats) || seats < 1) {
    throw new BadRequestException('Number of seats must be at least 1');
  }

  // Tour có chuyến khởi hành: tồn kho ghế chỉ tính theo chuyến.
  // Bộ đếm tour.availableSeats (cấp tour tổng) chỉ dùng cho tour không có chuyến.
  if (departureId) {
    const departureReservation = await tx.tourDeparture.updateMany({
      where: {
        id: departureId,
        tourId,
        isActive: true,
        availableSeats: { gte: seats },
      },
      data: {
        availableSeats: { decrement: seats },
      },
    });

    if (departureReservation.count === 0) {
      const current = await tx.tourDeparture.findUnique({
        where: { id: departureId },
        select: { availableSeats: true },
      });
      throw new SeatsUnavailableException(
        'Not enough seats for this departure',
        current?.availableSeats ?? 0,
      );
    }
    return;
  }

  const tourReservation = await tx.tour.updateMany({
    where: {
      id: tourId,
      deletedAt: null,
      availableSeats: { gte: seats },
    },
    data: {
      availableSeats: { decrement: seats },
    },
  });

  if (tourReservation.count === 0) {
    const current = await tx.tour.findUnique({
      where: { id: tourId },
      select: { availableSeats: true },
    });
    throw new SeatsUnavailableException(
      'Not enough seats available',
      current?.availableSeats ?? 0,
    );
  }
}

type SeatReleaseTx = Pick<Prisma.TransactionClient, 'tour' | 'tourDeparture'>;

type SeatReleaseInput = {
  tourId: number;
  departureId?: number | null;
  seats: number;
};

export async function releaseSeats(
  tx: SeatReleaseTx,
  { tourId, departureId, seats }: SeatReleaseInput,
) {
  if (!Number.isInteger(seats) || seats < 1) {
    throw new BadRequestException('Number of seats must be at least 1');
  }

  // Đối xứng với reserveSeatsAtomically: tour có chuyến chỉ hoàn ghế cho chuyến,
  // không cộng lại vào bộ đếm tour tổng.
  if (departureId) {
    await tx.tourDeparture.updateMany({
      where: {
        id: departureId,
        tourId,
      },
      data: {
        availableSeats: { increment: seats },
      },
    });
    return;
  }

  await tx.tour.update({
    where: { id: tourId },
    data: {
      availableSeats: { increment: seats },
    },
  });
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

// ════════════════════════════════════════════════════════════════════════════
// [BOOKING - BẢNG GIÁ HÀNH KHÁCH] Nguồn sự thật duy nhất: adult ×1, child ×0.7, infant ×0.1.
// Có alias (ADULT/CHILD/INFANT) để khớp cả 2 format payload (chuỗi Viator-style và enum-style).
// Đổi giá: CHỈ sửa ở đây. Nếu cần UI frontend hiển thị đúng: sửa thêm map song song
// ở tour-frontend/src/lib/booking/passengerPricing.ts (điểm cộng khi nói với giảng viên).
// ════════════════════════════════════════════════════════════════════════════
/**
 * Nguồn sự thật duy nhất cho hệ số giá hành khách (backend).
 * Gồm cả alias key (ADULT/CHILD/INFANT) để tương thích với nhiều format payload.
 * Khi cần thay đổi giá, CHỈ sửa ở đây — không cần đụng vào getPassengerTotal.
 */
export const PASSENGER_MULTIPLIERS: Record<string, number> = {
  'Adult (12+)': 1,
  'Child (4-11)': 0.7,
  'Infant (<4)': 0.1,
  ADULT: 1,
  CHILD: 0.7,
  INFANT: 0.1,
};

// Giá đơn vị sau khi áp flash sale: khi departure có giá thấp hơn tour.price (giá gốc),
// giảm cùng TỶ LỆ đó lên giá gói khách chọn (mọi gói cùng % giảm).
// Phải đồng bộ với frontend getSaleAdjustedUnitPrice trong lib/booking/passengerPricing.ts.
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

export function getPassengerTotal(
  basePrice: number,
  people: number,
  passengers?: PassengerInput[],
): number {
  if (Array.isArray(passengers) && passengers.length > 0) {
    return passengers.reduce((sum, p) => {
      const type = String(p?.type ?? 'ADULT');
      return sum + basePrice * (PASSENGER_MULTIPLIERS[type] ?? 1);
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

// PayOS yêu cầu orderCode DUY NHẤT mỗi lần tạo link (không cho tái dùng kể cả khi tạo lại
// QR cho cùng booking). Lược đồ: ghép bookingId với 6 chữ số hậu tố thời gian (Date.now() % 1e6,
// padStart 6) → vừa luôn khác nhau, vừa nhúng bookingId ở các chữ số cao để return/webhook giải mã
// ngược ra booking (xem decode `Math.floor(orderCode / 1000000)`). Số 1000000 phải khớp với padStart(6).
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

import { PASSENGER_PRICING, passengerTypeOrder } from './config';
import type { AssistedDraftForm, Booking, DraftPassenger, PassengerType, PaymentTransaction, TourDepartureOption, TourOption } from './types';

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

type BuildPassengerOptions = { useRepresentativeAsFirstPassenger?: boolean };

const compactPassenger = (passenger: DraftPassenger): DraftPassenger =>
  Object.fromEntries(
    Object.entries(passenger).filter(([, value]) => value !== undefined && value !== ''),
  ) as DraftPassenger;

export const buildPassengerDraftPayload = (
  form: AssistedDraftForm,
  currentPassengersOrOptions: DraftPassenger[] | BuildPassengerOptions = [],
  maybeOptions: BuildPassengerOptions = {},
): DraftPassenger[] => {
  const currentPassengers = Array.isArray(currentPassengersOrOptions) ? currentPassengersOrOptions : [];
  const options = Array.isArray(currentPassengersOrOptions) ? maybeOptions : currentPassengersOrOptions;
  const adultCount = Math.max(1, parsePassengerCount(form.adultCount, 1));
  const childCount = parsePassengerCount(form.childCount);
  const infantCount = parsePassengerCount(form.infantCount);
  const useRepresentativeAsFirstPassenger = options.useRepresentativeAsFirstPassenger ?? true;
  const passengersByType = passengerTypeOrder.reduce((acc, type) => {
    acc[type] = currentPassengers
      .filter(passenger => normalizePassengerTypeLabel(String(passenger.type ?? 'Adult (12+)')) === type)
      .map(passenger => compactPassenger({ ...passenger, type }));
    return acc;
  }, {} as Record<PassengerType, DraftPassenger[]>);

  const buildRows = (type: PassengerType, count: number) =>
    Array.from({ length: count }, (_, index) =>
      compactPassenger({ ...(passengersByType[type][index] ?? {}), type }),
    );

  const passengers = [
    ...buildRows('Adult (12+)', adultCount),
    ...buildRows('Child (4-11)', childCount),
    ...buildRows('Infant (<4)', infantCount),
  ];

  if (useRepresentativeAsFirstPassenger && passengers[0]) {
    const representativeName = form.customerName.trim();
    const representativeIdentityNo = form.customerIdentityNo.trim();
    passengers[0] = compactPassenger({
      ...passengers[0],
      type: 'Adult (12+)' as PassengerType,
      fullName: representativeName || passengers[0].fullName,
      identityType: representativeIdentityNo ? 'CCCD' : passengers[0].identityType,
      identityNo: representativeIdentityNo || passengers[0].identityNo,
    });
  }

  if (!useRepresentativeAsFirstPassenger && passengers[0]) {
    const firstPassenger = { ...passengers[0] };
    const representativeName = form.customerName.trim();
    const representativeIdentityNo = form.customerIdentityNo.trim();
    if (representativeName && firstPassenger.fullName === representativeName) {
      delete firstPassenger.fullName;
    }
    if (representativeIdentityNo && firstPassenger.identityNo === representativeIdentityNo) {
      delete firstPassenger.identityNo;
      if (firstPassenger.identityType === 'CCCD') delete firstPassenger.identityType;
    }
    passengers[0] = compactPassenger(firstPassenger);
  }

  return passengers;
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

const API_ERROR_TRANSLATIONS: Record<string, string> = {
  'customer name is required before approval': 'Cần nhập tên người đại diện trước khi gửi duyệt.',
  'valid customer email is required': 'Email người đại diện chưa đúng định dạng.',
  'customer phone is required': 'Cần nhập số điện thoại người đại diện.',
  'valid vietnamese customer phone is required': 'Số điện thoại người đại diện chưa đúng định dạng Việt Nam.',
  'customer cccd must be 12 digits': 'CCCD người đại diện phải gồm đúng 12 chữ số.',
  'email is required when confirmation channel is email': 'Cần email nhận vé hoặc email người đại diện khi chọn kênh Email.',
  'tour is required before approval': 'Cần chọn tour trước khi gửi duyệt.',
  'number of people must be at least 1': 'Số khách phải từ 1 trở lên.',
  'passenger list must match number of people': 'Danh sách khách đi tour chưa khớp tổng số khách.',
  'at least one adult passenger is required': 'Cần ít nhất 1 người lớn trong đoàn.',
  'infant count cannot exceed adult count': 'Số em bé không vượt quá số người lớn.',
  'departure is required before approval': 'Cần chọn lịch khởi hành cụ thể trước khi gửi duyệt.',
  'tour not found': 'Không tìm thấy tour.',
  'tour nay da dien ra, khong the tao dat ho': 'Tour này đã diễn ra, không thể tạo booking đặt hộ.',
  'invalid departure': 'Lịch khởi hành không hợp lệ.',
  'not enough seats for this departure': 'Lịch khởi hành không còn đủ chỗ cho đoàn này.',
  'not enough seats available': 'Tour không còn đủ chỗ cho đoàn này.',
  'invalid tour package': 'Gói tour không hợp lệ.',
  'customer not found': 'Không tìm thấy khách hàng.',
  'booking not found': 'Không tìm thấy booking.',
  'draft not found': 'Không tìm thấy bản nháp đặt hộ.',
  'invalid assisted draft status': 'Trạng thái bản nháp không hợp lệ.',
  'ban khong co quyen sua ban nhap nay': 'Bạn không có quyền sửa bản nháp này.',
  'ban khong co quyen xoa ban nhap nay': 'Bạn không có quyền xóa bản nháp này.',
  'ban khong co quyen gui ban nhap nay': 'Bạn không có quyền gửi bản nháp này.',
  'chi co the sua ban nhap hoac ban can chinh sua': 'Chỉ có thể sửa bản nháp hoặc bản cần chỉnh sửa.',
  'chi co the gui ban nhap hoac ban can chinh sua': 'Chỉ có thể gửi bản nháp hoặc bản cần chỉnh sửa.',
  'ban nhap da tao booking, khong the xoa': 'Bản nháp đã tạo booking, không thể xóa.',
  'chi co the xoa ban nhap, ban can sua hoac ban da tu choi': 'Chỉ có thể xóa bản nháp, bản cần sửa hoặc bản đã từ chối.',
  'chi ban nhap dang cho duyet moi co the yeu cau chinh sua': 'Chỉ bản nháp đang chờ duyệt mới có thể yêu cầu chỉnh sửa.',
  'chi ban nhap dang cho duyet moi co the bi tu choi': 'Chỉ bản nháp đang chờ duyệt mới có thể bị từ chối.',
  'ban nhap nay da tao booking': 'Bản nháp này đã tạo booking.',
  'don tai quay khong tao link payos. hay doi phuong thuc sang payos truoc khi gui lai yeu cau thanh toan.': 'Đơn tại quầy không tạo link PayOS. Hãy đổi phương thức sang PayOS trước khi gửi lại yêu cầu thanh toán.',
  'booking da het han thanh toan. vui long tao booking moi.': 'Booking đã hết hạn thanh toán. Vui lòng tạo booking mới.',
  'thao tac that bai': 'Thao tác thất bại.',
  'load failed': 'Không tải được dữ liệu.',
};

export const translateApiMessage = (message: string) => {
  const normalized = message.trim().replace(/\s+/g, ' ').toLowerCase();
  return API_ERROR_TRANSLATIONS[normalized] ?? message;
};

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? translateApiMessage(error.message) : fallback;

export const getApiErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== 'object') return fallback;
  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(item => translateApiMessage(String(item))).join('\n');
  if (typeof message === 'string') return translateApiMessage(message);
  return fallback;
};

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const normalizePhone = (phone: string) => phone.replace(/[\s.-]/g, '');

export const isValidVietnamPhone = (phone: string) =>
  /^(0\d{9}|\+?84\d{9})$/.test(normalizePhone(phone));

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

// ─── Booking contact & payment helpers ──────────────────────────────────────

export const toTelHref = (phone?: string | null) => phone?.replace(/[^\d+]/g, '') ?? '';

export const toZaloPhone = (phone?: string | null) => {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (!digits) return '';
  if (digits.startsWith('84')) return digits;
  if (digits.startsWith('0')) return `84${digits.slice(1)}`;
  return digits;
};

export const canRemindPayment = (booking: Booking) =>
  booking.status === 'PENDING' &&
  booking.paymentStatus === 'UNPAID' &&
  booking.paymentMethod === 'PAYOS';

export function getVisibleTransactions(
  booking: Booking,
  currentGateway: 'MANUAL' | 'PAYOS',
  hasSuccessfulCurrentGateway: boolean,
): PaymentTransaction[] {
  const seenOpenPayos = new Set<string>();
  return [...(booking.transactions ?? [])]
    .sort((a, b) => {
      const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return createdDiff || b.id - a.id;
    })
    .filter((tx) => {
      if (tx.status === 'SUCCESS') return true;
      if (
        booking.paymentStatus === 'PAID' &&
        tx.gateway === currentGateway &&
        tx.status === 'PENDING' &&
        hasSuccessfulCurrentGateway
      ) {
        return false;
      }
      if (booking.paymentMethod === 'IN_STORE' && tx.gateway !== 'MANUAL') return false;
      if (booking.paymentMethod === 'PAYOS' && tx.gateway !== 'PAYOS') return false;

      if (tx.gateway === 'PAYOS' && tx.status === 'PENDING') {
        const key = `${tx.gateway}:${tx.status}:${Math.round(Number(tx.amount) || 0)}`;
        if (seenOpenPayos.has(key)) return false;
        seenOpenPayos.add(key);
      }

      return true;
    });
}

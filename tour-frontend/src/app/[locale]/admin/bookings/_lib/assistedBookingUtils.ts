import {
  isValidEmail,
  isValidVietnamPhone,
  isValidCccd,
  getPassengerCounts,
  hasDetailedDeparture,
} from './helpers';
import { CONFIRMATION_CHANNEL_OPTIONS, passengerTypeOrder } from './config';
import type {
  AssistedDraft,
  AssistedDraftAction,
  AssistedDraftForm,
  DraftPassenger,
  PassengerType,
  TourOption,
} from './types';

// ── Types ──────────────────────────────────────────────────────────────────

export type GeneratedPassengerRow = {
  id: string;
  index: number;
  type: PassengerType;
  label: string;
  ageLabel: string;
  icon: string;
  canUseRepresentative: boolean;
  usesRepresentative: boolean;
  hasDetails: boolean;
  detailLabel: string;
  passenger: DraftPassenger;
};

export type CreateAssistedDraftEventDetail = {
  bookingCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tourId?: number;
  numberOfPeople?: number;
  voucherCode?: string;
  internalNote?: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const PACKAGE_NAME_LABELS: Record<string, string> = {
  'Goi Tieu Chuan': 'Gói Tiêu Chuẩn',
  'Goi Cao Cap': 'Gói Cao Cấp',
  'Goi Rieng Tu': 'Gói Riêng Tư',
};

export const EMPTY_FORM: AssistedDraftForm = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerIdentityNo: '',
  sourceChannel: 'LIVE_CHAT',
  confirmationChannel: 'ZALO',
  emailForTicket: '',
  tourId: '',
  departureId: '',
  packageId: '',
  adultCount: '1',
  childCount: '0',
  infantCount: '0',
  voucherCode: '',
  specialRequests: '',
  internalNote: '',
};

// ── Pure helpers ───────────────────────────────────────────────────────────

export function getPackageDisplayName(name: string | null | undefined) {
  if (!name) return '';
  return PACKAGE_NAME_LABELS[name.trim()] ?? name;
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

// ── Dialog config ──────────────────────────────────────────────────────────

export function buildDraftActionDialogConfig(action: AssistedDraftAction | undefined) {
  if (action === 'submit') return {
    eyebrow: 'Gửi duyệt',
    title: 'Rà soát trước khi gửi admin duyệt',
    description: 'Kiểm tra lại thông tin người đại diện, tour, lịch khởi hành, số khách và kênh xác nhận trước khi chuyển bản nháp sang trạng thái chờ duyệt.',
    icon: 'approval_delegation',
    iconClass: 'bg-blue-50 text-blue-700 ring-blue-100',
    label: '',
    placeholder: '',
    submitLabel: 'Xác nhận gửi duyệt',
    submitClass: 'bg-blue-700 text-white hover:bg-blue-800 focus-visible:ring-blue-500',
    hint: 'Sau khi gửi, admin sẽ kiểm tra và duyệt tạo booking thật. Staff vẫn xem được bản nháp trong danh sách chờ duyệt.',
    requiresReason: false,
    showReason: false,
  };
  if (action === 'reject') return {
    eyebrow: 'Từ chối duyệt',
    title: 'Từ chối bản nháp đặt hộ',
    description: 'Bản nháp sẽ chuyển sang trạng thái từ chối. Staff vẫn xem được lý do để trao đổi lại với khách.',
    icon: 'block',
    iconClass: 'bg-red-50 text-red-700 ring-red-100',
    label: 'Lý do từ chối',
    placeholder: 'Ví dụ: Không đủ thông tin người đại diện, tour đã hết chỗ, giá/voucher không hợp lệ...',
    submitLabel: 'Từ chối bản nháp',
    submitClass: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    hint: 'Viết rõ nguyên nhân nghiệp vụ để staff không phải hỏi lại admin.',
    requiresReason: true,
    showReason: true,
  };
  if (action === 'request-revision') return {
    eyebrow: 'Yêu cầu chỉnh sửa',
    title: 'Gửi yêu cầu sửa cho staff',
    description: 'Bản nháp sẽ quay về trạng thái cần sửa. Staff sẽ dùng nội dung này làm checklist trước khi gửi duyệt lại.',
    icon: 'rate_review',
    iconClass: 'bg-amber-50 text-amber-700 ring-amber-100',
    label: 'Nội dung cần chỉnh sửa',
    placeholder: 'Ví dụ: Bổ sung CCCD người đại diện, chọn ngày khởi hành 18/06, xác nhận lại email nhận vé...',
    submitLabel: 'Gửi yêu cầu sửa',
    submitClass: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500',
    hint: 'Ưu tiên gạch đầu dòng các việc cần sửa để staff xử lý nhanh.',
    requiresReason: true,
    showReason: true,
  };
  if (action === 'approve') return {
    eyebrow: 'Xác nhận duyệt',
    title: 'Duyệt bản nháp và tạo booking',
    description: 'Sau khi duyệt, hệ thống sẽ tạo booking thật, giữ chỗ tour và gửi yêu cầu thanh toán cho khách theo kênh đã chọn.',
    icon: 'task_alt',
    iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    label: 'Ghi chú duyệt',
    placeholder: 'Ví dụ: Đã kiểm tra thông tin khách, lịch khởi hành và giá tour.',
    submitLabel: 'Duyệt và tạo booking',
    submitClass: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
    hint: 'Ghi chú là tùy chọn. Kiểm tra kỹ thông tin trước khi xác nhận vì thao tác này tạo đơn thật.',
    requiresReason: false,
    showReason: true,
  };
  return null;
}

// ── Validation ─────────────────────────────────────────────────────────────

export function validateDraftForApproval(draft: AssistedDraft, tours: TourOption[]): string[] {
  const issues: string[] = [];
  const customerEmail = draft.customerEmail?.trim() ?? '';
  const customerPhone = draft.customerPhone?.trim() ?? '';
  const customerIdentityNo = draft.customerIdentityNo?.trim() ?? '';
  const emailForTicket = draft.emailForTicket?.trim() ?? '';
  const confirmationChannel = String(draft.confirmationChannel || 'ZALO').toUpperCase();
  const passengerCount = Number(draft.numberOfPeople) || 0;
  const draftPassengerList = Array.isArray(draft.passengers) ? draft.passengers : [];
  const passengerCounts = getPassengerCounts(draft.passengers, passengerCount || 1);
  const countedPassengerTotal = passengerTypeOrder.reduce((total, type) => total + passengerCounts[type], 0);
  const draftTour = tours.find(tour => tour.id === draft.tourId);
  const activeDepartures = (draftTour?.departures ?? []).filter(d => d.isActive !== false).filter(hasDetailedDeparture);
  const draftDeparture = activeDepartures.find(d => d.id === draft.departureId);

  if (!draft.customerName?.trim()) issues.push('Thiếu tên người đại diện.');
  if (!customerEmail) issues.push('Thiếu email người đại diện để tạo hồ sơ.');
  else if (!isValidEmail(customerEmail)) issues.push(`Email người đại diện không hợp lệ: ${customerEmail}.`);
  if (!customerPhone) issues.push('Thiếu số điện thoại người đại diện.');
  else if (!isValidVietnamPhone(customerPhone)) issues.push(`Số điện thoại không đúng định dạng Việt Nam: ${customerPhone}.`);
  if (customerIdentityNo && !isValidCccd(customerIdentityNo)) issues.push('CCCD phải gồm đúng 12 chữ số.');
  if (emailForTicket && !isValidEmail(emailForTicket)) issues.push(`Email nhận vé không hợp lệ: ${emailForTicket}.`);
  if (!CONFIRMATION_CHANNEL_OPTIONS.some(o => o.value === confirmationChannel)) issues.push('Kênh gửi xác nhận không hợp lệ.');
  if (confirmationChannel === 'EMAIL' && !emailForTicket && !customerEmail) issues.push('Kênh email cần email nhận vé hoặc email người đại diện.');
  if (!draft.tourId) issues.push('Chưa chọn tour cần đặt hộ.');
  if (passengerCount < 1) issues.push('Số khách phải từ 1 trở lên.');
  if (draftPassengerList.length !== passengerCount) issues.push('Danh sách khách đi tour chưa khớp tổng số khách.');
  if (countedPassengerTotal !== passengerCount) issues.push('Cơ cấu khách chưa khớp tổng số khách.');
  if (passengerCounts['Adult (12+)'] < 1) issues.push('Cần ít nhất 1 người lớn trong đoàn.');
  if (passengerCounts['Infant (<4)'] > passengerCounts['Adult (12+)']) issues.push('Số em bé không được vượt quá số người lớn.');
  if (activeDepartures.length > 0 && !draft.departureId) issues.push('Tour có lịch khởi hành cụ thể, cần chọn lịch trước khi duyệt.');
  if (draft.departureId && draftDeparture?.availableSeats !== undefined && draftDeparture.availableSeats < passengerCount) {
    issues.push(`Lịch khởi hành chỉ còn ${draftDeparture.availableSeats} ghế, không đủ cho ${passengerCount} khách.`);
  } else if (!draft.departureId && draftTour?.availableSeats !== undefined && draftTour.availableSeats < passengerCount) {
    issues.push(`Tour chỉ còn ${draftTour.availableSeats} ghế, không đủ cho ${passengerCount} khách.`);
  }

  return issues;
}

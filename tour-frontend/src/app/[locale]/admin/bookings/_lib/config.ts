import type { AssistedDraftFormErrors, AssistedDraftStatus, DraftSelectOption, PassengerType } from './types';
import { PASSENGER_MULTIPLIERS } from '@/lib/booking/passengerPricing';

export type { DraftSelectOption };

type StatusConfig = { label: string; dot: string; badge: string; icon: string };
type BadgeConfig = { label: string; badge: string; icon: string };

export const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600',
  'from-teal-400 to-cyan-600', 'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500', 'from-emerald-400 to-green-600',
];

export const PASSENGER_PRICING: Record<PassengerType, { label: string; age: string; icon: string; multiplier: number }> = {
  'Adult (12+)': { label: 'Người lớn', age: '12+', icon: 'person',               multiplier: PASSENGER_MULTIPLIERS['Adult (12+)'] },
  'Child (4-11)': { label: 'Trẻ em',  age: '4-11', icon: 'child_care',           multiplier: PASSENGER_MULTIPLIERS['Child (4-11)'] },
  'Infant (<4)':  { label: 'Em bé',   age: '<4',   icon: 'baby_changing_station', multiplier: PASSENGER_MULTIPLIERS['Infant (<4)'] },
};

export const passengerTypeOrder: PassengerType[] = ['Adult (12+)', 'Child (4-11)', 'Infant (<4)'];

export const STATUS_CFG: Record<string, StatusConfig> = {
  PENDING: { label: 'Chờ xử lý', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'schedule' },
  CONFIRMED: { label: 'Đã xác nhận', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'check_circle' },
  CANCEL_REQUESTED: { label: 'Chờ Duyệt Hủy', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600 border-orange-200', icon: 'pending' },
  CANCELLED: { label: 'Đã hủy', dot: 'bg-red-400', badge: 'bg-red-50 text-red-600 border-red-200', icon: 'cancel' },
};

export const PAY_CFG: Record<string, BadgeConfig> = {
  PAID: { label: 'Đã thanh toán', badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'paid' },
  UNPAID: { label: 'Chưa thanh toán', badge: 'bg-orange-50 text-orange-600 border-orange-200', icon: 'pending_actions' },
  FAILED: { label: 'Thất bại', badge: 'bg-red-50 text-red-600 border-red-200', icon: 'money_off' },
  PROCESSING: { label: 'Đang xử lý', badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'sync' },
};

export const PAYMENT_METHOD_CFG: Record<string, BadgeConfig> = {
  PAYOS: { label: 'PayOS', badge: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'account_balance' },
  IN_STORE: { label: 'Tại quầy', badge: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'storefront' },
};

export const CONFIRMED_SOURCE_LABEL: Record<string, string> = {
  PAYOS_WEBHOOK: 'Webhook tự động',
  PAYOS_RETURN_SYNC: 'Xác nhận PayOS',
  PAYOS_MANUAL_RECONCILIATION: 'Đối soát thủ công',
  IN_STORE_CASH: 'Tiền mặt',
  IN_STORE_BANK_TRANSFER: 'Chuyển khoản',
  IN_STORE_CARD_POS: 'Quẹt thẻ POS',
  REFUND_MANUAL: 'Hoàn tiền thủ công',
  ADMIN_OVERRIDE: 'Admin override',
};

export const ASSISTED_STATUS_CFG: Record<AssistedDraftStatus, BadgeConfig> = {
  DRAFT: { label: 'Bản nháp', badge: 'bg-slate-50 text-slate-700 border-slate-200', icon: 'edit_note' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'approval_delegation' },
  NEEDS_REVISION: { label: 'Cần sửa', badge: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'rate_review' },
  REJECTED: { label: 'Từ chối', badge: 'bg-red-50 text-red-700 border-red-200', icon: 'block' },
  CONVERTED: { label: 'Đã tạo đơn', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'task_alt' },
};

export const SOURCE_CHANNEL_OPTIONS: DraftSelectOption[] = [
  { value: 'LIVE_CHAT', label: 'Live chat', description: 'Khách nhắn qua widget chat', icon: 'forum' },
  { value: 'ZALO', label: 'Zalo', description: 'Tư vấn qua Zalo OA hoặc cá nhân', icon: 'chat' },
  { value: 'FACEBOOK', label: 'Facebook', description: 'Inbox fanpage hoặc comment', icon: 'public' },
  { value: 'PHONE', label: 'Điện thoại', description: 'Khách gọi trực tiếp', icon: 'call' },
  { value: 'WEBSITE', label: 'Website', description: 'Khách để lại thông tin trên website', icon: 'language' },
  { value: 'WALK_IN', label: 'Khách trực tiếp', description: 'Khách đến văn phòng/quầy tư vấn', icon: 'storefront' },
  { value: 'PARTNER', label: 'Đối tác / CTV', description: 'Booking được chuyển từ đối tác bán hàng', icon: 'handshake' },
];

export const CONFIRMATION_CHANNEL_OPTIONS: DraftSelectOption[] = [
  { value: 'ZALO', label: 'Zalo / copy thủ công', description: 'Phù hợp khi đang tư vấn qua Zalo', icon: 'chat' },
  { value: 'EMAIL', label: 'Email tự động', description: 'Gửi xác nhận qua email khách', icon: 'mail' },
  { value: 'SMS', label: 'SMS', description: 'Gửi hoặc ghi nhận qua tin nhắn SMS', icon: 'sms' },
  { value: 'PHONE', label: 'Gọi điện', description: 'Xác nhận trực tiếp qua cuộc gọi', icon: 'call' },
  { value: 'MANUAL', label: 'Gửi thủ công', description: 'Nhân sự tự gửi qua kênh khác', icon: 'edit_note' },
  { value: 'NO_SEND', label: 'Không gửi ngay', description: 'Chỉ tạo booking, chưa gửi yêu cầu thanh toán', icon: 'notifications_off' },
];

export const DRAFT_FIELD_ORDER: (keyof AssistedDraftFormErrors)[] = [
  'customerName', 'customerEmail', 'customerPhone', 'tourId',
  'adultCount', 'childCount', 'infantCount', 'departureId',
  'customerIdentityNo', 'sourceChannel', 'confirmationChannel',
  'emailForTicket', 'packageId', 'voucherCode', 'specialRequests', 'internalNote',
];

export function getSelectOptionLabel(options: DraftSelectOption[], value: string, fallback = 'Chưa chọn') {
  return options.find(o => o.value === value)?.label ?? fallback;
}

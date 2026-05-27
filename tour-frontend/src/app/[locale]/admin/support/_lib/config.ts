import type { Kpi, TicketCategory, TicketStatus } from './types';

export const POLL_INTERVAL_MS = 10000;

export const OPEN_TICKET_STATUSES = new Set<TicketStatus>(['NEW', 'IN_PROGRESS']);

export const CATEGORY_KEYS: TicketCategory[] = ['booking', 'payment', 'reschedule', 'complaint', 'general'];

export const EMPTY_KPI: Kpi = {
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    open: 0,
    overdue: 0,
    avgFirstResponseMinutes: null,
};

export const AVATAR_COLORS = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-orange-400 to-rose-500',
    'from-teal-400 to-cyan-600',
    'from-emerald-400 to-green-600',
];

export const CAT: Record<TicketCategory, { label: string; color: string; dot: string; soft: string }> = {
    booking: { label: 'Đặt tour', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', soft: 'bg-purple-50 border-purple-100' },
    payment: { label: 'Thanh toán', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', soft: 'bg-emerald-50 border-emerald-100' },
    reschedule: { label: 'Đổi lịch', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', soft: 'bg-orange-50 border-orange-100' },
    complaint: { label: 'Khiếu nại', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', soft: 'bg-red-50 border-red-100' },
    general: { label: 'Câu hỏi chung', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', soft: 'bg-slate-50 border-slate-100' },
};

export const STS: Record<TicketStatus, { label: string; dot: string; text: string; tone: string; icon: string }> = {
    NEW: { label: 'Mới', dot: 'bg-blue-500', text: 'text-blue-700', tone: 'bg-blue-50 text-blue-700 border-blue-100', icon: 'fiber_new' },
    IN_PROGRESS: { label: 'Đang xử lý', dot: 'bg-amber-500', text: 'text-amber-700', tone: 'bg-amber-50 text-amber-700 border-amber-100', icon: 'pending_actions' },
    RESOLVED: { label: 'Đã giải quyết', dot: 'bg-slate-400', text: 'text-slate-500', tone: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'check_circle' },
};

export const BOOKING_STATUS: Record<string, { label: string; tone: string }> = {
    PENDING: { label: 'Chờ xử lý', tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
    CONFIRMED: { label: 'Đã xác nhận', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    CANCEL_REQUESTED: { label: 'Chờ duyệt hủy', tone: 'bg-orange-50 text-orange-700 ring-orange-100' },
    CANCELLED: { label: 'Đã hủy', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: string }> = {
    UNPAID: { label: 'Chưa thanh toán', tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
    PAID: { label: 'Đã thanh toán', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    FAILED: { label: 'Thanh toán lỗi', tone: 'bg-red-50 text-red-700 ring-red-100' },
};

export const statusOptions: { key: TicketStatus | 'ALL'; label: string; icon: string }[] = [
    { key: 'ALL', label: 'Tất cả', icon: 'inbox' },
    { key: 'NEW', label: 'Mới', icon: 'fiber_new' },
    { key: 'IN_PROGRESS', label: 'Đang xử lý', icon: 'pending_actions' },
    { key: 'RESOLVED', label: 'Đã giải quyết', icon: 'check_circle' },
];

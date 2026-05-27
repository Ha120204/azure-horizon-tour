import {
    BOOKING_STATUS,
    CATEGORY_KEYS,
    OPEN_TICKET_STATUSES,
    PAYMENT_STATUS,
} from './config';
import type {
    ApiErrorPayload,
    Kpi,
    Reply,
    ReplyResponse,
    StatsResponse,
    Ticket,
    TicketCategory,
    TicketResponse,
    TicketStatus,
    TicketView,
} from './types';

export function normalizeTicket(ticket: Ticket): Ticket {
    return { ...ticket, replies: Array.isArray(ticket.replies) ? ticket.replies : [] };
}

export function resolveTicket(payload: TicketResponse): Ticket | undefined {
    if ('data' in payload) return payload.data;
    return payload;
}

export function resolveReply(payload: ReplyResponse): Reply {
    if ('data' in payload && payload.data) return payload.data;
    return payload as Reply;
}

export function resolveStats(payload: StatsResponse): Partial<Kpi> {
    if ('data' in payload && payload.data) return payload.data;
    return payload as Partial<Kpi>;
}

export async function readApiError(res: Response, fallback: string) {
    try {
        const payload = (await res.json()) as ApiErrorPayload;
        if (Array.isArray(payload.message)) return payload.message.join(', ');
        if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
    } catch {
        // Keep the actionable fallback if the server response is not JSON.
    }
    return fallback;
}

const PAYMENT_MESSAGE_LABELS = [
    'Số tiền khách báo đã chuyển:',
    'Thời gian chuyển khoản:',
    'Mã giao dịch/nội dung chuyển khoản:',
    'Ngân hàng chuyển:',
    'Tên chủ tài khoản chuyển:',
    'Ghi chú của khách:',
    'Biên lai/ảnh xác nhận:',
];

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatSupportMessageLines(message: string) {
    const normalized = message.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    const withPaymentLineBreaks = PAYMENT_MESSAGE_LABELS.reduce(
        (value, label) => value.replace(new RegExp(`\\s+(${escapeRegExp(label)})`, 'g'), '\n$1'),
        normalized,
    );

    return withPaymentLineBreaks
        .split('\n')
        .map((line) => line.trim().replace(/^[-•]\s*/, ''))
        .filter(Boolean);
}

export function isOpenTicket(status?: TicketStatus) {
    return Boolean(status && OPEN_TICKET_STATUSES.has(status));
}

export function resolveInitialStatus(value: string | null): TicketStatus | 'ALL' {
    return value === 'NEW' || value === 'IN_PROGRESS' || value === 'RESOLVED' ? value : 'ALL';
}

export function resolveInitialCategory(value: string | null): TicketCategory | 'ALL' {
    return value && CATEGORY_KEYS.includes(value as TicketCategory) ? value as TicketCategory : 'ALL';
}

export function resolveInitialView(value: string | null): TicketView {
    return value === 'open' ? 'OPEN' : value === 'overdue' ? 'OVERDUE' : 'ALL';
}

export function getInitials(name: string) {
    const parts = name.trim().split(' ').filter(Boolean);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
}

export function fmtTime(iso: string) {
    const date = new Date(iso);
    const diff = (Date.now() - date.getTime()) / 60000;
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${Math.floor(diff)} phút trước`;
    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function fmtResponse(minutes: number | null) {
    if (minutes == null) return '—';
    if (minutes < 60) return `${minutes}p`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}p` : `${hours}h`;
}

export function fmtSyncTime(date: Date) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function fmtMoney(value: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

export function fmtDate(value?: string | null) {
    if (!value) return 'Chua co lich';
    return new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function resolveBookingStatus(status: string) {
    return BOOKING_STATUS[status] ?? { label: status, tone: 'bg-slate-100 text-slate-700 ring-slate-200' };
}

export function resolvePaymentStatus(status: string) {
    return PAYMENT_STATUS[status] ?? { label: status, tone: 'bg-slate-100 text-slate-700 ring-slate-200' };
}

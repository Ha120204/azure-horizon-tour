import type { Tone } from './types';

// ── Tone palette ──────────────────────────────────────────────────────────────
export const toneClass: Record<Tone, { icon: string; text: string; border: string; soft: string; dot: string }> = {
    amber:   { icon: 'bg-amber-50 text-amber-600',   text: 'text-amber-700',   border: 'border-amber-200',   soft: 'bg-amber-50/70',   dot: 'bg-amber-500' },
    orange:  { icon: 'bg-orange-50 text-orange-600',  text: 'text-orange-700',  border: 'border-orange-200',  soft: 'bg-orange-50/70',  dot: 'bg-orange-500' },
    blue:    { icon: 'bg-blue-50 text-blue-600',      text: 'text-blue-700',    border: 'border-blue-200',    soft: 'bg-blue-50/70',    dot: 'bg-blue-500' },
    teal:    { icon: 'bg-teal-50 text-teal-600',      text: 'text-teal-700',    border: 'border-teal-200',    soft: 'bg-teal-50/70',    dot: 'bg-teal-500' },
    violet:  { icon: 'bg-violet-50 text-violet-600',  text: 'text-violet-700',  border: 'border-violet-200',  soft: 'bg-violet-50/70',  dot: 'bg-violet-500' },
    slate:   { icon: 'bg-slate-100 text-slate-600',   text: 'text-slate-700',   border: 'border-slate-200',   soft: 'bg-slate-50',      dot: 'bg-slate-400' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600',text: 'text-emerald-700', border: 'border-emerald-200', soft: 'bg-emerald-50/70', dot: 'bg-emerald-500' },
    red:     { icon: 'bg-red-50 text-red-600',        text: 'text-red-700',     border: 'border-red-200',     soft: 'bg-red-50/70',     dot: 'bg-red-500' },
};

// ── Status badge maps ─────────────────────────────────────────────────────────
export const TOUR_STATUS: Record<string, { label: string; cls: string }> = {
    DRAFT:          { label: 'Nháp',       cls: 'bg-slate-100 text-slate-600' },
    PENDING_REVIEW: { label: 'Chờ duyệt',  cls: 'bg-amber-100 text-amber-700' },
    PUBLISHED:      { label: 'Đã đăng',    cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED:       { label: 'Từ chối',    cls: 'bg-red-100 text-red-600' },
};

export const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
    NEW:         { label: 'Mới',           cls: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'Đang xử lý',   cls: 'bg-amber-100 text-amber-700' },
    RESOLVED:    { label: 'Đã giải quyết',cls: 'bg-emerald-100 text-emerald-700' },
};

export const BOOKING_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
    PENDING:          { label: 'Chờ thanh toán', cls: 'text-amber-700',   dot: 'bg-amber-400' },
    CONFIRMED:        { label: 'Đã xác nhận',    cls: 'text-emerald-700', dot: 'bg-emerald-500' },
    CANCEL_REQUESTED: { label: 'Chờ duyệt hủy',  cls: 'text-orange-700',  dot: 'bg-orange-400' },
    CANCELLED:        { label: 'Đã hủy',          cls: 'text-red-600',     dot: 'bg-red-500' },
};

// ── Format helpers ────────────────────────────────────────────────────────────
export function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

export function formatDate(date: string) {
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(date: Date | null) {
    if (!date) return 'Chưa cập nhật';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

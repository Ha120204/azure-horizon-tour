import type { TourStatus } from './types';

export const formatCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

export const formatCurrencyCompact = (n: number): string => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ ₫`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr ₫`;
    return formatCurrency(n);
};

export const formatDate = (d: string) =>
    new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

export const getTourStatusBadge = (status: TourStatus): { label: string; cls: string; icon: string } => {
    switch (status) {
        case 'DRAFT': return { label: 'Nháp', cls: 'bg-surface-container text-on-surface-variant border border-outline-variant/20', icon: 'edit_note' };
        case 'PENDING_REVIEW': return { label: 'Chờ duyệt', cls: 'bg-amber-500/10 text-amber-700 border border-amber-300/40', icon: 'pending' };
        case 'PUBLISHED': return { label: 'Đã duyệt', cls: 'bg-emerald-500/10 text-emerald-700 border border-emerald-300/40', icon: 'check_circle' };
        case 'REJECTED': return { label: 'Bị từ chối', cls: 'bg-error/10 text-error border border-error/20', icon: 'cancel' };
        case 'COMPLETED': return { label: 'Đã kết thúc', cls: 'bg-slate-500/10 text-slate-700 border border-slate-300/40', icon: 'history' };
    }
};

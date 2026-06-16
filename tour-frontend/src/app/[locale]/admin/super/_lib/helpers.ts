import type { OverviewData, Tone } from './types';

export const toneStyles: Record<Tone, { soft: string; text: string; border: string; icon: string; badge: string }> = {
    blue: { soft: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: 'bg-blue-50 text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
    amber: { soft: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'bg-amber-50 text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
    red: { soft: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', icon: 'bg-red-50 text-red-600', badge: 'bg-red-50 text-red-600 border-red-100' },
    emerald: { soft: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    violet: { soft: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100', icon: 'bg-violet-50 text-violet-600', badge: 'bg-violet-50 text-violet-700 border-violet-100' },
};

export const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export const formatShortVND = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    if (value >= 1_000_000) return `${Math.round(value / 1_000_000).toLocaleString('vi-VN')} triệu`;
    return formatVND(value);
};

export const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export const getStatusMeta = (status: OverviewData['status']) => {
    if (status === 'critical') return { label: 'Cần xử lý ngay', tone: 'red' as Tone };
    if (status === 'warning') return { label: 'Cần chú ý', tone: 'amber' as Tone };
    return { label: 'Ổn định', tone: 'emerald' as Tone };
};

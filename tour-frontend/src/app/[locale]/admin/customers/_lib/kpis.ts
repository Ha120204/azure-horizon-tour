import type { Stats } from './types';

export interface CustomerKpiItem {
    icon: string;
    label: string;
    value: number | string;
    color: string;
    iconColor: string;
    trend: string | null;
}

export function buildCustomerKpis(stats: Stats | null): CustomerKpiItem[] {
    return [
        {
            icon: 'group',
            label: 'Tổng Khách Hàng',
            value: stats?.totalUsers ?? '—',
            color: 'from-blue-500/20 to-blue-600/5',
            iconColor: 'text-blue-600 bg-blue-500/10',
            trend: null,
        },
        {
            icon: 'verified_user',
            label: 'Đang Hoạt Động',
            value: stats?.activeUsers ?? '—',
            color: 'from-emerald-500/20 to-emerald-600/5',
            iconColor: 'text-emerald-600 bg-emerald-500/10',
            trend: stats ? `${Math.round(((stats.activeUsers ?? 0) / (stats.totalUsers || 1)) * 100)}%` : null,
        },
        {
            icon: 'person_add',
            label: 'Mới Tháng Này',
            value: stats?.newThisMonth ?? '—',
            color: 'from-violet-500/20 to-violet-600/5',
            iconColor: 'text-violet-600 bg-violet-500/10',
            trend: null,
        },
        {
            icon: 'block',
            label: 'Đã Vô Hiệu',
            value: stats ? (Number(stats.totalUsers || 0) - Number(stats.activeUsers || 0)) : '—',
            color: 'from-red-500/20 to-red-600/5',
            iconColor: 'text-red-500 bg-red-500/10',
            trend: null,
        },
    ];
}

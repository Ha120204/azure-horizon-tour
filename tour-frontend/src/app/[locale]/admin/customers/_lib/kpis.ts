import type { Stats } from './types';

export interface CustomerKpiItem {
    icon: string;
    label: string;
    value: number | string;
    helper: string | null;
    iconColor: string;
}

export function buildCustomerKpis(stats: Stats | null): CustomerKpiItem[] {
    const totalUsers = stats?.totalUsers ?? 0;
    const activeUsers = stats?.activeUsers ?? 0;
    const inactiveUsers = Math.max(totalUsers - activeUsers, 0);
    const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
    const customersWithBookings = stats?.customersWithBookings ?? 0;
    const bookingRate = totalUsers > 0 ? Math.round((customersWithBookings / totalUsers) * 100) : 0;

    return [
        {
            icon: 'group',
            label: 'Tổng khách hàng',
            value: stats?.totalUsers ?? '—',
            helper: stats ? `${inactiveUsers} vô hiệu` : null,
            iconColor: 'text-primary bg-primary/10',
        },
        {
            icon: 'verified_user',
            label: 'Đang hoạt động',
            value: stats?.activeUsers ?? '—',
            helper: stats ? `${activeRate}% trong tổng khách` : null,
            iconColor: 'text-emerald-600 bg-emerald-500/10',
        },
        {
            icon: 'person_add',
            label: 'Mới tháng này',
            value: stats?.newThisMonth ?? '—',
            helper: 'Tài khoản đăng ký mới',
            iconColor: 'text-indigo-600 bg-indigo-500/10',
        },
        {
            icon: 'luggage',
            label: 'Đã đặt tour',
            value: stats?.customersWithBookings ?? '—',
            helper: stats ? `${bookingRate}% có lịch sử booking` : null,
            iconColor: 'text-secondary bg-secondary/10',
        },
    ];
}

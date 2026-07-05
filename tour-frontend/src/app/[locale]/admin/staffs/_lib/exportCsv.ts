import { roleConfig } from './config';
import { formatDate } from './helpers';
import type { User } from './types';

const STAFF_EXPORT_HEADERS = [
    'ID',
    'Họ tên',
    'Email',
    'Số điện thoại',
    'Vai trò',
    'Ngày tạo',
    'Trạng thái',
];

const quoteCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function exportStaffCsv(users: User[]): number {
    if (users.length === 0) return 0;

    const rows = users.map(user => [
        user.id,
        user.fullName || '',
        user.email,
        user.phone || '',
        roleConfig[user.role]?.label ?? user.role,
        formatDate(user.createdAt),
        user.status === 'Active' ? 'Hoạt động' : 'Đã vô hiệu hóa',
    ]);

    const csv = [
        STAFF_EXPORT_HEADERS.map(quoteCsv).join(','),
        ...rows.map(row => row.map(quoteCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azure-horizon-staff-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    return users.length;
}

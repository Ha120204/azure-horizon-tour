import { formatCurrency, formatDate } from './helpers';
import type { User } from './types';

const CUSTOMER_EXPORT_HEADERS = [
    'ID',
    'Họ tên',
    'Email',
    'Số điện thoại',
    'Ngày tham gia',
    'Đơn đặt',
    'Tổng chi tiêu',
    'Lần đặt gần nhất',
    'Trạng thái',
];

const quoteCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function exportCustomersCsv(customers: User[]): number {
    if (customers.length === 0) return 0;

    const rows = customers.map(customer => [
        customer.id,
        customer.fullName || '',
        customer.email,
        customer.phone || '',
        formatDate(customer.createdAt),
        customer.bookingCount,
        customer.totalSpent && customer.totalSpent > 0 ? formatCurrency(customer.totalSpent) : '',
        customer.lastBookingAt ? formatDate(customer.lastBookingAt) : '',
        customer.status === 'Active' ? 'Hoạt động' : 'Đã khóa',
    ]);

    const csv = [
        CUSTOMER_EXPORT_HEADERS.map(quoteCsv).join(','),
        ...rows.map(row => row.map(quoteCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azure-horizon-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    return customers.length;
}

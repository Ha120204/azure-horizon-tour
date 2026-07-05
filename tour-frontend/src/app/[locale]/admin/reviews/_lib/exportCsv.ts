import { fmtDate } from './helpers';
import type { Review } from './types';

const REVIEW_EXPORT_HEADERS = [
    'ID',
    'Khách hàng',
    'Email',
    'Tour',
    'Số sao',
    'Nội dung',
    'Đã phản hồi',
    'Trạng thái',
    'Ngày đánh giá',
];

const quoteCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function exportReviewsCsv(reviews: Review[]): number {
    if (reviews.length === 0) return 0;

    const rows = reviews.map(review => [
        review.id,
        review.user.fullName,
        review.user.email,
        review.tour.name,
        review.rating,
        review.content,
        review.adminReply?.trim() ? 'Có' : 'Chưa',
        review.isHidden ? 'Đang ẩn' : 'Hiển thị',
        fmtDate(review.createdAt),
    ]);

    const csv = [
        REVIEW_EXPORT_HEADERS.map(quoteCsv).join(','),
        ...rows.map(row => row.map(quoteCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azure-horizon-reviews-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    return reviews.length;
}

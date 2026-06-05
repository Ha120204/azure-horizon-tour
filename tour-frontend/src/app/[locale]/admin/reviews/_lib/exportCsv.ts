import { fmtDate } from './helpers';
import type { Review } from './types';

const REVIEW_EXPORT_HEADERS = [
    'ID',
    'Khach hang',
    'Email',
    'Tour',
    'Ma tour',
    'So sao',
    'Trang thai phan hoi',
    'Trang thai hien thi',
    'Noi dung',
    'Phan hoi admin',
    'Ngay tao',
];

const quoteCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function exportReviewsCsv(reviews: Review[]): number {
    if (reviews.length === 0) return 0;

    const rows = reviews.map((review) => [
        review.id,
        review.user.fullName,
        review.user.email,
        review.tour.name,
        review.tour.tourCode,
        review.rating,
        review.adminReply?.trim() ? 'Da phan hoi' : 'Chua phan hoi',
        review.isHidden ? 'Dang an' : 'Dang hien thi',
        review.content,
        review.adminReply?.trim() ?? '',
        fmtDate(review.createdAt),
    ]);

    const csv = [
        REVIEW_EXPORT_HEADERS.map(quoteCsv).join(','),
        ...rows.map((row) => row.map(quoteCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azure-horizon-reviews-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    return reviews.length;
}

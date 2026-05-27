import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { Tour } from './types';

const TOUR_EXPORT_HEADERS = [
    'ID',
    'Tên Tour',
    'Điểm Đến',
    'Giá (VNĐ)',
    'Ngày KH',
    'Thời Lượng',
    'Ghế Còn',
    'Rating',
    'Loại',
    'Trạng Thái',
];

const TOUR_EXPORT_STATUS_LABEL: Record<string, string> = {
    PUBLISHED: 'Đã duyệt',
    PENDING_REVIEW: 'Chờ duyệt',
    DRAFT: 'Nháp',
    REJECTED: 'Bị từ chối',
    COMPLETED: 'Đã kết thúc',
};

const quoteCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

export async function exportToursCsv(): Promise<number> {
    const res = await fetchWithAuth(`${API_BASE_URL}/tour?limit=9999&sortBy=recommended`);
    const json = await res.json();
    const tours: Tour[] = json.data ?? [];
    const rows = tours.map(tour => [
        tour.id,
        quoteCsv(tour.name),
        quoteCsv(tour.destination?.name ?? ''),
        tour.price,
        tour.startDate ? new Date(tour.startDate).toLocaleDateString('vi-VN') : '',
        tour.duration ?? '',
        tour.availableSeats,
        tour.averageRating > 0 ? tour.averageRating.toFixed(1) : '0',
        tour.tourType ?? '',
        TOUR_EXPORT_STATUS_LABEL[tour.status] ?? tour.status,
    ]);
    const csv = [TOUR_EXPORT_HEADERS.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azure-horizon-tours-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    return tours.length;
}

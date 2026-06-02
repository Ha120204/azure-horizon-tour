import { formatCurrencyCompact } from './helpers';
import type { TourKpiItem, TourStats, TourStatus } from './types';

type KpiFilterStatus = Extract<TourStatus, 'PENDING_REVIEW' | 'REJECTED' | 'DRAFT'>;

interface BuildTourKpisOptions {
    isAdmin: boolean;
    isStaff: boolean;
    filterStatus: string;
    tourStats: TourStats;
    onStatusToggle: (status: KpiFilterStatus, activateTab?: boolean) => void;
}

export function buildTourKpis({
    isAdmin,
    isStaff,
    filterStatus,
    tourStats,
    onStatusToggle,
}: BuildTourKpisOptions): TourKpiItem[] {
    const totalTours = isAdmin ? tourStats.total : tourStats.totalVisible;
    const pendingCount = tourStats.pending;
    const rejectedCount = tourStats.rejected;
    const draftCount = tourStats.draft;
    const staffPendingCount = tourStats.pending;

    return [
        {
            icon: 'travel_explore',
            label: 'Tổng Số Tour',
            value: String(totalTours),
            unit: null,
            color: 'bg-primary/10 text-primary',
            highlight: false,
            onClick: null,
        },
        {
            icon: 'check_circle',
            label: 'Đang Hoạt Động',
            value: tourStats.loaded ? String(tourStats.active) : '…',
            unit: null,
            color: 'bg-tertiary/10 text-tertiary',
            highlight: false,
            onClick: null,
        },
        {
            icon: 'airline_seat_recline_normal',
            label: 'Ghế Còn Trống',
            value: tourStats.loaded ? String(tourStats.totalSeats) : '…',
            unit: null,
            subtitle: tourStats.loaded && tourStats.active > 0 ? `trên ${tourStats.active} tour đang hoạt động` : null,
            color: 'bg-secondary/10 text-secondary',
            highlight: false,
            onClick: null,
        },
        {
            icon: 'payments',
            label: 'Giá Trung Bình',
            value: tourStats.loaded ? formatCurrencyCompact(tourStats.avgPrice) : '…',
            unit: null,
            subtitle: tourStats.loaded && totalTours > 0 ? `trên ${totalTours} tour` : null,
            color: 'bg-amber-500/10 text-amber-600',
            highlight: false,
            onClick: null,
        },
        ...(isAdmin ? [
            {
                icon: 'pending_actions',
                label: 'Chờ Duyệt',
                value: String(pendingCount),
                unit: null,
                color: pendingCount > 0 ? 'bg-amber-500/15 text-amber-700' : 'bg-surface-container text-on-surface-variant',
                highlight: pendingCount > 0,
                onClick: (pendingCount > 0 || filterStatus === 'PENDING_REVIEW')
                    ? () => onStatusToggle('PENDING_REVIEW', true)
                    : null,
            },
            {
                icon: 'cancel',
                label: 'Bị Từ Chối',
                value: String(rejectedCount),
                unit: null,
                color: rejectedCount > 0 ? 'bg-error/10 text-error' : 'bg-surface-container text-on-surface-variant',
                highlight: false,
                onClick: (rejectedCount > 0 || filterStatus === 'REJECTED')
                    ? () => onStatusToggle('REJECTED', true)
                    : null,
            },
        ] : []),
        ...(isStaff ? [
            {
                icon: 'edit_note',
                label: 'Bản Nháp',
                value: String(draftCount),
                unit: null,
                color: 'bg-surface-container text-on-surface-variant',
                highlight: draftCount > 0,
                onClick: (filterStatus === 'DRAFT' || draftCount > 0)
                    ? () => onStatusToggle('DRAFT')
                    : null,
            },
            {
                icon: 'pending',
                label: 'Chờ Duyệt',
                value: String(staffPendingCount),
                unit: null,
                color: 'bg-amber-500/10 text-amber-700',
                highlight: staffPendingCount > 0,
                onClick: (filterStatus === 'PENDING_REVIEW' || staffPendingCount > 0)
                    ? () => onStatusToggle('PENDING_REVIEW', true)
                    : null,
            },
        ] : []),
    ];
}

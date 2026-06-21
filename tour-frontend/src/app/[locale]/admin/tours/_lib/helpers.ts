import type { Tour, TourStatus } from './types';

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

// ── Gợi ý tour nên đặt nổi bật ──────────────────────────────────────────────
// Điểm = số chỗ đã đặt (ưu tiên độ phổ biến) + rating Bayesian (tránh tour 1
// review 5★ thắng tour nhiều review điểm cao). Prior: trung bình 4.0★, trọng số 5.
const RATING_PRIOR_MEAN = 4.0;
const RATING_PRIOR_WEIGHT = 5;

export const getFeaturedSuggestionScore = (tour: Tour): number => {
    const booked = tour.bookedSeats ?? 0;
    const reviews = tour.reviewCount ?? 0;
    const rating = tour.averageRating ?? 0;
    const bayesianRating =
        (RATING_PRIOR_WEIGHT * RATING_PRIOR_MEAN + reviews * rating) /
        (RATING_PRIOR_WEIGHT + reviews);
    return booked + bayesianRating * 10;
};

// Trả về id của tối đa `max` tour PUBLISHED chưa nổi bật nhưng có điểm cao nhất —
// dùng để hiện badge gợi ý "nên bật nổi bật".
export const getSuggestedFeaturedIds = (tours: Tour[], max = 3): Set<number> => {
    const hasSignal = (t: Tour) => (t.bookedSeats ?? 0) > 0 || (t.reviewCount ?? 0) > 0;
    const candidates = tours
        .filter(t => t.status === 'PUBLISHED' && !t.isFeatured && hasSignal(t))
        .sort((a, b) => getFeaturedSuggestionScore(b) - getFeaturedSuggestionScore(a))
        .slice(0, max);
    return new Set(candidates.map(t => t.id));
};

const normalizeLooseText = (value?: string | null): string =>
    (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .trim();

export const getTourReviewMissingItems = (tour: Tour): string[] => {
    const missing: string[] = [];
    const destinationName = normalizeLooseText(tour.destination?.name);
    const hasDestination = Boolean(tour.destinationId ?? tour.destination?.id)
        && destinationName !== 'chua xac dinh';
    const hasStartDate = Boolean(tour.startDate) && !Number.isNaN(new Date(tour.startDate).getTime());
    const hasValidDeparture = Array.isArray(tour.departures) && tour.departures.some(departure =>
        Boolean(departure.departureDate)
        && !Number.isNaN(new Date(departure.departureDate).getTime())
        && Number(departure.availableSeats ?? 0) > 0
    );
    // API trả về packages đã lọc isActive:true, nên chỉ cần kiểm tra length
    const hasActivePackage = Array.isArray(tour.packages) && tour.packages.length > 0;

    if (!tour.name?.trim()) missing.push('Tên tour');
    if (!tour.description?.trim()) missing.push('Mô tả');
    if (tour.price == null || Number(tour.price) <= 0) missing.push('Giá');
    if (!hasDestination) missing.push('Điểm đến');
    if (!tour.duration?.trim()) missing.push('Thời lượng');
    if (tour.availableSeats == null || Number(tour.availableSeats) < 1) missing.push('Số ghế');
    if (!hasStartDate) missing.push('Ngày khởi hành');
    if (!hasValidDeparture) missing.push('Ít nhất 1 chuyến khởi hành');
    if (!hasActivePackage) missing.push('Ít nhất 1 gói dịch vụ');

    return [...new Set(missing)];
};

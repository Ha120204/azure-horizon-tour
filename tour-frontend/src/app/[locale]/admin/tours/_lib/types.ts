export type TourStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'COMPLETED';
export type TourTab = 'active' | 'trash';

export interface Meta {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage?: number;
}

export interface Tour {
    id: number;
    name: string;
    imageUrl: string;
    price: number;
    availableSeats: number;
    duration: string;
    tourType: string;
    averageRating: number;
    startDate: string;
    destination: { id: number; name: string };
    status: TourStatus;
    reviewNote?: string;
    createdById?: number;
    createdBy?: { id: number; fullName: string };
}

export interface TrashedTour extends Tour {
    deletedAt: string | null;
    bookingCount?: number;
    canPermanentDelete?: boolean;
}

export interface Destination {
    id: number;
    name: string;
    travelScope?: 'DOMESTIC' | 'INTERNATIONAL';
    countryCode?: string | null;
}

export interface ToastState {
    message: string;
    type: 'success' | 'error';
}

export type ModalMode = 'create' | 'edit' | null;

export interface TourStats {
    totalVisible: number;
    total: number;
    published: number;
    draft: number;
    pending: number;
    rejected: number;
    completed: number;
    active: number;
    totalSeats: number;
    avgPrice: number;
    loaded: boolean;
}

export interface TourKpiItem {
    icon: string;
    label: string;
    value: string;
    unit: string | null;
    color: string;
    highlight: boolean;
    onClick: (() => void) | null;
}

export type TourReviewAction = 'approve' | 'reject';

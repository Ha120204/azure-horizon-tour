export interface User {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    createdAt: string;
    deletedAt: string | null;
    status: string;
    bookingCount: number;
    reviewCount: number;
    totalSpent?: number;
    lastBookingAt?: string | null;
    dob?: string | null;
    gender?: string | null;
    recentBookings?: {
        id: number;
        bookingCode: string;
        totalPrice: number;
        status: string;
        createdAt: string;
        tour: { name: string };
    }[];
}

export type CustomerSortKey = 'fullName' | 'createdAt' | 'bookingCount' | 'reviewCount' | 'status';
export type SortDirection = 'asc' | 'desc';
export type CustomerBookingFilter = '' | 'has_bookings' | 'no_bookings';
export type CustomerSegmentFilter = '' | 'new_7_days' | 'new_30_days' | 'has_phone' | 'missing_phone';

export interface Stats {
    totalUsers: number;
    activeUsers: number;
    newThisMonth: number;
    customersWithBookings?: number;
    staffAndAdmin: number;
}

export interface Meta {
    totalItems: number;
    totalPages: number;
    currentPage: number;
}

export interface CustomerListPayload {
    users: User[];
    meta?: Meta;
}

export interface ProfilePayload {
    role?: string;
    data?: {
        role?: string;
    };
}

export interface ToastState {
    message: string;
    type: 'success' | 'error';
}

export interface CustomerEditForm {
    fullName: string;
    phone: string;
    dob: string;
    gender: string;
}

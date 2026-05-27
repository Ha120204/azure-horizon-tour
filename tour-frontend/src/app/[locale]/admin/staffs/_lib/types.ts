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

export interface Stats {
    totalUsers: number;
    activeUsers: number;
    newThisMonth: number;
    staffAndAdmin: number;
    staffActive: number;
    staffNewThisMonth: number;
}

export interface Meta {
    totalItems: number;
    totalPages: number;
    currentPage: number;
}

export interface ToastState {
    message: string;
    type: 'success' | 'error';
}

export interface StaffKpiItem {
    icon: string;
    label: string;
    value: number;
    helper: string;
    color: string;
}

export interface StaffCreateForm {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: string;
    sendEmail: boolean;
}

export interface StaffEditForm {
    fullName: string;
    phone: string;
    dob: string;
    gender: string;
}

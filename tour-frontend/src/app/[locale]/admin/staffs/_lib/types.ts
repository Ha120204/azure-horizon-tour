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
    reviewCount: number;
    dob?: string | null;
    gender?: string | null;
}

export interface Stats {
    scopeRole?: string;
    totalUsers: number;
    activeUsers: number;
    newThisMonth: number;
}

export type StaffSortKey = 'fullName' | 'createdAt' | 'status';
export type SortDirection = 'asc' | 'desc';
export type BulkStatusAction = 'active' | 'deactivated';

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

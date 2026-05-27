export interface AdminProfile {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    createdAt: string;
    dob?: string | null;
    gender?: string | null;
}

export interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface ProfileInfoForm {
    fullName: string;
    phone: string;
    dob: string;
    gender: string;
}

export interface PasswordForm {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface PasswordVisibilityState {
    current: boolean;
    new: boolean;
    confirm: boolean;
}

export interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

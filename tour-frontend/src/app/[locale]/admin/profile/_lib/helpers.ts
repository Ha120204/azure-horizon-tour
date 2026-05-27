import type { PasswordStrength } from './types';

export const getInitials = (name?: string | null) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
};

export const formatDateToInputValue = (d: string | null | undefined) => {
    if (!d) return '';
    try { return new Date(d).toISOString().split('T')[0]; }
    catch { return ''; }
};

export const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

export function getPasswordStrength(password: string): PasswordStrength {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;
    if (score <= 1) return { score, label: 'Rất yếu', color: 'bg-red-500' };
    if (score === 2) return { score, label: 'Yếu', color: 'bg-orange-400' };
    if (score === 3) return { score, label: 'Trung bình', color: 'bg-yellow-400' };
    if (score === 4) return { score, label: 'Mạnh', color: 'bg-emerald-500' };
    return { score, label: 'Rất mạnh', color: 'bg-blue-500' };
}

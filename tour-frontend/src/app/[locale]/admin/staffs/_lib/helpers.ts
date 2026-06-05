export const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatDateToISOInputValue = (d: string | null | undefined) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

export const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export const getApiMessage = (payload: unknown, fallback: string) => {
    if (payload && typeof payload === 'object' && 'message' in payload) {
        const message = (payload as { message?: unknown }).message;
        return typeof message === 'string' ? message : fallback;
    }
    return fallback;
};

export const getProfileRole = (payload: unknown) => {
    const profile = payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data?: unknown }).data
        : payload;
    if (profile && typeof profile === 'object' && 'role' in profile) {
        const role = (profile as { role?: unknown }).role;
        return typeof role === 'string' ? role : '';
    }
    return '';
};

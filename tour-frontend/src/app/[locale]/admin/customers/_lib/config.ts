export const statusConfig: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    Active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-500/10', label: 'Hoạt động' },
    Deactivated: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-500/10', label: 'Đã khóa' },
};

export const avatarGradients = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-teal-400 to-cyan-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-green-600',
];

export const bookingStatusStyle: Record<string, { bg: string; text: string; label: string }> = {
    CONFIRMED: { bg: 'bg-emerald-500/10', text: 'text-emerald-700', label: 'Xác nhận' },
    PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-700', label: 'Chờ duyệt' },
    CANCELLED: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Đã hủy' },
};

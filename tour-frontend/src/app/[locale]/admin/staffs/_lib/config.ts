export const roleConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    SUPER_ADMIN: {
        label: 'Super Admin',
        bg: 'bg-gradient-to-r from-amber-500/15 to-orange-500/15',
        text: 'text-amber-700',
        icon: 'shield_with_heart',
    },
    ADMIN: {
        label: 'Admin',
        bg: 'bg-gradient-to-r from-violet-500/15 to-purple-500/15',
        text: 'text-violet-700',
        icon: 'admin_panel_settings',
    },
    STAFF: {
        label: 'Staff',
        bg: 'bg-gradient-to-r from-sky-500/15 to-blue-500/15',
        text: 'text-sky-700',
        icon: 'support_agent',
    },
    CUSTOMER: {
        label: 'Customer',
        bg: 'bg-surface-container',
        text: 'text-on-surface-variant',
        icon: 'person',
    },
};

export const statusConfig: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    Active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-500/10', label: 'Hoạt động' },
    Deactivated: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-500/10', label: 'Đã vô hiệu hóa' },
};

export const bookingStatusStyle: Record<string, { className: string; label: string }> = {
    CONFIRMED: { className: 'bg-emerald-500/10 text-emerald-700', label: 'Đã xác nhận' },
    PENDING: { className: 'bg-amber-500/10 text-amber-700', label: 'Chờ xử lý' },
    CANCELLED: { className: 'bg-red-500/10 text-red-600', label: 'Đã hủy' },
};

export const actionTooltipClass =
    'absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-on-surface text-surface text-[11px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 transition-opacity pointer-events-none shadow-lg';

export const roleConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    SUPER_ADMIN: {
        label: 'Siêu quản trị viên',
        bg: 'bg-gradient-to-r from-amber-500/15 to-orange-500/15',
        text: 'text-amber-700',
        icon: 'shield_with_heart',
    },
    ADMIN: {
        label: 'Quản trị viên',
        bg: 'bg-gradient-to-r from-violet-500/15 to-purple-500/15',
        text: 'text-violet-700',
        icon: 'admin_panel_settings',
    },
    STAFF: {
        label: 'Nhân viên',
        bg: 'bg-gradient-to-r from-sky-500/15 to-blue-500/15',
        text: 'text-sky-700',
        icon: 'support_agent',
    },
    CUSTOMER: {
        label: 'Khách hàng',
        bg: 'bg-surface-container',
        text: 'text-on-surface-variant',
        icon: 'person',
    },
};

export const statusConfig: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    Active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-500/10', label: 'Hoạt động' },
    Deactivated: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-500/10', label: 'Đã vô hiệu hóa' },
};

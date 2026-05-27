export const roleConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    SUPER_ADMIN: { label: 'Super Admin', color: 'text-amber-700', bg: 'bg-amber-500/10 border-amber-200', icon: 'shield_with_heart' },
    ADMIN:       { label: 'Admin',       color: 'text-violet-700', bg: 'bg-violet-500/10 border-violet-200', icon: 'admin_panel_settings' },
    STAFF:       { label: 'Staff',       color: 'text-sky-700',    bg: 'bg-sky-500/10 border-sky-200',    icon: 'support_agent' },
};

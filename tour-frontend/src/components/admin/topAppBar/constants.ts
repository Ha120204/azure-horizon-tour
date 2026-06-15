import type { AdminRole, RoleAction, CommandGroup, NotifType, TabKey } from './types';


// ── Role Helpers ──────────────────────────────────────────────────────────────
export const ALL_ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];
export const ADMIN_AND_SUPER_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN'];

export function isAdminRole(role: string): role is AdminRole {
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'STAFF';
}

export function canAccessRole(userRole: string, roles: AdminRole[]) {
    return isAdminRole(userRole) && roles.includes(userRole);
}

export function filterActionsByRole(actions: RoleAction[], userRole: string) {
    return actions.filter(action => canAccessRole(userRole, action.roles));
}

export function getInitials(name: string) {
    const parts = name.trim().split(' ').filter(Boolean);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
}

// ── Command Groups ────────────────────────────────────────────────────────────
export const COMMAND_GROUPS: CommandGroup[] = [
    {
        title: 'Tổng quan',
        actions: [
            { label: 'Dashboard', desc: 'KPI & số liệu hôm nay', icon: 'space_dashboard', href: '/admin', color: 'text-blue-600', roles: ALL_ADMIN_ROLES },
            { label: 'Thống kê & Báo cáo', desc: 'Doanh thu, biểu đồ, phân tích', icon: 'bar_chart_4_bars', href: '/admin/statistics', color: 'text-indigo-500', roles: ADMIN_AND_SUPER_ROLES },
            { label: 'Nhật ký hệ thống', desc: 'Activity logs & audit trail', icon: 'history', href: '/admin/logs', color: 'text-slate-500', roles: ['SUPER_ADMIN', 'ADMIN'] },
        ],
    },
    {
        title: 'Tour & Nội dung',
        actions: [
            { label: 'Thêm Tour mới', desc: 'Tạo & xuất bản tour du lịch', icon: 'add_circle', href: '/admin/tours', color: 'text-blue-500', roles: ALL_ADMIN_ROLES },
            { label: 'Quản lý Tour', desc: 'Sửa, ẩn, xoá, phục hồi tour', icon: 'explore', href: '/admin/tours', color: 'text-cyan-500', roles: ALL_ADMIN_ROLES },
            { label: 'Bài viết & Blog', desc: 'Quản lý nội dung & SEO', icon: 'article', href: '/admin/articles', color: 'text-teal-600', roles: ALL_ADMIN_ROLES },
        ],
    },
    {
        title: 'Giao dịch',
        actions: [
            { label: 'Đơn đặt tour (Booking)', desc: 'Xác nhận, hủy, theo dõi', icon: 'event_note', href: '/admin/bookings', color: 'text-emerald-500', roles: ALL_ADMIN_ROLES },
            { label: 'Quản lý Voucher', desc: 'Mã giảm giá, hạn sử dụng', icon: 'local_offer', href: '/admin/vouchers', color: 'text-amber-500', roles: ALL_ADMIN_ROLES },
            { label: 'Hỗ trợ khách hàng', desc: 'Ticket, phản hồi, trạng thái xử lý', icon: 'support_agent', href: '/admin/support', color: 'text-cyan-600', roles: ALL_ADMIN_ROLES },
        ],
    },
    {
        title: 'Người dùng',
        actions: [
            { label: 'Khách hàng', desc: 'Lịch sử, hạng thành viên', icon: 'people', href: '/admin/customers', color: 'text-violet-500', roles: ALL_ADMIN_ROLES },
            { label: 'Kiểm duyệt Nhận xét', desc: 'Duyệt, ẩn, phản hồi review', icon: 'reviews', href: '/admin/reviews', color: 'text-purple-500', roles: ADMIN_AND_SUPER_ROLES },
            { label: 'Quản lý nhân sự', desc: 'Tài khoản quản trị viên và nhân viên nội bộ', icon: 'manage_accounts', href: '/admin/staffs', color: 'text-rose-500', roles: ['SUPER_ADMIN'] },
            { label: 'Quản lý nhân viên', desc: 'Tài khoản nhân viên nội bộ', icon: 'badge', href: '/admin/staffs', color: 'text-rose-500', roles: ['ADMIN'] },
        ],
    },
    {
        title: 'Quản trị',
        actions: [
            { label: 'Cài đặt hệ thống', desc: 'Cấu hình vận hành nền tảng', icon: 'settings', href: '/admin/settings', color: 'text-slate-600', roles: ['SUPER_ADMIN', 'ADMIN'] },
            { label: 'Tiếp thị', desc: 'Người đăng ký và chiến dịch email', icon: 'campaign', href: '/admin/marketing', color: 'text-orange-500', roles: ADMIN_AND_SUPER_ROLES },
            { label: 'Tổng quan cấp cao', desc: 'Rủi ro hệ thống và quyền cấp cao', icon: 'admin_panel_settings', href: '/admin/super', color: 'text-amber-600', roles: ['SUPER_ADMIN'] },
        ],
    },
];

// ── Page Metadata ─────────────────────────────────────────────────────────────
const PAGE_META: Record<string, { title: string; icon: string; subtitle: string }> = {
    '/admin/super': { title: 'Tổng quan cấp cao', icon: 'admin_panel_settings', subtitle: 'Giám sát quyền lực hệ thống, rủi ro và cấu hình trọng yếu' },
    '/admin': { title: 'Tổng quan', icon: 'dashboard', subtitle: 'Xem tổng quan hoạt động hệ thống' },
    '/admin/statistics': { title: 'Thống kê', icon: 'bar_chart', subtitle: 'Phân tích & báo cáo chi tiết' },
    '/admin/tours': { title: 'Quản lý Tour', icon: 'explore', subtitle: 'Thêm, sửa và quản lý tour du lịch' },
    '/admin/bookings': { title: 'Đơn đặt', icon: 'event_note', subtitle: 'Quản lý tất cả các đơn đặt tour' },
    '/admin/customers': { title: 'Khách hàng', icon: 'group', subtitle: 'Danh sách và thông tin khách hàng' },
    '/admin/staffs': { title: 'Nhân viên', icon: 'badge', subtitle: 'Quản lý tài khoản nhân viên nội bộ' },
    '/admin/vouchers': { title: 'Mã giảm giá', icon: 'confirmation_number', subtitle: 'Tạo và quản lý chương trình khuyến mãi' },
    '/admin/marketing': { title: 'Tiếp thị', icon: 'campaign', subtitle: 'Quản lý người đăng ký và chiến dịch email' },
    '/admin/articles': { title: 'Bài viết', icon: 'article', subtitle: 'Quản lý nội dung & bài đăng blog' },
    '/admin/reviews': { title: 'Đánh giá', icon: 'reviews', subtitle: 'Kiểm duyệt nhận xét từ khách hàng' },
    '/admin/profile': { title: 'Hồ sơ cá nhân', icon: 'manage_accounts', subtitle: 'Quản lý thông tin tài khoản & bảo mật' },
    '/admin/settings': { title: 'Cài đặt hệ thống', icon: 'settings', subtitle: 'Cấu hình và trạng thái vận hành của Azure Horizon' },
    '/admin/support': { title: 'Hỗ trợ khách hàng', icon: 'support_agent', subtitle: 'Tiếp nhận và xử lý yêu cầu hỗ trợ từ khách hàng' },
};

export function getPageMeta(pathname: string) {
    const clean = pathname?.replace(/^\/(en|vi)/, '') ?? '';
    if (PAGE_META[clean]) return PAGE_META[clean];
    for (const [key, value] of Object.entries(PAGE_META)) {
        if (key !== '/admin' && clean.startsWith(key)) return value;
    }
    return { title: 'Admin', icon: 'admin_panel_settings', subtitle: 'Azure Horizon Console' };
}

// ── Notification Helpers ──────────────────────────────────────────────────────
export const NOTIF_STYLE: Record<NotifType, { icon: string; iconBg: string; iconColor: string; dot: string }> = {
    booking_pending:   { icon: 'pending_actions',       iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   dot: 'bg-amber-400' },
    booking_confirmed: { icon: 'check_circle',           iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', dot: 'bg-emerald-400' },
    booking_cancelled: { icon: 'cancel',                 iconBg: 'bg-red-50',     iconColor: 'text-red-500',     dot: 'bg-red-400' },
    booking_cancel_requested: { icon: 'assignment_late', iconBg: 'bg-orange-50',  iconColor: 'text-orange-500',  dot: 'bg-orange-500' },
    support_new:       { icon: 'support_agent',          iconBg: 'bg-cyan-50',    iconColor: 'text-cyan-600',    dot: 'bg-cyan-500' },
    support_in_progress: { icon: 'forum',                iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    dot: 'bg-blue-400' },
    review_good:       { icon: 'star',                   iconBg: 'bg-purple-50',  iconColor: 'text-purple-500',  dot: 'bg-purple-400' },
    review_bad:        { icon: 'sentiment_dissatisfied', iconBg: 'bg-orange-50',  iconColor: 'text-orange-500',  dot: 'bg-orange-500' },
    customer_new:      { icon: 'person_add',             iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    dot: 'bg-blue-400' },
};

export const TABS: { key: TabKey; label: string; types: NotifType[]; href: string; roles: AdminRole[] }[] = [
    { key: 'all',      label: 'Tất cả',    types: ['booking_pending','booking_confirmed','booking_cancelled','booking_cancel_requested','support_new','support_in_progress','review_good','review_bad','customer_new'], href: '', roles: ALL_ADMIN_ROLES },
    { key: 'booking',  label: 'Đặt tour',  types: ['booking_pending','booking_confirmed','booking_cancelled','booking_cancel_requested'], href: '/admin/bookings', roles: ALL_ADMIN_ROLES },
    { key: 'support',  label: 'Hỗ trợ',    types: ['support_new','support_in_progress'], href: '/admin/support', roles: ALL_ADMIN_ROLES },
    { key: 'review',   label: 'Đánh giá',  types: ['review_good','review_bad'], href: '/admin/reviews', roles: ADMIN_AND_SUPER_ROLES },
    { key: 'customer', label: 'Khách hàng',types: ['customer_new'], href: '/admin/customers', roles: ALL_ADMIN_ROLES },
];

export type { TabKey } from './types';

export function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1) return 'Vừa xong';
    if (min < 60) return `${min} phút trước`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} giờ trước`;
    const day = Math.floor(hr / 24);
    if (day === 1) return 'Hôm qua';
    return `${day} ngày trước`;
}

export const READ_KEY = 'admin_notif_read_ids';
export function getReadIds(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')); }
    catch { return new Set(); }
}
export function saveReadIds(ids: Set<string>) {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

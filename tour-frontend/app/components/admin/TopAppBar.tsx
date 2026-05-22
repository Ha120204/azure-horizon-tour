'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';

const ALL_ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];
const ADMIN_AND_SUPER_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN'];

type RoleAction = {
    label: string;
    desc: string;
    icon: string;
    href: string;
    color: string;
    roles: AdminRole[];
};

type CommandGroup = {
    title: string;
    actions: RoleAction[];
};

function isAdminRole(role: string): role is AdminRole {
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'STAFF';
}

function canAccessRole(userRole: string, roles: AdminRole[]) {
    return isAdminRole(userRole) && roles.includes(userRole);
}

function filterActionsByRole(actions: RoleAction[], userRole: string) {
    return actions.filter(action => canAccessRole(userRole, action.roles));
}

function getInitials(name: string) {
    const parts = name.trim().split(' ').filter(Boolean);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
}

const COMMAND_GROUPS: CommandGroup[] = [
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
            { label: 'Khách hàng', desc: 'Lịch sử, hạng thành viên', icon: 'people', href: '/admin/customers', color: 'text-violet-500', roles: ADMIN_AND_SUPER_ROLES },
            { label: 'Kiểm duyệt Nhận xét', desc: 'Duyệt, ẩn, phản hồi review', icon: 'reviews', href: '/admin/reviews', color: 'text-purple-500', roles: ADMIN_AND_SUPER_ROLES },
            { label: 'Quản lý Nhân viên', desc: 'Phân quyền, tài khoản staff', icon: 'badge', href: '/admin/staffs', color: 'text-rose-500', roles: ADMIN_AND_SUPER_ROLES },
        ],
    },
    {
        title: 'Quản trị',
        actions: [
            { label: 'Cài đặt hệ thống', desc: 'Cấu hình vận hành nền tảng', icon: 'settings', href: '/admin/settings', color: 'text-slate-600', roles: ['SUPER_ADMIN', 'ADMIN'] },
            { label: 'Marketing', desc: 'Subscriber và chiến dịch email', icon: 'campaign', href: '/admin/marketing', color: 'text-orange-500', roles: ADMIN_AND_SUPER_ROLES },
            { label: 'Tổng quan cấp cao', desc: 'Rủi ro hệ thống và quyền cấp cao', icon: 'admin_panel_settings', href: '/admin/super', color: 'text-amber-600', roles: ['SUPER_ADMIN'] },
        ],
    },
];

// ─── Page Metadata ────────────────────────────────────────────────────────────

const PAGE_META: Record<string, { title: string; icon: string; subtitle: string }> = {
    '/admin/super': { title: 'Tổng quan cấp cao', icon: 'admin_panel_settings', subtitle: 'Giám sát quyền lực hệ thống, rủi ro và cấu hình trọng yếu' },
    '/admin': { title: 'Tổng quan', icon: 'dashboard', subtitle: 'Xem tổng quan hoạt động hệ thống' },
    '/admin/statistics': { title: 'Thống kê', icon: 'bar_chart', subtitle: 'Phân tích & báo cáo chi tiết' },
    '/admin/tours': { title: 'Quản lý Tour', icon: 'explore', subtitle: 'Thêm, sửa và quản lý tour du lịch' },
    '/admin/bookings': { title: 'Đơn đặt', icon: 'event_note', subtitle: 'Quản lý tất cả các đơn đặt tour' },
    '/admin/customers': { title: 'Khách hàng', icon: 'group', subtitle: 'Danh sách và thông tin khách hàng' },
    '/admin/staffs': { title: 'Nhân viên', icon: 'badge', subtitle: 'Quản lý đội ngũ nhân viên & phân quyền' },
    '/admin/vouchers': { title: 'Mã giảm giá', icon: 'confirmation_number', subtitle: 'Tạo và quản lý chương trình khuyến mãi' },
    '/admin/marketing': { title: 'Marketing', icon: 'campaign', subtitle: 'Quản lý subscriber và chiến dịch email' },
    '/admin/articles': { title: 'Bài viết', icon: 'article', subtitle: 'Quản lý nội dung & bài đăng blog' },
    '/admin/reviews': { title: 'Đánh giá', icon: 'reviews', subtitle: 'Kiểm duyệt nhận xét từ khách hàng' },
    '/admin/profile': { title: 'Hồ sơ cá nhân', icon: 'manage_accounts', subtitle: 'Quản lý thông tin tài khoản & bảo mật' },
    '/admin/settings': { title: 'Cài đặt hệ thống', icon: 'settings', subtitle: 'Cấu hình và trạng thái vận hành của Azure Horizon' },
    '/admin/support': { title: 'Hỗ trợ khách hàng', icon: 'support_agent', subtitle: 'Tiếp nhận và xử lý yêu cầu hỗ trợ từ khách hàng' },
};

function getPageMeta(pathname: string) {
    const clean = pathname?.replace(/^\/(en|vi)/, '') ?? '';
    if (PAGE_META[clean]) return PAGE_META[clean];
    for (const [key, value] of Object.entries(PAGE_META)) {
        if (key !== '/admin' && clean.startsWith(key)) return value;
    }
    return { title: 'Admin', icon: 'admin_panel_settings', subtitle: 'Azure Horizon Console' };
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock() {
    const [time, setTime] = useState('');
    const [date, setDate] = useState('');
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
            setDate(now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }));
        };
        update();
        const t = setInterval(update, 1000);
        return () => clearInterval(t);
    }, []);
    if (!time) return null;
    return (
        <div className="hidden xl:flex flex-col items-end leading-tight select-none">
            <span className="text-sm font-bold text-slate-700 tracking-wider tabular-nums" style={{ fontVariant: 'tabular-nums', letterSpacing: '0.05em' }}>{time}</span>
            <span className="text-[10px] text-slate-400 font-medium capitalize">{date}</span>
        </div>
    );
}

// ─── Notification System ──────────────────────────────────────────────────────

type NotifType =
    | 'booking_pending'     // 🟡 Đơn mới cần duyệt
    | 'booking_confirmed'   // 🟢 Đơn đã xác nhận
    | 'booking_cancelled'   // 🔴 Đơn bị hủy
    | 'booking_cancel_requested'
    | 'support_new'
    | 'support_in_progress'
    | 'review_good'         // 🟣 Đánh giá tốt (4-5 sao)
    | 'review_bad'          // 🟠 Đánh giá tiêu cực (1-3 sao) — URGENT
    | 'customer_new';       // 🔵 Khách hàng mới đăng ký

interface Notif {
    id: string;
    type: NotifType;
    title: string;
    body: string;
    time: string;
    href: string;
    urgent?: boolean;
}

type SearchTourResult = {
    id: number | string;
    name: string;
    price: number;
};

type SearchDestinationResult = {
    id: number | string;
    name: string;
    region?: string;
};

const NOTIF_STYLE: Record<NotifType, { icon: string; iconBg: string; iconColor: string; dot: string }> = {
    booking_pending:   { icon: 'pending_actions',   iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   dot: 'bg-amber-400' },
    booking_confirmed: { icon: 'check_circle',       iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', dot: 'bg-emerald-400' },
    booking_cancelled: { icon: 'cancel',             iconBg: 'bg-red-50',     iconColor: 'text-red-500',     dot: 'bg-red-400' },
    booking_cancel_requested: { icon: 'assignment_late', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', dot: 'bg-orange-500' },
    support_new:       { icon: 'support_agent',       iconBg: 'bg-cyan-50',    iconColor: 'text-cyan-600',    dot: 'bg-cyan-500' },
    support_in_progress: { icon: 'forum',             iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    dot: 'bg-blue-400' },
    review_good:       { icon: 'star',               iconBg: 'bg-purple-50',  iconColor: 'text-purple-500',  dot: 'bg-purple-400' },
    review_bad:        { icon: 'sentiment_dissatisfied', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', dot: 'bg-orange-500' },
    customer_new:      { icon: 'person_add',         iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    dot: 'bg-blue-400' },
};

function relativeTime(iso: string): string {
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

const READ_KEY = 'admin_notif_read_ids';
function getReadIds(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')); }
    catch { return new Set(); }
}
function saveReadIds(ids: Set<string>) {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

type ApiObject = Record<string, unknown>;

function asObject(value: unknown): ApiObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as ApiObject : {};
}

function unwrapPayload(value: unknown): unknown {
    const obj = asObject(value);
    return obj.data !== undefined ? obj.data : value;
}

function pickArray(value: unknown, keys: string[] = []): ApiObject[] {
    const payload = unwrapPayload(value);
    if (Array.isArray(payload)) return payload.map(asObject);

    const payloadObj = asObject(payload);
    for (const key of keys) {
        const direct = payloadObj[key];
        if (Array.isArray(direct)) return direct.map(asObject);
    }

    const nested = unwrapPayload(payloadObj.data);
    if (Array.isArray(nested)) return nested.map(asObject);

    const nestedObj = asObject(nested);
    for (const key of keys) {
        const candidate = nestedObj[key];
        if (Array.isArray(candidate)) return candidate.map(asObject);
    }

    return [];
}

function getText(value: unknown, fallback = '') {
    return typeof value === 'string' && value.trim() ? value : fallback;
}

function getNumber(value: unknown, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

// ─── Notification Fetcher ─────────────────────────────────────────────────────

async function fetchAllNotifs(): Promise<Notif[]> {
    // Gọi ba nguồn song song — nếu một nguồn lỗi thì không ảnh hưởng
    const [bookingRes, reviewRes, userRes, supportRes] = await Promise.allSettled([
        fetchWithAuth(`${API_BASE_URL}/booking/admin/all?limit=15&status=ALL`),
        fetchWithAuth(`${API_BASE_URL}/review/admin/all?page=1&limit=10`),
        fetchWithAuth(`${API_BASE_URL}/user?role=CUSTOMER&page=1&limit=8`),
        fetchWithAuth(`${API_BASE_URL}/support/tickets?status=ALL&page=1&limit=10`),
    ]);

    const notifs: Notif[] = [];

    // ── 1. Booking notifications ──────────────────────────────────────────────
    if (bookingRes.status === 'fulfilled' && bookingRes.value.ok) {
        const json = await bookingRes.value.json();
        const bookings = pickArray(json, ['bookings']);
        for (const b of bookings) {
            const user = asObject(b.user);
            const tour = asObject(b.tour);
            const status = getText(b.status).toUpperCase();
            const bookingId = getText(b.bookingCode, String(b.id ?? ''));
            let type: NotifType = 'booking_pending';
            let title = '';
            let body = `${getText(user.fullName, 'Khách hàng')} — tour "${getText(tour.name, 'Tour')}"`;

            if (status === 'PENDING') {
                type = 'booking_pending';
                title = 'Đơn đặt mới cần xác nhận';
            } else if (status === 'CANCEL_REQUESTED') {
                type = 'booking_cancel_requested';
                title = 'Khách hàng gửi yêu cầu hủy booking';
                body = `Booking ${bookingId} — ${getText(user.fullName, 'khách hàng')} đang chờ xử lý hủy`;
            } else if (status === 'CONFIRMED') {
                type = 'booking_confirmed';
                title = 'Đơn đặt đã xác nhận thành công';
                body = `Booking ${bookingId} của ${getText(user.fullName, 'khách')} đã được xác nhận`;
            } else if (status === 'CANCELLED') {
                type = 'booking_cancelled';
                title = 'Đơn đặt vừa bị hủy';
                body = `Booking ${bookingId} — tour "${getText(tour.name)}" đã bị hủy`;
            } else {
                continue;
            }

            notifs.push({
                id: `booking_${b.id}`,
                type,
                title,
                body,
                time: getText(b.updatedAt, getText(b.createdAt, new Date().toISOString())),
                href: status === 'CANCEL_REQUESTED' ? '/admin/bookings?status=CANCEL_REQUESTED' : `/admin/bookings?status=${status}`,
                urgent: status === 'PENDING' || status === 'CANCEL_REQUESTED',
            });
        }
    }

    // ── 2. Review notifications ───────────────────────────────────────────────
    if (reviewRes.status === 'fulfilled' && reviewRes.value.ok) {
        const json = await reviewRes.value.json();
        const reviews = pickArray(json, ['reviews']);
        for (const r of reviews) {
            const user = asObject(r.user);
            const tour = asObject(r.tour);
            const rating = getNumber(r.rating, 5);
            const isBad = rating <= 3;
            const stars = '★'.repeat(Math.min(rating, 5));
            const content = getText(r.content);
            notifs.push({
                id: `review_${r.id}`,
                type: isBad ? 'review_bad' : 'review_good',
                title: isBad
                    ? `Đánh giá tiêu cực ${stars} cần xử lý`
                    : `Đánh giá mới ${stars} từ khách hàng`,
                body: `${getText(user.fullName, 'Khách')} đánh giá tour "${getText(tour.name, String(r.tourId ?? 'Tour'))}"${content ? ` — "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"` : ''}`,
                time: getText(r.createdAt, new Date().toISOString()),
                href: '/admin/reviews',
                urgent: isBad,
            });
        }
    }

    // ── 3. Support ticket notifications ───────────────────────────────────────
    if (supportRes.status === 'fulfilled' && supportRes.value.ok) {
        const json = await supportRes.value.json();
        const tickets = pickArray(json, ['tickets']);
        for (const ticket of tickets) {
            const status = getText(ticket.status).toUpperCase();
            if (status !== 'NEW' && status !== 'IN_PROGRESS') continue;
            const isNew = status === 'NEW';
            notifs.push({
                id: `support_${ticket.id}_${status}`,
                type: isNew ? 'support_new' : 'support_in_progress',
                title: isNew ? 'Ticket hỗ trợ mới cần phản hồi' : 'Ticket hỗ trợ đang xử lý',
                body: `${getText(ticket.customerName, 'Khách hàng')} — ${getText(ticket.subject, 'Yêu cầu hỗ trợ')}`,
                time: getText(ticket.updatedAt, getText(ticket.createdAt, new Date().toISOString())),
                href: isNew ? '/admin/support?status=NEW' : '/admin/support?status=IN_PROGRESS',
                urgent: isNew,
            });
        }
    }

    // ── 4. New customer notifications ─────────────────────────────────────────
    if (userRes.status === 'fulfilled' && userRes.value.ok) {
        const json = await userRes.value.json();
        const users = pickArray(json, ['users']);
        // Chỉ lấy những user đăng ký trong 7 ngày gần nhất
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const u of users) {
            if (u.role !== 'CUSTOMER') continue;
            const created = new Date(getText(u.createdAt)).getTime();
            if (!Number.isFinite(created)) continue;
            if (created < cutoff) continue;
            notifs.push({
                id: `customer_${u.id}`,
                type: 'customer_new',
                title: 'Khách hàng mới đăng ký tài khoản',
                body: `${getText(u.fullName, getText(u.email, 'Khách hàng'))} vừa tham gia Azure Horizon`,
                time: getText(u.createdAt, new Date().toISOString()),
                href: '/admin/customers',
            });
        }
    }

    // Sắp xếp: urgent lên đầu → newest first
    notifs.sort((a, b) => {
        if (a.urgent && !b.urgent) return -1;
        if (!a.urgent && b.urgent) return 1;
        return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    return notifs.slice(0, 25);
}

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotifItem({ notif, isRead, onClick }: { notif: Notif; isRead: boolean; onClick: () => void }) {
    const s = NOTIF_STYLE[notif.type];
    return (
        <button
            onClick={onClick}
            className={`w-full text-left flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!isRead ? (notif.urgent ? 'bg-orange-50/40' : 'bg-blue-50/30') : ''}`}
        >
            <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ${notif.urgent && !isRead ? 'ring-orange-200' : 'ring-transparent'}`}>
                <span className={`material-symbols-outlined text-[18px] ${s.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {s.icon}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isRead ? 'text-slate-500' : notif.urgent ? 'text-orange-700' : 'text-slate-800'}`}>
                    {notif.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
                <p className="text-[10px] text-slate-300 mt-1.5 font-medium">{relativeTime(notif.time)}</p>
            </div>
            {!isRead && (
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${s.dot}`} />
            )}
        </button>
    );
}

// ─── Tab config ──────────────────────────────────────────────────────────────

type TabKey = 'all' | 'booking' | 'support' | 'review' | 'customer';

const TABS: { key: TabKey; label: string; types: NotifType[]; href: string; roles: AdminRole[] }[] = [
    { key: 'all',      label: 'Tất cả',   types: ['booking_pending','booking_confirmed','booking_cancelled','booking_cancel_requested','support_new','support_in_progress','review_good','review_bad','customer_new'], href: '', roles: ALL_ADMIN_ROLES },
    { key: 'booking',  label: 'Đặt tour', types: ['booking_pending','booking_confirmed','booking_cancelled','booking_cancel_requested'], href: '/admin/bookings', roles: ALL_ADMIN_ROLES },
    { key: 'support',  label: 'Hỗ trợ',   types: ['support_new','support_in_progress'], href: '/admin/support', roles: ALL_ADMIN_ROLES },
    { key: 'review',   label: 'Đánh giá', types: ['review_good','review_bad'], href: '/admin/reviews', roles: ADMIN_AND_SUPER_ROLES },
    { key: 'customer', label: 'Khách hàng',types: ['customer_new'], href: '/admin/customers', roles: ADMIN_AND_SUPER_ROLES },
];

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({
    notifs, readIds, isLoading, hasError, userRole, onRefresh, onMarkRead, onMarkAllRead, onClose,
}: {
    notifs: Notif[];
    readIds: Set<string>;
    isLoading: boolean;
    hasError: boolean;
    userRole: string;
    onRefresh: () => void;
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onClose: () => void;
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const visibleTabs = TABS.filter(tab => canAccessRole(userRole, tab.roles));
    const permittedTypes = new Set(
        visibleTabs
            .filter(tab => tab.key !== 'all')
            .flatMap(tab => tab.types)
    );
    const roleScopedNotifs = notifs.filter(n => permittedTypes.has(n.type));

    const unreadCount = roleScopedNotifs.filter(n => !readIds.has(n.id)).length;
    const urgentCount = roleScopedNotifs.filter(n => n.urgent && !readIds.has(n.id)).length;

    // Tab unread counts
    const tabUnread = (types: NotifType[]) =>
        roleScopedNotifs.filter(n => types.includes(n.type) && !readIds.has(n.id)).length;

    // Filtered list based on active tab
    const activeTabMeta = visibleTabs.find(t => t.key === activeTab) ?? visibleTabs[0] ?? TABS[0];
    const activeTypes = activeTabMeta.key === 'all' ? [...permittedTypes] : activeTabMeta.types;
    const filtered = roleScopedNotifs.filter(n => activeTypes.includes(n.type));

    const isToday = (iso: string) => {
        const d = new Date(iso), now = new Date();
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const todayList  = filtered.filter(n => isToday(n.time));
    const olderList  = filtered.filter(n => !isToday(n.time));

    const handleClick = (n: Notif) => {
        onMarkRead(n.id);
        onClose();
        router.push(n.href as never);
    };

    const activeTabHref = visibleTabs.find(t => t.key === activeTab)?.href ?? '';

    return (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[400px] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 z-50 overflow-hidden flex flex-col max-h-[560px]">

            {/* ── Panel Header ── */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-[15px]">Thông báo</span>
                    {unreadCount > 0 && (
                        <span className={`text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${urgentCount > 0 ? 'bg-orange-500' : 'bg-blue-600'}`}>
                            {unreadCount}
                        </span>
                    )}
                    {urgentCount > 0 && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full animate-pulse">
                            {urgentCount} cần xử lý!
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button onClick={onMarkAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                        Đọc tất cả
                    </button>
                )}
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 px-4 pt-2 pb-0 border-b border-slate-100 bg-white flex-shrink-0">
                {visibleTabs.map(tab => {
                    const count = tabUnread(tab.types);
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
                                isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                            }`}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── List ── */}
            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-100">

                {/* Loading skeleton */}
                {isLoading && notifs.length === 0 ? (
                    <div className="space-y-0 py-1">
                        {Array(4).fill(0).map((_, i) => (
                            <div key={i} className="flex items-start gap-3 px-5 py-3.5 border-b border-slate-50 animate-pulse">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex-shrink-0" />
                                <div className="flex-1 space-y-2 pt-0.5">
                                    <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                                    <div className="h-2.5 bg-slate-100 rounded w-full" />
                                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>

                ) : hasError ? (
                    /* Error state */
                    <div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-300">wifi_off</span>
                        <p className="text-sm font-medium text-center">Không thể tải thông báo</p>
                        <button
                            onClick={onRefresh}
                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px]">refresh</span>
                            Thử lại
                        </button>
                    </div>

                ) : filtered.length === 0 ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-14 text-slate-300">
                        <span className="material-symbols-outlined text-5xl mb-3">notifications_off</span>
                        <p className="text-sm font-medium">Không có thông báo nào</p>
                    </div>

                ) : (
                    /* Normal list */
                    <>
                        {todayList.length > 0 && (
                            <>
                                <p className="px-5 pt-3.5 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hôm nay</p>
                                {todayList.map(n => (
                                    <NotifItem key={n.id} notif={n} isRead={readIds.has(n.id)} onClick={() => handleClick(n)} />
                                ))}
                            </>
                        )}
                        {olderList.length > 0 && (
                            <>
                                <p className="px-5 pt-3.5 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trước đó</p>
                                {olderList.map(n => (
                                    <NotifItem key={n.id} notif={n} isRead={readIds.has(n.id)} onClick={() => handleClick(n)} />
                                ))}
                            </>
                        )}
                    </>
                )}

                {/* Inline refresh indicator khi đang reload với data cũ */}
                {isLoading && notifs.length > 0 && (
                    <div className="flex items-center justify-center gap-2 py-2 text-slate-400">
                        <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                        <span className="text-[10px] font-medium">Đang cập nhật...</span>
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] text-slate-400">{filtered.length} thông báo</span>
                {activeTabHref ? (
                    <button
                        onClick={() => { onClose(); router.push(activeTabHref as never); }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        Xem tất cả →
                    </button>
                ) : (
                    <div className="flex gap-3">
                        {visibleTabs.filter(t => t.key !== 'all').map(t => (
                            <button key={t.key} onClick={() => { onClose(); router.push(t.href as never); }} className="text-[11px] font-semibold text-slate-400 hover:text-blue-600 transition-colors">
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TopAppBar() {
    const pathname = usePathname();
    const router = useRouter();
    const notifRef = useRef<HTMLDivElement>(null);

    const [userName, setUserName] = useState('Admin');
    const [userInitials, setUserInitials] = useState('A');
    const [userEmail, setUserEmail] = useState('');
    const [userRole, setUserRole] = useState('');
    const [userAvatarUrl, setUserAvatarUrl] = useState('');
    const [loginTime] = useState(() => new Date());
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifPanel, setShowNotifPanel] = useState(false);

    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifError, setNotifError] = useState(false);

    // Init user info
    useEffect(() => {
        setReadIds(getReadIds());

        const applyLocalProfile = () => {
            const name = localStorage.getItem('userName') || 'Admin';
            const email = localStorage.getItem('userEmail') || '';
            const role = localStorage.getItem('userRole') || '';
            const avatarUrl = localStorage.getItem('userAvatarUrl') || '';
            setUserName(name);
            setUserEmail(email);
            setUserRole(role);
            setUserAvatarUrl(avatarUrl);
            setUserInitials(getInitials(name));
            return name;
        };

        const loadProfile = () => {
            const fallbackName = applyLocalProfile();
            fetchWithAuth(`${API_BASE_URL}/auth/profile`)
                .then(r => r.json())
                .then(data => {
                    const profile = data.data ?? data;
                    const fullName = profile.fullName || fallbackName || 'Admin';
                    const avatarUrl = profile.avatarUrl || '';
                    setUserName(fullName);
                    setUserInitials(getInitials(fullName));
                    setUserAvatarUrl(avatarUrl);
                    if (profile.email) setUserEmail(profile.email);
                    if (profile.role) setUserRole(profile.role);
                    localStorage.setItem('userName', fullName);
                    if (profile.email) localStorage.setItem('userEmail', profile.email);
                    if (profile.role) localStorage.setItem('userRole', profile.role);
                    if (avatarUrl) localStorage.setItem('userAvatarUrl', avatarUrl);
                    else localStorage.removeItem('userAvatarUrl');
                })
                .catch(() => {});
        };

        loadProfile();
        window.addEventListener('auth-change', loadProfile);
        return () => window.removeEventListener('auth-change', loadProfile);
    }, []);

    // Fetch all 3 notification sources
    const refreshNotifs = useCallback(async () => {
        setNotifLoading(true);
        setNotifError(false);
        try {
            const result = await fetchAllNotifs();
            setNotifs(result);
        } catch (e) {
            console.error('Notification fetch error:', e);
            setNotifError(true);
        } finally {
            setNotifLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshNotifs();
        const interval = setInterval(refreshNotifs, 2 * 60 * 1000); // refresh mỗi 2 phút
        return () => clearInterval(interval);
    }, [refreshNotifs]);

    // Close panels on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifPanel(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleMarkRead = (id: string) => {
        setReadIds(prev => { const next = new Set(prev).add(id); saveReadIds(next); return next; });
    };
    const handleMarkAllRead = () => {
        const next = new Set(notifs.map(n => n.id));
        saveReadIds(next);
        setReadIds(next);
    };

    const handleLogout = async () => {
        try { await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); }
        catch { }
        finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userAvatarUrl');
            window.dispatchEvent(new Event('auth-change'));
            router.replace('/admin/login');
        }
    };

    const meta = getPageMeta(pathname ?? '');
    const visibleNotifTypes = new Set(
        TABS
            .filter(tab => tab.key !== 'all' && canAccessRole(userRole, tab.roles))
            .flatMap(tab => tab.types)
    );
    const roleScopedNotifs = notifs.filter(n => visibleNotifTypes.has(n.type));
    const unreadCount = roleScopedNotifs.filter(n => !readIds.has(n.id)).length;
    const urgentUnread = roleScopedNotifs.filter(n => n.urgent && !readIds.has(n.id)).length;

    // ── Command Palette State ──
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [cmdQuery, setCmdQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<{ tours: SearchTourResult[]; dests: SearchDestinationResult[] }>({ tours: [], dests: [] });
    
    // Toggle Command Palette via Ctrl+K or Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchModalOpen(v => !v);
            }
            if (e.key === 'Escape' && searchModalOpen) {
                setSearchModalOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [searchModalOpen]);

    // Focus input and reset state when opened
    useEffect(() => {
        if (searchModalOpen) {
            setTimeout(() => document.getElementById('cmd-search-input')?.focus(), 50);
        } else {
            setCmdQuery('');
            setSearchResults({ tours: [], dests: [] });
        }
    }, [searchModalOpen]);

    // Live Search Fetching
    useEffect(() => {
        const q = cmdQuery.trim();
        if (q.length < 2) {
            setSearchResults({ tours: [], dests: [] });
            return;
        }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(q)}`);
                if (res.ok) {
                    const data = await res.json();
                    const payload = unwrapPayload(data);
                    const obj = asObject(payload);
                    const tours = Array.isArray(obj.tours) ? obj.tours.map(item => {
                        const tour = asObject(item);
                        return {
                            id: getText(tour.id, String(tour.id ?? '')),
                            name: getText(tour.name, 'Tour'),
                            price: getNumber(tour.price),
                        };
                    }) : [];
                    const dests = Array.isArray(obj.destinations) ? obj.destinations.map(item => {
                        const dest = asObject(item);
                        return {
                            id: getText(dest.id, String(dest.id ?? '')),
                            name: getText(dest.name, 'Điểm đến'),
                            region: getText(dest.region),
                        };
                    }) : [];
                    setSearchResults({ tours, dests });
                }
            } catch { } finally {
                setSearchLoading(false);
            }
        }, 350); // debounce 350ms
        return () => clearTimeout(timer);
    }, [cmdQuery]);

    const handleActionClick = (href: string) => {
        setSearchModalOpen(false);
        router.push(href as never);
    };

    const visibleCommandGroups = COMMAND_GROUPS
        .map(group => ({ ...group, actions: filterActionsByRole(group.actions, userRole) }))
        .filter(group => group.actions.length > 0);

    return (
        <>
            <header className="sticky top-0 z-30 w-full h-[68px] bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center px-8 gap-6 flex-shrink-0">

                {/* ── Page Title ── */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-blue-600 text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {meta.icon}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-headline text-[1.05rem] font-bold text-slate-800 leading-tight truncate">{meta.title}</h1>
                        <p className="text-[11px] text-slate-400 leading-tight truncate hidden md:block">{meta.subtitle}</p>
                    </div>
                </div>

                {/* ── Cmd+K Search Trigger ── */}
                <button 
                    onClick={() => setSearchModalOpen(true)}
                    className="hidden md:flex items-center gap-3 px-3.5 py-2 w-64 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-200 hover:shadow-sm rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                    <span className="material-symbols-outlined text-[17px] text-slate-400 group-hover:text-blue-500 transition-colors">search</span>
                    <span className="flex-1 text-left text-sm text-slate-400 font-medium group-hover:text-slate-500">Tìm kiếm...</span>
                    <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-400 shadow-sm">
                        <span className="text-[11px]">⌘</span>K
                    </kbd>
                </button>

                {/* ── Right Actions ── */}
                <div className="flex items-center gap-2 flex-shrink-0">

                    {/* Clock */}
                    <div className="hidden xl:block px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <LiveClock />
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden md:block mx-1" />

                    {/* ── Notification Bell ── */}
                    <div ref={notifRef} className="relative">
                        <button
                            onClick={() => {
                                setShowNotifPanel(v => !v);
                                setShowProfileMenu(false); // đóng profile menu nếu đang mở
                            }}
                            aria-label="Thông báo"
                            title={urgentUnread > 0 ? `${urgentUnread} thông báo cần xử lý!` : 'Thông báo'}
                            className={`relative p-2.5 rounded-xl transition-all ${showNotifPanel
                                ? 'bg-blue-50 text-blue-600'
                                : urgentUnread > 0
                                    ? 'text-orange-500 hover:bg-orange-50'
                                    : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                        >
                            {/* Bell icon — mờ khi đang load */}
                            <span
                                className={`material-symbols-outlined text-[22px] transition-opacity ${notifLoading ? 'opacity-30' : 'opacity-100'}`}
                                style={{ fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0" }}
                            >
                                notifications
                            </span>
                            {/* Spinner nhỏ khi loading (chỉ hiện khi panel đóng) */}
                            {notifLoading && !showNotifPanel && (
                                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="material-symbols-outlined text-[14px] text-slate-400 animate-spin">progress_activity</span>
                                </span>
                            )}
                            {/* Badge — chỉ pulse khi panel đang đóng để không gây phân tâm */}
                            {unreadCount > 0 && (
                                <span className={`absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full text-white text-[9px] font-bold leading-none px-1 ring-2 ring-white ${
                                    urgentUnread > 0
                                        ? `bg-orange-500 ${!showNotifPanel ? 'animate-pulse' : ''}`
                                        : 'bg-red-500'
                                }`}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifPanel && (
                            <NotificationPanel
                                notifs={notifs} readIds={readIds}
                                isLoading={notifLoading}
                                hasError={notifError}
                                userRole={userRole}
                                onRefresh={refreshNotifs}
                                onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead}
                                onClose={() => setShowNotifPanel(false)}
                            />
                        )}
                    </div>

                    {/* ── Profile ── */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowProfileMenu(v => !v);
                                setShowNotifPanel(false); // đóng notif panel nếu đang mở
                            }}
                            className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border transition-all ${showProfileMenu ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                        >
                            {/* Avatar + online dot */}
                            <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden">
                                    {userAvatarUrl ? (
                                        <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        userInitials
                                    )}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                            </div>
                            <div className="hidden md:flex flex-col items-start leading-tight">
                                <span className="text-sm font-bold text-slate-700 truncate max-w-[100px]">{userName}</span>
                                <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">
                                    {userRole === 'SUPER_ADMIN' ? 'Siêu Quản Trị'
                                        : userRole === 'ADMIN' ? 'Quản Trị Viên'
                                        : userRole === 'STAFF' ? 'Nhân Viên'
                                        : 'Admin'}
                                </span>
                            </div>
                            <span className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>

                        {showProfileMenu && (
                            <div
                                className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden z-50"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* ── User Identity Block ── */}
                                <div className="px-4 pt-4 pb-3.5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md overflow-hidden">
                                                {userAvatarUrl ? (
                                                    <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    userInitials
                                                )}
                                            </div>
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
                                            {userEmail ? (
                                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{userEmail}</p>
                                            ) : null}
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-[10px] font-semibold text-emerald-600">Đang hoạt động</span>
                                                <span className="text-[10px] text-slate-300 mx-0.5">·</span>
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                                    {userRole === 'SUPER_ADMIN' ? 'SIÊU QUẢN TRỊ'
                                                        : userRole === 'ADMIN' ? 'QUẢN TRỊ VIÊN'
                                                        : userRole === 'STAFF' ? 'NHÂN VIÊN'
                                                        : 'ADMIN'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Last login */}
                                    <div className="flex items-center gap-1.5 mt-3 px-1">
                                        <span className="material-symbols-outlined text-[13px] text-slate-300">schedule</span>
                                        <span className="text-[10px] text-slate-400">
                                            Đăng nhập lúc {loginTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, {loginTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                {/* ── Nav Items ── */}
                                <div className="py-1.5">
                                    <button
                                        onClick={() => { setShowProfileMenu(false); router.push('/admin/profile' as never); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors group"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-blue-500 transition-colors">manage_accounts</span>
                                        <span className="flex-1 text-left">Hồ sơ cá nhân</span>
                                        <kbd className="text-[9px] font-bold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded font-mono">⌘P</kbd>
                                    </button>
                                    {canAccessRole(userRole, ['SUPER_ADMIN', 'ADMIN']) ? (
                                        <button
                                            onClick={() => { setShowProfileMenu(false); router.push('/admin/settings' as never); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors group"
                                        >
                                            <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-blue-500 transition-colors">settings</span>
                                            <span className="flex-1 text-left">Cài đặt hệ thống</span>
                                            <kbd className="text-[9px] font-bold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded font-mono">⌘,</kbd>
                                        </button>
                                    ) : null}
                                </div>

                                {/* ── Logout ── */}
                                <div className="border-t border-slate-100 py-1.5">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium group">
                                        <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">logout</span>
                                        <span className="flex-1 text-left">Đăng xuất</span>
                                        <kbd className="text-[9px] font-bold text-red-200 bg-red-50 px-1.5 py-0.5 rounded font-mono">⇧⌘Q</kbd>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Command Palette Modal ── */}
            {searchModalOpen && (
                <div 
                    className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSearchModalOpen(false)}
                >
                    <div 
                        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Input Area */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
                            <span className="material-symbols-outlined text-slate-400 text-[24px]">search</span>
                            <input
                                id="cmd-search-input"
                                type="text"
                                value={cmdQuery}
                                onChange={e => setCmdQuery(e.target.value)}
                                placeholder="Tìm kiếm trang, tours, điểm đến..."
                                className="flex-1 text-lg font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                                autoComplete="off" spellCheck={false}
                            />
                            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-500 font-mono">
                                ESC
                            </kbd>
                        </div>

                        {/* Quick Action / Results Area */}
                        <div className="max-h-[60vh] overflow-y-auto w-full p-2 bg-slate-50/50">
                            {cmdQuery.trim().length < 2 ? (
                                <div className="p-2 space-y-4">
                                    {visibleCommandGroups.map(group => (
                                        <div key={group.title}>
                                            <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.title}</p>
                                            {group.actions.map(act => (
                                                <button
                                                    key={`${group.title}-${act.href}-${act.label}`}
                                                    onClick={() => handleActionClick(act.href)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-xl transition-colors text-left group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
                                                        <span className={`material-symbols-outlined text-[18px] ${act.color}`}>{act.icon}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{act.label}</p>
                                                        <p className="text-[11px] text-slate-400">{act.desc}</p>
                                                    </div>
                                                    <span className="material-symbols-outlined text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-[18px]">keyboard_return</span>
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : searchLoading ? (
                                <div className="p-2 flex flex-col items-center justify-center py-12 text-slate-400">
                                    <span className="material-symbols-outlined text-3xl mb-3 animate-spin duration-1000">progress_activity</span>
                                    <p className="text-sm">Đang tìm kiếm &quot;{cmdQuery}&quot;...</p>
                                </div>
                            ) : searchResults.tours.length === 0 && searchResults.dests.length === 0 ? (
                                <div className="p-2 flex flex-col items-center justify-center py-12 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-3">search_off</span>
                                    <p className="text-sm">Không tìm thấy kết quả nào cho &quot;{cmdQuery}&quot;</p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-4">
                                    {searchResults.tours.length > 0 && (
                                        <div>
                                            <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tours ({searchResults.tours.length})</p>
                                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                                {searchResults.tours.map((t, idx) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => handleActionClick('/admin/tours')}
                                                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left group ${idx > 0 ? 'border-t border-slate-50' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-blue-500 text-[18px]">explore</span>
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">{t.name}</p>
                                                                <p className="text-xs text-slate-400">ID: {t.id} • {new Intl.NumberFormat('vi-VN').format(t.price)} đ</p>
                                                            </div>
                                                        </div>
                                                        <span className="material-symbols-outlined text-blue-300 opacity-0 group-hover:opacity-100">keyboard_return</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {searchResults.dests.length > 0 && (
                                        <div>
                                            <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm đến ({searchResults.dests.length})</p>
                                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                                {searchResults.dests.map((d, idx) => (
                                                    <button
                                                        key={d.id}
                                                        onClick={() => handleActionClick('/admin/tours')}
                                                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50 transition-colors text-left group ${idx > 0 ? 'border-t border-slate-50' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-emerald-500 text-[18px]">place</span>
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">{d.name}</p>
                                                                <p className="text-xs text-slate-400">Khu vực: {d.region}</p>
                                                            </div>
                                                        </div>
                                                        <span className="material-symbols-outlined text-emerald-300 opacity-0 group-hover:opacity-100">keyboard_return</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

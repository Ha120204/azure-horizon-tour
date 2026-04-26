'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

// ─── Page Metadata ────────────────────────────────────────────────────────────

const PAGE_META: Record<string, { title: string; icon: string; subtitle: string }> = {
    '/admin': { title: 'Tổng quan', icon: 'dashboard', subtitle: 'Xem tổng quan hoạt động hệ thống' },
    '/admin/statistics': { title: 'Thống kê', icon: 'bar_chart', subtitle: 'Phân tích & báo cáo chi tiết' },
    '/admin/tours': { title: 'Quản lý Tour', icon: 'explore', subtitle: 'Thêm, sửa và quản lý tour du lịch' },
    '/admin/bookings': { title: 'Đơn đặt', icon: 'event_note', subtitle: 'Quản lý tất cả các đơn đặt tour' },
    '/admin/customers': { title: 'Khách hàng', icon: 'group', subtitle: 'Danh sách và thông tin khách hàng' },
    '/admin/staffs': { title: 'Nhân viên', icon: 'badge', subtitle: 'Quản lý đội ngũ nhân viên & phân quyền' },
    '/admin/vouchers': { title: 'Mã giảm giá', icon: 'confirmation_number', subtitle: 'Tạo và quản lý chương trình khuyến mãi' },
    '/admin/articles': { title: 'Bài viết', icon: 'article', subtitle: 'Quản lý nội dung & bài đăng blog' },
    '/admin/reviews': { title: 'Đánh giá', icon: 'reviews', subtitle: 'Kiểm duyệt nhận xét từ khách hàng' },
    '/admin/profile': { title: 'Hồ sơ cá nhân', icon: 'manage_accounts', subtitle: 'Quản lý thông tin tài khoản & bảo mật' },
    '/admin/settings': { title: 'Cài đặt hệ thống', icon: 'settings', subtitle: 'Cấu hình và trạng thái vận hành của Azure Horizon' },
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
            <span className="font-mono text-sm font-bold text-slate-700 tracking-wider tabular-nums">{time}</span>
            <span className="text-[10px] text-slate-400 font-medium capitalize">{date}</span>
        </div>
    );
}

// ─── Notification System ──────────────────────────────────────────────────────

type NotifType =
    | 'booking_pending'     // 🟡 Đơn mới cần duyệt
    | 'booking_confirmed'   // 🟢 Đơn đã xác nhận
    | 'booking_cancelled'   // 🔴 Đơn bị hủy
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

const NOTIF_STYLE: Record<NotifType, { icon: string; iconBg: string; iconColor: string; dot: string }> = {
    booking_pending:   { icon: 'pending_actions',   iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   dot: 'bg-amber-400' },
    booking_confirmed: { icon: 'check_circle',       iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', dot: 'bg-emerald-400' },
    booking_cancelled: { icon: 'cancel',             iconBg: 'bg-red-50',     iconColor: 'text-red-500',     dot: 'bg-red-400' },
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

// ─── Notification Fetcher ─────────────────────────────────────────────────────

async function fetchAllNotifs(): Promise<Notif[]> {
    // Gọi ba nguồn song song — nếu một nguồn lỗi thì không ảnh hưởng
    const [bookingRes, reviewRes, userRes] = await Promise.allSettled([
        fetchWithAuth(`${API_BASE_URL}/booking/admin/all?limit=15&status=ALL`),
        fetchWithAuth(`${API_BASE_URL}/review/admin/all?page=1&limit=10`),
        fetchWithAuth(`${API_BASE_URL}/user?role=CUSTOMER&page=1&limit=8`),
    ]);

    const notifs: Notif[] = [];

    // ── 1. Booking notifications ──────────────────────────────────────────────
    if (bookingRes.status === 'fulfilled' && bookingRes.value.ok) {
        const json = await bookingRes.value.json();
        const bookings: any[] = json.bookings ?? [];
        for (const b of bookings) {
            const status = (b.status ?? '').toUpperCase();
            let type: NotifType = 'booking_pending';
            let title = '';
            let body = `${b.user?.fullName ?? 'Khách hàng'} — tour "${b.tour?.name ?? 'Tour'}"`;

            if (status === 'PENDING') {
                type = 'booking_pending';
                title = 'Đơn đặt mới cần xác nhận';
            } else if (status === 'CONFIRMED') {
                type = 'booking_confirmed';
                title = 'Đơn đặt đã xác nhận thành công';
                body = `Đơn #${b.id} của ${b.user?.fullName ?? 'khách'} đã được xác nhận`;
            } else if (status === 'CANCELLED') {
                type = 'booking_cancelled';
                title = 'Đơn đặt vừa bị hủy';
                body = `Đơn #${b.id} — tour "${b.tour?.name ?? ''}" bị hủy bởi ${b.user?.fullName ?? 'khách'}`;
            } else {
                continue;
            }

            notifs.push({
                id: `booking_${b.id}`,
                type,
                title,
                body,
                time: b.createdAt ?? new Date().toISOString(),
                href: '/admin/bookings',
                urgent: status === 'PENDING',
            });
        }
    }

    // ── 2. Review notifications ───────────────────────────────────────────────
    if (reviewRes.status === 'fulfilled' && reviewRes.value.ok) {
        const json = await reviewRes.value.json();
        const reviews: any[] = json.data?.reviews ?? json.data ?? [];
        for (const r of reviews) {
            const rating = Number(r.rating ?? 5);
            const isBad = rating <= 3;
            const stars = '⭐'.repeat(Math.min(rating, 5));
            notifs.push({
                id: `review_${r.id}`,
                type: isBad ? 'review_bad' : 'review_good',
                title: isBad
                    ? `Đánh giá tiêu cực ${stars} cần xử lý`
                    : `Đánh giá mới ${stars} từ khách hàng`,
                body: `${r.user?.fullName ?? 'Khách'} đánh giá tour "${r.tour?.name ?? r.tourId}" — "${(r.content ?? '').slice(0, 60)}${(r.content ?? '').length > 60 ? '...' : ''}"`,
                time: r.createdAt ?? new Date().toISOString(),
                href: '/admin/reviews',
                urgent: isBad,
            });
        }
    }

    // ── 3. New customer notifications ─────────────────────────────────────────
    if (userRes.status === 'fulfilled' && userRes.value.ok) {
        const json = await userRes.value.json();
        const users: any[] = json.data?.users ?? json.users ?? [];
        // Chỉ lấy những user đăng ký trong 7 ngày gần nhất
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const u of users) {
            if (u.role !== 'CUSTOMER') continue;
            const created = new Date(u.createdAt).getTime();
            if (created < cutoff) continue;
            notifs.push({
                id: `customer_${u.id}`,
                type: 'customer_new',
                title: 'Khách hàng mới đăng ký tài khoản',
                body: `${u.fullName ?? u.email} vừa tham gia Azure Horizon`,
                time: u.createdAt ?? new Date().toISOString(),
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

type TabKey = 'all' | 'booking' | 'review' | 'customer';

const TABS: { key: TabKey; label: string; types: NotifType[]; href: string }[] = [
    { key: 'all',      label: 'Tất cả',   types: ['booking_pending','booking_confirmed','booking_cancelled','review_good','review_bad','customer_new'], href: '' },
    { key: 'booking',  label: 'Đặt tour', types: ['booking_pending','booking_confirmed','booking_cancelled'], href: '/admin/bookings' },
    { key: 'review',   label: 'Đánh giá', types: ['review_good','review_bad'], href: '/admin/reviews' },
    { key: 'customer', label: 'Khách hàng',types: ['customer_new'], href: '/admin/customers' },
];

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({
    notifs, readIds, isLoading, hasError, onRefresh, onMarkRead, onMarkAllRead, onClose,
}: {
    notifs: Notif[];
    readIds: Set<string>;
    isLoading: boolean;
    hasError: boolean;
    onRefresh: () => void;
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onClose: () => void;
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>('all');

    const unreadCount = notifs.filter(n => !readIds.has(n.id)).length;
    const urgentCount = notifs.filter(n => n.urgent && !readIds.has(n.id)).length;

    // Tab unread counts
    const tabUnread = (types: NotifType[]) =>
        notifs.filter(n => types.includes(n.type) && !readIds.has(n.id)).length;

    // Filtered list based on active tab
    const activeTypes = TABS.find(t => t.key === activeTab)!.types;
    const filtered = notifs.filter(n => activeTypes.includes(n.type));

    const isToday = (iso: string) => {
        const d = new Date(iso), now = new Date();
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const todayList  = filtered.filter(n => isToday(n.time));
    const olderList  = filtered.filter(n => !isToday(n.time));

    const handleClick = (n: Notif) => {
        onMarkRead(n.id);
        onClose();
        router.push(n.href as any);
    };

    const activeTabHref = TABS.find(t => t.key === activeTab)?.href ?? '';

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
                {TABS.map(tab => {
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
                        onClick={() => { onClose(); router.push(activeTabHref as any); }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        Xem tất cả →
                    </button>
                ) : (
                    <div className="flex gap-3">
                        {TABS.slice(1).map(t => (
                            <button key={t.key} onClick={() => { onClose(); router.push(t.href as any); }} className="text-[11px] font-semibold text-slate-400 hover:text-blue-600 transition-colors">
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
    const [loginTime] = useState(() => new Date());
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifPanel, setShowNotifPanel] = useState(false);

    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifError, setNotifError] = useState(false);

    // Init user info
    useEffect(() => {
        const name = localStorage.getItem('userName') || 'Admin';
        const email = localStorage.getItem('userEmail') || '';
        setUserName(name);
        setUserEmail(email);
        const parts = name.trim().split(' ');
        const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
        setUserInitials(initials);
        setReadIds(getReadIds());
        // Fetch full profile to get accurate role & name
        fetchWithAuth(`${API_BASE_URL}/auth/profile`)
            .then(r => r.json())
            .then(data => {
                const profile = data.data ?? data;
                if (profile.fullName) {
                    setUserName(profile.fullName);
                    const p = profile.fullName.trim().split(' ');
                    setUserInitials(
                        p.length >= 2
                            ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
                            : profile.fullName.slice(0, 2).toUpperCase()
                    );
                }
                if (profile.email) setUserEmail(profile.email);
                if (profile.role) setUserRole(profile.role);
            })
            .catch(() => {});
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
        catch (_) { }
        finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userName');
            window.dispatchEvent(new Event('auth-change'));
            router.replace('/admin/login');
        }
    };

    const meta = getPageMeta(pathname ?? '');
    const unreadCount = notifs.filter(n => !readIds.has(n.id)).length;
    const urgentUnread = notifs.filter(n => n.urgent && !readIds.has(n.id)).length;

    // ── Command Palette State ──
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [cmdQuery, setCmdQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<{tours: any[], dests: any[]}>({ tours: [], dests: [] });
    
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
                    setSearchResults({ tours: data.tours ?? [], dests: data.destinations ?? [] });
                }
            } catch (e) { } finally {
                setSearchLoading(false);
            }
        }, 350); // debounce 350ms
        return () => clearTimeout(timer);
    }, [cmdQuery]);

    const handleActionClick = (href: string) => {
        setSearchModalOpen(false);
        router.push(href as any);
    };

    return (
        <>
            <header className="sticky top-0 z-30 w-full h-[68px] bg-white/90 backdrop-blur-xl border-b border-slate-200/70 flex items-center px-8 gap-6 flex-shrink-0 shadow-sm">

                {/* ── Page Title ── */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
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
                    className="hidden md:flex items-center gap-3 px-3.5 py-1.5 w-64 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition-all group"
                >
                    <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-blue-500 transition-colors">search</span>
                    <span className="flex-1 text-left text-sm text-slate-500 font-medium">Tìm kiếm...</span>
                    <kbd className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-bold text-slate-400 font-mono shadow-sm">
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
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                    {userInitials}
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
                                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                                {userInitials}
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
                                        onClick={() => { setShowProfileMenu(false); router.push('/admin/profile' as any); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors group"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-blue-500 transition-colors">manage_accounts</span>
                                        <span className="flex-1 text-left">Hồ sơ cá nhân</span>
                                        <kbd className="text-[9px] font-bold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded font-mono">⌘P</kbd>
                                    </button>
                                    <button
                                        onClick={() => { setShowProfileMenu(false); router.push('/admin/settings' as any); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors group"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-blue-500 transition-colors">settings</span>
                                        <span className="flex-1 text-left">Cài đặt hệ thống</span>
                                        <kbd className="text-[9px] font-bold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded font-mono">⌘,</kbd>
                                    </button>
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
                                    {/* ── Group: Tổng quan ── */}
                                    <div>
                                        <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">📊 Tổng quan</p>
                                        {[
                                            { label: 'Dashboard', desc: 'KPI & số liệu hôm nay', icon: 'space_dashboard', href: '/admin', color: 'text-blue-600' },
                                            { label: 'Thống kê & Báo cáo', desc: 'Doanh thu, biểu đồ, phân tích', icon: 'bar_chart_4_bars', href: '/admin/statistics', color: 'text-indigo-500' },
                                            { label: 'Nhật ký hệ thống', desc: 'Activity logs & audit trail', icon: 'history', href: '/admin/logs', color: 'text-slate-500' },
                                        ].map(act => (
                                            <button key={act.label} onClick={() => handleActionClick(act.href)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-xl transition-colors text-left group">
                                                <div className={`w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors`}>
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

                                    {/* ── Group: Tour & Nội dung ── */}
                                    <div>
                                        <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">✈️ Tour & Nội dung</p>
                                        {[
                                            { label: 'Thêm Tour mới', desc: 'Tạo & xuất bản tour du lịch', icon: 'add_circle', href: '/admin/tours', color: 'text-blue-500' },
                                            { label: 'Quản lý Tour', desc: 'Sửa, ẩn, xoá, phục hồi tour', icon: 'explore', href: '/admin/tours', color: 'text-cyan-500' },
                                            { label: 'Bài viết & Blog', desc: 'Quản lý nội dung & SEO', icon: 'article', href: '/admin/articles', color: 'text-teal-600' },
                                        ].map(act => (
                                            <button key={act.label} onClick={() => handleActionClick(act.href)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-xl transition-colors text-left group">
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

                                    {/* ── Group: Giao dịch ── */}
                                    <div>
                                        <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">📋 Giao dịch</p>
                                        {[
                                            { label: 'Đơn đặt tour (Booking)', desc: 'Xác nhận, hủy, theo dõi', icon: 'event_note', href: '/admin/bookings', color: 'text-emerald-500' },
                                            { label: 'Quản lý Voucher', desc: 'Mã giảm giá, hạn sử dụng', icon: 'local_offer', href: '/admin/vouchers', color: 'text-amber-500' },
                                        ].map(act => (
                                            <button key={act.label} onClick={() => handleActionClick(act.href)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-xl transition-colors text-left group">
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

                                    {/* ── Group: Người dùng ── */}
                                    <div>
                                        <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">👥 Người dùng</p>
                                        {[
                                            { label: 'Khách hàng', desc: 'Lịch sử, hạng thành viên', icon: 'people', href: '/admin/customers', color: 'text-violet-500' },
                                            { label: 'Kiểm duyệt Nhận xét', desc: 'Duyệt, ẩn, phản hồi review', icon: 'reviews', href: '/admin/reviews', color: 'text-purple-500' },
                                            { label: 'Quản lý Nhân viên', desc: 'Phân quyền, tài khoản staff', icon: 'badge', href: '/admin/staffs', color: 'text-rose-500' },
                                        ].map(act => (
                                            <button key={act.label} onClick={() => handleActionClick(act.href)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-xl transition-colors text-left group">
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
                                </div>
                            ) : searchLoading ? (
                                <div className="p-2 flex flex-col items-center justify-center py-12 text-slate-400">
                                    <span className="material-symbols-outlined text-3xl mb-3 animate-spin duration-1000">progress_activity</span>
                                    <p className="text-sm">Đang tìm kiếm "{cmdQuery}"...</p>
                                </div>
                            ) : searchResults.tours.length === 0 && searchResults.dests.length === 0 ? (
                                <div className="p-2 flex flex-col items-center justify-center py-12 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-3">search_off</span>
                                    <p className="text-sm">Không tìm thấy kết quả nào cho "{cmdQuery}"</p>
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

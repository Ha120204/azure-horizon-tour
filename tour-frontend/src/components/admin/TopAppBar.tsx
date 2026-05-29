'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { clearClientUserStorage } from '@/lib/authSession';
import type { AdminRole } from '@/lib/adminAccess';
import type { SearchTourResult, SearchDestinationResult } from './topAppBar/types';
import {
    getPageMeta, getInitials, canAccessRole, filterActionsByRole,
    COMMAND_GROUPS, TABS, getReadIds, saveReadIds,
} from './topAppBar/constants';
import { fetchAllNotifs, asObject, unwrapPayload, getText, getNumber } from './topAppBar/fetchNotifs';
import type { Notif } from './topAppBar/types';
import LiveClock from './topAppBar/LiveClock';
import NotificationPanel from './topAppBar/NotificationPanel';
import { useAdminNotificationStream } from './topAppBar/useAdminNotificationStream';

type TopAppBarProps = {
    currentUserRole?: AdminRole | '';
};

export default function TopAppBar({ currentUserRole: authenticatedRole = '' }: TopAppBarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const notifRef = useRef<HTMLDivElement>(null);

    const [userName, setUserName] = useState('Admin');
    const [userInitials, setUserInitials] = useState('A');
    const [userEmail, setUserEmail] = useState('');
    const [userRole, setUserRole] = useState<string>(authenticatedRole);
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
            setUserName(name); setUserEmail(email); setUserRole(role);
            setUserAvatarUrl(avatarUrl); setUserInitials(getInitials(name));
            return name;
        };
        const loadProfile = () => {
            const fallbackName = applyLocalProfile();
            import('@/lib/fetchWithAuth').then(({ fetchWithAuth }) =>
                fetchWithAuth(`${API_BASE_URL}/auth/profile`)
                    .then(r => r.json())
                    .then(data => {
                        const profile = data.data ?? data;
                        const fullName = profile.fullName || fallbackName || 'Admin';
                        const avatarUrl = profile.avatarUrl || '';
                        setUserName(fullName); setUserInitials(getInitials(fullName));
                        setUserAvatarUrl(avatarUrl);
                        if (profile.email) setUserEmail(profile.email);
                        if (profile.role) setUserRole(profile.role);
                        localStorage.setItem('userName', fullName);
                        if (profile.email) localStorage.setItem('userEmail', profile.email);
                        if (profile.role) localStorage.setItem('userRole', profile.role);
                        if (avatarUrl) localStorage.setItem('userAvatarUrl', avatarUrl);
                        else localStorage.removeItem('userAvatarUrl');
                    })
                    .catch(() => {})
            );
        };
        loadProfile();
        window.addEventListener('auth-change', loadProfile);
        return () => window.removeEventListener('auth-change', loadProfile);
    }, []);

    useEffect(() => {
        if (authenticatedRole) {
            setUserRole(authenticatedRole);
        }
    }, [authenticatedRole]);

    const refreshNotifs = useCallback(async (silent = false) => {
        if (!userRole) {
            setNotifs([]);
            return;
        }
        if (!silent) setNotifLoading(true);
        setNotifError(false);
        try {
            const nextNotifs = await fetchAllNotifs(userRole);
            setNotifs(nextNotifs);
            if (nextNotifs.some(notif => notif.readAt !== undefined)) {
                setReadIds(new Set(nextNotifs.filter(notif => notif.readAt).map(notif => notif.id)));
            }
        }
        catch { setNotifError(true); }
        finally {
            if (!silent) setNotifLoading(false);
        }
    }, [userRole]);
    const handleRealtimeNotification = useCallback(() => {
        void refreshNotifs(true);
    }, [refreshNotifs]);

    useAdminNotificationStream({
        enabled: Boolean(userRole),
        onNotification: handleRealtimeNotification,
    });

    useEffect(() => {
        refreshNotifs();
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') void refreshNotifs(true);
        };

        const interval = window.setInterval(refreshWhenVisible, 30 * 1000);
        window.addEventListener('focus', refreshWhenVisible);
        document.addEventListener('visibilitychange', refreshWhenVisible);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', refreshWhenVisible);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [refreshNotifs]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node))
                setShowNotifPanel(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleMarkRead = (id: string) => {
        setReadIds(prev => { const next = new Set(prev).add(id); saveReadIds(next); return next; });
        if (/^\d+$/.test(id)) {
            void fetchWithAuth(`${API_BASE_URL}/admin/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
        }
    };
    const handleMarkAllRead = () => {
        const next = new Set(notifs.map(n => n.id));
        saveReadIds(next); setReadIds(next);
        if (notifs.some(n => /^\d+$/.test(n.id))) {
            void fetchWithAuth(`${API_BASE_URL}/admin/notifications/read-all`, { method: 'PATCH' }).catch(() => {});
        }
    };
    const handleLogout = async () => {
        try { await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch { }
        finally {
            clearClientUserStorage();
            window.dispatchEvent(new Event('auth-change'));
            router.replace('/admin/login');
        }
    };

    const baseMeta = getPageMeta(pathname ?? '');
    const meta = (pathname ?? '').replace(/^\/(en|vi)/, '') === '/admin/staffs' && userRole === 'SUPER_ADMIN'
        ? { title: 'Quản lý Admin', icon: 'manage_accounts', subtitle: 'Quản lý tài khoản Admin vận hành hệ thống' }
        : baseMeta;
    const visibleNotifTypes = new Set(
        TABS.filter(tab => tab.key !== 'all' && canAccessRole(userRole, tab.roles)).flatMap(tab => tab.types)
    );
    const roleScopedNotifs = notifs.filter(n => visibleNotifTypes.has(n.type));
    const unreadCount = roleScopedNotifs.filter(n => !readIds.has(n.id)).length;
    const urgentUnread = roleScopedNotifs.filter(n => n.urgent && !readIds.has(n.id)).length;

    // ── Command Palette ──
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [cmdQuery, setCmdQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<{ tours: SearchTourResult[]; dests: SearchDestinationResult[] }>({ tours: [], dests: [] });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchModalOpen(v => !v); }
            if (e.key === 'Escape' && searchModalOpen) setSearchModalOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [searchModalOpen]);

    useEffect(() => {
        if (searchModalOpen) setTimeout(() => document.getElementById('cmd-search-input')?.focus(), 50);
        else { setCmdQuery(''); setSearchResults({ tours: [], dests: [] }); }
    }, [searchModalOpen]);

    useEffect(() => {
        const q = cmdQuery.trim();
        if (q.length < 2) { setSearchResults({ tours: [], dests: [] }); return; }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(q)}`);
                if (res.ok) {
                    const data = await res.json();
                    const payload = unwrapPayload(data);
                    const obj = asObject(payload);
                    const tours = Array.isArray(obj.tours) ? obj.tours.map(item => {
                        const t = asObject(item);
                        return { id: getText(t.id, String(t.id ?? '')), name: getText(t.name, 'Tour'), price: getNumber(t.price) };
                    }) : [];
                    const dests = Array.isArray(obj.destinations) ? obj.destinations.map(item => {
                        const d = asObject(item);
                        return { id: getText(d.id, String(d.id ?? '')), name: getText(d.name, 'Điểm đến'), region: getText(d.region) };
                    }) : [];
                    setSearchResults({ tours, dests });
                }
            } catch { } finally { setSearchLoading(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [cmdQuery]);

    const handleActionClick = (href: string) => { setSearchModalOpen(false); router.push(href as never); };
    const visibleCommandGroups = COMMAND_GROUPS
        .map(group => ({ ...group, actions: filterActionsByRole(group.actions, userRole) }))
        .filter(group => group.actions.length > 0);

    return (
        <>
            <header className="sticky top-0 z-30 w-full h-[68px] bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center px-8 gap-6 flex-shrink-0">
                {/* Page Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-blue-600 text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-headline text-[1.05rem] font-bold text-slate-800 leading-tight truncate">{meta.title}</h1>
                        <p className="text-[11px] text-slate-400 leading-tight truncate hidden md:block">{meta.subtitle}</p>
                    </div>
                </div>

                {/* Cmd+K Search Trigger */}
                <button onClick={() => setSearchModalOpen(true)} className="hidden md:flex items-center gap-3 px-3.5 py-2 w-64 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-200 hover:shadow-sm rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-blue-300">
                    <span className="material-symbols-outlined text-[17px] text-slate-400 group-hover:text-blue-500 transition-colors">search</span>
                    <span className="flex-1 text-left text-sm text-slate-400 font-medium group-hover:text-slate-500">Tìm kiếm...</span>
                    <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-400 shadow-sm">
                        <span className="text-[11px]">⌘</span>K
                    </kbd>
                </button>

                {/* Right Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden xl:block px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <LiveClock />
                    </div>
                    <div className="w-px h-6 bg-slate-200 hidden md:block mx-1" />

                    {/* Notification Bell */}
                    <div ref={notifRef} className="relative">
                        <button
                            onClick={() => { setShowNotifPanel(v => !v); setShowProfileMenu(false); }}
                            aria-label="Thông báo"
                            className={`relative p-2.5 rounded-xl transition-all ${showNotifPanel ? 'bg-blue-50 text-blue-600' : urgentUnread > 0 ? 'text-orange-500 hover:bg-orange-50' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
                        >
                            <span className={`material-symbols-outlined text-[22px] transition-opacity ${notifLoading ? 'opacity-30' : 'opacity-100'}`} style={{ fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>
                            {notifLoading && !showNotifPanel && (
                                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="material-symbols-outlined text-[14px] text-slate-400 animate-spin">progress_activity</span>
                                </span>
                            )}
                            {unreadCount > 0 && (
                                <span className={`absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full text-white text-[9px] font-bold leading-none px-1 ring-2 ring-white ${urgentUnread > 0 ? `bg-orange-500 ${!showNotifPanel ? 'animate-pulse' : ''}` : 'bg-red-500'}`}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                        {showNotifPanel && (
                            <NotificationPanel
                                notifs={notifs} readIds={readIds}
                                isLoading={notifLoading} hasError={notifError}
                                userRole={userRole} onRefresh={refreshNotifs}
                                onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead}
                                onClose={() => setShowNotifPanel(false)}
                            />
                        )}
                    </div>

                    {/* Profile */}
                    <div className="relative">
                        <button onClick={() => { setShowProfileMenu(v => !v); setShowNotifPanel(false); }} className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border transition-all ${showProfileMenu ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                            <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden">
                                    {userAvatarUrl ? <Image src={userAvatarUrl} alt="" width={32} height={32} sizes="32px" className="h-full w-full object-cover" /> : userInitials}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                            </div>
                            <div className="hidden md:flex flex-col items-start leading-tight">
                                <span className="text-sm font-bold text-slate-700 truncate max-w-[100px]">{userName}</span>
                                <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">
                                    {userRole === 'SUPER_ADMIN' ? 'Siêu Quản Trị' : userRole === 'ADMIN' ? 'Quản Trị Viên' : userRole === 'STAFF' ? 'Nhân Viên' : 'Admin'}
                                </span>
                            </div>
                            <span className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden z-50" onClick={e => e.stopPropagation()}>
                                <div className="px-4 pt-4 pb-3.5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md overflow-hidden">
                                                {userAvatarUrl ? <Image src={userAvatarUrl} alt="" width={44} height={44} sizes="44px" className="h-full w-full object-cover" /> : userInitials}
                                            </div>
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
                                            {userEmail && <p className="text-[11px] text-slate-500 truncate mt-0.5">{userEmail}</p>}
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-[10px] font-semibold text-emerald-600">Đang hoạt động</span>
                                                <span className="text-[10px] text-slate-300 mx-0.5">·</span>
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                                    {userRole === 'SUPER_ADMIN' ? 'SIÊU QUẢN TRỊ' : userRole === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : userRole === 'STAFF' ? 'NHÂN VIÊN' : 'ADMIN'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-3 px-1">
                                        <span className="material-symbols-outlined text-[13px] text-slate-300">schedule</span>
                                        <span className="text-[10px] text-slate-400">Đăng nhập lúc {loginTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, {loginTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                </div>
                                <div className="py-1.5">
                                    <button onClick={() => { setShowProfileMenu(false); router.push('/admin/profile' as never); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors group">
                                        <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-blue-500 transition-colors">manage_accounts</span>
                                        <span className="flex-1 text-left">Hồ sơ cá nhân</span>
                                        <kbd className="text-[9px] font-bold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded font-mono">⌘P</kbd>
                                    </button>
                                    {canAccessRole(userRole, ['SUPER_ADMIN', 'ADMIN']) && (
                                        <button onClick={() => { setShowProfileMenu(false); router.push('/admin/settings' as never); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors group">
                                            <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-blue-500 transition-colors">settings</span>
                                            <span className="flex-1 text-left">Cài đặt hệ thống</span>
                                            <kbd className="text-[9px] font-bold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded font-mono">⌘,</kbd>
                                        </button>
                                    )}
                                </div>
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

            {/* Command Palette Modal */}
            {searchModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSearchModalOpen(false)}>
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
                            <span className="material-symbols-outlined text-slate-400 text-[24px]">search</span>
                            <input id="cmd-search-input" type="text" value={cmdQuery} onChange={e => setCmdQuery(e.target.value)}
                                placeholder="Tìm kiếm trang, tours, điểm đến..."
                                className="flex-1 text-lg font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                                autoComplete="off" spellCheck={false} />
                            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-500 font-mono">ESC</kbd>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto w-full p-2 bg-slate-50/50">
                            {cmdQuery.trim().length < 2 ? (
                                <div className="p-2 space-y-4">
                                    {visibleCommandGroups.map(group => (
                                        <div key={group.title}>
                                            <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.title}</p>
                                            {group.actions.map(act => (
                                                <button key={`${group.title}-${act.href}-${act.label}`} onClick={() => handleActionClick(act.href)}
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
                                    ))}
                                </div>
                            ) : searchLoading ? (
                                <div className="p-2 flex flex-col items-center justify-center py-12 text-slate-400">
                                    <span className="material-symbols-outlined text-3xl mb-3 animate-spin">progress_activity</span>
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
                                                    <button key={t.id} onClick={() => handleActionClick('/admin/tours')}
                                                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left group ${idx > 0 ? 'border-t border-slate-50' : ''}`}>
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
                                                    <button key={d.id} onClick={() => handleActionClick('/admin/tours')}
                                                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50 transition-colors text-left group ${idx > 0 ? 'border-t border-slate-50' : ''}`}>
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

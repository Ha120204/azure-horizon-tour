'use client';
import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import type { Notif, NotifType, TabKey } from './types';
import { TABS, canAccessRole } from './constants';
import NotifItem from './NotifItem';

interface NotificationPanelProps {
    notifs: Notif[];
    readIds: Set<string>;
    isLoading: boolean;
    hasError: boolean;
    userRole: string;
    onRefresh: () => void;
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onClose: () => void;
}

export default function NotificationPanel({
    notifs, readIds, isLoading, hasError, userRole, onRefresh, onMarkRead, onMarkAllRead, onClose,
}: NotificationPanelProps) {
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

    const tabUnread = (types: NotifType[]) =>
        roleScopedNotifs.filter(n => types.includes(n.type) && !readIds.has(n.id)).length;

    const activeTabMeta = visibleTabs.find(t => t.key === activeTab) ?? visibleTabs[0] ?? TABS[0];
    const activeTypes = activeTabMeta.key === 'all' ? [...permittedTypes] : activeTabMeta.types;
    const filtered = roleScopedNotifs.filter(n => activeTypes.includes(n.type));

    const isToday = (iso: string) => {
        const d = new Date(iso), now = new Date();
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const todayList = filtered.filter(n => isToday(n.time));
    const olderList = filtered.filter(n => !isToday(n.time));

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
            <div className="flex items-center gap-0.5 px-3 pt-2 pb-0 border-b border-slate-100 bg-white flex-shrink-0 overflow-x-auto hide-scrollbar">
                {visibleTabs.map(tab => {
                    const count = tabUnread(tab.types);
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex flex-shrink-0 items-center gap-1.5 px-2.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
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
                    <div className="flex flex-col items-center justify-center py-14 text-slate-300">
                        <span className="material-symbols-outlined text-5xl mb-3">notifications_off</span>
                        <p className="text-sm font-medium">Không có thông báo nào</p>
                    </div>
                ) : (
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

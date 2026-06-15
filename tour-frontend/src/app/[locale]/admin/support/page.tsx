'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminRealtime } from '@/hooks/admin/useAdminRealtime';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { SupportConversationPanel } from './_components/SupportConversationPanel';
import { SupportSidebar } from './_components/SupportSidebar';
import { SupportTicketList } from './_components/SupportTicketList';
import { EMPTY_KPI, POLL_INTERVAL_MS } from './_lib/config';
import {
    isOpenTicket,
    normalizeTicket,
    readApiError,
    resolveInitialAssignee,
    resolveInitialCategory,
    resolveInitialStatus,
    resolveInitialView,
    resolveReply,
    resolveStats,
    resolveTicket,
} from './_lib/helpers';
import type {
    FetchTicketsOptions,
    Kpi,
    ReplyResponse,
    StatsResponse,
    Ticket,
    TicketAssignee,
    TicketCategory,
    TicketListResponse,
    TicketResponse,
    TicketSort,
    TicketStatus,
    TicketView,
} from './_lib/types';

const PAGE_LIMIT = 20;

export default function SupportPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [kpi, setKpi] = useState<Kpi>(EMPTY_KPI);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Ticket | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState('');
    const [actionNotice, setActionNotice] = useState('');
    const [replyError, setReplyError] = useState('');
    const [search, setSearch] = useState(searchParams.get('search') ?? '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') ?? '');
    const [activeStatus, setActiveStatus] = useState<TicketStatus | 'ALL'>(() => resolveInitialStatus(searchParams.get('status')));
    const [activeCategory, setActiveCategory] = useState<TicketCategory | 'ALL'>(() => resolveInitialCategory(searchParams.get('category')));
    const [activeView, setActiveView] = useState<TicketView>(() => resolveInitialView(searchParams.get('view')));
    const [activeAssignee, setActiveAssignee] = useState<TicketAssignee>(() => resolveInitialAssignee(searchParams.get('assigned')));
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [page, setPage] = useState(() => {
        const p = parseInt(searchParams.get('page') ?? '1', 10);
        return isNaN(p) || p < 1 ? 1 : p;
    });
    const [totalPages, setTotalPages] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [sort, setSort] = useState<TicketSort>(() => {
        const s = searchParams.get('sort');
        return s === 'oldest' || s === 'overdue' ? s : 'updated';
    });
    const [replyIsInternal, setReplyIsInternal] = useState(false);

    const selectedTicketId = selected?.id;
    const selectedTicketStatus = selected?.status;

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (activeStatus !== 'ALL') params.set('status', activeStatus);
        if (activeCategory !== 'ALL') params.set('category', activeCategory);
        if (activeView !== 'ALL') params.set('view', activeView === 'OPEN' ? 'open' : 'overdue');
        if (activeAssignee !== 'ALL') params.set('assigned', activeAssignee === 'ME' ? 'me' : 'none');
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (page > 1) params.set('page', page.toString());
        if (sort !== 'updated') params.set('sort', sort);
        const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [activeAssignee, activeCategory, activeStatus, activeView, debouncedSearch, page, pathname, router, sort]);

    const fetchTickets = useCallback(async (options: FetchTicketsOptions = {}) => {
        if (!options.silent) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeStatus !== 'ALL') params.set('status', activeStatus);
            if (activeCategory !== 'ALL') params.set('category', activeCategory);
            if (activeView !== 'ALL') params.set('view', activeView === 'OPEN' ? 'open' : 'overdue');
            if (activeAssignee !== 'ALL') params.set('assigned', activeAssignee === 'ME' ? 'me' : 'none');
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (sort !== 'updated') params.set('sort', sort);
            params.set('page', page.toString());
            params.set('limit', PAGE_LIMIT.toString());

            const [ticketsRes, statsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/support/tickets?${params}`),
                fetchWithAuth(`${API_BASE_URL}/support/stats`),
            ]);
            if (!ticketsRes.ok) throw new Error(await readApiError(ticketsRes, 'Không thể tải danh sách ticket'));
            if (!statsRes.ok) throw new Error(await readApiError(statsRes, 'Không thể tải thống kê hỗ trợ'));

            const json = (await ticketsRes.json()) as TicketListResponse;
            const statsJson = (await statsRes.json()) as StatsResponse;
            const data = json?.data ?? json;
            const nextTickets = ((data.tickets ?? []) as Ticket[]).map(normalizeTicket);
            const newTotalPages = data.meta?.totalPages ?? 1;

            setTickets(nextTickets);
            setTotalPages(newTotalPages);
            if (newTotalPages > 0 && page > newTotalPages) setPage(1);
            setKpi({ ...EMPTY_KPI, ...resolveStats(statsJson) });
            setLastSyncedAt(new Date());
            setSelected((prev) => {
                if (nextTickets.length === 0) return null;
                const sameTicket = nextTickets.find((ticket) => ticket.id === prev?.id);
                if (sameTicket && prev) {
                    return { ...sameTicket, replies: prev.replies ?? sameTicket.replies };
                }
                return nextTickets[0];
            });
            if (!options.silent) setActionError('');
        } catch (error) {
            if (!options.silent) {
                setTickets([]);
                setSelected(null);
                setActionError(error instanceof Error ? error.message : 'Không thể tải dữ liệu hỗ trợ');
            }
        } finally {
            if (!options.silent) setLoading(false);
        }
    }, [activeStatus, activeCategory, activeView, activeAssignee, debouncedSearch, page, sort]);

    const fetchSelectedDetail = useCallback(async (ticketId: number) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets/${ticketId}`);
            if (!res.ok) return;

            const json = (await res.json()) as TicketResponse;
            const resolvedTicket = resolveTicket(json);
            if (!resolvedTicket) return;

            const nextTicket = normalizeTicket(resolvedTicket);
            setSelected((prev) => (prev?.id === ticketId ? nextTicket : prev));
            setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, ...nextTicket } : ticket)));
            setLastSyncedAt(new Date());
        } catch {
            // Polling is best-effort; keep the current admin thread visible.
        }
    }, []);
    const shouldRefreshFromRealtime = useCallback((detail: { resourceType: string; type: string; href?: string | null }) => (
        detail.resourceType === 'SupportTicket' ||
        detail.type.startsWith('support_') ||
        detail.href?.startsWith('/admin/support') === true
    ), []);
    const refreshSupportFromRealtime = useCallback(async () => {
        await fetchTickets({ silent: true });
        if (selectedTicketId && isOpenTicket(selectedTicketStatus)) {
            await fetchSelectedDetail(selectedTicketId);
        }
    }, [fetchSelectedDetail, fetchTickets, selectedTicketId, selectedTicketStatus]);

    useAdminRealtime({
        onRefresh: refreshSupportFromRealtime,
        shouldRefresh: shouldRefreshFromRealtime,
        pause: sending || statusUpdatingId !== null,
    });

    useEffect(() => {
        void fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        const pollSupportDesk = () => {
            if (document.visibilityState !== 'visible') return;
            void fetchTickets({ silent: true });
            if (selectedTicketId && isOpenTicket(selectedTicketStatus)) {
                void fetchSelectedDetail(selectedTicketId);
            }
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') pollSupportDesk();
        };

        const intervalId = window.setInterval(pollSupportDesk, POLL_INTERVAL_MS);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchSelectedDetail, fetchTickets, selectedTicketId, selectedTicketStatus]);

    const handleSelect = async (ticket: Ticket) => {
        setActionError('');
        setActionNotice('');
        setReplyError('');
        setReplyIsInternal(false);
        setSelected(ticket);
        setPanelOpen(true);
        await fetchSelectedDetail(ticket.id);
    };

    const handleStatusChange = async (id: number, status: TicketStatus) => {
        if (statusUpdatingId !== null || selected?.status === status) return;
        setStatusUpdatingId(id);
        setActionError('');
        setActionNotice('');
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error(await readApiError(res, 'Không thể cập nhật trạng thái ticket'));

            const json = (await res.json()) as TicketResponse;
            const updatedTicket = resolveTicket(json);
            const nextStatus = updatedTicket?.status ?? status;
            setSelected((prev) => prev ? { ...prev, ...updatedTicket, status: nextStatus } : prev);
            setTickets((prev) => prev.map((ticket) => ticket.id === id ? { ...ticket, ...updatedTicket, status: nextStatus } : ticket));
            setActionNotice('Đã cập nhật trạng thái ticket.');
            void fetchTickets({ silent: true });
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái ticket');
        } finally {
            setStatusUpdatingId(null);
        }
    };

    const handleAssign = async (id: number) => {
        setActionError('');
        setActionNotice('');
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets/${id}/assign`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error(await readApiError(res, 'Không thể nhận ticket'));
            setActionNotice('Đã nhận ticket về cho bạn.');
            await fetchSelectedDetail(id);
            void fetchTickets({ silent: true });
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Không thể nhận ticket');
        }
    };

    const handleSendReply = async () => {
        if (!reply.trim() || !selected) return;
        setSending(true);
        setActionError('');
        setActionNotice('');
        setReplyError('');
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets/${selected.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: reply.trim(), isInternal: replyIsInternal }),
            });
            if (!res.ok) throw new Error(await readApiError(res, 'Không thể gửi phản hồi'));

            const json = (await res.json()) as ReplyResponse;
            const newReply = resolveReply(json);
            setSelected((prev) => prev ? { ...prev, status: 'IN_PROGRESS', replies: [...(prev.replies ?? []), newReply] } : prev);
            setTickets((prev) => prev.map((ticket) => ticket.id === selected.id ? { ...ticket, status: 'IN_PROGRESS' } : ticket));
            setReply('');
            setReplyIsInternal(false);
            setActionNotice(replyIsInternal ? 'Đã lưu ghi chú nội bộ.' : 'Đã gửi phản hồi cho khách hàng.');
            void fetchTickets({ silent: true });
        } catch (error) {
            setReplyError(error instanceof Error ? error.message : 'Không thể gửi phản hồi');
        } finally {
            setSending(false);
        }
    };

    const counts = {
        ALL: kpi.total,
        NEW: kpi.new,
        IN_PROGRESS: kpi.inProgress,
        RESOLVED: kpi.resolved,
    };

    const categoryCounts = useMemo(() => {
        return tickets.reduce((acc, ticket) => {
            acc[ticket.category] = (acc[ticket.category] ?? 0) + 1;
            return acc;
        }, {} as Partial<Record<TicketCategory, number>>);
    }, [tickets]);

    const handleSearchChange = (value: string) => {
        setPage(1);
        setSearch(value);
    };

    const handleCategoryChange = (category: TicketCategory | 'ALL') => {
        setPage(1);
        setActiveCategory(category);
    };

    const handleStatusFilterChange = (status: TicketStatus | 'ALL') => {
        setPage(1);
        setActiveView('ALL');
        setActiveStatus(status);
    };

    const handleViewToggle = (view: Exclude<TicketView, 'ALL'>) => {
        setPage(1);
        setActiveStatus('ALL');
        setActiveView((current) => current === view ? 'ALL' : view);
    };

    const handleAssigneeChange = (assignee: TicketAssignee) => {
        setPage(1);
        setActiveAssignee(assignee);
    };

    const sharedSidebarProps = {
        search,
        counts,
        activeStatus,
        activeCategory,
        activeView,
        categoryCounts,
        onSearchChange: handleSearchChange,
        onStatusChange: handleStatusFilterChange,
        onCategoryChange: handleCategoryChange,
    };

    const sharedPanelProps = {
        selected,
        reply,
        sending,
        statusUpdatingId,
        replyError,
        replyIsInternal,
        onStatusChange: (id: number, status: TicketStatus) => void handleStatusChange(id, status),
        onReplyChange: setReply,
        onSendReply: () => void handleSendReply(),
        onAssign: (id: number) => void handleAssign(id),
        onSetInternal: setReplyIsInternal,
    };

    return (
        <>
            <main className="flex h-[calc(100dvh-68px)] max-h-[calc(100dvh-68px)] min-h-0 flex-1 overflow-hidden bg-surface text-on-surface">
                <SupportSidebar {...sharedSidebarProps} />

                <SupportTicketList
                    tickets={tickets}
                    kpi={kpi}
                    loading={loading}
                    selectedId={selected?.id ?? null}
                    activeView={activeView}
                    lastSyncedAt={lastSyncedAt}
                    actionError={actionError}
                    actionNotice={actionNotice}
                    currentPage={page}
                    totalPages={totalPages}
                    sort={sort}
                    activeAssignee={activeAssignee}
                    onAssigneeChange={handleAssigneeChange}
                    onViewToggle={handleViewToggle}
                    onSelect={(ticket) => void handleSelect(ticket)}
                    onPageChange={setPage}
                    onFilterOpen={() => setSidebarOpen(true)}
                    onSortChange={setSort}
                />

                <SupportConversationPanel {...sharedPanelProps} />
            </main>

            {/* Filter sidebar drawer — hiện dưới xl */}
            <div className={`fixed inset-0 z-50 xl:hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                <div className={`absolute inset-y-0 left-0 flex w-72 flex-col shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <SupportSidebar {...sharedSidebarProps} drawer onSearchChange={(v) => { handleSearchChange(v); }} onStatusChange={(s) => { handleStatusFilterChange(s); setSidebarOpen(false); }} onCategoryChange={(c) => { handleCategoryChange(c); setSidebarOpen(false); }} />
                </div>
            </div>

            {/* Conversation panel drawer — hiện dưới lg */}
            <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/50" onClick={() => setPanelOpen(false)} />
                <div className={`absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-2xl transition-transform duration-300 sm:w-[440px] ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="shrink-0 flex items-center gap-2 border-b border-outline-variant/30 bg-surface px-4 py-3">
                        <button
                            type="button"
                            onClick={() => setPanelOpen(false)}
                            className="flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        >
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
                            Danh sách
                        </button>
                    </div>
                    <SupportConversationPanel {...sharedPanelProps} drawer />
                </div>
            </div>
        </>
    );
}

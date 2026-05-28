'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { API_BASE_URL } from '@/lib/constants';
import { SupportConversationPanel } from './_components/SupportConversationPanel';
import { SupportSidebar } from './_components/SupportSidebar';
import { SupportTicketList } from './_components/SupportTicketList';
import { EMPTY_KPI, POLL_INTERVAL_MS } from './_lib/config';
import {
    isOpenTicket,
    normalizeTicket,
    readApiError,
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
    TicketCategory,
    TicketListResponse,
    TicketResponse,
    TicketStatus,
    TicketView,
} from './_lib/types';

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
    const [search, setSearch] = useState(searchParams.get('search') ?? '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') ?? '');
    const [activeStatus, setActiveStatus] = useState<TicketStatus | 'ALL'>(() => resolveInitialStatus(searchParams.get('status')));
    const [activeCategory, setActiveCategory] = useState<TicketCategory | 'ALL'>(() => resolveInitialCategory(searchParams.get('category')));
    const [activeView, setActiveView] = useState<TicketView>(() => resolveInitialView(searchParams.get('view')));
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

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
        if (debouncedSearch) params.set('search', debouncedSearch);
        const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [activeCategory, activeStatus, activeView, debouncedSearch, pathname, router]);

    const fetchTickets = useCallback(async (options: FetchTicketsOptions = {}) => {
        if (!options.silent) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeStatus !== 'ALL') params.set('status', activeStatus);
            if (activeCategory !== 'ALL') params.set('category', activeCategory);
            if (activeView !== 'ALL') params.set('view', activeView === 'OPEN' ? 'open' : 'overdue');
            if (debouncedSearch) params.set('search', debouncedSearch);

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

            setTickets(nextTickets);
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
    }, [activeStatus, activeCategory, activeView, debouncedSearch]);

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
        setSelected(ticket);
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

    const handleSendReply = async () => {
        if (!reply.trim() || !selected) return;
        setSending(true);
        setActionError('');
        setActionNotice('');
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets/${selected.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: reply.trim() }),
            });
            if (!res.ok) throw new Error(await readApiError(res, 'Không thể gửi phản hồi'));

            const json = (await res.json()) as ReplyResponse;
            const newReply = resolveReply(json);
            setSelected((prev) => prev ? { ...prev, status: 'IN_PROGRESS', replies: [...(prev.replies ?? []), newReply] } : prev);
            setTickets((prev) => prev.map((ticket) => ticket.id === selected.id ? { ...ticket, status: 'IN_PROGRESS' } : ticket));
            setReply('');
            setActionNotice('Đã gửi phản hồi cho khách hàng.');
            void fetchTickets({ silent: true });
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Không thể gửi phản hồi');
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

    const handleStatusFilterChange = (status: TicketStatus | 'ALL') => {
        setActiveView('ALL');
        setActiveStatus(status);
    };

    const handleViewToggle = (view: Exclude<TicketView, 'ALL'>) => {
        setActiveStatus('ALL');
        setActiveView((current) => current === view ? 'ALL' : view);
    };

    return (
        <main className="flex h-[calc(100dvh-68px)] max-h-[calc(100dvh-68px)] min-h-0 flex-1 overflow-hidden bg-surface text-on-surface">
            <SupportSidebar
                search={search}
                counts={counts}
                activeStatus={activeStatus}
                activeCategory={activeCategory}
                activeView={activeView}
                categoryCounts={categoryCounts}
                onSearchChange={setSearch}
                onStatusChange={handleStatusFilterChange}
                onCategoryChange={setActiveCategory}
            />

            <SupportTicketList
                tickets={tickets}
                kpi={kpi}
                loading={loading}
                selectedId={selected?.id ?? null}
                activeView={activeView}
                lastSyncedAt={lastSyncedAt}
                actionError={actionError}
                actionNotice={actionNotice}
                onViewToggle={handleViewToggle}
                onSelect={(ticket) => void handleSelect(ticket)}
            />

            <SupportConversationPanel
                selected={selected}
                reply={reply}
                sending={sending}
                statusUpdatingId={statusUpdatingId}
                onStatusChange={(id, status) => void handleStatusChange(id, status)}
                onReplyChange={setReply}
                onSendReply={() => void handleSendReply()}
            />
        </main>
    );
}

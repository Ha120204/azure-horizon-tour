'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import { API_BASE_URL } from '@/app/lib/constants';

type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
type TicketCategory = 'booking' | 'payment' | 'reschedule' | 'complaint' | 'general';

interface Reply {
    id: number;
    senderType: string;
    senderName: string;
    content: string;
    createdAt: string;
}

interface Ticket {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    bookingRef?: string;
    category: TicketCategory;
    subject: string;
    message: string;
    status: TicketStatus;
    assignedStaffId?: number;
    createdAt: string;
    replies: Reply[];
}

interface Kpi {
    total: number;
    new: number;
    inProgress: number;
    resolved: number;
    open: number;
    overdue: number;
    avgFirstResponseMinutes: number | null;
}

const EMPTY_KPI: Kpi = {
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    open: 0,
    overdue: 0,
    avgFirstResponseMinutes: null,
};

const AVATAR_COLORS = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-orange-400 to-rose-500',
    'from-teal-400 to-cyan-600',
    'from-emerald-400 to-green-600',
];

const CAT: Record<TicketCategory, { label: string; color: string; dot: string; soft: string }> = {
    booking: { label: 'Đặt tour', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', soft: 'bg-purple-50 border-purple-100' },
    payment: { label: 'Thanh toán', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', soft: 'bg-emerald-50 border-emerald-100' },
    reschedule: { label: 'Đổi lịch', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', soft: 'bg-orange-50 border-orange-100' },
    complaint: { label: 'Khiếu nại', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', soft: 'bg-red-50 border-red-100' },
    general: { label: 'Câu hỏi chung', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', soft: 'bg-slate-50 border-slate-100' },
};

const STS: Record<TicketStatus, { label: string; dot: string; text: string; tone: string; icon: string }> = {
    NEW: { label: 'Mới', dot: 'bg-blue-500', text: 'text-blue-700', tone: 'bg-blue-50 text-blue-700 border-blue-100', icon: 'fiber_new' },
    IN_PROGRESS: { label: 'Đang xử lý', dot: 'bg-amber-500', text: 'text-amber-700', tone: 'bg-amber-50 text-amber-700 border-amber-100', icon: 'pending_actions' },
    RESOLVED: { label: 'Đã giải quyết', dot: 'bg-slate-400', text: 'text-slate-500', tone: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'check_circle' },
};

const statusOptions: { key: TicketStatus | 'ALL'; label: string; icon: string }[] = [
    { key: 'ALL', label: 'Tất cả', icon: 'inbox' },
    { key: 'NEW', label: 'Mới', icon: 'fiber_new' },
    { key: 'IN_PROGRESS', label: 'Đang xử lý', icon: 'pending_actions' },
    { key: 'RESOLVED', label: 'Đã giải quyết', icon: 'check_circle' },
];

function normalizeTicket(ticket: Ticket): Ticket {
    return { ...ticket, replies: Array.isArray(ticket.replies) ? ticket.replies : [] };
}

function getInitials(name: string) {
    const parts = name.trim().split(' ').filter(Boolean);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
}

function fmtTime(iso: string) {
    const date = new Date(iso);
    const diff = (Date.now() - date.getTime()) / 60000;
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${Math.floor(diff)} phút trước`;
    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function fmtResponse(minutes: number | null) {
    if (minutes == null) return '—';
    if (minutes < 60) return `${minutes}p`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}p` : `${hours}h`;
}

export default function SupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [kpi, setKpi] = useState<Kpi>(EMPTY_KPI);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Ticket | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const [activeStatus, setActiveStatus] = useState<TicketStatus | 'ALL'>('ALL');
    const [activeCategory, setActiveCategory] = useState<TicketCategory | 'ALL'>('ALL');
    const threadRef = useRef<HTMLDivElement>(null);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (activeStatus !== 'ALL') qs.set('status', activeStatus);
            if (activeCategory !== 'ALL') qs.set('category', activeCategory);
            if (search.trim()) qs.set('search', search.trim());

            const [ticketsRes, statsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/support/tickets?${qs}`),
                fetchWithAuth(`${API_BASE_URL}/support/stats`),
            ]);
            const json = await ticketsRes.json();
            const statsJson = await statsRes.json();
            const data = json?.data ?? json;
            const nextTickets = ((data.tickets ?? []) as Ticket[]).map(normalizeTicket);

            setTickets(nextTickets);
            setKpi({ ...EMPTY_KPI, ...(statsJson?.data ?? statsJson) });
            setSelected((prev) => {
                if (nextTickets.length === 0) return null;
                const sameTicket = nextTickets.find((ticket) => ticket.id === prev?.id);
                if (sameTicket && prev) {
                    return { ...sameTicket, replies: prev.replies ?? sameTicket.replies };
                }
                return nextTickets[0];
            });
        } catch {
            setTickets([]);
            setSelected(null);
        } finally {
            setLoading(false);
        }
    }, [activeStatus, activeCategory, search]);

    useEffect(() => {
        void fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }, [selected]);

    const handleSelect = async (ticket: Ticket) => {
        setSelected(ticket);
        const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets/${ticket.id}`);
        const json = await res.json();
        setSelected(normalizeTicket(json?.data ?? json ?? ticket));
    };

    const handleStatusChange = async (id: number, status: TicketStatus) => {
        await fetchWithAuth(`${API_BASE_URL}/support/tickets/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        setSelected((prev) => prev ? { ...prev, status } : prev);
        setTickets((prev) => prev.map((ticket) => ticket.id === id ? { ...ticket, status } : ticket));
        void fetchTickets();
    };

    const handleSendReply = async () => {
        if (!reply.trim() || !selected) return;
        setSending(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets/${selected.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: reply.trim() }),
            });
            const json = await res.json();
            const newReply: Reply = json?.data ?? json;
            setSelected((prev) => prev ? { ...prev, status: 'IN_PROGRESS', replies: [...(prev.replies ?? []), newReply] } : prev);
            setTickets((prev) => prev.map((ticket) => ticket.id === selected.id ? { ...ticket, status: 'IN_PROGRESS' } : ticket));
            setReply('');
            void fetchTickets();
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

    const selectedCategory = selected ? CAT[selected.category] ?? CAT.general : CAT.general;
    const selectedStatus = selected ? STS[selected.status] : null;

    return (
        <main className="flex h-[calc(100dvh-68px)] max-h-[calc(100dvh-68px)] min-h-0 flex-1 overflow-hidden bg-surface text-on-surface">
            <aside className="hidden min-h-0 w-72 shrink-0 flex-col border-r border-outline-variant/40 bg-surface-container-lowest xl:flex">
                <div className="shrink-0 border-b border-outline-variant/30 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Support Desk</p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Hỗ trợ khách hàng</h1>
                    <p className="mt-1 text-sm text-on-surface-variant">Điều phối ticket, phản hồi và theo dõi SLA.</p>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-5">
                    <div className="relative">
                        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm ticket..."
                            className="h-11 w-full rounded-xl border border-outline-variant/40 bg-surface px-10 text-sm font-semibold text-on-surface outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 placeholder:text-outline"
                        />
                    </div>

                    <section>
                        <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.16em] text-outline">Trạng thái</p>
                        <div className="space-y-1.5">
                            {statusOptions.map((option) => {
                                const active = activeStatus === option.key;
                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setActiveStatus(option.key)}
                                        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
                                            active
                                                ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                                                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[19px]">{option.icon}</span>
                                        <span className="flex-1 text-left">{option.label}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${active ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'}`}>
                                            {counts[option.key].toLocaleString('vi-VN')}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.16em] text-outline">Danh mục</p>
                        <div className="space-y-1">
                            <button
                                type="button"
                                onClick={() => setActiveCategory('ALL')}
                                className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
                                    activeCategory === 'ALL' ? 'bg-surface-container text-on-surface ring-1 ring-outline-variant/40' : 'text-on-surface-variant hover:bg-surface-container-low'
                                }`}
                            >
                                <span className="h-2 w-2 rounded-full bg-outline" />
                                <span className="flex-1 text-left">Tất cả danh mục</span>
                            </button>
                            {(Object.entries(CAT) as [TicketCategory, typeof CAT[TicketCategory]][]).map(([key, category]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setActiveCategory(key)}
                                    className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
                                        activeCategory === key ? 'bg-surface-container text-on-surface ring-1 ring-outline-variant/40' : 'text-on-surface-variant hover:bg-surface-container-low'
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${category.dot}`} />
                                    <span className="flex-1 text-left">{category.label}</span>
                                    <span className="text-[11px] font-black text-outline">{categoryCounts[key] ?? 0}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="shrink-0 border-t border-outline-variant/30 p-5">
                    <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <div className="flex items-center gap-2 text-sm font-black text-primary">
                            <span className="material-symbols-outlined text-[18px]">support_agent</span>
                            Quy trình phản hồi
                        </div>
                        <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                            Ưu tiên ticket mới, chuyển sang đang xử lý khi phản hồi và đóng khi khách đã được hỗ trợ xong.
                        </p>
                    </div>
                </div>
            </aside>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-outline-variant/40 bg-surface">
                <div className="shrink-0 border-b border-outline-variant/30 bg-surface-container-lowest p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {[
                            { label: 'Ticket đang mở', value: kpi.open.toLocaleString('vi-VN'), icon: 'confirmation_number', tone: 'text-primary bg-primary/10' },
                            { label: 'Phản hồi trung bình', value: fmtResponse(kpi.avgFirstResponseMinutes), icon: 'timer', tone: 'text-emerald-700 bg-emerald-50' },
                            { label: 'Quá hạn SLA', value: kpi.overdue.toLocaleString('vi-VN'), icon: 'warning', tone: 'text-red-700 bg-red-50' },
                        ].map((item) => (
                            <div key={item.label} className="rounded-2xl border border-outline-variant/30 bg-surface px-4 py-3 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-on-surface-variant">{item.label}</p>
                                        <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{item.value}</p>
                                    </div>
                                    <span className={`material-symbols-outlined grid h-10 w-10 place-items-center rounded-2xl text-[20px] ${item.tone}`}>
                                        {item.icon}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                        {loading && Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="animate-pulse rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4">
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 rounded-full bg-surface-container-high" />
                                    <div className="flex-1 space-y-3">
                                        <div className="h-3 w-1/3 rounded bg-surface-container-high" />
                                        <div className="h-3 rounded bg-surface-container" />
                                        <div className="h-3 w-2/3 rounded bg-surface-container" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!loading && tickets.length === 0 && (
                            <div className="grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-lowest text-center">
                                <div>
                                    <span className="material-symbols-outlined text-5xl text-outline">inbox</span>
                                    <p className="mt-3 text-sm font-bold text-on-surface">Không có ticket phù hợp</p>
                                    <p className="mt-1 text-xs text-on-surface-variant">Thử đổi trạng thái, danh mục hoặc từ khóa tìm kiếm.</p>
                                </div>
                            </div>
                        )}

                        {!loading && tickets.map((ticket, index) => {
                            const category = CAT[ticket.category] ?? CAT.general;
                            const status = STS[ticket.status];
                            const active = selected?.id === ticket.id;
                            const resolved = ticket.status === 'RESOLVED';
                            const avatar = AVATAR_COLORS[index % AVATAR_COLORS.length];

                            return (
                                <button
                                    key={ticket.id}
                                    type="button"
                                    onClick={() => void handleSelect(ticket)}
                                    className={`w-full rounded-2xl border p-4 text-left transition ${
                                        active
                                            ? 'border-primary/30 bg-primary/5 shadow-sm ring-2 ring-primary/10'
                                            : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/20 hover:bg-surface'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatar} text-sm font-black text-white ${resolved ? 'grayscale opacity-60' : ''}`}>
                                            {getInitials(ticket.customerName)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className={`truncate text-base font-black ${resolved ? 'text-slate-500' : 'text-slate-950'}`}>{ticket.customerName}</p>
                                                    <p className="text-xs font-semibold text-outline">#{ticket.id} · {fmtTime(ticket.createdAt)}</p>
                                                </div>
                                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${category.color}`}>{category.label}</span>
                                            </div>
                                            <p className={`mt-3 line-clamp-2 text-sm leading-6 ${resolved ? 'text-slate-400' : 'text-on-surface-variant'}`}>
                                                {ticket.message}
                                            </p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                                                <span className={`text-[11px] font-black uppercase tracking-[0.12em] ${status.text}`}>{status.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="hidden min-h-0 w-[440px] shrink-0 flex-col bg-surface-container-lowest lg:flex">
                {!selected || !selectedStatus ? (
                    <div className="grid flex-1 place-items-center text-center">
                        <div>
                            <span className="material-symbols-outlined text-6xl text-outline">forum</span>
                            <p className="mt-3 text-sm font-bold text-on-surface">Chọn một ticket</p>
                            <p className="mt-1 text-xs text-on-surface-variant">Nội dung hội thoại sẽ hiển thị ở đây.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="shrink-0 border-b border-outline-variant/30 bg-surface px-5 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[selected.id % AVATAR_COLORS.length]} text-sm font-black text-white`}>
                                        {getInitials(selected.customerName)}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-lg font-black text-slate-950">{selected.customerName}</h2>
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${selectedCategory.color}`}>{selectedCategory.label}</span>
                                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${selectedStatus.tone}`}>{selectedStatus.label}</span>
                                        </div>
                                    </div>
                                </div>
                                <select
                                    value={selected.status}
                                    onChange={(event) => void handleStatusChange(selected.id, event.target.value as TicketStatus)}
                                    className="h-9 rounded-xl border border-outline-variant/40 bg-surface px-3 text-xs font-black text-on-surface outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                                >
                                    <option value="NEW">Mới</option>
                                    <option value="IN_PROGRESS">Đang xử lý</option>
                                    <option value="RESOLVED">Đã giải quyết</option>
                                </select>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="font-bold text-outline">Email</p>
                                    <p className="mt-1 truncate font-semibold text-on-surface">{selected.customerEmail}</p>
                                </div>
                                <div>
                                    <p className="font-bold text-outline">Điện thoại</p>
                                    <p className="mt-1 font-semibold text-on-surface">{selected.customerPhone || '—'}</p>
                                </div>
                                <div className={`col-span-2 rounded-2xl border p-3 ${selected.bookingRef ? 'border-primary/20 bg-primary/5' : 'border-outline-variant/30 bg-surface-container-low'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-outline">Booking ref</p>
                                            <p className="mt-1 font-mono text-sm font-black text-slate-950">{selected.bookingRef || 'Chưa liên kết booking'}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-[18px] text-outline">confirmation_number</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div ref={threadRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                            <div className="flex justify-center">
                                <div className="rounded-full border border-outline-variant/30 bg-surface px-3 py-1 text-[11px] font-semibold text-on-surface-variant">
                                    Ticket #{selected.id} · {new Date(selected.createdAt).toLocaleString('vi-VN')}
                                </div>
                            </div>

                            <div className="flex max-w-[92%] gap-3">
                                <div className={`mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[selected.id % AVATAR_COLORS.length]} text-[10px] font-black text-white`}>
                                    {getInitials(selected.customerName)}
                                </div>
                                <div className="flex flex-col items-start gap-1">
                                    <p className="ml-1 text-[11px] font-semibold text-outline">{selected.customerName} · {fmtTime(selected.createdAt)}</p>
                                    <div className="rounded-2xl rounded-bl-md border border-outline-variant/30 bg-surface px-4 py-3 text-sm leading-6 text-on-surface shadow-sm">
                                        {selected.message}
                                    </div>
                                </div>
                            </div>

                            {(selected.replies ?? []).map((item, index) => {
                                const staff = item.senderType === 'staff';
                                return (
                                    <div key={item.id ?? `reply-${index}`} className={`flex max-w-[92%] gap-3 ${staff ? 'ml-auto justify-end' : ''}`}>
                                        {!staff && (
                                            <div className={`mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[selected.id % AVATAR_COLORS.length]} text-[10px] font-black text-white`}>
                                                {getInitials(selected.customerName)}
                                            </div>
                                        )}
                                        <div className={`flex flex-col gap-1 ${staff ? 'items-end' : 'items-start'}`}>
                                            <p className="mx-1 text-[11px] font-semibold text-outline">{item.senderName} · {fmtTime(item.createdAt)}</p>
                                            <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                                                staff
                                                    ? 'rounded-br-md bg-primary text-on-primary'
                                                    : 'rounded-bl-md border border-outline-variant/30 bg-surface text-on-surface'
                                            }`}>
                                                {item.content}
                                            </div>
                                        </div>
                                        {staff && (
                                            <div className="mt-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-black text-on-primary">NV</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="shrink-0 border-t border-outline-variant/30 bg-surface px-5 py-4">
                            <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm transition focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
                                <textarea
                                    value={reply}
                                    onChange={(event) => setReply(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void handleSendReply();
                                    }}
                                    placeholder="Soạn phản hồi..."
                                    rows={3}
                                    className="block w-full resize-none border-none bg-transparent p-4 text-sm font-medium leading-6 text-on-surface outline-none placeholder:text-outline focus:ring-0"
                                />
                                <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container-low px-3 py-2">
                                    <div className="flex items-center gap-1 text-outline">
                                        {['format_bold', 'attach_file', 'mood'].map((icon) => (
                                            <button key={icon} type="button" className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-surface-container hover:text-on-surface">
                                                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleSendReply()}
                                        disabled={!reply.trim() || sending}
                                        className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-on-primary transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {sending ? <span className="material-symbols-outlined text-[17px] animate-spin">progress_activity</span> : null}
                                        Gửi phản hồi
                                        <span className="material-symbols-outlined text-[16px]">send</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

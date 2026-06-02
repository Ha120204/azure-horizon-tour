'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { Link } from '@/i18n/routing';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';
import type { QuickStats, MyTour, MyTicket, BookingResult, Tone } from './staffDashboard/types';
import {
    toneClass, TOUR_STATUS, TICKET_STATUS, BOOKING_STATUS,
    formatVND, formatDate, formatTime, toObject, toArray, getNumber,
} from './staffDashboard/constants';

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}


function SectionHeader({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
                <h2 className="font-headline text-base font-bold text-slate-900">{title}</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>
            </div>
            <div className="shrink-0">{action}</div>
        </div>
    );
}

function EmptyState({
    icon,
    title,
    description,
    href,
    action,
}: {
    icon: string;
    title: string;
    description: string;
    href?: string;
    action?: string;
}) {
    return (
        <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <span className="material-symbols-outlined text-[26px]" aria-hidden="true">{icon}</span>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-800">{title}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{description}</p>
            {href && action ? (
                <Link href={href} className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                    {action}
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                </Link>
            ) : null}
        </div>
    );
}

function WorkQueueRow({
    icon,
    label,
    value,
    helper,
    href,
    tone,
    meta,
}: {
    icon: string;
    label: string;
    value: number;
    helper: string;
    href: string;
    tone: 'amber' | 'orange' | 'teal';
    meta: string;
}) {
    const styles = {
        amber: {
            icon: 'bg-amber-50 text-amber-700',
            value: value > 0 ? 'text-amber-700' : 'text-slate-400',
            badge: value > 0 ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-slate-100 text-slate-500 ring-slate-200',
        },
        orange: {
            icon: 'bg-orange-50 text-orange-700',
            value: value > 0 ? 'text-orange-700' : 'text-slate-400',
            badge: value > 0 ? 'bg-orange-50 text-orange-700 ring-orange-100' : 'bg-slate-100 text-slate-500 ring-slate-200',
        },
        teal: {
            icon: 'bg-teal-50 text-teal-700',
            value: value > 0 ? 'text-teal-700' : 'text-slate-400',
            badge: value > 0 ? 'bg-teal-50 text-teal-700 ring-teal-100' : 'bg-slate-100 text-slate-500 ring-slate-200',
        },
    }[tone];

    return (
        <Link
            href={href}
            aria-label={`${label}: ${value.toLocaleString('vi-VN')}. ${helper}`}
            className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 transition hover:border-blue-100 hover:bg-blue-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:grid-cols-[auto_minmax(0,1fr)_96px_112px_auto]"
        >
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${styles.icon}`}>
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{label}</span>
                <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{helper}</span>
            </span>
            <span className={`hidden justify-self-end font-headline text-2xl font-bold tracking-tight sm:block ${styles.value}`}>
                {value.toLocaleString('vi-VN')}
            </span>
            <span className={`hidden w-fit justify-self-end rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ring-1 sm:inline-flex ${styles.badge}`}>
                {meta}
            </span>
            <span className="flex items-center gap-2">
                <span className={`font-headline text-xl font-bold sm:hidden ${styles.value}`}>{value.toLocaleString('vi-VN')}</span>
                <span className="material-symbols-outlined text-[18px] text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true">arrow_forward</span>
            </span>
        </Link>
    );
}

function CompactMetricCard({
    icon,
    label,
    value,
    helper,
    href,
    tone,
}: {
    icon: string;
    label: string;
    value: number;
    helper: string;
    href: string;
    tone: Tone;
}) {
    const t = toneClass[tone];
    return (
        <Link
            href={href}
            aria-label={`${label}: ${value.toLocaleString('vi-VN')}. ${helper}`}
            className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
            <div className="flex items-start justify-between gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.icon}`}>
                    <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </span>
                <span className="material-symbols-outlined text-[17px] text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true">arrow_forward</span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
                <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</span>
                    <span className="mt-1 block truncate text-xs font-medium text-slate-500">{helper}</span>
                </span>
                <span className="font-headline text-2xl font-bold tracking-tight text-slate-950">{value.toLocaleString('vi-VN')}</span>
            </div>
        </Link>
    );
}

export default function StaffDashboard({ staffName }: { staffName: string }) {
    const [stats, setStats] = useState<QuickStats | null>(null);
    const [myTours, setMyTours] = useState<MyTour[]>([]);
    const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [bookingResults, setBookingResults] = useState<BookingResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState('');

    const fetchData = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) setLoading(true);
        if (!options.silent) setLoadError('');

        try {
            const [statsRes, toursRes, ticketsRes, tourStatsRes, articleStatsRes, supportStatsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/booking/admin/stats`),
                fetchWithAuth(`${API_BASE_URL}/tour?limit=6`),
                fetchWithAuth(`${API_BASE_URL}/support/tickets?view=open&limit=5`),
                fetchWithAuth(`${API_BASE_URL}/tour/admin/stats`),
                fetchWithAuth(`${API_BASE_URL}/article/admin/stats`),
                fetchWithAuth(`${API_BASE_URL}/support/stats`),
            ]);

            if (!statsRes.ok) {
                throw new Error('Không thể tải thống kê vận hành.');
            }

            const statsJson = await statsRes.json();
            const bookingStats = toObject(toObject(statsJson).data ?? statsJson);
            const [tourStatsJson, articleStatsJson, supportStatsJson] = await Promise.all([
                tourStatsRes.ok ? tourStatsRes.json() : Promise.resolve({}),
                articleStatsRes.ok ? articleStatsRes.json() : Promise.resolve({}),
                supportStatsRes.ok ? supportStatsRes.json() : Promise.resolve({}),
            ]);
            const tourStats = toObject(toObject(tourStatsJson).data ?? tourStatsJson);
            const articleStats = toObject(toObject(articleStatsJson).data ?? articleStatsJson);
            const supportStats = toObject(toObject(supportStatsJson).data ?? supportStatsJson);

            setStats({
                pending: getNumber(bookingStats, 'pending'),
                confirmed: getNumber(bookingStats, 'confirmed'),
                cancelRequested: getNumber(bookingStats, 'cancelRequested'),
                total: getNumber(bookingStats, 'total'),
                publishedTours: getNumber(bookingStats, 'publishedTours'),
                unpaidCount: getNumber(bookingStats, 'unpaidCount'),
                pendingOverdue: getNumber(bookingStats, 'pendingOverdue'),
                cancelRequestedOverdue: getNumber(bookingStats, 'cancelRequestedOverdue'),
                assistedDraftPending: getNumber(bookingStats, 'assistedDraftPending'),
                tourDraft: getNumber(tourStats, 'draft'),
                tourPending: getNumber(tourStats, 'pending'),
                articleDraft: getNumber(articleStats, 'draft'),
                articlePending: getNumber(articleStats, 'pending'),
                supportOpen: getNumber(supportStats, 'open'),
                supportAssignedToMeOpen: getNumber(supportStats, 'assignedToMeOpen'),
                supportUnassignedOpen: getNumber(supportStats, 'unassignedOpen'),
                supportOverdue: getNumber(supportStats, 'overdue'),
            });

            if (toursRes.ok) {
                const toursJson = await toursRes.json();
                setMyTours(toArray(toursJson).slice(0, 6) as MyTour[]);
            } else {
                setMyTours([]);
            }

            if (ticketsRes.ok) {
                const ticketsJson = await ticketsRes.json();
                setMyTickets(toArray(ticketsJson).slice(0, 5) as MyTicket[]);
            } else {
                setMyTickets([]);
            }

            setLastUpdated(new Date());
        } catch (error) {
            if (options.silent) return;
            console.error('Staff dashboard error:', error);
            setLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu tổng quan.');
        } finally {
            if (options.silent) return;
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useAdminAutoRefresh({
        intervalMs: 60 * 1000,
        pause: searching,
        onRefresh: () => fetchData({ silent: true }),
    });

    const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;

        setSearching(true);
        setHasSearched(true);
        setSearchError('');

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/booking/admin/all?search=${encodeURIComponent(query)}&limit=5`
            );
            if (!res.ok) {
                throw new Error('Không thể tra cứu booking lúc này.');
            }
            const json = await res.json();
            setBookingResults(toArray(json) as BookingResult[]);
        } catch (error) {
            console.error('Booking lookup error:', error);
            setBookingResults([]);
            setSearchError(error instanceof Error ? error.message : 'Không thể tra cứu booking lúc này.');
        } finally {
            setSearching(false);
        }
    };

    const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    const openTickets = stats?.supportOpen ?? 0;
    const ticketsAssignedToMe = stats?.supportAssignedToMeOpen ?? 0;
    const unassignedTickets = stats?.supportUnassignedOpen ?? 0;
    const overdueTickets = stats?.supportOverdue ?? 0;
    const pendingBookings = stats?.pending ?? 0;
    const overduePendingBookings = stats?.pendingOverdue ?? 0;
    const cancelRequests = stats?.cancelRequested ?? 0;
    const overdueCancelRequests = stats?.cancelRequestedOverdue ?? 0;
    const totalCriticalWork = pendingBookings + cancelRequests + openTickets;
    const totalSlaIssues = overduePendingBookings + overdueCancelRequests + overdueTickets;
    const queueTone = loading
        ? 'bg-slate-50 text-slate-700 ring-slate-200'
        : totalCriticalWork > 0
            ? 'bg-amber-50 text-amber-800 ring-amber-100'
            : 'bg-emerald-50 text-emerald-800 ring-emerald-100';

    const workQueueItems = useMemo(() => [
        {
            icon: 'pending_actions',
            label: 'Booking chờ xử lý',
            value: pendingBookings,
            helper: overduePendingBookings > 0 ? `${overduePendingBookings.toLocaleString('vi-VN')} quá 24h` : 'Mở danh sách booking đang chờ',
            tone: 'amber' as const,
            href: '/admin/bookings?status=PENDING',
            meta: overduePendingBookings > 0 ? 'Quá hạn' : pendingBookings > 0 ? 'Chờ xử lý' : 'Ổn',
        },
        {
            icon: 'assignment_late',
            label: 'Yêu cầu hủy',
            value: cancelRequests,
            helper: overdueCancelRequests > 0 ? `${overdueCancelRequests.toLocaleString('vi-VN')} quá 4h` : 'Cần kiểm tra điều kiện hoàn hủy',
            tone: 'orange' as const,
            href: '/admin/bookings?status=CANCEL_REQUESTED',
            meta: overdueCancelRequests > 0 ? 'Quá hạn' : cancelRequests > 0 ? 'Cần duyệt' : 'Ổn',
        },
        {
            icon: 'support_agent',
            label: 'Ticket đang mở',
            value: openTickets,
            helper: overdueTickets > 0
                ? `${overdueTickets.toLocaleString('vi-VN')} quá 2h · của tôi ${ticketsAssignedToMe.toLocaleString('vi-VN')}`
                : `Của tôi ${ticketsAssignedToMe.toLocaleString('vi-VN')} · chưa giao ${unassignedTickets.toLocaleString('vi-VN')}`,
            tone: 'teal' as const,
            href: '/admin/support?view=open',
            meta: overdueTickets > 0 ? 'Quá hạn' : openTickets > 0 ? 'Đang mở' : 'Ổn',
        },
    ], [cancelRequests, openTickets, pendingBookings, ticketsAssignedToMe, unassignedTickets, overdueCancelRequests, overduePendingBookings, overdueTickets]);

    const contentMetrics = useMemo(() => [
        {
            icon: 'edit_note',
            label: 'Tour nháp',
            value: stats?.tourDraft ?? 0,
            helper: 'Tiếp tục hoàn thiện nội dung tour',
            tone: 'slate' as const,
            href: '/admin/tours?status=DRAFT',
        },
        {
            icon: 'approval',
            label: 'Tour chờ duyệt',
            value: stats?.tourPending ?? 0,
            helper: 'Các tour đã gửi quản trị duyệt',
            tone: 'blue' as const,
            href: '/admin/tours?status=PENDING_REVIEW',
        },
        {
            icon: 'article',
            label: 'Bài viết chờ duyệt',
            value: stats?.articlePending ?? 0,
            helper: 'Nội dung đang chờ kiểm duyệt',
            tone: 'violet' as const,
            href: '/admin/articles?status=PENDING_REVIEW',
        },
    ], [stats?.articlePending, stats?.tourDraft, stats?.tourPending]);
    const supportScope = [
        {
            label: 'Của tôi',
            value: ticketsAssignedToMe,
            helper: 'Ticket đã giao cho bạn',
            tone: 'bg-blue-50 text-blue-700 ring-blue-100',
            href: '/admin/support?view=open&assigned=me',
        },
        {
            label: 'Chưa giao',
            value: unassignedTickets,
            helper: 'Cần điều phối người phụ trách',
            tone: 'bg-amber-50 text-amber-700 ring-amber-100',
            href: '/admin/support?view=open&assigned=none',
        },
        {
            label: 'Toàn hệ thống',
            value: openTickets,
            helper: 'Tất cả ticket NEW/IN_PROGRESS',
            tone: 'bg-slate-100 text-slate-700 ring-slate-200',
            href: '/admin/support?view=open',
        },
    ];
    const slaCards = [
        {
            icon: 'schedule',
            label: 'Booking quá 24h',
            value: overduePendingBookings,
            helper: 'Booking PENDING chưa được xác nhận',
            href: '/admin/bookings?status=PENDING',
            tone: overduePendingBookings > 0 ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-700 ring-slate-200',
        },
        {
            icon: 'timer',
            label: 'Hủy quá 4h',
            value: overdueCancelRequests,
            helper: 'Yêu cầu hủy chờ quyết định',
            href: '/admin/bookings?status=CANCEL_REQUESTED',
            tone: overdueCancelRequests > 0 ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-700 ring-slate-200',
        },
        {
            icon: 'support_agent',
            label: 'Ticket quá 2h',
            value: overdueTickets,
            helper: 'Ticket mở chưa được xử lý kịp SLA',
            href: '/admin/support?view=overdue',
            tone: overdueTickets > 0 ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-700 ring-slate-200',
        },
    ];

    const showLookupEmpty = hasSearched && !searching && !searchError && bookingResults.length === 0;

    return (
        <main className="min-h-screen w-full flex-1 bg-slate-50 px-4 pb-16 pt-7 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1400px] space-y-6">
                <section className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm sm:px-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                                <span className="material-symbols-outlined text-[22px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>workspaces</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-600">Bàn làm việc hôm nay</p>
                                <h1 className="mt-0.5 font-headline text-xl font-bold leading-tight tracking-tight text-slate-950 sm:text-[23px]">
                                    Xin chào, {staffName}
                                </h1>
                                <p className="mt-1 text-sm font-medium text-slate-500">{today} · Nhân viên Azure Horizon</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className={`rounded-2xl px-4 py-3 text-sm ring-1 ${queueTone}`}>
                                <p className="text-xs font-semibold opacity-70">Hàng đợi</p>
                                <p className="mt-0.5 font-bold">
                                    {loading
                                        ? 'Đang tải...'
                                        : totalCriticalWork > 0
                                            ? `${totalCriticalWork.toLocaleString('vi-VN')} việc cần xử lý`
                                            : 'Không có việc khẩn cấp'}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                                <p className="text-xs font-semibold text-slate-400">Cập nhật lần cuối</p>
                                <p className="mt-0.5 font-bold text-slate-700">{formatTime(lastUpdated)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => fetchData()}
                                disabled={loading}
                                aria-label="Làm mới dữ liệu tổng quan"
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                            >
                                <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
                                Làm mới
                            </button>
                        </div>
                    </div>

                    {!loading && !loadError ? (
                        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                            {totalCriticalWork > 0
                                ? 'Dùng các card bên dưới để mở đúng danh sách đã lọc và xử lý theo thứ tự ưu tiên.'
                                : 'Không có việc khẩn cấp. Bạn có thể kiểm tra tour, bài viết hoặc lịch sử hỗ trợ.'}
                        </div>
                    ) : null}
                </section>

                {loadError ? (
                    <section className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-red-700">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5 text-[20px]" aria-hidden="true">error</span>
                            <div>
                                <p className="text-sm font-bold">Không tải được dữ liệu tổng quan</p>
                                <p className="mt-1 text-sm text-red-600">{loadError}</p>
                            </div>
                        </div>
                    </section>
                ) : null}

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
                    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-600">Bảng điều phối</p>
                                <h2 className="mt-1 font-headline text-lg font-bold text-slate-950">Việc cần xử lý hôm nay</h2>
                                <p className="mt-0.5 text-xs font-medium text-slate-500">Mở thẳng danh sách đã lọc, xử lý theo thứ tự ưu tiên từ trên xuống.</p>
                            </div>
                            {!loading ? (
                                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${
                                    totalCriticalWork > 0
                                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                                        : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                }`}>
                                    {totalCriticalWork > 0
                                        ? `${totalCriticalWork.toLocaleString('vi-VN')} việc đang chờ`
                                        : 'Hàng đợi trống'}
                                </span>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[74px]" />)
                            ) : (
                                workQueueItems.map(item => <WorkQueueRow key={item.label} {...item} />)
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[68px]" />)
                            ) : (
                                supportScope.map(item => (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        aria-label={`${item.label}: ${item.value.toLocaleString('vi-VN')}. ${item.helper}`}
                                        className={`group rounded-2xl px-4 py-3 ring-1 transition hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${item.tone}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-75">{item.label}</p>
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-headline text-xl font-bold">{item.value.toLocaleString('vi-VN')}</p>
                                                <span className="material-symbols-outlined text-[14px] opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-70" aria-hidden="true">arrow_forward</span>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-xs font-medium opacity-80">{item.helper}</p>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    <aside className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-red-600">SLA & cảnh báo</p>
                                <h2 className="mt-1 font-headline text-lg font-bold text-slate-950">Ưu tiên quá hạn</h2>
                                <p className="mt-0.5 text-xs font-medium text-slate-500">Các mục vượt ngưỡng phản hồi cần được kéo lên trước.</p>
                            </div>
                            {!loading ? (
                                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                                    totalSlaIssues > 0
                                        ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                                        : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                }`}>
                                    {totalSlaIssues > 0 ? `${totalSlaIssues.toLocaleString('vi-VN')} quá hạn` : 'Đúng SLA'}
                                </span>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)
                            ) : (
                                slaCards.map(item => (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        aria-label={`${item.label}: ${item.value}. ${item.helper}`}
                                        className={`group block rounded-2xl px-4 py-3 ring-1 transition hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${item.tone}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{item.icon}</span>
                                                    <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">{item.label}</p>
                                                </div>
                                                <p className="mt-1 truncate text-xs font-medium opacity-80">{item.helper}</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <p className="font-headline text-xl font-bold">{item.value.toLocaleString('vi-VN')}</p>
                                                <span className="material-symbols-outlined text-[15px] opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-70" aria-hidden="true">arrow_forward</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </aside>
                </section>

                <section className="space-y-3">
                    <div>
                        <h2 className="font-headline text-base font-bold text-slate-900">Nội dung đang theo dõi</h2>
                        <p className="text-xs font-medium text-slate-500">Các mục chưa gấp nhưng cần giữ nhịp hoàn thiện và duyệt nội dung.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[120px]" />)
                        ) : (
                            contentMetrics.map(card => <CompactMetricCard key={card.label} {...card} />)
                        )}
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:col-span-7">
                        <SectionHeader
                            title="Tour mới nhất"
                            subtitle="Theo dõi nội dung tour vừa được tạo trong hệ thống"
                            action={(
                                <Link href="/admin/tours" className="inline-flex min-h-10 items-center gap-1 rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                                    Tạo tour mới
                                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
                                </Link>
                            )}
                        />
                        <div className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-6 py-4">
                                        <Skeleton className="h-11 w-11 shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-3 w-2/3" />
                                            <Skeleton className="h-3 w-1/3" />
                                        </div>
                                    </div>
                                ))
                            ) : myTours.length === 0 ? (
                                <EmptyState
                                    icon="explore"
                                    title="Chưa có tour nào"
                                    description="Khi nhân viên tạo tour, danh sách gần nhất sẽ xuất hiện tại đây để tiếp tục theo dõi."
                                    href="/admin/tours"
                                    action="Tạo tour đầu tiên"
                                />
                            ) : (
                                myTours.map(tour => {
                                    const status = TOUR_STATUS[tour.status] ?? { label: tour.status, cls: 'bg-slate-100 text-slate-600' };
                                    return (
                                        <Link key={tour.id} href="/admin/tours" className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-slate-50/70 focus:outline-none focus-visible:bg-blue-50">
                                            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                                                {tour.imageUrl ? (
                                                    <Image src={tour.imageUrl} alt={tour.name} width={44} height={44} sizes="44px" className="h-full w-full rounded-xl object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[18px] text-blue-400" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-slate-800">{tour.name}</p>
                                                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                                                    {tour.destination?.name ?? 'Chưa có điểm đến'} · {formatDate(tour.createdAt)}
                                                </p>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${status.cls}`}>{status.label}</span>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                        {myTours.length > 0 ? (
                            <div className="border-t border-slate-100 px-6 py-3">
                                <Link href="/admin/tours" className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                                    Xem tất cả tour
                                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
                                </Link>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:col-span-5">
                        <SectionHeader
                            title="Ticket hỗ trợ"
                            subtitle="Các yêu cầu khách hàng đang cần phản hồi"
                            action={(
                                <Link href="/admin/support?view=open" className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                                    Tất cả
                                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                                </Link>
                            )}
                        />
                        <div className="flex-1 divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="space-y-2 px-6 py-4">
                                        <Skeleton className="h-3 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ))
                            ) : myTickets.length === 0 ? (
                                <EmptyState
                                    icon="support_agent"
                                    title={openTickets > 0 ? `${openTickets.toLocaleString('vi-VN')} ticket đang mở trong hệ thống` : 'Không có ticket đang mở'}
                                    description={openTickets > 0
                                        ? 'Có ticket đang mở nhưng danh sách nhanh chưa tải được. Mở hàng đợi hỗ trợ để kiểm tra toàn bộ ticket.'
                                        : 'Hàng đợi hỗ trợ đang trống. Khi khách gửi yêu cầu mới, ticket sẽ xuất hiện ở đây.'}
                                    href={openTickets > 0 ? '/admin/support?view=open' : '/admin/support'}
                                    action={openTickets > 0 ? 'Mở hàng đợi ticket' : 'Xem lịch sử hỗ trợ'}
                                />
                            ) : (
                                myTickets.map(ticket => {
                                    const status = TICKET_STATUS[ticket.status] ?? { label: ticket.status, cls: 'bg-slate-100 text-slate-600' };
                                    return (
                                        <Link key={ticket.id} href="/admin/support?view=open" className="block px-6 py-4 transition-colors hover:bg-slate-50/70 focus:outline-none focus-visible:bg-blue-50">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="min-w-0 truncate text-sm font-bold text-slate-800">{ticket.subject}</p>
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>{status.label}</span>
                                            </div>
                                            <p className="mt-1 text-xs font-medium text-slate-500">{ticket.customerName} · {formatDate(ticket.createdAt)}</p>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <SectionHeader
                        title="Tra cứu booking"
                        subtitle="Tìm theo mã booking, tên khách hàng hoặc email khi cần hỗ trợ nhanh"
                    />
                    <div className="px-6 py-5">
                        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
                            <label className="sr-only" htmlFor="booking-lookup">Từ khóa tra cứu booking</label>
                            <input
                                id="booking-lookup"
                                type="text"
                                value={searchQuery}
                                onChange={event => {
                                    const nextValue = event.target.value;
                                    setSearchQuery(nextValue);
                                    if (!nextValue.trim()) {
                                        setBookingResults([]);
                                        setHasSearched(false);
                                        setSearchError('');
                                    }
                                }}
                                placeholder="VD: BKG-290326-XXXX hoặc tên khách..."
                                autoComplete="off"
                                className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                            <button
                                type="submit"
                                disabled={searching || !searchQuery.trim()}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                            >
                                {searching ? (
                                    <span className="material-symbols-outlined text-[17px] animate-spin" aria-hidden="true">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">search</span>
                                )}
                                Tìm booking
                            </button>
                        </form>

                        {searchError ? (
                            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                {searchError}
                            </div>
                        ) : null}

                        {bookingResults.length > 0 ? (
                            <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                                <th className="px-4 py-3 text-left font-bold">Mã booking</th>
                                                <th className="px-4 py-3 text-left font-bold">Khách hàng</th>
                                                <th className="px-4 py-3 text-left font-bold">Tour</th>
                                                <th className="px-4 py-3 text-right font-bold">Tổng tiền</th>
                                                <th className="px-4 py-3 text-left font-bold">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {bookingResults.map(booking => {
                                                const status = BOOKING_STATUS[booking.status] ?? { label: booking.status, cls: 'text-slate-500', dot: 'bg-slate-400' };
                                                return (
                                                    <tr key={booking.id} className="transition-colors hover:bg-slate-50/70">
                                                        <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{booking.bookingCode}</td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-xs font-bold text-slate-700">{booking.user?.fullName ?? 'Chưa có tên'}</p>
                                                            <p className="mt-0.5 text-[11px] text-slate-500">{booking.user?.email ?? 'Không có email'}</p>
                                                        </td>
                                                        <td className="max-w-[240px] truncate px-4 py-3 text-xs font-medium text-slate-600">{booking.tour?.name ?? 'Chưa có tour'}</td>
                                                        <td className="px-4 py-3 text-right text-xs font-bold text-slate-900">{formatVND(booking.totalPrice)}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${status.cls}`}>
                                                                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
                                    <span className="text-xs font-medium text-slate-500">
                                        Hiển thị {bookingResults.length} kết quả · Chế độ tra cứu nhanh
                                    </span>
                                    <Link
                                        href={`/admin/bookings?search=${encodeURIComponent(searchQuery.trim())}`}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                                    >
                                        Xem tất cả
                                        <span className="material-symbols-outlined text-[13px]" aria-hidden="true">arrow_forward</span>
                                    </Link>
                                </div>
                            </div>
                        ) : null}

                        {showLookupEmpty ? (
                            <div className="mt-5 rounded-2xl bg-slate-50 px-6 py-10 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-400" aria-hidden="true">search_off</span>
                                <p className="mt-2 text-sm font-bold text-slate-700">Không tìm thấy booking phù hợp</p>
                                <p className="mt-1 text-xs text-slate-500">Kiểm tra lại mã booking, email hoặc tên khách hàng.</p>
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>
        </main>
    );
}

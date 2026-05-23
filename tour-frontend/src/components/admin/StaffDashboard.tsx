'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
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
                <p className="mt-0.5 text-xs font-medium text-slate-400">{subtitle}</p>
            </div>
            {action}
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
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-300">
                <span className="material-symbols-outlined text-[26px]" aria-hidden="true">{icon}</span>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-700">{title}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">{description}</p>
            {href && action ? (
                <Link href={href} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100">
                    {action}
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                </Link>
            ) : null}
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    tone,
    href,
    helper,
    urgent = false,
}: {
    icon: string;
    label: string;
    value: number | string;
    tone: Tone;
    href: string;
    helper: string;
    urgent?: boolean;
}) {
    const t = toneClass[tone];

    return (
        <Link
            href={href}
            className={`group flex min-h-[132px] flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${urgent ? `${t.border} ${t.soft}` : 'border-slate-100'}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${t.icon}`}>
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <span className="material-symbols-outlined text-[17px] text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" aria-hidden="true">
                    arrow_forward
                </span>
            </div>
            <div>
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
                <p className="mt-1 text-[11px] font-medium leading-4 text-slate-400">{helper}</p>
            </div>
        </Link>
    );
}

function PriorityTask({
    icon,
    title,
    description,
    value,
    tone,
    href,
}: {
    icon: string;
    title: string;
    description: string;
    value: number;
    tone: Tone;
    href: string;
}) {
    const t = toneClass[tone];
    const hasWork = value > 0;

    return (
        <Link
            href={href}
            className={`group flex items-center gap-4 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${hasWork ? `${t.border} bg-white` : 'border-slate-100 bg-white'}`}
        >
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${t.icon}`}>
                <span className="material-symbols-outlined text-[21px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${hasWork ? t.dot : 'bg-emerald-400'}`} aria-hidden="true" />
                    <p className="truncate text-sm font-bold text-slate-900">{title}</p>
                </div>
                <p className="mt-1 truncate text-xs font-medium text-slate-400">{description}</p>
            </div>
            <div className="text-right">
                <p className={`font-headline text-2xl font-extrabold ${hasWork ? t.text : 'text-slate-400'}`}>{value}</p>
                <span className="material-symbols-outlined text-[17px] text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" aria-hidden="true">arrow_forward</span>
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

    const fetchData = useCallback(async () => {
        setLoading(true);
        setLoadError('');

        try {
            const [statsRes, toursRes, ticketsRes, tourStatsRes, articleStatsRes, supportStatsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/booking/admin/stats`),
                fetchWithAuth(`${API_BASE_URL}/tour?limit=6`),
                fetchWithAuth(`${API_BASE_URL}/support/tickets?limit=5`),
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
                assistedDraftPending: getNumber(bookingStats, 'assistedDraftPending'),
                tourDraft: getNumber(tourStats, 'draft'),
                tourPending: getNumber(tourStats, 'pending'),
                articleDraft: getNumber(articleStats, 'draft'),
                articlePending: getNumber(articleStats, 'pending'),
                supportOpen: getNumber(supportStats, 'open'),
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
            console.error('Staff dashboard error:', error);
            setLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu tổng quan.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

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
    const pendingBookings = stats?.pending ?? 0;
    const cancelRequests = stats?.cancelRequested ?? 0;
    const totalCriticalWork = pendingBookings + cancelRequests + openTickets;

    const statCards = useMemo(() => [
        {
            icon: 'pending_actions',
            label: 'Booking chờ xử lý',
            value: pendingBookings.toLocaleString('vi-VN'),
            helper: 'Mở danh sách booking đang chờ',
            tone: 'amber' as const,
            href: '/admin/bookings?status=PENDING',
            urgent: pendingBookings > 0,
        },
        {
            icon: 'assignment_late',
            label: 'Yêu cầu hủy',
            value: cancelRequests.toLocaleString('vi-VN'),
            helper: 'Cần kiểm tra điều kiện hoàn hủy',
            tone: 'orange' as const,
            href: '/admin/bookings?status=CANCEL_REQUESTED',
            urgent: cancelRequests > 0,
        },
        {
            icon: 'support_agent',
            label: 'Ticket đang mở',
            value: openTickets.toLocaleString('vi-VN'),
            helper: 'Theo dõi phản hồi khách hàng',
            tone: 'teal' as const,
            href: '/admin/support',
            urgent: openTickets > 0,
        },
        {
            icon: 'edit_note',
            label: 'Tour nháp',
            value: (stats?.tourDraft ?? 0).toLocaleString('vi-VN'),
            helper: 'Tiếp tục hoàn thiện nội dung tour',
            tone: 'slate' as const,
            href: '/admin/tours?status=DRAFT',
        },
        {
            icon: 'approval',
            label: 'Tour chờ duyệt',
            value: (stats?.tourPending ?? 0).toLocaleString('vi-VN'),
            helper: 'Các tour đã gửi quản trị duyệt',
            tone: 'blue' as const,
            href: '/admin/tours?status=PENDING_REVIEW',
        },
        {
            icon: 'article',
            label: 'Bài viết chờ duyệt',
            value: (stats?.articlePending ?? 0).toLocaleString('vi-VN'),
            helper: 'Nội dung đang chờ kiểm duyệt',
            tone: 'violet' as const,
            href: '/admin/articles?status=PENDING_REVIEW',
        },
    ], [cancelRequests, openTickets, pendingBookings, stats?.articlePending, stats?.tourDraft, stats?.tourPending]);

    const showLookupEmpty = hasSearched && !searching && !searchError && bookingResults.length === 0;

    return (
        <main className="min-h-screen w-full flex-1 bg-slate-50 px-4 pb-16 pt-7 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1400px] space-y-6">
                <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 text-white shadow-lg shadow-blue-500/20">
                                <span className="material-symbols-outlined text-[24px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>workspaces</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Bàn làm việc hôm nay</p>
                                <h1 className="mt-1 font-headline text-2xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[1.9rem]">
                                    Xin chào, {staffName}
                                </h1>
                                <p className="mt-1 text-sm font-medium text-slate-500">{today} · Nhân viên Azure Horizon</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                                <p className="text-xs font-semibold text-slate-400">Cập nhật lần cuối</p>
                                <p className="mt-0.5 font-bold text-slate-700">{formatTime(lastUpdated)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={fetchData}
                                disabled={loading}
                                aria-label="Làm mới dữ liệu tổng quan"
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                            >
                                <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
                                Làm mới
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[88px]" />)
                        ) : (
                            <>
                                <PriorityTask
                                    icon="pending_actions"
                                    title="Booking cần xử lý"
                                    description="Kiểm tra booking mới hoặc đang chờ xác nhận"
                                    value={pendingBookings}
                                    tone="amber"
                                    href="/admin/bookings?status=PENDING"
                                />
                                <PriorityTask
                                    icon="assignment_late"
                                    title="Yêu cầu hủy cần duyệt"
                                    description="Ưu tiên phản hồi để tránh khách chờ lâu"
                                    value={cancelRequests}
                                    tone="orange"
                                    href="/admin/bookings?status=CANCEL_REQUESTED"
                                />
                                <PriorityTask
                                    icon="support_agent"
                                    title="Ticket khách hàng đang mở"
                                    description="Theo dõi câu hỏi và khiếu nại còn tồn đọng"
                                    value={openTickets}
                                    tone="teal"
                                    href="/admin/support"
                                />
                            </>
                        )}
                    </div>

                    {!loading && !loadError ? (
                        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                            {totalCriticalWork > 0
                                ? `Có ${totalCriticalWork.toLocaleString('vi-VN')} việc cần xử lý. Ưu tiên các mục có trạng thái chờ để giảm thời gian phản hồi khách.`
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

                <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[132px]" />)
                    ) : (
                        statCards.map(card => <StatCard key={card.label} {...card} />)
                    )}
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:col-span-7">
                        <SectionHeader
                            title="Tour mới nhất"
                            subtitle="Theo dõi nội dung tour vừa được tạo trong hệ thống"
                            action={(
                                <Link href="/admin/tours" className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100">
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
                                        <Link key={tour.id} href="/admin/tours" className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-slate-50/70">
                                            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                                                {tour.imageUrl ? (
                                                    <img src={tour.imageUrl} alt={tour.name} className="h-full w-full rounded-xl object-cover" loading="lazy" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[18px] text-blue-400" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-slate-800">{tour.name}</p>
                                                <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
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
                                <Link href="/admin/tours" className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700">
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
                                <Link href="/admin/support" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
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
                                    title="Không có ticket cần xử lý"
                                    description="Hàng đợi hỗ trợ đang trống. Khi khách gửi yêu cầu mới, ticket sẽ xuất hiện ở đây."
                                    href="/admin/support"
                                    action="Xem lịch sử hỗ trợ"
                                />
                            ) : (
                                myTickets.map(ticket => {
                                    const status = TICKET_STATUS[ticket.status] ?? { label: ticket.status, cls: 'bg-slate-100 text-slate-600' };
                                    return (
                                        <Link key={ticket.id} href="/admin/support" className="block px-6 py-4 transition-colors hover:bg-slate-50/70">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="min-w-0 truncate text-sm font-bold text-slate-800">{ticket.subject}</p>
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${status.cls}`}>{status.label}</span>
                                            </div>
                                            <p className="mt-1 text-xs font-medium text-slate-400">{ticket.customerName} · {formatDate(ticket.createdAt)}</p>
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
                                className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                            <button
                                type="submit"
                                disabled={searching || !searchQuery.trim()}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                                            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
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
                                                            <p className="mt-0.5 text-[11px] text-slate-400">{booking.user?.email ?? 'Không có email'}</p>
                                                        </td>
                                                        <td className="max-w-[240px] truncate px-4 py-3 text-xs font-medium text-slate-600">{booking.tour?.name ?? 'Chưa có tour'}</td>
                                                        <td className="px-4 py-3 text-right text-xs font-black text-slate-900">{formatVND(booking.totalPrice)}</td>
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
                                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-400">
                                    Hiển thị {bookingResults.length} kết quả · Chế độ tra cứu nhanh
                                </div>
                            </div>
                        ) : null}

                        {showLookupEmpty ? (
                            <div className="mt-5 rounded-2xl bg-slate-50 py-10 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300" aria-hidden="true">search_off</span>
                                <p className="mt-2 text-sm font-bold text-slate-700">Không tìm thấy booking phù hợp</p>
                                <p className="mt-1 text-xs text-slate-400">Kiểm tra lại mã booking, email hoặc tên khách hàng.</p>
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>
        </main>
    );
}

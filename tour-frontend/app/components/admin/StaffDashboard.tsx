'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickStats {
    pending: number;
    confirmed: number;
    cancelRequested: number;
    total: number;
    publishedTours: number;
}

interface MyTour {
    id: number;
    name: string;
    status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
    createdAt: string;
    destination?: { name: string };
    imageUrl?: string;
}

interface MyTicket {
    id: number;
    subject: string;
    customerName: string;
    status: string;
    category: string;
    createdAt: string;
}

interface BookingResult {
    id: number;
    bookingCode: string;
    status: string;
    paymentStatus: string;
    totalPrice: number;
    numberOfPeople: number;
    createdAt: string;
    user?: { fullName: string; email: string };
    tour?: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOUR_STATUS: Record<string, { label: string; cls: string }> = {
    DRAFT:          { label: 'Nháp',        cls: 'bg-slate-100 text-slate-500' },
    PENDING_REVIEW: { label: 'Chờ duyệt',   cls: 'bg-amber-100 text-amber-700' },
    PUBLISHED:      { label: 'Đã đăng',     cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED:       { label: 'Từ chối',     cls: 'bg-red-100 text-red-600' },
};

const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
    NEW:         { label: 'Mới',         cls: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'Đang xử lý', cls: 'bg-amber-100 text-amber-700' },
    RESOLVED:    { label: 'Đã giải quyết', cls: 'bg-emerald-100 text-emerald-700' },
};

const BOOKING_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
    PENDING:          { label: 'Chờ TT',    cls: 'text-amber-700',   dot: 'bg-amber-400' },
    CONFIRMED:        { label: 'Xác nhận',  cls: 'text-emerald-700', dot: 'bg-emerald-500' },
    CANCEL_REQUESTED: { label: 'Xin hủy',  cls: 'text-orange-700',  dot: 'bg-orange-400' },
    CANCELLED:        { label: 'Đã hủy',   cls: 'text-red-600',     dot: 'bg-red-500' },
};

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-slate-100 rounded-xl animate-pulse ${className}`} />;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <p className="text-slate-500 text-xs font-semibold">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffDashboard({ staffName }: { staffName: string }) {
    const [stats, setStats] = useState<QuickStats | null>(null);
    const [myTours, setMyTours] = useState<MyTour[]>([]);
    const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
    const [loading, setLoading] = useState(true);

    // Booking lookup
    const [searchQuery, setSearchQuery] = useState('');
    const [bookingResults, setBookingResults] = useState<BookingResult[]>([]);
    const [searching, setSearching] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, toursRes, ticketsRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/booking/admin/stats`),
                fetchWithAuth(`${API_BASE_URL}/tour?limit=6`),
                fetchWithAuth(`${API_BASE_URL}/support/tickets?limit=5`),
            ]);

            // Helper: extract array from any API response shape
            const toArray = (j: any): any[] => {
                if (Array.isArray(j)) return j;
                const candidates = [j?.data, j?.tours, j?.data?.tours, j?.data?.data, j?.items];
                for (const c of candidates) {
                    if (Array.isArray(c)) return c;
                }
                return [];
            };

            if (statsRes.ok) {
                const j = await statsRes.json();
                setStats(j.data);
            }
            if (toursRes.ok) {
                const j = await toursRes.json();
                setMyTours(toArray(j).slice(0, 6));
            }
            if (ticketsRes.ok) {
                const j = await ticketsRes.json();
                setMyTickets(toArray(j).slice(0, 5));
            }
        } catch (e) {
            console.error('Staff dashboard error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/booking/admin/all?search=${encodeURIComponent(searchQuery)}&limit=5`
            );
            if (res.ok) {
                const j = await res.json();
                setBookingResults(j.bookings ?? []);
            }
        } finally {
            setSearching(false);
        }
    };

    const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <main className="flex-1 pt-8 px-8 pb-16 max-w-[1400px] mx-auto w-full bg-slate-50 min-h-screen">

            {/* ── Header ── */}
            <div className="mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                        <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    </div>
                    <div>
                        <h1 className="font-headline text-[1.75rem] font-bold text-slate-800 leading-tight">
                            Xin chào, {staffName} 👋
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">{today} · Nhân viên Azure Horizon</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* ── Quick Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
                ) : stats ? (
                    <>
                        <StatCard icon="book_online" label="Tổng Booking HT" value={stats.total.toLocaleString('vi-VN')} color="bg-blue-50 text-blue-500" />
                        <StatCard icon="pending_actions" label="Chờ Xác Nhận" value={stats.pending.toLocaleString('vi-VN')} color="bg-amber-50 text-amber-500" />
                        <StatCard icon="check_circle" label="Đã Xác Nhận" value={stats.confirmed.toLocaleString('vi-VN')} color="bg-emerald-50 text-emerald-600" />
                        <StatCard icon="public" label="Tour Đang Mở" value={stats.publishedTours.toLocaleString('vi-VN')} color="bg-indigo-50 text-indigo-500" />
                    </>
                ) : null}
            </div>

            {/* ── Main Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

                {/* Tour List */}
                <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h2 className="font-headline text-base font-bold text-slate-800">Tour Mới Nhất</h2>
                            <p className="text-slate-400 text-xs mt-0.5">Danh sách tour trong hệ thống</p>
                        </div>
                        <Link href="/admin/tours" className="flex items-center gap-1 text-blue-600 text-sm font-semibold hover:text-blue-500">
                            Tạo tour mới
                            <span className="material-symbols-outlined text-[15px]">add</span>
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="px-6 py-4 flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-slate-100 rounded w-2/3" />
                                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                                    </div>
                                </div>
                            ))
                        ) : myTours.length === 0 ? (
                            <div className="px-6 py-12 text-center text-slate-300">
                                <span className="material-symbols-outlined text-4xl block mb-2">explore</span>
                                <p className="text-sm">Chưa có tour nào</p>
                                <Link href="/admin/tours" className="mt-3 inline-flex items-center gap-1 text-blue-500 text-sm font-semibold hover:text-blue-600">
                                    <span className="material-symbols-outlined text-[14px]">add</span>Tạo tour đầu tiên
                                </Link>
                            </div>
                        ) : (
                            myTours.map(tour => {
                                const sc = TOUR_STATUS[tour.status] ?? { label: tour.status, cls: 'bg-slate-100 text-slate-500' };
                                return (
                                    <div key={tour.id} className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50/60 transition-colors group">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {tour.imageUrl ? (
                                                <img src={tour.imageUrl} alt={tour.name} className="w-full h-full object-cover rounded-xl" />
                                            ) : (
                                                <span className="material-symbols-outlined text-blue-400 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-700 text-sm truncate">{tour.name}</p>
                                            <p className="text-slate-400 text-xs mt-0.5">
                                                {tour.destination?.name ?? '—'} · {new Date(tour.createdAt).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${sc.cls}`}>{sc.label}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {myTours.length > 0 && (
                        <div className="px-6 py-3 border-t border-slate-100">
                            <Link href="/admin/tours" className="text-blue-500 text-sm font-semibold hover:text-blue-600 flex items-center gap-1">
                                Xem tất cả tour <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Support Tickets */}
                <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h2 className="font-headline text-base font-bold text-slate-800">Ticket Hỗ Trợ</h2>
                            <p className="text-slate-400 text-xs mt-0.5">Yêu cầu đang cần xử lý</p>
                        </div>
                        <Link href="/admin/support" className="text-blue-500 text-xs font-semibold hover:text-blue-600 flex items-center gap-1">
                            Tất cả <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </Link>
                    </div>
                    <div className="flex-1 divide-y divide-slate-50">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="px-6 py-4 animate-pulse space-y-2">
                                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                                </div>
                            ))
                        ) : myTickets.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-300">
                                <span className="material-symbols-outlined text-4xl mb-2">support_agent</span>
                                <p className="text-sm">Không có ticket nào</p>
                            </div>
                        ) : (
                            myTickets.map(ticket => {
                                const ts = TICKET_STATUS[ticket.status] ?? { label: ticket.status, cls: 'bg-slate-100 text-slate-500' };
                                return (
                                    <Link key={ticket.id} href="/admin/support" className="block px-6 py-4 hover:bg-slate-50/60 transition-colors group">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors">{ticket.subject}</p>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${ts.cls}`}>{ts.label}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{ticket.customerName} · {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</p>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Booking Lookup ── */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                    <h2 className="font-headline text-base font-bold text-slate-800">Tra Cứu Booking</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Tìm theo mã booking, tên khách hàng hoặc email</p>
                </div>
                <div className="px-6 py-4">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="VD: BKG-290326-XXXX hoặc tên khách..."
                            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={searching || !searchQuery.trim()}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2"
                        >
                            {searching
                                ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                : <span className="material-symbols-outlined text-[16px]">search</span>
                            }
                            Tìm
                        </button>
                    </div>

                    {bookingResults.length > 0 && (
                        <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                                        <th className="px-4 py-3 text-left font-semibold">Mã Booking</th>
                                        <th className="px-4 py-3 text-left font-semibold">Khách hàng</th>
                                        <th className="px-4 py-3 text-left font-semibold">Tour</th>
                                        <th className="px-4 py-3 text-right font-semibold">Tổng tiền</th>
                                        <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {bookingResults.map(b => {
                                        const bs = BOOKING_STATUS[b.status] ?? { label: b.status, cls: 'text-slate-500', dot: 'bg-slate-400' };
                                        return (
                                            <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-4 py-3 font-mono text-blue-600 font-semibold text-xs">{b.bookingCode}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-700 text-xs">{b.user?.fullName ?? '—'}</p>
                                                    <p className="text-slate-400 text-[11px]">{b.user?.email ?? ''}</p>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs max-w-[180px] truncate">{b.tour?.name ?? '—'}</td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-800 text-xs">{formatVND(b.totalPrice)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${bs.cls}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${bs.dot}`} />
                                                        {bs.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                                Hiển thị {bookingResults.length} kết quả · Chỉ xem, không thể chỉnh sửa
                            </div>
                        </div>
                    )}

                    {!searching && searchQuery && bookingResults.length === 0 && (
                        <p className="mt-4 text-sm text-slate-400 text-center py-6">
                            <span className="material-symbols-outlined block text-3xl mb-1 text-slate-200">search_off</span>
                            Không tìm thấy booking phù hợp
                        </p>
                    )}
                </div>
            </div>
        </main>
    );
}

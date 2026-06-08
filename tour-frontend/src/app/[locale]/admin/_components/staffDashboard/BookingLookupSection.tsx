import type { FormEvent } from 'react';
import { Link } from '@/i18n/routing';
import type { BookingResult } from './types';
import { BOOKING_STATUS, formatVND } from './constants';
import { SectionHeader } from './ui';

export default function BookingLookupSection({
    searchQuery,
    onQueryChange,
    bookingResults,
    searching,
    hasSearched,
    searchError,
    onSearch,
}: {
    searchQuery: string;
    onQueryChange: (value: string) => void;
    bookingResults: BookingResult[];
    searching: boolean;
    hasSearched: boolean;
    searchError: string;
    onSearch: (event?: FormEvent<HTMLFormElement>) => void;
}) {
    const showEmpty = hasSearched && !searching && !searchError && bookingResults.length === 0;

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <SectionHeader
                title="Tra cứu booking"
                subtitle="Tìm theo mã booking, tên khách hàng hoặc email khi cần hỗ trợ nhanh"
            />
            <div className="px-6 py-5">
                <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onSearch}>
                    <label className="sr-only" htmlFor="booking-lookup">Từ khóa tra cứu booking</label>
                    <input
                        id="booking-lookup"
                        type="text"
                        value={searchQuery}
                        onChange={event => onQueryChange(event.target.value)}
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

                {showEmpty ? (
                    <div className="mt-5 rounded-2xl bg-slate-50 px-6 py-10 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-400" aria-hidden="true">search_off</span>
                        <p className="mt-2 text-sm font-bold text-slate-700">Không tìm thấy booking phù hợp</p>
                        <p className="mt-1 text-xs text-slate-500">Kiểm tra lại mã booking, email hoặc tên khách hàng.</p>
                    </div>
                ) : null}
            </div>
        </section>
    );
}

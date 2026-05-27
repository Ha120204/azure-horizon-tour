'use client';

import { formatShortVND, formatVND } from '../_lib/helpers';
import type { TopCustomer, TopTour, TopVoucher, VoucherOverview } from '../_lib/types';
import { EmptyState } from './EmptyState';
import { SectionCard } from './SectionCard';
import { Skeleton } from './Skeleton';
import { StatBadge } from './StatBadge';

interface StatisticsTopSectionsProps {
    loading: boolean;
    topTours: TopTour[];
    topCustomers: TopCustomer[];
    voucherOverview: VoucherOverview | null;
    topVouchers: TopVoucher[];
}

export function StatisticsTopSections({
    loading,
    topTours,
    topCustomers,
    voucherOverview,
    topVouchers,
}: StatisticsTopSectionsProps) {
    return (
        <>
            <div className="mb-5">
                <SectionCard title="Top 5 tour bán chạy nhất" subtitle="Xếp hạng theo booking đã xác nhận trong kỳ đã chọn" icon="explore">
                    {loading ? (
                        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
                    ) : topTours.length === 0 ? (
                        <EmptyState icon="explore" title="Chưa có dữ liệu tour trong kỳ này" hint="Khi có booking đã xác nhận, bảng xếp hạng tour sẽ được cập nhật." />
                    ) : (
                        <div className="space-y-3">
                            {topTours.map((tour, i) => {
                                const maxB = topTours[0]?.totalBookings || 1;
                                const pct = Math.round((tour.totalBookings / maxB) * 100);
                                const rankStyle = [
                                    'bg-amber-50 text-amber-600 border-amber-200',
                                    'bg-slate-50 text-slate-400 border-slate-200',
                                    'bg-orange-50 text-orange-600 border-orange-200',
                                    'bg-slate-50 text-slate-400 border-slate-100',
                                    'bg-slate-50 text-slate-400 border-slate-100',
                                ][i];
                                return (
                                    <div key={tour.tourId} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all group">
                                        <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg border flex-shrink-0 ${rankStyle}`}>
                                            #{i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-slate-700 text-sm truncate group-hover:text-blue-700 transition-colors">{tour.name}</p>
                                                    <p className="text-slate-400 text-xs truncate">{tour.destination}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-4">
                                                    <p className="font-bold text-slate-700 text-sm">{tour.totalBookings} <span className="text-slate-400 font-normal text-xs">đặt</span></p>
                                                    <p className="text-emerald-600 text-xs font-semibold">{formatShortVND(tour.totalRevenue)}</p>
                                                </div>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard title="Top 5 khách hàng" subtitle="Xếp hạng theo tổng chi tiêu trong kỳ đã chọn" icon="workspace_premium" accent="purple">
                    {loading ? (
                        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
                    ) : topCustomers.length === 0 ? (
                        <EmptyState icon="group" title="Chưa có dữ liệu khách hàng trong kỳ này" hint="Danh sách sẽ xuất hiện khi khách hàng phát sinh booking đã xác nhận." />
                    ) : (
                        <div className="space-y-1">
                            {topCustomers.map((customer, i) => {
                                const initials = customer.fullName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
                                return (
                                    <div key={customer.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-xs font-bold text-purple-600">#{i + 1}</span>
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {initials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-700 text-sm truncate">{customer.fullName}</p>
                                            <p className="text-slate-400 text-xs truncate">{customer.email}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-emerald-600 font-bold text-sm">{formatShortVND(customer.totalSpent)}</p>
                                            <p className="text-slate-400 text-xs">{customer.totalBookings} đặt</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Thống kê voucher" subtitle="Tổng quan mã giảm giá (không filter theo kỳ)" icon="confirmation_number" accent="amber">
                    {loading || !voucherOverview ? <Skeleton className="h-64" /> : (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <StatBadge label="Tổng voucher" value={voucherOverview.totalVouchers} color="blue" />
                                <StatBadge label="Đang hoạt động" value={voucherOverview.activeVouchers} color="green" />
                                <StatBadge label="Tỷ lệ sử dụng" value={`${voucherOverview.voucherUsageRate}%`} color="purple" />
                                <StatBadge label="Booking dùng voucher" value={voucherOverview.bookingsWithVoucher} color="amber" />
                            </div>
                            <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl">
                                <p className="text-slate-500 text-xs font-medium mb-1">Tổng tiền giảm giá đã phát</p>
                                <p className="text-2xl font-bold text-rose-600 font-headline">{formatVND(voucherOverview.totalDiscountGiven)}</p>
                            </div>
                            {topVouchers.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2.5">Top voucher dùng nhiều nhất</p>
                                    <div className="space-y-2">
                                        {topVouchers.slice(0, 3).map(voucher => (
                                            <div key={voucher.id} className="flex items-center justify-between py-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-blue-600 text-sm font-bold bg-blue-50 px-2 py-0.5 rounded-lg">{voucher.code}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${voucher.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {voucher.isActive ? 'Đang bật' : 'Đã tắt'}
                                                    </span>
                                                </div>
                                                <span className="text-slate-600 text-sm font-semibold">{voucher.usedCount}/{voucher.maxUses} lượt</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </SectionCard>
            </div>
        </>
    );
}

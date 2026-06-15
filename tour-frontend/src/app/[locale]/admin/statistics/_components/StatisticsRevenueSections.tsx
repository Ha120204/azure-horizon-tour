import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    BarChart, Bar,
} from 'recharts';
import { EmptyState } from './EmptyState';
import { InsightNote } from './InsightNote';
import { SectionCard } from './SectionCard';
import { Skeleton } from './Skeleton';
import { DestTooltip, RevenueTooltip } from './tooltips';
import { GRAN_MAP } from '../_lib/config';
import { formatAxisVND, formatVND } from '../_lib/helpers';
import type { DestRevenue, RevenuePoint } from '../_lib/types';

interface RevenueTrendSectionProps {
    loading: boolean;
    gran: string;
    revenueData: RevenuePoint[];
    hasRevenueData: boolean;
    maxRevenue: number;
    totalRevenue: number;
    totalTrendBookings: number;
    nonZeroRevenuePoints: number;
    bestRevenuePoint?: RevenuePoint;
}

export function RevenueTrendSection({
    loading,
    gran,
    revenueData,
    hasRevenueData,
    maxRevenue,
    totalRevenue,
    totalTrendBookings,
    nonZeroRevenuePoints,
    bestRevenuePoint,
}: RevenueTrendSectionProps) {
    return (
        <div className="mb-5">
            <SectionCard
                title="Xu hướng doanh thu"
                subtitle={`${GRAN_MAP[gran]} · ${revenueData.length} điểm dữ liệu trong kỳ đã chọn`}
                icon="payments"
            >
                {loading ? <Skeleton className="h-72" /> : !hasRevenueData ? (
                    <EmptyState
                        icon="payments"
                        title="Chưa có doanh thu đã thanh toán trong kỳ này"
                        hint="Thử mở rộng kỳ phân tích hoặc kiểm tra các đơn chưa thanh toán."
                    />
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={revenueData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis yAxisId="left" tickFormatter={formatAxisVND} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={66} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                            <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
                            <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3.5, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Doanh thu" />
                            <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Booking" />
                        </LineChart>
                    </ResponsiveContainer>
                )}
                {!loading && hasRevenueData && (
                    <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <div className="w-4 h-0.5 bg-blue-500 rounded" />
                            <span>Doanh thu (VNĐ)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <div className="w-4 h-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(to right, #F59E0B 0, #F59E0B 5px, transparent 5px, transparent 8px)' }} />
                            <span>Số booking (trục phải)</span>
                        </div>
                        <div className="ml-auto text-xs text-slate-400">
                            Cao nhất:{' '}
                            <span className="text-blue-600 font-semibold">
                                {formatVND(maxRevenue)} ({bestRevenuePoint?.label})
                            </span>
                        </div>
                    </div>
                )}
                {!loading && hasRevenueData && (
                    <InsightNote>
                        Doanh thu trong kỳ là <strong>{formatVND(totalRevenue)}</strong> từ <strong>{totalTrendBookings.toLocaleString('vi-VN')}</strong> booking.
                        {nonZeroRevenuePoints <= 1 && ' Dữ liệu còn ít, nên xem đây là tín hiệu ban đầu thay vì xu hướng ổn định.'}
                        {bestRevenuePoint ? ` Ngày/nhóm cao nhất: ${bestRevenuePoint.label}.` : ''}
                    </InsightNote>
                )}
            </SectionCard>
        </div>
    );
}

interface DestinationRevenueSectionProps {
    loading: boolean;
    destRevenue: DestRevenue[];
    topDestination?: DestRevenue;
    topDestinationShare: number;
}

export function DestinationRevenueSection({
    loading,
    destRevenue,
    topDestination,
    topDestinationShare,
}: DestinationRevenueSectionProps) {
    return (
        <div className="mb-5">
            <SectionCard
                title="Doanh thu theo điểm đến"
                subtitle="Top điểm đến có doanh thu cao nhất trong kỳ (chỉ tính booking đã thanh toán)"
                icon="map"
                accent="green"
            >
                {loading ? <Skeleton className="h-64" /> : destRevenue.length === 0 ? (
                    <EmptyState
                        icon="map"
                        title="Chưa có dữ liệu điểm đến trong kỳ này"
                        hint="Khi có booking đã xác nhận, doanh thu theo điểm đến sẽ được tổng hợp tại đây."
                    />
                ) : (
                    <>
                        <div className="flex gap-6 items-start">
                            <div className="flex-1 min-w-0">
                                <ResponsiveContainer width="100%" height={Math.max(200, destRevenue.length * 44)}>
                                    <BarChart
                                        layout="vertical"
                                        data={destRevenue}
                                        margin={{ top: 0, right: 88, left: 0, bottom: 0 }}
                                        barSize={22}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                                        <XAxis type="number" tickFormatter={formatAxisVND} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={130} />
                                        <Tooltip content={<DestTooltip />} cursor={{ fill: 'rgba(59,130,246,0.04)' }} />
                                        <Bar dataKey="revenue" fill="url(#destGrad)" radius={[0, 6, 6, 0]}
                                            label={{ position: 'right', formatter: (value: unknown) => formatVND(Number(value)), fill: '#64748B', fontSize: 11 }}
                                        />
                                        <defs>
                                            <linearGradient id="destGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
                                                <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                                            </linearGradient>
                                        </defs>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-52 flex-shrink-0 space-y-2">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Top điểm đến</p>
                                {destRevenue.slice(0, 5).map((destination, index) => (
                                    <div key={destination.name} className="flex items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-slate-300 font-bold flex-shrink-0">#{index + 1}</span>
                                            <span className="text-slate-600 truncate font-medium">{destination.name}</span>
                                        </div>
                                        <span className="text-emerald-600 font-bold flex-shrink-0">{formatVND(destination.revenue)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {topDestination && (
                            <InsightNote>
                                <strong>{topDestination.name}</strong> đang dẫn đầu với <strong>{formatVND(topDestination.revenue)}</strong>, chiếm khoảng <strong>{topDestinationShare.toFixed(1)}%</strong> doanh thu điểm đến trong kỳ.
                                {destRevenue.length === 1 && ' Hiện mới có một điểm đến phát sinh doanh thu nên chưa thể so sánh phân bổ.'}
                            </InsightNote>
                        )}
                    </>
                )}
            </SectionCard>
        </div>
    );
}

'use client';

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from '@/i18n/routing';
import { PIE_COLORS } from '../_lib/config';
import type { BookingStatusData } from '../_lib/types';
import { EmptyState } from './EmptyState';
import { InsightNote } from './InsightNote';
import { SectionCard } from './SectionCard';
import { Skeleton } from './Skeleton';

interface StatisticsBookingSectionsProps {
    loading: boolean;
    bookingStatus: BookingStatusData | null;
    cancellationRate: number;
    trendHasEnoughData: boolean;
}

export function StatisticsBookingSections({
    loading,
    bookingStatus,
    cancellationRate,
    trendHasEnoughData,
}: StatisticsBookingSectionsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <SectionCard title="Phân bổ trạng thái booking" subtitle="Tỷ lệ theo trạng thái trong kỳ đã chọn" icon="donut_large">
                {loading || !bookingStatus ? <Skeleton className="h-64" /> : (
                    bookingStatus.total === 0 ? (
                        <EmptyState icon="donut_large" title="Chưa có booking trong kỳ này" hint="Biểu đồ sẽ xuất hiện khi có đơn phù hợp bộ lọc." />
                    ) : (
                        <>
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <ResponsiveContainer width={180} height={180}>
                                    <PieChart>
                                        <Pie data={bookingStatus.distribution} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={4} stroke="none">
                                            {bookingStatus.distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-3 w-full">
                                    {bookingStatus.distribution.map((item, i) => {
                                        const pct = bookingStatus.total > 0 ? ((item.value / bookingStatus.total) * 100).toFixed(1) : '0';
                                        return (
                                            <Link key={item.key} href={`/admin/bookings?status=${item.key}`} className="block rounded-lg p-1 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                                <div className="flex justify-between mb-1.5 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                                                        <span className="text-slate-600 font-medium">{item.name}</span>
                                                    </div>
                                                    <span className="font-bold text-slate-700">{item.value} <span className="text-slate-400 font-normal text-xs">({pct}%)</span></span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: PIE_COLORS[i] }} />
                                                </div>
                                            </Link>
                                        );
                                    })}
                                    <div className="pt-3 border-t border-slate-100 flex justify-between">
                                        <span className="text-slate-400 text-sm">Tổng trong kỳ</span>
                                        <span className="text-slate-800 font-bold">{bookingStatus.total.toLocaleString('vi-VN')}</span>
                                    </div>
                                </div>
                            </div>
                            <InsightNote>
                                Tỷ lệ hủy trong kỳ là <strong>{cancellationRate.toFixed(1)}%</strong>.
                                {cancellationRate >= 20 ? ' Đây là mức cần kiểm tra nguyên nhân hủy, thanh toán hoặc chất lượng tour.' : ' Chỉ số này đang ở mức có thể theo dõi định kỳ.'}
                            </InsightNote>
                        </>
                    )
                )}
            </SectionCard>

            <SectionCard title="Thanh toán & xu hướng booking" subtitle="Phân bổ thanh toán và booking theo ngày trong kỳ" icon="credit_card" accent="green">
                {loading || !bookingStatus ? <Skeleton className="h-64" /> : (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            {bookingStatus.paymentStatus.map((ps, i) => {
                                const s = i === 0
                                    ? { bg: 'bg-emerald-50 border-emerald-100', icon: 'check_circle', ic: '#10B981', tc: 'text-emerald-700', href: '/admin/bookings?paymentStatus=PAID' }
                                    : { bg: 'bg-amber-50 border-amber-100', icon: 'pending_actions', ic: '#F59E0B', tc: 'text-amber-700', href: '/admin/bookings?paymentStatus=UNPAID' };
                                return (
                                    <Link key={ps.name} href={s.href} className={`block p-4 rounded-xl border transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${s.bg}`}>
                                        <span className="material-symbols-outlined text-xl mb-1.5 block" style={{ color: s.ic, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                        <p className={`text-2xl font-bold font-headline ${s.tc}`}>{ps.value.toLocaleString('vi-VN')}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{ps.name}</p>
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Số booking theo ngày trong kỳ</p>
                            {bookingStatus.recentTrend.length > 0 && trendHasEnoughData ? (
                                <ResponsiveContainer width="100%" height={85}>
                                    <BarChart data={bookingStatus.recentTrend} barSize={Math.max(4, Math.min(14, 300 / bookingStatus.recentTrend.length))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                        <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#64748B' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="py-6 text-center">
                                    <p className="text-sm font-semibold text-slate-400">Dữ liệu booking theo ngày còn ít</p>
                                    <p className="mt-1 text-xs text-slate-300">Biểu đồ xu hướng sẽ rõ hơn khi có booking ở nhiều ngày khác nhau.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

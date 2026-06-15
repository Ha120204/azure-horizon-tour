import Image from 'next/image';
import { Link } from '@/i18n/routing';
import type { RecentTour } from './types';
import { TOUR_STATUS, formatDate } from './constants';
import { Skeleton, SectionHeader, EmptyState } from './ui';

export default function RecentToursSection({ loading, recentTours }: { loading: boolean; recentTours: RecentTour[] }) {
    return (
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
                ) : recentTours.length === 0 ? (
                    <EmptyState
                        icon="explore"
                        title="Chưa có tour nào"
                        description="Khi nhân viên tạo tour, danh sách gần nhất sẽ xuất hiện tại đây để tiếp tục theo dõi."
                        href="/admin/tours"
                        action="Tạo tour đầu tiên"
                    />
                ) : (
                    recentTours.map(tour => {
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
            {recentTours.length > 0 ? (
                <div className="border-t border-slate-100 px-6 py-3">
                    <Link href="/admin/tours" className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                        Xem tất cả tour
                        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
                    </Link>
                </div>
            ) : null}
        </div>
    );
}

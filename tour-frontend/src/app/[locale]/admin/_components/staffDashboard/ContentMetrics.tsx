import type { QuickStats } from './types';
import { Skeleton, CompactMetricCard } from './ui';

export default function ContentMetrics({ loading, stats }: { loading: boolean; stats: QuickStats | null }) {
    const contentMetrics = [
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
    ];

    return (
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
    );
}

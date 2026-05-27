import { formatDate } from '../_lib/helpers';

interface StatisticsHeaderProps {
    from: string;
    to: string;
    lastUpdatedAt: Date | null;
    dashboardError: string;
}

export function StatisticsHeader({ from, to, lastUpdatedAt, dashboardError }: StatisticsHeaderProps) {
    return (
        <>
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
                    </span>
                    <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Analytics</span>
                </div>
                <h1 className="font-headline text-[2rem] font-bold text-slate-800 leading-tight">Thống kê chi tiết</h1>
                <p className="text-slate-500 text-sm mt-1.5">
                    Phân tích toàn diện · dữ liệu từ {formatDate(from)} đến {formatDate(to)}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-400">
                    {lastUpdatedAt
                        ? `Cập nhật lần cuối: ${lastUpdatedAt.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}`
                        : 'Dữ liệu đang được đồng bộ'}
                </p>
            </div>

            {dashboardError && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {dashboardError}
                </div>
            )}
        </>
    );
}

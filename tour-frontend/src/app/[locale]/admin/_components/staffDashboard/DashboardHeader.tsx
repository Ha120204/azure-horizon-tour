import { formatTime } from './constants';

export default function DashboardHeader({
    staffName,
    loading,
    loadError,
    totalCriticalWork,
    queueTone,
    lastUpdated,
    onRefresh,
}: {
    staffName: string;
    loading: boolean;
    loadError: string;
    totalCriticalWork: number;
    queueTone: string;
    lastUpdated: Date | null;
    onRefresh: () => void;
}) {
    const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <>
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
                            onClick={onRefresh}
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
        </>
    );
}

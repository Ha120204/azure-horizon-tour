import { CAT, statusOptions } from '../_lib/config';
import type { TicketCategory, TicketStatus, TicketView } from '../_lib/types';

interface SupportSidebarProps {
    search: string;
    counts: Record<TicketStatus | 'ALL', number>;
    activeStatus: TicketStatus | 'ALL';
    activeCategory: TicketCategory | 'ALL';
    activeView: TicketView;
    categoryCounts: Partial<Record<TicketCategory, number>>;
    onSearchChange: (value: string) => void;
    onStatusChange: (status: TicketStatus | 'ALL') => void;
    onCategoryChange: (category: TicketCategory | 'ALL') => void;
}

export function SupportSidebar({
    search,
    counts,
    activeStatus,
    activeCategory,
    activeView,
    categoryCounts,
    onSearchChange,
    onStatusChange,
    onCategoryChange,
}: SupportSidebarProps) {
    return (
        <aside className="hidden min-h-0 w-72 shrink-0 flex-col border-r border-outline-variant/40 bg-surface-container-lowest xl:flex">
            <div className="shrink-0 border-b border-outline-variant/30 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Support Desk</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Hỗ trợ khách hàng</h1>
                <p className="mt-1 text-sm text-on-surface-variant">Điều phối ticket, phản hồi và theo dõi SLA.</p>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
                <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline" aria-hidden="true">search</span>
                    <label htmlFor="support-ticket-search" className="sr-only">Tìm ticket hỗ trợ</label>
                    <input
                        id="support-ticket-search"
                        name="supportTicketSearch"
                        type="search"
                        autoComplete="off"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Tìm ticket…"
                        className="h-11 w-full rounded-xl border border-outline-variant/40 bg-surface px-10 text-sm font-semibold text-on-surface outline-none transition focus-visible:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/10 placeholder:text-outline"
                    />
                </div>

                <section>
                    <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.16em] text-outline">Trạng thái</p>
                    <div className="space-y-1.5">
                        {statusOptions.map((option) => {
                            const active = activeView === 'ALL' && activeStatus === option.key;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => onStatusChange(option.key)}
                                    aria-pressed={active}
                                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
                                        active
                                            ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                                            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[19px]" aria-hidden="true">{option.icon}</span>
                                    <span className="flex-1 text-left">{option.label}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${active ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'}`}>
                                        {counts[option.key].toLocaleString('vi-VN')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.16em] text-outline">Danh mục trong kết quả</p>
                    <div className="space-y-1">
                        <button
                            type="button"
                            onClick={() => onCategoryChange('ALL')}
                            aria-pressed={activeCategory === 'ALL'}
                            className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
                                activeCategory === 'ALL' ? 'bg-surface-container text-on-surface ring-1 ring-outline-variant/40' : 'text-on-surface-variant hover:bg-surface-container-low'
                            }`}
                        >
                            <span className="h-2 w-2 rounded-full bg-outline" aria-hidden="true" />
                            <span className="flex-1 text-left">Tất cả danh mục</span>
                        </button>
                        {(Object.entries(CAT) as [TicketCategory, typeof CAT[TicketCategory]][]).map(([key, category]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onCategoryChange(key)}
                                aria-pressed={activeCategory === key}
                                className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
                                    activeCategory === key ? 'bg-surface-container text-on-surface ring-1 ring-outline-variant/40' : 'text-on-surface-variant hover:bg-surface-container-low'
                                }`}
                            >
                                <span className={`h-2 w-2 rounded-full ${category.dot}`} aria-hidden="true" />
                                <span className="flex-1 text-left">{category.label}</span>
                                <span className="text-[11px] font-black text-outline">{categoryCounts[key] ?? 0}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            <div className="shrink-0 border-t border-outline-variant/30 p-5">
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-black text-primary">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">support_agent</span>
                        Quy trình phản hồi
                    </div>
                    <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                        Ưu tiên ticket mới, chuyển sang đang xử lý khi phản hồi và đóng khi khách đã được hỗ trợ xong.
                    </p>
                </div>
            </div>
        </aside>
    );
}

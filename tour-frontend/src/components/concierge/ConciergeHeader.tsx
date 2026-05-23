'use client';

interface ConciergeHeaderProps {
    isHistoryOpen: boolean;
    hasAccessToken: boolean;
    setIsHistoryOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
    loadSessions: () => void;
    handleStartNewConversation: () => void;
    t: (key: string) => string;
}

export default function ConciergeHeader({
    isHistoryOpen,
    hasAccessToken,
    setIsHistoryOpen,
    loadSessions,
    handleStartNewConversation,
    t,
}: ConciergeHeaderProps) {
    return (
        <header className="border-b border-slate-200/80 bg-white px-5 pb-4 pt-5 pr-16">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20">
                    <span
                        className="material-symbols-outlined text-[21px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        auto_awesome
                    </span>
                </div>
                <div className="min-w-0">
                    <p className="mb-1 font-label text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">
                        Azure Horizon
                    </p>
                    <h2 className="line-clamp-2 font-headline text-lg font-bold leading-tight text-slate-950">
                        {t('conciergeApp.header')}
                    </h2>
                    <p className="mt-1 line-clamp-1 font-body text-xs text-slate-500">{t('conciergeApp.subheader')}</p>
                </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setIsHistoryOpen((open) => !open);
                        if (!isHistoryOpen) void loadSessions();
                    }}
                    disabled={!hasAccessToken}
                    title={hasAccessToken ? 'Xem lịch sử trò chuyện' : 'Đăng nhập để xem lịch sử'}
                    aria-label="Xem lịch sử trò chuyện"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <span className="material-symbols-outlined text-[14px]">history</span>
                    Lịch sử
                </button>
                <button
                    type="button"
                    onClick={handleStartNewConversation}
                    title="Bắt đầu hội thoại mới"
                    aria-label="Bắt đầu hội thoại mới"
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition-all hover:bg-blue-100"
                >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Mới
                </button>
            </div>
        </header>
    );
}

'use client';
import { useLocale } from '@/context/LocaleContext';
import type { ChatSessionSummary } from './types';

interface ConciergeHistorySidebarProps {
    isLoadingSessions: boolean;
    sessions: ChatSessionSummary[];
    activeSessionId: string | undefined;
    handleSelectSession: (sessionId: string) => void;
    handleDeleteSession: (sessionId: string) => void;
    setIsHistoryOpen: (v: boolean) => void;
}

export default function ConciergeHistorySidebar({
    isLoadingSessions,
    sessions,
    activeSessionId,
    handleSelectSession,
    handleDeleteSession,
    setIsHistoryOpen,
}: ConciergeHistorySidebarProps) {
    const { formatDate } = useLocale();

    return (
        <aside className="absolute inset-x-3 bottom-[104px] top-[132px] z-30 rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Lịch sử trò chuyện</h3>
                        <p className="text-xs text-slate-500">Chọn lại một cuộc trò chuyện cũ.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsHistoryOpen(false)}
                        aria-label="Đóng lịch sử"
                        className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    {isLoadingSessions ? (
                        <div className="px-3 py-6 text-center text-xs text-slate-400">
                            Đang tải lịch sử...
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="px-3 py-6 text-center text-xs leading-5 text-slate-500">
                            Chưa có cuộc trò chuyện nào. Bấm Mới và gửi câu hỏi đầu tiên để bắt đầu lưu lịch sử.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sessions.map((session) => {
                                const isActive = activeSessionId === session.id;
                                return (
                                    <div
                                        key={session.id}
                                        className={`group rounded-xl border p-3 transition-colors ${
                                            isActive
                                                ? 'border-blue-200 bg-blue-50'
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleSelectSession(session.id)}
                                            className="block w-full text-left"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                                                    {session.title}
                                                </p>
                                                <span className="shrink-0 text-[10px] font-semibold uppercase text-slate-400">
                                                    {formatDate(session.updatedAt, {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                                {session.preview || 'Chưa có nội dung xem trước.'}
                                            </p>
                                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                {session.messageCount} tin nhắn
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSession(session.id)}
                                            className="mt-2 hidden items-center gap-1 text-xs font-semibold text-slate-400 transition-colors hover:text-red-600 group-hover:inline-flex"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                            Xóa
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

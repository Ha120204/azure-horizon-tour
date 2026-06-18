'use client';
import { usePathname } from 'next/navigation';
import { useConcierge } from './useConcierge';
import ConciergeTrigger from './ConciergeTrigger';
import ConciergeHeader from './ConciergeHeader';
import ConciergeHistorySidebar from './ConciergeHistorySidebar';
import ConciergeMessages from './ConciergeMessages';
import ConciergeInput from './ConciergeInput';

export default function ConciergeWidget() {
    const pathname = usePathname();
    const ctx = useConcierge();

    // Ẩn widget trên trang Admin và auth
    const hiddenPaths = ['/admin', '/login', '/register', '/forgot-password', '/reset-password'];
    if (hiddenPaths.some(p => pathname?.includes(p))) return null;

    // Trang chi tiết tour có thanh CTA cố định ở đáy trên mobile → nâng FAB lên tránh đè
    const isTourDetail = !!pathname && /\/tour\/[^/]+/.test(pathname);

    return (
        <>
            {/* FAB + Contact Dock (chỉ hiện khi chat đóng) */}
            {!ctx.isOpen && (
                <ConciergeTrigger
                    isContactDockOpen={ctx.isContactDockOpen}
                    setIsContactDockOpen={ctx.setIsContactDockOpen}
                    setIsOpen={ctx.setIsOpen}
                    raised={isTourDetail}
                    t={ctx.t}
                />
            )}

            {/* Overlay backdrop (mobile) */}
            <div
                className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-300 sm:hidden ${
                    ctx.isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
                onClick={() => ctx.setIsOpen(false)}
                aria-hidden="true"
            />

            {/* Chat Panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={ctx.t('conciergeApp.dialogLabel')}
                className={`fixed inset-x-3 bottom-3 top-auto z-50 flex h-[min(720px,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(680px,calc(100dvh-3rem))] sm:w-[430px] ${
                    ctx.isOpen ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-6 scale-[0.98] opacity-0'
                }`}
            >
                {/* Nút đóng */}
                <button
                    onClick={() => ctx.setIsOpen(false)}
                    aria-label={ctx.t('conciergeApp.closeChat')}
                    className="absolute right-4 top-4 z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                    <span className="material-symbols-outlined text-[19px]">close</span>
                </button>

                {/* AI Interface */}
                <section className="relative flex h-full flex-1 flex-col overflow-hidden bg-slate-50">
                    <ConciergeHeader
                        isHistoryOpen={ctx.isHistoryOpen}
                        hasAccessToken={ctx.hasAccessToken}
                        setIsHistoryOpen={ctx.setIsHistoryOpen}
                        loadSessions={ctx.loadSessions}
                        handleStartNewConversation={ctx.handleStartNewConversation}
                        t={ctx.t}
                    />

                    {ctx.isHistoryOpen && (
                        <ConciergeHistorySidebar
                            isLoadingSessions={ctx.isLoadingSessions}
                            sessions={ctx.sessions}
                            activeSessionId={ctx.activeSessionId}
                            handleSelectSession={ctx.handleSelectSession}
                            handleDeleteSession={ctx.handleDeleteSession}
                            setIsHistoryOpen={ctx.setIsHistoryOpen}
                        />
                    )}

                    <ConciergeMessages
                        messages={ctx.messages}
                        isTyping={ctx.isTyping}
                        isSearching={ctx.isSearching}
                        cooldown={ctx.cooldown}
                        isLoadingHistory={ctx.isLoadingHistory}
                        hasAccessToken={ctx.hasAccessToken}
                        language={ctx.language}
                        messagesEndRef={ctx.messagesEndRef}
                        scrollContainerRef={ctx.scrollContainerRef}
                        handleSendMessage={ctx.handleSendMessage}
                        handleTourCardClick={ctx.handleTourCardClick}
                        handleRetryAfterError={ctx.handleRetryAfterError}
                        setIsOpen={ctx.setIsOpen}
                        t={ctx.t}
                    />

                    <ConciergeInput
                        inputRef={ctx.inputRef}
                        inputValue={ctx.inputValue}
                        setInputValue={ctx.setInputValue}
                        isTyping={ctx.isTyping}
                        isStreaming={ctx.isStreaming}
                        cooldown={ctx.cooldown}
                        handleSendMessage={ctx.handleSendMessage}
                        handleStopGeneration={ctx.handleStopGeneration}
                        t={ctx.t}
                    />
                </section>
            </div>
        </>
    );
}

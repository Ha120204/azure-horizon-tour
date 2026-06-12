import { RefObject } from 'react';

interface ConciergeInputProps {
    inputRef: RefObject<HTMLInputElement | null>;
    inputValue: string;
    setInputValue: (v: string) => void;
    isTyping: boolean;
    isStreaming: boolean;
    cooldown: boolean;
    handleSendMessage: (text?: string) => void;
    handleStopGeneration: () => void;
    t: (key: string) => string;
}

export default function ConciergeInput({
    inputRef,
    inputValue,
    setInputValue,
    isTyping,
    isStreaming,
    cooldown,
    handleSendMessage,
    handleStopGeneration,
    t,
}: ConciergeInputProps) {
    return (
        <div className="absolute bottom-0 left-0 w-full border-t border-slate-100 bg-white p-4">
            <div className="relative mx-auto flex max-w-full flex-col">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex items-center rounded-full border border-slate-300/80 bg-slate-50 p-1.5 shadow-sm ring-blue-800/20 transition-all focus-within:bg-white focus-within:ring-2"
                >
                    <input
                        ref={inputRef}
                        id="ai-chat-input"
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-body px-4 text-slate-900 placeholder:text-slate-400 outline-none"
                        placeholder={t('conciergeApp.inputPlaceholder')}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        maxLength={1000}
                        disabled={isTyping}
                    />
                    {isStreaming ? (
                        <button
                            type="button"
                            onClick={handleStopGeneration}
                            aria-label="Dừng"
                            className="w-10 h-10 bg-red-500 text-white rounded-full shadow-md flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                            <span
                                className="material-symbols-outlined text-[18px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                stop
                            </span>
                        </button>
                    ) : (
                        <button
                            type="submit"
                            id="ai-chat-send"
                            disabled={!inputValue.trim() || isTyping || cooldown}
                            aria-label={t('conciergeApp.sendMessage')}
                            className="w-10 h-10 bg-blue-800 text-white rounded-full shadow-md flex items-center justify-center hover:bg-blue-900 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            <span
                                className="material-symbols-outlined text-[18px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                arrow_upward
                            </span>
                        </button>
                    )}
                </form>
                <p className="mt-3 text-center text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                    {t('conciergeApp.disclaimer')}
                </p>
            </div>
        </div>
    );
}

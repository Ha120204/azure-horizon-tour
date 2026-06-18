import { RefObject, useEffect } from 'react';

interface ConciergeInputProps {
    inputRef: RefObject<HTMLTextAreaElement | null>;
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
    // Reset chiều cao khi message được gửi đi (inputValue → '')
    useEffect(() => {
        if (!inputValue && inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
    }, [inputValue, inputRef]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="absolute bottom-0 left-0 w-full border-t border-slate-100 bg-white p-4">
            <div className="relative mx-auto flex max-w-full flex-col">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex items-end rounded-2xl border border-slate-300/80 bg-slate-50 p-1.5 shadow-sm ring-primary/20 transition-all focus-within:bg-white focus-within:ring-2"
                >
                    <textarea
                        ref={inputRef}
                        id="ai-chat-input"
                        className="flex-1 resize-none overflow-hidden bg-transparent border-none focus:ring-0 text-sm font-body px-4 py-2 text-slate-900 placeholder:text-slate-400 outline-none leading-normal"
                        placeholder={t('conciergeApp.inputPlaceholder')}
                        rows={1}
                        value={inputValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        maxLength={1000}
                        disabled={isTyping || isStreaming}
                    />
                    {isStreaming ? (
                        <button
                            type="button"
                            onClick={handleStopGeneration}
                            aria-label={t('conciergeApp.stopGeneration')}
                            className="w-10 h-10 flex-shrink-0 bg-red-500 text-white rounded-full shadow-md flex items-center justify-center hover:bg-red-600 transition-colors"
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
                            className="w-10 h-10 flex-shrink-0 bg-primary text-white rounded-full shadow-md flex items-center justify-center hover:bg-primary-container transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
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

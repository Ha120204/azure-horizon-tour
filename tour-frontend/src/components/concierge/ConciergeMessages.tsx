'use client';
import { RefObject } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import type { Message } from './types';
import { getPromptSuggestions } from './constants';

interface ConciergeMessagesProps {
    messages: Message[];
    isTyping: boolean;
    isSearching: boolean;
    cooldown: boolean;
    isLoadingHistory: boolean;
    hasAccessToken: boolean;
    language: string;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    scrollContainerRef: RefObject<HTMLDivElement | null>;
    handleSendMessage: (text?: string) => void;
    handleTourCardClick: (tourId?: number) => void;
    handleRetryAfterError: (text: string) => void;
    setIsOpen: (v: boolean) => void;
    t: (key: string) => string;
}

export default function ConciergeMessages({
    messages,
    isTyping,
    isSearching,
    cooldown,
    isLoadingHistory,
    hasAccessToken,
    language,
    messagesEndRef,
    scrollContainerRef,
    handleSendMessage,
    handleTourCardClick,
    handleRetryAfterError,
    setIsOpen,
    t,
}: ConciergeMessagesProps) {
    return (
        <div ref={scrollContainerRef} className="hide-scrollbar flex-1 space-y-5 overflow-y-auto p-5 pb-32">
            {isLoadingHistory && (
                <div className="text-center text-slate-400 text-sm py-4">{t('conciergeApp.loadingHistory')}</div>
            )}

            {messages.map((msg, idx) => (
                <div
                    key={msg.id}
                    className={`flex max-w-full flex-col gap-3 ${msg.role === 'user' ? 'ml-auto items-end' : ''}`}
                >
                    {msg.role === 'ai' ? (
                        <>
                            <div className="flex gap-3">
                                {/* Avatar AI */}
                                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm">
                                    <span
                                        className="material-symbols-outlined text-white text-[16px]"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                        auto_awesome
                                    </span>
                                </div>

                                {/* Bubble AI — Render Markdown */}
                                <div className="prose prose-sm max-w-[310px] rounded-[18px] rounded-tl-md border border-slate-200/70 bg-white p-4 text-[14px] leading-relaxed text-slate-700 shadow-sm prose-p:my-1 prose-li:my-0 prose-ul:my-1 sm:max-w-[330px]">
                                    {msg.textKey ? (
                                        t(msg.textKey)
                                    ) : (
                                        <ReactMarkdown>{msg.text || ''}</ReactMarkdown>
                                    )}
                                </div>
                            </div>

                            {/* Prompt Chips — chỉ hiện ở tin đầu tiên */}
                            {idx === 0 && (
                                <div className="ml-11 grid w-[calc(100%-2.75rem)] grid-cols-1 gap-2">
                                    {getPromptSuggestions(hasAccessToken).map((prompt) => {
                                        const isPrimary = prompt.tone === 'primary';
                                        return (
                                            <button
                                                key={prompt.textKey}
                                                type="button"
                                                onClick={() => handleSendMessage(t(prompt.textKey))}
                                                disabled={isTyping || cooldown}
                                                className={`inline-flex min-h-10 items-center justify-start gap-2 rounded-full border px-3.5 py-2 text-left text-xs font-semibold shadow-sm transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 ${
                                                    isPrimary
                                                        ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:shadow-md'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
                                                }`}
                                            >
                                                <span
                                                    className="material-symbols-outlined text-[15px] leading-none"
                                                    aria-hidden="true"
                                                >
                                                    {prompt.icon}
                                                </span>
                                                <span className="min-w-0 break-words">{t(prompt.textKey)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Tour Card */}
                            {msg.tourCard?.image && (
                                <div className="ml-11 w-[calc(100%-2.75rem)]">
                                    <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-500 group">
                                        <div className="relative h-48 overflow-hidden">
                                            <Image
                                                alt={msg.tourCard.name || 'Tour'}
                                                src={msg.tourCard.image}
                                                fill
                                                sizes="100vw"
                                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src =
                                                        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80';
                                                }}
                                            />
                                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg">
                                                <span className="text-primary font-bold text-sm tracking-tight">
                                                    {msg.tourCard.price}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="mb-4 font-headline text-lg font-bold text-slate-900">
                                                {msg.tourCard.name}
                                            </h3>
                                            {msg.tourCard.id ? (
                                                <Link
                                                    href={`/${language}/tour/${msg.tourCard.id}`}
                                                    onClick={() => { handleTourCardClick(msg.tourCard!.id); setIsOpen(false); }}
                                                    className="block w-full text-center bg-primary hover:bg-primary-container text-white py-3 rounded-full font-label text-xs uppercase tracking-widest font-bold transition-colors"
                                                >
                                                    {t('conciergeApp.viewTourDetail')}
                                                </Link>
                                            ) : (
                                                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-full font-label text-xs uppercase tracking-widest font-bold transition-colors">
                                                    {t('conciergeApp.viewItinerary')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Follow-up chips */}
                            {msg.followUps && msg.followUps.length > 0 && (
                                <div className="ml-11 flex flex-wrap gap-2">
                                    {msg.followUps.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => handleSendMessage(suggestion)}
                                            disabled={isTyping || cooldown}
                                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Retry button khi lỗi */}
                            {msg.isError && (
                                <div className="ml-11">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                                            if (lastUserMsg?.text) handleRetryAfterError(lastUserMsg.text);
                                        }}
                                        disabled={isTyping || cooldown}
                                        className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary-container disabled:opacity-50"
                                    >
                                        {t('conciergeApp.retry')}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Bubble User */
                        <div className="max-w-[330px] rounded-[18px] rounded-tr-md bg-primary p-4 text-white shadow-sm">
                            <p className="text-[14px] leading-6">{msg.text}</p>
                        </div>
                    )}
                </div>
            ))}

            {/* Searching indicator */}
            {isSearching && (
                <div className="flex max-w-full gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                        <span
                            className="material-symbols-outlined text-white text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            search_spark
                        </span>
                    </div>
                    <div className="bg-white border border-slate-100 px-4 rounded-2xl rounded-tl-none w-fit flex items-center gap-2 h-[44px] shadow-sm">
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-slate-500">{t('conciergeApp.searching')}</span>
                    </div>
                </div>
            )}

            {/* Typing indicator */}
            {isTyping && !isSearching && (
                <div className="flex max-w-full gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                        <span
                            className="material-symbols-outlined text-white text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            auto_awesome
                        </span>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none w-fit flex items-center gap-1.5 h-[44px] shadow-sm">
                        <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}

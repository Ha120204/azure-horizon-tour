"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useLocale } from '@/app/context/LocaleContext';
import { API_BASE_URL } from '@/app/lib/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Message = {
    id: string;
    role: 'user' | 'ai';
    text?: string;
    textKey?: string;
    tourCard?: {
        id?: number;
        name?: string;
        price: string;
        image: string;
    };
};

type PromptSuggestion = {
    textKey: string;
    icon: string;
    tone: 'primary' | 'secondary';
};

type ChatSessionSummary = {
    id: string;
    title: string;
    preview: string;
    updatedAt: string;
    messageCount: number;
};

type QuickContact = {
    label: string;
    href: string;
    icon?: string;
    textIcon?: string;
    className: string;
};

const QUICK_CONTACTS: QuickContact[] = [
    {
        label: 'Call Azure Horizon',
        href: 'tel:+84386761856',
        icon: 'call',
        className: 'bg-primary text-white hover:bg-primary-container',
    },
    {
        label: 'Facebook',
        href: 'https://www.facebook.com/daothanhha120204',
        textIcon: 'f',
        className: 'bg-[#1877F2] text-white hover:bg-[#0f66d6]',
    },
    {
        label: 'Zalo',
        href: 'https://zalo.me/0386761856',
        textIcon: 'Zalo',
        className: 'bg-white text-[#0068ff] ring-1 ring-[#0068ff]/20 hover:bg-[#eef5ff]',
    },
];

const getPromptSuggestions = (hasAccessToken: boolean): PromptSuggestion[] => [
    { textKey: 'conciergeApp.prompt1', icon: 'beach_access', tone: 'primary' },
    { textKey: 'conciergeApp.prompt2', icon: 'payments', tone: 'secondary' },
    {
        textKey: hasAccessToken ? 'conciergeApp.prompt3' : 'conciergeApp.prompt4',
        icon: hasAccessToken ? 'confirmation_number' : 'explore',
        tone: 'secondary',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ConciergeWidget() {
    const { language, t } = useLocale();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [cooldown, setCooldown] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [hasAccessToken, setHasAccessToken] = useState(false);
    const [isContactDockOpen, setIsContactDockOpen] = useState(true);
    const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
    const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'ai', textKey: 'conciergeApp.aiGreeting' },
    ]);

    // ── Auto-scroll ────────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, isOpen]);

    // ── Focus input khi mở ────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        const syncAuthState = () => {
            setHasAccessToken(Boolean(localStorage.getItem('accessToken')));
        };

        syncAuthState();
        window.addEventListener('auth-change', syncAuthState);
        window.addEventListener('storage', syncAuthState);

        return () => {
            window.removeEventListener('auth-change', syncAuthState);
            window.removeEventListener('storage', syncAuthState);
        };
    }, []);

    const resetConversationView = useCallback(() => {
        localStorage.removeItem('aiSessionId');
        setActiveSessionId(undefined);
        setMessages([{ id: Date.now().toString(), role: 'ai', textKey: 'conciergeApp.aiGreeting' }]);
        setInputValue('');
    }, []);

    const loadSessions = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setSessions([]);
            return;
        }

        setIsLoadingSessions(true);
        try {
            const res = await fetch(`${API_BASE_URL}/ai/chat/sessions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;

            const json = await res.json();
            const data = (json.data ?? json) as { sessions?: ChatSessionSummary[] };
            setSessions(data.sessions ?? []);
        } catch (e) {
            console.error('[AI] Loi tai danh sach lich su:', e);
        } finally {
            setIsLoadingSessions(false);
        }
    }, []);

    const loadSessionById = useCallback(async (sessionId: string) => {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        setIsLoadingHistory(true);
        try {
            const res = await fetch(`${API_BASE_URL}/ai/chat/${sessionId}`, { headers });
            if (!res.ok) {
                if (res.status === 404) localStorage.removeItem('aiSessionId');
                return false;
            }

            const json = await res.json();
            const data = (json.data ?? json) as { sessionId?: string; messages?: Message[] };
            if (data.sessionId) {
                localStorage.setItem('aiSessionId', data.sessionId);
                setActiveSessionId(data.sessionId);
            }
            if (data.messages && data.messages.length > 0) {
                setMessages(data.messages);
                return true;
            }
            return false;
        } catch (e) {
            console.error('[AI] Loi tai lich su:', e);
            return false;
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    // ── Load lịch sử chat từ server khi mount ─────────────────────────────
    useEffect(() => {
        const loadHistory = async () => {
            const sessionId = localStorage.getItem('aiSessionId');
            const token = localStorage.getItem('accessToken');
            const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

            await loadSessions();

            if (token) {
                setIsLoadingHistory(true);
                try {
                    const res = await fetch(`${API_BASE_URL}/ai/chat/me/latest`, { headers });
                    if (res.ok) {
                        const json = await res.json();
                        const data = (json.data ?? json) as { sessionId?: string; messages?: Message[] };

                        if (data.sessionId) {
                            localStorage.setItem('aiSessionId', data.sessionId);
                            setActiveSessionId(data.sessionId);
                        }
                        if (data.messages && data.messages.length > 0) {
                            setMessages(data.messages);
                            return;
                        }
                    }
                } catch (e) {
                    console.error('[AI] Loi tai lich su tai khoan:', e);
                } finally {
                    setIsLoadingHistory(false);
                }
            }

            if (sessionId) {
                await loadSessionById(sessionId);
            }
        };

        loadHistory();
        window.addEventListener('auth-change', loadHistory);
        return () => window.removeEventListener('auth-change', loadHistory);
    }, [loadSessionById, loadSessions]);

    // ── Gửi tin nhắn ──────────────────────────────────────────────────────
    const handleSendMessage = useCallback(
        async (text = inputValue) => {
            if (!text.trim() || isTyping || cooldown) return;

            const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
            setMessages((prev) => [...prev, userMsg]);
            setInputValue('');
            setIsTyping(true);
            setCooldown(true);

            setTimeout(() => setCooldown(false), 3000);

            try {
                const sessionId = localStorage.getItem('aiSessionId');
                const token = localStorage.getItem('accessToken');

                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE_URL}/ai/chat`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ message: text, sessionId: sessionId || undefined }),
                });

                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    const errMsg =
                        errJson &&
                        typeof errJson === 'object' &&
                        'message' in errJson &&
                        typeof errJson.message === 'string'
                            ? errJson.message
                            : `HTTP ${res.status}`;
                    throw new Error(errMsg);
                }

                // Unwrap TransformInterceptor: backend trả { statusCode, data: {...}, message, timestamp }
                const json = await res.json();
                const data = (json.data ?? json) as { reply?: string; sessionId?: string; tourCard?: Message['tourCard'] };

                if (data.sessionId) {
                    localStorage.setItem('aiSessionId', data.sessionId);
                    setActiveSessionId(data.sessionId);
                }

                setIsTyping(false);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'ai',
                        text: data.reply || '❌ Không nhận được phản hồi từ AI. Vui lòng thử lại.',
                        tourCard: data.tourCard,
                    },
                ]);
                if (token) {
                    await loadSessions();
                }
            } catch (error) {
                console.error('[AI] Chat Error:', error);
                setIsTyping(false);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'ai',
                        text: 'Không thể kết nối đến trợ lý AI. Vui lòng thử lại sau.',
                    },
                ]);
            }
        },
        [inputValue, isTyping, cooldown, loadSessions],
    );

    // ── Bắt đầu hội thoại mới ────────────────────────────────────────────
    const handleStartNewConversation = useCallback(() => {
        resetConversationView();
        setIsHistoryOpen(false);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [resetConversationView]);

    const handleSelectSession = useCallback(
        async (sessionId: string) => {
            const loaded = await loadSessionById(sessionId);
            if (loaded) {
                setIsHistoryOpen(false);
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        },
        [loadSessionById],
    );

    const handleDeleteSession = useCallback(
        async (sessionId: string) => {
            const token = localStorage.getItem('accessToken');
            try {
                await fetch(`${API_BASE_URL}/ai/chat/${sessionId}`, {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
            } catch (e) {
                console.error('[AI] Loi xoa lich su:', e);
            }

            if (activeSessionId === sessionId) {
                resetConversationView();
            }
            await loadSessions();
        },
        [activeSessionId, loadSessions, resetConversationView],
    );

    // ── Ẩn widget trên trang Admin ────────────────────────────────────────
    if (pathname?.includes('/admin')) return null;

    return (
        <>
            {!isOpen && (
                <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 sm:right-6">
                    {isContactDockOpen ? (
                        <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_14px_40px_rgba(15,23,42,0.16)] backdrop-blur">
                            {QUICK_CONTACTS.map((contact) => (
                                <a
                                    key={contact.label}
                                    href={contact.href}
                                    target={contact.href.startsWith('http') ? '_blank' : undefined}
                                    rel={contact.href.startsWith('http') ? 'noreferrer' : undefined}
                                    aria-label={contact.label}
                                    title={contact.label}
                                    className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${contact.className}`}
                                >
                                    {contact.icon ? (
                                        <span
                                            className="material-symbols-outlined text-[20px]"
                                            style={{ fontVariationSettings: "'FILL' 1" }}
                                        >
                                            {contact.icon}
                                        </span>
                                    ) : (
                                        <span className={contact.textIcon === 'Zalo' ? 'text-[14px] font-extrabold tracking-tight' : 'text-2xl leading-none'}>
                                            {contact.textIcon}
                                        </span>
                                    )}
                                </a>
                            ))}
                            <button
                                type="button"
                                onClick={() => setIsContactDockOpen(false)}
                                aria-label="Thu gọn kênh liên hệ"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                            >
                                <span className="material-symbols-outlined text-[17px]">close</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsContactDockOpen(true)}
                            aria-label="Mở kênh liên hệ nhanh"
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-[0_12px_34px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white"
                        >
                            <span className="material-symbols-outlined text-[22px]">support_agent</span>
                        </button>
                    )}

                    <button
                        id="ai-concierge-trigger"
                        onClick={() => setIsOpen(true)}
                        aria-label="Mở trợ lý AI"
                        className="group flex items-center gap-3 rounded-full border border-white/25 bg-primary px-4 py-3 text-white shadow-[0_16px_40px_rgba(0,63,135,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-[0_18px_48px_rgba(0,63,135,0.34)] sm:px-5"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/14 ring-1 ring-white/20">
                            <span
                                className="material-symbols-outlined text-[19px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                auto_awesome
                            </span>
                        </span>
                        <span className="hidden pr-1 font-headline text-sm font-bold sm:block">{t('conciergeApp.btn')}</span>
                    </button>
                </div>
            )}

            {/* OVERLAY */}
            <div
                className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-300 sm:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            {/* CHAT PANEL */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Azure Horizon AI Concierge"
                className={`fixed inset-x-3 bottom-3 top-auto z-50 flex h-[min(720px,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(680px,calc(100dvh-3rem))] sm:w-[430px] ${isOpen ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-6 scale-[0.98] opacity-0'}`}
            >
                {/* Nút đóng */}
                <button
                    onClick={() => setIsOpen(false)}
                    aria-label="Đóng"
                    className="absolute right-4 top-4 z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                    <span className="material-symbols-outlined text-[19px]">close</span>
                </button>

                {/* ── LEFT COLUMN: Brand ────────────────────────────────────────── */}
                <section className="hidden">
                    <div className="absolute inset-0 z-0">
                        <img
                            alt="Luxury infinity pool"
                            className="w-full h-full object-cover opacity-60"
                            src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full p-10 lg:p-12">
                        <div className="mb-auto">
                            <span className="text-white font-headline text-lg font-bold tracking-tight mb-10 block">
                                Azure Horizon
                            </span>
                            <h1 className="font-headline text-4xl lg:text-[44px] xl:text-5xl font-extrabold tracking-tight leading-[1.08] mb-5">
                                {t('conciergeApp.title1')}
                                <br />
                                {t('conciergeApp.title2')}
                            </h1>
                            <p className="font-body text-base text-slate-200 max-w-sm leading-7 opacity-90">
                                {t('conciergeApp.desc')}
                            </p>
                        </div>
                        <div className="mt-10 space-y-7">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 hover:text-blue-300 transition-colors">
                                    <span className="material-symbols-outlined text-blue-300">mail</span>
                                    <a
                                        className="text-sm tracking-wide font-medium"
                                        href="mailto:admin.azurehorion@gmail.com"
                                    >
                                        admin.azurehorion@gmail.com
                                    </a>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-blue-300">call</span>
                                    <span className="text-sm tracking-wide font-medium">+84 (0) 900 888 999</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 pt-4">
                                <a className="opacity-70 hover:opacity-100 transition-opacity" href="#" aria-label="Website">
                                    <span className="material-symbols-outlined">public</span>
                                </a>
                                <a className="opacity-70 hover:opacity-100 transition-opacity" href="#" aria-label="Share">
                                    <span className="material-symbols-outlined">share</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── RIGHT COLUMN: AI Interface ───────────────────────────────── */}
                <section className="relative flex h-full flex-1 flex-col overflow-hidden bg-slate-50">
                    {/* Header */}
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

                    {isHistoryOpen && (
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
                                                                    {new Date(session.updatedAt).toLocaleDateString('vi-VN', {
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
                    )}

                    {/* Messages Area */}
                    <div className="hide-scrollbar flex-1 space-y-5 overflow-y-auto p-5 pb-32">
                        {isLoadingHistory && (
                            <div className="text-center text-slate-400 text-sm py-4">Đang tải lịch sử...</div>
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
                                                            className={`inline-flex min-h-10 items-center justify-start gap-2 rounded-full border px-3.5 py-2 text-left text-xs font-semibold shadow-sm transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 ${
                                                                isPrimary
                                                                    ? 'border-blue-700 bg-blue-50 text-blue-900 hover:bg-blue-100 hover:shadow-md'
                                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900'
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

                                        {/* Tour Card — với link điều hướng thật */}
                                        {msg.tourCard && (
                                            <div className="ml-11 w-[calc(100%-2.75rem)]">
                                                <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-500 group">
                                                    <div className="relative h-48 overflow-hidden">
                                                        <img
                                                            alt={msg.tourCard.name || 'Tour'}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                            src={msg.tourCard.image}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src =
                                                                    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80';
                                                            }}
                                                        />
                                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg">
                                                            <span className="text-blue-800 font-bold text-sm tracking-tight">
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
                                                                onClick={() => setIsOpen(false)}
                                                                className="block w-full text-center bg-blue-800 hover:bg-blue-900 text-white py-3 rounded-full font-label text-xs uppercase tracking-widest font-bold transition-colors"
                                                            >
                                                                Xem chi tiết tour →
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
                                    </>
                                ) : (
                                    /* Bubble User */
                                    <div className="max-w-[330px] rounded-[18px] rounded-tr-md bg-primary p-4 text-white shadow-sm">
                                        <p className="text-[14px] leading-6">{msg.text}</p>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
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
                                    <div
                                        className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce"
                                        style={{ animationDelay: '0ms' }}
                                    />
                                    <div
                                        className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce"
                                        style={{ animationDelay: '150ms' }}
                                    />
                                    <div
                                        className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce"
                                        style={{ animationDelay: '300ms' }}
                                    />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Input Area (Fixed Bottom) ─────────────────────────────── */}
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
                                <button
                                    type="submit"
                                    id="ai-chat-send"
                                    disabled={!inputValue.trim() || isTyping || cooldown}
                                    aria-label="Gửi tin nhắn"
                                    className="w-10 h-10 bg-blue-800 text-white rounded-full shadow-md flex items-center justify-center hover:bg-blue-900 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                                >
                                    <span
                                        className="material-symbols-outlined text-[18px]"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                        arrow_upward
                                    </span>
                                </button>
                            </form>
                            <p className="mt-3 text-center text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                                {t('conciergeApp.disclaimer')}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

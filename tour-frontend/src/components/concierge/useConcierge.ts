'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchAuthProfile, fetchOptionalAuth } from '@/lib/auth/authSession';
import type { Message, ChatSessionSummary } from './types';

export function useConcierge() {
    const { language, t } = useLocale();

    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [cooldown, setCooldown] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [hasAccessToken, setHasAccessToken] = useState(false);
    const [isContactDockOpen, setIsContactDockOpen] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
    const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'ai', textKey: 'conciergeApp.aiGreeting' },
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isMountedRef = useRef(false);
    const cooldownTimerRef = useRef<number | undefined>(undefined);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ── Auto-scroll ────────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, isOpen]);

    // ── Focus input khi mở ────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            const timer = window.setTimeout(() => inputRef.current?.focus(), 300);
            return () => window.clearTimeout(timer);
        }
    }, [isOpen]);

    // ── Sync auth state ───────────────────────────────────────────────────
    useEffect(() => {
        let isActive = true;
        const syncAuthState = async () => {
            const profile = await fetchAuthProfile();
            if (!isActive || !isMountedRef.current) return;
            setHasAccessToken(Boolean(profile));
        };
        void syncAuthState();
        window.addEventListener('auth-change', syncAuthState);
        window.addEventListener('storage', syncAuthState);
        return () => {
            isActive = false;
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
        if (!isMountedRef.current) return;
        setIsLoadingSessions(true);
        try {
            const res = await fetchOptionalAuth(`${API_BASE_URL}/ai/chat/sessions`);
            if (!isMountedRef.current) return;
            if (res.status === 401) {
                setSessions([]);
                setHasAccessToken(false);
                return;
            }
            if (!res.ok) return;
            const json = await res.json();
            if (!isMountedRef.current) return;
            const data = (json.data ?? json) as { sessions?: ChatSessionSummary[] };
            setSessions(data.sessions ?? []);
        } catch (e) {
            console.error('[AI] Loi tai danh sach lich su:', e);
        } finally {
            if (isMountedRef.current) setIsLoadingSessions(false);
        }
    }, []);

    const loadSessionById = useCallback(async (sessionId: string) => {
        if (!isMountedRef.current) return false;
        setIsLoadingHistory(true);
        try {
            const res = await fetchOptionalAuth(`${API_BASE_URL}/ai/chat/${sessionId}`);
            if (!isMountedRef.current) return false;
            if (!res.ok) {
                if (res.status === 404) localStorage.removeItem('aiSessionId');
                return false;
            }
            const json = await res.json();
            if (!isMountedRef.current) return false;
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
            if (isMountedRef.current) setIsLoadingHistory(false);
        }
    }, []);

    // ── Load lịch sử chat từ server khi mount ─────────────────────────────
    useEffect(() => {
        let isActive = true;
        const loadHistory = async () => {
            const profile = await fetchAuthProfile();
            if (!isActive || !isMountedRef.current) return;

            if (!profile) {
                // Đã logout: xóa session cũ, bắt đầu cuộc trò chuyện mới
                localStorage.removeItem('aiSessionId');
                setActiveSessionId(undefined);
                setSessions([]);
                setHasAccessToken(false);
                setMessages([{ id: Date.now().toString(), role: 'ai', textKey: 'conciergeApp.aiGreeting' }]);
                return;
            }

            await loadSessions();
            if (!isActive || !isMountedRef.current) return;

            setIsLoadingHistory(true);
            try {
                const res = await fetchOptionalAuth(`${API_BASE_URL}/ai/chat/me/latest`);
                if (!isActive || !isMountedRef.current) return;
                if (res.ok) {
                    const json = await res.json();
                    if (!isActive || !isMountedRef.current) return;
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
                if (isActive && isMountedRef.current) setIsLoadingHistory(false);
            }

            // Đã đăng nhập nhưng chưa có cuộc trò chuyện nào: bắt đầu mới
            setMessages([{ id: Date.now().toString(), role: 'ai', textKey: 'conciergeApp.aiGreeting' }]);
        };

        void loadHistory();
        window.addEventListener('auth-change', loadHistory);
        return () => {
            isActive = false;
            window.removeEventListener('auth-change', loadHistory);
        };
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

            window.clearTimeout(cooldownTimerRef.current);
            cooldownTimerRef.current = window.setTimeout(() => {
                if (isMountedRef.current) setCooldown(false);
            }, 1500);

            try {
                const sessionId = localStorage.getItem('aiSessionId');

                const res = await fetchOptionalAuth(`${API_BASE_URL}/ai/chat/stream`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, sessionId: sessionId || undefined }),
                });
                if (!isMountedRef.current) return;

                if (!res.ok) {
                    if (res.status === 429) throw new Error('RATE_LIMITED');
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

                if (!res.body) throw new Error('NO_BODY');

                const aiMsgId = (Date.now() + 1).toString();
                const reader = res.body.getReader();
                readerRef.current = reader;
                setIsStreaming(true);
                const decoder = new TextDecoder();
                let buffer = '';

                outer: while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (!isMountedRef.current) { reader.cancel(); break; }

                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split('\n\n');
                    buffer = parts.pop() ?? '';

                    for (const part of parts) {
                        if (!part.startsWith('data: ')) continue;
                        let event: { searching?: boolean; token?: string; done?: boolean; tourCard?: Message['tourCard']; sessionId?: string; error?: string; followUps?: string[] };
                        try { event = JSON.parse(part.slice(6)); } catch { continue; }

                        if (event.searching) {
                            setIsSearching(true);
                            continue;
                        }

                        if (event.error) {
                            setIsSearching(false);
                            setIsTyping(false);
                            setIsStreaming(false);
                            readerRef.current = null;
                            setMessages((prev) => [...prev, { id: aiMsgId, role: 'ai', text: event.error!, isError: true }]);
                            break outer;
                        }

                        if (event.token) {
                            setIsSearching(false);
                            setIsTyping(false);
                            setMessages((prev) => {
                                const last = prev[prev.length - 1];
                                if (last?.id === aiMsgId) {
                                    return [...prev.slice(0, -1), { ...last, text: (last.text ?? '') + event.token }];
                                }
                                return [...prev, { id: aiMsgId, role: 'ai', text: event.token! }];
                            });
                        }

                        if (event.done) {
                            setIsSearching(false);
                            setIsTyping(false);
                            setIsStreaming(false);
                            readerRef.current = null;
                            window.clearTimeout(cooldownTimerRef.current);
                            setCooldown(false);
                            setMessages((prev) => prev.map((m) =>
                                m.id === aiMsgId
                                    ? { ...m, tourCard: event.tourCard ?? m.tourCard, followUps: event.followUps }
                                    : m,
                            ));
                            if (event.sessionId) {
                                localStorage.setItem('aiSessionId', event.sessionId);
                                setActiveSessionId(event.sessionId);
                            }
                            if (hasAccessToken) await loadSessions();
                            break outer;
                        }
                    }
                }
            } catch (error) {
                console.error('[AI] Chat Error:', error);
                if (!isMountedRef.current) return;
                const isRateLimited = error instanceof Error && error.message === 'RATE_LIMITED';
                setIsSearching(false);
                setIsTyping(false);
                setIsStreaming(false);
                readerRef.current = null;
                window.clearTimeout(cooldownTimerRef.current);
                setCooldown(false);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'ai',
                        text: isRateLimited
                            ? t('conciergeApp.rateLimitError')
                            : t('conciergeApp.connectionError'),
                        isError: true,
                    },
                ]);
            }
        },
        [inputValue, isTyping, cooldown, loadSessions, hasAccessToken, t],
    );

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleStopGeneration = useCallback(() => {
        void readerRef.current?.cancel();
        readerRef.current = null;
        setIsStreaming(false);
        setIsSearching(false);
        setIsTyping(false);
        window.clearTimeout(cooldownTimerRef.current);
        setCooldown(false);
    }, []);

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
            try {
                await fetchOptionalAuth(`${API_BASE_URL}/ai/chat/${sessionId}`, {
                    method: 'DELETE',
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

    return {
        // State
        language,
        t,
        isOpen,
        setIsOpen,
        inputValue,
        setInputValue,
        isTyping,
        isSearching,
        isStreaming,
        cooldown,
        isLoadingHistory,
        isHistoryOpen,
        setIsHistoryOpen,
        isLoadingSessions,
        hasAccessToken,
        isContactDockOpen,
        setIsContactDockOpen,
        activeSessionId,
        sessions,
        messages,
        // Refs
        messagesEndRef,
        inputRef,
        // Handlers
        loadSessions,
        handleSendMessage,
        handleStopGeneration,
        handleStartNewConversation,
        handleSelectSession,
        handleDeleteSession,
    };
}

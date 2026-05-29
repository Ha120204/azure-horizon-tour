'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/constants';
import { fetchAuthProfile, fetchOptionalAuth } from '@/lib/authSession';
import type { Message, ChatSessionSummary } from './types';

export function useConcierge() {
    const { language, t } = useLocale();

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
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'ai', textKey: 'conciergeApp.aiGreeting' },
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    // ── Sync auth state ───────────────────────────────────────────────────
    useEffect(() => {
        const syncAuthState = async () => {
            const profile = await fetchAuthProfile();
            setHasAccessToken(Boolean(profile));
        };
        void syncAuthState();
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
        setIsLoadingSessions(true);
        try {
            const res = await fetchOptionalAuth(`${API_BASE_URL}/ai/chat/sessions`);
            if (res.status === 401) {
                setSessions([]);
                setHasAccessToken(false);
                return;
            }
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
        setIsLoadingHistory(true);
        try {
            const res = await fetchOptionalAuth(`${API_BASE_URL}/ai/chat/${sessionId}`);
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
            const profile = await fetchAuthProfile();

            await loadSessions();

            if (profile) {
                setIsLoadingHistory(true);
                try {
                    const res = await fetchOptionalAuth(`${API_BASE_URL}/ai/chat/me/latest`);
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
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };

                const res = await fetchOptionalAuth(`${API_BASE_URL}/ai/chat`, {
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
                if (hasAccessToken) await loadSessions();
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
        [inputValue, isTyping, cooldown, loadSessions, hasAccessToken],
    );

    // ── Handlers ──────────────────────────────────────────────────────────
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
        handleStartNewConversation,
        handleSelectSession,
        handleDeleteSession,
    };
}

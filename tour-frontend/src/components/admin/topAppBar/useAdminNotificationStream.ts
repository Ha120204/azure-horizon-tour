'use client';

import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import {
    dispatchAdminRealtimeNotification,
    parseAdminRealtimeNotification,
} from '@/lib/admin/adminRealtimeEvents';

type UseAdminNotificationStreamOptions = {
    enabled: boolean;
    onNotification: () => void;
};

type ApiObject = Record<string, unknown>;

const MIN_REFRESH_GAP_MS = 1500;
const RECONNECT_DELAY_MS = 3000;

function asObject(value: unknown): ApiObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as ApiObject : {};
}

function unwrapPayload(value: unknown): unknown {
    const obj = asObject(value);
    return obj.data !== undefined ? obj.data : value;
}

function getText(value: unknown) {
    return typeof value === 'string' ? value : '';
}

function extractStreamToken(value: unknown) {
    const payload = asObject(unwrapPayload(value));
    return getText(payload.token);
}

export function useAdminNotificationStream({
    enabled,
    onNotification,
}: UseAdminNotificationStreamOptions) {
    const onNotificationRef = useRef(onNotification);
    const lastRefreshAtRef = useRef(0);

    useEffect(() => {
        onNotificationRef.current = onNotification;
    }, [onNotification]);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') {
            return;
        }

        let cancelled = false;
        let eventSource: EventSource | null = null;
        let reconnectTimer: number | null = null;

        const closeStream = () => {
            eventSource?.close();
            eventSource = null;
        };

        const clearReconnectTimer = () => {
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        const requestRefresh = () => {
            const now = Date.now();
            if (now - lastRefreshAtRef.current < MIN_REFRESH_GAP_MS) {
                return;
            }

            lastRefreshAtRef.current = now;
            onNotificationRef.current();
        };
        const handleNotificationEvent = (event: MessageEvent) => {
            const notification = parseAdminRealtimeNotification(event.data);
            if (notification) {
                dispatchAdminRealtimeNotification(notification);
            }
            requestRefresh();
        };

        function scheduleReconnect() {
            if (cancelled || reconnectTimer !== null || document.visibilityState !== 'visible') {
                return;
            }

            reconnectTimer = window.setTimeout(() => {
                reconnectTimer = null;
                void connect();
            }, RECONNECT_DELAY_MS);
        }

        async function connect() {
            if (cancelled || document.visibilityState !== 'visible') {
                return;
            }

            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/admin/notifications/events-token`, {
                    method: 'POST',
                });

                if (!res.ok) {
                    scheduleReconnect();
                    return;
                }

                const token = extractStreamToken(await res.json());
                if (!token || cancelled || document.visibilityState !== 'visible') {
                    scheduleReconnect();
                    return;
                }

                closeStream();
                eventSource = new EventSource(
                    `${API_BASE_URL}/admin/notifications/events?token=${encodeURIComponent(token)}`,
                );
                eventSource.addEventListener('notification', handleNotificationEvent);
                eventSource.onerror = () => {
                    closeStream();
                    scheduleReconnect();
                };
            } catch {
                scheduleReconnect();
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestRefresh();
                void connect();
                return;
            }

            clearReconnectTimer();
            closeStream();
        };
        const handleFocus = () => {
            requestRefresh();
            void connect();
        };

        void connect();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            cancelled = true;
            clearReconnectTimer();
            closeStream();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [enabled]);
}

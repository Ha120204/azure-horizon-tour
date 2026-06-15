'use client';

import { useCallback, useState } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { toastEmitter } from '@/lib/http/toastEmitter';
import { API_BASE_URL } from '@/lib/http/constants';
import type { SupportTicket } from '@/components/profile/SupportTicketList';

type TicketResponse = SupportTicket | { data?: SupportTicket; message?: string };

function isSupportTicket(payload: unknown): payload is SupportTicket {
    return (
        typeof payload === 'object' &&
        payload !== null &&
        'id' in payload &&
        'subject' in payload &&
        'status' in payload
    );
}

function resolveTicket(payload: TicketResponse): SupportTicket | undefined {
    if (isSupportTicket(payload)) return payload;
    return payload.data;
}

export function useGuestTicketModal() {
    const { t } = useLocale();
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [accessCode, setAccessCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const open = useCallback(async (ticketId: number, code: string) => {
        const trimmed = code.trim();
        if (!trimmed) return;

        setIsLoading(true);
        setAccessCode(trimmed);
        try {
            const res = await fetch(`${API_BASE_URL}/support/customer/ticket/${ticketId}?accessCode=${encodeURIComponent(trimmed)}`);
            const payload = (await res.json()) as TicketResponse;
            const resolved = res.ok ? resolveTicket(payload) : undefined;
            if (!resolved) {
                toastEmitter.error(t('contact.lookupNotFound'));
                return;
            }
            setTicket(resolved);
        } catch {
            toastEmitter.error(t('contact.lookupNotFound'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    const close = useCallback(() => {
        setTicket(null);
        setAccessCode('');
    }, []);

    return { ticket, accessCode, isLoading, open, close, setTicket };
}

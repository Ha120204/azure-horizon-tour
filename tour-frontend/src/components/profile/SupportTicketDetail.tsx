'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { useLocale } from '@/context/LocaleContext';
import type { SupportTicket, TicketReply } from './SupportTicketList';

const STATUS_CONFIG = {
  NEW: { labelKey: 'profile.supportStatusNew', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'fiber_new', step: 0 },
  IN_PROGRESS: { labelKey: 'profile.supportStatusInProgress', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: 'pending', step: 1 },
  RESOLVED: { labelKey: 'profile.supportStatusResolved', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: 'check_circle', step: 2 },
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  booking: 'profile.supportCategoryBooking',
  payment: 'profile.supportCategoryPayment',
  reschedule: 'profile.supportCategoryReschedule',
  complaint: 'profile.supportCategoryComplaint',
  general: 'profile.supportCategoryGeneral',
};

const POLL_INTERVAL_MS = 10000;
const OPEN_TICKET_STATUSES = new Set<SupportTicket['status']>(['NEW', 'IN_PROGRESS']);

type CustomerTicketPayload = {
  content?: string;
  rating?: number;
  accessCode?: string;
};

type SupportTicketResponse = SupportTicket | { data?: SupportTicket; message?: string };

interface Props {
  ticket: SupportTicket;
  lookupAccessCode?: string;
  onClose: () => void;
  onTicketUpdate: (updatedTicket: SupportTicket) => void;
}

function isSupportTicket(payload: unknown): payload is SupportTicket {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'subject' in payload &&
    'status' in payload
  );
}

function resolveTicketResponse(payload: SupportTicketResponse): SupportTicket | undefined {
  if (isSupportTicket(payload)) return payload;
  return payload.data;
}

function resolveMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null || !('message' in payload)) return undefined;
  const message = (payload as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}

export default function SupportTicketDetail({
  ticket: initialTicket,
  lookupAccessCode,
  onClose,
  onTicketUpdate,
}: Props) {
  const { t, formatDateTime } = useLocale();
  const [ticket, setTicket] = useState<SupportTicket>(initialTicket);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(ticket.rating ?? 0);
  const [hasRated, setHasRated] = useState(Boolean(ticket.rating));
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const apiBase = API_BASE_URL;
  const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.NEW;
  const categoryKey = CATEGORY_LABEL_KEYS[ticket.category];
  const isGuestLookup = Boolean(lookupAccessCode);

  const callCustomerEndpoint = useCallback((path: string, init?: RequestInit) => {
    const url = `${apiBase}/support/customer/ticket/${ticket.id}${path}`;
    return isGuestLookup ? fetch(url, init) : fetchWithAuth(url, init);
  }, [apiBase, isGuestLookup, ticket.id]);

  const refreshTicket = useCallback(async () => {
    try {
      const query = lookupAccessCode ? `?accessCode=${encodeURIComponent(lookupAccessCode)}` : '';
      const res = await callCustomerEndpoint(query);
      if (!res.ok) return;

      const json = (await res.json()) as SupportTicketResponse;
      const updated = resolveTicketResponse(json);
      if (!updated) return;

      setTicket(updated);
      setSelectedRating(updated.rating ?? 0);
      setHasRated(Boolean(updated.rating));
      setLastSyncedAt(new Date());
      onTicketUpdate(updated);
    } catch {
      // Refresh is best-effort after customer actions.
    }
  }, [callCustomerEndpoint, lookupAccessCode, onTicketUpdate]);

  useEffect(() => {
    if (!OPEN_TICKET_STATUSES.has(ticket.status)) return;

    const pollTicket = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshTicket();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') pollTicket();
    };

    const intervalId = window.setInterval(pollTicket, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshTicket, ticket.status]);

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;
    setIsReplying(true);
    setError('');

    try {
      const body: CustomerTicketPayload = { content: replyContent.trim() };
      if (lookupAccessCode) body.accessCode = lookupAccessCode;

      const res = await callCustomerEndpoint('/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setReplyContent('');
        await refreshTicket();
      } else {
        setError(resolveMessage(await res.json()) ?? t('profile.supportSendFail'));
      }
    } catch {
      setError(t('profile.supportConnectionError'));
    } finally {
      setIsReplying(false);
    }
  };

  const handleRate = async (rating: number) => {
    setSelectedRating(rating);
    try {
      const body: CustomerTicketPayload = { rating };
      if (lookupAccessCode) body.accessCode = lookupAccessCode;

      const res = await callCustomerEndpoint('/rate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) setHasRated(true);
    } catch {
      // Rating failure is non-blocking; user can click again.
    }
  };

  const handleReopen = async () => {
    setIsReopening(true);
    try {
      const body: CustomerTicketPayload = {};
      if (lookupAccessCode) body.accessCode = lookupAccessCode;

      const res = await callCustomerEndpoint('/reopen', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) await refreshTicket();
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-outline">#{ticket.id}</span>
              <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${cfg.color}`}>
                <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
                {t(cfg.labelKey)}
              </span>
            </div>
            <h2 className="mt-0.5 line-clamp-1 font-headline text-base font-bold text-on-surface">{ticket.subject}</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="shrink-0 border-b border-outline-variant/10 bg-surface px-6 py-3">
          <div className="flex flex-wrap gap-4 text-xs text-outline">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">category</span>
              {categoryKey ? t(categoryKey) : ticket.category}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              {formatDateTime(ticket.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            {ticket.bookingRef && (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">confirmation_number</span>
                {t('profile.supportRef')} <span className="font-mono font-semibold text-on-surface">{ticket.bookingRef}</span>
              </span>
            )}
            {lastSyncedAt && (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">sync</span>
                {t('profile.supportSyncedAt', { time: formatDateTime(lastSyncedAt, { hour: '2-digit', minute: '2-digit' }) })}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <MessageBubble
            content={ticket.message}
            createdAt={ticket.createdAt}
            senderName={t('profile.supportYou')}
            senderType="customer"
          />

          {ticket.replies.map((reply: TicketReply) => (
            <MessageBubble
              key={reply.id}
              content={reply.content}
              createdAt={reply.createdAt}
              senderName={reply.senderType === 'customer' ? t('profile.supportYou') : reply.senderName}
              senderType={reply.senderType}
            />
          ))}

          {ticket.status === 'NEW' && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800">
                <span className="material-symbols-outlined text-sm text-white">support_agent</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-surface-container px-4 py-3 text-xs text-outline">
                {t('profile.supportAwaitingReply')}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-outline-variant/20 bg-surface">
          {ticket.status === 'RESOLVED' && (
            <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800">{t('profile.supportResolvedTitle')}</p>
                  <p className="mt-0.5 text-xs text-emerald-600">
                    {hasRated ? t('profile.supportRatedThanks') : t('profile.supportRatePrompt')}
                  </p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => !hasRated && handleRate(star)}
                      disabled={hasRated}
                      className={`text-2xl transition-transform hover:scale-110 disabled:cursor-default ${star <= selectedRating ? 'text-amber-400' : 'text-outline/30'}`}
                    >
                      *
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleReopen}
                disabled={isReopening}
                className="mt-3 flex items-center gap-1 text-xs text-emerald-700 underline underline-offset-4 transition-colors hover:text-emerald-900 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                {isReopening ? t('profile.supportReopening') : t('profile.supportReopen')}
              </button>
            </div>
          )}

          {ticket.status === 'IN_PROGRESS' && (
            <div className="px-6 py-4">
              {error && <p className="mb-2 text-xs text-error">{error}</p>}
              <div className="flex items-end gap-3">
                <textarea
                  value={replyContent}
                  onChange={(event) => setReplyContent(event.target.value)}
                  placeholder={t('profile.supportReplyPlaceholder')}
                  maxLength={1000}
                  rows={2}
                  className="flex-1 resize-none rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition-all placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={handleSendReply}
                  disabled={isReplying || !replyContent.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className={`material-symbols-outlined text-sm ${isReplying ? 'animate-spin' : ''}`}>
                    {isReplying ? 'progress_activity' : 'send'}
                  </span>
                </button>
              </div>
              <p className="mt-1.5 text-xs text-outline">{t('profile.supportReplyCount', { count: replyContent.length })}</p>
            </div>
          )}

          {ticket.status === 'NEW' && (
            <div className="px-6 py-4 text-center text-xs text-outline">
              {t('profile.supportCanReplyLater')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  content,
  createdAt,
  senderName,
  senderType,
}: {
  content: string;
  createdAt: string;
  senderName: string;
  senderType: 'staff' | 'customer';
}) {
  const { formatDateTime } = useLocale();
  const isStaff = senderType === 'staff';

  return (
    <div className={`flex gap-3 ${isStaff ? 'justify-start' : 'justify-end'}`}>
      {isStaff && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800">
          <span className="material-symbols-outlined text-sm text-white">support_agent</span>
        </div>
      )}
      <div className={`max-w-[85%] ${isStaff ? '' : 'order-first'}`}>
        <div className={`mb-1 flex items-center gap-2 ${isStaff ? '' : 'justify-end'}`}>
          <span className={`text-xs ${isStaff ? 'font-semibold text-primary' : 'text-outline'}`}>{senderName}</span>
          <span className="text-xs text-outline">{formatDateTime(createdAt, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
        </div>
        <div className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${isStaff ? 'rounded-tl-sm bg-surface-container text-on-surface' : 'rounded-tr-sm bg-primary/10 text-on-surface'}`}>
          {content}
        </div>
      </div>
      {!isStaff && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <span className="material-symbols-outlined text-sm text-primary">person</span>
        </div>
      )}
    </div>
  );
}

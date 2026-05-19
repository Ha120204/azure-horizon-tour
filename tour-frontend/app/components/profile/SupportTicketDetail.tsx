'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import type { SupportTicket, TicketReply } from './SupportTicketList';

const STATUS_CONFIG = {
  NEW: { label: 'Dang cho xu ly', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'fiber_new', step: 0 },
  IN_PROGRESS: { label: 'Dang xu ly', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: 'pending', step: 1 },
  RESOLVED: { label: 'Da giai quyet', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: 'check_circle', step: 2 },
};

const CATEGORY_LABELS: Record<string, string> = {
  booking: 'Dat tour',
  payment: 'Thanh toan',
  reschedule: 'Doi lich',
  complaint: 'Khieu nai',
  general: 'Chung',
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

function formatSyncedAt(date: Date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function SupportTicketDetail({
  ticket: initialTicket,
  lookupAccessCode,
  onClose,
  onTicketUpdate,
}: Props) {
  const [ticket, setTicket] = useState<SupportTicket>(initialTicket);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(ticket.rating ?? 0);
  const [hasRated, setHasRated] = useState(Boolean(ticket.rating));
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.NEW;
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
        setError(resolveMessage(await res.json()) ?? 'Khong the gui phan hoi.');
      }
    } catch {
      setError('Loi ket noi, vui long thu lai.');
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
                {cfg.label}
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
              {CATEGORY_LABELS[ticket.category] ?? ticket.category}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
            </span>
            {ticket.bookingRef && (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">confirmation_number</span>
                Ref: <span className="font-mono font-semibold text-on-surface">{ticket.bookingRef}</span>
              </span>
            )}
            {lastSyncedAt && (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">sync</span>
                Cap nhat {formatSyncedAt(lastSyncedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <MessageBubble
            content={ticket.message}
            createdAt={ticket.createdAt}
            senderName="Ban"
            senderType="customer"
          />

          {ticket.replies.map((reply: TicketReply) => (
            <MessageBubble
              key={reply.id}
              content={reply.content}
              createdAt={reply.createdAt}
              senderName={reply.senderName}
              senderType={reply.senderType}
            />
          ))}

          {ticket.status === 'NEW' && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800">
                <span className="material-symbols-outlined text-sm text-white">support_agent</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-surface-container px-4 py-3 text-xs text-outline">
                Nhan vien se phan hoi trong thoi gian som nhat.
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-outline-variant/20 bg-surface">
          {ticket.status === 'RESOLVED' && (
            <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800">Yeu cau da duoc giai quyet</p>
                  <p className="mt-0.5 text-xs text-emerald-600">
                    {hasRated ? 'Cam on ban da danh gia.' : 'Danh gia muc do hai long cua ban.'}
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
                {isReopening ? 'Dang mo lai...' : 'Van de chua duoc giai quyet? Mo lai yeu cau'}
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
                  placeholder="Bo sung thong tin cho nhan vien ho tro..."
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
              <p className="mt-1.5 text-xs text-outline">{replyContent.length}/1000 ky tu</p>
            </div>
          )}

          {ticket.status === 'NEW' && (
            <div className="px-6 py-4 text-center text-xs text-outline">
              Ban co the bo sung thong tin sau khi nhan vien phan hoi.
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
          <span className="text-xs text-outline">{format(new Date(createdAt), 'HH:mm dd/MM', { locale: vi })}</span>
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

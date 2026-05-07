'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import type { SupportTicket, TicketReply } from './SupportTicketList';

const STATUS_CONFIG = {
  NEW:         { label: 'Đang chờ xử lý', color: 'text-blue-600 bg-blue-50 border-blue-200',   icon: 'fiber_new',    step: 0 },
  IN_PROGRESS: { label: 'Đang xử lý',     color: 'text-amber-600 bg-amber-50 border-amber-200', icon: 'pending',      step: 1 },
  RESOLVED:    { label: 'Đã giải quyết',  color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: 'check_circle', step: 2 },
};

const CATEGORY_LABELS: Record<string, string> = {
  booking: 'Đặt tour', payment: 'Thanh toán', reschedule: 'Đổi lịch', complaint: 'Khiếu nại', general: 'Chung',
};

interface Props {
  ticket: SupportTicket;
  lookupEmail?: string; // Dùng cho guest (không đăng nhập)
  onClose: () => void;
  onTicketUpdate: (updatedTicket: SupportTicket) => void;
}

export default function SupportTicketDetail({ ticket: initialTicket, lookupEmail, onClose, onTicketUpdate }: Props) {
  const [ticket, setTicket] = useState<SupportTicket>(initialTicket);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(ticket.rating ?? 0);
  const [hasRated, setHasRated] = useState(!!ticket.rating);
  const [error, setError] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const emailParam = lookupEmail ? `?email=${encodeURIComponent(lookupEmail)}` : '';
  const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG['NEW'];

  const refreshTicket = async () => {
    try {
      const fn = lookupEmail
        ? () => fetch(`${apiBase}/support/customer/ticket/${ticket.id}${emailParam}`)
        : () => fetchWithAuth(`${apiBase}/support/customer/ticket/${ticket.id}`);
      const res = await fn();
      if (res.ok) {
        const json = await res.json();
        // API có thể trả về { data: {...} } hoặc trực tiếp object
        const updated = json?.data ?? json;
        setTicket(updated);
        onTicketUpdate(updated);
      }
    } catch {}
  };

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;
    setIsReplying(true);
    setError('');
    try {
      const body: any = { content: replyContent };
      if (lookupEmail) body.email = lookupEmail;

      const fn = lookupEmail
        ? () => fetch(`${apiBase}/support/customer/ticket/${ticket.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : () => fetchWithAuth(`${apiBase}/support/customer/ticket/${ticket.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      const res = await fn();
      if (res.ok) {
        setReplyContent('');
        await refreshTicket();
      } else {
        const data = await res.json();
        setError(data.message ?? 'Gửi phản hồi thất bại');
      }
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setIsReplying(false);
    }
  };

  const handleRate = async (rating: number) => {
    setSelectedRating(rating);
    try {
      const body: any = { rating };
      if (lookupEmail) body.email = lookupEmail;

      const fn = lookupEmail
        ? () => fetch(`${apiBase}/support/customer/ticket/${ticket.id}/rate`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : () => fetchWithAuth(`${apiBase}/support/customer/ticket/${ticket.id}/rate`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      const res = await fn();
      if (res.ok) setHasRated(true);
    } catch {}
  };

  const handleReopen = async () => {
    setIsReopening(true);
    try {
      const body: any = {};
      if (lookupEmail) body.email = lookupEmail;

      const fn = lookupEmail
        ? () => fetch(`${apiBase}/support/customer/ticket/${ticket.id}/reopen`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : () => fetchWithAuth(`${apiBase}/support/customer/ticket/${ticket.id}/reopen`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      const res = await fn();
      if (res.ok) await refreshTicket();
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-surface w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-outline">#{ticket.id}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${cfg.color}`}>
                <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
                {cfg.label}
              </span>
            </div>
            <h2 className="font-headline font-bold text-on-surface text-base mt-0.5 line-clamp-1">{ticket.subject}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-outline transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-outline-variant/20 shrink-0">
          <div className="flex items-center gap-0">
            {['Đã tiếp nhận', 'Đang xử lý', 'Hoàn tất'].map((step, i) => {
              const done = cfg.step > i;
              const active = cfg.step === i;
              return (
                <div key={i} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-surface-container text-outline'}`}>
                      {done
                        ? <span className="material-symbols-outlined text-sm">check</span>
                        : active
                        ? <span className="material-symbols-outlined text-sm animate-pulse">radio_button_checked</span>
                        : <span className="text-xs">{i + 1}</span>
                      }
                    </div>
                    <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${active ? 'text-primary' : done ? 'text-emerald-600' : 'text-outline'}`}>{step}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all ${done ? 'bg-emerald-400' : 'bg-outline-variant/30'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Meta info */}
        <div className="px-6 py-3 flex flex-wrap gap-4 border-b border-outline-variant/10 bg-surface shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-outline">
            <span className="material-symbols-outlined text-sm">category</span>
            {CATEGORY_LABELS[ticket.category] ?? ticket.category}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-outline">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            Gửi {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
          </div>
          {ticket.bookingRef && (
            <div className="flex items-center gap-1.5 text-xs text-outline">
              <span className="material-symbols-outlined text-sm">confirmation_number</span>
              Ref: <span className="font-mono font-semibold text-on-surface">{ticket.bookingRef}</span>
            </div>
          )}
        </div>

        {/* Conversation Thread */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Original message */}
          <div className="flex gap-3 justify-end">
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className="text-xs text-outline">Bạn</span>
                <span className="text-xs text-outline">·</span>
                <span className="text-xs text-outline">{format(new Date(ticket.createdAt), 'HH:mm dd/MM', { locale: vi })}</span>
              </div>
              <div className="bg-primary/10 text-on-surface rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                {ticket.message}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm text-primary">person</span>
            </div>
          </div>

          {/* Replies */}
          {ticket.replies.map((reply: TicketReply) => {
            const isStaff = reply.senderType === 'staff';
            return (
              <div key={reply.id} className={`flex gap-3 ${isStaff ? 'justify-start' : 'justify-end'}`}>
                {isStaff && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm text-white">support_agent</span>
                  </div>
                )}
                <div className={`max-w-[85%] ${isStaff ? '' : 'order-first'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isStaff ? '' : 'justify-end'}`}>
                    {isStaff && <span className="text-xs font-semibold text-primary">{reply.senderName}</span>}
                    <span className="text-xs text-outline">{format(new Date(reply.createdAt), 'HH:mm dd/MM', { locale: vi })}</span>
                    {!isStaff && <span className="text-xs text-outline">Bạn</span>}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isStaff ? 'bg-surface-container text-on-surface rounded-tl-sm' : 'bg-primary/10 text-on-surface rounded-tr-sm'}`}>
                    {reply.content}
                  </div>
                </div>
                {!isStaff && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm text-primary">person</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Waiting indicator when NEW */}
          {ticket.status === 'NEW' && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm text-white">support_agent</span>
              </div>
              <div className="bg-surface-container rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs text-outline mt-1 block">Nhân viên sẽ phản hồi trong 2 giờ làm việc</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Area */}
        <div className="shrink-0 border-t border-outline-variant/20 bg-surface">

          {/* Rating section (chỉ khi RESOLVED) */}
          {ticket.status === 'RESOLVED' && (
            <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800">✅ Yêu cầu đã được giải quyết</p>
                  {!hasRated ? (
                    <p className="text-xs text-emerald-600 mt-0.5">Hãy đánh giá mức độ hài lòng của bạn</p>
                  ) : (
                    <p className="text-xs text-emerald-600 mt-0.5">Cảm ơn bạn đã đánh giá!</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => !hasRated && handleRate(star)}
                      disabled={hasRated}
                      className={`text-2xl transition-transform hover:scale-110 disabled:cursor-default ${star <= selectedRating ? 'text-amber-400' : 'text-outline/30'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleReopen}
                disabled={isReopening}
                className="mt-3 text-xs text-emerald-700 hover:text-emerald-900 underline underline-offset-4 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                {isReopening ? 'Đang mở lại...' : 'Vấn đề chưa được giải quyết? Mở lại yêu cầu'}
              </button>
            </div>
          )}

          {/* Reply box (chỉ khi IN_PROGRESS) */}
          {ticket.status === 'IN_PROGRESS' && (
            <div className="px-6 py-4">
              {error && <p className="text-xs text-error mb-2">{error}</p>}
              <div className="flex gap-3 items-end">
                <textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Bổ sung thông tin cho nhân viên hỗ trợ…"
                  maxLength={1000}
                  rows={2}
                  className="flex-1 px-4 py-3 bg-surface-container-low rounded-2xl text-sm text-on-surface placeholder:text-outline/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  onClick={handleSendReply}
                  disabled={isReplying || !replyContent.trim()}
                  className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isReplying
                    ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-sm">send</span>
                  }
                </button>
              </div>
              <p className="text-xs text-outline mt-1.5">{replyContent.length}/1000 ký tự</p>
            </div>
          )}

          {ticket.status === 'NEW' && (
            <div className="px-6 py-4">
              <p className="text-xs text-outline text-center flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-sm">info</span>
                Bạn có thể bổ sung thông tin sau khi nhân viên phản hồi
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

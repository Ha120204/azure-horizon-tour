'use client';

import { formatDistanceToNow } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import { useLocale } from '@/app/context/LocaleContext';

export interface TicketReply {
  id: number;
  senderType: 'staff' | 'customer';
  senderName: string;
  content: string;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  subject: string;
  category: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  message: string;
  bookingRef?: string;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  replies: TicketReply[];
}

const STATUS_CONFIG = {
  NEW: { labelKey: 'profile.supportStatusNew', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: 'fiber_new' },
  IN_PROGRESS: { labelKey: 'profile.supportStatusInProgress', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', icon: 'pending' },
  RESOLVED: { labelKey: 'profile.supportStatusResolved', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: 'check_circle' },
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  booking: 'profile.supportCategoryBooking',
  payment: 'profile.supportCategoryPayment',
  reschedule: 'profile.supportCategoryReschedule',
  complaint: 'profile.supportCategoryComplaint',
  general: 'profile.supportCategoryGeneral',
};

interface Props {
  tickets: SupportTicket[];
  onSelectTicket: (ticket: SupportTicket) => void;
}

export default function SupportTicketList({ tickets, onSelectTicket }: Props) {
  const { t, language } = useLocale();
  const dateLocale = language === 'vi' ? vi : enUS;

  if (tickets.length === 0) {
    return (
      <div className="py-16 text-center bg-surface-container-lowest rounded-2xl ambient-shadow">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-primary">support_agent</span>
        </div>
        <h3 className="text-lg font-headline font-bold text-on-surface mb-2">{t('profile.supportEmptyTitle')}</h3>
        <p className="text-sm text-outline max-w-xs mx-auto">
          {t('profile.supportEmptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map(ticket => {
        const cfg = STATUS_CONFIG[ticket.status];
        const lastReply = ticket.replies?.[0];
        const hasStaffReply = ticket.replies?.some(r => r.senderType === 'staff');
        const categoryKey = CATEGORY_LABEL_KEYS[ticket.category];

        return (
          <button
            key={ticket.id}
            onClick={() => onSelectTicket(ticket)}
            className="w-full text-left group bg-surface-container-lowest rounded-2xl ambient-shadow hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden border border-transparent hover:border-primary/10"
          >
            <div className={`h-1 w-full ${cfg.dot}`} />

            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-outline font-medium">#{ticket.id}</span>
                    <span className="text-xs px-2 py-0.5 bg-surface-container rounded-full text-on-surface-variant font-medium">
                      {categoryKey ? t(categoryKey) : ticket.category}
                    </span>
                    {hasStaffReply && ticket.status === 'IN_PROGRESS' && (
                      <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                        {t('profile.supportNewReply')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline font-bold text-on-surface text-sm line-clamp-1">
                    {ticket.subject}
                  </h3>
                </div>

                <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {t(cfg.labelKey)}
                </span>
              </div>

              <p className="text-xs text-outline line-clamp-2 mb-3 leading-relaxed">
                {lastReply ? `${lastReply.senderName}: ${lastReply.content}` : ticket.message}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-outline">
                  {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: dateLocale })}
                </span>
                <span className="text-primary text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                  {t('profile.supportViewDetails')}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

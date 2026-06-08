import { useMemo } from 'react';
import { useLocale } from '@/context/LocaleContext';
import type { CancellationPolicy } from '../_lib/types';

type Props = {
    cancellationPolicy: CancellationPolicy;
    bookingCreatedAt: string;
    isPaidBooking: boolean;
};

type TierStyle = {
    bg: string;
    border: string;
    text: string;
    iconColor: string;
    icon: string;
    badgeBg: string;
    badgeText: string;
    label: string;
};

function getTierStyle(policyTier: string, canCancel: boolean, tripLifecycle: string): TierStyle {
    if (!canCancel || policyTier === 'NOT_CANCELABLE') {
        if (tripLifecycle === 'COMPLETED') {
            return {
                bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600',
                iconColor: 'text-slate-400', icon: 'task_alt',
                badgeBg: '', badgeText: '', label: 'Chuyến đi đã hoàn thành',
            };
        }
        return {
            bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800',
            iconColor: 'text-red-400', icon: 'event_busy',
            badgeBg: '', badgeText: '', label: 'Không thể hủy',
        };
    }
    if (policyTier === 'FULL_REFUND_24H') {
        return {
            bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800',
            iconColor: 'text-emerald-600', icon: 'check_circle',
            badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', label: 'Hủy miễn phí',
        };
    }
    if (policyTier === 'UNPAID') {
        return {
            bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800',
            iconColor: 'text-emerald-600', icon: 'check_circle',
            badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', label: 'Hủy miễn phí',
        };
    }
    if (policyTier === 'EIGHTY_REFUND') {
        return {
            bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900',
            iconColor: 'text-amber-600', icon: 'event_available',
            badgeBg: 'bg-amber-100', badgeText: 'text-amber-800', label: 'Hủy có phí',
        };
    }
    if (policyTier === 'HALF_REFUND') {
        return {
            bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900',
            iconColor: 'text-orange-500', icon: 'event_available',
            badgeBg: 'bg-orange-100', badgeText: 'text-orange-800', label: 'Hủy có phí',
        };
    }
    // NO_REFUND — can cancel but no money back
    return {
        bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900',
        iconColor: 'text-red-400', icon: 'money_off',
        badgeBg: 'bg-red-100', badgeText: 'text-red-700', label: 'Hủy không hoàn tiền',
    };
}

export function BookingCancellationPolicy({ cancellationPolicy, bookingCreatedAt, isPaidBooking }: Props) {
    const { formatPrice, formatDate, formatDateTime, language } = useLocale();

    const {
        policyTier, canCancel, refundPercent, estimatedRefundAmount,
        departureDate, tripLifecycle, refundNote, cancelUnavailableReason,
    } = cancellationPolicy;

    const style = getTierStyle(policyTier, canCancel, tripLifecycle);

    // Deadline when this tier expires (next tier kicks in)
    const tierDeadline = useMemo<Date | null>(() => {
        if (policyTier === 'FULL_REFUND_24H') {
            return new Date(new Date(bookingCreatedAt).getTime() + 24 * 60 * 60 * 1000);
        }
        if (policyTier === 'EIGHTY_REFUND') {
            return new Date(new Date(departureDate).getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        if (policyTier === 'HALF_REFUND') {
            return new Date(new Date(departureDate).getTime() - 3 * 24 * 60 * 60 * 1000);
        }
        return null;
    }, [policyTier, bookingCreatedAt, departureDate]);

    const deadlineLabel = useMemo<string | null>(() => {
        if (!tierDeadline) return null;
        if (policyTier === 'FULL_REFUND_24H') {
            return language === 'vi'
                ? `Hủy miễn phí đến: ${formatDateTime(tierDeadline.toISOString())}`
                : `Free cancel until: ${formatDateTime(tierDeadline.toISOString())}`;
        }
        if (policyTier === 'EIGHTY_REFUND') {
            return language === 'vi'
                ? `Hạn hoàn 80%: trước ${formatDate(tierDeadline.toISOString())}`
                : `80% refund deadline: before ${formatDate(tierDeadline.toISOString())}`;
        }
        if (policyTier === 'HALF_REFUND') {
            return language === 'vi'
                ? `Hạn hoàn 50%: trước ${formatDate(tierDeadline.toISOString())}`
                : `50% refund deadline: before ${formatDate(tierDeadline.toISOString())}`;
        }
        return null;
    }, [tierDeadline, policyTier, language, formatDate, formatDateTime]);

    const note = canCancel ? refundNote : (cancelUnavailableReason ?? refundNote);

    return (
        <div className={`rounded-xl border px-4 py-3.5 ${style.bg} ${style.border} ${style.text}`}>
            {/* Header: label + refund badge */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                    <span
                        className={`material-symbols-outlined text-[18px] shrink-0 ${style.iconColor}`}
                        style={policyTier === 'FULL_REFUND_24H' || policyTier === 'UNPAID'
                            ? { fontVariationSettings: "'FILL' 1" }
                            : undefined}
                    >
                        {style.icon}
                    </span>
                    {style.label}
                </div>
                {canCancel && refundPercent > 0 && style.badgeBg && (
                    <span className={`shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-full ${style.badgeBg} ${style.badgeText}`}>
                        {refundPercent}%
                    </span>
                )}
            </div>

            {/* Refund amount */}
            {canCancel && isPaidBooking && estimatedRefundAmount > 0 && (
                <p className="mt-2 text-sm font-semibold">
                    {language === 'vi' ? 'Hoàn dự kiến: ' : 'Est. refund: '}
                    <span className="font-extrabold">{formatPrice(estimatedRefundAmount)}</span>
                </p>
            )}

            {/* Tier deadline */}
            {deadlineLabel && (
                <p className="mt-1.5 text-xs font-medium opacity-80">{deadlineLabel}</p>
            )}

            {/* Note */}
            {note && (
                <p className="mt-1.5 text-xs opacity-60 leading-relaxed">{note}</p>
            )}
        </div>
    );
}

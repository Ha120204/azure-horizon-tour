'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/context/LocaleContext';
import {
    BOOKING_PRESENTATIONS,
    getBookingPresentationKey,
} from '../_lib/bookingStatus';

export type BookingHistoryItem = {
    id: number | string;
    bookingCode?: string;
    createdAt: string;
    departureDate?: string | null;
    meetingTime?: string | null;
    pickupLocation?: string | null;
    numberOfPeople: number;
    totalPrice: number;
    paymentStatus: 'PAID' | 'UNPAID' | 'PROCESSING' | 'FAILED';
    paymentMethod?: 'PAYOS' | 'IN_STORE';
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CANCEL_REQUESTED';
    holdExpiresAt?: string | null;
    voucherStatus?: 'PENDING_PAYMENT' | 'ISSUED' | 'CANCELLED' | 'NOT_AVAILABLE';
    refundStatus?: 'NONE' | 'NOT_REQUIRED' | 'REQUESTED' | 'PROCESSING' | 'REFUNDED';
    cancelRequestedAt?: string | null;
    cancelledAt?: string | null;
    refundAmount?: number | null;
    refundNote?: string | null;
    tour?: {
        id?: number;
        name?: string;
        tourCode?: string;
        imageUrl?: string;
        startDate?: string;
        departurePoint?: string | null;
    };
};

type Props = {
    booking: BookingHistoryItem;
    isCompleted: boolean;
};

export function BookingCard({ booking, isCompleted }: Props) {
    const { t, formatPrice, formatDate } = useLocale();
    const [isCodeCopied, setIsCodeCopied] = useState(false);
    const isInactive = booking.status === 'CANCELLED';
    const presentation = BOOKING_PRESENTATIONS[getBookingPresentationKey({
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        isCompleted,
    })];
    const departureDate = booking.departureDate ?? booking.tour?.startDate;
    const pickupLocation =
        booking.pickupLocation
        ?? booking.tour?.departurePoint
        ?? t('my_bookings.locationPending');

    useEffect(() => {
        if (!isCodeCopied) return;
        const timeout = window.setTimeout(() => setIsCodeCopied(false), 1800);
        return () => window.clearTimeout(timeout);
    }, [isCodeCopied]);

    const copyBookingCode = async () => {
        if (!booking.bookingCode) return;

        try {
            await navigator.clipboard.writeText(booking.bookingCode);
            setIsCodeCopied(true);
        } catch {
            const input = document.createElement('textarea');
            input.value = booking.bookingCode;
            input.setAttribute('readonly', '');
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            const copied = document.execCommand('copy');
            document.body.removeChild(input);
            if (copied) setIsCodeCopied(true);
        }
    };

    return (
        <article
            className={`group grid overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow,transform] duration-300 motion-reduce:transition-none md:grid-cols-[220px_minmax(0,1fr)] ${
                isInactive
                    ? 'border-slate-200 bg-slate-50/70'
                    : 'border-outline-variant/20 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_16px_40px_rgba(15,47,87,0.09)] motion-reduce:hover:translate-y-0'
            }`}
        >
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 md:aspect-auto md:min-h-[300px]">
                <Image
                    alt={booking.tour?.name || 'Tour Image'}
                    src={booking.tour?.imageUrl || 'https://images.unsplash.com/photo-1499681404123-6c7102ce0033'}
                    fill
                    sizes="(min-width: 768px) 220px, 100vw"
                    className={`object-cover transition-transform duration-500 motion-reduce:transition-none ${
                        isInactive ? 'grayscale-[35%] opacity-70' : 'group-hover:scale-[1.03]'
                    }`}
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-md bg-white/95 px-2.5 py-1.5 text-[11px] font-extrabold uppercase text-slate-800 shadow-sm">
                    {t('my_bookings.tourCode')} {booking.tour?.tourCode || 'N/A'}
                </span>
            </div>

            <div className="flex min-w-0 flex-col p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="mb-2 flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="min-w-0 text-xs font-bold uppercase text-outline">
                                {t('my_bookings.bookingCodeLabel')}
                                <span className="ml-2 break-all font-mono text-on-surface">{booking.bookingCode}</span>
                            </p>
                            <button
                                type="button"
                                title={isCodeCopied ? t('my_bookings.bookingCodeCopied') : t('my_bookings.copyBookingCode')}
                                aria-label={isCodeCopied ? t('my_bookings.bookingCodeCopied') : t('my_bookings.copyBookingCode')}
                                disabled={!booking.bookingCode}
                                onClick={copyBookingCode}
                                className={`group/copy inline-flex size-11 shrink-0 items-center justify-center rounded-md border transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isCodeCopied
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-outline-variant/30 bg-white text-outline hover:border-primary/40 hover:text-primary'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/copy:scale-110 motion-reduce:transition-none motion-reduce:group-hover/copy:scale-100" aria-hidden="true">
                                    {isCodeCopied ? 'check' : 'content_copy'}
                                </span>
                            </button>
                            <span
                                aria-live="polite"
                                className={`w-16 text-xs font-bold text-emerald-700 transition-opacity motion-reduce:transition-none ${
                                    isCodeCopied ? 'opacity-100' : 'opacity-0'
                                }`}
                            >
                                {t('my_bookings.copiedShort')}
                            </span>
                        </div>
                        <h2 className="break-words font-headline text-xl font-extrabold leading-tight text-on-surface transition-colors motion-reduce:transition-none group-hover:text-primary sm:text-2xl">
                            {booking.tour?.name || 'Azure Horizon Luxury Tour'}
                        </h2>
                    </div>

                    <span className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 self-start rounded-md border px-3 py-1.5 text-xs font-bold ${presentation.badgeClass}`}>
                        <span className="material-symbols-outlined text-sm">
                            {presentation.badgeIcon}
                        </span>
                        {t(presentation.badgeLabelKey)}
                    </span>
                </div>

                <div className={`mt-4 flex items-start gap-2 text-sm font-medium ${presentation.messageClass}`}>
                    <span className="material-symbols-outlined mt-0.5 text-base">
                        {presentation.messageIcon}
                    </span>
                    <span>{t(presentation.messageKey)}</span>
                </div>

                <div className="my-5 grid gap-4 border-y border-outline-variant/15 py-5 sm:grid-cols-3">
                    <InfoItem
                        icon="event"
                        label={t('my_bookings.departureDateLbl')}
                        value={
                            departureDate
                                ? formatDate(departureDate, {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                })
                                : t('my_bookings.notUpdated')
                        }
                    />
                    <InfoItem
                        icon="schedule"
                        label={t('my_bookings.meetingTimeLbl')}
                        value={
                            booking.meetingTime
                                ? formatDate(booking.meetingTime, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })
                                : t('my_bookings.notUpdated')
                        }
                    />
                    <InfoItem
                        icon="location_on"
                        label={t('my_bookings.pickupLocationLbl')}
                        value={pickupLocation}
                    />
                </div>

                <div className="mt-auto flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
                        <Metric
                            label={t('my_bookings.passengersLbl')}
                            value={String(booking.numberOfPeople)}
                        />
                        <Metric
                            label={t('my_bookings.bookedOnLbl')}
                            value={formatDate(booking.createdAt)}
                        />
                        <Metric
                            label={t('my_bookings.totalAmountLbl')}
                            value={formatPrice(booking.totalPrice)}
                            emphasized
                        />
                    </dl>

                    <Link
                        href={`/my-bookings/${booking.id}#${presentation.ctaTarget}`}
                        className={`group/action inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold shadow-sm transition-[background-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ${presentation.ctaClass}`}
                    >
                        {t(presentation.ctaLabelKey)}
                        <span className={`material-symbols-outlined text-lg transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${presentation.ctaIconHoverClass}`}>
                            {presentation.ctaIcon}
                        </span>
                    </Link>
                </div>
            </div>
        </article>
    );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="flex min-w-0 gap-3">
            <span className="material-symbols-outlined text-xl text-primary">{icon}</span>
            <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase text-outline">{label}</p>
                <p className="mt-1 break-words text-sm font-bold leading-snug text-on-surface">{value}</p>
            </div>
        </div>
    );
}

function Metric({
    label,
    value,
    emphasized = false,
}: {
    label: string;
    value: string;
    emphasized?: boolean;
}) {
    return (
        <div className={`min-w-0 ${emphasized ? 'col-span-2 sm:col-span-1' : ''}`}>
            <dt className="text-[11px] font-bold uppercase text-outline">{label}</dt>
            <dd className={`mt-1 break-words font-extrabold tabular-nums ${emphasized ? 'text-base text-primary' : 'text-sm text-on-surface'}`}>
                {value}
            </dd>
        </div>
    );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { RecentBooking } from '../_lib/types';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1610574138412-7bf28ade0222?w=600&auto=format&fit=crop&q=60';

interface RecentBookingCardProps {
    booking: RecentBooking;
    t: (key: string) => string;
    formatPrice: (price: number) => string;
    formatDate: (date: string) => string;
}

export default function RecentBookingCard({ booking, t, formatPrice, formatDate }: RecentBookingCardProps) {
    const isCancelled = booking.status === 'CANCELLED';
    const isCancelRequested = booking.status === 'CANCEL_REQUESTED';
    const isPaid = booking.paymentStatus === 'PAID' && !isCancelled && !isCancelRequested;

    const badgeLabel = isCancelled ? t('profile.cancelledBadge') : isCancelRequested ? t('profile.cancelRequestedBadge') : isPaid ? t('profile.confirmedBadge') : t('profile.unpaidBadge');
    const badgeClass = isCancelled ? 'bg-red-50 text-red-600 border border-red-200' : isCancelRequested ? 'bg-orange-50 text-orange-600 border border-orange-200' : isPaid ? 'bg-tertiary-container text-white' : 'bg-secondary-container text-on-secondary-container';
    const statusLabel = isCancelled ? t('profile.cancelledLbl') : isCancelRequested ? t('profile.cancelRequestedLbl') : isPaid ? t('profile.paidLbl') : t('profile.incompleteLbl');
    const statusClass = isCancelled ? 'text-red-600 bg-red-50' : isCancelRequested ? 'text-orange-600 bg-orange-50' : isPaid ? 'text-tertiary-container bg-tertiary-container/10' : 'text-amber-600 bg-amber-50';

    return (
        <div className="group bg-surface-container-lowest rounded-xl overflow-hidden ambient-shadow transition-all duration-300 hover:-translate-y-1">
            <div className="relative h-48 overflow-hidden">
                <Image
                    alt={booking.tour?.name || 'Tour image'}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    src={booking.tour?.imageUrl || FALLBACK_IMAGE}
                />
                <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-full shadow-lg ${badgeClass}`}>{badgeLabel}</span>
                </div>
                <div className="absolute -bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-xl border border-surface-container">
                    <span className="text-lg font-bold font-headline text-primary">{formatPrice(booking.totalPrice)}</span>
                </div>
            </div>
            <div className="p-6 pt-8 space-y-4">
                <div>
                    <h3 className="text-lg font-headline font-bold text-on-surface line-clamp-1" title={booking.tour?.name}>{booking.tour?.name}</h3>
                    <p className="text-xs text-outline font-medium flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {t('profile.bookingDate')}: {formatDate(booking.createdAt)}
                    </p>
                </div>
                <div className="flex justify-between items-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${statusClass}`}>{statusLabel}</span>
                    <Link href={`/my-bookings/${booking.id}`} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

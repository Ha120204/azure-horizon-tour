'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/http/fetchWithAuth';
import { useLocale } from '@/context/LocaleContext';
import { BookingCard, type BookingHistoryItem } from '@/components/booking/BookingCard';
import {
    BookingEmptyState,
    BookingErrorState,
    BookingListSkeleton,
} from '@/components/booking/BookingListStates';
import {
    type BookingFilter,
    getBookingPriority,
    getDepartureDayTime,
    isAwaitingPaymentBooking,
    isCancelledBooking,
    isCompletedBooking,
    isUpcomingBooking,
} from './_lib/bookingFilters';

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadError, setHasLoadError] = useState(false);
    const { t, language } = useLocale();

    const [filterStatus, setFilterStatus] = useState<BookingFilter>('ALL');

    const fetchMyBookings = useCallback(async () => {
        setIsLoading(true);
        setHasLoadError(false);

        try {
            const result = await api.get<BookingHistoryItem[]>(`/booking/history/my-bookings?locale=${language}`);
            if (!result.ok || !Array.isArray(result.data)) {
                setHasLoadError(true);
                return;
            }
            setBookings(result.data);
        } catch (error) {
            console.error('Lỗi tải lịch sử:', error);
            setHasLoadError(true);
        } finally {
            setIsLoading(false);
        }
    }, [language]);

    useEffect(() => {
        void fetchMyBookings();
    }, [fetchMyBookings]);

    const todayTime = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.getTime();
    }, []);

    const sortedBookings = useMemo(() => [...bookings].sort((a, b) => {
        const aPriority = getBookingPriority(a, todayTime);
        const bPriority = getBookingPriority(b, todayTime);
        if (aPriority !== bPriority) return aPriority - bPriority;

        const aDepartureTime = getDepartureDayTime(a);
        const bDepartureTime = getDepartureDayTime(b);
        const bothHaveDepartureDates =
            Number.isFinite(aDepartureTime) && Number.isFinite(bDepartureTime);

        if (bothHaveDepartureDates && aPriority <= 2) {
            return aDepartureTime - bDepartureTime;
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }), [bookings, todayTime]);

    const filteredBookings = useMemo(() => sortedBookings.filter(booking => {
        if (filterStatus === 'ALL') return true;
        if (filterStatus === 'UPCOMING') return isUpcomingBooking(booking, todayTime);
        if (filterStatus === 'UNPAID') return isAwaitingPaymentBooking(booking);
        if (filterStatus === 'CONFIRMED') {
            return booking.status === 'CONFIRMED' && !isCompletedBooking(booking, todayTime);
        }
        if (filterStatus === 'COMPLETED') return isCompletedBooking(booking, todayTime);
        if (filterStatus === 'CANCELLED') return isCancelledBooking(booking);
        return true;
    }), [filterStatus, sortedBookings, todayTime]);

    const cancelledCount = useMemo(
        () => bookings.filter(isCancelledBooking).length,
        [bookings],
    );

    const emptyState = {
        ALL: {
            icon: 'luggage',
            title: t('my_bookings.emptyAllTitle'),
            description: t('my_bookings.emptyAllDescription'),
        },
        UPCOMING: {
            icon: 'calendar_month',
            title: t('my_bookings.emptyUpcomingTitle'),
            description: t('my_bookings.emptyUpcomingDescription'),
        },
        UNPAID: {
            icon: 'payments',
            title: t('my_bookings.emptyUnpaidTitle'),
            description: t('my_bookings.emptyUnpaidDescription'),
        },
        CONFIRMED: {
            icon: 'confirmation_number',
            title: t('my_bookings.emptyConfirmedTitle'),
            description: t('my_bookings.emptyConfirmedDescription'),
        },
        COMPLETED: {
            icon: 'history',
            title: t('my_bookings.emptyCompletedTitle'),
            description: t('my_bookings.emptyCompletedDescription'),
        },
        CANCELLED: {
            icon: 'event_available',
            title: t('my_bookings.emptyCancelledTitle'),
            description: t('my_bookings.emptyCancelledDescription'),
        },
    }[filterStatus];

    const filters: {
        value: BookingFilter;
        label: string;
        icon?: string;
        activeClass: string;
        idleClass: string;
    }[] = [
        {
            value: 'ALL',
            label: t('my_bookings.allTrips'),
            activeClass: 'bg-primary text-white shadow-sm hover:bg-primary-container hover:shadow-md',
            idleClass: 'hover:border-primary/50 hover:text-primary',
        },
        {
            value: 'UPCOMING',
            label: t('my_bookings.upcomingTab'),
            icon: 'flight_takeoff',
            activeClass: 'bg-primary text-white shadow-sm hover:bg-primary-container hover:shadow-md',
            idleClass: 'hover:border-primary/50 hover:text-primary',
        },
        {
            value: 'UNPAID',
            label: t('my_bookings.unpaidTab'),
            icon: 'pending',
            activeClass: 'bg-amber-600 text-white shadow-sm hover:bg-amber-700 hover:shadow-md',
            idleClass: 'hover:border-amber-600/50 hover:text-amber-700',
        },
        {
            value: 'CONFIRMED',
            label: t('my_bookings.confirmedTab'),
            icon: 'check_circle',
            activeClass: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md',
            idleClass: 'hover:border-emerald-600/50 hover:text-emerald-700',
        },
        {
            value: 'COMPLETED',
            label: t('my_bookings.completedTab'),
            icon: 'task_alt',
            activeClass: 'bg-slate-700 text-white shadow-sm hover:bg-slate-800 hover:shadow-md',
            idleClass: 'hover:border-slate-400/50 hover:text-slate-700',
        },
        {
            value: 'CANCELLED',
            label: t('my_bookings.cancelledTab'),
            icon: 'cancel',
            activeClass: 'bg-slate-700 text-white shadow-sm hover:bg-slate-800 hover:shadow-md',
            idleClass: 'hover:border-slate-400/50 hover:text-slate-600',
        },
    ];

    return (
        <div className="bg-slate-50 font-body text-on-surface flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow pt-32 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">
                <header className="mb-8 text-left sm:mb-10">
                    <h1 className="font-headline text-4xl font-extrabold leading-tight text-primary sm:text-5xl">
                        {t('my_bookings.title')}
                    </h1>
                    <p className="mt-3 max-w-2xl font-body text-base leading-7 text-on-surface-variant sm:text-lg">
                        {t('my_bookings.subtitle')}
                    </p>
                </header>

                {!isLoading && !hasLoadError && bookings.length > 0 && (
                    <nav
                        aria-label={t('my_bookings.filterLabel')}
                        className="mb-8 flex flex-wrap items-center justify-start gap-2 sm:mb-10 sm:gap-3"
                    >
                        {filters
                            .filter(filter => filter.value !== 'CANCELLED' || cancelledCount > 0)
                            .map(filter => (
                            <button
                                key={filter.value}
                                type="button"
                                aria-pressed={filterStatus === filter.value}
                                onClick={() => setFilterStatus(filter.value)}
                                className={`group/filter inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ${filterStatus === filter.value ? `${filter.activeClass} border-transparent` : `border-outline-variant/30 bg-white text-on-surface-variant ${filter.idleClass}`}`}
                            >
                                {filter.icon && (
                                    <span className="material-symbols-outlined text-[16px] transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/filter:scale-110 motion-reduce:transition-none motion-reduce:group-hover/filter:scale-100">
                                        {filter.icon}
                                    </span>
                                )}
                                {filter.label}
                                {filter.value === 'CANCELLED' && (
                                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white transition-transform duration-200 group-hover/filter:scale-105 motion-reduce:transition-none motion-reduce:group-hover/filter:scale-100">
                                        {cancelledCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                )}

                <section className="space-y-5">
                    {isLoading ? (
                        <BookingListSkeleton loadingLabel={t('my_bookings.loadingData')} />
                    ) : hasLoadError ? (
                        <BookingErrorState
                            title={t('my_bookings.loadErrorTitle')}
                            description={t('my_bookings.loadErrorDescription')}
                            retryLabel={t('my_bookings.retryLoad')}
                            onRetry={fetchMyBookings}
                        />
                    ) : filteredBookings.length === 0 ? (
                        <BookingEmptyState
                            icon={emptyState.icon}
                            title={emptyState.title}
                            description={emptyState.description}
                            primaryLabel={
                                filterStatus === 'ALL'
                                    ? t('my_bookings.exploreNow')
                                    : t('my_bookings.viewAll')
                            }
                            primaryHref={filterStatus === 'ALL' ? '/destinations' : undefined}
                            onPrimaryAction={
                                filterStatus === 'ALL'
                                    ? undefined
                                    : () => setFilterStatus('ALL')
                            }
                        />
                    ) : (
                        filteredBookings.map((booking) => (
                            <BookingCard
                                key={booking.id}
                                booking={booking}
                                isCompleted={isCompletedBooking(booking, todayTime)}
                            />
                        ))
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
}

import type { BookingHistoryItem } from '@/components/booking/BookingCard';

export type BookingFilter =
    | 'ALL'
    | 'UPCOMING'
    | 'UNPAID'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'CANCELLED';

export const isCancelledBooking = (booking: BookingHistoryItem) =>
    booking.status === 'CANCELLED' || booking.status === 'CANCEL_REQUESTED';

export const getDepartureDayTime = (booking: BookingHistoryItem) => {
    const value = booking.departureDate ?? booking.tour?.startDate;
    if (!value) return Number.NaN;

    const departureDay = new Date(value);
    if (Number.isNaN(departureDay.getTime())) return Number.NaN;
    departureDay.setHours(0, 0, 0, 0);
    return departureDay.getTime();
};

export const isCompletedBooking = (booking: BookingHistoryItem, todayTime: number) => {
    const departureTime = getDepartureDayTime(booking);
    return booking.status === 'CONFIRMED'
        && Number.isFinite(departureTime)
        && departureTime < todayTime;
};

export const isUpcomingBooking = (booking: BookingHistoryItem, todayTime: number) => {
    const departureTime = getDepartureDayTime(booking);
    return !isCancelledBooking(booking)
        && Number.isFinite(departureTime)
        && departureTime >= todayTime;
};

export const isAwaitingPaymentBooking = (booking: BookingHistoryItem) =>
    booking.status === 'PENDING' && booking.paymentStatus !== 'PAID';

export const getBookingPriority = (booking: BookingHistoryItem, todayTime: number) => {
    if (isAwaitingPaymentBooking(booking)) return 0;
    if (booking.status === 'CONFIRMED' && isUpcomingBooking(booking, todayTime)) return 1;
    if (isUpcomingBooking(booking, todayTime)) return 2;
    if (isCompletedBooking(booking, todayTime)) return 3;
    if (booking.status === 'CANCEL_REQUESTED') return 4;
    if (booking.status === 'CANCELLED') return 5;
    return 6;
};

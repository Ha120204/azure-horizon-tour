export type CustomerBookingStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'CANCELLED'
    | 'CANCEL_REQUESTED';

export type CustomerPaymentStatus =
    | 'PAID'
    | 'UNPAID'
    | 'PROCESSING'
    | 'FAILED';

export type BookingPresentationKey =
    | 'PAYMENT_REQUIRED'
    | 'PAYMENT_PROCESSING'
    | 'PAYMENT_FAILED'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'CANCEL_REQUESTED'
    | 'CANCELLED';

type BookingPresentation = {
    badgeLabelKey: string;
    badgeIcon: string;
    badgeClass: string;
    messageKey: string;
    messageIcon: string;
    messageClass: string;
    ctaLabelKey: string;
    ctaIcon: string;
    ctaIconHoverClass: string;
    ctaClass: string;
    ctaTarget: 'payment-actions' | 'ticket-actions' | 'trip-details' | 'cancellation-details';
};

export const BOOKING_PRESENTATIONS: Record<BookingPresentationKey, BookingPresentation> = {
    PAYMENT_REQUIRED: {
        badgeLabelKey: 'my_bookings.statusPaymentRequired',
        badgeIcon: 'pending',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        messageKey: 'my_bookings.messagePaymentRequired',
        messageIcon: 'info',
        messageClass: 'text-amber-700',
        ctaLabelKey: 'my_bookings.payNow',
        ctaIcon: 'payments',
        ctaIconHoverClass: 'group-hover/action:-translate-y-0.5',
        ctaClass: 'bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white active:bg-amber-700',
        ctaTarget: 'payment-actions',
    },
    PAYMENT_PROCESSING: {
        badgeLabelKey: 'my_bookings.statusPaymentProcessing',
        badgeIcon: 'fact_check',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        messageKey: 'my_bookings.messagePaymentProcessing',
        messageIcon: 'hourglass_top',
        messageClass: 'text-sky-700',
        ctaLabelKey: 'my_bookings.viewDetails',
        ctaIcon: 'arrow_forward',
        ctaIconHoverClass: 'group-hover/action:translate-x-1',
        ctaClass: 'bg-sky-50 text-sky-800 hover:bg-sky-700 hover:text-white active:bg-sky-800',
        ctaTarget: 'payment-actions',
    },
    PAYMENT_FAILED: {
        badgeLabelKey: 'my_bookings.statusPaymentFailed',
        badgeIcon: 'error',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        messageKey: 'my_bookings.messagePaymentFailed',
        messageIcon: 'error',
        messageClass: 'text-red-600',
        ctaLabelKey: 'my_bookings.retryPayment',
        ctaIcon: 'refresh',
        ctaIconHoverClass: 'group-hover/action:rotate-90',
        ctaClass: 'bg-red-50 text-red-700 hover:bg-red-600 hover:text-white active:bg-red-700',
        ctaTarget: 'payment-actions',
    },
    CONFIRMED: {
        badgeLabelKey: 'my_bookings.statusConfirmed',
        badgeIcon: 'check_circle',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        messageKey: 'my_bookings.messageConfirmed',
        messageIcon: 'task_alt',
        messageClass: 'text-emerald-700',
        ctaLabelKey: 'my_bookings.viewTicket',
        ctaIcon: 'confirmation_number',
        ctaIconHoverClass: 'group-hover/action:-rotate-6',
        ctaClass: 'bg-primary text-white hover:bg-primary-container active:bg-primary',
        ctaTarget: 'ticket-actions',
    },
    COMPLETED: {
        badgeLabelKey: 'my_bookings.statusCompleted',
        badgeIcon: 'verified',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        messageKey: 'my_bookings.messageCompleted',
        messageIcon: 'history',
        messageClass: 'text-slate-600',
        ctaLabelKey: 'my_bookings.viewTripDetails',
        ctaIcon: 'arrow_forward',
        ctaIconHoverClass: 'group-hover/action:translate-x-1',
        ctaClass: 'bg-surface-container-high text-primary hover:bg-primary hover:text-white active:bg-primary-container',
        ctaTarget: 'trip-details',
    },
    CANCEL_REQUESTED: {
        badgeLabelKey: 'my_bookings.statusCancelRequested',
        badgeIcon: 'pending',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        messageKey: 'my_bookings.messageCancelRequested',
        messageIcon: 'hourglass_top',
        messageClass: 'text-orange-700',
        ctaLabelKey: 'my_bookings.viewCancellation',
        ctaIcon: 'arrow_forward',
        ctaIconHoverClass: 'group-hover/action:translate-x-1',
        ctaClass: 'bg-orange-50 text-orange-800 hover:bg-orange-700 hover:text-white active:bg-orange-800',
        ctaTarget: 'cancellation-details',
    },
    CANCELLED: {
        badgeLabelKey: 'my_bookings.statusCancelled',
        badgeIcon: 'cancel',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        messageKey: 'my_bookings.messageCancelled',
        messageIcon: 'cancel',
        messageClass: 'text-red-600',
        ctaLabelKey: 'my_bookings.viewCancellation',
        ctaIcon: 'arrow_forward',
        ctaIconHoverClass: 'group-hover/action:translate-x-1',
        ctaClass: 'bg-slate-100 text-slate-700 hover:bg-slate-700 hover:text-white active:bg-slate-800',
        ctaTarget: 'cancellation-details',
    },
};

export function getBookingPresentationKey(booking: {
    status: CustomerBookingStatus;
    paymentStatus: CustomerPaymentStatus;
    isCompleted: boolean;
}): BookingPresentationKey {
    if (booking.status === 'CANCEL_REQUESTED') return 'CANCEL_REQUESTED';
    if (booking.status === 'CANCELLED') return 'CANCELLED';
    if (booking.isCompleted) return 'COMPLETED';
    if (booking.paymentStatus === 'PROCESSING') return 'PAYMENT_PROCESSING';
    if (booking.status === 'CONFIRMED' && booking.paymentStatus === 'PAID') return 'CONFIRMED';
    if (booking.paymentStatus === 'FAILED') return 'PAYMENT_FAILED';
    return 'PAYMENT_REQUIRED';
}

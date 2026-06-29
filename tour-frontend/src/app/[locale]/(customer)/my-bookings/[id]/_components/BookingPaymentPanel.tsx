import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { EXPIRY_MINUTES, type BookingDetail, type CancellationPolicy, type PaymentIssueResult } from '../_lib/types';
import { BookingCancellationPolicy } from './BookingCancellationPolicy';

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string }) {
    const { t } = useLocale();
    if (paymentStatus === 'PAID' && status === 'CONFIRMED') {
        return (
            <div className="bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-2 border border-emerald-100">
                <span className="material-symbols-outlined text-emerald-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">{t('my_bookings.statusConfirmed')}</span>
            </div>
        );
    }
    if (paymentStatus === 'PROCESSING') {
        return (
            <div className="bg-sky-50 px-3 py-1 rounded-full flex items-center gap-2 border border-sky-100">
                <span className="material-symbols-outlined text-sky-600 text-sm">fact_check</span>
                <span className="text-[10px] font-bold text-sky-700 uppercase">{t('my_bookings.statusPaymentProcessing')}</span>
            </div>
        );
    }
    if (status === 'CANCEL_REQUESTED') {
        return (
            <div className="bg-orange-50 px-3 py-1 rounded-full flex items-center gap-2 border border-orange-200">
                <span className="material-symbols-outlined text-orange-500 text-sm animate-pulse">pending</span>
                <span className="text-[10px] font-bold text-orange-600 uppercase">{t('my_bookings.statusCancelRequested')}</span>
            </div>
        );
    }
    if (status === 'CANCELLED') {
        return (
            <div className="bg-red-50 px-3 py-1 rounded-full flex items-center gap-2 border border-red-100">
                <span className="material-symbols-outlined text-red-600 text-sm">cancel</span>
                <span className="text-[10px] font-bold text-red-700 uppercase">{t('my_bookings.statusCancelled')}</span>
            </div>
        );
    }
    return (
        <div className="bg-amber-50 px-3 py-1 rounded-full flex items-center gap-2 border border-amber-100">
            <span className="material-symbols-outlined text-amber-600 text-sm">pending</span>
            <span className="text-[10px] font-bold text-amber-700 uppercase">{t('my_bookings.statusPaymentRequired')}</span>
        </div>
    );
}

function CountdownBadge({ seconds }: { seconds: number | null }) {
    const { t } = useLocale();
    if (seconds === null) return null;
    const expired = seconds <= 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (expired) {
        return (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                <span className="material-symbols-outlined text-base">timer_off</span>
                {t('my_bookings.paymentExpiredCountdown', { minutes: EXPIRY_MINUTES })}
            </div>
        );
    }
    const isUrgent = seconds <= 120;
    return (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${isUrgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <span className={`material-symbols-outlined text-base ${isUrgent ? 'animate-pulse' : ''}`}>timer</span>
            <span>
                {t('my_bookings.paymentTimeLeft')}{' '}
                <strong className="font-mono text-base">
                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </strong>
            </span>
        </div>
    );
}

type Props = {
    booking: BookingDetail;
    isPaid: boolean;
    isPending: boolean;
    isPaymentReviewing: boolean;
    isCancelled: boolean;
    isCancelRequested: boolean;
    isExpired: boolean;
    canCancelBooking: boolean;
    canReview?: boolean;
    cancellationPolicy?: CancellationPolicy;
    tripLifecycle: string;
    tripUnavailableReason: string;
    totalPriceNumber: number;
    refundAmountNumber: number;
    secondsLeft: number | null;
    payError: string;
    isPaying: boolean;
    paymentIssueResult: PaymentIssueResult | null;
    paymentSupportTicket?: { id: number };
    onRetryPayment: () => void;
    onOpenCancelModal: () => void;
    onOpenIssueForm: () => void;
    onOpenReviewModal?: () => void;
};

export function BookingPaymentPanel({
    booking, isPaid, isPending, isPaymentReviewing, isCancelled, isCancelRequested,
    isExpired, canCancelBooking, canReview, cancellationPolicy,
    tripLifecycle, tripUnavailableReason,
    totalPriceNumber, refundAmountNumber, secondsLeft, payError, isPaying,
    paymentIssueResult, paymentSupportTicket, onRetryPayment, onOpenCancelModal, onOpenIssueForm, onOpenReviewModal,
}: Props) {
    const { t, formatPrice, formatDateTime } = useLocale();

    const incompleteCount = booking.incompletePassengerCount ?? 0;
    const manifestIncomplete = incompleteCount > 0;
    // Tour có vé máy bay (FLIGHT/COMBO) bắt buộc đủ thông tin hành khách trước khi xuất vé.
    const isFlightTour = booking.departureTransport?.type === 'FLIGHT' || booking.departureTransport?.type === 'COMBO';
    const blockTicket = isFlightTour && manifestIncomplete;

    return (
        <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0_8px_32px_rgba(25,28,33,0.04)] border border-outline-variant/10 space-y-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                {t('my_bookings.detailStatus')}
            </p>

            <div className="flex justify-between items-center pb-5 border-b border-outline-variant/10">
                <span className="text-on-surface-variant font-medium">{t('my_bookings.detailStatus')}</span>
                <StatusBadge
                    status={booking.status}
                    paymentStatus={isPaymentReviewing ? 'PROCESSING' : booking.paymentStatus}
                />
            </div>

            <div className="flex justify-between items-end">
                <span className="text-on-surface-variant font-medium">{t('my_bookings.totalPrice')}</span>
                <span className="text-3xl font-extrabold font-headline text-primary">{formatPrice(totalPriceNumber)}</span>
            </div>

            {isCancelRequested && booking.refundAmount !== null && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">{t('my_bookings.estimatedRefundLabel')}</p>
                    <p className="text-lg font-extrabold text-orange-600">
                        {refundAmountNumber > 0 ? formatPrice(refundAmountNumber) : t('my_bookings.noRefundShort')}
                    </p>
                    <p className="text-xs text-orange-600 opacity-80">{booking.refundNote}</p>
                </div>
            )}

            {isPending && booking.paymentMethod === 'IN_STORE' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                        <span className="material-symbols-outlined text-base">info</span>
                        <span>{t('my_bookings.inStoreTitle')}</span>
                    </div>
                    <p className="leading-relaxed">
                        {t('my_bookings.inStoreDesc')}
                    </p>
                    <div className="pt-2 border-t border-amber-200/50 flex justify-between font-bold text-[10px] uppercase tracking-wider text-amber-800">
                        <span>{t('my_bookings.holdDeadline')}</span>
                        <span>{formatDateTime(new Date(new Date(booking.createdAt).getTime() + 24 * 60 * 60 * 1000))}</span>
                    </div>
                </div>
            )}

            {isPending && <CountdownBadge seconds={secondsLeft} />}

            {payError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <span className="material-symbols-outlined text-base mt-0.5">error</span>
                    {payError}
                </div>
            )}

            {/* Cancellation policy — rich display with deadline, tier, and amount */}
            {cancellationPolicy && !isCancelRequested && !isCancelled && (
                <BookingCancellationPolicy
                    cancellationPolicy={cancellationPolicy}
                    bookingCreatedAt={booking.createdAt}
                    isPaidBooking={isPaid}
                />
            )}

            {isPaid ? (
                <>
                    {/* Primary action: E-Ticket — chặn cứng khi tour bay còn thiếu thông tin hành khách */}
                    {blockTicket ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined shrink-0 text-red-600">error</span>
                                <div>
                                    <p className="text-sm font-bold text-red-800">{t('my_bookings.ticketBlockedTitle')}</p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-red-700">
                                        {t('my_bookings.ticketBlockedDesc', { count: incompleteCount })}
                                    </p>
                                </div>
                            </div>
                            <a
                                href="#passenger-details"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700"
                            >
                                <span className="material-symbols-outlined text-base">edit_note</span>
                                {t('my_bookings.addPassengerInfo')}
                            </a>
                            <Link
                                href="/contact"
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
                            >
                                <span className="material-symbols-outlined text-base">support_agent</span>
                                {t('my_bookings.contactSupport')}
                            </Link>
                        </div>
                    ) : (
                        <>
                            {manifestIncomplete && (
                                <a
                                    href="#passenger-details"
                                    className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                                >
                                    <span className="material-symbols-outlined text-base shrink-0">info</span>
                                    <span>{t('my_bookings.passengerIncompleteWarn', { count: incompleteCount })}</span>
                                </a>
                            )}
                            <Link
                                href={`/success?bookingId=${booking.bookingCode}`}
                                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary py-3.5 font-bold text-white shadow-md shadow-primary/20 outline-none transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-lg hover:shadow-primary/25 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                <span
                                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/20 opacity-0 transition-[opacity,transform] duration-500 ease-out group-hover:translate-x-[420%] group-hover:opacity-100 motion-reduce:hidden"
                                    aria-hidden="true"
                                />
                                <span className="material-symbols-outlined relative z-10 text-lg transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transform-none">qr_code_scanner</span>
                                <span className="relative z-10">{t('my_bookings.eTicket')}</span>
                            </Link>
                        </>
                    )}

                    {/* Secondary actions: Review (when completed) or Cancel (when cancelable) */}
                    {(canCancelBooking || (tripLifecycle === 'COMPLETED' && canReview)) && (
                        <div className="border-t border-slate-100 pt-4 space-y-2">
                            <p className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">
                                {t('my_bookings.otherActions')}
                            </p>
                            {tripLifecycle === 'COMPLETED' && canReview && (
                                <button
                                    type="button"
                                    onClick={onOpenReviewModal}
                                    className="group flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-bold text-amber-700 outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                                >
                                    <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transform-none" style={{ fontVariationSettings: "'FILL' 1" }}>star_rate</span>
                                    {t('my_bookings.reviewTrip')}
                                </button>
                            )}
                            {canCancelBooking && (
                                <button
                                    type="button"
                                    onClick={onOpenCancelModal}
                                    className="group flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-transparent py-2.5 text-sm font-bold text-red-400 outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                                >
                                    <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover:rotate-90 motion-reduce:transform-none">cancel</span>
                                    {t('my_bookings.requestCancel')}
                                </button>
                            )}
                        </div>
                    )}
                </>
            ) : isCancelRequested ? (
                <div className="space-y-3">
                    <div className="w-full bg-orange-50 border-2 border-orange-200 text-orange-600 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-lg animate-pulse">pending</span>
                        {t('my_bookings.awaitingAdmin')}
                    </div>
                    <p className="text-xs text-center text-slate-400">{t('my_bookings.processingTime')}</p>
                    <Link
                        href="/contact"
                        className="group/support flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-500 outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                        <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/support:-translate-y-0.5 group-hover/support:scale-110 motion-reduce:transform-none">support_agent</span>
                        {t('my_bookings.contactSupport')}
                    </Link>
                </div>
            ) : isCancelled ? (
                <div className="space-y-3">
                    <div className="w-full bg-slate-100 text-slate-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                        <span className="material-symbols-outlined text-lg">block</span>
                        {t('my_bookings.bookingCancelledTitle')}
                    </div>
                    <Link
                        href="/destinations"
                        className="group/explore flex w-full items-center justify-center gap-2 rounded-xl border border-primary py-3 text-sm font-bold text-primary outline-none transition-[background-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/15 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                        <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/explore:rotate-12 group-hover/explore:scale-110 motion-reduce:transform-none">explore</span>
                        {t('my_bookings.exploreNewTours')}
                    </Link>
                </div>
            ) : isExpired ? (
                <div className="space-y-3">
                    <div className="w-full bg-red-100 text-red-600 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                        <span className="material-symbols-outlined text-lg">timer_off</span>
                        {t('my_bookings.paymentExpiredTitle')}
                    </div>
                    <Link href="/destinations" className="group/explore flex w-full items-center justify-center gap-2 rounded-xl border border-primary py-3 text-sm font-bold text-primary outline-none transition-[background-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/15 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none">
                        <span className="material-symbols-outlined text-lg transition-transform duration-200 ease-out group-hover/explore:rotate-12 group-hover/explore:scale-110 motion-reduce:transform-none">explore</span>
                        {t('my_bookings.bookNewTour')}
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {booking.paymentMethod === 'IN_STORE' ? (
                        <Link
                            href={`/success?bookingId=${booking.bookingCode}`}
                            className="group/guide flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-center text-sm font-bold text-white shadow-md outline-none transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-lg hover:shadow-primary/25 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            <span className="material-symbols-outlined text-lg transition-transform duration-200 ease-out group-hover/guide:scale-110 motion-reduce:transform-none">info</span>
                            {t('my_bookings.viewGuideAndHold')}
                        </Link>
                    ) : isPaymentReviewing ? (
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-sky-600 mt-0.5">fact_check</span>
                                <div>
                                    <p className="text-sm font-bold text-sky-900">{t('my_bookings.reviewingPaymentTitle')}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-sky-700">
                                        {t('my_bookings.reviewingPaymentDesc')}
                                    </p>
                                    {paymentIssueResult?.message && (
                                        <p className="mt-2 text-xs font-semibold text-sky-800">
                                            {paymentIssueResult.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {(paymentIssueResult?.ticketId || paymentSupportTicket?.id) && (
                                <div className="rounded-xl border border-sky-200 bg-white/70 px-3 py-2 text-xs text-sky-800">
                                    {t('my_bookings.requestIdLabel')} #{paymentIssueResult?.ticketId ?? paymentSupportTicket?.id}
                                </div>
                            )}
                            <Link
                                href="/contact"
                                className="group/support flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white py-2.5 text-sm font-bold text-sky-700 outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/support:-translate-y-0.5 group-hover/support:scale-110 motion-reduce:transform-none">support_agent</span>
                                {t('my_bookings.contactSupport')}
                            </Link>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={onRetryPayment}
                                disabled={isPaying}
                                className="group/payment flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-bold text-on-primary shadow-md outline-none transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-lg hover:shadow-primary/25 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                {isPaying ? (
                                    <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('my_bookings.creatingLink')}</>
                                ) : (
                                    <><span className="material-symbols-outlined text-lg transition-transform duration-200 ease-out group-hover/payment:-translate-y-0.5 group-hover/payment:scale-110 motion-reduce:transform-none">account_balance_wallet</span>{t('my_bookings.payNow')}</>
                                )}
                            </button>
                            <button
                                onClick={onOpenIssueForm}
                                className="group/review flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 py-2.5 text-sm font-bold text-sky-700 outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/review:scale-110 group-hover/review:-rotate-6 motion-reduce:transform-none">fact_check</span>
                                {t('my_bookings.iPaidRequestCheck')}
                            </button>
                        </>
                    )}

                    {/* Cancel — secondary action, visually separated */}
                    {canCancelBooking && (
                        <div className="border-t border-slate-200/70 pt-3 space-y-2">
                            {(isPaymentReviewing || paymentIssueResult) && (
                                <p className="text-xs leading-relaxed text-slate-500">
                                    {t('my_bookings.paidWaitBeforeCancel')}
                                </p>
                            )}
                            <button
                                onClick={onOpenCancelModal}
                                className="group/cancel flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-400 outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/cancel:rotate-90 motion-reduce:transform-none">cancel</span>
                                {t('my_bookings.cancelBooking')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

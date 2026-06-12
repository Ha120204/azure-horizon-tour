'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CancelBookingModal from '@/components/booking/CancelBookingModal';
import { useLocale } from '@/context/LocaleContext';
import { useBookingDetail } from './_hooks/useBookingDetail';
import { BookingHeroImage } from './_components/BookingHeroImage';
import { BookingEssentialSummary } from './_components/BookingEssentialSummary';
import { BookingDepartureGuide } from './_components/BookingDepartureGuide';
import { BookingPassengerDetails } from './_components/BookingPassengerDetails';
import { BookingTripDetails } from './_components/BookingTripDetails';
import { BookingPaymentPanel } from './_components/BookingPaymentPanel';
import { BookingDetailSkeleton } from './_components/BookingDetailSkeleton';
import { PaymentIssueModal } from './_components/PaymentIssueModal';
import { PaymentQRModal } from './_components/PaymentQRModal';
import {
    getBookingPresentationKey,
    type CustomerBookingStatus,
    type CustomerPaymentStatus,
} from '@/lib/booking/bookingStatus';

function BookingNotFound() {
    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow flex items-center justify-center px-6 py-20">
                <div className="text-center max-w-sm">
                    <span className="material-symbols-outlined text-7xl text-slate-300">search_off</span>
                    <h1 className="mt-4 font-headline text-xl font-extrabold text-on-surface">
                        Không tìm thấy đặt tour
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                        Đặt tour này không tồn tại hoặc bạn không có quyền xem.
                    </p>
                    <Link
                        href="/my-bookings"
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md outline-none transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Xem danh sách đặt tour
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}

function BookingFetchError({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow flex items-center justify-center px-6 py-20">
                <div className="text-center max-w-sm">
                    <span className="material-symbols-outlined text-7xl text-slate-300">wifi_off</span>
                    <h1 className="mt-4 font-headline text-xl font-extrabold text-on-surface">
                        Lỗi tải dữ liệu
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                        Không thể tải chi tiết đặt tour. Vui lòng kiểm tra kết nối và thử lại.
                    </p>
                    <div className="mt-6 flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={onRetry}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md outline-none transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            <span className="material-symbols-outlined text-base">refresh</span>
                            Thử lại
                        </button>
                        <Link
                            href="/my-bookings"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 outline-none transition-[background-color,border-color,color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            Quay lại danh sách
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function BookingDetailPage() {
    const { t, language } = useLocale();
    const {
        booking, isLoading, fetchError, refetchBooking, isPaying, payError,
        showCancelModal, setShowCancelModal,
        cancelSuccess,
        showIssueForm, setShowIssueForm,
        paymentIssueResult, setPaymentIssueResult,
        banksList, isBankListLoading,
        secondsLeft, isExpired,
        isPaid, isPending, isPaymentReviewing,
        isCancelled, isCancelRequested,
        cancellationPolicy, canCancelBooking,
        tripLifecycle, departureDate, tripUnavailableReason,
        totalPriceNumber, refundAmountNumber, paymentSupportTicket,
        paymentData, qrSuccess, clearPaymentData,
        handleRetryPayment, handleCancelSuccess, submitPaymentIssue,
    } = useBookingDetail();

    if (isLoading) return <BookingDetailSkeleton />;
    if (fetchError) return <BookingFetchError onRetry={refetchBooking} />;
    if (!booking) return <BookingNotFound />;

    const bookingPresentationKey = getBookingPresentationKey({
        status: booking.status as CustomerBookingStatus,
        paymentStatus: booking.paymentStatus as CustomerPaymentStatus,
        isCompleted: tripLifecycle === 'COMPLETED',
    });

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />
            <main className="pt-32 pb-20 flex-grow max-w-5xl mx-auto w-full px-6">
                <Link
                    href="/my-bookings"
                    className="group/back mb-8 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-outline transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-x-0.5 hover:bg-primary/5 hover:text-primary active:translate-x-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-x-0"
                >
                    <span className="material-symbols-outlined text-sm transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/back:-translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/back:translate-x-0" aria-hidden="true">arrow_back</span>
                    {t('my_bookings.backToList')}
                </Link>

                {cancelSuccess && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-4"
                    >
                        <span className="material-symbols-outlined text-emerald-600 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check_circle</span>
                        <div>
                            <p className="font-bold text-sm">Yêu cầu đã được ghi nhận!</p>
                            <p className="text-xs opacity-80 mt-0.5">Chúng tôi sẽ xử lý và thông báo kết quả trong vòng 1–3 ngày làm việc.</p>
                        </div>
                    </div>
                )}

                <div className="rounded-[2rem] border border-slate-100 bg-white shadow-xl">
                    <BookingHeroImage
                        bookingCode={booking.bookingCode}
                        tourName={booking.tour?.name}
                        imageUrl={booking.tour?.imageUrl}
                        presentationKey={bookingPresentationKey}
                    />
                    <div className="space-y-10 p-6 sm:p-8 md:space-y-12 md:p-12">
                        <BookingEssentialSummary booking={booking} departureDate={departureDate} />
                        <BookingDepartureGuide booking={booking} />
                        <BookingPassengerDetails booking={booking} />

                        {/*
                          Mobile order: payment panel first (order-first), trip details second (default).
                          Desktop order: trip details in left column (lg:order-1), payment panel in right (lg:order-2).
                        */}
                        <div className="grid items-start gap-10 lg:grid-cols-[3fr_2fr] lg:gap-12">
                            <section
                                id="trip-details"
                                aria-labelledby="trip-details-title"
                                className="scroll-mt-32 rounded-2xl target:ring-2 target:ring-primary/30 target:ring-offset-4 lg:order-1"
                            >
                                <div className="mb-6">
                                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                                        {t('my_bookings.itineraryDetails')}
                                    </p>
                                    <h2 id="trip-details-title" className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
                                        {language === 'vi' ? 'Thông tin hành trình' : 'Trip information'}
                                    </h2>
                                </div>
                                <div id="cancellation-details" className="scroll-mt-32 rounded-2xl target:ring-2 target:ring-orange-300 target:ring-offset-4">
                                    <BookingTripDetails
                                        booking={booking}
                                        isPaid={Boolean(isPaid)}
                                        isPending={Boolean(isPending)}
                                        isCancelled={Boolean(isCancelled)}
                                        isCancelRequested={Boolean(isCancelRequested)}
                                        totalPriceNumber={totalPriceNumber}
                                        refundAmountNumber={refundAmountNumber}
                                    />
                                </div>
                            </section>

                            <section
                                id="payment-actions"
                                aria-labelledby="payment-actions-title"
                                className="scroll-mt-32 rounded-2xl target:ring-2 target:ring-amber-300 target:ring-offset-4 order-first lg:order-2 lg:sticky lg:top-32"
                            >
                                <h2 id="payment-actions-title" className="sr-only">
                                    {language === 'vi' ? 'Thanh toán và quản lý vé' : 'Payment and ticket management'}
                                </h2>
                                <div id="ticket-actions" className="scroll-mt-32 rounded-2xl target:ring-2 target:ring-primary/30 target:ring-offset-4">
                                    <BookingPaymentPanel
                                        booking={booking}
                                        isPaid={Boolean(isPaid)}
                                        isPending={Boolean(isPending)}
                                        isPaymentReviewing={Boolean(isPaymentReviewing)}
                                        isCancelled={Boolean(isCancelled)}
                                        isCancelRequested={Boolean(isCancelRequested)}
                                        isExpired={isExpired}
                                        canCancelBooking={canCancelBooking}
                                        cancellationPolicy={cancellationPolicy}
                                        tripLifecycle={tripLifecycle}
                                        tripUnavailableReason={tripUnavailableReason}
                                        totalPriceNumber={totalPriceNumber}
                                        refundAmountNumber={refundAmountNumber}
                                        secondsLeft={secondsLeft}
                                        payError={payError}
                                        isPaying={isPaying}
                                        paymentIssueResult={paymentIssueResult}
                                        paymentSupportTicket={paymentSupportTicket}
                                        onRetryPayment={handleRetryPayment}
                                        onOpenCancelModal={() => setShowCancelModal(true)}
                                        onOpenIssueForm={() => { setShowIssueForm(true); setPaymentIssueResult(null); }}
                                    />
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            {paymentData && (
                <PaymentQRModal
                    data={paymentData}
                    secondsLeft={secondsLeft}
                    isSuccess={qrSuccess}
                    onClose={clearPaymentData}
                    onOpenIssueForm={() => { clearPaymentData(); setShowIssueForm(true); setPaymentIssueResult(null); }}
                />
            )}

            {showIssueForm && (
                <PaymentIssueModal
                    booking={booking}
                    banksList={banksList}
                    isBankListLoading={isBankListLoading}
                    totalPriceNumber={totalPriceNumber}
                    onSubmit={submitPaymentIssue}
                    onClose={() => setShowIssueForm(false)}
                />
            )}

            {showCancelModal && (
                <CancelBookingModal
                    bookingId={booking.id}
                    bookingCode={booking.bookingCode}
                    tourName={booking.tour?.name ?? 'Tour'}
                    tourStartDate={departureDate ?? new Date().toISOString()}
                    totalPrice={totalPriceNumber}
                    paymentStatus={booking.paymentStatus}
                    bookingStatus={booking.status}
                    cancellationPolicy={cancellationPolicy}
                    onClose={() => setShowCancelModal(false)}
                    onSuccess={handleCancelSuccess}
                />
            )}
        </div>
    );
}

'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CancelBookingModal from '@/components/booking/CancelBookingModal';
import { useLocale } from '@/context/LocaleContext';
import { useBookingDetail } from './_hooks/useBookingDetail';
import { BookingHeroImage } from './_components/BookingHeroImage';
import { BookingTripDetails } from './_components/BookingTripDetails';
import { BookingPaymentPanel } from './_components/BookingPaymentPanel';
import { PaymentIssueModal } from './_components/PaymentIssueModal';

export default function BookingDetailPage() {
    const { t } = useLocale();
    const {
        booking, isLoading, isPaying, payError,
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
        handleRetryPayment, handleCancelSuccess, submitPaymentIssue,
    } = useBookingDetail();

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center font-bold text-primary">
            Đang tải chi tiết đơn hàng...
        </div>
    );
    if (!booking) return null;

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />
            <main className="pt-32 pb-20 flex-grow max-w-4xl mx-auto w-full px-6">
                <Link href="/my-bookings" className="inline-flex items-center gap-2 text-outline font-medium hover:text-primary transition-colors mb-8">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    {t('my_bookings.backToList')}
                </Link>

                {cancelSuccess && (
                    <div className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-4">
                        <span className="material-symbols-outlined text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <div>
                            <p className="font-bold text-sm">Yêu cầu đã được ghi nhận!</p>
                            <p className="text-xs opacity-80 mt-0.5">Chúng tôi sẽ xử lý và thông báo kết quả trong vòng 1–3 ngày làm việc.</p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
                    <BookingHeroImage
                        bookingCode={booking.bookingCode}
                        tourCode={booking.tour?.tourCode}
                        tourName={booking.tour?.name}
                        imageUrl={booking.tour?.imageUrl}
                    />
                    <div className="p-8 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <BookingTripDetails
                                booking={booking}
                                departureDate={departureDate}
                                isCancelled={Boolean(isCancelled)}
                                isCancelRequested={Boolean(isCancelRequested)}
                                refundAmountNumber={refundAmountNumber}
                            />
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
                    </div>
                </div>
            </main>
            <Footer />

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

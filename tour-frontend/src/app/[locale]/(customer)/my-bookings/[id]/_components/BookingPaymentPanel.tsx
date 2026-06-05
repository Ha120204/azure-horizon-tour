import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { EXPIRY_MINUTES, type BookingDetail, type CancellationPolicy, type PaymentIssueResult } from '../_lib/types';

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string }) {
    if (paymentStatus === 'PAID' && status === 'CONFIRMED') {
        return (
            <div className="bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-2 border border-emerald-100">
                <span className="material-symbols-outlined text-emerald-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Đã Xác Nhận</span>
            </div>
        );
    }
    if (paymentStatus === 'PROCESSING') {
        return (
            <div className="bg-sky-50 px-3 py-1 rounded-full flex items-center gap-2 border border-sky-100">
                <span className="material-symbols-outlined text-sky-600 text-sm">fact_check</span>
                <span className="text-[10px] font-bold text-sky-700 uppercase">Đang Kiểm Tra</span>
            </div>
        );
    }
    if (status === 'CANCEL_REQUESTED') {
        return (
            <div className="bg-orange-50 px-3 py-1 rounded-full flex items-center gap-2 border border-orange-200">
                <span className="material-symbols-outlined text-orange-500 text-sm animate-pulse">pending</span>
                <span className="text-[10px] font-bold text-orange-600 uppercase">Đang Chờ Duyệt Hủy</span>
            </div>
        );
    }
    if (status === 'CANCELLED') {
        return (
            <div className="bg-red-50 px-3 py-1 rounded-full flex items-center gap-2 border border-red-100">
                <span className="material-symbols-outlined text-red-600 text-sm">cancel</span>
                <span className="text-[10px] font-bold text-red-700 uppercase">Đã Hủy</span>
            </div>
        );
    }
    return (
        <div className="bg-amber-50 px-3 py-1 rounded-full flex items-center gap-2 border border-amber-100">
            <span className="material-symbols-outlined text-amber-600 text-sm">pending</span>
            <span className="text-[10px] font-bold text-amber-700 uppercase">Chờ Thanh Toán</span>
        </div>
    );
}

function CountdownBadge({ seconds }: { seconds: number | null }) {
    if (seconds === null) return null;
    const expired = seconds <= 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (expired) {
        return (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                <span className="material-symbols-outlined text-base">timer_off</span>
                Đã hết thời gian thanh toán (quá {EXPIRY_MINUTES} phút). Booking đã bị hủy tự động.
            </div>
        );
    }
    const isUrgent = seconds <= 120;
    return (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${isUrgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <span className={`material-symbols-outlined text-base ${isUrgent ? 'animate-pulse' : ''}`}>timer</span>
            <span>
                Thời gian thanh toán còn lại:{' '}
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
};

export function BookingPaymentPanel({
    booking, isPaid, isPending, isPaymentReviewing, isCancelled, isCancelRequested,
    isExpired, canCancelBooking, cancellationPolicy, tripLifecycle, tripUnavailableReason,
    totalPriceNumber, refundAmountNumber, secondsLeft, payError, isPaying,
    paymentIssueResult, paymentSupportTicket, onRetryPayment, onOpenCancelModal, onOpenIssueForm,
}: Props) {
    const { t, formatPrice, formatDateTime } = useLocale();

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
                    <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Dự Kiến Hoàn Tiền</p>
                    <p className="text-lg font-extrabold text-orange-600">
                        {refundAmountNumber > 0 ? formatPrice(refundAmountNumber) : 'Không hoàn tiền'}
                    </p>
                    <p className="text-xs text-orange-600 opacity-80">{booking.refundNote}</p>
                </div>
            )}

            {isPending && booking.paymentMethod === 'IN_STORE' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                        <span className="material-symbols-outlined text-base">info</span>
                        <span>Thanh toán tại văn phòng</span>
                    </div>
                    <p className="leading-relaxed">
                        Vui lòng mang mã đặt chỗ đến trực tiếp văn phòng để hoàn tất thanh toán và nhận vé trong vòng 24 giờ kể từ thời điểm đặt.
                    </p>
                    <div className="pt-2 border-t border-amber-200/50 flex justify-between font-bold text-[10px] uppercase tracking-wider text-amber-800">
                        <span>Hạn chót giữ chỗ:</span>
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

            {cancellationPolicy && !isCancelRequested && !isCancelled && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${canCancelBooking
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : tripLifecycle === 'COMPLETED'
                        ? 'border-slate-200 bg-slate-50 text-slate-700'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}>
                    <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-base mt-0.5">
                            {canCancelBooking ? 'event_available' : tripLifecycle === 'COMPLETED' ? 'task_alt' : 'event_busy'}
                        </span>
                        <div>
                            <p className="font-bold">
                                {canCancelBooking
                                    ? `Có thể hủy online - hoàn dự kiến ${cancellationPolicy.refundPercent}%`
                                    : tripLifecycle === 'COMPLETED'
                                        ? 'Chuyến đi đã hoàn thành'
                                        : 'Không thể hủy online'}
                            </p>
                            <p className="mt-1 text-xs opacity-80">
                                {canCancelBooking ? cancellationPolicy.refundNote : tripUnavailableReason}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {isPaid ? (
                <div className="space-y-3">
                    <Link
                        href={`/success?bookingId=${booking.bookingCode}`}
                        className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                        {t('my_bookings.eTicket')}
                    </Link>
                    {canCancelBooking && (
                        <button
                            onClick={onOpenCancelModal}
                            className="w-full border-2 border-red-200 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all text-sm"
                        >
                            <span className="material-symbols-outlined text-base">cancel</span>
                            Yêu Cầu Hủy Tour
                        </button>
                    )}
                </div>
            ) : isCancelRequested ? (
                <div className="space-y-3">
                    <div className="w-full bg-orange-50 border-2 border-orange-200 text-orange-600 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-lg animate-pulse">pending</span>
                        Đang Chờ Admin Xử Lý
                    </div>
                    <p className="text-xs text-center text-slate-400">Thời gian xử lý: 1–3 ngày làm việc</p>
                    <Link
                        href="/contact"
                        className="w-full border border-slate-200 text-slate-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-base">support_agent</span>
                        Liên Hệ Hỗ Trợ
                    </Link>
                </div>
            ) : isCancelled ? (
                <div className="space-y-3">
                    <div className="w-full bg-slate-100 text-slate-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                        <span className="material-symbols-outlined text-lg">block</span>
                        Đơn Đặt Tour Đã Hủy
                    </div>
                    <Link
                        href="/destinations"
                        className="w-full border border-primary text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-base">explore</span>
                        Khám Phá Tour Mới
                    </Link>
                </div>
            ) : isExpired ? (
                <div className="space-y-3">
                    <div className="w-full bg-red-100 text-red-600 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                        <span className="material-symbols-outlined text-lg">timer_off</span>
                        Đã Hết Hạn Thanh Toán
                    </div>
                    <Link href="/destinations" className="w-full border border-primary text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all text-sm">
                        <span className="material-symbols-outlined text-lg">explore</span>
                        Đặt Tour Mới
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {booking.paymentMethod === 'IN_STORE' ? (
                        <Link
                            href={`/success?bookingId=${booking.bookingCode}`}
                            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95 text-center text-sm"
                        >
                            <span className="material-symbols-outlined text-lg">info</span>
                            Xem Hướng Dẫn và Vé Giữ Chỗ
                        </Link>
                    ) : isPaymentReviewing ? (
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-sky-600 mt-0.5">fact_check</span>
                                <div>
                                    <p className="text-sm font-bold text-sky-900">Đang kiểm tra thanh toán</p>
                                    <p className="mt-1 text-xs leading-relaxed text-sky-700">
                                        Chúng tôi đã nhận yêu cầu đối soát. Nếu bạn đã chuyển khoản, không cần tạo thanh toán lại hoặc hủy tour trong lúc chờ kiểm tra.
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
                                    Mã yêu cầu: #{paymentIssueResult?.ticketId ?? paymentSupportTicket?.id}
                                </div>
                            )}
                            <Link
                                href="/contact"
                                className="w-full border border-sky-200 bg-white text-sky-700 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sky-100 transition-all text-sm"
                            >
                                <span className="material-symbols-outlined text-base">support_agent</span>
                                Liên hệ hỗ trợ
                            </Link>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={onRetryPayment}
                                disabled={isPaying}
                                className="w-full bg-amber-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isPaying ? (
                                    <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Đang tạo liên kết...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-lg">account_balance_wallet</span>{t('my_bookings.payNow')}</>
                                )}
                            </button>
                            <button
                                onClick={onOpenIssueForm}
                                className="w-full border border-sky-200 text-sky-700 bg-sky-50 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sky-100 transition-all text-sm"
                            >
                                <span className="material-symbols-outlined text-base">fact_check</span>
                                Tôi đã chuyển khoản, yêu cầu kiểm tra
                            </button>
                        </>
                    )}
                    {canCancelBooking && (
                        <div className="border-t border-slate-200/70 pt-3 space-y-2">
                            {(isPaymentReviewing || paymentIssueResult) && (
                                <p className="text-xs leading-relaxed text-slate-500">
                                    Nếu bạn đã chuyển khoản, hãy chờ kết quả đối soát trước khi hủy để tránh nhầm trạng thái hoàn tiền.
                                </p>
                            )}
                            <button
                                onClick={onOpenCancelModal}
                                className="w-full border-2 border-slate-200 text-slate-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-sm"
                            >
                                <span className="material-symbols-outlined text-base">cancel</span>
                                Hủy Đặt Tour
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

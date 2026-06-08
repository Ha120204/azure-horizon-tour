import { useLocale } from '@/context/LocaleContext';
import type { BookingDetail } from '../_lib/types';

type Props = {
    booking: BookingDetail;
    isPaid: boolean;
    isPending: boolean;
    isCancelled: boolean;
    isCancelRequested: boolean;
    totalPriceNumber: number;
    refundAmountNumber: number;
};

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span className={`text-sm text-slate-500 ${className ?? ''}`}>{label}</span>
            <span className={`text-sm font-semibold text-right ${className ?? ''}`}>{value}</span>
        </div>
    );
}

function Divider() {
    return <div className="border-t border-slate-100" />;
}

export function BookingPriceBreakdown({
    booking, isPaid, isPending, isCancelled, isCancelRequested,
    totalPriceNumber, refundAmountNumber,
}: Props) {
    const { formatPrice, language } = useLocale();

    const unitPrice = booking.unitPriceAtBooking != null ? Number(booking.unitPriceAtBooking) : null;
    const discount = Number(booking.discountAmount ?? 0);
    const subtotal = unitPrice != null ? unitPrice * booking.numberOfPeople : null;

    const hasBreakdown = unitPrice != null && unitPrice > 0;

    return (
        <div className="mt-8">
            <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-4">
                {language === 'vi' ? 'Chi tiết giá' : 'Price details'}
            </h3>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 text-sm">
                {hasBreakdown && subtotal != null ? (
                    <>
                        <Row
                            label={`${formatPrice(unitPrice)} × ${booking.numberOfPeople} ${language === 'vi' ? 'hành khách' : 'pax'}`}
                            value={formatPrice(subtotal)}
                        />

                        {discount > 0 && (
                            <Row
                                label={booking.voucherCode
                                    ? `${language === 'vi' ? 'Voucher' : 'Voucher'} (${booking.voucherCode})`
                                    : (language === 'vi' ? 'Giảm giá' : 'Discount')
                                }
                                value={`−${formatPrice(discount)}`}
                                className="text-emerald-600"
                            />
                        )}

                        <Divider />
                    </>
                ) : null}

                <div className="flex items-baseline justify-between gap-4">
                    <span className="font-bold text-on-surface">
                        {language === 'vi' ? 'Tổng thanh toán' : 'Total'}
                    </span>
                    <span className="text-xl font-extrabold font-headline text-primary">
                        {formatPrice(totalPriceNumber)}
                    </span>
                </div>

                <Divider />

                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">
                        {language === 'vi' ? 'Trạng thái' : 'Status'}
                    </span>
                    {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <span className="material-symbols-outlined text-base text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            {language === 'vi' ? 'Đã thanh toán' : 'Paid'}
                        </span>
                    ) : isCancelled ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold">
                            <span className="material-symbols-outlined text-base">cancel</span>
                            {language === 'vi' ? 'Đã hủy' : 'Cancelled'}
                        </span>
                    ) : isCancelRequested ? (
                        <span className="inline-flex items-center gap-1.5 text-orange-600 font-semibold">
                            <span className="material-symbols-outlined text-base animate-pulse">pending</span>
                            {language === 'vi' ? 'Đang xử lý hủy' : 'Cancel pending'}
                        </span>
                    ) : isPending ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
                            <span className="material-symbols-outlined text-base">pending</span>
                            {language === 'vi' ? 'Chờ thanh toán' : 'Awaiting payment'}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-sky-700 font-semibold">
                            <span className="material-symbols-outlined text-base">fact_check</span>
                            {language === 'vi' ? 'Đang kiểm tra' : 'Reviewing'}
                        </span>
                    )}
                </div>

                {isCancelRequested && refundAmountNumber > 0 && (
                    <>
                        <Divider />
                        <div className="flex items-baseline justify-between gap-4">
                            <span className="text-slate-500">
                                {language === 'vi' ? 'Hoàn tiền dự kiến' : 'Est. refund'}
                            </span>
                            <span className="font-bold text-emerald-600">
                                {formatPrice(refundAmountNumber)}
                            </span>
                        </div>
                        {booking.refundNote && (
                            <p className="text-xs text-slate-400 leading-relaxed">{booking.refundNote}</p>
                        )}
                    </>
                )}

                {isCancelled && booking.refundAmount != null && (
                    <>
                        <Divider />
                        <div className="flex items-baseline justify-between gap-4">
                            <span className="text-slate-500">
                                {language === 'vi' ? 'Đã hoàn tiền' : 'Refunded'}
                            </span>
                            <span className={`font-bold ${refundAmountNumber > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {refundAmountNumber > 0 ? formatPrice(refundAmountNumber) : (language === 'vi' ? 'Không hoàn tiền' : 'No refund')}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

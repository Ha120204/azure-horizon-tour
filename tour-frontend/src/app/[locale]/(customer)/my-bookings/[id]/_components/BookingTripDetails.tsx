import { useLocale } from '@/context/LocaleContext';
import type { BookingDetail, BookingTransportAssignment } from '../_lib/types';
import { BookingPriceBreakdown } from './BookingPriceBreakdown';

function TransportRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="shrink-0 text-slate-500">{label}</span>
            <span className="text-right font-mono font-semibold tracking-wide text-slate-800">{value}</span>
        </div>
    );
}

function TransportAssignmentPanel({ assignment }: { assignment: BookingTransportAssignment }) {
    const { t } = useLocale();
    const hasOutbound = assignment.outboundTicketCodes.length > 0 || assignment.outboundPnrCode;
    const hasReturn = assignment.returnTicketCodes.length > 0 || assignment.returnPnrCode;
    const hasVehicle = assignment.vehiclePlate || assignment.seatNumbers.length > 0;

    return (
        <div className="mt-8">
            <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-4">
                {t('my_bookings.transport_title')}
            </h3>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4 text-sm">
                {hasOutbound && (
                    <div>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-2">
                            <span className="material-symbols-outlined text-[15px]">flight_takeoff</span>
                            {t('my_bookings.transport_outbound')}
                        </p>
                        <div className="space-y-1.5">
                            {assignment.outboundPnrCode && <TransportRow label="PNR" value={assignment.outboundPnrCode} />}
                            {assignment.outboundTicketCodes.map((code, i) => (
                                <TransportRow key={i} label={t('my_bookings.transport_ticket', { n: i + 1 })} value={code} />
                            ))}
                            {assignment.outboundSeatNumbers.length > 0 && (
                                <TransportRow label={t('my_bookings.transport_seats')} value={assignment.outboundSeatNumbers.join(', ')} />
                            )}
                        </div>
                    </div>
                )}

                {hasReturn && (
                    <div className={hasOutbound ? 'border-t border-blue-100 pt-4' : ''}>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-2">
                            <span className="material-symbols-outlined text-[15px]">flight_land</span>
                            {t('my_bookings.transport_return')}
                        </p>
                        <div className="space-y-1.5">
                            {assignment.returnPnrCode && <TransportRow label="PNR" value={assignment.returnPnrCode} />}
                            {assignment.returnTicketCodes.map((code, i) => (
                                <TransportRow key={i} label={t('my_bookings.transport_ticket', { n: i + 1 })} value={code} />
                            ))}
                            {assignment.returnSeatNumbers.length > 0 && (
                                <TransportRow label={t('my_bookings.transport_seats')} value={assignment.returnSeatNumbers.join(', ')} />
                            )}
                        </div>
                    </div>
                )}

                {hasVehicle && (
                    <div className={(hasOutbound || hasReturn) ? 'border-t border-blue-100 pt-4' : ''}>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-2">
                            <span className="material-symbols-outlined text-[15px]">directions_bus</span>
                            {t('my_bookings.transport_vehicle')}
                        </p>
                        <div className="space-y-1.5">
                            {assignment.vehiclePlate && <TransportRow label={t('my_bookings.transport_plate')} value={assignment.vehiclePlate} />}
                            {assignment.seatNumbers.length > 0 && (
                                <TransportRow label={t('my_bookings.transport_seats')} value={assignment.seatNumbers.join(', ')} />
                            )}
                        </div>
                    </div>
                )}

                {assignment.notes && (
                    <p className="text-xs text-slate-500 border-t border-blue-100 pt-3 leading-relaxed">{assignment.notes}</p>
                )}
            </div>
        </div>
    );
}

type Props = {
    booking: BookingDetail;
    isPaid: boolean;
    isPending: boolean;
    isCancelled: boolean;
    isCancelRequested: boolean;
    totalPriceNumber: number;
    refundAmountNumber: number;
};

export function BookingTripDetails({ booking, isPaid, isPending, isCancelled, isCancelRequested, totalPriceNumber, refundAmountNumber }: Props) {
    const { t, formatDate, formatDateTime, formatPrice, language } = useLocale();

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-4">
                    {language === 'vi' ? 'Chi tiết đặt tour' : 'Booking details'}
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3 text-on-surface-variant">
                            <span className="material-symbols-outlined text-primary">calendar_today</span>
                            <span className="font-medium">{t('my_bookings.dateLbl')}</span>
                        </div>
                        <span className="font-bold">{formatDate(booking.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3 text-on-surface-variant">
                            <span className="material-symbols-outlined text-primary">payments</span>
                            <span className="font-medium">
                                {language === 'vi' ? 'Phương thức thanh toán' : 'Payment Method'}
                            </span>
                        </div>
                        <span className="font-bold text-primary text-right">
                            {booking.paymentMethod === 'IN_STORE'
                                ? (language === 'vi' ? 'Thanh toán tại văn phòng' : 'Pay at Office')
                                : (language === 'vi' ? 'Chuyển khoản (PayOS)' : 'Bank Transfer (PayOS)')}
                        </span>
                    </div>
                </div>
            </div>

            <BookingPriceBreakdown
                booking={booking}
                isPaid={isPaid}
                isPending={isPending}
                isCancelled={isCancelled}
                isCancelRequested={isCancelRequested}
                totalPriceNumber={totalPriceNumber}
                refundAmountNumber={refundAmountNumber}
            />

            {booking.transportAssignment && booking.status === 'CONFIRMED' && (
                <TransportAssignmentPanel assignment={booking.transportAssignment} />
            )}

            {(isCancelled || isCancelRequested) && booking.cancelReason && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <p className="text-xs font-bold text-outline uppercase tracking-widest mb-3">Thông Tin Hủy Tour</p>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Lý do</span>
                            <span className="font-medium text-slate-700 text-right max-w-[60%]">{booking.cancelReason}</span>
                        </div>
                        {booking.cancelRequestedAt && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Yêu cầu lúc</span>
                                <span className="font-medium">{formatDateTime(booking.cancelRequestedAt)}</span>
                            </div>
                        )}
                        {booking.cancelledAt && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Hủy lúc</span>
                                <span className="font-medium">{formatDateTime(booking.cancelledAt)}</span>
                            </div>
                        )}
                        {booking.refundAmount !== undefined && booking.refundAmount !== null && (
                            <div className="flex justify-between pt-2 border-t border-slate-200">
                                <span className="text-slate-500 font-semibold">Hoàn tiền</span>
                                <span className={`font-bold text-base ${refundAmountNumber > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {refundAmountNumber > 0 ? formatPrice(refundAmountNumber) : 'Không hoàn tiền'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

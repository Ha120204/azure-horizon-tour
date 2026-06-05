import { useLocale } from '@/context/LocaleContext';
import type { BookingDetail } from '../_lib/types';

type Props = {
    booking: BookingDetail;
    departureDate?: string;
    isCancelled: boolean;
    isCancelRequested: boolean;
    refundAmountNumber: number;
};

export function BookingTripDetails({ booking, departureDate, isCancelled, isCancelRequested, refundAmountNumber }: Props) {
    const { t, formatDate, formatDateTime, formatPrice, language } = useLocale();

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-4">
                    {t('my_bookings.itineraryDetails')}
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
                            <span className="material-symbols-outlined text-primary">group</span>
                            <span className="font-medium">{t('my_bookings.passengersLbl')}</span>
                        </div>
                        <span className="font-bold">{booking.numberOfPeople}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3 text-on-surface-variant">
                            <span className="material-symbols-outlined text-primary">schedule</span>
                            <span className="font-medium">{t('my_bookings.durationLbl')}</span>
                        </div>
                        <span className="font-bold">{booking.tour?.duration || t('my_bookings.unspecified')}</span>
                    </div>
                    {departureDate && (
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3 text-on-surface-variant">
                                <span className="material-symbols-outlined text-primary">flight_takeoff</span>
                                <span className="font-medium">Ngày khởi hành</span>
                            </div>
                            <span className="font-bold">{formatDate(departureDate)}</span>
                        </div>
                    )}
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

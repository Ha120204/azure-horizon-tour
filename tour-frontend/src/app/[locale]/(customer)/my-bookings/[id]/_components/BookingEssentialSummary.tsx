import { useLocale } from '@/context/LocaleContext';
import type { BookingDetail } from '../_lib/types';

type Props = {
    booking: BookingDetail;
    departureDate?: string;
};

type SummaryItemProps = {
    icon: string;
    label: string;
    value: string;
    supportingText?: string;
    emphasis?: boolean;
};

function SummaryItem({ icon, label, value, supportingText, emphasis = false }: SummaryItemProps) {
    return (
        <div className="flex min-w-0 items-start gap-3 border-b border-outline-variant/15 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
            <span
                className={`material-symbols-outlined mt-0.5 shrink-0 text-xl ${emphasis ? 'text-primary' : 'text-outline'}`}
                aria-hidden="true"
            >
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-outline">{label}</p>
                <p className={`mt-1 break-words text-sm font-extrabold leading-snug ${emphasis ? 'text-primary' : 'text-on-surface'}`}>
                    {value}
                </p>
                {supportingText ? (
                    <p className="mt-1 text-xs leading-snug text-outline">{supportingText}</p>
                ) : null}
            </div>
        </div>
    );
}

export function BookingEssentialSummary({ booking, departureDate }: Props) {
    const { t, formatDate, formatDateTime, language } = useLocale();
    const isVietnamese = language === 'vi';
    const unspecified = t('my_bookings.unspecified');
    const meetingTime = booking.meetingTime
        ? formatDateTime(booking.meetingTime, { hour: '2-digit', minute: '2-digit' })
        : null;
    const pickupLocation = booking.pickupLocation?.trim() || null;
    const directionsUrl = pickupLocation
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupLocation)}`
        : null;

    return (
        <section id="essential-information" aria-labelledby="essential-information-title" className="scroll-mt-32">
            <div className="mb-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">confirmation_number</span>
                <div>
                    <h2 id="essential-information-title" className="font-headline text-lg font-extrabold text-on-surface">
                        {isVietnamese ? 'Thông tin cần biết' : 'Essential information'}
                    </h2>
                    <p className="mt-0.5 text-xs text-outline">
                        {isVietnamese ? 'Các thông tin quan trọng cho ngày khởi hành' : 'Key details for your departure day'}
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 shadow-[0_8px_28px_rgba(15,47,87,0.05)] sm:px-5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryItem
                        icon="flight_takeoff"
                        label={isVietnamese ? 'Ngày khởi hành' : 'Departure date'}
                        value={departureDate ? formatDate(departureDate) : unspecified}
                        emphasis
                    />
                    <SummaryItem
                        icon="schedule"
                        label={isVietnamese ? 'Giờ tập trung' : 'Meeting time'}
                        value={meetingTime || (isVietnamese ? 'Sẽ cập nhật' : 'To be confirmed')}
                        supportingText={meetingTime
                            ? (isVietnamese ? 'Vui lòng có mặt đúng giờ' : 'Please arrive on time')
                            : (isVietnamese ? 'Theo dõi vé để nhận cập nhật' : 'Check your ticket for updates')}
                        emphasis={Boolean(meetingTime)}
                    />
                    <SummaryItem
                        icon="timelapse"
                        label={t('my_bookings.durationLbl')}
                        value={booking.tour?.duration || unspecified}
                    />
                    <SummaryItem
                        icon="group"
                        label={t('my_bookings.passengersLbl')}
                        value={isVietnamese
                            ? `${booking.numberOfPeople} hành khách`
                            : `${booking.numberOfPeople} passenger${booking.numberOfPeople === 1 ? '' : 's'}`}
                    />
                </div>

                <div className="flex flex-col gap-4 border-t border-outline-variant/15 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className={`material-symbols-outlined mt-0.5 shrink-0 text-xl ${pickupLocation ? 'text-primary' : 'text-outline'}`} aria-hidden="true">
                            location_on
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-outline">
                                {isVietnamese ? 'Điểm tập trung' : 'Meeting point'}
                            </p>
                            <p className={`mt-1 break-words text-sm font-extrabold leading-snug ${pickupLocation ? 'text-on-surface' : 'text-outline'}`}>
                                {pickupLocation || (isVietnamese ? 'Sẽ được cập nhật trước ngày khởi hành' : 'Will be confirmed before departure')}
                            </p>
                        </div>
                    </div>

                    {directionsUrl ? (
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group/map inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm font-bold text-primary outline-none transition-[background-color,border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none sm:self-center"
                        >
                            <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/map:rotate-12 motion-reduce:transform-none" aria-hidden="true">
                                map
                            </span>
                            {isVietnamese ? 'Mở bản đồ' : 'Open map'}
                            <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/map:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true">
                                open_in_new
                            </span>
                        </a>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

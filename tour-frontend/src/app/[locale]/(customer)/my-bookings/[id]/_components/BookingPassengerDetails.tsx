import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import type { BookingDetail, BookingPassenger } from '../_lib/types';

type Props = {
    booking: BookingDetail;
};

function normalizePassengerType(type?: string | null) {
    const value = type?.trim().toUpperCase() ?? '';
    if (value === 'CHILD' || value.startsWith('CHILD')) return 'CHILD';
    if (value === 'INFANT' || value.startsWith('INFANT')) return 'INFANT';
    return 'ADULT';
}

function maskIdentity(value?: string | null) {
    const normalized = value?.trim();
    if (!normalized) return null;
    if (normalized.length <= 4) return normalized;
    return `${'•'.repeat(Math.min(6, normalized.length - 4))}${normalized.slice(-4)}`;
}

function PassengerRow({ passenger, index }: { passenger: BookingPassenger; index: number }) {
    const { formatDate, language } = useLocale();
    const isVietnamese = language === 'vi';
    const type = normalizePassengerType(passenger.type);
    const typeLabel = type === 'CHILD'
        ? (isVietnamese ? 'Trẻ em' : 'Child')
        : type === 'INFANT'
            ? (isVietnamese ? 'Em bé' : 'Infant')
            : (isVietnamese ? 'Người lớn' : 'Adult');
    const typeClass = type === 'CHILD'
        ? 'border-sky-200 bg-sky-50 text-sky-700'
        : type === 'INFANT'
            ? 'border-violet-200 bg-violet-50 text-violet-700'
            : 'border-slate-200 bg-slate-50 text-slate-700';
    const identity = maskIdentity(passenger.identityNo);

    return (
        <li className="grid gap-3 border-b border-outline-variant/15 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/8 text-sm font-extrabold text-primary">
                    {index + 1}
                </span>
                <div className="min-w-0">
                    <p className="break-words text-sm font-extrabold text-on-surface">
                        {passenger.fullName?.trim() || (isVietnamese ? `Hành khách ${index + 1}` : `Passenger ${index + 1}`)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-outline">
                        {passenger.dob ? (
                            <span>{isVietnamese ? 'Ngày sinh' : 'Date of birth'}: {formatDate(passenger.dob)}</span>
                        ) : null}
                        {identity ? (
                            <span>{passenger.identityType || (isVietnamese ? 'Giấy tờ' : 'Document')}: {identity}</span>
                        ) : null}
                    </div>
                    {passenger.notes?.trim() ? (
                        <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{passenger.notes}</p>
                    ) : null}
                </div>
            </div>
            <span className={`inline-flex min-h-7 items-center self-start rounded-md border px-2.5 py-1 text-xs font-bold ${typeClass}`}>
                {typeLabel}
            </span>
        </li>
    );
}

export function BookingPassengerDetails({ booking }: Props) {
    const { language } = useLocale();
    const isVietnamese = language === 'vi';
    const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
    const contactName = booking.contactInfo?.fullName?.trim() || booking.user?.fullName?.trim() || null;
    const contactEmail = booking.contactInfo?.email?.trim() || booking.user?.email?.trim() || null;
    const contactPhone = booking.contactInfo?.phone?.trim() || booking.user?.phone?.trim() || null;
    const passengerCounts = passengers.reduce(
        (counts, passenger) => {
            counts[normalizePassengerType(passenger.type)] += 1;
            return counts;
        },
        { ADULT: 0, CHILD: 0, INFANT: 0 },
    );
    const countSummary = passengers.length > 0
        ? [
            passengerCounts.ADULT ? `${passengerCounts.ADULT} ${isVietnamese ? 'người lớn' : 'adult'}` : null,
            passengerCounts.CHILD ? `${passengerCounts.CHILD} ${isVietnamese ? 'trẻ em' : 'child'}` : null,
            passengerCounts.INFANT ? `${passengerCounts.INFANT} ${isVietnamese ? 'em bé' : 'infant'}` : null,
        ].filter(Boolean).join(' · ')
        : `${booking.numberOfPeople} ${isVietnamese ? 'hành khách' : `passenger${booking.numberOfPeople === 1 ? '' : 's'}`}`;

    return (
        <section id="passenger-details" aria-labelledby="passenger-details-title" className="scroll-mt-32">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                        {isVietnamese ? 'Người tham gia' : 'Travel party'}
                    </p>
                    <h2 id="passenger-details-title" className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
                        {isVietnamese ? 'Thông tin hành khách' : 'Passenger details'}
                    </h2>
                </div>
                <p className="text-sm font-bold text-on-surface-variant">{countSummary}</p>
            </div>

            <div className="grid overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.2fr)]">
                <div className="border-b border-outline-variant/15 bg-surface-container-low p-5 lg:border-b-0 lg:border-r">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">contact_phone</span>
                        <h3 className="text-sm font-extrabold text-on-surface">
                            {isVietnamese ? 'Người đại diện đặt tour' : 'Booking contact'}
                        </h3>
                    </div>

                    <dl className="mt-5 space-y-4 text-sm">
                        <div>
                            <dt className="text-xs font-semibold text-outline">{isVietnamese ? 'Họ và tên' : 'Full name'}</dt>
                            <dd className="mt-1 break-words font-extrabold text-on-surface">
                                {contactName || (isVietnamese ? 'Chưa cập nhật' : 'Not provided')}
                            </dd>
                        </div>
                        {contactEmail ? (
                            <div>
                                <dt className="text-xs font-semibold text-outline">Email</dt>
                                <dd className="mt-1 break-all">
                                    <a className="font-bold text-primary hover:underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>
                                </dd>
                            </div>
                        ) : null}
                        {contactPhone ? (
                            <div>
                                <dt className="text-xs font-semibold text-outline">{isVietnamese ? 'Số điện thoại' : 'Phone number'}</dt>
                                <dd className="mt-1">
                                    <a className="font-bold text-primary hover:underline" href={`tel:${contactPhone}`}>{contactPhone}</a>
                                </dd>
                            </div>
                        ) : null}
                    </dl>

                    <p className="mt-5 border-t border-outline-variant/15 pt-4 text-xs leading-relaxed text-outline">
                        {isVietnamese
                            ? 'Đây là thông tin dùng để nhận cập nhật liên quan đến chuyến đi.'
                            : 'These details are used for trip-related updates.'}
                    </p>
                </div>

                <div className="p-5">
                    {passengers.length > 0 ? (
                        <ol>
                            {passengers.map((passenger, index) => (
                                <PassengerRow key={`${passenger.fullName ?? 'passenger'}-${index}`} passenger={passenger} index={index} />
                            ))}
                        </ol>
                    ) : (
                        <div className="flex min-h-32 flex-col items-start justify-center">
                            <p className="text-sm font-bold text-on-surface">
                                {isVietnamese ? `${booking.numberOfPeople} hành khách đã được ghi nhận` : `${booking.numberOfPeople} passengers recorded`}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-outline">
                                {isVietnamese
                                    ? 'Danh sách tên hành khách chưa có trong dữ liệu của booking này.'
                                    : 'Passenger names are not available for this booking.'}
                            </p>
                        </div>
                    )}

                    <div className="mt-4 border-t border-outline-variant/15 pt-4">
                        <Link
                            href="/contact"
                            className="group/change inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-primary outline-none transition-[background-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/change:-rotate-6 motion-reduce:transform-none" aria-hidden="true">
                                edit_note
                            </span>
                            {isVietnamese ? 'Cần thay đổi thông tin? Liên hệ hỗ trợ' : 'Need to change details? Contact support'}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

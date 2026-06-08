import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import type { BookingDepartureTransport, BookingDetail } from '../_lib/types';

type Props = {
    booking: BookingDetail;
};

type GuideItemProps = {
    icon: string;
    title: string;
    description: string;
    detail?: string | null;
};

function GuideItem({ icon, title, description, detail }: GuideItemProps) {
    return (
        <div className="flex min-w-0 gap-3 py-4">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-xl text-primary" aria-hidden="true">
                {icon}
            </span>
            <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-on-surface">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{description}</p>
                {detail ? (
                    <p className="mt-2 break-words text-xs font-bold leading-relaxed text-primary">{detail}</p>
                ) : null}
            </div>
        </div>
    );
}

function getTransportRecognition(transport: BookingDepartureTransport | null | undefined, vehiclePlate: string | null | undefined) {
    if (!transport && !vehiclePlate) return null;

    return [
        transport?.airline,
        transport?.flightCode,
        transport?.operator,
        transport?.vehicleType,
        vehiclePlate,
    ].filter(Boolean).join(' · ');
}

export function BookingDepartureGuide({ booking }: Props) {
    const { language } = useLocale();
    const isVietnamese = language === 'vi';
    const isConfirmed = booking.status === 'CONFIRMED' && booking.paymentStatus === 'PAID';
    const isInactive = booking.status === 'CANCELLED' || booking.status === 'CANCEL_REQUESTED';
    const transport = booking.departureTransport;
    const transportRecognition = getTransportRecognition(transport, booking.transportAssignment?.vehiclePlate);
    const route = transport?.departureAirport && transport?.arrivalAirport
        ? `${transport.departureAirport} → ${transport.arrivalAirport}`
        : null;
    const operationsNote = transport?.notes?.trim() || booking.transportAssignment?.notes?.trim() || null;

    if (isInactive) return null;

    return (
        <section id="departure-guide" aria-labelledby="departure-guide-title" className="scroll-mt-32">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                        {isVietnamese ? 'Chuẩn bị trước chuyến đi' : 'Before you go'}
                    </p>
                    <h2 id="departure-guide-title" className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
                        {isVietnamese ? 'Trong ngày khởi hành' : 'On departure day'}
                    </h2>
                </div>
                <Link
                    href="/contact"
                    className="group/support inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-outline-variant/25 px-4 py-2.5 text-sm font-bold text-primary outline-none transition-[background-color,border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                >
                    <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/support:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true">
                        support_agent
                    </span>
                    {isVietnamese ? 'Liên hệ hỗ trợ' : 'Contact support'}
                </Link>
            </div>

            <div className="grid divide-y divide-outline-variant/15 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-5 md:grid-cols-2 md:divide-x md:divide-y-0 md:px-0">
                <div className="md:px-6">
                    <GuideItem
                        icon={isConfirmed ? 'qr_code_scanner' : 'task_alt'}
                        title={isVietnamese ? 'Làm thủ tục với vé điện tử' : 'Check in with your E-Ticket'}
                        description={isConfirmed
                            ? (isVietnamese
                                ? 'Mở vé điện tử và xuất trình mã QR tại điểm tập trung. Bạn không cần in vé.'
                                : 'Open your E-Ticket and present its QR code at the meeting point. Printing is not required.')
                            : (isVietnamese
                                ? 'Hoàn tất thanh toán và chờ xác nhận để nhận vé điện tử dùng khi check-in.'
                                : 'Complete payment and wait for confirmation to receive the E-Ticket used at check-in.')}
                    />
                    {route ? (
                        <GuideItem
                            icon="route"
                            title={isVietnamese ? 'Hành trình di chuyển' : 'Transport route'}
                            description={route}
                        />
                    ) : null}
                </div>

                <div className="md:px-6">
                    <GuideItem
                        icon={transport?.type === 'FLIGHT' ? 'flight' : 'directions_bus'}
                        title={isVietnamese ? 'Nhận diện phương tiện' : 'Identify your transport'}
                        description={transportRecognition
                            || (isVietnamese
                                ? 'Thông tin phương tiện sẽ được cập nhật trên vé trước ngày khởi hành.'
                                : 'Transport details will be added to your ticket before departure.')}
                        detail={operationsNote}
                    />
                    <GuideItem
                        icon="notifications_active"
                        title={isVietnamese ? 'Kiểm tra cập nhật trước khi đi' : 'Check updates before leaving'}
                        description={isVietnamese
                            ? 'Mở lại trang vé trước giờ tập trung để kiểm tra thay đổi về thời gian, điểm đón hoặc phương tiện.'
                            : 'Reopen this ticket before meeting time to check for changes to time, pickup point, or transport.'}
                    />
                </div>
            </div>
        </section>
    );
}

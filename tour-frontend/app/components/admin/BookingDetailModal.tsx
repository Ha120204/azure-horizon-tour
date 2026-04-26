'use client';

type BookingDetail = {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAvatar: string;
    tourName: string;
    startDate: string;
    duration: string;
    guests: string;
    basePrice: string;
    discount: string;
    voucherCode: string;
    finalTotal: string;
    status: string;
    paymentHistory: {
        date: string;
        gateway: string;
        amount: string;
        status: string;
    }[];
};

const statusBadge: Record<string, string> = {
    Confirmed: 'bg-tertiary-container text-on-tertiary-container',
    Pending: 'bg-secondary-container/20 text-secondary-container',
    Cancelled: 'bg-error/10 text-error',
};

const paymentStatusBadge: Record<string, string> = {
    SUCCESS: 'text-tertiary-container bg-tertiary-container/10',
    FAILED: 'text-error bg-error/10',
    PROCESSING: 'text-primary bg-primary-fixed',
};

export default function BookingDetailModal({
    booking,
    onClose,
}: {
    booking: BookingDetail;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className="relative flex flex-col bg-surface-container-lowest w-full max-w-4xl rounded-2xl shadow-[0_32px_64px_-12px_rgba(25,28,33,0.15)] overflow-hidden max-h-[90vh] animate-fade-in-up">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-8 py-6 bg-surface-container-lowest z-10 border-b border-outline-variant/15">
                    <div className="flex items-center gap-4 flex-wrap">
                        <h2 className="font-headline text-xl font-bold text-primary tracking-tight">
                            Booking Detail: {booking.id}
                        </h2>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full font-label text-xs font-bold tracking-widest uppercase ${statusBadge[booking.status] || statusBadge.Pending}`}>
                            {booking.status}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded-full hover:bg-surface-container-low"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-8 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* LEFT COLUMN */}
                        <div className="flex flex-col gap-10">
                            {/* Customer Information */}
                            <section>
                                <h3 className="font-body text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                                    Customer Information
                                </h3>
                                <div className="flex items-center gap-5 bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
                                        {booking.customerName.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <p className="font-body text-sm font-semibold text-on-surface">{booking.customerName}</p>
                                        <div className="flex items-center gap-2 text-on-surface-variant">
                                            <span className="material-symbols-outlined text-[16px]">mail</span>
                                            <span className="font-body text-sm">{booking.customerEmail}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-on-surface-variant">
                                            <span className="material-symbols-outlined text-[16px]">call</span>
                                            <span className="font-body text-sm">{booking.customerPhone}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Tour Details */}
                            <section>
                                <h3 className="font-body text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">explore</span>
                                    Tour Details
                                </h3>
                                <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 grid grid-cols-2 gap-y-5 gap-x-4">
                                    <div className="col-span-2">
                                        <p className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">Tour Name</p>
                                        <p className="font-body text-sm font-semibold text-on-surface">{booking.tourName}</p>
                                    </div>
                                    <div>
                                        <p className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">Start Date</p>
                                        <p className="font-body text-sm text-on-surface">{booking.startDate}</p>
                                    </div>
                                    <div>
                                        <p className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">Duration</p>
                                        <p className="font-body text-sm text-on-surface">{booking.duration}</p>
                                    </div>
                                    <div>
                                        <p className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">Guests</p>
                                        <div className="flex items-center gap-2 text-on-surface">
                                            <span className="material-symbols-outlined text-[16px] text-primary">group</span>
                                            <span className="font-body text-sm">{booking.guests}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col gap-10">
                            {/* Pricing & Voucher */}
                            <section>
                                <h3 className="font-body text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                                    Pricing & Voucher
                                </h3>
                                <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 flex flex-col gap-3.5">
                                    <div className="flex justify-between items-center">
                                        <span className="font-body text-sm text-on-surface-variant">Base Price</span>
                                        <span className="font-body text-sm font-medium text-on-surface">{booking.basePrice}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-body text-sm text-on-surface-variant">Discount Amount</span>
                                        <span className="font-body text-sm font-medium text-tertiary-container">{booking.discount}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-body text-sm text-on-surface-variant">Voucher Code</span>
                                        <span className={`font-body text-sm font-medium ${booking.voucherCode === 'None' ? 'text-outline' : 'text-primary font-bold'}`}>
                                            {booking.voucherCode}
                                        </span>
                                    </div>
                                    <div className="h-px w-full bg-outline-variant/20 my-1"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-body text-base font-bold text-on-surface">Final Total</span>
                                        <span className="font-headline text-xl font-bold text-primary tracking-tight">{booking.finalTotal}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Payment History */}
                            <section>
                                <h3 className="font-body text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                                    Payment History
                                </h3>
                                <div className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/10">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-surface-container/50">
                                            <tr>
                                                <th className="py-3 px-4 font-label text-[10px] text-outline uppercase tracking-widest font-medium">Date</th>
                                                <th className="py-3 px-4 font-label text-[10px] text-outline uppercase tracking-widest font-medium">Gateway</th>
                                                <th className="py-3 px-4 font-label text-[10px] text-outline uppercase tracking-widest font-medium">Amount</th>
                                                <th className="py-3 px-4 font-label text-[10px] text-outline uppercase tracking-widest font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant/15">
                                            {booking.paymentHistory.map((p, i) => (
                                                <tr key={i} className="hover:bg-surface-container-lowest/50 transition-colors">
                                                    <td className="py-3.5 px-4 font-body text-sm text-on-surface">{p.date}</td>
                                                    <td className="py-3.5 px-4 font-body text-sm text-on-surface font-medium">{p.gateway}</td>
                                                    <td className="py-3.5 px-4 font-body text-sm text-on-surface font-medium">{p.amount}</td>
                                                    <td className="py-3.5 px-4">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${paymentStatusBadge[p.status] || 'text-outline bg-surface-container'}`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-5 bg-surface-bright flex justify-end gap-4 border-t border-outline-variant/15">
                    {booking.status !== 'Cancelled' && (
                        <button
                            className="px-7 py-2.5 rounded-full border border-error text-error font-body text-sm font-semibold hover:bg-error-container/20 transition-colors"
                            type="button"
                        >
                            Cancel Booking
                        </button>
                    )}
                    {booking.status === 'Pending' && (
                        <button
                            className="px-7 py-2.5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-body text-sm font-semibold shadow-[0_8px_16px_-4px_rgba(0,86,179,0.3)] hover:shadow-[0_12px_24px_-4px_rgba(0,86,179,0.4)] hover:-translate-y-0.5 transition-all"
                            type="button"
                        >
                            Confirm Booking
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function Pulse({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export function BookingDetailSkeleton() {
    return (
        <div className="bg-surface font-body antialiased min-h-screen flex flex-col" aria-busy="true" aria-label="Đang tải chi tiết đặt tour">
            <Header />
            <main className="pt-32 pb-20 flex-grow max-w-5xl mx-auto w-full px-6">
                {/* Back button */}
                <Pulse className="mb-8 h-8 w-36" />

                <div className="rounded-[2rem] border border-slate-100 bg-white shadow-xl">
                    {/* Hero skeleton */}
                    <div className="animate-pulse rounded-t-[2rem] bg-slate-200 min-h-60 sm:min-h-72 lg:min-h-80" />

                    <div className="space-y-10 p-6 sm:p-8 md:space-y-12 md:p-12">
                        {/* Essential summary — 4 info cards */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <Pulse className="h-20 rounded-2xl" />
                            <Pulse className="h-20 rounded-2xl" />
                            <Pulse className="h-20 rounded-2xl" />
                            <Pulse className="h-20 rounded-2xl" />
                        </div>

                        {/* Departure guide */}
                        <div className="space-y-3">
                            <Pulse className="h-5 w-40" />
                            <Pulse className="h-28 rounded-2xl" />
                        </div>

                        {/* Passenger details */}
                        <div className="space-y-3">
                            <Pulse className="h-5 w-40" />
                            <Pulse className="h-20 rounded-2xl" />
                        </div>

                        {/* Bottom grid: trip details + payment panel */}
                        <div className="grid items-start gap-10 lg:grid-cols-[3fr_2fr] lg:gap-12">
                            {/* Trip details */}
                            <div className="space-y-4">
                                <Pulse className="h-5 w-32" />
                                <Pulse className="h-14" />
                                <Pulse className="h-14" />
                                <div className="space-y-3 pt-2">
                                    <Pulse className="h-5 w-28" />
                                    <Pulse className="h-32 rounded-2xl" />
                                </div>
                            </div>

                            {/* Payment panel */}
                            <Pulse className="h-96 rounded-2xl" />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

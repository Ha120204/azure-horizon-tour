import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function Pulse({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

function BookingCardSkeleton() {
    return (
        <div className="rounded-2xl border border-outline-variant/10 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                    <Pulse className="h-5 w-2/3" />
                    <Pulse className="h-4 w-1/3" />
                </div>
                <Pulse className="h-7 w-24 rounded-full" />
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-outline-variant/10 pt-4">
                <Pulse className="h-6 w-28" />
                <Pulse className="h-9 w-32 rounded-lg" />
            </div>
        </div>
    );
}

export default function MyBookingsLoading() {
    return (
        <div className="bg-slate-50 font-body text-on-surface flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow pt-32 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full" aria-busy="true" aria-label="Đang tải">
                <div className="space-y-3">
                    <Pulse className="h-9 w-56" />
                    <Pulse className="h-5 w-80 max-w-full" />
                </div>

                <div className="mt-10 space-y-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <BookingCardSkeleton key={i} />
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}

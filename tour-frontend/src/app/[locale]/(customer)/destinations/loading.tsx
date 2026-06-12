import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function Pulse({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

function TourCardSkeleton() {
    return (
        <div className="rounded-2xl border border-outline-variant/10 bg-white overflow-hidden shadow-sm">
            <Pulse className="h-52 w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Pulse className="h-5 w-4/5" />
                <Pulse className="h-4 w-3/5" />
                <div className="flex items-center justify-between pt-1">
                    <Pulse className="h-6 w-24" />
                    <Pulse className="h-9 w-28 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

export default function DestinationsLoading() {
    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />

            <main className="pt-28 pb-20 flex-grow" aria-busy="true" aria-label="Đang tải">
                {/* Hero */}
                <section className="px-4 md:px-8 max-w-screen-2xl mx-auto mb-16">
                    <Pulse className="min-h-[360px] rounded-3xl md:min-h-[420px]" />
                </section>

                {/* Content */}
                <div className="px-4 md:px-8 max-w-screen-2xl mx-auto">
                    <div className="flex gap-8">
                        {/* Sidebar */}
                        <aside className="hidden lg:block w-68 flex-shrink-0 space-y-4">
                            <Pulse className="h-8 w-32" />
                            <Pulse className="h-40 rounded-2xl" />
                            <Pulse className="h-32 rounded-2xl" />
                            <Pulse className="h-24 rounded-2xl" />
                            <Pulse className="h-28 rounded-2xl" />
                        </aside>

                        {/* Tour grid */}
                        <div className="flex-1 space-y-6">
                            {/* Results bar */}
                            <div className="flex items-center justify-between">
                                <Pulse className="h-5 w-48" />
                                <Pulse className="h-9 w-36 rounded-lg" />
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 9 }).map((_, i) => (
                                    <TourCardSkeleton key={i} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

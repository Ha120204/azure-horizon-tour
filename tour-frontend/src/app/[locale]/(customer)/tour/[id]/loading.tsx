import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function Pulse({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export default function TourDetailLoading() {
    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" aria-busy="true" aria-label="Đang tải">
                {/* Breadcrumb */}
                <Pulse className="mb-4 h-4 w-64" />

                {/* Gallery */}
                <Pulse className="mb-8 h-[420px] rounded-2xl sm:h-[500px]" />

                {/* Highlights row */}
                <div className="mb-8 flex gap-3">
                    <Pulse className="h-20 w-36 flex-shrink-0 rounded-2xl" />
                    <Pulse className="h-20 w-36 flex-shrink-0 rounded-2xl" />
                    <Pulse className="h-20 w-36 flex-shrink-0 rounded-2xl" />
                    <Pulse className="h-20 w-36 flex-shrink-0 rounded-2xl" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* Left — detail content */}
                    <div className="col-span-1 lg:col-span-8 space-y-10">
                        {/* Tour header */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Pulse className="h-6 w-28 rounded-full" />
                                <Pulse className="h-5 w-20" />
                            </div>
                            <Pulse className="h-12 w-3/4" />
                            <Pulse className="h-10 w-full" />
                            <div className="flex gap-6 py-6 border-y border-outline-variant/20">
                                <Pulse className="h-10 w-32" />
                                <Pulse className="h-10 w-32" />
                                <Pulse className="h-10 w-32" />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-3">
                            <Pulse className="h-5 w-40" />
                            <Pulse className="h-4 w-full" />
                            <Pulse className="h-4 w-5/6" />
                            <Pulse className="h-4 w-4/5" />
                            <Pulse className="h-4 w-full" />
                        </div>

                        {/* Itinerary */}
                        <div className="space-y-3">
                            <Pulse className="h-5 w-48" />
                            <Pulse className="h-20 rounded-2xl" />
                            <Pulse className="h-20 rounded-2xl" />
                            <Pulse className="h-20 rounded-2xl" />
                        </div>

                        {/* Packages */}
                        <div className="space-y-3">
                            <Pulse className="h-5 w-36" />
                            <Pulse className="h-32 rounded-2xl" />
                            <Pulse className="h-32 rounded-2xl" />
                        </div>
                    </div>

                    {/* Right — booking sidebar */}
                    <div className="col-span-1 lg:col-span-4">
                        <Pulse className="h-96 rounded-2xl" />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function Pulse({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export default function ProfileSkeleton({ label }: { label: string }) {
    return (
        <div className="bg-background text-on-background min-h-screen font-body flex flex-col" aria-busy="true" aria-label={label}>
            <Header />
            <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10 w-full flex-grow">
                {/* Profile header */}
                <section className="flex flex-col md:flex-row items-center md:items-end gap-8 bg-surface-container-lowest p-8 rounded-xl ambient-shadow">
                    <div className="animate-pulse rounded-full bg-slate-200 w-32 h-32 md:w-44 md:h-44 flex-shrink-0" />
                    <div className="flex-1 w-full space-y-4 text-center md:text-left">
                        <Pulse className="h-9 w-56 mx-auto md:mx-0" />
                        <Pulse className="h-4 w-40 mx-auto md:mx-0" />
                        <div className="flex justify-center md:justify-start gap-6 pt-2">
                            <Pulse className="h-8 w-24" />
                            <Pulse className="h-8 w-24" />
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Left sidebar */}
                    <div className="lg:col-span-1 space-y-5">
                        <Pulse className="h-40 rounded-xl" />
                        <Pulse className="h-14 rounded-xl" />
                        <Pulse className="h-48 rounded-xl" />
                    </div>

                    {/* Right content */}
                    <div className="lg:col-span-2 space-y-8">
                        <Pulse className="h-12 w-64 rounded-2xl" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Pulse className="h-72 rounded-xl" />
                            <Pulse className="h-72 rounded-xl" />
                            <Pulse className="h-72 rounded-xl" />
                            <Pulse className="h-72 rounded-xl" />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

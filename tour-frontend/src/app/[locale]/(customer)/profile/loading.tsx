import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function Pulse({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export default function ProfileLoading() {
    return (
        <div className="bg-background text-on-background min-h-screen font-body flex flex-col relative">
            <Header />

            <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10 w-full flex-grow" aria-busy="true" aria-label="Đang tải">
                <Pulse className="h-9 w-60" />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Avatar / thông tin nhanh */}
                    <div className="space-y-6">
                        <Pulse className="h-80 rounded-2xl" />
                    </div>

                    {/* Form thông tin cá nhân */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl border border-outline-variant/10 bg-white p-6 space-y-6 shadow-sm">
                            <Pulse className="h-6 w-48" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Pulse className="h-12 rounded-lg" />
                                <Pulse className="h-12 rounded-lg" />
                                <Pulse className="h-12 rounded-lg" />
                                <Pulse className="h-12 rounded-lg" />
                            </div>
                            <Pulse className="h-11 w-40 rounded-lg" />
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

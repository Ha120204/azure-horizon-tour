import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function Pulse({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export default function BookingDetailLoading() {
    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
            <Header />

            <main className="pt-32 pb-20 flex-grow max-w-5xl mx-auto w-full px-6" aria-busy="true" aria-label="Đang tải">
                {/* Breadcrumb + tiêu đề */}
                <Pulse className="mb-4 h-4 w-48" />
                <Pulse className="mb-8 h-9 w-72 max-w-full" />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Chi tiết booking */}
                    <div className="lg:col-span-2 space-y-6">
                        <Pulse className="h-48 rounded-2xl" />
                        <Pulse className="h-64 rounded-2xl" />
                    </div>

                    {/* Tóm tắt / hành động */}
                    <div className="space-y-6">
                        <Pulse className="h-72 rounded-2xl" />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

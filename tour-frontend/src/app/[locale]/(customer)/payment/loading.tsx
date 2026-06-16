import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function Pulse({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export default function PaymentLoading() {
    return (
        <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow pt-28 pb-20 px-4 md:px-8 max-w-screen-xl mx-auto w-full" aria-busy="true" aria-label="Đang tải">
                {/* Step indicator */}
                <div className="mb-10 flex items-center justify-center gap-4">
                    <Pulse className="h-9 w-28 rounded-full" />
                    <Pulse className="h-9 w-28 rounded-full" />
                    <Pulse className="h-9 w-28 rounded-full" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left — QR / hướng dẫn thanh toán */}
                    <div className="col-span-1 lg:col-span-8 space-y-6">
                        <Pulse className="h-[420px] rounded-2xl" />
                    </div>

                    {/* Right — tóm tắt đơn */}
                    <div className="col-span-1 lg:col-span-4">
                        <Pulse className="h-80 rounded-2xl" />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function Pulse({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export default function CheckoutLoading() {
    return (
        <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
            <Header />

            <main className="pt-28 pb-20 px-4 md:px-8 max-w-screen-2xl mx-auto flex-grow w-full" aria-busy="true" aria-label="Đang tải">
                <Pulse className="mb-8 h-9 w-64" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    {/* Left — thông tin đặt tour */}
                    <div className="col-span-1 lg:col-span-8 space-y-6">
                        <Pulse className="h-40 rounded-2xl" />
                        <Pulse className="h-64 rounded-2xl" />
                        <Pulse className="h-48 rounded-2xl" />
                    </div>

                    {/* Right — tóm tắt đơn */}
                    <div className="col-span-1 lg:col-span-4">
                        <Pulse className="h-[460px] rounded-2xl" />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

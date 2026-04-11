'use client';

import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function AboutPage() {
    return (
        <div className="bg-surface text-on-surface font-body antialiased min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .hero-gradient { background: linear-gradient(180deg, rgba(0, 26, 64, 0.4) 0%, rgba(0, 26, 64, 0.7) 100%); }
                .primary-gradient { background: linear-gradient(135deg, #003f87 0%, #0056b3 100%); }
            `}} />

            {/* Gọi Component Header động */}
            <Header />

            <main className="flex-grow pt-[88px]"> {/* pt-[88px] để đẩy nội dung xuống dưới cái Fixed Header */}

                {/* 1. Hero Section */}
                <section className="relative h-[80vh] w-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0">
                        <img
                            alt="Luxury resort overlooking turquoise ocean"
                            className="w-full h-full object-cover"
                            src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=2000"
                        />
                        <div className="absolute inset-0 hero-gradient"></div>
                    </div>

                    <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
                        <span className="inline-block text-white/90 text-sm font-bold tracking-[0.3em] uppercase mb-6 font-label">
                            Our Story
                        </span>
                        <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight font-headline leading-[1.1] mb-8">
                            Elevating the Art of <br className="hidden md:block" /> Modern Travel.
                        </h1>
                        <p className="text-white/80 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
                            We craft bespoke journeys for the discerning wanderer, where every detail is a masterpiece of exclusivity and refinement.
                        </p>
                    </div>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50">
                        <span className="material-symbols-outlined animate-bounce text-3xl">expand_more</span>
                    </div>
                </section>

                {/* 2. The Philosophy Section */}
                <section className="py-24 md:py-32 px-6 bg-surface overflow-hidden">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-20 items-center">

                            {/* Left: Artistic Image with Offset Frame */}
                            <div className="relative group order-2 lg:order-1">
                                <div className="absolute -top-4 -left-4 md:-top-6 md:-left-6 w-full h-full border-2 border-primary/10 rounded-xl -z-10 transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2"></div>
                                <div className="rounded-xl overflow-hidden shadow-2xl">
                                    <img
                                        alt="Luxury travel detail"
                                        className="w-full aspect-[3/4] md:aspect-[4/5] lg:aspect-[3/4] object-cover"
                                        src="https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=1000"
                                    />
                                </div>
                            </div>

                            {/* Right: Content */}
                            <div className="space-y-10 order-1 lg:order-2">
                                <div className="space-y-6">
                                    <h2 className="text-4xl md:text-5xl font-bold font-headline text-on-surface tracking-tight">
                                        Beyond the Horizon
                                    </h2>
                                    <div className="h-1 w-20 primary-gradient rounded-full"></div>
                                    <p className="text-on-surface-variant text-base md:text-lg leading-relaxed font-light">
                                        Travel is more than just reaching a destination; it's the seamless orchestration of moments that redefine your perspective. At Azure Horizon, we curate experiences that bypass the conventional, opening doors to Michelin-star dining in the clouds and private viewings of the world's most guarded treasures.
                                    </p>
                                    <p className="text-on-surface-variant text-base md:text-lg leading-relaxed font-light">
                                        Our philosophy is rooted in the "Digital Concierge" ethos—providing effortless guidance while maintaining the human touch of traditional luxury.
                                    </p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-outline-variant/20">
                                    <div className="space-y-1">
                                        <span className="text-4xl font-extrabold font-headline text-primary tracking-tighter">50+</span>
                                        <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-on-surface-variant font-label">Exclusive Destinations</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-4xl font-extrabold font-headline text-primary tracking-tighter">10k+</span>
                                        <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-on-surface-variant font-label">Curated Journeys</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-4xl font-extrabold font-headline text-primary tracking-tighter">150+</span>
                                        <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-on-surface-variant font-label">Local Specialists</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-4xl font-extrabold font-headline text-primary tracking-tighter">24/7</span>
                                        <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-on-surface-variant font-label">Concierge Access</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Meet the Experts Section */}
                <section className="py-24 md:py-32 px-6 bg-surface-container-low">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-4">
                            <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Meet the Experts</h2>
                            <p className="text-on-surface-variant text-base md:text-lg font-light leading-relaxed">
                                Behind every extraordinary journey is a team of visionary architects dedicated to the pursuit of perfection.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
                            {/* Team Card 1 */}
                            <div className="group">
                                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-6 bg-white shadow-sm transition-all duration-500 group-hover:shadow-[0_8px_32px_rgba(25,28,33,0.04)]">
                                    <img
                                        alt="Julian Vance - Founder & CEO"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800"
                                    />
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Julian Vance</h3>
                                    <p className="text-primary font-semibold text-sm tracking-tight mb-2">Founder & CEO</p>
                                    <p className="text-on-surface-variant text-sm leading-relaxed font-light">
                                        A pioneer in boutique luxury travel with over two decades of experience in the global hospitality sector.
                                    </p>
                                </div>
                            </div>

                            {/* Team Card 2 */}
                            <div className="group">
                                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-6 bg-white shadow-sm transition-all duration-500 group-hover:shadow-[0_8px_32px_rgba(25,28,33,0.04)]">
                                    <img
                                        alt="Elena Sterling - Head of Curation"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800"
                                    />
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Elena Sterling</h3>
                                    <p className="text-primary font-semibold text-sm tracking-tight mb-2">Head of Curation</p>
                                    <p className="text-on-surface-variant text-sm leading-relaxed font-light">
                                        Elena spent ten years as a travel journalist before joining us to define our "Unseen World" collections.
                                    </p>
                                </div>
                            </div>

                            {/* Team Card 3 */}
                            <div className="group">
                                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-6 bg-white shadow-sm transition-all duration-500 group-hover:shadow-[0_8px_32px_rgba(25,28,33,0.04)]">
                                    <img
                                        alt="Marcus Thorne - Concierge Director"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800"
                                    />
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Marcus Thorne</h3>
                                    <p className="text-primary font-semibold text-sm tracking-tight mb-2">Concierge Director</p>
                                    <p className="text-on-surface-variant text-sm leading-relaxed font-light">
                                        Ensuring that every client request, no matter how impossible, becomes a seamless reality.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Call to Action Section */}
                <section className="py-24 px-6 bg-surface">
                    <div className="max-w-5xl mx-auto rounded-3xl primary-gradient py-16 md:py-20 px-6 md:px-10 text-center relative overflow-hidden shadow-2xl">

                        {/* Background Texture/Glow effect */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-white rounded-full blur-[80px] md:blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-white rounded-full blur-[80px] md:blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
                        </div>

                        <div className="relative z-10 space-y-8 md:space-y-10">
                            <h2 className="text-white text-3xl md:text-4xl lg:text-5xl font-extrabold font-headline tracking-tight leading-tight">
                                Ready to rewrite your travel diary?
                            </h2>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6">
                                <Link
                                    href="/destinations"
                                    className="w-full sm:w-auto px-8 md:px-10 py-3.5 md:py-4 bg-white text-primary rounded-full font-headline font-bold text-sm tracking-tight hover:bg-surface-container-low transition-colors shadow-lg active:scale-95 text-center"
                                >
                                    Explore Destinations
                                </Link>
                                <Link
                                    href="/contact"
                                    className="w-full sm:w-auto px-8 md:px-10 py-3.5 md:py-4 border-2 border-white text-white rounded-full font-headline font-bold text-sm tracking-tight hover:bg-white/10 transition-colors active:scale-95 text-center"
                                >
                                    Contact Concierge
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Gọi Component Footer động */}
            <Footer />
        </div>
    );
}
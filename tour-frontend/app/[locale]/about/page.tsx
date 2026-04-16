'use client';

import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useLocale } from '@/app/context/LocaleContext';

export default function AboutPage() {
    const { t } = useLocale();

    return (
        <div className="bg-surface text-on-surface font-body antialiased min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .hero-gradient { background: linear-gradient(180deg, rgba(0, 26, 64, 0.4) 0%, rgba(0, 26, 64, 0.7) 100%); }
                .primary-gradient { background: linear-gradient(135deg, #003f87 0%, #0056b3 100%); }
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-scroll {
                    animation: scroll 30s linear infinite;
                    width: max-content;
                }
                .partner-logo {
                    filter: grayscale(100%) opacity(50%);
                    transition: filter 0.3s ease;
                    margin: 0 3rem;
                    cursor: default;
                }
                .partner-logo:hover {
                    filter: grayscale(0%) opacity(100%);
                }
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
                            {t('about.badge')}
                        </span>
                        <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight font-headline leading-[1.1] mb-8">
                            {t('about.heroTitle')}
                        </h1>
                        <p className="text-white/80 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
                            {t('about.heroSubtitle')}
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
                                        {t('about.philosophyTitle')}
                                    </h2>
                                    <div className="h-1 w-20 primary-gradient rounded-full"></div>
                                    <p className="text-on-surface-variant text-base md:text-lg leading-relaxed font-light">
                                        {t('about.philosophyDesc1')}
                                    </p>
                                    <p className="text-on-surface-variant text-base md:text-lg leading-relaxed font-light">
                                        {t('about.philosophyDesc2')}
                                    </p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-outline-variant/20">
                                    <div className="space-y-1">
                                        <span className="text-4xl font-extrabold font-headline text-primary tracking-tighter">50+</span>
                                        <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-on-surface-variant font-label">{t('about.statDest')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-4xl font-extrabold font-headline text-primary tracking-tighter">10k+</span>
                                        <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-on-surface-variant font-label">{t('about.statJourneys')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-4xl font-extrabold font-headline text-primary tracking-tighter">150+</span>
                                        <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-on-surface-variant font-label">{t('about.statSpecialists')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-4xl font-extrabold font-headline text-primary tracking-tighter">24/7</span>
                                        <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-on-surface-variant font-label">{t('about.statConcierge')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2.5 Why Choose Us Section */}
                <section className="py-24 md:py-32 px-6 bg-surface">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                            <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">{t('about.whyChooseUsTitle')}</h2>
                            <p className="text-on-surface-variant text-base md:text-lg font-light leading-relaxed">
                                {t('about.whyChooseUsSubtitle')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
                            {/* Card 1 */}
                            <div className="bg-surface-container-low p-10 rounded-3xl hover:bg-surface-container hover:shadow-xl transition-all duration-300 md:translate-y-4">
                                <div className="w-16 h-16 rounded-2xl primary-gradient flex items-center justify-center mb-6 shadow-lg">
                                    <span className="material-symbols-outlined text-3xl text-white">verified</span>
                                </div>
                                <h3 className="text-2xl font-bold font-headline text-on-surface mb-4">{t('about.wcu1Title')}</h3>
                                <p className="text-on-surface-variant leading-relaxed font-light">{t('about.wcu1Desc')}</p>
                            </div>
                            {/* Card 2 */}
                            <div className="bg-surface-container-low p-10 rounded-3xl hover:bg-surface-container hover:shadow-xl transition-all duration-300">
                                <div className="w-16 h-16 rounded-2xl primary-gradient flex items-center justify-center mb-6 shadow-lg">
                                    <span className="material-symbols-outlined text-3xl text-white">support_agent</span>
                                </div>
                                <h3 className="text-2xl font-bold font-headline text-on-surface mb-4">{t('about.wcu2Title')}</h3>
                                <p className="text-on-surface-variant leading-relaxed font-light">{t('about.wcu2Desc')}</p>
                            </div>
                            {/* Card 3 */}
                            <div className="bg-surface-container-low p-10 rounded-3xl hover:bg-surface-container hover:shadow-xl transition-all duration-300 md:-translate-y-4">
                                <div className="w-16 h-16 rounded-2xl primary-gradient flex items-center justify-center mb-6 shadow-lg">
                                    <span className="material-symbols-outlined text-3xl text-white">explore</span>
                                </div>
                                <h3 className="text-2xl font-bold font-headline text-on-surface mb-4">{t('about.wcu3Title')}</h3>
                                <p className="text-on-surface-variant leading-relaxed font-light">{t('about.wcu3Desc')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Meet the Experts Section */}
                <section className="py-24 md:py-32 px-6 bg-surface-container-low">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-4">
                            <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">{t('about.teamTitle')}</h2>
                            <p className="text-on-surface-variant text-base md:text-lg font-light leading-relaxed">
                                {t('about.teamSubtitle')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
                            {/* Team Card 1 */}
                            <div className="group">
                                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-6 bg-white shadow-sm transition-all duration-500 group-hover:shadow-[0_8px_32px_rgba(25,28,33,0.04)]">
                                    <img
                                        alt="Julian Vance"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800"
                                    />
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Julian Vance</h3>
                                    <p className="text-primary font-semibold text-sm tracking-tight mb-2">{t('about.julianRole')}</p>
                                    <p className="text-on-surface-variant text-sm leading-relaxed font-light">
                                        {t('about.julian')}
                                    </p>
                                </div>
                            </div>

                            {/* Team Card 2 */}
                            <div className="group">
                                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-6 bg-white shadow-sm transition-all duration-500 group-hover:shadow-[0_8px_32px_rgba(25,28,33,0.04)]">
                                    <img
                                        alt="Elena Sterling"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800"
                                    />
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Elena Sterling</h3>
                                    <p className="text-primary font-semibold text-sm tracking-tight mb-2">{t('about.elenaRole')}</p>
                                    <p className="text-on-surface-variant text-sm leading-relaxed font-light">
                                        {t('about.elena')}
                                    </p>
                                </div>
                            </div>

                            {/* Team Card 3 */}
                            <div className="group">
                                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-6 bg-white shadow-sm transition-all duration-500 group-hover:shadow-[0_8px_32px_rgba(25,28,33,0.04)]">
                                    <img
                                        alt="Marcus Thorne"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800"
                                    />
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Marcus Thorne</h3>
                                    <p className="text-primary font-semibold text-sm tracking-tight mb-2">{t('about.marcusRole')}</p>
                                    <p className="text-on-surface-variant text-sm leading-relaxed font-light">
                                        {t('about.marcus')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3.5 Partners Marquee */}
                <section className="py-20 border-t border-b border-outline-variant/10 bg-surface overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
                        <p className="text-sm font-extrabold tracking-[0.2em] uppercase text-on-surface-variant font-label">{t('about.partnersTitle')}</p>
                    </div>
                    {/* Marquee Container */}
                    <div className="relative w-full overflow-hidden flex items-center">
                        {/* Gradient edges for smooth fade effect */}
                        <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-surface to-transparent z-10"></div>
                        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-surface to-transparent z-10"></div>

                        <div className="animate-scroll flex items-center">
                            {/* Group 1 */}
                            <div className="partner-logo text-2xl md:text-3xl font-bold font-headline flex items-center gap-2"><span className="material-symbols-outlined text-3xl">flight_takeoff</span> IATA</div>
                            <div className="partner-logo text-2xl md:text-3xl font-serif italic flex items-center gap-2"><span className="material-symbols-outlined text-3xl">star</span> Forbes Travel</div>
                            <div className="partner-logo text-2xl md:text-3xl font-extrabold tracking-widest uppercase flex items-center gap-2"><span className="material-symbols-outlined text-3xl">emoji_events</span> TripAdvisor</div>
                            <div className="partner-logo text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><span className="material-symbols-outlined text-3xl">public</span> National Geo</div>
                            <div className="partner-logo text-2xl md:text-3xl font-serif flex items-center gap-2"><span className="material-symbols-outlined text-3xl">diamond</span> Virtuoso</div>
                            <div className="partner-logo text-2xl md:text-3xl font-light uppercase tracking-[0.2em] flex items-center gap-2"><span className="material-symbols-outlined text-3xl">auto_stories</span> Condé Nast</div>

                            {/* Group 2 (Duplicate for seamless loop) */}
                            <div className="partner-logo text-2xl md:text-3xl font-bold font-headline flex items-center gap-2"><span className="material-symbols-outlined text-3xl">flight_takeoff</span> IATA</div>
                            <div className="partner-logo text-2xl md:text-3xl font-serif italic flex items-center gap-2"><span className="material-symbols-outlined text-3xl">star</span> Forbes Travel</div>
                            <div className="partner-logo text-2xl md:text-3xl font-extrabold tracking-widest uppercase flex items-center gap-2"><span className="material-symbols-outlined text-3xl">emoji_events</span> TripAdvisor</div>
                            <div className="partner-logo text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><span className="material-symbols-outlined text-3xl">public</span> National Geo</div>
                            <div className="partner-logo text-2xl md:text-3xl font-serif flex items-center gap-2"><span className="material-symbols-outlined text-3xl">diamond</span> Virtuoso</div>
                            <div className="partner-logo text-2xl md:text-3xl font-light uppercase tracking-[0.2em] flex items-center gap-2"><span className="material-symbols-outlined text-3xl">auto_stories</span> Condé Nast</div>
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
                                {t('about.ctaTitle')}
                            </h2>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6">
                                <Link
                                    href="/destinations"
                                    className="w-full sm:w-auto px-8 md:px-10 py-3.5 md:py-4 bg-white text-primary rounded-full font-headline font-bold text-sm tracking-tight hover:bg-surface-container-low transition-colors shadow-lg active:scale-95 text-center"
                                >
                                    {t('about.ctaExplore')}
                                </Link>
                                <Link
                                    href="/contact"
                                    className="w-full sm:w-auto px-8 md:px-10 py-3.5 md:py-4 border-2 border-white text-white rounded-full font-headline font-bold text-sm tracking-tight hover:bg-white/10 transition-colors active:scale-95 text-center"
                                >
                                    {t('about.ctaContact')}
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
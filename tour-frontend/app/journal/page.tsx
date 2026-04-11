import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function JournalPage() {
    return (
        <div className="bg-surface text-on-surface font-body antialiased min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
            <Header />

            {/* Content đẩy xuống dưới Header */}
            <main className="flex-grow pt-32 pb-24">

                {/* 1. Page Intro */}
                <header className="max-w-screen-2xl mx-auto px-6 md:px-12 mb-16 md:mb-20">
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-on-surface mb-6 font-headline">
                        The Journal
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-on-surface-variant max-w-2xl font-light leading-relaxed">
                        Dispatches from the world's most extraordinary destinations. Curated stories for the discerning traveler.
                    </p>
                </header>

                {/* 2. Featured Story (Hero Article) */}
                <section className="max-w-screen-2xl mx-auto px-6 md:px-12 mb-20 md:mb-24">
                    <Link href="#" className="block relative aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] overflow-hidden rounded-2xl group cursor-pointer shadow-xl">
                        <img
                            alt="Amalfi Coast"
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            src="https://images.unsplash.com/photo-1561956021-947f09ae0101?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YW1hbGZpJTIwY29hc3R8ZW58MHx8MHx8fDA%3D"
                        />
                        {/* Lớp phủ Gradient đen để nổi chữ */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-8 md:p-16">
                            <span className="inline-block px-3 py-1.5 bg-white/20 backdrop-blur-md text-white text-[10px] md:text-xs tracking-[0.2em] uppercase font-bold mb-4 md:mb-6 w-fit rounded">
                                CULTURE
                            </span>
                            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold font-headline text-white mb-4 md:mb-6 leading-tight max-w-4xl">
                                The Art of Slow Living in the Amalfi Coast
                            </h2>
                            <p className="text-white/80 text-base md:text-xl max-w-2xl mb-6 md:mb-8 leading-relaxed font-light hidden sm:block">
                                Discover why the timeless rhythm of Southern Italy remains the ultimate blueprint for a life well-lived.
                            </p>
                            <div className="flex items-center gap-2 text-white font-bold text-sm tracking-wide group/link">
                                Read Story
                                <span className="material-symbols-outlined text-sm transition-transform group-hover/link:translate-x-2">arrow_forward</span>
                            </div>
                        </div>
                    </Link>
                </section>

                {/* 3. Category Filters */}
                <nav className="max-w-screen-2xl mx-auto px-6 md:px-12 mb-12 md:mb-16 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-8 md:gap-12 border-b border-outline-variant/20 pb-4 min-w-max">
                        <Link href="#" className="text-primary font-bold text-[11px] md:text-sm tracking-widest uppercase border-b-2 border-primary pb-4 -mb-[18px]">
                            All
                        </Link>
                        <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-[11px] md:text-sm tracking-widest uppercase pb-4">
                            Guides
                        </Link>
                        <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-[11px] md:text-sm tracking-widest uppercase pb-4">
                            Inspiration
                        </Link>
                        <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-[11px] md:text-sm tracking-widest uppercase pb-4">
                            Culture
                        </Link>
                        <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-[11px] md:text-sm tracking-widest uppercase pb-4">
                            Gastronomy
                        </Link>
                    </div>
                </nav>

                {/* 4. Article Grid */}
                <section className="max-w-screen-2xl mx-auto px-6 md:px-12 mb-24 md:mb-32">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-16">

                        {/* Article 1 */}
                        <article className="group cursor-pointer">
                            <div className="aspect-[4/5] overflow-hidden rounded-xl mb-6 shadow-sm">
                                <img
                                    alt="Kyoto Temple"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800"
                                />
                            </div>
                            <span className="text-[10px] tracking-[0.2em] uppercase font-extrabold text-primary mb-3 block">Inspiration</span>
                            <h3 className="text-xl md:text-2xl font-extrabold font-headline leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                Finding Zen: The Silent Temples of Northern Kyoto
                            </h3>
                            <p className="text-on-surface-variant text-sm leading-relaxed mb-5 line-clamp-2 font-light">
                                Beyond the tourist trails lie sanctuaries where silence is the only language spoken. A journey into Japan's spiritual heart.
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest">
                                <span>Oct 24</span>
                                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                                <span>5 min read</span>
                            </div>
                        </article>

                        {/* Article 2 */}
                        <article className="group cursor-pointer">
                            <div className="aspect-[4/5] overflow-hidden rounded-xl mb-6 shadow-sm">
                                <img
                                    alt="Swiss Alps Cabin"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    src="https://images.unsplash.com/photo-1696875584373-eac03d22ddba?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fFN3aXNzJTIwQWxwcyUyMENhYmlufGVufDB8fDB8fHww"
                                />
                            </div>
                            <span className="text-[10px] tracking-[0.2em] uppercase font-extrabold text-primary mb-3 block">Guides</span>
                            <h3 className="text-xl md:text-2xl font-extrabold font-headline leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                Architecture of the Heights: Swiss Alpine Retreats
                            </h3>
                            <p className="text-on-surface-variant text-sm leading-relaxed mb-5 line-clamp-2 font-light">
                                How modern design is redefining the traditional mountain chalet into a masterpiece of glass and cedar.
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest">
                                <span>Oct 21</span>
                                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                                <span>8 min read</span>
                            </div>
                        </article>

                        {/* Article 3 */}
                        <article className="group cursor-pointer">
                            <div className="aspect-[4/5] overflow-hidden rounded-xl mb-6 shadow-sm">
                                <img
                                    alt="African Safari Lodge"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    src="https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80&w=800"
                                />
                            </div>
                            <span className="text-[10px] tracking-[0.2em] uppercase font-extrabold text-primary mb-3 block">Culture</span>
                            <h3 className="text-xl md:text-2xl font-extrabold font-headline leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                Twilight in the Serengeti: A Conservation Story
                            </h3>
                            <p className="text-on-surface-variant text-sm leading-relaxed mb-5 line-clamp-2 font-light">
                                The families working tirelessly to preserve the world's most iconic wildlife corridor for the next generation.
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest">
                                <span>Oct 18</span>
                                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                                <span>12 min read</span>
                            </div>
                        </article>

                    </div>
                </section>

                {/* 5. Newsletter / Subscribe */}
                <section className="max-w-4xl mx-auto px-6">
                    <div className="bg-surface-container-high rounded-3xl p-10 md:p-16 lg:p-24 flex flex-col items-center text-center shadow-inner">
                        <span className="text-[10px] tracking-[0.4em] uppercase font-extrabold text-primary mb-6">
                            Newsletter
                        </span>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tighter text-on-surface mb-6 font-headline">
                            Join our inner circle.
                        </h2>
                        <p className="text-on-surface-variant text-base md:text-lg mb-10 max-w-lg mx-auto font-light">
                            Subscribe to our monthly editorial and receive exclusive dispatches, travel guides, and early access to new journeys.
                        </p>

                        <form className="w-full max-w-md flex flex-col sm:flex-row gap-3">
                            <input
                                type="email"
                                placeholder="Enter your email address"
                                className="flex-1 bg-white border border-outline-variant/30 rounded-full px-6 py-4 text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm font-medium"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-primary text-white px-8 py-4 rounded-full font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95 whitespace-nowrap"
                            >
                                Subscribe
                            </button>
                        </form>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
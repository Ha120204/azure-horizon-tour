'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import HeroSearch from '@/app/components/features/search/HeroSearch';
import { useLocale } from '@/app/context/LocaleContext';
import { getTranslatedTour } from '@/app/lib/mockTranslations';
import { API_BASE_URL } from '@/app/lib/constants';

export default function HomePage() {
  const [tours, setTours] = useState([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const router = useRouter();
  const { t, formatPrice, language } = useLocale();

  // Gọi API lấy danh sách Tour
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/tour`);
        const data = await res.json();
        // The backend findAll returns { data: [...], meta: {...} }
        setTours(data.data || []);
      } catch (error) {
        console.error('Lỗi lấy danh sách tour:', error);
      } finally {
        setIsLoadingTours(false);
      }
    };
    fetchTours();
  }, []);

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <Header />

      {/* ── CINEMATIC VIDEO HERO ── */}
      <section className="relative h-screen min-h-[640px] flex flex-col items-center justify-center overflow-hidden">

        {/* 1. Video Background */}
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ filter: 'brightness(1.05) saturate(1.1)' }}
        >
          <source src="https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4" type="video/mp4" />
        </video>

        {/* 2. Cinematic gradient overlay */}
        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to bottom, rgba(0,31,71,0.55) 0%, rgba(0,63,135,0.20) 45%, rgba(0,46,102,0.65) 100%)' }} />

        {/* 3. Hero Content */}
        <div className="relative z-20 text-center text-white px-6 w-full max-w-5xl mx-auto flex flex-col items-center">

          {/* Premium badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-[0.6875rem] font-bold tracking-[0.12em] uppercase mb-6 text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {t('hero.badge')}
          </span>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-headline font-extrabold leading-[1.05] tracking-tight mb-6 drop-shadow-2xl">
            {t('hero.title1')}&nbsp;<br className="hidden sm:block" />
            <span className="italic" style={{ color: 'rgba(147,197,253,1)' }}>{t('hero.title2')}</span>.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-white/75 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            {t('hero.subtitle')}
          </p>

          {/* Search Bar — white pill floats on dark video */}
          <div className="w-full max-w-4xl mx-auto">
            <HeroSearch />
          </div>
        </div>

        {/* 4. Stats Row — anchored to bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="max-w-4xl mx-auto px-6 pb-8 hidden md:flex items-center justify-center gap-12">
            {[
              { value: '500+', label: t('hero.statTours') },
              { value: '50+', label: t('hero.statDestinations') },
              { value: '10K+', label: t('hero.statTravelers') },
              { value: '4.9★', label: t('hero.statRating') },
            ].map(stat => (
              <div key={stat.label} className="text-center text-white">
                <p className="text-2xl font-extrabold font-headline leading-none drop-shadow">{stat.value}</p>
                <p className="text-xs text-white/60 mt-1 tracking-wide uppercase font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
          {/* Gradient fade into white page content */}
          <div className="h-16 bg-gradient-to-b from-transparent to-white" />
        </div>

        {/* 5. Mobile scroll indicator */}
        <div className="absolute bottom-20 md:hidden left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <span className="material-symbols-outlined text-white/50 text-4xl">expand_more</span>
        </div>
      </section>

      {/* Main Content: Featured Tours */}
      <main className="py-24 px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl font-headline font-bold text-on-surface mb-4">{t('featured.title')}</h2>
              <p className="text-on-surface-variant max-w-md">{t('featured.subtitle')}</p>
            </div>
            <button onClick={() => router.push('/destinations')} className="group hidden md:flex items-center gap-2 text-primary font-headline font-semibold">
              {t('featured.exploreAll')}
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {isLoadingTours ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm animate-pulse">
                  <div className="h-56 bg-slate-200 flex-shrink-0" />
                  <div className="flex flex-col flex-1 p-6 gap-3">
                    <div className="h-4 bg-slate-200 rounded-full w-3/4" />
                    <div className="h-4 bg-slate-200 rounded-full w-1/2" />
                    <div className="h-3 bg-slate-100 rounded-full w-full mt-1" />
                    <div className="h-3 bg-slate-100 rounded-full w-5/6" />
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                      <div className="h-6 bg-slate-200 rounded-full w-24" />
                      <div className="h-8 bg-slate-100 rounded-full w-28" />
                    </div>
                  </div>
                </div>
              ))
            ) : tours.length > 0 ? tours.slice(0, 6).map((originalTour: any) => {

              const tour = getTranslatedTour(originalTour, language);
              return (
                <div
                  key={tour.id}
                  className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(`/tour/${tour.id}`)}
                >
                  {/* ── Image ── */}
                  <div className="relative h-56 flex-shrink-0 overflow-hidden bg-slate-100">
                    <img
                      alt={tour.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={tour.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'}
                    />
                    {/* Duration badge */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[0.65rem] font-label font-bold text-primary shadow-sm tracking-wide">
                      {tour.duration} {t('featured.days')}
                    </div>
                    {/* Rating badge — only shown when there are actual reviews */}
                    {tour.averageRating > 0 && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        <span className="material-symbols-outlined text-amber-400 text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-white text-[0.65rem] font-bold">{tour.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* ── Body ── */}
                  <div className="flex flex-col flex-1 p-6">
                    {/* Title — always exactly 2 lines tall */}
                    <h3
                      className="text-base font-headline font-bold text-on-surface leading-snug mb-2"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.75rem' }}
                      title={tour.name}
                    >
                      {tour.name}
                    </h3>

                    {/* Description — fills space, keeps footer pinned */}
                    <p className="text-on-surface-variant text-sm leading-relaxed flex-1 mb-5"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {tour.description}
                    </p>

                    {/* ── Footer (always at bottom) ── */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <span className="text-[0.6rem] font-label font-semibold text-slate-400 uppercase tracking-widest block mb-0.5">{t('featured.perPerson')}</span>
                        <span className="text-xl font-headline font-extrabold text-on-surface">
                          {formatPrice(
                            tour.departures && tour.departures.length > 0
                              ? Math.min(...tour.departures.map((d: any) => d.price ?? tour.price))
                              : tour.price
                          )}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary/8 text-primary font-headline font-bold text-xs group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                        {t('featured.viewDetails')}
                        <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="col-span-full text-center py-10 text-on-surface-variant">
                {t('featured.loading')}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Editorial Section (Our Philosophy) */}
      <section className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-2xl overflow-hidden aspect-[3/4] translate-y-12 shadow-lg">
                  <img alt="Swiss Alps Cabin" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1694980252071-5e1bd1f37448?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8U3dpc3MlMjBBbHBzJTIwQ2FiaW58ZW58MHx8MHx8fDA%3D" />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-[3/4] shadow-lg">
                  <img alt="Bali Infinity Pool" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <span className="text-[0.6875rem] font-label font-bold text-primary uppercase tracking-widest mb-6 block">{t('philosophy.badge')}</span>
              <h2 className="text-5xl font-headline font-extrabold text-on-surface mb-8 leading-tight">{t('philosophy.title')}</h2>
              <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
                {t('philosophy.desc')}
              </p>
              <ul className="space-y-6 mb-12">
                <li className="flex gap-4">
                  <span className="material-symbols-outlined text-tertiary">check_circle</span>
                  <div>
                    <span className="block font-headline font-bold text-on-surface">{t('philosophy.accommodation')}</span>
                    <p className="text-sm text-on-surface-variant">{t('philosophy.accommodationDesc')}</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="material-symbols-outlined text-tertiary">check_circle</span>
                  <div>
                    <span className="block font-headline font-bold text-on-surface">{t('philosophy.concierge')}</span>
                    <p className="text-sm text-on-surface-variant">{t('philosophy.conciergeDesc')}</p>
                  </div>
                </li>
              </ul>
              <button onClick={() => router.push('/about')} className="px-8 py-4 rounded-full border-2 border-primary text-primary font-headline font-bold hover:bg-primary hover:text-white transition-all">
                {t('philosophy.cta')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
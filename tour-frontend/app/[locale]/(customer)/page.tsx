'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import HeroSearch from '@/app/components/features/search/HeroSearch';
import { useLocale } from '@/app/context/LocaleContext';
import { API_BASE_URL } from '@/app/lib/constants';

type TravelScope = 'DOMESTIC' | 'INTERNATIONAL';

interface TourDepartureSummary {
  price?: number | null;
}

interface TourSummary {
  id: number | string;
  name: string;
  description: string;
  imageUrl?: string | null;
  duration: number | string;
  price: number;
  averageRating?: number;
  departures?: TourDepartureSummary[];
}

const VIDEO_TRANSITION_MS = 900;

const PHILOSOPHY_IMAGES = {
  primary: {
    src: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80',
    alt: 'Balinese temple reflected on a quiet lake',
  },
  secondary: {
    src: 'https://images.unsplash.com/photo-1694980252071-5e1bd1f37448?w=600&auto=format&fit=crop&q=70',
    alt: 'Alpine cabin in the Swiss mountains',
  },
};

const HERO_VIDEOS: Record<TravelScope, { publicId: string; label: string }> = {
  DOMESTIC: {
    publicId: 'njxnvt756vwk7tp0xz8o',
    label: 'Domestic travel background',
  },
  INTERNATIONAL: {
    publicId: 'bopzrsspd8bkgcrmdihz',
    label: 'International travel background',
  },
};

const getCloudinaryVideoUrl = (publicId: string) =>
  `https://res.cloudinary.com/azurehorizon/video/upload/q_auto:good,w_1920,c_limit/${publicId}.mp4`;

function HeroVideoBackground({ travelScope }: { travelScope: TravelScope }) {
  const activeScopeRef = useRef(travelScope);
  const [videoState, setVideoState] = useState({
    activeScope: travelScope,
    previousScope: null as TravelScope | null,
    showActive: true,
  });

  useEffect(() => {
    if (activeScopeRef.current === travelScope) return;

    const previousScope = activeScopeRef.current;
    activeScopeRef.current = travelScope;

    setVideoState({
      activeScope: travelScope,
      previousScope,
      showActive: false,
    });

    const frameId = window.requestAnimationFrame(() => {
      setVideoState((current) =>
        current.activeScope === travelScope ? { ...current, showActive: true } : current
      );
    });

    const timeoutId = window.setTimeout(() => {
      setVideoState((current) =>
        current.activeScope === travelScope ? { ...current, previousScope: null } : current
      );
    }, VIDEO_TRANSITION_MS);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [travelScope]);

  const activeVideo = HERO_VIDEOS[videoState.activeScope];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
      {videoState.previousScope && (
        <video
          key={videoState.previousScope}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover opacity-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:scale-100 motion-reduce:transition-none"
          style={{ filter: 'brightness(1.05) saturate(1.1)' }}
        >
          <source src={getCloudinaryVideoUrl(HERO_VIDEOS[videoState.previousScope].publicId)} type="video/mp4" />
        </video>
      )}

      <video
        key={videoState.activeScope}
        autoPlay
        loop
        muted
        playsInline
        aria-label={activeVideo.label}
        className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:scale-100 motion-reduce:transition-none ${
          videoState.showActive ? 'scale-100 opacity-100' : 'scale-[1.015] opacity-0'
        }`}
        style={{ filter: 'brightness(1.05) saturate(1.1)' }}
      >
        <source src={getCloudinaryVideoUrl(activeVideo.publicId)} type="video/mp4" />
      </video>
    </div>
  );
}

export default function HomePage() {
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [travelScope, setTravelScope] = useState<TravelScope>('DOMESTIC');
  const router = useRouter();
  const { t, formatPrice, language } = useLocale();
  const philosophyHighlights = [
    {
      icon: 'hotel_class',
      title: t('philosophy.accommodation'),
      desc: t('philosophy.accommodationDesc'),
    },
    {
      icon: 'explore',
      title: t('philosophy.concierge'),
      desc: t('philosophy.conciergeDesc'),
    },
    {
      icon: 'route',
      title: t('philosophy.tailored'),
      desc: t('philosophy.tailoredDesc'),
    },
  ];

  // Gọi API lấy danh sách Tour
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/tour?locale=${language}`);
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
  }, [language]);

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <Header />

      {/* ── CINEMATIC VIDEO HERO ── */}
      <section className="relative z-20 h-screen min-h-[640px] flex flex-col items-center justify-center overflow-visible">

        {/* 1. Video Background */}
        <HeroVideoBackground travelScope={travelScope} />

        {/* 2. Cinematic gradient overlay */}
        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to bottom, rgba(0,31,71,0.55) 0%, rgba(0,63,135,0.20) 45%, rgba(0,46,102,0.65) 100%)' }} />

        {/* 3. Hero Content */}
        <div className="relative z-30 text-center text-white px-6 w-full max-w-5xl mx-auto flex flex-col items-center">

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
            <HeroSearch travelScope={travelScope} onTravelScopeChange={setTravelScope} />
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
      <main className="relative z-0 py-24 px-8 bg-surface">
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
            ) : tours.length > 0 ? tours.slice(0, 6).map((tour) => {
              return (
                <div
                  key={tour.id}
                  className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(`/tour/${tour.id}`)}
                >
                  {/* ── Image ── */}
                  <div className="relative h-56 flex-shrink-0 overflow-hidden bg-slate-100">
                    <Image
                      alt={tour.name}
                      src={tour.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Duration badge */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[0.65rem] font-label font-bold text-primary shadow-sm tracking-wide">
                      {tour.duration} {t('featured.days')}
                    </div>
                    {/* Rating badge — only shown when there are actual reviews */}
                    {(tour.averageRating ?? 0) > 0 && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        <span className="material-symbols-outlined text-amber-400 text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-white text-[0.65rem] font-bold">{(tour.averageRating ?? 0).toFixed(1)}</span>
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
                              ? Math.min(...tour.departures.map((d) => d.price ?? tour.price))
                              : tour.price
                          )}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-primary flex items-center justify-center transition-colors duration-300">
                        <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors">arrow_forward</span>
                      </div>
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
      <section className="overflow-hidden bg-surface-container-low px-6 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:gap-20">
          <div className="relative min-h-[560px] sm:min-h-[520px]">
            <div className="absolute left-0 top-0 h-[78%] w-[82%] overflow-hidden rounded-[2rem] bg-slate-200 shadow-2xl shadow-slate-900/10">
              <Image
                src={PHILOSOPHY_IMAGES.primary.src}
                alt={PHILOSOPHY_IMAGES.primary.alt}
                fill
                sizes="(min-width: 1024px) 52vw, 92vw"
                className="object-cover"
              />
            </div>

            <div className="absolute bottom-0 right-0 w-[48%] overflow-hidden rounded-3xl border-[10px] border-surface-container-low bg-white shadow-2xl shadow-slate-900/15 sm:w-[54%]">
              <div className="relative aspect-[4/5]">
                <Image
                  src={PHILOSOPHY_IMAGES.secondary.src}
                  alt={PHILOSOPHY_IMAGES.secondary.alt}
                  fill
                  sizes="(min-width: 1024px) 28vw, 52vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="absolute bottom-8 left-4 right-24 rounded-2xl bg-white/95 p-5 shadow-xl shadow-slate-900/10 backdrop-blur sm:bottom-10 sm:left-6 sm:right-auto sm:max-w-[18rem]">
              <p className="text-[0.68rem] font-label font-bold uppercase tracking-[0.18em] text-primary">{t('philosophy.noteLabel')}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-on-surface">{t('philosophy.note')}</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <span className="mb-5 block text-[0.6875rem] font-label font-bold uppercase tracking-[0.18em] text-primary">
              {t('philosophy.badge')}
            </span>
            <h2 className="max-w-xl text-4xl font-headline font-extrabold leading-[1.05] text-on-surface text-balance md:text-6xl">
              {t('philosophy.title')}
            </h2>
            <p className="mt-7 max-w-xl text-base leading-8 text-on-surface-variant md:text-lg">
              {t('philosophy.desc')}
            </p>

            <ul className="mt-10 grid gap-4">
              {philosophyHighlights.map((item) => (
                <li key={item.title} className="group flex gap-4 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-900/5 transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-slate-900/10">
                  <span className="material-symbols-outlined mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[20px] text-primary" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <span className="block font-headline text-base font-bold text-on-surface">{item.title}</span>
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 font-headline text-sm font-bold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
              >
                {t('philosophy.cta')}
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link
                href="/destinations"
                className="inline-flex items-center justify-center rounded-full border border-primary/25 px-7 py-4 font-headline text-sm font-bold text-primary transition-[background-color,border-color,color] duration-200 hover:border-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
              >
                {t('philosophy.secondaryCta')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

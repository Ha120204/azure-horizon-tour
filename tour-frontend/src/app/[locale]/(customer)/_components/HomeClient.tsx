'use client';

/**
 * HomeClient — Client shell cho trang chủ.
 *
 * Nhận `initialTours` đã được fetch từ Server Component (page.tsx) làm prop.
 * Tất cả interactive logic nằm ở đây:
 *   - Video hero background + travelScope toggle
 *   - Payment error toast (đọc ?error= từ URL)
 *   - Router navigation khi click tour card
 *   - Locale formatting (price, i18n)
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSearch from '@/components/search/HeroSearch';
import ErrorToast from '@/components/checkout/ErrorToast';
import TourRatingBadge from '@/components/tour/TourRatingBadge';
import { useLocale } from '@/context/LocaleContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type TravelScope = 'DOMESTIC' | 'INTERNATIONAL';

export interface TourDepartureSummary {
  price?: number | null;
}

export interface TourSummary {
  id: number | string;
  name: string;
  description: string;
  imageUrl?: string | null;
  duration: number | string;
  price: number;
  averageRating?: number | null;
  reviewCount?: number | null;
  _count?: {
    reviews?: number | null;
  };
  departures?: TourDepartureSummary[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const PAYMENT_ERROR_CODES = new Set(['payment_cancelled', 'payment_failed']);

const isPaymentErrorCode = (value: string | null) => value !== null && PAYMENT_ERROR_CODES.has(value);

// ─── Sub-components ───────────────────────────────────────────────────────────

// ── Count-up hook ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, decimals = 0, started = false) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [started, target, duration, decimals]);

  return count;
}

// ── Single animated stat ───────────────────────────────────────────────────
interface StatItemProps {
  numericValue: number;
  suffix: string;
  label: string;
  isRating?: boolean;
  started: boolean;
  decimals?: number;
}
function StatItem({ numericValue, suffix, label, isRating = false, started, decimals = 0 }: StatItemProps) {
  const count = useCountUp(numericValue, 1400, decimals, started);
  const displayNum = decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString();

  return (
    <div className="flex flex-col items-center text-center text-white select-none">
      {isRating ? (
        <div className="flex items-center gap-1.5 leading-none">
          <p className="text-3xl font-extrabold font-headline drop-shadow tabular-nums">{displayNum}</p>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-amber-400 text-[13px] leading-none">★★★★★</span>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest leading-none">{suffix}</span>
          </div>
        </div>
      ) : (
        <p className="text-3xl font-extrabold font-headline leading-none drop-shadow tabular-nums">
          {displayNum}{suffix}
        </p>
      )}
      <p className="text-[11px] text-white/55 mt-1.5 tracking-[0.12em] uppercase font-semibold whitespace-nowrap">{label}</p>
    </div>
  );
}

// ── Stats Row (triggered once on viewport enter) ───────────────────────────
function StatsRow({ t }: { t: (key: string) => string }) {
  const [started, setStarted] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const STATS: StatItemProps[] = [
    { numericValue: 500, suffix: '+',  label: t('hero.statTours'),        started, decimals: 0 },
    { numericValue: 50,  suffix: '+',  label: t('hero.statDestinations'), started, decimals: 0 },
    { numericValue: 10,  suffix: 'K+', label: t('hero.statTravelers'),    started, decimals: 0 },
    { numericValue: 4.9, suffix: '/5', label: t('hero.statRating'),       started, decimals: 1, isRating: true },
  ];

  return (
    <div ref={rowRef} className="max-w-3xl mx-auto px-6 pb-8 hidden md:flex items-center justify-center">
      {STATS.map((stat, i) => (
        <div key={stat.label} className={`home-stat-enter home-stat-d${i} flex items-center`}>
          <StatItem {...stat} />
          {i < STATS.length - 1 && (
            <div className="mx-8 h-8 w-px bg-white/20 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

function useRevealOnScroll<T extends HTMLElement>() {
  const [isVisible, setIsVisible] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  const ref = useRef<T>(null);

  useEffect(() => {
    if (isVisible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.22, rootMargin: '0px 0px -12% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible]);

  return [ref, isVisible] as const;
}

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

    setVideoState({ activeScope: travelScope, previousScope, showActive: false });

    const frameId = window.requestAnimationFrame(() => {
      setVideoState((cur) =>
        cur.activeScope === travelScope ? { ...cur, showActive: true } : cur
      );
    });
    const timeoutId = window.setTimeout(() => {
      setVideoState((cur) =>
        cur.activeScope === travelScope ? { ...cur, previousScope: null } : cur
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
          autoPlay loop muted playsInline aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover opacity-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:scale-100 motion-reduce:transition-none"
          style={{ filter: 'brightness(1.05) saturate(1.1)' }}
        >
          <source src={getCloudinaryVideoUrl(HERO_VIDEOS[videoState.previousScope].publicId)} type="video/mp4" />
        </video>
      )}
      <video
        key={videoState.activeScope}
        autoPlay loop muted playsInline aria-label={activeVideo.label}
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

// ─── Main Component ───────────────────────────────────────────────────────────

interface HomeClientProps {
  /** Tours đã được fetch server-side — không cần loading state */
  initialTours: TourSummary[];
  /** True khi fetch tour thất bại (phân biệt với danh sách rỗng) */
  loadError?: boolean;
}

export default function HomeClient({ initialTours, loadError = false }: HomeClientProps) {
  const [travelScope, setTravelScope] = useState<TravelScope>('DOMESTIC');
  const searchParams = useSearchParams();
  const { t, formatPrice } = useLocale();
  const hasPaymentError = isPaymentErrorCode(searchParams.get('error'));
  const [errorMsg, setErrorMsg] = useState(() =>
    hasPaymentError
      ? t('checkout.errors.paymentCancelledHome') ||
        'Thanh toán không thành công. Đơn đặt tour của bạn đã được lưu ở trạng thái "Chờ thanh toán". Bạn có thể vào "Lịch sử đặt tour" để tiến hành thanh toán lại.'
      : ''
  );
  const [toastTitle] = useState(() =>
    hasPaymentError ? t('checkout.paymentStatus') || 'Trạng thái thanh toán' : ''
  );

  // Bắt lỗi thanh toán từ URL param ?error=payment_cancelled
  useEffect(() => {
    if (isPaymentErrorCode(searchParams.get('error'))) {
      // Dọn URL, xóa ?error= mà không reload trang
      const params = new URLSearchParams(searchParams.toString());
      params.delete('error');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, [searchParams]);

  const philosophyHighlights = [
    { icon: 'hotel_class', title: t('philosophy.accommodation'), desc: t('philosophy.accommodationDesc') },
    { icon: 'explore',     title: t('philosophy.concierge'),     desc: t('philosophy.conciergeDesc') },
    { icon: 'route',       title: t('philosophy.tailored'),      desc: t('philosophy.tailoredDesc') },
  ];
  const [philosophyRef, philosophyVisible] = useRevealOnScroll<HTMLDivElement>();
  const philosophyRevealClass = philosophyVisible ? 'is-visible' : '';

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col">
      <Header />

      {/* ── CINEMATIC VIDEO HERO ── */}
      <section className="relative z-20 min-h-screen flex flex-col items-center justify-center overflow-visible pt-28 pb-16 lg:pt-0 lg:pb-0">
        <HeroVideoBackground travelScope={travelScope} />

        {/* Cinematic gradient overlay */}
        <div
          className="absolute inset-0 z-10"
          style={{ background: 'linear-gradient(to bottom, rgba(0,31,71,0.55) 0%, rgba(0,63,135,0.20) 45%, rgba(0,46,102,0.65) 100%)' }}
        />

        {/* Hero Content */}
        <div className="relative z-30 text-center text-white px-6 w-full max-w-6xl mx-auto flex flex-col items-center">
          <span className="home-hero-enter home-hero-d1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-[0.6875rem] font-bold tracking-[0.12em] uppercase mb-6 text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('hero.badge')}
          </span>

          <h1 className="home-hero-enter home-hero-d2 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-headline font-extrabold leading-[1.05] tracking-tight mb-6 drop-shadow-2xl">
            {t('hero.title1')}&nbsp;<br className="hidden sm:block" />
            <span className="italic" style={{ color: 'rgba(147,197,253,1)' }}>{t('hero.title2')}</span>.
          </h1>

          <p className="home-hero-enter home-hero-d3 text-base sm:text-lg md:text-xl text-white/75 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            {t('hero.subtitle')}
          </p>

          <div className="home-hero-search-enter home-hero-d4 w-full max-w-6xl mx-auto">
            <HeroSearch travelScope={travelScope} onTravelScopeChange={setTravelScope} />
          </div>
        </div>

        {/* Stats Row */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <StatsRow t={t} />
          <div className="h-16 bg-gradient-to-b from-transparent to-white" />
        </div>

        {/* Mobile scroll indicator */}
        <div className="absolute bottom-20 md:hidden left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <span className="material-symbols-outlined text-white/50 text-4xl">expand_more</span>
        </div>
      </section>

      {/* ── FEATURED TOURS ── */}
      <main className="relative z-0 py-24 px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl font-headline font-bold text-on-surface mb-4">{t('featured.title')}</h2>
              <p className="text-on-surface-variant max-w-md">{t('featured.subtitle')}</p>
            </div>
            <Link
              href="/destinations"
              className="group hidden md:flex items-center gap-2 rounded-full px-3 py-2 text-primary font-headline font-semibold transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary/5 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none"
            >
              {t('featured.exploreAll')}
              <span className="material-symbols-outlined text-sm transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none">arrow_forward</span>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {initialTours.length > 0 ? (
              initialTours.slice(0, 6).map((tour) => (
                <Link
                  key={tour.id}
                  href={`/tour/${tour.id}`}
                  className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="relative h-56 flex-shrink-0 overflow-hidden bg-slate-100">
                    <Image
                      alt={tour.name}
                      src={tour.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[0.65rem] font-label font-bold text-primary shadow-sm tracking-wide">
                      {tour.duration}
                    </div>
                    <TourRatingBadge
                      averageRating={tour.averageRating}
                      reviewCount={tour.reviewCount}
                      _count={tour._count}
                      notRatedLabel={t('reviews.notRated')}
                      reviewLabel={t('tour_detail.reviewSingular')}
                      reviewsLabel={t('tour_detail.reviewsLabel')}
                      className="absolute top-3 right-3"
                    />
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-6">
                    <h3
                      className="text-base font-headline font-bold text-on-surface leading-snug mb-2"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.75rem' }}
                      title={tour.name}
                    >
                      {tour.name}
                    </h3>

                    <p
                      className="text-on-surface-variant text-sm leading-relaxed flex-1 mb-5"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {tour.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <span className="text-[0.6rem] font-label font-semibold text-slate-400 uppercase tracking-widest block mb-0.5">
                          {t('featured.perPerson')}
                        </span>
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
                </Link>
              ))
            ) : loadError ? (
              <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl text-error/70" aria-hidden="true">cloud_off</span>
                <p className="max-w-sm text-sm leading-relaxed">{t('featured.error')}</p>
              </div>
            ) : (
              <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl text-slate-300" aria-hidden="true">luggage</span>
                <p className="max-w-sm text-sm leading-relaxed">{t('featured.empty')}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── OUR PHILOSOPHY ── */}
      <section className="overflow-hidden bg-surface-container-low px-6 py-20 md:px-8 md:py-28">
        <div
          ref={philosophyRef}
          className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:gap-20"
        >
          <div className="relative min-h-[560px] sm:min-h-[520px]">
            <div className={`home-philosophy-reveal home-philosophy-from-left home-philosophy-d1 ${philosophyRevealClass} absolute left-0 top-0 h-[78%] w-[82%] overflow-hidden rounded-[2rem] bg-slate-200 shadow-2xl shadow-slate-900/10`}>
              <Image src={PHILOSOPHY_IMAGES.primary.src} alt={PHILOSOPHY_IMAGES.primary.alt} fill sizes="(min-width: 1024px) 52vw, 92vw" className="object-cover" />
            </div>
            <div className={`home-philosophy-reveal home-philosophy-from-right home-philosophy-d2 ${philosophyRevealClass} absolute bottom-0 right-0 w-[48%] overflow-hidden rounded-3xl border-[10px] border-surface-container-low bg-white shadow-2xl shadow-slate-900/15 sm:w-[54%]`}>
              <div className="relative aspect-[4/5]">
                <Image src={PHILOSOPHY_IMAGES.secondary.src} alt={PHILOSOPHY_IMAGES.secondary.alt} fill sizes="(min-width: 1024px) 28vw, 52vw" className="object-cover" />
              </div>
            </div>
            <div className={`home-philosophy-reveal home-philosophy-float home-philosophy-d3 ${philosophyRevealClass} absolute bottom-8 left-4 right-24 rounded-2xl bg-white/95 p-5 shadow-xl shadow-slate-900/10 backdrop-blur sm:bottom-10 sm:left-6 sm:right-auto sm:max-w-[18rem]`}>
              <p className="text-[0.68rem] font-label font-bold uppercase tracking-[0.18em] text-primary">{t('philosophy.noteLabel')}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-on-surface">{t('philosophy.note')}</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <span className={`home-philosophy-reveal home-philosophy-d1 ${philosophyRevealClass} mb-5 block text-[0.6875rem] font-label font-bold uppercase tracking-[0.18em] text-primary`}>
              {t('philosophy.badge')}
            </span>
            <h2 className={`home-philosophy-reveal home-philosophy-d2 ${philosophyRevealClass} max-w-xl text-4xl font-headline font-extrabold leading-[1.05] text-on-surface text-balance md:text-6xl`}>
              {t('philosophy.title')}
            </h2>
            <p className={`home-philosophy-reveal home-philosophy-d3 ${philosophyRevealClass} mt-7 max-w-xl text-base leading-8 text-on-surface-variant md:text-lg`}>
              {t('philosophy.desc')}
            </p>

            <ul className="mt-10 grid gap-4">
              {philosophyHighlights.map((item, index) => (
                <li key={item.title} className={`home-philosophy-reveal home-philosophy-hover-lift home-philosophy-d${index + 4} ${philosophyRevealClass} group flex gap-4 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-900/5 transition-[background-color,transform,box-shadow] duration-200 hover:bg-white hover:shadow-lg hover:shadow-slate-900/10`}>
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

            <div className={`home-philosophy-reveal home-philosophy-d7 ${philosophyRevealClass} mt-10 flex flex-col gap-3 sm:flex-row`}>
              <Link
                href="/about"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 font-headline text-sm font-bold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low motion-reduce:transform-none"
              >
                {t('philosophy.cta')}
                <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link
                href="/destinations"
                className="inline-flex items-center justify-center rounded-full border border-primary/25 px-7 py-4 font-headline text-sm font-bold text-primary transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-primary hover:bg-white hover:shadow-lg hover:shadow-primary/10 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low motion-reduce:transform-none"
              >
                {t('philosophy.secondaryCta')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Payment Error Toast */}
      {errorMsg && (
        <ErrorToast
          message={errorMsg}
          title={toastTitle}
          onClose={() => setErrorMsg('')}
          t={t}
        />
      )}
    </div>
  );
}

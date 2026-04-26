'use client';

import { useEffect, useRef } from 'react';

interface HeroBannerProps {
    timeLeft: { days: number; hours: number; minutes: number; seconds: number };
    isMounted: boolean;
    t: (key: string) => string;
}

const VIDEO_URL =
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4';

const FADE_DURATION = 0.5; // seconds

export default function HeroBanner({ timeLeft, isMounted, t }: HeroBannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const rafRef = useRef<number>(0);

    // ── Smooth fade loop via requestAnimationFrame ──────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const tick = () => {
            if (!video.duration || isNaN(video.duration)) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            const t = video.currentTime;
            const d = video.duration;

            if (t < FADE_DURATION) {
                // Fade in at start
                video.style.opacity = String(t / FADE_DURATION);
            } else if (t > d - FADE_DURATION) {
                // Fade out near end
                video.style.opacity = String((d - t) / FADE_DURATION);
            } else {
                video.style.opacity = '1';
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        const handleEnded = () => {
            video.style.opacity = '0';
            setTimeout(() => {
                video.currentTime = 0;
                video.play().catch(() => { });
            }, 100);
        };

        video.addEventListener('ended', handleEnded);
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafRef.current);
            video.removeEventListener('ended', handleEnded);
        };
    }, []);

    return (
        <section
            className="relative w-full overflow-hidden"
            style={{ height: '100vh', minHeight: '680px' }}
        >
            <style>{`
                @keyframes fade-rise {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .anim-fade-rise        { animation: fade-rise 0.9s cubic-bezier(0.16,1,0.3,1) both; }
                .anim-fade-rise-d1     { animation: fade-rise 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
                .anim-fade-rise-d2     { animation: fade-rise 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
                .anim-fade-rise-d3     { animation: fade-rise 0.9s cubic-bezier(0.16,1,0.3,1) 0.6s both; }
                .countdown-digit       { font-variant-numeric: tabular-nums; }
            `}</style>

            {/* ── Video layer ── */}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{ opacity: 0, transition: 'none', filter: 'brightness(1.05) saturate(1.1)' }}
            >
                <source src={VIDEO_URL} type="video/mp4" />
            </video>

            {/* ── Gradient overlays ── */}
            {/* Top vignette (brand navy) */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                    background:
                        'linear-gradient(to bottom, rgba(0,31,63,0.72) 0%, rgba(0,31,63,0.25) 40%, rgba(0,31,63,0.10) 60%, rgba(0,31,63,0.55) 85%, rgba(0,20,50,0.90) 100%)',
                }}
            />
            {/* Subtle left-side depth */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{ background: 'linear-gradient(to right, rgba(0,20,50,0.30) 0%, transparent 50%)' }}
            />

            {/* ── Hero content ── */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">

                {/* Badge */}
                <div className="anim-fade-rise mb-6">
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-white text-[0.7rem] font-bold uppercase tracking-[0.18em]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        {t('limitedTime')}
                    </span>
                </div>

                {/* Headline */}
                <h1
                    className="anim-fade-rise-d1 font-headline font-extrabold text-white tracking-tight mb-6"
                    style={{
                        fontSize: 'clamp(2.4rem, 7vw, 5.5rem)',
                        lineHeight: 1.0,
                        letterSpacing: '-1.5px',
                        maxWidth: '900px',
                    }}
                >
                    {t('title')}
                    <span
                        style={{
                            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 60%, #fde68a 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        {t('titleHighlight')}
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="anim-fade-rise-d2 text-white/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-10">
                    {t('subtitle')}
                </p>

                {/* ── Live Countdown ── */}
                {isMounted && (
                    <div className="anim-fade-rise-d2 mb-10">
                        <p className="text-white/50 text-[0.65rem] uppercase tracking-[0.2em] font-bold mb-3">
                            {t('summerOffer')}
                        </p>
                        <div className="inline-flex items-center gap-3 bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl px-8 py-5 shadow-2xl">
                            {[
                                { value: timeLeft.days, label: t('days') },
                                { value: timeLeft.hours, label: t('hours') },
                                { value: timeLeft.minutes, label: t('minutes') },
                                { value: timeLeft.seconds, label: t('seconds') },
                            ].map((item, idx) => (
                                <div key={item.label} className="flex items-center">
                                    {idx > 0 && (
                                        <span className="text-white/30 text-2xl font-bold pb-3 select-none pr-3">:</span>
                                    )}
                                    <div className="flex flex-col items-center min-w-[3rem]">
                                        <span className="countdown-digit text-3xl font-headline font-extrabold text-white leading-none">
                                            {String(item.value).padStart(2, '0')}
                                        </span>
                                        <span className="text-white/45 text-[0.58rem] uppercase tracking-widest mt-1.5">
                                            {item.label}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="anim-fade-rise-d3 flex flex-col sm:flex-row items-center gap-4">
                    <a
                        href="#deals"
                        className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-headline font-bold text-sm text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, #003f87 0%, #0055b3 100%)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_offer</span>
                        {t('exploreDeals') ?? 'Khám Phá Ưu Đãi'}
                    </a>
                    <a
                        href="#vouchers"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-headline font-bold text-sm text-white border border-white/25 hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">redeem</span>
                        {t('getVoucher') ?? 'Lấy Voucher'}
                    </a>
                </div>

                {/* Scroll cue */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 anim-fade-rise-d3">
                    <span className="text-[0.6rem] uppercase tracking-[0.2em]">Cuộn xuống</span>
                    <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
                        <div className="w-1 h-2 rounded-full bg-white/50" style={{ animation: 'scrollDot 1.8s ease-in-out infinite' }}></div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scrollDot {
                    0%, 100% { transform: translateY(0); opacity: 1; }
                    60%       { transform: translateY(10px); opacity: 0.3; }
                }
            `}</style>
        </section>
    );
}

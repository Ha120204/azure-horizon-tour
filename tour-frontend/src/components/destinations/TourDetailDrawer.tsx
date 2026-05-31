'use client';

/**
 * TourDetailDrawer
 * ─────────────────────────────────────────────────────────────────────────
 * A full-screen drawer that expands from the tour card using Framer Motion's
 * shared layout animations (layoutId). The card image morphs into the drawer
 * hero image, creating the "card expands into detail" effect.
 *
 * How layoutId works:
 * - The TourCard wraps its image container with `layoutId={`card-img-${id}`}`.
 * - This drawer wraps its hero image with the same layoutId.
 * - When AnimatePresence mounts/unmounts this drawer, Framer Motion
 *   automatically interpolates position, size, and border-radius between
 *   the two elements — no extra CSS needed.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/constants';

// ── Types ──────────────────────────────────────────────────────────────────
interface TourDetail {
    id: number;
    name: string;
    imageUrl?: string | null;
    duration?: string | null;
    price: number;
    description?: string | null;
    destination?: { name: string } | null;
    availableSeats?: number | null;
    averageRating?: number | null;
    reviewCount?: number | null;
    highlights?: { title: string; description?: string }[];
    departures?: { price?: number | null }[];
}

interface TourDetailDrawerProps {
    tourId: number | null;
    imageUrl?: string | null;
    onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────
export default function TourDetailDrawer({ tourId, imageUrl, onClose }: TourDetailDrawerProps) {
    const { t, formatPrice, language } = useLocale();
    const [tour, setTour] = useState<TourDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch tour detail when a tour is selected
    useEffect(() => {
        if (!tourId) { setTour(null); return; }

        setIsLoading(true);
        fetch(`${API_BASE_URL}/tour/${tourId}?locale=${language}`)
            .then(r => r.json())
            .then(data => setTour(data.data || data))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [tourId, language]);

    // Lock body scroll when open
    useEffect(() => {
        if (tourId) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [tourId]);

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const displayPrice = tour
        ? formatPrice(
            tour.departures && tour.departures.length > 0
                ? Math.min(...tour.departures.map(d => d.price ?? tour.price))
                : tour.price
        )
        : '';

    return (
        <AnimatePresence>
            {tourId !== null && (
                <>
                    {/* ── Backdrop ── */}
                    <motion.div
                        key="backdrop"
                        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        onClick={onClose}
                        aria-hidden
                    />

                    {/* ── Drawer panel ── */}
                    <motion.div
                        key="drawer"
                        className="fixed inset-y-0 right-0 z-[90] w-full max-w-2xl bg-surface shadow-2xl flex flex-col overflow-hidden"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label={tour?.name || 'Tour detail'}
                    >
                        {/* ── Hero image — shared layoutId with TourCard ── */}
                        <div className="relative w-full h-72 shrink-0 overflow-hidden">
                            <motion.div
                                layoutId={`card-img-${tourId}`}
                                className="absolute inset-0"
                                transition={{
                                    layout: {
                                        type: 'spring',
                                        stiffness: 280,
                                        damping: 32,
                                    }
                                }}
                            >
                                <Image
                                    src={imageUrl || tour?.imageUrl || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200'}
                                    alt={tour?.name || 'Tour'}
                                    fill
                                    priority
                                    className="object-cover"
                                    sizes="(max-width: 672px) 100vw, 672px"
                                />
                            </motion.div>

                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                            {/* Close button */}
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ delay: 0.15 }}
                                onClick={onClose}
                                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10"
                                aria-label="Close"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </motion.button>

                            {/* Price badge */}
                            {displayPrice && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg"
                                >
                                    <p className="text-[10px] text-outline font-bold uppercase tracking-tighter">{t('dest.from')}</p>
                                    <p className="text-xl font-extrabold text-primary leading-none">{displayPrice}</p>
                                </motion.div>
                            )}
                        </div>

                        {/* ── Content area ── */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-center h-48"
                                >
                                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
                                </motion.div>
                            ) : tour ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: 0.1, duration: 0.35 }}
                                    className="p-6 space-y-6"
                                >
                                    {/* Title & meta */}
                                    <div>
                                        <h2 className="text-2xl font-extrabold font-headline text-on-surface mb-3 leading-tight">
                                            {tour.name}
                                        </h2>
                                        <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant">
                                            {tour.duration && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-base text-primary">schedule</span>
                                                    {tour.duration}
                                                </div>
                                            )}
                                            {tour.destination?.name && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-base text-primary">location_on</span>
                                                    {tour.destination.name}
                                                </div>
                                            )}
                                            {tour.availableSeats != null && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-base text-primary">group</span>
                                                    {t('tour_detail.spotsLeft', { seats: tour.availableSeats })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {tour.description && (
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-outline mb-2">{t('tour_detail.overview')}</h3>
                                            <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-6 whitespace-pre-line">
                                                {tour.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Highlights */}
                                    {tour.highlights && tour.highlights.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-outline mb-3">{t('tour_detail.highlightsTitle')}</h3>
                                            <ul className="space-y-2">
                                                {tour.highlights.slice(0, 5).map((h, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                                                        <span className="material-symbols-outlined text-base text-tertiary-container shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                                        <span>{h.title}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* CTA */}
                                    <div className="pt-2 flex flex-col gap-3">
                                        <Link
                                            href={`/tour/${tour.id}`}
                                            className="flex items-center justify-center gap-2 w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary-container transition-colors text-sm"
                                        >
                                            {t('tour_detail.viewDetails')}
                                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                                        </Link>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-3 rounded-xl border border-outline-variant/30 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                                        >
                                            {t('dest.continueBrowsing') || 'Tiếp tục xem'}
                                        </button>
                                    </div>
                                </motion.div>
                            ) : null}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

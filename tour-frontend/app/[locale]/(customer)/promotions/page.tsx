'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { useLocale } from '@/app/context/LocaleContext';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import { API_BASE_URL } from '@/app/lib/constants';
import { useTranslations } from 'next-intl';
import HeroBanner from '@/app/components/promotions/HeroBanner';
import VoucherCarousel from '@/app/components/promotions/VoucherCarousel';
import DealGrid from '@/app/components/promotions/DealGrid';

// ── Types ─────────────────────────────────────────────────────────
interface Voucher {
    id: number;
    code: string;
    label: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    minOrderValue: number;
    maxUses: number;
    usedCount: number;
    expiresAt: string;
    isActive: boolean;
}

type DealCategory = 'all' | 'flash' | 'early' | 'lastminute';

interface DealCard {
    id: number;
    tourId: number;
    name: string;
    image: string;
    badge: string;
    badgeColor: string;
    rating: number;
    duration: string;
    newPrice: number;
    oldPrice: number;
    urgencyText: string;
    bookedPercent: number;
    urgencyColor: string;
    category: DealCategory;
}

// getDeals removed — data now fetched from API (/tour/sale-deals)


const getTabOptions = (t: any): { key: DealCategory; label: string }[] => [
    { key: 'all', label: t('tabAll') },
    { key: 'flash', label: t('tabFlash') },
    { key: 'early', label: t('tabEarly') },
    { key: 'lastminute', label: t('tabLastMinute') },
];

const getTAndC = (t: any) => [
    { title: t('tc1Title'), body: t('tc1Body') },
    { title: t('tc2Title'), body: t('tc2Body') },
    { title: t('tc3Title'), body: t('tc3Body') },
];

// ── Helpers ───────────────────────────────────────────────────────
function getCountdownTarget(): Date {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    if (target.getTime() - now.getTime() < 86400000) {
        target.setMonth(target.getMonth() + 2, 0);
    }
    return target;
}

function computeTimeLeft(target: Date) {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
    };
}

// ── Component ─────────────────────────────────────────────────────
export default function PromotionsPage() {
    const { language, formatPrice } = useLocale();
    const t = useTranslations('promotions');
    const router = useRouter();

    const TAB_OPTIONS = getTabOptions(t);
    const T_AND_C = getTAndC(t);

    // ── Deals from API ────────────
    const [deals, setDeals] = useState<DealCard[]>([]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/tour/sale-deals`)
            .then(r => r.json())
            .then((res: any) => {
                const arr: any[] = res.data ?? res ?? [];
                const mapped: DealCard[] = arr.map((d: any) => ({
                    id: d.id,
                    tourId: d.tourId,
                    name: d.name,
                    image: d.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
                    badge: d.badge,
                    badgeColor: d.category === 'flash' ? 'bg-error text-white'
                        : d.category === 'early' ? 'bg-secondary-container text-on-secondary-fixed'
                        : 'bg-tertiary-container text-white',
                    rating: d.rating,
                    duration: d.duration,
                    newPrice: d.newPrice,
                    oldPrice: d.oldPrice,
                    urgencyText: d.availableSeats <= 3
                        ? `Chỉ còn ${d.availableSeats} chỗ!`
                        : d.category === 'flash' ? 'Kết thúc hôm nay!'
                        : d.category === 'lastminute' ? 'Sắp hết!'
                        : 'Ưu đãi có hạn',
                    bookedPercent: Math.min(95, Math.round(((d.availableSeats <= 5 ? 90 : 50) + Math.random() * 20))),
                    urgencyColor: d.category === 'flash' ? 'error'
                        : d.category === 'early' ? 'secondary-container'
                        : 'tertiary',
                    category: d.category as DealCategory,
                }));
                setDeals(mapped);
            })
            .catch(console.error);
    }, []);


    // ── Vouchers from API ─────────
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetch('http://localhost:3000/voucher')
            .then(res => res.json())
            .then((resData: any) => {
                const arr = resData.data || resData || [];
                setVouchers(Array.isArray(arr) ? arr : []);
            })
            .catch(console.error);

        // Fetch user's saved vouchers (if logged in)
        const token = localStorage.getItem('accessToken');
        if (token) {
            fetchWithAuth('http://localhost:3000/voucher/my-wallet')
                .then(res => res.json())
                .then((resData: any) => {
                    const arr = resData.data || resData || [];
                    const dataArray = Array.isArray(arr) ? arr : [];
                    const ids = new Set(dataArray.map((uv: any) => uv.voucherId));
                    setSavedIds(ids);
                })
                .catch(() => { });
        }
    }, []);

    // ── Countdown ─────────────────
    const [target] = useState(getCountdownTarget);
    const [timeLeft, setTimeLeft] = useState(computeTimeLeft(target));
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const id = setInterval(() => setTimeLeft(computeTimeLeft(target)), 1000);
        return () => clearInterval(id);
    }, [target]);

    // ── Copy-to-clipboard ─────────
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const handleCopy = useCallback(async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = code;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2500);
    }, []);

    // ── Save to wallet ────────────
    const [savingId, setSavingId] = useState<number | null>(null);
    const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleSaveToWallet = async (voucherId: number) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            return;
        }

        setSavingId(voucherId);
        try {
            const res = await fetchWithAuth('http://localhost:3000/voucher/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voucherId }),
            });

            if (res.ok) {
                setSavedIds(prev => new Set([...prev, voucherId]));
                setToastMsg({ text: t('voucherSaved'), type: 'success' });
            } else {
                const err = await res.json();
                setToastMsg({ text: err.message || t('voucherExists'), type: 'error' });
            }
        } catch {
            setToastMsg({ text: t('connectError'), type: 'error' });
        } finally {
            setSavingId(null);
            setTimeout(() => setToastMsg(null), 3000);
        }
    };

    // ── Filter tabs ───────────────
    const [activeTab, setActiveTab] = useState<DealCategory>('all');
    const filteredDeals = activeTab === 'all' ? deals : deals.filter(d => d.category === activeTab);


    // ── Newsletter ────────────────
    const [email, setEmail] = useState('');
    const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'exists' | 'error'>('idle');

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setSubscribeStatus('error');
            setTimeout(() => setSubscribeStatus('idle'), 3000);
            return;
        }

        setSubscribeStatus('loading');
        try {
            const res = await fetch(`${API_BASE_URL}/subscriber/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                if (data.message === 'already_exists') {
                    setSubscribeStatus('exists');
                } else {
                    setSubscribeStatus('success');
                    setEmail('');
                }
            } else {
                setSubscribeStatus('error');
            }
        } catch (error) {
            setSubscribeStatus('error');
        } finally {
            setTimeout(() => setSubscribeStatus('idle'), 4000);
        }
    };


    const [isModalOpen, setIsModalOpen] = useState(false);

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .vignette-overlay {
                    background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%);
                }
                .ticket-shape {
                    -webkit-mask-image: radial-gradient(circle at 0 50%, transparent 12px, black 13px), radial-gradient(circle at 100% 50%, transparent 12px, black 13px);
                    -webkit-mask-composite: source-in;
                    mask-image: radial-gradient(circle at 0 50%, transparent 12px, black 13px), radial-gradient(circle at 100% 50%, transparent 12px, black 13px);
                    mask-composite: intersect;
                }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-slide-up { animation: fadeSlideUp .35s ease-out; }
            `}} />

            {/* ── Toast Notifications ── */}
            {(copiedCode || toastMsg) && (
                <div className="fixed top-28 right-8 z-[100] animate-fade-slide-up">
                    <div className={`bg-white border-l-4 ${toastMsg?.type === 'error' ? 'border-error' : 'border-tertiary'
                        } shadow-2xl rounded-xl px-6 py-4 flex items-center gap-3`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${toastMsg?.type === 'error' ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'
                            }`}>
                            <span className="material-symbols-outlined text-xl">
                                {toastMsg?.type === 'error' ? 'error' : 'check_circle'}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-on-surface">
                                {toastMsg?.type === 'error' ? t('notification') : t('success')}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                                {toastMsg?.text || t('copiedToClipboard', { code: copiedCode || '' })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <Header />

            <main className="flex-grow">
                <HeroBanner timeLeft={timeLeft} isMounted={isMounted} t={t} />

                <section id="vouchers">
                    <VoucherCarousel
                        vouchers={vouchers}
                        copiedCode={copiedCode}
                        savedIds={savedIds}
                        savingId={savingId}
                        onCopy={handleCopy}
                        onSave={handleSaveToWallet}
                        isModalOpen={isModalOpen}
                        setIsModalOpen={setIsModalOpen}
                        t={t}
                        formatPrice={formatPrice}
                        language={language}
                    />
                </section>

                <section id="deals">
                    <DealGrid
                        deals={deals}
                        filteredDeals={filteredDeals}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        tabOptions={TAB_OPTIONS}
                        t={t}
                        formatPrice={formatPrice}
                    />
                </section>
                <section className="bg-primary-container py-24 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 translate-x-20"></div>
                    <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
                        <h2 className="text-4xl font-headline font-extrabold text-white mb-6">{t('unlockVIP')}</h2>
                        <p className="text-lg mb-12 max-w-xl mx-auto text-white/80">{t('unlockVIPDesc')}</p>
                        <form onSubmit={handleSubscribe} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
                            <input disabled={subscribeStatus === 'loading'} className="flex-grow px-8 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-secondary-fixed/50 transition-all backdrop-blur-sm disabled:opacity-50" placeholder={t('emailPlaceholder')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <button disabled={subscribeStatus === 'loading'} className="bg-secondary-fixed text-on-secondary-fixed font-bold px-10 py-4 rounded-full hover:scale-105 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2" type="submit">
                                {subscribeStatus === 'loading' ? <span className="material-symbols-outlined animate-spin inline-block">progress_activity</span> : t('subscribe')}
                            </button>
                        </form>
                        {subscribeStatus === 'success' && (
                            <p className="mt-6 text-white/90 font-semibold flex items-center justify-center gap-2 animate-fade-slide-up">
                                <span className="material-symbols-outlined text-tertiary-fixed">check_circle</span>
                                {t('welcomeAboard')}
                            </p>
                        )}
                        {subscribeStatus === 'exists' && (
                            <p className="mt-6 text-white/90 font-semibold flex items-center justify-center gap-2 animate-fade-slide-up">
                                <span className="material-symbols-outlined text-secondary-fixed">info</span>
                                {language === 'vi' ? 'Email này đã được đăng ký trước đó!' : 'This email is already subscribed!'}
                            </p>
                        )}
                        {subscribeStatus === 'error' && (
                            <p className="mt-6 text-error-container font-semibold flex items-center justify-center gap-2 animate-fade-slide-up">
                                <span className="material-symbols-outlined">error</span>
                                {language === 'vi' ? 'Có lỗi xảy ra hoặc email không hợp lệ.' : 'An error occurred or invalid email.'}
                            </p>
                        )}
                    </div>
                </section>

                {/* ═══════ Terms & Conditions ═══════ */}
                <section className="py-24 max-w-3xl mx-auto px-8">
                    <h2 className="text-2xl font-headline font-bold text-primary mb-8 text-center">{t('termsConditions')}</h2>
                    <div className="space-y-4">
                        {T_AND_C.map((item, idx) => (
                            <details key={idx} className="group bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/10">
                                <summary className="flex justify-between items-center p-6 cursor-pointer list-none font-bold text-primary font-headline">
                                    <span>{item.title}</span>
                                    <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                                </summary>
                                <div className="p-6 pt-0 text-sm text-on-surface-variant leading-relaxed">{item.body}</div>
                            </details>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
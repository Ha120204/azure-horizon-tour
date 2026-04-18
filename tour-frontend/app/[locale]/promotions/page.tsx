'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useLocale } from '@/app/context/LocaleContext';
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';
import { useTranslations } from 'next-intl';

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

// ── Demo Deals Data ───────────────────────────────────────────────
const getDeals = (t: any): DealCard[] => [
    {
        id: 1, tourId: 1,
        name: 'Maldives Private Escape',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbpZ4icMXp1vkSzBjAE8GwDL5zjm82IB2-T8rHIAruhnI_t9iEghRIdcZqSww1n9FIzwPHvM2stPP1vMeKDt0TSOBaAN3qenddhmVzvsf1pZLvLRAn32_88U5SEXaYvw5suRPS3LAigUDBOuETWqS9WIceqOM0aWF3ESueaIY6cRb_u12p3rApvHcW41vsnRbTG3ykJhzgDNZ84SPopKgbjvQRaz1NZqytUSStsFq9Yzfy6V_nqGziZbRpJISAXgAg5PAZxo9zsI3A',
        badge: t('deal1Badge'), badgeColor: 'bg-error text-white',
        rating: 4.9, duration: `7 ${t('duration')}`,
        newPrice: 3200, oldPrice: 4500,
        urgencyText: t('deal1Urgency'), bookedPercent: 85, urgencyColor: 'error',
        category: 'flash',
    },
    {
        id: 2, tourId: 2,
        name: 'Amalfi Coast Luxury',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9nX5Fcs-UT6WTnZtXdWyiiacy5C8jVVVkkvDVZI8QW7GrYmIjwrWvByI9oKTMKASDe1YEbOrsXS2kNSB2UsX6dfGB4QyUeZK4djbOBRFBw0froer9O173TRPGio-Zln_1UI71tZDR42y-eks8S1Yt7KO2fD0VFxq7j_Ad3el_JTDW0PvzN5bYNEfGNlCZr_JqR7jS_BYJk-C2SE3Ydfk60_2U3j6TYSE0wJrVgVWBQPf-Pz5-n2TFeHtAtfEAoYM8ojh0cHOVCTxi',
        badge: t('deal2Badge'), badgeColor: 'bg-secondary-container text-on-secondary-fixed',
        rating: 4.8, duration: `5 ${t('duration')}`,
        newPrice: 2100, oldPrice: 2800,
        urgencyText: t('deal2Urgency'), bookedPercent: 60, urgencyColor: 'secondary-container',
        category: 'early',
    },
    {
        id: 3, tourId: 3,
        name: 'Kyoto Zen Retreat',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBde5MvR5yQ1-LObwI6OMS_UAKEnxZ-GOc3fJJ1-MfAk83G7ysXb7fkqxlpmZDpHjI1QNd7khYTNDUs7vmOflNNythE7_RG9O0wA_hSDMPNo84rfPKMqgdNQ6_Csjvzu55w9W36yEjbViJ7PPGdPPTwZw60wFDMq0TGMqQpFsPIXf779LGA3Nd_wp-HeH9y8E2GTbDVbR0bTCDIqs1y1tar7U3PHecms80Nu41TdWZmQYMa3gkxc7hWmomflINjB6aDqD8TB7ks-Kes',
        badge: t('deal3Badge'), badgeColor: 'bg-tertiary-container text-white',
        rating: 5.0, duration: `10 ${t('duration')}`,
        newPrice: 4500, oldPrice: 5200,
        urgencyText: t('deal3Urgency'), bookedPercent: 45, urgencyColor: 'tertiary',
        category: 'lastminute',
    },
    {
        id: 4, tourId: 4,
        name: 'Santorini Caldera View',
        image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80&w=800',
        badge: t('deal4Badge'), badgeColor: 'bg-primary text-white',
        rating: 4.7, duration: `6 ${t('duration')}`,
        newPrice: 2800, oldPrice: 3500,
        urgencyText: t('deal4Urgency'), bookedPercent: 30, urgencyColor: 'primary',
        category: 'early',
    },
    {
        id: 5, tourId: 5,
        name: 'Dubai Royal Desert Safari',
        image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800',
        badge: t('deal5Badge'), badgeColor: 'bg-error text-white',
        rating: 4.6, duration: `4 ${t('duration')}`,
        newPrice: 1900, oldPrice: 3200,
        urgencyText: t('deal5Urgency'), bookedPercent: 92, urgencyColor: 'error',
        category: 'flash',
    },
    {
        id: 6, tourId: 6,
        name: 'Bali Spiritual Healing',
        image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800',
        badge: t('deal6Badge'), badgeColor: 'bg-secondary-container text-on-secondary-fixed',
        rating: 4.9, duration: `8 ${t('duration')}`,
        newPrice: 2200, oldPrice: 2900,
        urgencyText: t('deal6Urgency'), bookedPercent: 78, urgencyColor: 'secondary-container',
        category: 'lastminute',
    },
];

const getTabOptions = (t: any): { key: DealCategory; label: string }[] => [
    { key: 'all', label: t('tabAll') },
    { key: 'flash', label: t('tabFlash') },
    { key: 'early', label: t('tabEarly') },
    { key: 'lastminute', label: t('tabLastMinute') },
];

const getTAndC = (t: any) => [
    {
        title: t('tc1Title'),
        body: t('tc1Body'),
    },
    {
        title: t('tc2Title'),
        body: t('tc2Body'),
    },
    {
        title: t('tc3Title'),
        body: t('tc3Body'),
    },
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

    const DEALS = getDeals(t);
    const TAB_OPTIONS = getTabOptions(t);
    const T_AND_C = getTAndC(t);

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
    const filteredDeals = activeTab === 'all' ? DEALS : DEALS.filter(d => d.category === activeTab);

    // ── Newsletter ────────────────
    const [email, setEmail] = useState('');
    const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setSubscribeStatus('error');
            setTimeout(() => setSubscribeStatus('idle'), 3000);
            return;
        }
        setSubscribeStatus('success');
        setEmail('');
        setTimeout(() => setSubscribeStatus('idle'), 4000);
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

            <main className="pt-20 flex-grow">
                {/* ═══════ Hero Banner ═══════ */}
                <section className="relative h-[716px] w-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <img
                            alt="Luxury destination"
                            className="w-full h-full object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA70YGE_6i9HRdivBAGECUe00xdQwfxInlL4-Hsr5BmZPjew-XCYz2sEsfVchuASOyFb5PuUOXSdloAGzt2XLPeNwooElP2aRrb-9Zbp5wS_xZD9ArsBN_COVi_ewRwdwr0vbxWJf1GrgLEo6acSpS8HYreKvvtbACn1dD5XmBj4i0eYKm7NVPugIOBO0OASq-2pU4mJ44eDcT8Iltc5A1Ckrmwd0hWDt-YTyV4jYzTvNr7F7RCcW8PQKNUwKzduGjV2b0S3l0gcsBl"
                        />
                        <div className="absolute inset-0 vignette-overlay"></div>
                    </div>
                    <div className="relative z-10 text-center px-6 max-w-4xl pt-16">
                        <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-secondary-container/90 text-on-secondary-fixed font-label text-xs uppercase tracking-[0.2em] font-bold">{t('limitedTime')}</span>
                        <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-white tracking-tight mb-6">{t('title')}<span className="text-secondary-fixed">{t('titleHighlight')}</span></h1>
                        <p className="text-xl text-white/90 font-light mb-10 max-w-2xl mx-auto">{t('subtitle')}</p>

                        {/* Live Countdown */}
                        {isMounted && (
                            <div className="inline-flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-8 py-4 shadow-2xl">
                                <span className="material-symbols-outlined text-secondary-fixed mr-3">schedule</span>
                                <div className="text-left">
                                    <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">{t('summerOffer')}</p>
                                    <div className="flex space-x-4 text-white font-headline text-xl font-bold tabular-nums">
                                        <span>{String(timeLeft.days).padStart(2, '0')}<span className="text-xs font-normal text-white/50 ml-1 uppercase">{t('days')}</span></span>
                                        <span>{String(timeLeft.hours).padStart(2, '0')}<span className="text-xs font-normal text-white/50 ml-1 uppercase">{t('hours')}</span></span>
                                        <span>{String(timeLeft.minutes).padStart(2, '0')}<span className="text-xs font-normal text-white/50 ml-1 uppercase">{t('minutes')}</span></span>
                                        <span>{String(timeLeft.seconds).padStart(2, '0')}<span className="text-xs font-normal text-white/50 ml-1 uppercase">{t('seconds')}</span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ═══════ Voucher Section (from API) ═══════ */}
                <section className="py-20 px-8 max-w-screen-2xl mx-auto overflow-hidden">
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <h2 className="text-3xl font-headline font-bold text-primary mb-2">{t('memberVouchers')}</h2>
                            <p className="text-on-surface-variant">{t('memberVouchersDesc')}</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="group flex items-center gap-2 text-primary font-bold hover:text-primary/80 transition-colors"
                        >
                            <span className="text-sm">{t('seeMore')}</span>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                        </button>
                    </div>
                    <div id="voucher-scroll-container" className="flex space-x-6 overflow-x-auto pb-8 scrollbar-hide snap-x scroll-smooth">
                        {vouchers.map((v, idx) => {
                            const styles = [
                                { wrapper: 'bg-primary text-white', discount: 'text-secondary-fixed', border: 'border-white/20', btnCls: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white', saveBtnCls: 'bg-white/20 hover:bg-white/30 border border-white/20 text-white' },
                                { wrapper: 'bg-surface-container-highest text-primary border border-outline-variant/30', discount: 'text-primary', border: 'border-outline-variant', btnCls: 'bg-primary text-white hover:opacity-90', saveBtnCls: 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20' },
                                { wrapper: 'bg-secondary-container text-white', discount: 'text-on-secondary-fixed', border: 'border-on-secondary-fixed/20', btnCls: 'bg-on-secondary-fixed/10 hover:bg-on-secondary-fixed/20 border border-on-secondary-fixed/20 text-on-secondary-fixed', saveBtnCls: 'bg-on-secondary-fixed/20 hover:bg-on-secondary-fixed/30 border border-on-secondary-fixed/20 text-on-secondary-fixed' },
                            ];
                            const s = styles[idx % styles.length];
                            const isCopied = copiedCode === v.code;
                            const isSaved = savedIds.has(v.id);
                            const isSaving = savingId === v.id;

                            return (
                                <div
                                    key={v.id}
                                    className={`min-w-[340px] p-8 rounded-2xl flex flex-col justify-between relative ticket-shape snap-center shadow-xl ${s.wrapper}`}
                                >
                                    <div>
                                        <p className="font-label text-xs tracking-widest mb-2 opacity-80 uppercase">{v.label}</p>
                                        <h3 className={`text-4xl font-headline font-bold mb-4 ${s.discount}`}>
                                            {v.discountType === 'PERCENTAGE' ? `${v.discountValue}% ${t('off')}` : `${t('save')} ${formatPrice(v.discountValue)}`}
                                        </h3>
                                        <p className="text-sm opacity-90 leading-relaxed">{v.description}</p>
                                        <p className="text-[10px] mt-3 opacity-60 uppercase tracking-wider">
                                            {t('minOrder')} {formatPrice(v.minOrderValue)} · {t('expires')} {new Date(v.expiresAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                                        </p>
                                    </div>
                                    <div className={`mt-8 flex flex-col gap-3 border-t pt-6 ${s.border}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest opacity-60">{t('couponCode')}</p>
                                                <p className="font-bold text-lg font-headline font-mono">{v.code}</p>
                                            </div>
                                            <button
                                                onClick={() => handleCopy(v.code)}
                                                className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-1.5 active:scale-95 ${isCopied ? 'bg-tertiary text-white' : s.btnCls
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-sm">{isCopied ? 'check' : 'content_copy'}</span>
                                                {isCopied ? t('copied') : t('copy')}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleSaveToWallet(v.id)}
                                            disabled={isSaved || isSaving}
                                            className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${isSaved
                                                ? 'bg-tertiary/20 text-tertiary cursor-default'
                                                : s.saveBtnCls
                                                } ${isSaving ? 'opacity-60 cursor-wait' : ''}`}
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {isSaved ? 'check_circle' : isSaving ? 'progress_activity' : 'wallet'}
                                            </span>
                                            {isSaved ? t('savedToWallet') : isSaving ? t('saving') : t('saveToWallet')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ═══════ Filter Tabs ═══════ */}
                <section className="max-w-screen-2xl mx-auto px-8 mb-12">
                    <div className="flex flex-wrap gap-3 items-center justify-center bg-surface-container-low p-2 rounded-full border border-outline-variant/20 max-w-max mx-auto">
                        {TAB_OPTIONS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-8 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${activeTab === tab.key
                                    ? 'bg-primary text-on-primary shadow-sm'
                                    : 'hover:bg-white text-on-surface-variant'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* ═══════ Tour Grid ═══════ */}
                <section className="max-w-screen-2xl mx-auto px-8 pb-32">
                    {filteredDeals.length === 0 ? (
                        <div className="text-center py-20 bg-surface-container-lowest rounded-2xl">
                            <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
                            <p className="font-bold text-on-surface">{t('noOffersFound')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredDeals.map((deal) => (
                                <div
                                    key={deal.id}
                                    className="group bg-surface-container-lowest rounded-2xl overflow-hidden hover:shadow-[0_32px_64px_-12px_rgba(25,28,33,0.04)] transition-all duration-500 border border-transparent hover:border-outline-variant/10"
                                >
                                    <div className="relative h-72 overflow-hidden">
                                        <img alt={deal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={deal.image} />
                                        <span className={`absolute top-4 left-4 ${deal.badgeColor} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm`}>{deal.badge}</span>
                                        <div className="absolute bottom-4 right-4 bg-white px-3 py-1.5 rounded-xl shadow-lg flex items-center">
                                            <span className="material-symbols-outlined text-secondary text-sm mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                            <span className="text-sm font-bold text-primary">{deal.rating}</span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-headline font-bold text-primary">{deal.name}</h3>
                                            <span className="text-xs font-label text-on-surface-variant font-bold uppercase whitespace-nowrap ml-2">{deal.duration}</span>
                                        </div>
                                        <div className="flex items-center mb-6">
                                            <span className="text-2xl font-headline font-bold text-primary mr-3">{formatPrice(deal.newPrice)}</span>
                                            <span className="text-sm text-on-surface-variant line-through opacity-60">{formatPrice(deal.oldPrice)}</span>
                                        </div>
                                        <div className="mb-6">
                                            <div className={`flex justify-between text-xs font-bold text-${deal.urgencyColor} mb-1.5 uppercase tracking-wide`}>
                                                <span>{deal.urgencyText}</span>
                                                <span>{deal.bookedPercent}% {t('booked')}</span>
                                            </div>
                                            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                                <div className={`bg-${deal.urgencyColor} h-full rounded-full transition-all duration-700`} style={{ width: `${deal.bookedPercent}%` }}></div>
                                            </div>
                                        </div>
                                        <Link href={`/tour/${deal.tourId}`} className="w-full bg-primary text-on-primary py-3.5 rounded-full font-bold text-sm hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                                            {t('viewDetails')}
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ═══════ VIP Section ═══════ */}
                <section className="bg-primary-container py-24 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 translate-x-20"></div>
                    <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
                        <h2 className="text-4xl font-headline font-extrabold text-white mb-6">{t('unlockVIP')}</h2>
                        <p className="text-lg mb-12 max-w-xl mx-auto text-white/80">{t('unlockVIPDesc')}</p>
                        <form onSubmit={handleSubscribe} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
                            <input className="flex-grow px-8 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-secondary-fixed/50 transition-all backdrop-blur-sm" placeholder={t('emailPlaceholder')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <button className="bg-secondary-fixed text-on-secondary-fixed font-bold px-10 py-4 rounded-full hover:scale-105 transition-all shadow-xl active:scale-95" type="submit">{t('subscribe')}</button>
                        </form>
                        {subscribeStatus === 'success' && (
                            <p className="mt-6 text-white/90 font-semibold flex items-center justify-center gap-2 animate-fade-slide-up">
                                <span className="material-symbols-outlined text-tertiary-fixed">check_circle</span>
                                {t('welcomeAboard')}
                            </p>
                        )}
                        {subscribeStatus === 'error' && (
                            <p className="mt-6 text-error-container font-semibold flex items-center justify-center gap-2 animate-fade-slide-up">
                                <span className="material-symbols-outlined">error</span>
                                {t('invalidEmail')}
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

            {/* ── All Vouchers Modal ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8 animate-fade-slide-up">
                    <div className="bg-surface rounded-3xl w-full max-w-6xl max-h-full flex flex-col overflow-hidden shadow-2xl relative">
                        <div className="p-6 md:p-8 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-headline font-bold text-primary">{t('allVouchersTitle')}</h2>
                                <p className="text-sm text-on-surface-variant font-medium mt-1">{t('allVouchersDesc')}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors text-on-surface-variant">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto flex-grow scrollbar-hide">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {vouchers.map((v, idx) => {
                                    const styles = [
                                        { wrapper: 'bg-primary text-white', discount: 'text-secondary-fixed', border: 'border-white/20', btnCls: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white', saveBtnCls: 'bg-white/20 hover:bg-white/30 border border-white/20 text-white' },
                                        { wrapper: 'bg-surface-container-highest text-primary border border-outline-variant/30', discount: 'text-primary', border: 'border-outline-variant', btnCls: 'bg-primary text-white hover:opacity-90', saveBtnCls: 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20' },
                                        { wrapper: 'bg-secondary-container text-white', discount: 'text-on-secondary-fixed', border: 'border-on-secondary-fixed/20', btnCls: 'bg-on-secondary-fixed/10 hover:bg-on-secondary-fixed/20 border border-on-secondary-fixed/20 text-on-secondary-fixed', saveBtnCls: 'bg-on-secondary-fixed/20 hover:bg-on-secondary-fixed/30 border border-on-secondary-fixed/20 text-on-secondary-fixed' },
                                    ];
                                    const s = styles[idx % styles.length];
                                    const isCopied = copiedCode === v.code;
                                    const isSaved = savedIds.has(v.id);
                                    const isSaving = savingId === v.id;

                                    return (
                                        <div
                                            key={v.id}
                                            className={`p-6 rounded-2xl flex flex-col justify-between relative ticket-shape shadow-lg hover:shadow-xl transition-shadow ${s.wrapper}`}
                                        >
                                            <div>
                                                <p className="font-label text-xs tracking-widest mb-2 opacity-80 uppercase">{v.label}</p>
                                                <h3 className={`text-3xl font-headline font-bold mb-3 ${s.discount}`}>
                                                    {v.discountType === 'PERCENTAGE' ? `${v.discountValue}% ${t('off')}` : `${t('save')} ${formatPrice(v.discountValue)}`}
                                                </h3>
                                                <p className="text-sm opacity-90 leading-relaxed mb-4">{v.description}</p>
                                                <p className="text-[10px] opacity-60 uppercase tracking-wider font-medium">
                                                    {t('minOrder')} {formatPrice(v.minOrderValue)}<br />
                                                    {t('expires')} {new Date(v.expiresAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                                                </p>
                                            </div>
                                            <div className={`mt-6 flex flex-col gap-3 border-t pt-5 ${s.border}`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-widest opacity-60">{t('couponCode')}</p>
                                                        <p className="font-bold text-base font-headline font-mono">{v.code}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopy(v.code)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 ${isCopied ? 'bg-tertiary text-white' : s.btnCls
                                                            }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">{isCopied ? 'check' : 'content_copy'}</span>
                                                        {isCopied ? t('copied') : t('copy')}
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => handleSaveToWallet(v.id)}
                                                    disabled={isSaved || isSaving}
                                                    className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${isSaved
                                                        ? 'bg-tertiary/20 text-tertiary cursor-default'
                                                        : s.saveBtnCls
                                                        } ${isSaving ? 'opacity-60 cursor-wait' : ''}`}
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">
                                                        {isSaved ? 'check_circle' : isSaving ? 'progress_activity' : 'wallet'}
                                                    </span>
                                                    {isSaved ? t('savedToWallet') : isSaving ? t('saving') : t('saveToWallet')}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { fetchAuthProfile } from '@/lib/auth/authSession';
import { API_BASE_URL } from '@/lib/http/constants';
import { useTranslations } from 'next-intl';
import HeroBanner from '@/components/promotions/HeroBanner';
import VoucherCarousel from '@/components/promotions/VoucherCarousel';
import DealGrid from '@/components/promotions/DealGrid';

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
type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

interface ApiResponse<T> {
    data?: T;
}

interface SaleDealApi {
    id: number;
    tourId: number;
    name: string;
    image?: string | null;
    badge: string;
    rating?: number | null;
    duration: string;
    newPrice: number;
    oldPrice: number;
    discountPct?: number | null;
    bookedPercent?: number | null;
    maxSeats?: number | null;
    availableSeats?: number | null;
    flashSaleEndsAt?: string | null;
    category: DealCategory;
    destination?: string | null;
}

interface UserVoucher {
    voucherId: number;
}

interface DealCard {
    id: number;
    departureId: number;
    tourId: number;
    name: string;
    image: string;
    badge: string;
    badgeColor: string;
    rating: number;
    duration: string;
    newPrice: number;
    oldPrice: number;
    discountPct: number;
    bookedPercent: number | null;   // null = no data (no maxSeats)
    maxSeats: number | null;
    availableSeats: number;
    flashSaleEndsAt: string | null; // ISO — for real per-card countdown
    urgencyText: string;
    urgencyColor: string;
    category: DealCategory;
    destination: string;
}

// getDeals removed — data now fetched from API (/tour/sale-deals)


const getTabOptions = (t: TranslationFn): { key: DealCategory; label: string }[] => [
    { key: 'all', label: t('tabAll') },
    { key: 'flash', label: t('tabFlash') },
    { key: 'early', label: t('tabEarly') },
    { key: 'lastminute', label: t('tabLastMinute') },
];

const getTAndC = (t: TranslationFn) => [
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
    const searchParams = useSearchParams();
    const voucherQuery = searchParams.get('voucher');
    const sharedVoucherCode = useMemo(() => {
        const code = voucherQuery?.trim();
        return code ? code.toUpperCase() : null;
    }, [voucherQuery]);
    const lastHandledSharedVoucherRef = useRef<string | null>(null);

    const TAB_OPTIONS = getTabOptions(t);
    const T_AND_C = getTAndC(t);

    // ── Deals from API ────────────
    const [deals, setDeals] = useState<DealCard[]>([]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/tour/sale-deals?locale=${language}`)
            .then(r => r.json())
            .then((res: ApiResponse<SaleDealApi[]> | SaleDealApi[]) => {
                const arr = Array.isArray(res) ? res : res.data ?? [];
                const mapped: DealCard[] = arr.map((d) => ({
                    id: d.id,
                    departureId: d.id,
                    tourId: d.tourId,
                    name: d.name,
                    image: d.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
                    badge: d.badge,
                    badgeColor: d.category === 'flash' ? 'bg-error text-white'
                        : d.category === 'early' ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-amber-500 text-white',
                    rating: d.rating ?? 0,
                    duration: d.duration,
                    newPrice: d.newPrice,
                    oldPrice: d.oldPrice,
                    discountPct: d.discountPct ?? 0,
                    // ✅ Real data from DB — no more Math.random()
                    bookedPercent: d.bookedPercent ?? null,
                    maxSeats: d.maxSeats ?? null,
                    availableSeats: d.availableSeats ?? 0,
                    flashSaleEndsAt: d.flashSaleEndsAt ?? null,
                    urgencyText: (d.availableSeats ?? 0) <= 3
                        ? `Chỉ còn ${d.availableSeats ?? 0} chỗ!`
                        : d.category === 'flash' ? 'Flash Sale'
                        : d.category === 'lastminute' ? 'Sắp hết!'
                        : 'Ưu đãi có hạn',
                    urgencyColor: d.category === 'flash' ? 'error'
                        : d.category === 'early' ? 'secondary-container'
                        : 'amber-500',
                    category: d.category as DealCategory,
                    destination: d.destination ?? '',
                }));
                setDeals(mapped);
            })
            .catch(console.error);
    }, [language]);



    // ── Vouchers from API ─────────
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
    const [highlightedVoucherCode, setHighlightedVoucherCode] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/voucher`)
            .then(res => res.json())
            .then((resData: ApiResponse<Voucher[]> | Voucher[]) => {
                const arr = Array.isArray(resData) ? resData : resData.data ?? [];
                setVouchers(Array.isArray(arr) ? arr : []);
            })
            .catch(console.error);

        // Fetch user's saved vouchers (if logged in)
        fetchAuthProfile().then((profile) => {
            if (!profile) return;
            fetchWithAuth(`${API_BASE_URL}/voucher/my-wallet`)
                .then(res => res.json())
                .then((resData: ApiResponse<UserVoucher[]> | UserVoucher[]) => {
                    const arr = Array.isArray(resData) ? resData : resData.data ?? [];
                    const dataArray = Array.isArray(arr) ? arr : [];
                    const ids = new Set(dataArray.map((uv) => uv.voucherId));
                    setSavedIds(ids);
                })
                .catch(() => { });
        });
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
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!sharedVoucherCode) {
            setHighlightedVoucherCode(null);
            lastHandledSharedVoucherRef.current = null;
            return;
        }
        if (vouchers.length === 0 || lastHandledSharedVoucherRef.current === sharedVoucherCode) return;

        lastHandledSharedVoucherRef.current = sharedVoucherCode;
        const targetIndex = vouchers.findIndex(voucher => voucher.code.toUpperCase() === sharedVoucherCode);

        document.getElementById('vouchers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (targetIndex === -1) {
            setHighlightedVoucherCode(null);
            setToastMsg({
                type: 'error',
                text: language === 'vi'
                    ? `Mã ${sharedVoucherCode} không còn khả dụng.`
                    : `Voucher ${sharedVoucherCode} is no longer available.`,
            });
            window.setTimeout(() => setToastMsg(null), 3500);
            return;
        }

        const targetVoucher = vouchers[targetIndex];
        setHighlightedVoucherCode(targetVoucher.code);
        setToastMsg({
            type: 'success',
            text: language === 'vi'
                ? `Đã mở voucher ${targetVoucher.code}.`
                : `Opened voucher ${targetVoucher.code}.`,
        });

        if (targetIndex >= 4) {
            setIsModalOpen(true);
        }

        window.setTimeout(() => setToastMsg(null), 3000);
    }, [language, sharedVoucherCode, vouchers]);

    const handleSaveToWallet = async (voucherId: number) => {
        const profile = await fetchAuthProfile();
        if (!profile) {
            router.push('/login');
            return;
        }

        setSavingId(voucherId);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/voucher/save`, {
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

    // ✅ Tính Flash Sale gần hết hạn nhất — dùng cho HeroBanner countdown
    const nearestFlashSaleEndsAt = deals
        .filter(d => d.category === 'flash' && d.flashSaleEndsAt && new Date(d.flashSaleEndsAt) > new Date())
        .sort((a, b) => new Date(a.flashSaleEndsAt!).getTime() - new Date(b.flashSaleEndsAt!).getTime())[0]
        ?.flashSaleEndsAt ?? null;

    // ── Filter tabs ────────────
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
        } catch {
            setSubscribeStatus('error');
        } finally {
            setTimeout(() => setSubscribeStatus('idle'), 4000);
        }
    };

    // ── Render ─────────────────────────────────────────────────────
    const vipPerks = language === 'vi'
        ? ['Ưu đãi kín trước khi công bố', 'Mã nâng hạng cho hội viên', 'Gợi ý kỳ nghỉ theo mùa']
        : ['Private offers before release', 'Member upgrade vouchers', 'Seasonal escape alerts'];

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
                <HeroBanner timeLeft={timeLeft} isMounted={isMounted} nearestFlashSaleEndsAt={nearestFlashSaleEndsAt} t={t} />

                {/* scroll-margin-top compensates for the 88px fixed header */}
                <section id="vouchers" style={{ scrollMarginTop: '88px' }}>
                    <VoucherCarousel
                        vouchers={vouchers}
                        copiedCode={copiedCode}
                        savedIds={savedIds}
                        savingId={savingId}
                        onCopy={handleCopy}
                        onSave={handleSaveToWallet}
                        isModalOpen={isModalOpen}
                        setIsModalOpen={setIsModalOpen}
                        highlightedCode={highlightedVoucherCode}
                        t={t}
                        formatPrice={formatPrice}
                        language={language}
                    />
                </section>

                <section id="deals" style={{ scrollMarginTop: '88px' }}>
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
                <section className="relative overflow-hidden bg-[#08245c] px-6 py-20 md:px-10 md:py-24">
                    <div className="mx-auto max-w-6xl">
                    <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-100">
                                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified</span>
                                VIP Access
                            </div>
                            <h2 className="max-w-xl font-headline text-4xl font-extrabold leading-[1.02] tracking-tight text-white md:text-5xl">{t('unlockVIP')}</h2>
                            <p className="mt-5 max-w-xl text-base leading-8 text-blue-100/85 md:text-lg">{t('unlockVIPDesc')}</p>
                            <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                {vipPerks.map((perk) => (
                                    <div key={perk} className="flex items-center gap-2 rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/10">
                                        <span className="material-symbols-outlined text-[18px] text-[#ffd8b5]" aria-hidden="true">check_circle</span>
                                        <span>{perk}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-x-8 -top-5 h-10 rounded-t-[2rem] bg-[#ffd8b5]" aria-hidden="true" />
                            <div className="relative rounded-[1.5rem] bg-white p-5 shadow-[0_18px_44px_rgba(3,18,45,0.28)] md:p-6">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Inner Circle</p>
                                        <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                                            {language === 'vi' ? 'Nhận ưu đãi riêng' : 'Get private deals'}
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        <span className="material-symbols-outlined" aria-hidden="true">confirmation_number</span>
                                    </div>
                                </div>
                        <form onSubmit={handleSubscribe} className="space-y-3">
                            <label htmlFor="vip-email" className="sr-only">{t('emailPlaceholder')}</label>
                            <div className="flex flex-col gap-3 lg:flex-row">
                            <input id="vip-email" disabled={subscribeStatus === 'loading'} className="min-h-14 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-900 outline-none transition-[background-color,border-color,box-shadow] placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:opacity-50" placeholder={t('emailPlaceholder')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <button disabled={subscribeStatus === 'loading'} className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-sm font-extrabold text-white shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none" type="submit">
                                {subscribeStatus === 'loading' ? <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span> : <>{t('subscribe')}<span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true">arrow_forward</span></>}
                            </button>
                            </div>
                        </form>
                        <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1.5">{language === 'vi' ? 'Không spam' : 'No spam'}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1.5">{language === 'vi' ? 'Hủy nhận tin bất cứ lúc nào' : 'Unsubscribe anytime'}</span>
                        </div>
                        <div aria-live="polite">
                        {subscribeStatus === 'success' && (
                            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 animate-fade-slide-up">
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
                                {t('welcomeAboard')}
                            </p>
                        )}
                        {subscribeStatus === 'exists' && (
                            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 animate-fade-slide-up">
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
                                {language === 'vi' ? 'Email này đã được đăng ký trước đó!' : 'This email is already subscribed!'}
                            </p>
                        )}
                        {subscribeStatus === 'error' && (
                            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 animate-fade-slide-up">
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
                                {language === 'vi' ? 'Có lỗi xảy ra hoặc email không hợp lệ.' : 'An error occurred or invalid email.'}
                            </p>
                        )}
                        </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </section>

                {/* ═══════ Terms & Conditions ═══════ */}
                <section className="bg-[#f5f8ff] px-6 py-20 md:px-10 md:py-24">
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-10 text-center">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                                {language === 'vi' ? 'Minh bạch ưu đãi' : 'Offer clarity'}
                            </span>
                            <h2 className="mt-5 font-headline text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
                                {t('termsConditions')}
                            </h2>
                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                                {language === 'vi'
                                    ? 'Mở từng mục để kiểm tra điều kiện áp dụng trước khi lưu voucher hoặc đặt tour.'
                                    : 'Open each item to check eligibility before saving a voucher or booking a trip.'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {T_AND_C.map((item, idx) => (
                                <details
                                    key={idx}
                                    className="group overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm shadow-primary/5 transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 motion-reduce:transform-none"
                                >
                                    <summary className="flex cursor-pointer list-none items-center gap-4 p-5 font-headline text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:p-6">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary transition-[transform,background-color,color] duration-300 group-open:scale-95 group-open:bg-primary group-open:text-white">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <span className="min-w-0 flex-1 text-left text-base font-extrabold md:text-lg">
                                            {item.title}
                                        </span>
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-primary transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-180 group-open:bg-primary/10">
                                            <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                        </span>
                                    </summary>
                                    <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:grid-rows-[1fr]">
                                        <div className="overflow-hidden">
                                            <div className="px-5 pb-6 pl-[4.75rem] text-sm leading-7 text-slate-600 md:px-6 md:pb-7 md:pl-[5.5rem]">
                                                {item.body}
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}

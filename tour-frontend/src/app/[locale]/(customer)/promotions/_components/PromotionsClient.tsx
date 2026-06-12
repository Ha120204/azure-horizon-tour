'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import { useTranslations } from 'next-intl';
import HeroBanner from '@/components/promotions/HeroBanner';
import VoucherCarousel from '@/components/promotions/VoucherCarousel';
import DealGrid from '@/components/promotions/DealGrid';
import VipSignupSection from './VipSignupSection';
import TermsSection from './TermsSection';
import { usePromotions, type DealCategory } from '../_hooks/usePromotions';

// ── Types ─────────────────────────────────────────────────────────
type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

const getTabOptions = (t: TranslationFn): { key: DealCategory; label: string }[] => [
    { key: 'all', label: t('tabAll') },
    { key: 'flash', label: t('tabFlash') },
    { key: 'early', label: t('tabEarly') },
    { key: 'lastminute', label: t('tabLastMinute') },
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
export default function PromotionsClient() {
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

    // ── Data (deals, vouchers, wallet) ────────────
    const {
        deals,
        dealsStatus,
        reloadDeals,
        vouchers,
        vouchersStatus,
        reloadVouchers,
        savedIds,
        saveToWallet,
    } = usePromotions(language);

    const [highlightedVoucherCode, setHighlightedVoucherCode] = useState<string | null>(null);

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

    // ── Shared voucher deep-link ──
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
                text: t('voucherUnavailable', { code: sharedVoucherCode }),
            });
            window.setTimeout(() => setToastMsg(null), 3500);
            return;
        }

        const targetVoucher = vouchers[targetIndex];
        setHighlightedVoucherCode(targetVoucher.code);
        setToastMsg({
            type: 'success',
            text: t('voucherOpened', { code: targetVoucher.code }),
        });

        if (targetIndex >= 4) {
            setIsModalOpen(true);
        }

        window.setTimeout(() => setToastMsg(null), 3000);
    }, [t, sharedVoucherCode, vouchers]);

    const handleSaveToWallet = async (voucherId: number) => {
        setSavingId(voucherId);
        try {
            const result = await saveToWallet(voucherId);
            if (result.ok) {
                setToastMsg({ text: t('voucherSaved'), type: 'success' });
            } else if (result.reason === 'login') {
                router.push('/login');
                return;
            } else {
                setToastMsg({ text: result.message || t('voucherExists'), type: 'error' });
            }
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

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
            {/* ── Toast Notifications ── */}
            {(copiedCode || toastMsg) && (
                <div className="fixed top-24 right-4 left-4 sm:top-28 sm:right-8 sm:left-auto z-[100] animate-fade-slide-up">
                    <div className={`bg-white border-l-4 ${toastMsg?.type === 'error' ? 'border-error' : 'border-tertiary'
                        } shadow-2xl rounded-xl px-6 py-4 flex items-center gap-3 sm:max-w-sm`}>
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
                        status={vouchersStatus}
                        onRetry={reloadVouchers}
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
                        status={dealsStatus}
                        onRetry={reloadDeals}
                        filteredDeals={filteredDeals}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        tabOptions={TAB_OPTIONS}
                        t={t}
                        formatPrice={formatPrice}
                    />
                </section>

                <VipSignupSection t={t} />

                <TermsSection t={t} />
            </main>

            <Footer />
        </div>
    );
}

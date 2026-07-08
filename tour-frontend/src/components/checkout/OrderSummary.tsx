'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { getLocalizedVoucher } from '@/lib/i18n/vouchers';
import TransportSummaryCard from '@/components/tour/TransportSummaryCard';
import type { TourDepartureTransport } from '@/types';

interface AppliedVoucher {
    code: string;
    label: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
}

interface OrderTourData {
    name: string;
    imageUrl?: string | null;
    startDate: string;
    duration: string;
}

interface OrderPackage {
    name: string;
}

interface WalletVoucher {
    id: number | string;
    status?: string;
    voucher: {
        code: string;
        label?: string;
        discountType: string;
        discountValue: number;
        minOrderValue?: number;
        expiryDate?: string | null;
    };
}

interface OrderSummaryProps {
    tourData: OrderTourData;
    departureDate?: string | null;
    transport?: TourDepartureTransport | null;
    selectedPackage: OrderPackage | null;
    adultCount: number;
    childCount: number;
    infantCount: number;
    prices: { 'Adult (12+)': number; 'Child (4-11)': number; 'Infant (<4)': number };
    subtotal: number;
    totalPrice: number;
    discountAmount: number;
    // Voucher
    appliedVoucher: AppliedVoucher | null;
    voucherCode: string;
    setVoucherCode: (code: string) => void;
    voucherError: string;
    setVoucherError: (err: string) => void;
    isValidating: boolean;
    onApplyVoucher: (code?: string) => void;
    onRemoveVoucher: () => void;
    myWalletVouchers: WalletVoucher[];
    showWalletDropdown: boolean;
    setShowWalletDropdown: (show: boolean) => void;
    isSaleDeparture?: boolean;
    saleVoucherMessage?: string;
    // Payment
    isPaymentLoading: boolean;
    onPayment: () => void;
    agreedToTerms: boolean;
    setAgreedToTerms: (agreed: boolean) => void;
    // Guest stepper
    onChangeGuest: (key: 'adults' | 'children' | 'infants', delta: 1 | -1) => void;
    canIncreaseAdults: boolean;
    canIncreaseChildren: boolean;
    canIncreaseInfants: boolean;
    maxPeopleReached: boolean;
    maxPeople: number;
    t: (key: string, params?: Record<string, string | number | Date>) => string;
    formatPrice: (price: number) => string;
}

type VoucherListItem = {
    walletVoucher: WalletVoucher;
    voucher: WalletVoucher['voucher'];
    reason?: string;
};

const voucherModalCopy = {
    vi: {
        choose: 'Chọn phiếu',
        change: 'Đổi phiếu',
        title: 'Chọn phiếu giảm giá',
        subtitle: 'Chọn phiếu phù hợp để áp dụng cho đơn đặt tour.',
        eligible: 'Có thể áp dụng',
        ineligible: 'Không đủ điều kiện',
        empty: 'Không có phiếu giảm giá nào khả dụng',
        noEligible: 'Không có voucher nào đủ điều kiện cho đơn này.',
        select: 'Áp dụng',
        expired: 'Voucher đã hết hạn',
        minOrder: 'Cần đặt tối thiểu',
        close: 'Đóng',
        expires: 'Hết hạn',
        noExpiry: 'Không giới hạn thời hạn',
    },
    en: {
        choose: 'Choose voucher',
        change: 'Change voucher',
        title: 'Choose a voucher',
        subtitle: 'Select the best voucher for this booking.',
        eligible: 'Available',
        ineligible: 'Not eligible',
        empty: 'No vouchers available',
        noEligible: 'No voucher is eligible for this order.',
        select: 'Apply',
        expired: 'Voucher has expired',
        minOrder: 'Minimum order',
        close: 'Close',
        expires: 'Expires',
        noExpiry: 'No expiry limit',
    },
};

export default function OrderSummary({
    tourData,
    departureDate,
    transport,
    selectedPackage,
    adultCount,
    childCount,
    infantCount,
    prices,
    subtotal,
    totalPrice,
    discountAmount,
    appliedVoucher,
    voucherCode,
    setVoucherCode,
    voucherError,
    setVoucherError,
    isValidating,
    onApplyVoucher,
    onRemoveVoucher,
    myWalletVouchers,
    showWalletDropdown,
    setShowWalletDropdown,
    isSaleDeparture = false,
    saleVoucherMessage = '',
    isPaymentLoading,
    onPayment,
    agreedToTerms,
    setAgreedToTerms,
    onChangeGuest,
    canIncreaseAdults,
    canIncreaseChildren,
    canIncreaseInfants,
    maxPeopleReached,
    maxPeople,
    t,
    formatPrice,
}: OrderSummaryProps) {
    const { language, formatDate } = useLocale();
    const voucherText = language === 'vi' ? voucherModalCopy.vi : voucherModalCopy.en;
    const [showTransport, setShowTransport] = useState(true);
    const hasTransport = Boolean(transport && transport.type !== 'SELF_ARRANGED');

    const voucherGroups = useMemo(() => {
        const applicable: VoucherListItem[] = [];
        const notApplicable: VoucherListItem[] = [];

        myWalletVouchers.forEach((walletVoucher) => {
            const localizedVoucher = getLocalizedVoucher(walletVoucher.voucher, language);
            const minOrder = localizedVoucher?.minOrderValue ?? 0;
            const expiryDate = localizedVoucher?.expiryDate ? new Date(localizedVoucher.expiryDate) : null;
            const isExpired = Boolean(expiryDate && expiryDate < new Date());

            if (isExpired) {
                notApplicable.push({
                    walletVoucher,
                    voucher: localizedVoucher,
                    reason: voucherText.expired,
                });
                return;
            }

            if (minOrder > 0 && subtotal < minOrder) {
                notApplicable.push({
                    walletVoucher,
                    voucher: localizedVoucher,
                    reason: `${voucherText.minOrder} ${formatPrice(minOrder)}`,
                });
                return;
            }

            applicable.push({
                walletVoucher,
                voucher: localizedVoucher,
            });
        });

        return { applicable, notApplicable };
    }, [formatPrice, language, myWalletVouchers, subtotal, voucherText.expired, voucherText.minOrder]);

    useEffect(() => {
        if (!showWalletDropdown) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowWalletDropdown(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setShowWalletDropdown, showWalletDropdown]);

    const handleSelectWalletVoucher = (code: string) => {
        setVoucherCode(code);
        setVoucherError('');
        onApplyVoucher(code);
        setShowWalletDropdown(false);
    };

    const formatVoucherDiscount = (voucher: WalletVoucher['voucher']) => (
        voucher.discountType === 'PERCENTAGE' ? `-${voucher.discountValue}%` : `-${formatPrice(voucher.discountValue)}`
    );

    const formatVoucherExpiry = (expiryDate?: string | null) => (
        expiryDate ? `${voucherText.expires}: ${formatDate(expiryDate)}` : voucherText.noExpiry
    );

    return (
        <div className="lg:col-span-4 sticky top-28">
            <div className="bg-white rounded-2xl ambient-shadow border border-outline-variant/20 overflow-hidden flex flex-col max-h-[calc(100vh-7.5rem)]">
                <div className="shrink-0 bg-surface-container-low p-6 border-b border-outline-variant/20">
                    <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">receipt_long</span>
                        {t('checkout.orderSummary')}
                    </h2>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Tour Info */}
                    <div className="flex gap-4 items-start">
                        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl shrink-0 shadow-sm overflow-hidden">
                            <Image
                                alt={tourData.name}
                                className="object-cover"
                                src={tourData.imageUrl || 'https://images.unsplash.com/photo-1499681404123-6c7102ce0033?auto=format&fit=crop&q=80&w=400'}
                                fill
                                sizes="96px"
                            />
                        </div>
                        <div>
                            <h3 className="font-headline font-bold text-base leading-tight mb-2 text-on-surface line-clamp-2">{tourData.name}</h3>
                            <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium mt-2">
                                <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                                <span>{t('checkout.departure')}: {formatDate(departureDate ?? tourData.startDate)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium mt-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                <span>{tourData.duration}</span>
                            </div>
                        </div>
                    </div>

                    {/* Package Info */}
                    {selectedPackage && (
                        <div className="bg-amber-50 border border-amber-100/50 rounded-xl p-3.5 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-amber-700 text-sm">hotel_class</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-0.5">Gói Dịch Vụ</p>
                                <p className="font-semibold text-amber-900 text-sm">{selectedPackage.name}</p>
                            </div>
                        </div>
                    )}

                    {/* Transport Info (thu gọn được) */}
                    {hasTransport && transport && (
                        <div className="pt-4 border-t border-dashed border-outline-variant/40">
                            <button
                                type="button"
                                onClick={() => setShowTransport(prev => !prev)}
                                aria-expanded={showTransport}
                                className="flex w-full items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
                            >
                                <span className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-primary">directions_bus</span>
                                    {language === 'vi' ? 'Thông tin di chuyển' : 'Transport details'}
                                </span>
                                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${showTransport ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>
                            {showTransport && (
                                <div className="mt-3">
                                    <TransportSummaryCard transport={transport} language={language} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Guest Stepper + Price Breakdown */}
                    <div className="space-y-2 pt-4 border-t border-dashed border-outline-variant/40">
                        {([
                            { key: 'adults' as const, label: t('tour_detail.guestsAdults'), age: t('tour_detail.guestsAdultsAge'), count: adultCount, price: prices['Adult (12+)'], canDec: adultCount > 1, canInc: canIncreaseAdults },
                            { key: 'children' as const, label: t('tour_detail.guestsChildren'), age: t('tour_detail.guestsChildrenAge'), count: childCount, price: prices['Child (4-11)'], canDec: childCount > 0, canInc: canIncreaseChildren },
                            { key: 'infants' as const, label: t('tour_detail.guestsInfants'), age: t('tour_detail.guestsInfantsAge'), count: infantCount, price: prices['Infant (<4)'], canDec: infantCount > 0, canInc: canIncreaseInfants },
                        ]).map(row => (
                            <div key={row.key} className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-on-surface-variant">{row.label}</p>
                                    <p className="text-[10px] text-outline">{row.age}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onChangeGuest(row.key, -1)}
                                        disabled={!row.canDec}
                                        aria-label={`-1 ${row.label}`}
                                        className="h-8 w-8 rounded-full border-2 border-outline-variant/30 text-primary flex items-center justify-center transition-colors hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">remove</span>
                                    </button>
                                    <span className="w-6 text-center font-bold tabular-nums text-on-surface text-sm">{row.count}</span>
                                    <button
                                        type="button"
                                        onClick={() => onChangeGuest(row.key, 1)}
                                        disabled={!row.canInc}
                                        aria-label={`+1 ${row.label}`}
                                        className="h-8 w-8 rounded-full border-2 border-outline-variant/30 text-primary flex items-center justify-center transition-colors hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">add</span>
                                    </button>
                                </div>
                                <span className="text-sm font-semibold text-on-surface tabular-nums shrink-0 w-24 text-right">
                                    {row.count > 0 ? formatPrice(row.count * row.price) : '—'}
                                </span>
                            </div>
                        ))}
                        {maxPeopleReached && (
                            <p className="text-[11px] text-amber-600 pt-1">
                                {t('tour_detail.guestsMaxReached', { max: maxPeople })}
                            </p>
                        )}
                        {infantCount > 0 && (
                            <p className="text-[11px] text-outline pt-1">{t('tour_detail.guestsInfantSeatNote')}</p>
                        )}
                    </div>

                    {/* Voucher Section */}
                    <div className="pt-4 border-t border-dashed border-outline-variant/40">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                                <span className="material-symbols-outlined text-sm text-primary">confirmation_number</span>
                                {t('checkout.voucherTitle')}
                            </p>
                            {!isSaleDeparture && (
                                <button
                                    type="button"
                                    onClick={() => setShowWalletDropdown(true)}
                                    className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-primary transition-[transform,background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary/10 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
                                >
                                    <span className="material-symbols-outlined text-[15px] transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transform-none">confirmation_number</span>
                                    {appliedVoucher ? voucherText.change : voucherText.choose}
                                </button>
                            )}
                        </div>

                        {isSaleDeparture ? (
                            <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-4 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-amber-700 text-sm">local_offer</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('checkout.salePriceApplied')}</p>
                                    <p className="text-xs text-amber-800 leading-relaxed mt-1">
                                        {saleVoucherMessage}
                                    </p>
                                </div>
                            </div>
                        ) : appliedVoucher ? (
                            <div className="bg-tertiary/5 border border-tertiary/20 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-tertiary">{getLocalizedVoucher(appliedVoucher, language)?.label ?? appliedVoucher.label}</p>
                                        <p className="font-mono text-xs text-on-surface-variant mt-0.5">{appliedVoucher.code}</p>
                                    </div>
                                    <button onClick={onRemoveVoucher} className="text-outline hover:text-error transition-colors p-1">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-tertiary/10">
                                    <span className="text-xs text-on-surface-variant">{t('checkout.discount')}</span>
                                    <span className="font-bold text-tertiary text-sm">-{formatPrice(appliedVoucher.discountAmount)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                <div className="flex gap-2">
                                    <div className="relative min-w-0 flex-grow">
                                        <input
                                            type="text"
                                            value={voucherCode}
                                            onChange={(e) => {
                                                setVoucherCode(e.target.value.toUpperCase());
                                                if (voucherError) setVoucherError('');
                                            }}
                                            placeholder={t('checkout.enterVoucher')}
                                            className="h-12 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 pr-10 text-sm font-semibold uppercase outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[11px] placeholder:font-bold placeholder:tracking-wider focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/15"
                                            onKeyDown={(e) => e.key === 'Enter' && onApplyVoucher()}
                                        />
                                        {voucherCode && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVoucherCode('');
                                                    setVoucherError('');
                                                }}
                                                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-error"
                                            >
                                                <span className="material-symbols-outlined text-base">close</span>
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onApplyVoucher()}
                                        disabled={isValidating || !voucherCode.trim()}
                                        className="h-12 shrink-0 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-md shadow-primary/15 transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-lg hover:shadow-primary/20 active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-primary motion-reduce:transform-none motion-reduce:transition-none"
                                    >
                                        {isValidating ? '...' : t('checkout.apply')}
                                    </button>
                                </div>
                                {voucherError && (() => {
                                    const isExpired = voucherError.includes('hết hạn') || voucherError.includes('expired');
                                    const isDepleted = voucherError.includes('dùng hết') || voucherError.includes('muộn');
                                    const isMinOrder = voucherError.includes('Cần đặt') || voucherError.includes('đạt') || voucherError.includes('Minimum');
                                    const icon = isExpired ? 'event_busy'
                                        : isDepleted ? 'sentiment_dissatisfied'
                                            : isMinOrder ? 'shopping_cart'
                                                : 'info';
                                    return (
                                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/60 bg-amber-50 px-3.5 py-3">
                                            <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-amber-500">{icon}</span>
                                            <p className="text-xs font-medium leading-relaxed text-amber-800">{voucherError}</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0 space-y-4 border-t border-outline-variant/20 bg-white p-6">
                    {/* Total */}
                    <div>
                        {appliedVoucher && (
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-on-surface-variant">{t('checkout.subtotal')}</span>
                                <span className="text-on-surface-variant">{formatPrice(subtotal)}</span>
                            </div>
                        )}
                        {appliedVoucher && (
                            <div className="flex justify-between items-center mb-3 text-sm">
                                <span className="text-tertiary font-medium">{t('checkout.voucherDiscount')}</span>
                                <span className="text-tertiary font-bold">-{formatPrice(discountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-end bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                            <span className="font-headline font-bold text-on-surface-variant uppercase tracking-wider text-xs">{t('checkout.totalPayment')}</span>
                            <span className="font-headline font-black text-3xl text-primary">{formatPrice(totalPrice)}</span>
                        </div>
                    </div>

                    {/* Consent checkbox */}
                    <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-outline-variant accent-primary cursor-pointer"
                        />
                        <span className="text-xs leading-relaxed text-on-surface-variant">
                            {t('checkout.agreeIntro')}{' '}
                            <Link href="/terms" target="_blank" className="font-semibold text-primary hover:underline">{t('checkout.termsLink')}</Link>
                            {' '}{t('checkout.agreeConnector')}{' '}
                            <Link href="/refund-policy" target="_blank" className="font-semibold text-primary hover:underline">{t('checkout.refundLink')}</Link>.
                        </span>
                    </label>

                    {/* Pay Button */}
                    <button
                        onClick={onPayment}
                        disabled={isPaymentLoading || !agreedToTerms}
                        className={`group flex min-h-[56px] w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 py-4 text-base font-bold text-white shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none ${isPaymentLoading || !agreedToTerms ? 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:bg-primary hover:shadow-lg active:scale-100' : ''}`}
                    >
                        <span>{isPaymentLoading ? t('checkout.redirecting') : t('checkout.secureCheckout')}</span>
                        <span className="material-symbols-outlined text-xl transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 motion-reduce:transform-none">{isPaymentLoading ? 'hourglass_empty' : 'lock'}</span>
                    </button>
                </div>
            </div>
            {showWalletDropdown && !isSaleDeparture && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setShowWalletDropdown(false);
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="voucher-wallet-title"
                        className="flex max-h-[calc(100vh-48px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200 md:max-h-[760px]"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/15 px-5 py-5 md:px-6">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2.5">
                                    <span className="material-symbols-outlined text-primary text-[22px]">confirmation_number</span>
                                    <h3 id="voucher-wallet-title" className="font-headline text-xl font-extrabold text-on-surface">
                                        {voucherText.title}
                                    </h3>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                                    {voucherText.subtitle}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowWalletDropdown(false)}
                                aria-label={voucherText.close}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant/25 text-on-surface-variant transition-[transform,background-color,color,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="min-h-[260px] overflow-y-auto px-5 py-5 md:px-6">
                            {myWalletVouchers.length === 0 ? (
                                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-outline">
                                        <span className="material-symbols-outlined text-4xl">local_offer</span>
                                    </div>
                                    <p className="mt-4 text-sm font-semibold text-on-surface-variant">{voucherText.empty}</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {voucherGroups.applicable.length > 0 && (
                                        <section className="space-y-2.5">
                                            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                                {voucherText.eligible} ({voucherGroups.applicable.length})
                                            </p>
                                            <div className="space-y-2.5">
                                                {voucherGroups.applicable.map(({ walletVoucher, voucher }) => (
                                                    <button
                                                        key={walletVoucher.id}
                                                        type="button"
                                                        onClick={() => handleSelectWalletVoucher(voucher.code)}
                                                        className="group flex w-full items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3.5 text-left transition-[transform,background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-lg hover:shadow-primary/10 active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none"
                                                    >
                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-white">
                                                            <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="flex items-center justify-between gap-3">
                                                                <span className="truncate text-sm font-extrabold text-on-surface">{voucher.code}</span>
                                                                <span className="shrink-0 text-sm font-extrabold text-emerald-700">{formatVoucherDiscount(voucher)}</span>
                                                            </span>
                                                            <span className="mt-1 block truncate text-xs font-medium text-on-surface-variant">{voucher.label}</span>
                                                            <span className="mt-1 block text-[11px] text-outline">{formatVoucherExpiry(voucher.expiryDate)}</span>
                                                        </span>
                                                        <span className="hidden shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white sm:inline-flex">
                                                            {voucherText.select}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {voucherGroups.notApplicable.length > 0 && (
                                        <section className="space-y-2.5">
                                            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-outline">
                                                <span className="material-symbols-outlined text-[15px]">block</span>
                                                {voucherText.ineligible} ({voucherGroups.notApplicable.length})
                                            </p>
                                            <div className="space-y-2.5">
                                                {voucherGroups.notApplicable.map(({ walletVoucher, voucher, reason }) => (
                                                    <div
                                                        key={walletVoucher.id}
                                                        className="flex items-center gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-low/60 px-4 py-3.5 opacity-70"
                                                    >
                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-outline shadow-sm">
                                                            <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="flex items-center justify-between gap-3">
                                                                <span className="truncate text-sm font-extrabold text-on-surface-variant line-through">{voucher.code}</span>
                                                                <span className="shrink-0 text-sm font-extrabold text-outline">{formatVoucherDiscount(voucher)}</span>
                                                            </span>
                                                            <span className="mt-1 block truncate text-xs font-medium text-on-surface-variant">{voucher.label}</span>
                                                            <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-error/75">
                                                                <span className="material-symbols-outlined text-[13px]">info</span>
                                                                {reason}
                                                            </span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {voucherGroups.applicable.length === 0 && voucherGroups.notApplicable.length > 0 && (
                                        <p className="rounded-xl bg-surface-container-low px-4 py-3 text-center text-xs font-medium italic text-on-surface-variant">
                                            {voucherText.noEligible}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

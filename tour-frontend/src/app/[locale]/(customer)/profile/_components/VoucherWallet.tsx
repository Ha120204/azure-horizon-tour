'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { getLocalizedVoucher } from '@/lib/i18n/vouchers';
import type { UserVoucher } from '@/types';

interface VoucherWalletProps {
    myVouchers: UserVoucher[];
    t: (key: string) => string;
    formatPrice: (price: number) => string;
}

const headerActionClass =
    'inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-bold text-primary transition-[transform,background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-surface-container-low hover:text-primary hover:shadow-sm hover:shadow-primary/5 active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 motion-reduce:transform-none motion-reduce:transition-none';

function VoucherCard({
    uv,
    t,
    formatPrice,
    showAvailableStatus = true,
}: {
    uv: UserVoucher;
    t: (key: string) => string;
    formatPrice: (price: number) => string;
    showAvailableStatus?: boolean;
}) {
    const { language, formatDate } = useLocale();
    const [copied, setCopied] = useState(false);
    const isUsed = uv.status === 'used';
    const isAvailable = uv.status === 'available';
    const v = getLocalizedVoucher(uv.voucher, language);
    const discountLabel = uv.voucher.discountType === 'PERCENTAGE'
        ? `${uv.voucher.discountValue}%`
        : formatPrice(uv.voucher.discountValue);
    const discountIcon = uv.voucher.discountType === 'PERCENTAGE' ? 'percent' : 'payments';

    const handleCopy = async () => {
        if (!navigator.clipboard?.writeText) return;

        try {
            await navigator.clipboard.writeText(uv.voucher.code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className={`rounded-xl border p-3.5 transition-[transform,border-color,box-shadow] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
            isAvailable
                ? 'border-primary/20 bg-primary/5 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md hover:shadow-primary/5'
                : 'border-outline-variant/20 bg-surface-container-low opacity-60'
        }`}>
            <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    uv.voucher.discountType === 'PERCENTAGE'
                        ? 'bg-secondary/10 text-secondary'
                        : 'bg-primary/10 text-primary'
                }`}>
                    <span className="material-symbols-outlined text-[18px]">{discountIcon}</span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate font-headline text-sm font-bold text-on-surface" title={v.label}>
                                {v.label}
                            </p>
                            <p className="mt-0.5 text-xs font-extrabold text-primary">
                                {t('profile.discountValue')} {discountLabel}
                            </p>
                        </div>

                        {(!isAvailable || showAvailableStatus) && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                isAvailable ? 'bg-tertiary/10 text-tertiary' :
                                isUsed ? 'bg-outline/10 text-outline' :
                                'bg-error/10 text-error'
                            }`}>
                                {isAvailable ? t('profile.vReady') :
                                 isUsed ? t('profile.vUsed') :
                                 t('profile.vExpired')}
                            </span>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-primary/10 pt-2.5">
                        {isAvailable ? (
                            <button
                                type="button"
                                onClick={handleCopy}
                                className={`group inline-flex min-h-7 items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[11px] font-bold transition-[transform,background-color,color] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 motion-reduce:transform-none motion-reduce:transition-none ${
                                    copied
                                        ? 'bg-tertiary/10 text-tertiary'
                                        : 'bg-white/70 text-primary hover:bg-primary hover:text-white'
                                }`}
                                aria-label={`${t('profile.copyVoucherCode')} ${uv.voucher.code}`}
                            >
                                <span className="material-symbols-outlined text-[14px]">
                                    {copied ? 'check' : 'content_copy'}
                                </span>
                                {copied ? t('profile.copied') : uv.voucher.code}
                            </button>
                        ) : (
                            <span className="font-mono text-[11px] font-bold text-outline">{uv.voucher.code}</span>
                        )}

                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-on-surface-variant">
                            <span className="material-symbols-outlined text-[13px] text-outline">event</span>
                            {t('profile.expiresOn')} {formatDate(uv.voucher.expiresAt)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VoucherModal({
    vouchers,
    onClose,
    t,
    formatPrice,
}: {
    vouchers: UserVoucher[];
    onClose: () => void;
    t: (key: string) => string;
    formatPrice: (price: number) => string;
}) {
    const available = vouchers.filter(v => v.status === 'available');
    const others = vouchers.filter(v => v.status !== 'available');

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voucher-wallet-title"
        >
            <div className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl bg-surface-container-lowest shadow-2xl sm:max-w-md sm:rounded-2xl">
                <div className="flex flex-shrink-0 items-center justify-between border-b border-outline-variant/15 px-5 py-4">
                    <h3 id="voucher-wallet-title" className="flex items-center gap-2 font-headline text-base font-bold text-on-surface">
                        <span className="material-symbols-outlined text-xl text-primary">wallet</span>
                        {t('profile.voucherWallet')}
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {vouchers.length}
                        </span>
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('profile.closeVoucherWallet')}
                        className="group flex h-8 w-8 items-center justify-center rounded-full text-outline transition-[transform,background-color,color] duration-150 hover:rotate-6 hover:bg-error/10 hover:text-error active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/25 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                        <span className="material-symbols-outlined text-lg transition-transform duration-150 group-hover:scale-110 motion-reduce:transition-none">close</span>
                    </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                    {available.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                                {t('profile.vReady')} · {available.length}
                            </p>
                            {available.map(uv => (
                                <VoucherCard
                                    key={uv.id}
                                    uv={uv}
                                    t={t}
                                    formatPrice={formatPrice}
                                    showAvailableStatus={false}
                                />
                            ))}
                        </div>
                    )}

                    {others.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                                {t('profile.unavailableVouchers')} · {others.length}
                            </p>
                            {others.map(uv => (
                                <VoucherCard key={uv.id} uv={uv} t={t} formatPrice={formatPrice} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 border-t border-outline-variant/15 px-5 py-4">
                    <Link
                        href="/promotions"
                        onClick={onClose}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-on-primary shadow-sm transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-lg hover:shadow-primary/20 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                        <span className="material-symbols-outlined text-sm">explore</span>
                        {t('profile.exploreMoreVouchers')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function VoucherWallet({ myVouchers, t, formatPrice }: VoucherWalletProps) {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <div className="h-fit space-y-4 rounded-xl bg-surface-container-lowest p-8 ambient-shadow">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-headline text-xl font-bold text-on-surface">
                        <span className="material-symbols-outlined text-primary">wallet</span>
                        {t('profile.voucherWallet')}
                        {myVouchers.length > 0 && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                {myVouchers.length}
                            </span>
                        )}
                    </h2>
                    <Link href="/promotions" className={headerActionClass}>
                        {t('profile.getMore')}
                    </Link>
                </div>

                {myVouchers.length === 0 ? (
                    <div className="py-6 text-center">
                        <span className="material-symbols-outlined mb-2 text-3xl text-outline">confirmation_number</span>
                        <p className="text-sm text-outline">{t('profile.noVouchers')}</p>
                        <Link href="/promotions" className="mt-1 inline-block text-sm font-bold text-primary hover:underline">
                            {t('profile.browseOffers')}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {myVouchers.slice(0, 2).map(uv => (
                                <VoucherCard key={uv.id} uv={uv} t={t} formatPrice={formatPrice} />
                            ))}
                        </div>

                        {myVouchers.length > 2 && (
                            <div className="flex justify-center border-t border-outline-variant/15 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(true)}
                                    className={`group gap-1 ${headerActionClass}`}
                                >
                                    <span>{t('profile.viewAllVouchers')} ({myVouchers.length})</span>
                                    <span className="material-symbols-outlined text-sm transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none">
                                        chevron_right
                                    </span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {modalOpen && (
                <VoucherModal
                    vouchers={myVouchers}
                    onClose={() => setModalOpen(false)}
                    t={t}
                    formatPrice={formatPrice}
                />
            )}
        </>
    );
}

'use client';

import Link from 'next/link';
import { useLocale } from '@/app/context/LocaleContext';
import { getTranslatedVoucher } from '@/app/lib/mockTranslations';

interface VoucherWalletProps {
    myVouchers: any[];
    showAllVouchers: boolean;
    setShowAllVouchers: (v: boolean) => void;
    t: (key: string) => string;
    formatPrice: (price: number) => string;
}

export default function VoucherWallet({
    myVouchers,
    showAllVouchers,
    setShowAllVouchers,
    t,
    formatPrice,
}: VoucherWalletProps) {
    const { language } = useLocale();

    return (
        <div className="bg-surface-container-lowest p-8 rounded-xl ambient-shadow space-y-4 h-fit">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">wallet</span>
                    {t('profile.voucherWallet') || 'Ví Voucher'}
                    {myVouchers.length > 0 && (
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {myVouchers.length}
                        </span>
                    )}
                </h2>
                <Link href="/promotions" className="text-xs font-bold text-primary hover:underline underline-offset-4">
                    {t('profile.getMore') || 'Lấy thêm'}
                </Link>
            </div>

            {myVouchers.length === 0 ? (
                <div className="text-center py-6">
                    <span className="material-symbols-outlined text-3xl text-outline mb-2">confirmation_number</span>
                    <p className="text-sm text-outline">{t('profile.noVouchers') || 'Chưa có voucher nào'}</p>
                    <Link href="/promotions" className="text-primary font-bold text-sm hover:underline mt-1 inline-block">
                        {t('profile.browseOffers') || 'Xem ưu đãi'}
                    </Link>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {(showAllVouchers ? myVouchers : myVouchers.slice(0, 2)).map((uv: any) => {
                            const isExpired = uv.status === 'expired';
                            const isUsed = uv.status === 'used';
                            const isAvailable = uv.status === 'available';
                            const v = getTranslatedVoucher(uv.voucher, language);

                            return (
                                <div
                                    key={uv.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        isAvailable
                                            ? 'border-primary/20 bg-primary/5'
                                            : 'border-outline-variant/20 bg-surface-container-low opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold font-headline text-sm text-on-surface">{v.label}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            isAvailable ? 'bg-tertiary/10 text-tertiary' :
                                            isUsed ? 'bg-outline/10 text-outline' :
                                            'bg-error/10 text-error'
                                        }`}>
                                            {isAvailable ? (t('profile.vReady') || 'Sẵn sàng') :
                                             isUsed ? (t('profile.vUsed') || 'Đã dùng') :
                                             (t('profile.vExpired') || 'Hết hạn')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-mono font-bold text-primary text-sm">{uv.voucher.code}</span>
                                            <p className="text-[10px] text-outline mt-0.5">
                                                {uv.voucher.discountType === 'PERCENTAGE'
                                                    ? `Giảm ${uv.voucher.discountValue}%`
                                                    : `Giảm ${formatPrice(uv.voucher.discountValue)}`
                                                }
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-outline">
                                            HSD: {new Date(uv.voucher.expiresAt).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {myVouchers.length > 2 && (
                        <button
                            onClick={() => setShowAllVouchers(!showAllVouchers)}
                            className="w-full pt-3 border-t border-outline-variant/15 flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">
                                {showAllVouchers ? 'expand_less' : 'expand_more'}
                            </span>
                            {showAllVouchers
                                ? (t('profile.collapseVouchers') || 'Thu gọn')
                                : (t('profile.viewAllVouchers') || `Xem tất cả (${myVouchers.length})`)}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

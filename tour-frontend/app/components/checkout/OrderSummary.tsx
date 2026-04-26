'use client';

interface AppliedVoucher {
    code: string;
    label: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
}

interface OrderSummaryProps {
    tourData: any;
    selectedPackage: any;
    adultCount: number;
    childCount: number;
    infantCount: number;
    prices: { 'Adult (12+)': number; 'Child (4-11)': number; 'Infant (<4)': number };
    taxes: number;
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
    myWalletVouchers: any[];
    showWalletDropdown: boolean;
    setShowWalletDropdown: (show: boolean) => void;
    // Payment
    isPaymentLoading: boolean;
    onPayment: () => void;
    t: (key: string, params?: Record<string, any>) => string;
    formatPrice: (price: number) => string;
}

import { useLocale } from '@/app/context/LocaleContext';
import { getTranslatedVoucher } from '@/app/lib/mockTranslations';

export default function OrderSummary({
    tourData,
    selectedPackage,
    adultCount,
    childCount,
    infantCount,
    prices,
    taxes,
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
    isPaymentLoading,
    onPayment,
    t,
    formatPrice,
}: OrderSummaryProps) {
    const { language } = useLocale();

    return (
        <div className="lg:col-span-4 sticky top-28">
            <div className="bg-white rounded-2xl ambient-shadow border border-outline-variant/20 overflow-hidden flex flex-col">
                <div className="bg-surface-container-low p-6 border-b border-outline-variant/20">
                    <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">receipt_long</span>
                        {t('checkout.orderSummary')}
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    {/* Tour Info */}
                    <div className="flex gap-4 items-start">
                        <img alt={tourData.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl shrink-0 shadow-sm" src={tourData.imageUrl || "https://images.unsplash.com/photo-1499681404123-6c7102ce0033?auto=format&fit=crop&q=80&w=400"} />
                        <div>
                            <h3 className="font-headline font-bold text-base leading-tight mb-2 text-on-surface line-clamp-2">{tourData.name}</h3>
                            <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium mt-2">
                                <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                                <span>{t('checkout.departure')}: {new Date(tourData.startDate).toLocaleDateString('vi-VN')}</span>
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

                    {/* Price Breakdown */}
                    <div className="space-y-3 pt-4 border-t border-dashed border-outline-variant/40 text-sm">
                        {adultCount > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-on-surface-variant font-medium">{t('checkout.adultX')} x {adultCount}</span>
                                <span className="font-semibold text-on-surface">{formatPrice(adultCount * prices['Adult (12+)'])}</span>
                            </div>
                        )}
                        {childCount > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-on-surface-variant font-medium">{t('checkout.childX')} x {childCount}</span>
                                <span className="font-semibold text-on-surface">{formatPrice(childCount * prices['Child (4-11)'])}</span>
                            </div>
                        )}
                        {infantCount > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-on-surface-variant font-medium">{t('checkout.infantX')} x {infantCount}</span>
                                <span className="font-semibold text-on-surface">{formatPrice(infantCount * prices['Infant (<4)'])}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-outline font-medium">{t('checkout.taxFee')}</span>
                            <span className="font-semibold text-outline">{formatPrice(taxes)}</span>
                        </div>
                    </div>

                    {/* ═══ Voucher Section ═══ */}
                    <div className="pt-4 border-t border-dashed border-outline-variant/40">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-primary">confirmation_number</span>
                            {t('checkout.voucherTitle')}
                        </p>

                        {appliedVoucher ? (
                            <div className="bg-tertiary/5 border border-tertiary/20 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-tertiary">{getTranslatedVoucher(appliedVoucher, language).label}</p>
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
                            <div className="relative">
                                <div className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <input
                                            type="text"
                                            value={voucherCode}
                                            onChange={(e) => {
                                                setVoucherCode(e.target.value.toUpperCase());
                                                if (voucherError) setVoucherError('');
                                            }}
                                            placeholder={t('checkout.enterVoucher')}
                                            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg pl-4 pr-10 py-3 text-sm font-mono focus:ring-1 focus:ring-primary outline-none uppercase"
                                            onKeyDown={(e) => e.key === 'Enter' && onApplyVoucher()}
                                        />
                                        {voucherCode && (
                                            <button
                                                onClick={() => {
                                                    setVoucherCode('');
                                                    setVoucherError('');
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-error transition-colors flex items-center justify-center p-1 rounded-full"
                                            >
                                                <span className="material-symbols-outlined text-base">close</span>
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onApplyVoucher()}
                                        disabled={isValidating || !voucherCode.trim()}
                                        className="px-5 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {isValidating ? '...' : t('checkout.apply')}
                                    </button>
                                </div>
                                {voucherError && (() => {
                                    // Chọn icon + màu phù hợp theo nội dung lỗi
                                    const isExpired  = voucherError.includes('hết hạn');
                                    const isDepleted = voucherError.includes('dùng hết') || voucherError.includes('muộn');
                                    const isMinOrder = voucherError.includes('Cần đặt') || voucherError.includes('đạt');
                                    const icon = isExpired ? 'event_busy'
                                               : isDepleted ? 'sentiment_dissatisfied'
                                               : isMinOrder ? 'shopping_cart'
                                               : 'info';
                                    return (
                                        <div className="mt-2.5 flex items-start gap-2.5 bg-amber-50 border border-amber-200/60 rounded-xl px-3.5 py-3">
                                            <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">{icon}</span>
                                            <p className="text-amber-800 text-xs leading-relaxed font-medium">{voucherError}</p>
                                        </div>
                                    );
                                })()}

                                {myWalletVouchers.length > 0 && (
                                    <div className="mt-3">
                                        <button
                                            onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                                            className="text-xs text-primary font-bold flex items-center gap-1 hover:underline underline-offset-4"
                                        >
                                            <span className="material-symbols-outlined text-sm">wallet</span>
                                            {t('checkout.chooseFromWallet')} ({myWalletVouchers.length})
                                            <span className={`material-symbols-outlined text-sm transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                        {showWalletDropdown && (
                                            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                                                {myWalletVouchers.map((uv: any) => {
                                                    const v = getTranslatedVoucher(uv.voucher, language);
                                                    return (
                                                    <button
                                                        key={uv.id}
                                                        onClick={() => {
                                                            setVoucherCode(v.code);
                                                            onApplyVoucher(v.code);
                                                        }}
                                                        className="w-full text-left p-3 bg-surface-container-low rounded-lg border border-outline-variant/10 hover:border-primary/30 hover:bg-primary/5 transition-all"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-mono font-bold text-xs text-primary">{v.code}</span>
                                                            <span className="text-[10px] font-bold text-tertiary">
                                                                {v.discountType === 'PERCENTAGE' ? `-${v.discountValue}%` : `-${formatPrice(v.discountValue)}`}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-outline mt-1">{v.label}</p>
                                                    </button>
                                                )})}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Total */}
                    <div className="pt-4 mt-2 border-t-2 border-primary/10">
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

                    {/* Pay Button */}
                    <button
                        onClick={onPayment}
                        disabled={isPaymentLoading}
                        className={`w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95 text-base ${isPaymentLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <span>{isPaymentLoading ? t('checkout.redirecting') : t('checkout.secureCheckout')}</span>
                        <span className="material-symbols-outlined text-xl">{isPaymentLoading ? 'hourglass_empty' : 'lock'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

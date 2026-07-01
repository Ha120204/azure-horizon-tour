import React from 'react';
import { TourPackage } from '@/types';
import { getSaleAdjustedUnitPrice } from '@/lib/booking/passengerPricing';

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

interface PackageCardProps {
    pkg: TourPackage;
    selected: boolean;
    onSelect: () => void;
    formatPrice: (n: number) => string;
    tourPrice: number;
    departurePrice: number | null | undefined;
    t: TranslationFn;
}

export default function PackageCard({
    pkg,
    selected,
    onSelect,
    formatPrice,
    tourPrice,
    departurePrice,
    t,
}: PackageCardProps) {
    const salePrice = getSaleAdjustedUnitPrice(pkg.price, tourPrice, departurePrice);
    const isOnSale = pkg.price > 0 && salePrice < pkg.price;
    const BADGE_STYLES: Record<string, string> = {
        'POPULAR': 'bg-orange-100 text-orange-700 border-orange-200',
        'BEST VALUE': 'bg-blue-100 text-blue-700 border-blue-200',
        'LUXURY': 'bg-violet-100 text-violet-700 border-violet-200',
    };
    
    const BADGE_ICON: Record<string, string> = {
        'POPULAR': '🔥',
        'BEST VALUE': '💎',
        'LUXURY': '✨',
    };

    const BADGE_LABEL_KEY: Record<string, string> = {
        'POPULAR': 'tour_detail.badgePopular',
        'BEST VALUE': 'tour_detail.badgeBestValue',
        'LUXURY': 'tour_detail.badgeLuxury',
    };

    return (
        <button
            onClick={onSelect}
            className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                selected
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-outline-variant/20 hover:border-primary/30 hover:shadow-sm'
            }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        selected ? 'border-primary bg-primary' : 'border-outline-variant/40'
                    }`}>
                        {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                        <p className="font-bold text-base text-on-surface leading-tight">{pkg.name}</p>
                        {pkg.description && <p className="text-sm text-on-surface-variant mt-0.5">{pkg.description}</p>}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {isOnSale && (
                        <p className="text-xs font-medium text-on-surface-variant line-through leading-none">
                            {formatPrice(pkg.price)}
                        </p>
                    )}
                    <p className="text-lg font-extrabold text-primary leading-none">
                        {pkg.price > 0 ? formatPrice(isOnSale ? salePrice : pkg.price) : t('tour_detail.packageFree')}
                    </p>
                    {pkg.price > 0 && <p className="text-[10px] text-on-surface-variant">{t('tour_detail.packagePerPerson')}</p>}
                    {pkg.badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${BADGE_STYLES[pkg.badge] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {BADGE_ICON[pkg.badge]} {BADGE_LABEL_KEY[pkg.badge] ? t(BADGE_LABEL_KEY[pkg.badge]) : pkg.badge}
                        </span>
                    )}
                </div>
            </div>

            {/* Includes / Excludes */}
            <div className="grid grid-cols-2 gap-3">
                {pkg.includes && pkg.includes.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">{t('tour_detail.packageIncludes')}</p>
                        <ul className="space-y-1">
                            {pkg.includes.map(item => (
                                <li key={item} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {pkg.excludes && pkg.excludes.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1.5">{t('tour_detail.packageExcludes')}</p>
                        <ul className="space-y-1">
                            {pkg.excludes.map(item => (
                                <li key={item} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </button>
    );
}

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslations, useLocale as useNextIntlLocale } from 'next-intl';

type Currency = 'VND' | 'USD';
type Language = 'en' | 'vi';

// Tỷ giá quy đổi: 1 USD = N VNĐ (dùng để HIỂN THỊ sang USD, không để lưu trữ)
const VND_TO_USD_RATE = 26331;

interface LocaleContextType {
    language: Language;
    currency: Currency;
    setCurrency: (cur: Currency) => void;
    t: any;
    formatPrice: (amountVND: number) => string; // Nhận VNĐ, hiện theo currency đang chọn
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>('VND');
    const [isHydrated, setIsHydrated] = useState(false);

    const t = useTranslations();
    const language = useNextIntlLocale() as Language;

    useEffect(() => {
        const savedCur = localStorage.getItem('az_currency') as Currency;
        // Chỉ chấp nhận VND hoặc USD, không nhận giá trị cũ không hợp lệ
        if (savedCur === 'VND' || savedCur === 'USD') {
            setCurrencyState(savedCur);
        } else {
            // Reset về VNĐ mặc định nếu giá trị cũ không hợp lệ
            localStorage.setItem('az_currency', 'VND');
        }
        setIsHydrated(true);
    }, []);

    const setCurrency = (cur: Currency) => {
        setCurrencyState(cur);
        localStorage.setItem('az_currency', cur);
    };

    /**
     * Format giá tiền từ VNĐ (đơn vị lưu trong DB).
     * - Nếu currency = 'VND': Hiện 1.500.000 ₫
     * - Nếu currency = 'USD': Tự động chia tỷ giá → hiện $56
     */
    const formatPrice = (amountVND: number): string => {
        if (!isHydrated) {
            // SSR-safe: luôn hiện VNĐ trước khi hydrate để tránh mismatch
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0,
            }).format(amountVND);
        }

        if (currency === 'USD') {
            const amountUSD = amountVND / VND_TO_USD_RATE;
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amountUSD);
        }

        // Mặc định: VNĐ
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amountVND);
    };

    return (
        <LocaleContext.Provider value={{ language, currency, setCurrency, t, formatPrice }}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    const context = useContext(LocaleContext);
    if (!context) throw new Error('useLocale must be used within a LocaleProvider');
    return context;
}

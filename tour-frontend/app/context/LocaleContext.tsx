'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslations, useLocale as useNextIntlLocale } from 'next-intl';

type Currency = 'USD' | 'VND';
type Language = 'en' | 'vi';

const EXCHANGE_RATE = 26331; // Đồng bộ với Backend (.env USD_TO_VND_RATE)

interface LocaleContextType {
    language: Language;
    currency: Currency;
    setCurrency: (cur: Currency) => void;
    t: any; // Backward compatible signature 
    formatPrice: (amountUSD: number) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>('USD');
    const [isHydrated, setIsHydrated] = useState(false);

    // Sử dụng sức mạnh của next-intl
    const t = useTranslations();
    const language = useNextIntlLocale() as Language;

    useEffect(() => {
        const savedCur = localStorage.getItem('az_currency') as Currency;
        if (savedCur) setCurrencyState(savedCur);
        setIsHydrated(true);
    }, []);

    const setCurrency = (cur: Currency) => {
        setCurrencyState(cur);
        localStorage.setItem('az_currency', cur);
    };

    const formatPrice = (amountUSD: number): string => {
        if (currency === 'VND') {
            const amountVND = Math.round((amountUSD * EXCHANGE_RATE) / 1000) * 1000;
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0,
            }).format(amountVND);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amountUSD);
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

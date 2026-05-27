'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, ReactNode } from 'react';
import { useTranslations, useLocale as useNextIntlLocale } from 'next-intl';

type Currency = 'VND' | 'USD';
type Language = 'en' | 'vi';
type DateInput = string | number | Date;
type TranslationFn = ReturnType<typeof useTranslations>;

const VND_TO_USD_RATE = 26331;
const DEFAULT_CURRENCY: Currency = 'VND';
const CURRENCY_CHANGE_EVENT = 'az_currency_change';

interface LocaleContextType {
    language: Language;
    currency: Currency;
    setCurrency: (cur: Currency) => void;
    t: TranslationFn;
    formatPrice: (amountVND: number) => string;
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string;
    formatDateTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

function normalizeCurrency(value: string | null): Currency {
    return value === 'USD' || value === 'VND' ? value : DEFAULT_CURRENCY;
}

function getIntlLocale(language: Language) {
    return language === 'vi' ? 'vi-VN' : 'en-US';
}

function toValidDate(value: DateInput) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getCurrencySnapshot(): Currency {
    if (typeof window === 'undefined') return DEFAULT_CURRENCY;
    return normalizeCurrency(localStorage.getItem('az_currency'));
}

function subscribeCurrency(onStoreChange: () => void) {
    if (typeof window === 'undefined') return () => {};

    window.addEventListener('storage', onStoreChange);
    window.addEventListener(CURRENCY_CHANGE_EVENT, onStoreChange);

    return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener(CURRENCY_CHANGE_EVENT, onStoreChange);
    };
}

export function LocaleProvider({ children }: { children: ReactNode }) {
    const t = useTranslations();
    const language = useNextIntlLocale() as Language;
    const currency = useSyncExternalStore(subscribeCurrency, getCurrencySnapshot, () => DEFAULT_CURRENCY);

    const intlLocale = getIntlLocale(language);

    const setCurrency = useCallback((cur: Currency) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('az_currency', cur);
        window.dispatchEvent(new Event(CURRENCY_CHANGE_EVENT));
    }, []);

    const formatPrice = useCallback((amountVND: number): string => {
        if (currency === 'USD') {
            const amountUSD = amountVND / VND_TO_USD_RATE;
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amountUSD);
        }

        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amountVND);
    }, [currency]);

    const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => (
        new Intl.NumberFormat(intlLocale, options).format(value)
    ), [intlLocale]);

    const formatDate = useCallback((value: DateInput, options?: Intl.DateTimeFormatOptions) => {
        const date = toValidDate(value);
        if (!date) return '';

        return new Intl.DateTimeFormat(intlLocale, options ?? {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    }, [intlLocale]);

    const formatDateTime = useCallback((value: DateInput, options?: Intl.DateTimeFormatOptions) => {
        const date = toValidDate(value);
        if (!date) return '';

        return new Intl.DateTimeFormat(intlLocale, options ?? {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(date);
    }, [intlLocale]);

    const value = useMemo(() => ({
        language,
        currency,
        setCurrency,
        t,
        formatPrice,
        formatNumber,
        formatDate,
        formatDateTime,
    }), [currency, formatDate, formatDateTime, formatNumber, formatPrice, language, setCurrency, t]);

    return (
        <LocaleContext.Provider value={value}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    const context = useContext(LocaleContext);
    if (!context) throw new Error('useLocale must be used within a LocaleProvider');
    return context;
}

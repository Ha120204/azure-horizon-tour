'use client';
import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';
import { changeLocale } from '@/lib/i18n/setLocaleCookie';

export default function AuthLocaleSwitcher() {
    const { language } = useLocale();

    const toggle = (next: 'vi' | 'en') => {
        if (next === language) return;
        changeLocale(next);
    };

    return (
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
                type="button"
                onClick={() => toggle('vi')}
                aria-label="Tiếng Việt"
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors duration-150 ${
                    language === 'vi'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                }`}
            >
                <Image
                    src="https://flagcdn.com/w40/vn.png"
                    alt=""
                    width={16}
                    height={12}
                    className="rounded-[2px]"
                    aria-hidden="true"
                />
                VI
            </button>
            <button
                type="button"
                onClick={() => toggle('en')}
                aria-label="English"
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors duration-150 ${
                    language === 'en'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                }`}
            >
                <span className="text-sm leading-none" aria-hidden="true">🌐</span>
                EN
            </button>
        </div>
    );
}

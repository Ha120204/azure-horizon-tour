'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useLocale } from '@/context/LocaleContext';
import {
    BOOKING_PRESENTATIONS,
    type BookingPresentationKey,
} from '@/lib/booking/bookingStatus';

type Props = {
    bookingCode: string;
    tourName?: string;
    imageUrl?: string | null;
    presentationKey: BookingPresentationKey;
};

export function BookingHeroImage({ bookingCode, tourName, imageUrl, presentationKey }: Props) {
    const { t, language } = useLocale();
    const [isCodeCopied, setIsCodeCopied] = useState(false);
    const presentation = BOOKING_PRESENTATIONS[presentationKey];

    const copyBookingCode = async () => {
        if (!bookingCode) return;

        try {
            await navigator.clipboard.writeText(bookingCode);
            setIsCodeCopied(true);
        } catch {
            const input = document.createElement('textarea');
            input.value = bookingCode;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            setIsCodeCopied(document.execCommand('copy'));
            document.body.removeChild(input);
        }

        window.setTimeout(() => setIsCodeCopied(false), 1800);
    };

    return (
        <section
            aria-labelledby="booking-detail-title"
            className="relative isolate min-h-60 overflow-hidden rounded-t-[2rem] sm:min-h-72 lg:min-h-80"
        >
            <Image
                src={imageUrl || 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7'}
                alt={tourName || 'Tour image'}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

            <div className="relative flex min-h-60 flex-col justify-between gap-8 p-5 sm:min-h-72 sm:p-7 lg:min-h-80 lg:p-9">
                <div className="flex justify-end">
                    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-extrabold shadow-sm ${presentation.badgeClass}`}>
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">
                            {presentation.badgeIcon}
                        </span>
                        {t(presentation.badgeLabelKey)}
                    </span>
                </div>

                <div className="max-w-3xl">
                    <p className="mb-2 text-xs font-bold uppercase text-white/80">
                        {language === 'vi' ? 'Chi tiết vé tour' : 'Tour ticket details'}
                    </p>
                    <h1
                        id="booking-detail-title"
                        className="max-w-2xl break-words font-headline text-3xl font-extrabold leading-tight text-white drop-shadow-md sm:text-4xl"
                    >
                        {tourName || (language === 'vi' ? 'Tour của bạn' : 'Your tour')}
                    </h1>

                    <div className="mt-5 flex min-w-0 flex-wrap items-center gap-2">
                        <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-white/30 bg-black/35 px-3 py-2 text-white shadow-sm backdrop-blur-sm">
                            <span className="material-symbols-outlined shrink-0 text-base text-white/80" aria-hidden="true">
                                confirmation_number
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-white/75">
                                {t('my_bookings.bookingCodeLabel')}
                            </span>
                            <span className="min-w-0 break-all font-mono text-xs font-extrabold sm:text-sm">
                                {bookingCode}
                            </span>
                        </div>
                        <button
                            type="button"
                            title={isCodeCopied ? t('my_bookings.bookingCodeCopied') : t('my_bookings.copyBookingCode')}
                            aria-label={isCodeCopied ? t('my_bookings.bookingCodeCopied') : t('my_bookings.copyBookingCode')}
                            onClick={copyBookingCode}
                            className={`group/copy inline-flex size-11 shrink-0 items-center justify-center rounded-lg border text-white outline-none backdrop-blur-sm transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/70 active:translate-y-0 active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none ${
                                isCodeCopied
                                    ? 'border-emerald-300/70 bg-emerald-600/80'
                                    : 'border-white/30 bg-black/35 hover:border-white/60 hover:bg-black/50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/copy:scale-110 motion-reduce:transform-none" aria-hidden="true">
                                {isCodeCopied ? 'check' : 'content_copy'}
                            </span>
                        </button>
                        <span
                            aria-live="polite"
                            className={`text-xs font-bold text-white transition-opacity motion-reduce:transition-none ${isCodeCopied ? 'opacity-100' : 'opacity-0'}`}
                        >
                            {t('my_bookings.copiedShort')}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function CustomerError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations('error');

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
            <span className="material-symbols-outlined text-6xl text-red-400" aria-hidden="true">
                cloud_off
            </span>
            <h1 className="mt-6 font-headline text-3xl font-extrabold text-on-surface sm:text-4xl">
                {t('title')}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-base leading-7 text-on-surface-variant">
                {t('description')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">refresh</span>
                    {t('retry')}
                </button>
                <Link
                    href="/"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/30 bg-white px-6 py-3 text-sm font-bold text-on-surface shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                    {t('backHome')}
                </Link>
            </div>
        </div>
    );
}

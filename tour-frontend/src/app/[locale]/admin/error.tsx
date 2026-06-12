'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function AdminError({
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#060B18] px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-red-400" aria-hidden="true">
                    error
                </span>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-slate-100 sm:text-3xl">
                {t('title')}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
                {t('description')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060B18]"
                >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">refresh</span>
                    {t('retry')}
                </button>
                <Link
                    href="/admin"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-semibold text-slate-300 shadow-sm transition-colors hover:border-slate-600 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060B18]"
                >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">dashboard</span>
                    Dashboard
                </Link>
            </div>
        </div>
    );
}

"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import { useSubscribe } from '@/hooks/useSubscribe';
import type { ArticleFull } from '@/types';

interface ArticleDetailClientProps {
    article: ArticleFull;
}

export default function ArticleDetailClient({ article }: ArticleDetailClientProps) {
    const { t, formatDate: formatLocaleDate } = useLocale();
    const { email: emailInput, setEmail: setEmailInput, status: subscribeStatus, handleSubscribe } = useSubscribe();
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
    const [articleShareUrl, setArticleShareUrl] = useState('');

    useEffect(() => {
        setArticleShareUrl(`${window.location.origin}${window.location.pathname}`);
    }, []);

    const formatDate = (dateStr: string) => {
        return formatLocaleDate(dateStr, { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const copyToClipboard = async (text: string) => {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    };

    const getShareUrl = () => articleShareUrl || `${window.location.origin}${window.location.pathname}`;

    const handleCopyArticleLink = async () => {
        try {
            await copyToClipboard(getShareUrl());
            setShareStatus('copied');
        } catch {
            setShareStatus('error');
        } finally {
            setTimeout(() => setShareStatus('idle'), 3000);
        }
    };

    return (
        <>
            <Header />

            <main className="min-h-screen bg-slate-50 pt-24 overflow-x-clip">
                {/* Hero Image */}
                <section className="relative h-[50vh] md:h-[70vh] overflow-hidden">
                    <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent"></div>

                    {/* Back button overlay */}
                    <div className="absolute top-8 left-8 z-20">
                        <Link
                            href="/journal"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white text-sm font-medium hover:bg-white/20 transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            {t('journal.backToJournal')}
                        </Link>
                    </div>

                    {/* Article meta overlay */}
                    <div className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-16 lg:p-20">
                        <div className="max-w-4xl mx-auto">
                            <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-900 text-[10px] font-bold tracking-[0.15em] rounded-full mb-6">
                                {t(`journal.categories.${article.category || 'ALL'}`)}
                            </span>
                            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
                                {article.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-sm text-white">person</span>
                                    </div>
                                    <span className="font-medium text-white">{article.author}</span>
                                </div>
                                <span className="text-white/30">·</span>
                                <span>{t('journal.publishedOn')} {formatDate(article.publishedAt)}</span>
                                <span className="text-white/30">·</span>
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full font-bold text-white shadow-sm border border-white/10">
                                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                                    {article.readTime} {t('journal.mins')} {t('journal.read')}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Article Content */}
                <section className="max-w-4xl mx-auto px-6 md:px-8 py-16 md:py-20">
                    {/* Excerpt / Lead */}
                    <p className="text-xl md:text-2xl text-slate-600 leading-relaxed font-light mb-12 border-l-4 border-blue-800 pl-6">
                        {article.excerpt}
                    </p>

                    {/* Main content rendered as HTML (sanitized at write-time on the backend) */}
                    <div
                        className="prose prose-lg prose-slate max-w-none
                            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
                            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6
                            prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-6
                            prose-em:text-blue-800 prose-em:font-medium prose-em:not-italic
                            prose-strong:text-slate-800
                            prose-a:text-blue-800 prose-a:underline prose-a:underline-offset-4"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                    />

                    {/* Share & Tags */}
                    <div className="mt-16 pt-8 border-t border-slate-200">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('journal.shareArticle')}</span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopyArticleLink}
                                        aria-label={t('journal.copyLink')}
                                        className={`group/share relative w-10 h-10 rounded-full flex items-center justify-center shadow-sm shadow-slate-200/60 ring-1 ring-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 ${
                                            shareStatus === 'copied'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-white hover:bg-blue-50 text-slate-500 hover:text-primary'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{shareStatus === 'copied' ? 'check' : 'link'}</span>
                                        <span
                                            role="tooltip"
                                            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-semibold normal-case tracking-normal text-white opacity-0 shadow-xl shadow-slate-900/20 transition-all duration-150 group-hover/share:translate-y-0 group-hover/share:opacity-100 group-focus-visible/share:translate-y-0 group-focus-visible/share:opacity-100"
                                        >
                                            {t('journal.copyLink')}
                                        </span>
                                    </button>
                                    <span className="min-w-[9rem] max-w-sm text-xs font-semibold leading-5 text-slate-500" aria-live="polite">
                                        {shareStatus === 'copied' && t('journal.linkCopied')}
                                        {shareStatus === 'error' && t('journal.copyFailed')}
                                    </span>
                                </div>
                            </div>
                            <Link
                                href="/journal"
                                className="text-sm font-bold text-primary hover:underline underline-offset-4 flex items-center gap-1.5 transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                {t('journal.backToJournal')}
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ═══ Newsletter Section ═══ */}
                <section className="mb-24 bg-[#0d1d49] px-6 py-16 md:px-16 md:py-20">
                    <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-100">
                                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">mail</span>
                                {t('journal.curatedDispatch')}
                            </div>
                            <h2 className="max-w-xl font-headline text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
                                {t('journal.newsletterTitle')}
                            </h2>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100/85 md:text-lg">
                                {t('journal.newsletterDesc')}
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-white">
                                {[t('journal.newsletterPerk1'), t('journal.newsletterPerk2'), t('journal.newsletterPerk3')].map((item) => (
                                    <span key={item} className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 ring-1 ring-white/10">
                                        <span className="material-symbols-outlined text-[16px] text-[#ffd8b5]" aria-hidden="true">check</span>
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-x-8 -top-5 h-10 rounded-t-[2rem] bg-[#ffd8b5]" aria-hidden="true" />
                            <div className="relative rounded-[1.5rem] bg-white p-5 shadow-[0_18px_44px_rgba(3,18,45,0.28)] md:p-6">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Journal Letter</p>
                                        <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                                            {t('journal.receiveLetter')}
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        <span className="material-symbols-outlined" aria-hidden="true">mark_email_unread</span>
                                    </div>
                                </div>

                                <form onSubmit={handleSubscribe} noValidate className="space-y-3">
                                    <label htmlFor="journal-newsletter-email" className="sr-only">{t('journal.newsletterPlaceholder')}</label>
                                    <div className="flex flex-col gap-3 lg:flex-row">
                                        <input
                                            id="journal-newsletter-email"
                                            type="email"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            disabled={subscribeStatus === 'loading'}
                                            placeholder={t('journal.newsletterPlaceholder')}
                                            className="min-h-14 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-900 outline-none transition-[background-color,border-color,box-shadow] placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
                                        />
                                        <button
                                            disabled={subscribeStatus === 'loading'}
                                            className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-sm font-extrabold text-white shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none"
                                            type="submit"
                                        >
                                            {subscribeStatus === 'loading' ? (
                                                <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
                                            ) : (
                                                <>
                                                    {t('journal.newsletterBtn')}
                                                    <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true">arrow_forward</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5">{t('journal.noSpam')}</span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5">{t('journal.unsubscribeAnytime')}</span>
                                </div>

                                <div aria-live="polite">
                                    {subscribeStatus === 'success' && (
                                        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 animate-fade-in-up">
                                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
                                            {t('journal.newsletterSuccess')}
                                        </p>
                                    )}
                                    {subscribeStatus === 'exists' && (
                                        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 animate-fade-in-up">
                                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
                                            {t('journal.alreadySubscribed')}
                                        </p>
                                    )}
                                    {subscribeStatus === 'error' && (
                                        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 animate-fade-in-up">
                                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
                                            {t('journal.subscribeError')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}

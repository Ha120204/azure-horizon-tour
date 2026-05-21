"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { useLocale } from '@/app/context/LocaleContext';
import { API_BASE_URL } from '@/app/lib/constants';

interface ArticleFull {
    id: number;
    slug: string;
    category: string;
    title: string;
    excerpt: string;
    content: string;
    imageUrl: string;
    author: string;
    readTime: number;
    isFeatured: boolean;
    publishedAt: string;
}

export default function ArticleDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { t, language } = useLocale();
    const [article, setArticle] = useState<ArticleFull | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [emailInput, setEmailInput] = useState('');
    const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'exists' | 'error'>('idle');
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
    const [articleShareUrl, setArticleShareUrl] = useState('');

    useEffect(() => {
        if (!slug) return;
        const fetchArticle = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`http://localhost:3000/article/${slug}`);
                if (res.ok) {
                    const payload = await res.json();
                    const extracted = payload.data !== undefined ? payload.data : payload;
                    setArticle(extracted);
                }
            } catch (err) {
                console.error('Error fetching article:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchArticle();
    }, [slug]);

    useEffect(() => {
        setArticleShareUrl(`${window.location.origin}${window.location.pathname}`);
    }, []);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(
            language === 'vi' ? 'vi-VN' : 'en-US',
            { month: 'long', day: 'numeric', year: 'numeric' }
        );
    };

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = emailInput.trim();
        if (!email || !email.includes('@')) {
            setSubscribeStatus('error');
            setTimeout(() => setSubscribeStatus('idle'), 4000);
            return;
        }

        setSubscribeStatus('loading');
        try {
            const res = await fetch(`${API_BASE_URL}/subscriber/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Subscribe failed');
            setSubscribeStatus(data?.message === 'already_exists' ? 'exists' : 'success');
            setEmailInput('');
        } catch {
            setSubscribeStatus('error');
        } finally {
            setTimeout(() => setSubscribeStatus('idle'), 4000);
        }
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

    if (isLoading) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-slate-50 pt-24">
                    <div className="flex justify-center items-center py-40">
                        <span className="material-symbols-outlined text-5xl text-blue-800 animate-spin">progress_activity</span>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (!article) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-slate-50 pt-24">
                    <div className="flex flex-col items-center justify-center py-40 text-slate-500">
                        <span className="material-symbols-outlined text-6xl mb-4">article</span>
                        <p className="text-xl font-semibold">Article not found</p>
                        <Link href="/journal" className="mt-6 text-blue-800 font-bold hover:underline underline-offset-4 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            {t('journal.backToJournal')}
                        </Link>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />

            <main className="min-h-screen bg-slate-50 pt-24">
                {/* Hero Image */}
                <section className="relative h-[50vh] md:h-[70vh] overflow-hidden">
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="absolute inset-0 w-full h-full object-cover"
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
                                    {article.readTime} {t('journal.mins')} {language === 'vi' ? 'đọc' : 'read'}
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

                    {/* Main content rendered as HTML */}
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
                                        aria-label={language === 'vi' ? 'Sao chép liên kết bài viết' : 'Copy article link'}
                                        className={`group/share relative w-10 h-10 rounded-full flex items-center justify-center shadow-sm shadow-slate-200/60 ring-1 ring-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 ${
                                            shareStatus === 'copied'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-800'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{shareStatus === 'copied' ? 'check' : 'link'}</span>
                                        <span
                                            role="tooltip"
                                            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-semibold normal-case tracking-normal text-white opacity-0 shadow-xl shadow-slate-900/20 transition-all duration-150 group-hover/share:translate-y-0 group-hover/share:opacity-100 group-focus-visible/share:translate-y-0 group-focus-visible/share:opacity-100"
                                        >
                                            {language === 'vi' ? 'Sao chép liên kết bài viết' : 'Copy article link'}
                                        </span>
                                    </button>
                                    <span className="min-w-[9rem] max-w-sm text-xs font-semibold leading-5 text-slate-500" aria-live="polite">
                                        {shareStatus === 'copied' && (language === 'vi' ? 'Đã sao chép liên kết' : 'Link copied')}
                                        {shareStatus === 'error' && (language === 'vi' ? 'Không thể sao chép' : 'Could not copy')}
                                    </span>
                                </div>
                            </div>
                            <Link
                                href="/journal"
                                className="text-sm font-bold text-blue-800 hover:underline underline-offset-4 flex items-center gap-1.5 transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                {t('journal.backToJournal')}
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ═══ Newsletter Section ═══ */}
                <section className="mx-6 md:mx-16 mb-24 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-[120px]"></div>
                        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-400 rounded-full blur-[100px]"></div>
                    </div>
                    <div className="relative z-10 flex flex-col items-center text-center py-20 px-8">
                        <span className="material-symbols-outlined text-4xl text-blue-300 mb-6">mail</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white font-headline mb-4">
                            {t('journal.newsletterTitle')}
                        </h2>
                        <p className="text-blue-200/80 max-w-lg mb-10 text-lg">
                            {t('journal.newsletterDesc')}
                        </p>
                        <form onSubmit={handleSubscribe} className="flex w-full max-w-md gap-3">
                            <input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                placeholder={t('journal.newsletterPlaceholder')}
                                className="flex-grow bg-white/10 border border-white/20 rounded-xl px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm text-sm"
                                required
                            />
                            <button
                                type="submit"
                                disabled={subscribeStatus === 'loading'}
                                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all duration-200 active:scale-95 text-sm whitespace-nowrap shadow-lg shadow-blue-600/25 disabled:opacity-60 disabled:pointer-events-none"
                            >
                                {subscribeStatus === 'loading' ? '...' : t('journal.newsletterBtn')}
                            </button>
                        </form>
                        {subscribeStatus === 'success' && (
                            <p className="mt-4 text-emerald-300 text-sm font-medium animate-fade-in-up">
                                ✓ {t('journal.newsletterSuccess')}
                            </p>
                        )}
                        {subscribeStatus === 'exists' && (
                            <p className="mt-4 text-blue-200 text-sm font-medium animate-fade-in-up">
                                {language === 'vi' ? 'Email này đã được đăng ký trước đó!' : 'This email is already subscribed!'}
                            </p>
                        )}
                        {subscribeStatus === 'error' && (
                            <p className="mt-4 text-red-200 text-sm font-medium animate-fade-in-up">
                                {language === 'vi' ? 'Email không hợp lệ hoặc có lỗi.' : 'Invalid email or an error occurred.'}
                            </p>
                        )}
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}

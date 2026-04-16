"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useLocale } from '@/app/context/LocaleContext';

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
    const [subscribed, setSubscribed] = useState(false);

    useEffect(() => {
        if (!slug) return;
        const fetchArticle = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`http://localhost:3000/article/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setArticle(data);
                }
            } catch (err) {
                console.error('Error fetching article:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchArticle();
    }, [slug]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(
            language === 'vi' ? 'vi-VN' : 'en-US',
            { month: 'long', day: 'numeric', year: 'numeric' }
        );
    };

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (emailInput.trim()) {
            setSubscribed(true);
            setEmailInput('');
            setTimeout(() => setSubscribed(false), 4000);
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
                                {t(`journal.categories.${article.category}`)}
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
                                <span>{article.readTime} {t('journal.mins')} {t('journal.readTime').toLowerCase()}</span>
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
                                <div className="flex gap-2">
                                    <button className="w-10 h-10 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-800 flex items-center justify-center transition-all">
                                        <span className="material-symbols-outlined text-lg">link</span>
                                    </button>
                                    <button className="w-10 h-10 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-800 flex items-center justify-center transition-all">
                                        <span className="material-symbols-outlined text-lg">mail</span>
                                    </button>
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
                                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all duration-200 active:scale-95 text-sm whitespace-nowrap shadow-lg shadow-blue-600/25"
                            >
                                {t('journal.newsletterBtn')}
                            </button>
                        </form>
                        {subscribed && (
                            <p className="mt-4 text-emerald-300 text-sm font-medium animate-fade-in-up">
                                ✓ {t('journal.newsletterSuccess')}
                            </p>
                        )}
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}

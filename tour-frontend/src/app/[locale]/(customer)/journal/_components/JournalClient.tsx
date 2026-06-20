"use client";
import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/http/constants';
import type { Article } from '@/types';

const CATEGORIES = ["ALL", "GUIDES", "INSPIRATION", "CULTURE", "GASTRONOMY"];
const PAGE_SIZE = 6;

interface JournalClientProps {
    initialArticles: Article[];
    initialFeatured: Article | null;
    initialHasMore: boolean;
}

export default function JournalClient({ initialArticles, initialFeatured, initialHasMore }: JournalClientProps) {
    const { t, language, formatDate: formatLocaleDate } = useLocale();
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [articles, setArticles] = useState<Article[]>(initialArticles);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [isSwitching, setIsSwitching] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(false);

    const loadPage = useCallback(async (category: string, nextPage: number, append: boolean) => {
        if (append) setIsLoadingMore(true); else setIsSwitching(true);
        setError(false);
        try {
            const res = await fetch(`${API_BASE_URL}/article?category=${category}&page=${nextPage}&limit=${PAGE_SIZE}&locale=${language}`);
            if (!res.ok) throw new Error('Failed to load articles');
            const json = await res.json();
            const data: Article[] = Array.isArray(json.data) ? json.data : [];
            const meta = json.meta;
            setArticles(prev => (append ? [...prev, ...data] : data));
            setPage(nextPage);
            setHasMore(meta ? meta.currentPage < meta.totalPages : false);
        } catch {
            setError(true);
        } finally {
            if (append) setIsLoadingMore(false); else setIsSwitching(false);
        }
    }, [language]);

    const selectCategory = (cat: string) => {
        if (cat === activeCategory) return;
        setActiveCategory(cat);
        loadPage(cat, 1, false);
    };

    const handleLoadMore = () => loadPage(activeCategory, page + 1, true);

    const formatDate = (dateStr: string) => {
        return formatLocaleDate(dateStr, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <>
            <Header />

            <main className="max-w-[1440px] mx-auto min-h-screen bg-slate-50 pb-24 font-sans pt-24 overflow-x-clip">
                {/* ── Editorial Hero Header ── */}
                <header className="relative overflow-hidden pt-16 pb-0 text-center"
                    style={{ background: 'linear-gradient(160deg, #f8f7f4 0%, #eef2ff 55%, #f1f5fb 100%)' }}>
                    {/* Layered ambient glows */}
                    <div className="pointer-events-none absolute inset-0 -z-0">
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[380px] rounded-full bg-blue-200/25 blur-[90px]" />
                        <div className="absolute top-10 left-1/4 w-[300px] h-[200px] rounded-full bg-indigo-100/30 blur-[70px]" />
                        <div className="absolute top-10 right-1/4 w-[260px] h-[180px] rounded-full bg-sky-100/30 blur-[60px]" />
                    </div>

                    <div className="relative z-10 px-8 md:px-16 lg:px-24 pt-10 pb-14">
                        {/* Badge — chuẩn CNT / T+L / Airbnb Magazine */}
                        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in-up">
                            <div className="h-px w-10 bg-blue-600/40" />
                            <span className="text-[10px] font-bold tracking-[0.28em] uppercase text-blue-700 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full">
                                Journal
                            </span>
                            <div className="h-px w-10 bg-blue-600/40" />
                        </div>

                        {/* Main title */}
                        <h1 className="text-[2.75rem] sm:text-[4rem] md:text-[5.5rem] font-extrabold tracking-tighter text-slate-900 leading-[0.9] break-words animate-fade-in-up">
                            {t('journal.title').replace('.', '')}<span className="text-blue-600">.</span>
                        </h1>

                        {/* Subtitle */}
                        <p className="mt-7 text-slate-500 text-base md:text-lg max-w-xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                            {t('journal.subtitle')}
                        </p>

                        {/* Separator trước tabs */}
                        <div className="mt-12 flex items-center justify-center gap-4">
                            <div className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-slate-200" />
                            <span className="text-[10px] font-bold tracking-[0.22em] text-slate-400 uppercase">
                                {t('journal.browseByTopic')}
                            </span>
                            <div className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-slate-200" />
                        </div>
                    </div>
                </header>

                {/* Category Filter Navigation */}
                <nav className="sticky top-[80px] z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl transition-all duration-300">
                    <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-start gap-1.5 overflow-x-auto px-8 font-['Plus_Jakarta_Sans'] md:justify-center md:px-16">
                        {CATEGORIES.map((cat) => {
                            const isActive = activeCategory === cat;

                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => selectCategory(cat)}
                                    className={`group inline-flex min-h-[42px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold tracking-tight transition-[transform,background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 motion-reduce:transform-none motion-reduce:transition-none ${
                                        isActive
                                            ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                                            : 'text-slate-600 hover:bg-surface-container-low hover:text-primary'
                                    }`}
                                >
                                    <span className="whitespace-nowrap">{t(`journal.categories.${cat}`)}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* Featured Article (only on ALL tab) */}
                {activeCategory === "ALL" && initialFeatured && (
                    <section className="mt-12 px-8 md:px-16 mb-24">
                        <Link href={`/journal/${initialFeatured.slug}`}>
                            <div className="relative group overflow-hidden rounded-2xl h-[500px] md:h-[716px] flex items-end shadow-sm cursor-pointer">
                                <Image
                                    src={initialFeatured.imageUrl}
                                    alt={initialFeatured.title}
                                    fill
                                    priority
                                    sizes="100vw"
                                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                                <div className="relative z-10 p-8 md:p-16 lg:p-20 w-full max-w-4xl">
                                    <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-900 text-[10px] font-bold tracking-[0.15em] rounded-full mb-6">
                                        {t(`journal.categories.${initialFeatured.category || 'ALL'}`)}
                                    </span>
                                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                                        {initialFeatured.title}
                                    </h2>
                                    <p className="text-white/90 text-lg md:text-xl font-light mb-8 max-w-2xl leading-relaxed">
                                        {initialFeatured.excerpt}
                                    </p>
                                    <div className="flex items-center gap-6">
                                        <span className="text-[11px] font-medium text-white/70 tracking-widest uppercase">
                                            {t('journal.readTime')}: {initialFeatured.readTime} {t('journal.mins')}
                                        </span>
                                        <div className="h-px w-12 bg-white/30"></div>
                                        <span className="text-[11px] font-bold text-white tracking-widest uppercase hover:underline underline-offset-4 transition-all">
                                            {t('journal.exploreStory')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </section>
                )}

                {/* Article Grid */}
                <section className={`px-8 md:px-16 mb-32 ${activeCategory !== "ALL" ? "mt-16" : ""}`}>
                    {isSwitching ? (
                        <div className="flex justify-center items-center py-32">
                            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
                        </div>
                    ) : error && articles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center px-8">
                            <span className="material-symbols-outlined text-5xl text-slate-400 mb-4">cloud_off</span>
                            <p className="text-slate-600 font-semibold mb-6">{t('journal.loadError')}</p>
                            <button
                                type="button"
                                onClick={() => loadPage(activeCategory, 1, false)}
                                className="px-8 py-3 rounded-full bg-primary text-white text-xs font-bold tracking-[0.2em] uppercase hover:bg-primary-container transition-colors"
                            >
                                {t('journal.retry')}
                            </button>
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            {t('journal.noArticles')}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12">
                            {articles.map((article) => (
                                <Link key={article.id} href={`/journal/${article.slug}`}>
                                    <article className="flex flex-col group cursor-pointer">
                                        <div className="relative aspect-[4/5] overflow-hidden rounded-xl mb-8 bg-slate-200">
                                            <Image
                                                src={article.imageUrl}
                                                alt={article.title}
                                                fill
                                                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <div className="absolute top-6 left-6">
                                                <span className="bg-white/95 backdrop-blur px-3 py-1.5 text-[10px] font-bold tracking-widest rounded-full shadow-sm text-slate-800">
                                                    {t(`journal.categories.${article.category || 'ALL'}`)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="px-2">
                                            <div className="flex flex-wrap items-center gap-2.5 mb-4">
                                                <time className="text-[10px] text-slate-500 tracking-widest uppercase">{formatDate(article.publishedAt)}</time>
                                                <span className="text-slate-300">•</span>
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-sm tracking-widest uppercase shadow-sm">
                                                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                                                    {article.readTime} {t('journal.mins')} {t('journal.read')}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors text-slate-900">
                                                {article.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-3 leading-relaxed line-clamp-2">
                                                {article.excerpt}
                                            </p>
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Load More Button */}
                    {!isSwitching && articles.length > 0 && hasMore && (
                        <div className="mt-24 flex flex-col items-center gap-4">
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                aria-busy={isLoadingMore}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-300 px-12 py-4 text-xs font-bold tracking-[0.2em] text-slate-700 transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 active:translate-y-0 active:scale-[0.97] active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
                            >
                                {isLoadingMore && <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>}
                                {t('journal.loadMore').toUpperCase()}
                            </button>
                            {error && articles.length > 0 && (
                                <p className="text-sm font-medium text-rose-600">{t('journal.loadError')}</p>
                            )}
                        </div>
                    )}
                </section>

            </main>

            <Footer />
        </>
    );
}

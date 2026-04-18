"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useLocale } from '@/app/context/LocaleContext';

interface Article {
    id: number;
    slug: string;
    category: string;
    title: string;
    excerpt: string;
    imageUrl: string;
    author: string;
    readTime: number;
    isFeatured: boolean;
    publishedAt: string;
}

const CATEGORIES = ["ALL", "GUIDES", "INSPIRATION", "CULTURE", "GASTRONOMY"];

export default function JournalPage() {
    const { t, language } = useLocale();
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [articles, setArticles] = useState<Article[]>([]);
    const [featured, setFeatured] = useState<Article | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch articles from API
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [articlesRes, featuredRes] = await Promise.all([
                    fetch('http://localhost:3000/article'),
                    fetch('http://localhost:3000/article/featured'),
                ]);
                if (articlesRes.ok) {
                    const payload = await articlesRes.json();
                    const extracted = payload.data !== undefined ? payload.data : payload;
                    setArticles(Array.isArray(extracted) ? extracted : []);
                }
                if (featuredRes.ok) {
                    const payload = await featuredRes.json();
                    const extracted = payload.data !== undefined ? payload.data : payload;
                    setFeatured(extracted);
                }
            } catch (err) {
                console.error('Error fetching articles:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter articles by active category (exclude featured from main grid)
    const safeArticles = Array.isArray(articles) ? articles : [];
    const filteredArticles = (activeCategory === "ALL"
        ? safeArticles
        : safeArticles.filter(a => a?.category === activeCategory)
    ).filter(a => !a?.isFeatured);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(
            language === 'vi' ? 'vi-VN' : 'en-US',
            { month: 'short', day: 'numeric', year: 'numeric' }
        );
    };

    return (
        <>
            <Header />

            <main className="max-w-[1440px] mx-auto min-h-screen bg-slate-50 pb-24 font-sans pt-24">
                {/* Banner Text Header */}
                <header className="pt-24 pb-16 px-8 md:px-16 lg:px-24 text-center relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-100/40 rounded-full blur-[80px] -z-10"></div>
                    <h1 className="text-[4rem] md:text-[5.5rem] font-extrabold tracking-tighter text-slate-900 leading-[0.9] animate-fade-in-up">
                        {t('journal.title').replace('.', '')}<span className="text-blue-600">.</span>
                    </h1>
                    <p className="mt-8 text-slate-500 text-lg md:text-xl max-w-2xl mx-auto tracking-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        {t('journal.subtitle')}
                    </p>
                </header>

                {/* Category Filter Navigation */}
                <nav className="sticky top-[80px] z-40 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200 shadow-sm transition-all duration-300">
                    <div className="max-w-[1440px] mx-auto px-8 md:px-16 flex justify-start md:justify-center items-center h-20 gap-x-8 md:gap-x-12 overflow-x-auto hide-scrollbar relative">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`relative group text-xs font-bold tracking-[0.2em] transition-all duration-300 whitespace-nowrap py-4 ${activeCategory === cat
                                    ? 'text-blue-800'
                                    : 'text-slate-400 hover:text-slate-800'
                                    }`}
                            >
                                {t(`journal.categories.${cat}`)}
                                <span
                                    className={`absolute bottom-0 left-0 w-full h-[3px] bg-blue-800 rounded-t-md transition-transform duration-300 ease-out origin-left ${activeCategory === cat
                                        ? 'scale-x-100'
                                        : 'scale-x-0 group-hover:scale-x-100'
                                        }`}
                                ></span>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex justify-center items-center py-32">
                        <span className="material-symbols-outlined text-4xl text-blue-800 animate-spin">progress_activity</span>
                    </div>
                )}

                {!isLoading && (
                    <>
                        {/* Featured Article (only on ALL tab) */}
                        {activeCategory === "ALL" && featured && (
                            <section className="mt-12 px-8 md:px-16 mb-24">
                                <Link href={`/journal/${featured.slug}`}>
                                    <div className="relative group overflow-hidden rounded-2xl h-[500px] md:h-[716px] flex items-end shadow-sm cursor-pointer">
                                        <img
                                            src={featured.imageUrl}
                                            alt={featured.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                                        <div className="relative z-10 p-8 md:p-16 lg:p-20 w-full max-w-4xl">
                                            <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-900 text-[10px] font-bold tracking-[0.15em] rounded-full mb-6">
                                                {t(`journal.categories.${featured.category || 'ALL'}`)}
                                            </span>
                                            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                                                {featured.title}
                                            </h2>
                                            <p className="text-white/90 text-lg md:text-xl font-light mb-8 max-w-2xl leading-relaxed">
                                                {featured.excerpt}
                                            </p>
                                            <div className="flex items-center gap-6">
                                                <span className="text-[11px] font-medium text-white/70 tracking-widest uppercase">
                                                    {t('journal.readTime')}: {featured.readTime} {t('journal.mins')}
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
                            {filteredArticles.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    {t('journal.noArticles')}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12">
                                    {filteredArticles.map((article) => (
                                        <Link key={article.id} href={`/journal/${article.slug}`}>
                                            <article className="flex flex-col group cursor-pointer">
                                                <div className="relative aspect-[4/5] overflow-hidden rounded-xl mb-8 bg-slate-200">
                                                    <img
                                                        src={article.imageUrl}
                                                        alt={article.title}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                    <div className="absolute top-6 left-6">
                                                        <span className="bg-white/95 backdrop-blur px-3 py-1.5 text-[10px] font-bold tracking-widest rounded-full shadow-sm text-slate-800">
                                                            {t(`journal.categories.${article.category || 'ALL'}`)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="px-2">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <time className="text-[10px] text-slate-500 tracking-widest uppercase">{formatDate(article.publishedAt)}</time>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-[10px] text-slate-500 tracking-widest uppercase">{t('journal.by')} {article.author}</span>
                                                    </div>
                                                    <h3 className="text-2xl font-bold leading-tight group-hover:text-blue-800 transition-colors text-slate-900">
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
                            {filteredArticles.length > 0 && (
                                <div className="mt-24 flex justify-center">
                                    <button className="px-12 py-4 rounded-full border border-slate-300 text-slate-700 text-xs font-bold tracking-[0.2em] hover:bg-blue-800 hover:text-white hover:border-blue-800 transition-all duration-300">
                                        {t('journal.loadMore').toUpperCase()}
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* ═══ Newsletter Section ═══ */}
                        <section className="mx-8 md:mx-16 mb-24 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
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
                                <div className="flex w-full max-w-md gap-3">
                                    <input
                                        type="email"
                                        placeholder={t('journal.newsletterPlaceholder')}
                                        className="flex-grow bg-white/10 border border-white/20 rounded-xl px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm text-sm"
                                    />
                                    <button className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all duration-200 active:scale-95 text-sm whitespace-nowrap shadow-lg shadow-blue-600/25">
                                        {t('journal.newsletterBtn')}
                                    </button>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </main>

            <Footer />
        </>
    );
}
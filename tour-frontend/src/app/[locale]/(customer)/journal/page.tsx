"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/constants';

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
    const { t, language, formatDate: formatLocaleDate } = useLocale();
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [articles, setArticles] = useState<Article[]>([]);
    const [featured, setFeatured] = useState<Article | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [email, setEmail] = useState('');
    const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'exists' | 'error'>('idle');

    // Set visible count for load more functionality
    const [visibleCount, setVisibleCount] = useState(6);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setSubscribeStatus('error');
            setTimeout(() => setSubscribeStatus('idle'), 3000);
            return;
        }

        setSubscribeStatus('loading');
        try {
            const res = await fetch(`${API_BASE_URL}/subscriber/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                if (data.message === 'already_exists') {
                    setSubscribeStatus('exists');
                } else {
                    setSubscribeStatus('success');
                    setEmail('');
                }
            } else {
                setSubscribeStatus('error');
            }
        } catch {
            setSubscribeStatus('error');
        } finally {
            setTimeout(() => setSubscribeStatus('idle'), 4000);
        }
    };

    // Fetch articles from API
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [articlesRes, featuredRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/article`),
                    fetch(`${API_BASE_URL}/article/featured`),
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
    const categoryArticles = (activeCategory === "ALL"
        ? safeArticles
        : safeArticles.filter(a => a?.category === activeCategory)
    ).filter(a => !a?.isFeatured);

    const filteredArticles = categoryArticles.slice(0, visibleCount);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 6);
    };

    // Reset visible count when category changes
    useEffect(() => {
        setVisibleCount(6);
    }, [activeCategory]);

    const formatDate = (dateStr: string) => {
        return formatLocaleDate(dateStr, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <>
            <Header />

            <main className="max-w-[1440px] mx-auto min-h-screen bg-slate-50 pb-24 font-sans pt-24">
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
                        <h1 className="text-[4rem] md:text-[5.5rem] font-extrabold tracking-tighter text-slate-900 leading-[0.9] animate-fade-in-up">
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
                                {language === 'vi' ? 'Khám phá theo chủ đề' : 'Browse by topic'}
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
                                    onClick={() => setActiveCategory(cat)}
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
                                        <Image
                                            src={featured.imageUrl}
                                            alt={featured.title}
                                            fill
                                            priority
                                            sizes="100vw"
                                            className="object-cover transition-transform duration-1000 group-hover:scale-105"
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
                                                            {article.readTime} {t('journal.mins')} {language === 'vi' ? 'đọc' : 'read'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-2xl font-bold leading-tight group-hover:text-blue-800 transition-colors text-slate-900">
                                                        {language === 'en' ? `Travel Journal: ${article.title}` : article.title}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 mt-3 leading-relaxed line-clamp-2">
                                                        {language === 'en' ? `Read and discover interesting things about ${article.title} in this detailed article.` : article.excerpt}
                                                    </p>
                                                </div>
                                            </article>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* Load More Button */}
                            {filteredArticles.length > 0 && visibleCount < categoryArticles.length && (
                                <div className="mt-24 flex justify-center">
                                    <button 
                                        onClick={handleLoadMore}
                                        className="px-12 py-4 rounded-full border border-slate-300 text-slate-700 text-xs font-bold tracking-[0.2em] hover:bg-blue-800 hover:text-white hover:border-blue-800 transition-all duration-300"
                                    >
                                        {t('journal.loadMore').toUpperCase()}
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* Newsletter Section */}
                        <section className="mb-24 bg-[#0d1d49] px-6 py-16 md:px-16 md:py-20">
                            <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
                                <div>
                                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-100">
                                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">mail</span>
                                        {language === 'vi' ? 'Ấn phẩm tuyển chọn' : 'Curated dispatch'}
                                    </div>
                                    <h2 className="max-w-xl font-headline text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
                                        {t('journal.newsletterTitle')}
                                    </h2>
                                    <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100/85 md:text-lg">
                                        {t('journal.newsletterDesc')}
                                    </p>
                                    <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-white">
                                        {(language === 'vi'
                                            ? ['Câu chuyện mới mỗi tháng', 'Ưu đãi riêng', 'Gợi ý điểm đến']
                                            : ['Monthly stories', 'Private offers', 'Destination notes']
                                        ).map((item) => (
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
                                                    {language === 'vi' ? 'Nhận bản tin du lịch' : 'Receive the travel letter'}
                                                </p>
                                            </div>
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                                <span className="material-symbols-outlined" aria-hidden="true">mark_email_unread</span>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSubscribe} className="space-y-3">
                                            <label htmlFor="journal-newsletter-email" className="sr-only">{t('journal.newsletterPlaceholder')}</label>
                                            <div className="flex flex-col gap-3 lg:flex-row">
                                                <input
                                                    id="journal-newsletter-email"
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
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
                                            <span className="rounded-full bg-slate-100 px-3 py-1.5">{language === 'vi' ? 'Không spam' : 'No spam'}</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1.5">{language === 'vi' ? 'Có thể hủy bất cứ lúc nào' : 'Unsubscribe anytime'}</span>
                                        </div>

                                        <div aria-live="polite">
                                            {subscribeStatus === 'success' && (
                                                <p className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 animate-fade-in-up">
                                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
                                                    {language === 'vi' ? 'Đăng ký nhận tin thành công!' : 'Successfully subscribed!'}
                                                </p>
                                            )}
                                            {subscribeStatus === 'exists' && (
                                                <p className="mt-5 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 animate-fade-in-up">
                                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
                                                    {language === 'vi' ? 'Email này đã được đăng ký trước đó!' : 'This email is already subscribed!'}
                                                </p>
                                            )}
                                            {subscribeStatus === 'error' && (
                                                <p className="mt-5 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 animate-fade-in-up">
                                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
                                                    {language === 'vi' ? 'Email không hợp lệ hoặc có lỗi.' : 'Invalid email or an error occurred.'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
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

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_BASE_URL } from '@/lib/http/constants';
import type { ArticleFull } from '@/types';
import ArticleDetailClient from './_components/ArticleDetailClient';

interface PageProps {
    params: Promise<{ slug: string; locale: string }>;
}

async function fetchArticle(slug: string, locale: string): Promise<ArticleFull | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/article/${encodeURIComponent(slug)}?locale=${locale}`, {
            next: { revalidate: 3600 },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return (json.data !== undefined ? json.data : json) ?? null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, locale } = await params;
    const article = await fetchArticle(slug, locale);

    if (!article) {
        return {
            title: locale === 'vi'
                ? 'Không tìm thấy bài viết | Azure Horizon'
                : 'Article not found | Azure Horizon',
        };
    }

    const ogTitle = article.seoTitle?.trim() || article.title;
    const description = (article.seoDescription?.trim() || article.excerpt || '').slice(0, 160);

    return {
        title: `${ogTitle} | Azure Horizon`,
        description,
        openGraph: {
            title: ogTitle,
            description,
            images: article.imageUrl ? [{ url: article.imageUrl }] : [],
            type: 'article',
        },
        alternates: {
            canonical: `/${locale}/journal/${slug}`,
        },
    };
}

export default async function ArticleDetailPage({ params }: PageProps) {
    const { slug, locale } = await params;
    const article = await fetchArticle(slug, locale);
    if (!article) notFound();

    return <ArticleDetailClient article={article} />;
}

import type { Metadata } from 'next';
import { API_BASE_URL } from '@/lib/http/constants';
import type { Article } from '@/types';
import JournalClient from './_components/JournalClient';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const isVi = locale === 'vi';

    const title = isVi
        ? 'Nhật ký du lịch — Azure Horizon'
        : 'The Journal — Azure Horizon';
    const description = isVi
        ? 'Những câu chuyện du lịch tuyển chọn: cẩm nang, cảm hứng, văn hóa và ẩm thực cho hành trình tiếp theo của bạn.'
        : 'Curated travel stories: guides, inspiration, culture and gastronomy for your next journey.';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
        },
        alternates: {
            canonical: `/${locale}/journal`,
        },
    };
}

async function fetchInitialArticles(locale: string): Promise<{ articles: Article[]; hasMore: boolean }> {
    try {
        const res = await fetch(`${API_BASE_URL}/article?page=1&limit=6&locale=${locale}`, { next: { revalidate: 3600 } });
        if (!res.ok) return { articles: [], hasMore: false };
        const json = await res.json();
        const articles: Article[] = Array.isArray(json.data) ? json.data : [];
        const meta = json.meta;
        return { articles, hasMore: meta ? meta.currentPage < meta.totalPages : false };
    } catch {
        return { articles: [], hasMore: false };
    }
}

async function fetchFeatured(locale: string): Promise<Article | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/article/featured?locale=${locale}`, { next: { revalidate: 3600 } });
        if (!res.ok) return null;
        const json = await res.json();
        return (json.data !== undefined ? json.data : json) ?? null;
    } catch {
        return null;
    }
}

export default async function JournalPage({ params }: PageProps) {
    const { locale } = await params;
    const [{ articles, hasMore }, featured] = await Promise.all([fetchInitialArticles(locale), fetchFeatured(locale)]);

    return <JournalClient initialArticles={articles} initialFeatured={featured} initialHasMore={hasMore} />;
}

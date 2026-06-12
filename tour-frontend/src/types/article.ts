export interface Article {
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

export interface ArticleFull extends Article {
    content: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
}

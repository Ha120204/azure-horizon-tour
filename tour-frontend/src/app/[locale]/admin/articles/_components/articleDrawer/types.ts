// ── Types ─────────────────────────────────────────────────────────────────────
export interface Article {
    id: number;
    slug: string;
    title: string;
    titleEn?: string | null;
    category: string;
    excerpt: string;
    excerptEn?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    content?: string;
    contentEn?: string | null;
    imageUrl: string;
    author: string;
    readTime: number;
    isFeatured: boolean;
    publishedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    status?: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
    reviewNote?: string | null;
    createdById?: number | null;
}

export interface ArticleDrawerProps {
    mode: 'create' | 'edit';
    article?: Article | null;
    userRole?: string;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export type ArticleForm = {
    slug: string;
    title: string;
    titleEn: string;
    category: string;
    excerpt: string;
    excerptEn: string;
    seoTitle: string;
    seoDescription: string;
    content: string;
    contentEn: string;
    imageUrl: string;
    author: string;
    readTime: number;
    isFeatured: boolean;
};

export type SaveAction = 'draft' | 'submit' | 'publish';

// ── Constants ─────────────────────────────────────────────────────────────────
export const EMPTY_FORM: ArticleForm = {
    slug: '',
    title: '',
    titleEn: '',
    category: 'GUIDES',
    excerpt: '',
    excerptEn: '',
    seoTitle: '',
    seoDescription: '',
    content: '',
    contentEn: '',
    imageUrl: '',
    author: '',
    readTime: 1,
    isFeatured: false,
};

export const CATEGORIES = [
    { value: 'GUIDES',      label: 'Hướng dẫn',  icon: 'map',          color: 'text-blue-600',   bg: 'bg-blue-50   border-blue-200' },
    { value: 'INSPIRATION', label: 'Cảm hứng',   icon: 'auto_awesome', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
    { value: 'CULTURE',     label: 'Văn hóa',    icon: 'museum',       color: 'text-teal-600',   bg: 'bg-teal-50   border-teal-200' },
    { value: 'GASTRONOMY',  label: 'Ẩm thực',    icon: 'restaurant',   color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
];

export const QUILL_MODULES = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        [{ align: [] }],
        ['clean'],
    ],
};

export const QUILL_FORMATS = [
    'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'link', 'image', 'align',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export function normalizeSeoSlug(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export const articleToForm = (article?: Partial<Article> | null): ArticleForm => ({
    slug:       article?.slug       ?? '',
    title:      article?.title      ?? '',
    titleEn:    article?.titleEn     ?? '',
    category:   article?.category   ?? 'GUIDES',
    excerpt:    article?.excerpt    ?? '',
    excerptEn:  article?.excerptEn   ?? '',
    seoTitle:   article?.seoTitle   ?? '',
    seoDescription: article?.seoDescription ?? '',
    content:    article?.content    ?? '',
    contentEn:  article?.contentEn   ?? '',
    imageUrl:   article?.imageUrl   ?? '',
    author:     article?.author     ?? '',
    readTime:   article?.readTime   ?? 1,
    isFeatured: article?.isFeatured ?? false,
});

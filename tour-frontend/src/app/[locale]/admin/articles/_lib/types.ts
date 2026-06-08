import type { Article } from '../_components/ArticleDrawer';

export type ArticleStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
export type ArticleViewMode = 'list' | 'grid';
export type ArticleReviewAction = 'approve' | 'reject';

export interface SharedArticleViewProps {
  articles: Article[];
  isLoading: boolean;
  hasFilter: boolean;
  isAdmin: boolean;
  userId: number | null;
  isSubmitting: number | null;
  onCreate: () => void;
  onOpenEdit: (article: Article) => void;
  onToggleFeatured: (article: Article) => void;
  onReview: (target: { article: Article; action: ArticleReviewAction }) => void;
  onSubmit: (article: Article) => void;
  onDelete: (article: Article) => void;
}
export type ArticleBulkAction = 'publish' | 'draft' | 'trash' | 'feature' | 'unfeature' | 'category' | 'submit';
export type ArticleBulkActionOptions = { category?: string; skipConfirm?: boolean };
export type ArticleSortKey = 'title' | 'category' | 'author' | 'publishedAt' | 'status' | 'isFeatured';
export type SortDirection = 'asc' | 'desc';
export type ArticleKpiTone = 'blue' | 'slate' | 'amber' | 'emerald' | 'red' | 'violet';

export type TrashArticle = Article & {
  deletedAt?: string | null;
};

export type ArticleStats = {
  totalVisible: number;
  published: number;
  draft: number;
  pending: number;
  rejected: number;
  featured: number;
  topCategory: { category: string; count: number } | null;
};

export type ArticleMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage?: number;
};

export type ArticleToastState = {
  msg: string;
  ok: boolean;
};

export type ArticleKpiCard = {
  icon: string;
  label: string;
  value: number;
  sub: string;
  tone: ArticleKpiTone;
  onClick: () => void;
  active: boolean;
  resetCard?: boolean;
};

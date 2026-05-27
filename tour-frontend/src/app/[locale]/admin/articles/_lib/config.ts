import type { ArticleStats, ArticleStatus } from './types';

export const CATEGORY_CFG: Record<string, { label: string; icon: string; color: string; badge: string }> = {
  GUIDES: { label: 'Hướng dẫn', icon: 'map', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  INSPIRATION: { label: 'Cảm hứng', icon: 'auto_awesome', color: 'text-violet-600', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  CULTURE: { label: 'Văn hóa', icon: 'museum', color: 'text-teal-600', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  GASTRONOMY: { label: 'Ẩm thực', icon: 'restaurant', color: 'text-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
};

export const STATUS_CFG: Record<ArticleStatus, { label: string; icon: string; cls: string }> = {
  DRAFT: { label: 'Nháp', icon: 'edit_note', cls: 'bg-surface-container text-on-surface-variant' },
  PENDING_REVIEW: { label: 'Chờ duyệt', icon: 'pending_actions', cls: 'bg-amber-100 text-amber-700' },
  PUBLISHED: { label: 'Đã duyệt', icon: 'check_circle', cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Từ chối', icon: 'cancel', cls: 'bg-red-100 text-red-700' },
};

export const EMPTY_STATS: ArticleStats = {
  totalVisible: 0,
  published: 0,
  draft: 0,
  pending: 0,
  rejected: 0,
  featured: 0,
  topCategory: null,
};

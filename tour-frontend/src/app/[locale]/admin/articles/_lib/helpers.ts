import { CATEGORY_CFG, STATUS_CFG } from './config';
import type { ArticleStatus } from './types';

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
};

export const getCatCfg = (cat: string) =>
  CATEGORY_CFG[cat] ?? {
    label: cat,
    icon: 'article',
    color: 'text-on-surface-variant',
    badge: 'bg-surface-container text-on-surface-variant border-outline-variant/20',
  };

export const getStatusCfg = (s: string) => STATUS_CFG[s as ArticleStatus] ?? STATUS_CFG.DRAFT;

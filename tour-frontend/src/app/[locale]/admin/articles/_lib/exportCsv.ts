import type { Article } from '../_components/ArticleDrawer';
import { fmtDate, getCatCfg, getStatusCfg } from './helpers';

const ARTICLE_EXPORT_HEADERS = [
  'ID',
  'Tiêu đề',
  'Danh mục',
  'Tác giả',
  'Trạng thái',
  'Nổi bật',
  'Ngày xuất bản',
  'Ngày tạo',
];

const quoteCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function exportArticlesCsv(articles: Article[]): number {
  if (articles.length === 0) return 0;

  const rows = articles.map(article => [
    article.id,
    article.title,
    getCatCfg(article.category).label,
    article.author,
    getStatusCfg(article.status ?? 'PUBLISHED').label,
    article.isFeatured ? 'Có' : 'Không',
    article.publishedAt ? fmtDate(article.publishedAt) : '',
    fmtDate(article.createdAt),
  ]);

  const csv = [
    ARTICLE_EXPORT_HEADERS.map(quoteCsv).join(','),
    ...rows.map(row => row.map(quoteCsv).join(',')),
  ].join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `azure-horizon-articles-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return articles.length;
}

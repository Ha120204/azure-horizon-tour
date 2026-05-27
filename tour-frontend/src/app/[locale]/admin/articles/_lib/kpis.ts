import type { ArticleKpiCard, ArticleStats, ArticleStatus } from './types';

interface BuildArticleKpiCardsOptions {
  isAdmin: boolean;
  hasFilter: boolean;
  articleStats: ArticleStats;
  statusFilter: string;
  featuredFilter: string;
  onResetFilters: () => void;
  onFilterByStatus: (status: ArticleStatus) => void;
  onFilterFeatured: () => void;
}

export function buildArticleKpiCards({
  isAdmin,
  hasFilter,
  articleStats,
  statusFilter,
  featuredFilter,
  onResetFilters,
  onFilterByStatus,
  onFilterFeatured,
}: BuildArticleKpiCardsOptions): ArticleKpiCard[] {
  return isAdmin
    ? [
        { icon: 'article', label: 'Tổng bài viết', value: articleStats.totalVisible, sub: 'toàn bộ bài chưa xóa', tone: 'blue', onClick: onResetFilters, active: !hasFilter },
        { icon: 'check_circle', label: 'Đã xuất bản', value: articleStats.published, sub: 'đang hiển thị với khách', tone: 'emerald', onClick: () => onFilterByStatus('PUBLISHED'), active: statusFilter === 'PUBLISHED' },
        { icon: 'pending_actions', label: 'Chờ duyệt', value: articleStats.pending, sub: 'cần Admin xử lý', tone: 'amber', onClick: () => onFilterByStatus('PENDING_REVIEW'), active: statusFilter === 'PENDING_REVIEW' },
        { icon: 'edit_note', label: 'Bản nháp', value: articleStats.draft, sub: 'chưa gửi duyệt', tone: 'slate', onClick: () => onFilterByStatus('DRAFT'), active: statusFilter === 'DRAFT' },
        { icon: 'cancel', label: 'Bị từ chối', value: articleStats.rejected, sub: 'cần chỉnh sửa lại', tone: 'red', onClick: () => onFilterByStatus('REJECTED'), active: statusFilter === 'REJECTED' },
        { icon: 'star', label: 'Nổi bật', value: articleStats.featured, sub: 'đang được ghim đầu', tone: 'violet', onClick: onFilterFeatured, active: featuredFilter === 'true' },
      ]
    : [
        { icon: 'article', label: 'Tổng hiển thị', value: articleStats.totalVisible, sub: 'bài bạn có thể xem', tone: 'blue', onClick: onResetFilters, active: !hasFilter },
        { icon: 'edit_note', label: 'Bản nháp của tôi', value: articleStats.draft, sub: 'đang soạn', tone: 'slate', onClick: () => onFilterByStatus('DRAFT'), active: statusFilter === 'DRAFT' },
        { icon: 'pending_actions', label: 'Chờ duyệt', value: articleStats.pending, sub: 'đã gửi Admin', tone: 'amber', onClick: () => onFilterByStatus('PENDING_REVIEW'), active: statusFilter === 'PENDING_REVIEW' },
        { icon: 'cancel', label: 'Cần chỉnh sửa', value: articleStats.rejected, sub: 'bị trả về', tone: 'red', onClick: () => onFilterByStatus('REJECTED'), active: statusFilter === 'REJECTED' },
        { icon: 'check_circle', label: 'Đã xuất bản', value: articleStats.published, sub: 'đang hiển thị với khách', tone: 'emerald', onClick: () => onFilterByStatus('PUBLISHED'), active: statusFilter === 'PUBLISHED' },
      ];
}

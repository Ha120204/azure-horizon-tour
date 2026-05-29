interface ReviewCountSource {
  reviews?: number | null;
}

interface TourRatingBadgeProps {
  averageRating?: number | null;
  reviewCount?: number | null;
  _count?: ReviewCountSource | null;
  notRatedLabel: string;
  reviewLabel?: string;
  reviewsLabel?: string;
  showReviewCount?: boolean;
  variant?: 'overlay' | 'surface';
  className?: string;
}

export function getTourReviewSummary({
  averageRating,
  reviewCount,
  _count,
}: Pick<TourRatingBadgeProps, 'averageRating' | 'reviewCount' | '_count'>) {
  const count = Number(reviewCount ?? _count?.reviews ?? 0);
  const rating = Number(averageRating ?? 0);
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  const safeRating = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  const hasReviewScore = safeCount > 0 && safeRating > 0;

  return {
    averageRating: hasReviewScore ? safeRating : 0,
    reviewCount: safeCount,
    hasReviewScore,
  };
}

export default function TourRatingBadge({
  averageRating,
  reviewCount,
  _count,
  notRatedLabel,
  reviewLabel,
  reviewsLabel,
  showReviewCount = true,
  variant = 'overlay',
  className = '',
}: TourRatingBadgeProps) {
  const summary = getTourReviewSummary({ averageRating, reviewCount, _count });
  const countLabel =
    summary.reviewCount === 1 ? (reviewLabel ?? reviewsLabel ?? 'review') : (reviewsLabel ?? reviewLabel ?? 'reviews');
  const ratingLabel =
    summary.hasReviewScore && showReviewCount
      ? `${summary.averageRating.toFixed(1)} - ${summary.reviewCount} ${countLabel}`
      : summary.hasReviewScore
        ? summary.averageRating.toFixed(1)
        : notRatedLabel;
  const toneClass = summary.hasReviewScore
    ? variant === 'surface'
      ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15 ring-1 ring-slate-950/5'
      : 'bg-slate-950/70 text-white shadow-sm ring-1 ring-white/15 backdrop-blur-md'
    : variant === 'surface'
      ? 'bg-white text-slate-600 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200'
      : 'bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-md';
  const iconClass = summary.hasReviewScore ? 'text-amber-400' : 'text-slate-400';

  return (
    <div
      className={`inline-flex h-8 min-w-0 max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full px-3 text-[0.68rem] font-bold leading-none ${toneClass} ${className}`}
      aria-label={ratingLabel}
      title={ratingLabel}
    >
      <span
        className={`material-symbols-outlined text-[14px] ${iconClass}`}
        style={{ fontVariationSettings: summary.hasReviewScore ? "'FILL' 1" : "'FILL' 0" }}
        aria-hidden="true"
      >
        star
      </span>
      <span className="truncate">{ratingLabel}</span>
    </div>
  );
}

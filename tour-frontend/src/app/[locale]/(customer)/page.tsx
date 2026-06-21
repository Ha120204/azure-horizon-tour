/**
 * Homepage — Server Component.
 *
 * Fetch danh sách tour server-side để:
 *  1. Google bot nhìn thấy nội dung đầy đủ (SEO)
 *  2. Không có loading skeleton — tour card xuất hiện ngay khi page load
 *  3. Cache tự động bởi Next.js (revalidate mỗi 5 phút)
 *
 * Interactive logic (video hero, payment error toast, router.push) nằm trong
 * HomeClient — được nhận `initialTours` làm prop.
 */

import type { Metadata } from 'next';
import { API_BASE_URL } from '@/lib/http/constants';
import HomeClient, { type TourSummary } from './_components/HomeClient';

// ─── SEO Metadata ─────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const isVi = locale === 'vi';

  const title = isVi
    ? 'Azure Horizon — Đặt Tour Du Lịch Cao Cấp'
    : 'Azure Horizon — Premium Tour Booking';
  const description = isVi
    ? 'Khám phá các tour du lịch cao cấp trong và ngoài nước. Đặt tour dễ dàng, trải nghiệm đẳng cấp cùng Azure Horizon.'
    : 'Discover premium domestic and international tours. Easy booking and a world-class experience with Azure Horizon.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    alternates: {
      canonical: `/${locale}`,
    },
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────

/**
 * Revalidate ISR mỗi 5 phút.
 * Tour data không thay đổi từng giây — 300s là đủ fresh cho production.
 * Thay bằng `0` nếu muốn dynamic render mỗi request.
 */
export const revalidate = 300;

// ─── Data Fetching ────────────────────────────────────────────────────────────

const FEATURED_LIMIT = 6;

interface FeaturedToursResult {
  tours: TourSummary[];
  hasError: boolean;
}

async function fetchTours(query: string): Promise<TourSummary[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/tour?${query}`, {
      // next.revalidate kế thừa từ `export const revalidate` ở module level,
      // nhưng ghi tường minh ở đây để rõ ý định.
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`[Homepage] fetchTours failed (${query}): ${res.status}`);
      return null;
    }
    const payload = await res.json();
    // Backend trả về { data: TourSummary[], meta: {...} } qua TransformInterceptor
    return Array.isArray(payload?.data) ? (payload.data as TourSummary[]) : [];
  } catch (error) {
    // Không crash trang khi backend down — phân biệt lỗi với danh sách rỗng
    console.error(`[Homepage] fetchTours error (${query}):`, error);
    return null;
  }
}

/**
 * Ưu tiên tour được admin đánh dấu nổi bật; nếu chưa đủ 6 thì lấp bằng tour mới
 * nhất (loại trùng) để mục nổi bật không bao giờ trống.
 */
async function fetchFeaturedTours(locale: string): Promise<FeaturedToursResult> {
  const featured = await fetchTours(
    `locale=${locale}&featured=true&limit=${FEATURED_LIMIT}`,
  );
  if (featured === null) return { tours: [], hasError: true };

  if (featured.length >= FEATURED_LIMIT) {
    return { tours: featured, hasError: false };
  }

  const latest = await fetchTours(`locale=${locale}&limit=${FEATURED_LIMIT}`);
  if (latest === null) return { tours: featured, hasError: false };

  const seen = new Set(featured.map((t) => t.id));
  const merged = [...featured, ...latest.filter((t) => !seen.has(t.id))];
  return { tours: merged.slice(0, FEATURED_LIMIT), hasError: false };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  // Fetch tours song song nếu sau này có nhiều data source
  const { tours, hasError } = await fetchFeaturedTours(locale);

  return <HomeClient initialTours={tours} loadError={hasError} />;
}

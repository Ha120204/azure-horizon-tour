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

export const metadata: Metadata = {
  title: 'Azure Horizon — Premium Tour Booking',
  description:
    'Khám phá các tour du lịch cao cấp trong và ngoài nước. Đặt tour dễ dàng, trải nghiệm đẳng cấp cùng Azure Horizon.',
  openGraph: {
    title: 'Azure Horizon — Premium Tour Booking',
    description: 'Khám phá các tour du lịch cao cấp trong và ngoài nước.',
    type: 'website',
  },
};

// ─── Cache ────────────────────────────────────────────────────────────────────

/**
 * Revalidate ISR mỗi 5 phút.
 * Tour data không thay đổi từng giây — 300s là đủ fresh cho production.
 * Thay bằng `0` nếu muốn dynamic render mỗi request.
 */
export const revalidate = 300;

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchFeaturedTours(locale: string): Promise<TourSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/tour?locale=${locale}&limit=6`, {
      // next.revalidate kế thừa từ `export const revalidate` ở module level,
      // nhưng ghi tường minh ở đây để rõ ý định.
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[Homepage] fetchFeaturedTours failed: ${res.status}`);
      return [];
    }

    const payload = await res.json();
    // Backend trả về { data: TourSummary[], meta: {...} } qua TransformInterceptor
    return Array.isArray(payload?.data) ? (payload.data as TourSummary[]) : [];
  } catch (error) {
    // Không crash trang khi backend down — trả về mảng rỗng
    console.error('[Homepage] fetchFeaturedTours error:', error);
    return [];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  // Fetch tours song song nếu sau này có nhiều data source
  const initialTours = await fetchFeaturedTours(locale);

  return <HomeClient initialTours={initialTours} />;
}

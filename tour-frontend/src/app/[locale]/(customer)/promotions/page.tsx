import type { Metadata } from 'next';
import { Suspense } from 'react';
import PromotionsClient from './_components/PromotionsClient';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const isVi = locale === 'vi';

    const title = isVi
        ? 'Khuyến mãi & Voucher du lịch — Azure Horizon'
        : 'Travel Deals & Vouchers — Azure Horizon';
    const description = isVi
        ? 'Săn flash sale, ưu đãi đặt sớm, giờ chót và voucher hội viên cho chuyến đi tiếp theo. Lưu mã giảm giá và đặt tour với giá tốt nhất.'
        : 'Catch flash sales, early-bird and last-minute deals, plus member vouchers for your next trip. Save discount codes and book tours at the best price.';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
        },
        alternates: {
            canonical: `/${locale}/promotions`,
        },
    };
}

export default function PromotionsPage() {
    return (
        <Suspense>
            <PromotionsClient />
        </Suspense>
    );
}

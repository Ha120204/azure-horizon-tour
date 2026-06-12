import type { Metadata } from 'next';
import DestinationsClient from './_components/DestinationsClient';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const isVi = locale === 'vi';

    return {
        title: isVi
            ? 'Khám phá Tour — Azure Horizon'
            : 'Explore Tours — Azure Horizon',
        description: isVi
            ? 'Tìm kiếm và đặt các tour du lịch trong nước và quốc tế. Lọc theo điểm đến, ngân sách, ngày khởi hành và nhiều tiêu chí khác.'
            : 'Search and book domestic and international tours. Filter by destination, budget, departure date, and more.',
        openGraph: {
            title: isVi ? 'Khám phá Tour — Azure Horizon' : 'Explore Tours — Azure Horizon',
            description: isVi
                ? 'Hàng trăm tour du lịch chất lượng cao, đặt dễ dàng, trải nghiệm đẳng cấp.'
                : 'Hundreds of high-quality tours, easy booking, premium experience.',
            type: 'website',
        },
        alternates: {
            canonical: `/${locale}/destinations`,
        },
    };
}

export default function DestinationsPage() {
    return <DestinationsClient />;
}

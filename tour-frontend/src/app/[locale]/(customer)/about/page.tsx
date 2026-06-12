import type { Metadata } from 'next';
import AboutClient from './_components/AboutClient';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const isVi = locale === 'vi';

    const title = isVi
        ? 'Về chúng tôi — Azure Horizon'
        : 'About Us — Azure Horizon';
    const description = isVi
        ? 'Câu chuyện, triết lý vận hành và cam kết dịch vụ của Azure Horizon — đặt tour minh bạch, đánh giá thực, hỗ trợ tận tâm.'
        : 'The story, operating philosophy and service commitments behind Azure Horizon — transparent booking, real reviews, dedicated support.';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
        },
        alternates: {
            canonical: `/${locale}/about`,
        },
    };
}

export default function AboutPage() {
    return <AboutClient />;
}

import type { Metadata } from 'next';
import ContactClient from './_components/ContactClient';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const isVi = locale === 'vi';

    const title = isVi
        ? 'Liên hệ — Azure Horizon'
        : 'Contact — Azure Horizon';
    const description = isVi
        ? 'Liên hệ đội ngũ Azure Horizon để được tư vấn tour, hỗ trợ thanh toán, đổi/hủy lịch hoặc hợp tác — phản hồi trong vòng 2 giờ làm việc.'
        : 'Get in touch with the Azure Horizon team for tour advice, payment support, rescheduling, cancellations or partnerships — replies within 2 business hours.';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
        },
        alternates: {
            canonical: `/${locale}/contact`,
        },
    };
}

export default function ContactPage() {
    return <ContactClient />;
}

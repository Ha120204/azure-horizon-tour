import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const isVi = locale === 'vi';
    const title = isVi
        ? 'Điều khoản sử dụng — Azure Horizon'
        : 'Terms of Use — Azure Horizon';
    const description = isVi
        ? 'Điều khoản và điều kiện khi sử dụng website và dịch vụ đặt tour của Azure Horizon.'
        : 'Terms and conditions for using the Azure Horizon website and tour booking services.';
    return {
        title,
        description,
        openGraph: { title, description, type: 'website' },
        alternates: { canonical: `/${locale}/terms` },
    };
}

interface Section {
    heading: string;
    body?: string;
    items?: string[];
}

interface TermsContent {
    title: string;
    updated: string;
    intro: string;
    sections: Section[];
    related: string;
    refundLabel: string;
    privacyLabel: string;
    contactPrefix: string;
    contactLink: string;
}

const CONTENT: Record<'vi' | 'en', TermsContent> = {
    vi: {
        title: 'Điều khoản sử dụng',
        updated: 'Cập nhật lần cuối: 22/06/2026',
        intro: 'Khi truy cập và sử dụng website cùng dịch vụ đặt tour của Azure Horizon, bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước khi sử dụng.',
        sections: [
            {
                heading: '1. Chấp nhận điều khoản',
                body: 'Bằng việc tạo tài khoản, đặt tour hoặc sử dụng bất kỳ tính năng nào của website, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ các điều khoản này cũng như Chính sách bảo mật và Chính sách hủy & hoàn tiền. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.',
            },
            {
                heading: '2. Tài khoản',
                items: [
                    'Bạn cần đủ 18 tuổi để tạo tài khoản và thực hiện đặt tour.',
                    'Bạn chịu trách nhiệm cung cấp thông tin chính xác, đầy đủ và cập nhật.',
                    'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình.',
                    'Vui lòng thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép.',
                ],
            },
            {
                heading: '3. Đặt tour & thanh toán',
                items: [
                    'Giá tour được hiển thị tại thời điểm đặt và có thể thay đổi theo từng ngày khởi hành hoặc chương trình khuyến mãi.',
                    'Khi đặt, hệ thống tạm giữ chỗ trong một khoảng thời gian giới hạn; nếu chưa thanh toán trong thời gian này, đơn có thể tự động hủy và chỗ được mở lại.',
                    'Thanh toán trực tuyến được xử lý qua cổng PayOS. Đơn được xác nhận sau khi thanh toán thành công (hoặc được nhân viên xác nhận đối với hình thức thanh toán tại quầy).',
                    'Bạn có trách nhiệm kiểm tra kỹ thông tin đơn (ngày khởi hành, gói dịch vụ, hành khách) trước khi thanh toán.',
                ],
            },
            {
                heading: '4. Hủy & hoàn tiền',
                body: 'Việc hủy đơn và mức hoàn tiền được áp dụng theo Chính sách hủy & hoàn tiền của chúng tôi. Vui lòng tham khảo chính sách đó để biết chi tiết các mốc thời gian và tỷ lệ hoàn.',
            },
            {
                heading: '5. Trách nhiệm của khách hàng',
                items: [
                    'Cung cấp giấy tờ tùy thân hợp lệ (CCCD/hộ chiếu) đúng với hành khách tham gia.',
                    'Có mặt đúng giờ và đúng điểm tập trung; chúng tôi không chịu trách nhiệm nếu khách đến trễ và lỡ chuyến.',
                    'Tuân thủ quy định của chuyến đi, hướng dẫn của nhân viên và quy định của các nhà cung cấp dịch vụ (hãng bay, vận chuyển, lưu trú).',
                    'Tự chịu trách nhiệm về tình trạng sức khỏe và các giấy tờ cần thiết cho chuyến đi.',
                ],
            },
            {
                heading: '6. Trách nhiệm & giới hạn trách nhiệm của Azure Horizon',
                items: [
                    'Chúng tôi nỗ lực cung cấp dịch vụ đúng như mô tả tại thời điểm đặt.',
                    'Lịch trình, phương tiện hoặc điểm dừng có thể thay đổi do điều kiện khách quan (thời tiết, an toàn, sắp xếp của nhà cung cấp); chúng tôi sẽ thông báo và sắp xếp phương án phù hợp khi có thể.',
                    'Chúng tôi không chịu trách nhiệm đối với thiệt hại phát sinh từ sự kiện bất khả kháng (thiên tai, dịch bệnh, đình công, quyết định của cơ quan nhà nước…) nằm ngoài khả năng kiểm soát.',
                    'Các yêu cầu đặc biệt (ăn uống, chỗ ngồi…) được cố gắng đáp ứng tùy điều kiện thực tế và không được đảm bảo tuyệt đối.',
                ],
            },
            {
                heading: '7. Nội dung & đánh giá của người dùng',
                body: 'Khi đăng đánh giá hoặc nội dung, bạn cam kết nội dung là trung thực, không vi phạm pháp luật, không xúc phạm hay xâm phạm quyền của bên thứ ba. Chúng tôi có quyền ẩn hoặc gỡ nội dung vi phạm.',
            },
            {
                heading: '8. Sở hữu trí tuệ',
                body: 'Toàn bộ nội dung trên website (logo, hình ảnh, văn bản, thiết kế) thuộc quyền sở hữu của Azure Horizon hoặc đối tác cấp phép, và không được sao chép, sử dụng cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản.',
            },
            {
                heading: '9. Hành vi bị cấm',
                items: [
                    'Sử dụng dịch vụ cho mục đích trái pháp luật hoặc gian lận.',
                    'Can thiệp, dò quét hoặc gây ảnh hưởng đến hoạt động và an toàn của hệ thống.',
                    'Cung cấp thông tin giả mạo hoặc mạo danh người khác.',
                ],
            },
            {
                heading: '10. Thay đổi điều khoản & dịch vụ',
                body: 'Chúng tôi có thể cập nhật điều khoản hoặc điều chỉnh dịch vụ theo thời gian. Phiên bản mới có hiệu lực kể từ khi đăng tải trên trang này.',
            },
            {
                heading: '11. Luật áp dụng',
                body: 'Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được ưu tiên giải quyết qua thương lượng; nếu không đạt được, sẽ được giải quyết tại cơ quan có thẩm quyền theo quy định.',
            },
        ],
        related: 'Xem thêm:',
        refundLabel: 'Chính sách hủy & hoàn tiền',
        privacyLabel: 'Chính sách bảo mật',
        contactPrefix: 'Cần làm rõ điều khoản nào?',
        contactLink: 'Liên hệ với chúng tôi',
    },
    en: {
        title: 'Terms of Use',
        updated: 'Last updated: 22 June 2026',
        intro: 'By accessing and using the Azure Horizon website and tour booking services, you agree to the terms below. Please read them carefully before use.',
        sections: [
            {
                heading: '1. Acceptance of terms',
                body: 'By creating an account, booking a tour or using any feature of the website, you confirm that you have read, understood and agree to these terms as well as our Privacy Policy and Cancellation & Refund Policy. If you do not agree, please stop using the service.',
            },
            {
                heading: '2. Accounts',
                items: [
                    'You must be at least 18 years old to create an account and make bookings.',
                    'You are responsible for providing accurate, complete and up-to-date information.',
                    'You are responsible for keeping your login credentials secure and for all activity under your account.',
                    'Please notify us immediately if you detect any unauthorized access.',
                ],
            },
            {
                heading: '3. Booking & payment',
                items: [
                    'Tour prices are shown at the time of booking and may vary by departure date or promotion.',
                    'When you book, seats are held for a limited time; if payment is not completed within that window, the order may be cancelled automatically and seats released.',
                    'Online payments are processed via the PayOS gateway. An order is confirmed after successful payment (or after staff confirmation for in-store payment).',
                    'You are responsible for carefully checking your order details (departure date, package, passengers) before paying.',
                ],
            },
            {
                heading: '4. Cancellation & refund',
                body: 'Cancellations and refund amounts are governed by our Cancellation & Refund Policy. Please refer to that policy for detailed time windows and refund rates.',
            },
            {
                heading: '5. Customer responsibilities',
                items: [
                    'Provide valid identification (national ID/passport) matching the travelling passengers.',
                    'Arrive on time at the correct meeting point; we are not responsible if you are late and miss the trip.',
                    'Comply with trip rules, staff guidance and the regulations of service providers (airlines, carriers, accommodation).',
                    'Take responsibility for your own health condition and any documents required for the trip.',
                ],
            },
            {
                heading: '6. Azure Horizon’s responsibilities & limitation of liability',
                items: [
                    'We strive to provide services as described at the time of booking.',
                    'Itinerary, transport or stops may change due to objective conditions (weather, safety, provider arrangements); we will notify you and arrange suitable alternatives where possible.',
                    'We are not liable for damages arising from force majeure (natural disasters, epidemics, strikes, government decisions, etc.) beyond our control.',
                    'Special requests (dietary, seating, etc.) are accommodated on a best-effort basis and are not absolutely guaranteed.',
                ],
            },
            {
                heading: '7. User content & reviews',
                body: 'When posting reviews or content, you warrant that it is truthful, lawful, and does not offend or infringe the rights of third parties. We reserve the right to hide or remove violating content.',
            },
            {
                heading: '8. Intellectual property',
                body: 'All website content (logos, images, text, design) belongs to Azure Horizon or its licensors and may not be copied or used for commercial purposes without prior written consent.',
            },
            {
                heading: '9. Prohibited conduct',
                items: [
                    'Using the service for unlawful or fraudulent purposes.',
                    'Interfering with, scanning or compromising the operation and security of the system.',
                    'Providing false information or impersonating others.',
                ],
            },
            {
                heading: '10. Changes to terms & services',
                body: 'We may update these terms or adjust our services over time. The new version takes effect once posted on this page.',
            },
            {
                heading: '11. Governing law',
                body: 'These terms are governed by the laws of Vietnam. Disputes will first be resolved through negotiation; if unresolved, they will be settled by the competent authority as prescribed by law.',
            },
        ],
        related: 'See also:',
        refundLabel: 'Cancellation & Refund Policy',
        privacyLabel: 'Privacy Policy',
        contactPrefix: 'Need clarification on any term?',
        contactLink: 'Contact us',
    },
};

export default async function TermsPage({ params }: PageProps) {
    const { locale } = await params;
    const c = CONTENT[locale === 'en' ? 'en' : 'vi'];

    return (
        <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface antialiased">
            <Header />
            <main id="main-content" className="flex-grow overflow-x-hidden pt-[88px]">
                <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
                    <h1 className="font-headline text-3xl font-extrabold tracking-tight md:text-4xl">{c.title}</h1>
                    <p className="mt-2 text-sm text-on-surface-variant">{c.updated}</p>
                    <p className="mt-6 leading-8 text-on-surface-variant">{c.intro}</p>

                    {c.sections.map((section, i) => (
                        <section key={i} className="mt-10">
                            <h2 className="font-headline text-xl font-bold">{section.heading}</h2>
                            {section.body && <p className="mt-3 leading-8 text-on-surface-variant">{section.body}</p>}
                            {section.items && (
                                <ul className="mt-3 list-disc space-y-2 pl-5 leading-8 text-on-surface-variant">
                                    {section.items.map((item, j) => <li key={j}>{item}</li>)}
                                </ul>
                            )}
                        </section>
                    ))}

                    <p className="mt-10 text-sm text-on-surface-variant">
                        {c.related}{' '}
                        <Link href="/refund-policy" className="font-semibold text-primary hover:underline">{c.refundLabel}</Link>
                        {' · '}
                        <Link href="/privacy" className="font-semibold text-primary hover:underline">{c.privacyLabel}</Link>
                    </p>

                    <p className="mt-8 border-t border-outline-variant/15 pt-6 text-on-surface-variant">
                        {c.contactPrefix}{' '}
                        <Link href="/contact" className="font-semibold text-primary hover:underline">{c.contactLink}</Link>
                    </p>
                </article>
            </main>
            <Footer />
        </div>
    );
}

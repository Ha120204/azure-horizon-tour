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
        ? 'Chính sách bảo mật — Azure Horizon'
        : 'Privacy Policy — Azure Horizon';
    const description = isVi
        ? 'Cách Azure Horizon thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân của bạn khi đặt tour.'
        : 'How Azure Horizon collects, uses, stores and protects your personal data when booking tours.';
    return {
        title,
        description,
        openGraph: { title, description, type: 'website' },
        alternates: { canonical: `/${locale}/privacy` },
    };
}

interface Section {
    heading: string;
    body?: string;
    items?: string[];
}

interface PolicyContent {
    title: string;
    updated: string;
    intro: string;
    sections: Section[];
    contactPrefix: string;
    contactLink: string;
    contactHref: string;
}

const CONTENT: Record<'vi' | 'en', PolicyContent> = {
    vi: {
        title: 'Chính sách bảo mật',
        updated: 'Cập nhật lần cuối: 22/06/2026',
        intro: 'Azure Horizon tôn trọng và cam kết bảo vệ dữ liệu cá nhân của bạn. Chính sách này mô tả những dữ liệu chúng tôi thu thập, mục đích sử dụng, cách lưu trữ, chia sẻ và quyền của bạn đối với dữ liệu, phù hợp với Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.',
        sections: [
            {
                heading: '1. Dữ liệu chúng tôi thu thập',
                body: 'Tùy theo cách bạn sử dụng dịch vụ, chúng tôi có thể thu thập:',
                items: [
                    'Thông tin tài khoản: họ tên, email, số điện thoại, mật khẩu (được mã hóa), ảnh đại diện, ngày sinh; hoặc thông tin đăng nhập qua Google.',
                    'Thông tin đặt tour: thông tin người đặt và danh sách hành khách (họ tên, ngày sinh, giới tính, loại & số giấy tờ tùy thân như CCCD/hộ chiếu), yêu cầu đặc biệt.',
                    'Thông tin thanh toán & hoàn tiền: giao dịch được xử lý qua cổng thanh toán PayOS (chúng tôi không lưu số thẻ); thông tin tài khoản ngân hàng bạn cung cấp để nhận hoàn tiền.',
                    'Nội dung tương tác: đánh giá, yêu cầu hỗ trợ, email/kênh liên hệ.',
                    'Dữ liệu kỹ thuật: thông tin đăng nhập phiên, cookie cần thiết để duy trì đăng nhập và vận hành website.',
                ],
            },
            {
                heading: '2. Mục đích sử dụng',
                items: [
                    'Tạo và quản lý tài khoản, xác thực đăng nhập.',
                    'Xử lý đặt tour, xuất vé, sắp xếp phương tiện/chỗ ngồi và thực hiện chuyến đi.',
                    'Xử lý thanh toán, hoàn tiền và đối soát giao dịch.',
                    'Hỗ trợ khách hàng, gửi thông báo liên quan đến đơn hàng.',
                    'Gửi thông tin khuyến mãi nếu bạn đăng ký nhận tin (có thể hủy bất kỳ lúc nào).',
                    'Cải thiện chất lượng dịch vụ và đảm bảo an toàn hệ thống.',
                ],
            },
            {
                heading: '3. Chia sẻ dữ liệu với bên thứ ba',
                body: 'Chúng tôi không bán dữ liệu cá nhân. Chúng tôi chỉ chia sẻ ở mức cần thiết với:',
                items: [
                    'Cổng thanh toán PayOS để xử lý giao dịch.',
                    'Đối tác cung cấp dịch vụ tour (hãng vận chuyển, hãng hàng không, khách sạn) nhằm thực hiện chuyến đi của bạn — ví dụ tên hành khách, giấy tờ tùy thân để xuất vé.',
                    'Nhà cung cấp hạ tầng kỹ thuật: dịch vụ lưu trữ hình ảnh (Cloudinary), dịch vụ gửi email, đăng nhập Google.',
                    'Cơ quan nhà nước có thẩm quyền khi pháp luật yêu cầu.',
                ],
            },
            {
                heading: '4. Lưu trữ & bảo mật',
                body: 'Mật khẩu được mã hóa một chiều; truy cập dữ liệu được phân quyền theo vai trò. Dữ liệu khi xóa được áp dụng cơ chế xóa mềm để bảo toàn lịch sử giao dịch khi cần thiết, đồng thời hạn chế truy cập. Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức hợp lý để bảo vệ dữ liệu khỏi truy cập trái phép.',
            },
            {
                heading: '5. Thời gian lưu trữ',
                body: 'Chúng tôi lưu trữ dữ liệu trong thời gian cần thiết để cung cấp dịch vụ, thực hiện nghĩa vụ pháp lý (kế toán, thuế), giải quyết tranh chấp và đảm bảo an toàn hệ thống. Khi không còn cần thiết, dữ liệu sẽ được xóa hoặc ẩn danh.',
            },
            {
                heading: '6. Quyền của bạn',
                body: 'Theo quy định pháp luật, bạn có quyền:',
                items: [
                    'Truy cập và xem dữ liệu cá nhân của mình trong mục Tài khoản.',
                    'Chỉnh sửa, cập nhật thông tin cá nhân.',
                    'Yêu cầu xóa dữ liệu hoặc rút lại sự đồng ý (trừ dữ liệu phải lưu theo nghĩa vụ pháp lý).',
                    'Hủy đăng ký nhận email khuyến mãi bất kỳ lúc nào.',
                    'Khiếu nại nếu cho rằng dữ liệu bị xử lý không đúng quy định.',
                ],
            },
            {
                heading: '7. Cookie',
                body: 'Chúng tôi sử dụng cookie cần thiết để duy trì phiên đăng nhập và vận hành các chức năng cơ bản của website. Bạn có thể quản lý cookie qua cài đặt trình duyệt, tuy nhiên việc tắt một số cookie có thể ảnh hưởng đến trải nghiệm.',
            },
            {
                heading: '8. Dữ liệu của trẻ em',
                body: 'Tài khoản dành cho người từ đủ 18 tuổi. Thông tin trẻ em (ví dụ hành khách nhỏ tuổi) chỉ được cung cấp bởi người lớn chịu trách nhiệm trong quá trình đặt tour và chỉ dùng để thực hiện chuyến đi.',
            },
            {
                heading: '9. Thay đổi chính sách',
                body: 'Chúng tôi có thể cập nhật chính sách này theo thời gian. Phiên bản mới sẽ được đăng tải trên trang này kèm ngày cập nhật.',
            },
        ],
        contactPrefix: 'Có câu hỏi về quyền riêng tư của bạn?',
        contactLink: 'Liên hệ với chúng tôi',
        contactHref: '/contact',
    },
    en: {
        title: 'Privacy Policy',
        updated: 'Last updated: 22 June 2026',
        intro: 'Azure Horizon respects and is committed to protecting your personal data. This policy describes what data we collect, how we use, store and share it, and your rights regarding your data, in line with Vietnam’s Decree 13/2023/ND-CP on personal data protection.',
        sections: [
            {
                heading: '1. Data we collect',
                body: 'Depending on how you use our services, we may collect:',
                items: [
                    'Account information: full name, email, phone number, password (encrypted), avatar, date of birth; or Google sign-in details.',
                    'Booking information: booker details and the passenger list (full name, date of birth, gender, ID type & number such as national ID/passport), special requests.',
                    'Payment & refund information: transactions are processed via the PayOS payment gateway (we do not store card numbers); bank account details you provide to receive refunds.',
                    'Interaction content: reviews, support requests, contact email/channels.',
                    'Technical data: session login information and cookies necessary to keep you signed in and operate the website.',
                ],
            },
            {
                heading: '2. How we use your data',
                items: [
                    'Create and manage your account, authenticate logins.',
                    'Process bookings, issue tickets, arrange transport/seating and deliver the trip.',
                    'Process payments, refunds and reconcile transactions.',
                    'Provide customer support and send order-related notifications.',
                    'Send promotional information if you subscribe (you can unsubscribe at any time).',
                    'Improve service quality and ensure system security.',
                ],
            },
            {
                heading: '3. Sharing with third parties',
                body: 'We do not sell personal data. We only share it as necessary with:',
                items: [
                    'The PayOS payment gateway to process transactions.',
                    'Tour service partners (carriers, airlines, hotels) to deliver your trip — e.g. passenger names and ID details to issue tickets.',
                    'Technical infrastructure providers: image hosting (Cloudinary), email delivery, Google sign-in.',
                    'Competent authorities when required by law.',
                ],
            },
            {
                heading: '4. Storage & security',
                body: 'Passwords are one-way encrypted; data access is role-based. Deleted data uses a soft-delete mechanism to preserve transaction history where necessary while restricting access. We apply reasonable technical and organizational measures to protect data against unauthorized access.',
            },
            {
                heading: '5. Retention period',
                body: 'We retain data for as long as necessary to provide our services, meet legal obligations (accounting, tax), resolve disputes and maintain system security. When no longer needed, data is deleted or anonymized.',
            },
            {
                heading: '6. Your rights',
                body: 'Under applicable law, you have the right to:',
                items: [
                    'Access and view your personal data in the Account section.',
                    'Edit and update your personal information.',
                    'Request deletion or withdraw consent (except data we must retain by law).',
                    'Unsubscribe from promotional emails at any time.',
                    'Lodge a complaint if you believe your data is processed improperly.',
                ],
            },
            {
                heading: '7. Cookies',
                body: 'We use necessary cookies to maintain login sessions and run core website functions. You can manage cookies via your browser settings, though disabling some cookies may affect your experience.',
            },
            {
                heading: '8. Children’s data',
                body: 'Accounts are for users aged 18 and over. Children’s information (e.g. minor passengers) is provided only by a responsible adult during booking and used solely to deliver the trip.',
            },
            {
                heading: '9. Changes to this policy',
                body: 'We may update this policy from time to time. The latest version will be posted on this page with its update date.',
            },
        ],
        contactPrefix: 'Questions about your privacy?',
        contactLink: 'Contact us',
        contactHref: '/contact',
    },
};

export default async function PrivacyPolicyPage({ params }: PageProps) {
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

                    <p className="mt-12 border-t border-outline-variant/15 pt-6 text-on-surface-variant">
                        {c.contactPrefix}{' '}
                        <Link href={c.contactHref} className="font-semibold text-primary hover:underline">{c.contactLink}</Link>
                    </p>
                </article>
            </main>
            <Footer />
        </div>
    );
}

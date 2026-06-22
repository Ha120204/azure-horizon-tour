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
        ? 'Chính sách hủy & hoàn tiền — Azure Horizon'
        : 'Cancellation & Refund Policy — Azure Horizon';
    const description = isVi
        ? 'Điều kiện hủy đơn, mức hoàn tiền theo thời điểm hủy và quy trình hoàn tiền khi đặt tour tại Azure Horizon.'
        : 'Cancellation conditions, refund rates by cancellation time, and the refund process for tours booked with Azure Horizon.';
    return {
        title,
        description,
        openGraph: { title, description, type: 'website' },
        alternates: { canonical: `/${locale}/refund-policy` },
    };
}

type RefundTier = { window: string; rate: string; highlight?: boolean };

interface PolicyContent {
    title: string;
    updated: string;
    intro: string;
    unpaidTitle: string;
    unpaidBody: string;
    paidTitle: string;
    paidBody: string;
    tableTime: string;
    tableRate: string;
    tiers: RefundTier[];
    tierNote: string;
    blockedTitle: string;
    blockedItems: string[];
    processTitle: string;
    processItems: string[];
    howTitle: string;
    howBody: string;
    contactPrefix: string;
    contactLink: string;
    contactHref: string;
}

const CONTENT: Record<'vi' | 'en', PolicyContent> = {
    vi: {
        title: 'Chính sách hủy & hoàn tiền',
        updated: 'Cập nhật lần cuối: 22/06/2026',
        intro: 'Chính sách này áp dụng cho các đơn đặt tour tại Azure Horizon. Mức hoàn tiền được xác định tự động dựa trên trạng thái thanh toán và thời điểm bạn gửi yêu cầu hủy.',
        unpaidTitle: '1. Đơn chưa thanh toán',
        unpaidBody: 'Bạn có thể hủy đơn bất kỳ lúc nào trước khi thanh toán. Vì chưa phát sinh giao dịch nên không có khoản hoàn tiền. Ghế giữ chỗ sẽ được mở lại ngay sau khi hủy.',
        paidTitle: '2. Đơn đã thanh toán — mức hoàn tiền',
        paidBody: 'Với đơn đã thanh toán, mức hoàn tiền được tính trên tổng giá trị đơn theo thời điểm bạn gửi yêu cầu hủy:',
        tableTime: 'Thời điểm hủy',
        tableRate: 'Mức hoàn',
        tiers: [
            { window: 'Trong vòng 24 giờ kể từ khi đặt', rate: 'Hoàn 100%', highlight: true },
            { window: 'Còn từ 7 ngày trở lên trước ngày khởi hành', rate: 'Hoàn 80%' },
            { window: 'Còn từ 3 đến dưới 7 ngày trước khởi hành', rate: 'Hoàn 50%' },
            { window: 'Dưới 3 ngày trước ngày khởi hành', rate: 'Không hoàn tiền' },
        ],
        tierNote: 'Lưu ý: ưu đãi hoàn 100% trong 24 giờ đầu được ưu tiên áp dụng — nếu bạn đặt và hủy trong vòng 24 giờ, bạn được hoàn 100% kể cả khi ngày khởi hành đã cận kề.',
        blockedTitle: '3. Trường hợp không hỗ trợ hủy trực tuyến',
        blockedItems: [
            'Tour khởi hành trong ngày hôm nay.',
            'Chuyến đi đã hoàn thành.',
            'Đơn đã được hủy hoặc đang có yêu cầu hủy chờ xử lý.',
        ],
        processTitle: '4. Quy trình hoàn tiền',
        processItems: [
            'Bạn gửi yêu cầu hủy kèm thông tin tài khoản ngân hàng nhận hoàn tiền.',
            'Đơn chuyển sang trạng thái "Chờ xử lý hủy" để Azure Horizon xác nhận.',
            'Sau khi duyệt, chúng tôi hoàn tiền theo mức nêu trên về tài khoản bạn cung cấp. Thời gian tiền về tài khoản phụ thuộc vào ngân hàng/cổng thanh toán.',
        ],
        howTitle: '5. Cách gửi yêu cầu hủy',
        howBody: 'Đăng nhập và vào mục "Đơn của tôi", chọn đơn cần hủy rồi bấm "Yêu cầu hủy". Hệ thống sẽ hiển thị mức hoàn tiền dự kiến trước khi bạn xác nhận.',
        contactPrefix: 'Cần hỗ trợ về việc hủy đơn?',
        contactLink: 'Liên hệ với chúng tôi',
        contactHref: '/contact',
    },
    en: {
        title: 'Cancellation & Refund Policy',
        updated: 'Last updated: 22 June 2026',
        intro: 'This policy applies to tour bookings made with Azure Horizon. The refund amount is determined automatically based on the payment status and the time you submit your cancellation request.',
        unpaidTitle: '1. Unpaid bookings',
        unpaidBody: 'You may cancel an unpaid booking at any time before payment. Since no transaction has occurred, no refund applies. Held seats are released immediately after cancellation.',
        paidTitle: '2. Paid bookings — refund rates',
        paidBody: 'For paid bookings, the refund is calculated on the total order value based on when you submit the cancellation request:',
        tableTime: 'Cancellation time',
        tableRate: 'Refund',
        tiers: [
            { window: 'Within 24 hours of booking', rate: '100% refund', highlight: true },
            { window: '7 or more days before departure', rate: '80% refund' },
            { window: '3 to under 7 days before departure', rate: '50% refund' },
            { window: 'Less than 3 days before departure', rate: 'No refund' },
        ],
        tierNote: 'Note: the 24-hour full-refund window takes priority — if you book and cancel within 24 hours, you receive a 100% refund even if the departure date is near.',
        blockedTitle: '3. When online cancellation is not available',
        blockedItems: [
            'The tour departs today.',
            'The trip has already been completed.',
            'The booking is already cancelled or has a pending cancellation request.',
        ],
        processTitle: '4. Refund process',
        processItems: [
            'You submit a cancellation request together with the bank account details for the refund.',
            'The booking moves to "Cancellation pending" for Azure Horizon to review.',
            'Once approved, we refund the applicable amount to the account you provided. The time for funds to arrive depends on your bank / payment gateway.',
        ],
        howTitle: '5. How to request a cancellation',
        howBody: 'Sign in and go to "My Bookings", select the booking and click "Request cancellation". The system shows the estimated refund before you confirm.',
        contactPrefix: 'Need help with a cancellation?',
        contactLink: 'Contact us',
        contactHref: '/contact',
    },
};

export default async function RefundPolicyPage({ params }: PageProps) {
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

                    <section className="mt-10">
                        <h2 className="font-headline text-xl font-bold">{c.unpaidTitle}</h2>
                        <p className="mt-3 leading-8 text-on-surface-variant">{c.unpaidBody}</p>
                    </section>

                    <section className="mt-10">
                        <h2 className="font-headline text-xl font-bold">{c.paidTitle}</h2>
                        <p className="mt-3 leading-8 text-on-surface-variant">{c.paidBody}</p>
                        <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant/20">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-surface-container-low text-on-surface-variant">
                                        <th className="px-4 py-3 font-semibold">{c.tableTime}</th>
                                        <th className="px-4 py-3 font-semibold text-right">{c.tableRate}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/15">
                                    {c.tiers.map((tier, i) => (
                                        <tr key={i} className={tier.highlight ? 'bg-primary/5' : ''}>
                                            <td className="px-4 py-3 text-on-surface">{tier.window}</td>
                                            <td className="px-4 py-3 text-right font-bold text-on-surface">{tier.rate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-on-surface-variant">{c.tierNote}</p>
                    </section>

                    <section className="mt-10">
                        <h2 className="font-headline text-xl font-bold">{c.blockedTitle}</h2>
                        <ul className="mt-3 list-disc space-y-2 pl-5 leading-8 text-on-surface-variant">
                            {c.blockedItems.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </section>

                    <section className="mt-10">
                        <h2 className="font-headline text-xl font-bold">{c.processTitle}</h2>
                        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-8 text-on-surface-variant">
                            {c.processItems.map((item, i) => <li key={i}>{item}</li>)}
                        </ol>
                    </section>

                    <section className="mt-10">
                        <h2 className="font-headline text-xl font-bold">{c.howTitle}</h2>
                        <p className="mt-3 leading-8 text-on-surface-variant">{c.howBody}</p>
                    </section>

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

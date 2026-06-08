import type { ReactNode } from 'react';
import styles from './AuthTheme.module.css';

const DEFAULT_BRAND_MARK = (
    <span className="material-symbols-outlined text-[34px] leading-none" aria-hidden="true">
        travel_explore
    </span>
);

const FEATURES = [
    {
        icon: 'map',
        title: 'Lưu hành trình yêu thích',
        desc: 'Theo dõi tour đã đặt và danh sách điểm đến mơ ước của bạn',
    },
    {
        icon: 'card_giftcard',
        title: 'Ưu đãi dành riêng thành viên',
        desc: 'Giảm giá và combo du lịch độc quyền chỉ dành cho hội viên',
    },
    {
        icon: 'support_agent',
        title: 'Hỗ trợ ưu tiên 24/7',
        desc: 'Chuyên gia tư vấn hành trình luôn sẵn sàng hỗ trợ bạn',
    },
];

type Props = {
    children: ReactNode;
    brandName?: string;
    brandMark?: ReactNode;
};

export default function AuthRegisterShell({
    children,
    brandName = 'Azure Horizon',
    brandMark = DEFAULT_BRAND_MARK,
}: Props) {
    return (
        <main className={`${styles.authTheme} min-h-screen bg-[var(--auth-surface)] text-[var(--auth-ink)] font-body lg:grid lg:grid-cols-2`}>
            <section className={`${styles.regPanel} relative hidden min-h-screen overflow-hidden text-[var(--auth-panel-text)] lg:flex`}>
                <div className={styles.regAuroraA} aria-hidden="true" />
                <div className={styles.regAuroraB} aria-hidden="true" />
                <div className={styles.dotGrid} aria-hidden="true" />

                <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-12 py-11">
                    {/* Brand */}
                    <div className={`${styles.brandEnter} flex items-center gap-3 text-[1.55rem] font-extrabold tracking-tight`}>
                        {brandMark}
                        <span className="font-headline">{brandName}</span>
                    </div>

                    {/* Hero content */}
                    <div className="mx-auto flex w-full max-w-[560px] flex-col">
                        <div className={`${styles.copyEnter} ${styles.regFreePill}`}>
                            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">verified</span>
                            Miễn phí · Không cần thẻ tín dụng
                        </div>

                        <h2 className={`${styles.copyEnter} mt-5 font-headline text-[2.75rem] font-extrabold leading-[1.1] tracking-tight`}>
                            Tạo tài khoản,<br />
                            <span className={styles.regGradientText}>mở cánh cửa thế giới</span>
                        </h2>

                        <p className={`${styles.copyEnter} mt-4 text-[0.92rem] font-medium leading-relaxed text-[var(--auth-panel-muted)]`}>
                            Tham gia cùng 50,000+ du khách đang trải nghiệm cách đặt tour thông minh và tiết kiệm nhất.
                        </p>

                        {/* Feature cards */}
                        <div className={`${styles.metaEnter} mt-8 flex flex-col gap-3`}>
                            {FEATURES.map((feat, i) => (
                                <div
                                    key={feat.icon}
                                    className={`${styles.regFeatureCard} ${i === 1 ? styles.regFeatureCardAccent : ''}`}
                                >
                                    <div className={styles.regFeatureIcon}>
                                        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{feat.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-extrabold">{feat.title}</p>
                                        <p className="mt-0.5 text-xs font-medium leading-relaxed text-[var(--auth-panel-muted)]">{feat.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Testimonial */}
                        <div className={`${styles.metaEnter} ${styles.regTestimonial} mt-5`}>
                            <div className={styles.regTestimonialAvatar} aria-hidden="true">TH</div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium leading-relaxed text-[var(--auth-panel-muted)]">
                                    &ldquo;Trải nghiệm đặt tour cực kỳ dễ dàng! Giao diện đẹp và đội ngũ hỗ trợ rất tận tình.&rdquo;
                                </p>
                                <div className="mt-2.5 flex items-center justify-between">
                                    <p className="text-xs font-bold">Nguyễn Thu Hà · Hà Nội</p>
                                    <p className="text-[0.75rem] text-amber-400" aria-label="5 sao">★★★★★</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom tagline */}
                    <p className={`${styles.brandEnter} text-center text-xs font-semibold text-[var(--auth-panel-muted)]`}>
                        Đăng ký trong 30 giây · Bảo mật SSL · Không spam
                    </p>
                </div>
            </section>

            <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
                <div className="w-full max-w-[560px]">
                    <div className={`${styles.panelEnter} mb-9 flex items-center justify-center gap-2 text-[var(--auth-primary)] lg:hidden`}>
                        {brandMark}
                        <span className="font-headline text-2xl font-extrabold tracking-tight">{brandName}</span>
                    </div>
                    {children}
                </div>
            </section>
        </main>
    );
}

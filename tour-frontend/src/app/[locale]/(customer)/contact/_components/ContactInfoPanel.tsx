'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ContactInfoItem } from '../_hooks/useContactForm';

interface ContactInfoPanelProps {
    t: (key: string) => string;
    language: string;
    supportPhoneHref: string;
    supportEmailHref: string;
    isLoggedIn: boolean;
    publicSettings: {
        company_email: string;
        company_phone: string;
        company_address: string;
    };
}

export function ContactInfoPanel({
    t,
    language,
    supportPhoneHref,
    supportEmailHref,
    isLoggedIn,
    publicSettings,
}: ContactInfoPanelProps) {
    const infoItems: ContactInfoItem[] = [
        {
            icon: 'schedule',
            title: t('contact.serviceHours'),
            body: t('contact.serviceHoursTime'),
            note: t('contact.serviceHoursSub'),
        },
        {
            icon: 'mail',
            title: t('contact.emailUs'),
            body: publicSettings.company_email,
            href: `mailto:${publicSettings.company_email}`,
        },
        {
            icon: 'call',
            title: 'Hotline',
            body: publicSettings.company_phone,
            href: `tel:${publicSettings.company_phone.replace(/\s+/g, '')}`,
        },
        {
            icon: 'location_on',
            title: language === 'vi' ? 'Văn phòng' : 'Office',
            body: publicSettings.company_address,
        },
        {
            icon: 'help_outline',
            title: language === 'vi' ? 'Hỗ trợ trực tiếp' : 'Direct support',
            body: language === 'vi'
                ? 'Gửi yêu cầu qua biểu mẫu bên cạnh, đội ngũ sẽ phản hồi qua email hoặc điện thoại.'
                : 'Send your request through the form and our team will reply by email or phone.',
        },
    ];

    return (
        <section className="space-y-14 lg:col-span-5">
            <p className="contact-hero-enter contact-hero-enter-d3 max-w-md font-body text-lg leading-8 text-on-surface-variant">
                {t('contact.description')}
            </p>

            <div className="contact-hero-enter contact-hero-enter-d4 flex flex-wrap gap-3">
                <a
                    href={supportPhoneHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">call</span>
                    {language === 'vi' ? 'Gọi ngay' : 'Call Now'}
                </a>
                <a
                    href={supportEmailHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/60 bg-white px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">mail</span>
                    {language === 'vi' ? 'Gửi email' : 'Email Us'}
                </a>
                {isLoggedIn ? (
                    <Link
                        href="/profile"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/60 bg-white px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">assignment</span>
                        {language === 'vi' ? 'Theo dõi yêu cầu' : 'Track Requests'}
                    </Link>
                ) : (
                    <a
                        href="#contact-request-form"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/60 bg-white px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit_note</span>
                        {language === 'vi' ? 'Gửi yêu cầu' : 'Send Request'}
                    </a>
                )}
            </div>

            <div className="space-y-10">
                {infoItems.map(item => (
                    <div key={item.title} className="group flex items-start gap-5">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary transition-colors group-hover:bg-primary/10">
                            <span className="material-symbols-outlined">{item.icon}</span>
                        </div>
                        <div>
                            <h2 className="mb-1 font-headline text-lg font-semibold text-primary">{item.title}</h2>
                            {item.href && !item.action ? (
                                <a
                                    className="font-body text-on-surface-variant underline decoration-outline-variant underline-offset-4 transition-colors hover:text-primary"
                                    href={item.href}
                                >
                                    {item.body}
                                </a>
                            ) : (
                                <p className="font-body text-on-surface-variant">{item.body}</p>
                            )}
                            {item.note && <p className="mt-2 font-body text-sm text-outline">{item.note}</p>}
                            {item.action && item.href && (
                                <Link
                                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                                    href={item.href}
                                >
                                    {item.action}
                                    <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                                        arrow_forward
                                    </span>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-lg">
                <Image
                    src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=85&w=1200"
                    alt="Luxury hotel concierge desk with warm ambient lighting"
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
            </div>
        </section>
    );
}

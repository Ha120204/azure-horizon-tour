'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ContactInfoPanel } from './_components/ContactInfoPanel';
import { ContactFormPanel } from './_components/ContactFormPanel';
import { useContactForm } from './_hooks/useContactForm';

export default function ContactPage() {
    const form = useContactForm();

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes contact-hero-up {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .contact-hero-enter {
                    animation: contact-hero-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .contact-hero-enter-d1 { animation-delay: 80ms; }
                .contact-hero-enter-d2 { animation-delay: 180ms; }
                .contact-hero-enter-d3 { animation-delay: 280ms; }
                .contact-hero-enter-d4 { animation-delay: 380ms; }

                @media (prefers-reduced-motion: reduce) {
                    .contact-hero-enter {
                        animation: none !important;
                    }
                }
            `}} />
            <Header />

            <main className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32">
                <div className="mb-12">
                    <span className="contact-hero-enter contact-hero-enter-d1 inline-block font-label text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary">
                        {form.t('contact.guestRelations')}
                    </span>
                    <h1 className="contact-hero-enter contact-hero-enter-d2 mt-3 max-w-4xl font-headline text-4xl font-extrabold leading-[1.02] tracking-tight text-primary md:text-6xl">
                        {form.heroTitle}
                    </h1>
                </div>

                <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
                    <ContactInfoPanel
                        t={form.t}
                        language={form.language}
                        supportPhoneHref={form.supportPhoneHref}
                        supportEmailHref={form.supportEmailHref}
                        isLoggedIn={form.isLoggedIn}
                        publicSettings={form.publicSettings}
                    />
                    <ContactFormPanel form={form} />
                </div>
            </main>

            <Footer />
        </div>
    );
}

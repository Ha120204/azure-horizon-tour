'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ContactInfoPanel } from './ContactInfoPanel';
import { ContactFormPanel } from './ContactFormPanel';
import { useContactForm } from '../_hooks/useContactForm';

export default function ContactClient() {
    const form = useContactForm();

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
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

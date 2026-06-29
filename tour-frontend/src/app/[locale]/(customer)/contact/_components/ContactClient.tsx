'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SupportTicketDetail from '@/components/profile/SupportTicketDetail';
import { ContactInfoPanel } from './ContactInfoPanel';
import { ContactFormPanel } from './ContactFormPanel';
import { TicketLookupPanel } from './TicketLookupPanel';
import { useContactForm } from '../_hooks/useContactForm';
import { useGuestTicketModal } from '../_hooks/useGuestTicketModal';

export default function ContactClient() {
    const form = useContactForm();
    const ticketModal = useGuestTicketModal();
    const { open: openTicket } = ticketModal;
    const searchParams = useSearchParams();
    const autoOpenedRef = useRef(false);

    const ticketIdParam = searchParams.get('ticketId');
    const accessCodeParam = searchParams.get('accessCode');

    useEffect(() => {
        if (autoOpenedRef.current) return;
        if (!ticketIdParam || !accessCodeParam) return;
        const ticketId = Number(ticketIdParam);
        if (!Number.isInteger(ticketId) || ticketId <= 0) return;
        autoOpenedRef.current = true;
        void openTicket(ticketId, accessCodeParam);
    }, [ticketIdParam, accessCodeParam, openTicket]);

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
                        isLoggedIn={form.isLoggedIn}
                        language={form.language}
                        publicSettings={form.publicSettings}
                    />
                    <ContactFormPanel form={form} />
                </div>

                <TicketLookupPanel onView={ticketModal.open} isOpening={ticketModal.isLoading} />
            </main>

            <Footer />

            {ticketModal.ticket && (
                <SupportTicketDetail
                    ticket={ticketModal.ticket}
                    lookupAccessCode={ticketModal.accessCode}
                    onClose={ticketModal.close}
                    onTicketUpdate={ticketModal.setTicket}
                />
            )}
        </div>
    );
}

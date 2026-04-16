'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';
import { useLocale } from '@/app/context/LocaleContext';

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { t, formatPrice } = useLocale();

    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

    useEffect(() => {
        const fetchMyBookings = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            try {
                const res = await fetchWithAuth('http://localhost:3000/booking/history/my-bookings');
                const result = await res.json();

                if (res.ok && result.data) {
                    const sortedBookings = result.data.sort((a: any, b: any) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    setBookings(sortedBookings);
                }
            } catch (error) {
                console.error("Lỗi tải lịch sử:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyBookings();
    }, []);

    const filteredBookings = bookings.filter(booking => {
        if (filterStatus === 'ALL') return true;
        return booking.paymentStatus === filterStatus;
    });

    return (
        <div className="bg-slate-50 font-body text-on-surface flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow pt-32 pb-20 px-6 max-w-5xl mx-auto w-full">
                <header className="mb-10 text-center md:text-left">
                    <h1 className="font-headline font-extrabold text-5xl md:text-6xl tracking-tight text-primary mb-4">
                        {t('my_bookings.title')}
                    </h1>
                    <p className="font-body text-lg text-on-surface-variant max-w-2xl opacity-80">
                        {t('my_bookings.subtitle')}
                    </p>
                </header>

                {!isLoading && bookings.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-10">
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${filterStatus === 'ALL' ? 'bg-primary text-white shadow-md' : 'bg-white border border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-primary'}`}
                        >
                            {t('my_bookings.allTrips')}
                        </button>
                        <button
                            onClick={() => setFilterStatus('PAID')}
                            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${filterStatus === 'PAID' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-outline-variant/30 text-on-surface-variant hover:border-emerald-600/50 hover:text-emerald-700'}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            {t('my_bookings.paidTab')}
                        </button>
                        <button
                            onClick={() => setFilterStatus('UNPAID')}
                            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${filterStatus === 'UNPAID' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-outline-variant/30 text-on-surface-variant hover:border-amber-600/50 hover:text-amber-700'}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">pending</span>
                            {t('my_bookings.unpaidTab')}
                        </button>
                    </div>
                )}

                <section className="space-y-8">
                    {isLoading ? (
                        <div className="text-center py-20 font-bold text-primary text-xl">{t('my_bookings.loadingData')}</div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
                            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
                                {filterStatus === 'ALL' ? 'flight_takeoff' : 'search_off'}
                            </span>
                            <h2 className="text-2xl font-bold mb-2">{t('my_bookings.noTripsFound')}</h2>
                            <p className="text-slate-500 mb-6">
                                {filterStatus === 'ALL'
                                    ? t('my_bookings.firstJourney')
                                    : t('my_bookings.noTicketsStatus')}
                            </p>
                            {filterStatus === 'ALL' ? (
                                <Link href="/destinations" className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-container transition-colors inline-block shadow-md">
                                    {t('my_bookings.exploreNow')}
                                </Link>
                            ) : (
                                <button onClick={() => setFilterStatus('ALL')} className="text-primary font-bold hover:underline">
                                    {t('my_bookings.viewAll')}
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredBookings.map((booking) => {
                            const isPaid = booking.paymentStatus === 'PAID';
                            const badgeBgColor = isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100';
                            const badgeIcon = isPaid ? 'check_circle' : 'pending';
                            const badgeText = isPaid ? t('my_bookings.paidBadge') : t('my_bookings.unpaidBadge');

                            return (
                                <div key={booking.id} className="bg-white rounded-[2rem] overflow-hidden flex flex-col md:flex-row border border-outline-variant/10 shadow-[0_8px_32px_rgba(25,28,33,0.02)] group hover:shadow-[0_12px_48px_rgba(25,28,33,0.08)] hover:border-primary/20 transition-all duration-500">
                                    <div className="md:w-1/3 h-64 md:h-auto relative overflow-hidden p-2">
                                        <img
                                            alt={booking.tour?.name || "Tour Image"}
                                            className="w-full h-full object-cover rounded-2xl transition-transform duration-700 group-hover:scale-105"
                                            src={booking.tour?.imageUrl || "https://images.unsplash.com/photo-1499681404123-6c7102ce0033"}
                                        />
                                    </div>

                                    <div className="md:w-2/3 p-6 md:p-8 flex flex-col justify-between">
                                        <div>
                                            <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="bg-surface-container-highest text-on-surface px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border border-outline-variant/20">
                                                        {t('my_bookings.ticketCode')} {booking.bookingCode}
                                                    </span>
                                                    <span className="bg-primary/5 text-primary px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border border-primary/20">
                                                        {t('my_bookings.tourCode')} {booking.tour?.tourCode || 'N/A'}
                                                    </span>
                                                </div>

                                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 border ${badgeBgColor}`}>
                                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        {badgeIcon}
                                                    </span>
                                                    {badgeText}
                                                </span>
                                            </div>

                                            <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mb-6 group-hover:text-primary transition-colors">
                                                {booking.tour?.name || 'Azure Horizon Luxury Tour'}
                                            </h2>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 border-y border-outline-variant/10 py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-primary">calendar_today</span>
                                                    <div>
                                                        <p className="text-[10px] font-label text-outline uppercase tracking-wider">{t('my_bookings.dateLbl')}</p>
                                                        <p className="text-sm font-semibold">
                                                            {new Date(booking.createdAt).toLocaleDateString('vi-VN')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-primary">group</span>
                                                    <div>
                                                        <p className="text-[10px] font-label text-outline uppercase tracking-wider">{t('my_bookings.passengersLbl')}</p>
                                                        <p className="text-sm font-semibold">{booking.numberOfPeople}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-primary">payments</span>
                                                    <div>
                                                        <p className="text-[10px] font-label text-outline uppercase tracking-wider">{t('my_bookings.totalAmountLbl')}</p>
                                                        <p className="text-sm font-bold text-primary">
                                                            {formatPrice(booking.totalPrice)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center mt-2">
                                            {!isPaid ? (
                                                <span className="text-xs text-amber-600 font-medium italic flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">info</span> {t('my_bookings.plsPayLbl')}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-emerald-600 font-medium italic flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">task_alt</span> {t('my_bookings.spotConfirmedLbl')}
                                                </span>
                                            )}

                                            <Link
                                                href={`/my-bookings/${booking.id}`}
                                                className="flex items-center gap-2 px-6 py-3 bg-surface-container-high hover:bg-primary hover:text-white text-primary rounded-full transition-all duration-300 font-semibold text-sm shadow-sm hover:shadow-md active:scale-95"
                                            >
                                                {t('my_bookings.viewDetails')}
                                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
}
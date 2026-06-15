'use client'; // Required vì có dùng State, Effect, Event

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import SupportTicketList from '@/components/profile/SupportTicketList';
import SupportTicketDetail from '@/components/profile/SupportTicketDetail';
import ProfileHeader from './_components/ProfileHeader';
import PersonalInfoForm from './_components/PersonalInfoForm';
import SecurityCard from './_components/SecurityCard';
import VoucherWallet from './_components/VoucherWallet';
import RecentBookingCard from './_components/RecentBookingCard';
import ProfileSkeleton from './_components/ProfileSkeleton';
import { useProfile } from './_hooks/useProfile';

export default function ProfilePage() {
    const { t, formatPrice, formatDate } = useLocale();
    const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(false);

    const {
        loading, userData, profileLoadError, toast,
        name, setName, phone, setPhone, email, dob, setDob, gender, setGender,
        identityType, setIdentityType, identityNo, setIdentityNo, avatarUrl,
        isAvatarUploading, isUpdatingInfo, fileInputRef,
        totalTrips, confirmedTrips,
        recentBookings, myVouchers,
        myTickets, setMyTickets,
        selectedTicket, setSelectedTicket,
        activeTab, setActiveTab,
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmNewPassword, setConfirmNewPassword,
        isChangingPassword,
        handleUpdateInfo, handleChangePassword, handleAvatarClick, handleFileChange,
        refreshAfterPasswordSet, showPasswordSetError,
    } = useProfile();

    if (loading) return <ProfileSkeleton label={t('profile.loading')} />;
    if (!userData) {
        return (
            <div className="bg-background text-on-background min-h-screen font-body flex flex-col">
                <Header />
                <main className="flex-grow px-6 py-32">
                    <div className="mx-auto max-w-xl rounded-2xl border border-error/20 bg-white p-8 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
                            <span className="material-symbols-outlined">error</span>
                        </div>
                        <h1 className="font-headline text-2xl font-bold text-on-surface">{t('profile.loadErrorTitle')}</h1>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                            {profileLoadError || t('profile.loadError')}
                        </p>
                        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                            >
                                {t('profile.retry')}
                            </button>
                            <Link href="/" className="rounded-full border border-outline-variant px-5 py-2.5 text-sm font-bold text-on-surface transition hover:bg-surface-container-low">
                                {t('profile.backHome')}
                            </Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const memberSinceLabel = userData.createdAt
        ? t('profile.memberSinceYear', { year: new Date(userData.createdAt).getFullYear() })
        : t('profile.memberSince');

    const activeBookings = recentBookings.filter(
        b => b.status !== 'CANCELLED' && b.status !== 'CANCEL_REQUESTED'
    );

    return (
        <div className="bg-background text-on-background min-h-screen font-body flex flex-col relative">
            <Header />

            {toast && (
                <div className="fixed top-24 right-8 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`bg-white border-l-4 ${toast.type === 'success' ? 'border-emerald-500' : 'border-red-500'} shadow-2xl rounded-xl px-6 py-4 flex items-center gap-4`}>
                        <div className={`w-10 h-10 rounded-full ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} flex items-center justify-center`}>
                            <span className="material-symbols-outlined text-2xl">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 font-headline">{toast.type === 'success' ? t('profile.toastSuccessTitle') : t('profile.toastErrorTitle')}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{toast.msg}</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10 w-full flex-grow">
                <ProfileHeader
                    name={name}
                    email={email}
                    avatarUrl={avatarUrl}
                    isAvatarUploading={isAvatarUploading}
                    totalTrips={totalTrips}
                    confirmedTrips={confirmedTrips}
                    memberSinceLabel={memberSinceLabel}
                    onAvatarClick={handleAvatarClick}
                    onFileChange={handleFileChange}
                    fileInputRef={fileInputRef}
                    t={t}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* ── LEFT SIDEBAR ── */}
                    <div className="lg:col-span-1 space-y-5">

                        {/* 1) Bao mat & Dang nhap — SecurityCard */}
                        <SecurityCard
                            authProvider={userData?.authProvider}
                            email={userData?.email}
                            currentPassword={currentPassword} setCurrentPassword={setCurrentPassword}
                            newPassword={newPassword} setNewPassword={setNewPassword}
                            confirmNewPassword={confirmNewPassword} setConfirmNewPassword={setConfirmNewPassword}
                            isChangingPassword={isChangingPassword}
                            onChangePassword={handleChangePassword}
                            onPasswordSet={refreshAfterPasswordSet}
                            onPasswordSetError={showPasswordSetError}
                            t={t}
                        />

                        {/* 2) Thong tin ca nhan — Accordion */}
                        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setIsPersonalInfoOpen(v => !v)}
                                className="group flex w-full items-center justify-between px-5 py-4 transition-[background-color,color] duration-200 ease-out hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 motion-reduce:transition-none"
                            >
                                <span className="flex items-center gap-2 text-sm font-bold text-on-surface">
                                    <span className="material-symbols-outlined text-[18px] text-primary transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none">person</span>
                                    {t('profile.personalInfo')}
                                </span>
                                <span className={`material-symbols-outlined text-outline transition-[transform,color] duration-200 group-hover:text-primary motion-reduce:transition-none ${isPersonalInfoOpen ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>

                            {isPersonalInfoOpen && (
                                <div className="px-5 pb-5 border-t border-outline-variant/10">
                                    <div className="pt-4">
                                        <PersonalInfoForm
                                            name={name} setName={setName}
                                            phone={phone} setPhone={setPhone}
                                            email={email}
                                            dob={dob} setDob={setDob}
                                            gender={gender} setGender={setGender}
                                            identityType={identityType} setIdentityType={setIdentityType}
                                            identityNo={identityNo} setIdentityNo={setIdentityNo}
                                            onSubmit={handleUpdateInfo}
                                            isSubmitting={isUpdatingInfo}
                                            t={t}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3) Voucher */}
                        <VoucherWallet
                            myVouchers={myVouchers}
                            t={t}
                            formatPrice={formatPrice}
                        />
                    </div>


                    {/* ── RIGHT CONTENT ── */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Tab switcher */}
                        <div className="flex items-center gap-1 bg-surface-container-low p-1.5 rounded-2xl w-fit">
                            <button
                                onClick={() => setActiveTab('bookings')}
                                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-[transform,background-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 motion-reduce:transform-none motion-reduce:transition-none ${
                                    activeTab === 'bookings'
                                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                                        : 'text-outline hover:-translate-y-0.5 hover:bg-surface-container-lowest/70 hover:text-on-surface'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm">luggage</span>
                                    {t('profile.myBookings')}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('support')}
                                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-[transform,background-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 motion-reduce:transform-none motion-reduce:transition-none ${
                                    activeTab === 'support'
                                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                                        : 'text-outline hover:-translate-y-0.5 hover:bg-surface-container-lowest/70 hover:text-on-surface'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">support_agent</span>
                                    {t('profile.supportRequests')}
                                    {myTickets.filter(tk => tk.status !== 'RESOLVED').length > 0 && (
                                        <span className="bg-primary text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                                            {myTickets.filter(tk => tk.status !== 'RESOLVED').length}
                                        </span>
                                    )}
                                </span>
                            </button>
                        </div>

                        {/* Bookings Tab */}
                        {activeTab === 'bookings' && (
                          <>
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-headline font-extrabold tracking-tight text-on-surface">{t('profile.myBookings')}</h2>
                                <Link href="/my-bookings" className="text-sm font-bold text-primary hover:underline underline-offset-4 flex items-center gap-1">
                                    {t('profile.viewAllHistory')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {activeBookings.length === 0 ? (
                                    <div className="col-span-full py-10 text-center bg-surface-container-lowest rounded-xl ambient-shadow">
                                        <p className="text-outline font-medium">{t('profile.noTrips')}</p>
                                        <Link href="/destinations" className="text-primary font-bold hover:underline mt-2 inline-block">{t('profile.exploreNow')}</Link>
                                    </div>
                                ) : (
                                    activeBookings.slice(0, 4).map((booking) => (
                                        <RecentBookingCard
                                            key={booking.id}
                                            booking={booking}
                                            t={t}
                                            formatPrice={formatPrice}
                                            formatDate={formatDate}
                                        />
                                    ))
                                )}
                            </div>
                          </>
                        )}

                        {/* Support Tab */}
                        {activeTab === 'support' && (
                          <SupportTicketList
                            tickets={myTickets}
                            onSelectTicket={setSelectedTicket}
                          />
                        )}
                    </div>
                </div>
            </main>

            <Footer />

            {selectedTicket && (
                <SupportTicketDetail
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onTicketUpdate={(updated) => {
                        setMyTickets(prev => prev.map(tk => tk.id === updated.id ? updated : tk));
                        setSelectedTicket(updated);
                    }}
                />
            )}
        </div>
    );
}

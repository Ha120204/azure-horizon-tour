'use client';

import { useStaffDashboard } from './staffDashboard/useStaffDashboard';
import DashboardHeader from './staffDashboard/DashboardHeader';
import WorkQueueSection from './staffDashboard/WorkQueueSection';
import SlaSection from './staffDashboard/SlaSection';
import ContentMetrics from './staffDashboard/ContentMetrics';
import RecentToursSection from './staffDashboard/RecentToursSection';
import RecentTicketsSection from './staffDashboard/RecentTicketsSection';
import BookingLookupSection from './staffDashboard/BookingLookupSection';

export default function StaffDashboard({ staffName }: { staffName: string }) {
    const {
        stats, myTours, myTickets,
        loading, loadError, lastUpdated, fetchData,
        searchQuery, handleQueryChange, bookingResults,
        searching, hasSearched, searchError, handleSearch,
    } = useStaffDashboard();

    const openTickets = stats?.supportOpen ?? 0;
    const pendingBookings = stats?.pending ?? 0;
    const cancelRequests = stats?.cancelRequested ?? 0;
    const totalCriticalWork = pendingBookings + cancelRequests + openTickets;
    const queueTone = loading
        ? 'bg-slate-50 text-slate-700 ring-slate-200'
        : totalCriticalWork > 0
            ? 'bg-amber-50 text-amber-800 ring-amber-100'
            : 'bg-emerald-50 text-emerald-800 ring-emerald-100';

    return (
        <main className="min-h-screen w-full flex-1 bg-slate-50 px-4 pb-16 pt-7 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1400px] space-y-6">
                <DashboardHeader
                    staffName={staffName}
                    loading={loading}
                    loadError={loadError}
                    totalCriticalWork={totalCriticalWork}
                    queueTone={queueTone}
                    lastUpdated={lastUpdated}
                    onRefresh={fetchData}
                />
                <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
                    <WorkQueueSection loading={loading} stats={stats} />
                    <SlaSection loading={loading} stats={stats} />
                </section>
                <ContentMetrics loading={loading} stats={stats} />
                <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                    <RecentToursSection loading={loading} myTours={myTours} />
                    <RecentTicketsSection loading={loading} myTickets={myTickets} openTickets={openTickets} />
                </section>
                <BookingLookupSection
                    searchQuery={searchQuery}
                    onQueryChange={handleQueryChange}
                    bookingResults={bookingResults}
                    searching={searching}
                    hasSearched={hasSearched}
                    searchError={searchError}
                    onSearch={handleSearch}
                />
            </div>
        </main>
    );
}

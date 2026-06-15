'use client';

import { StatisticsBookingSections } from './_components/StatisticsBookingSections';
import { StatisticsDateControls } from './_components/StatisticsDateControls';
import { StatisticsHeader } from './_components/StatisticsHeader';
import { StatisticsKpiSection } from './_components/StatisticsKpiSection';
import { DestinationRevenueSection, RevenueTrendSection } from './_components/StatisticsRevenueSections';
import { StatisticsTopSections } from './_components/StatisticsTopSections';
import { useStatisticsDashboard } from './_hooks/useStatisticsDashboard';

export default function StatisticsPage() {
    const statistics = useStatisticsDashboard();

    return (
        <main className="flex-1 pt-8 px-8 pb-16 max-w-[1600px] mx-auto w-full bg-slate-50 min-h-screen">
            <StatisticsHeader
                from={statistics.from}
                to={statistics.to}
                lastUpdatedAt={statistics.lastUpdatedAt}
                dashboardError={statistics.dashboardError}
            />

            <StatisticsDateControls
                today={statistics.today}
                activeDays={statistics.activeDays}
                customFrom={statistics.customFrom}
                customTo={statistics.customTo}
                isCustom={statistics.isCustom}
                granularityLabel={statistics.gran}
                periodLabel={statistics.periodLabel}
                loading={statistics.loading}
                onPreset={statistics.handlePreset}
                onCustomFromChange={statistics.setCustomFrom}
                onCustomToChange={statistics.setCustomTo}
                onCustomApply={statistics.handleCustomApply}
                onRefresh={() => statistics.fetchAll()}
            />

            <StatisticsKpiSection
                loading={statistics.loading}
                overview={statistics.overview}
            />

            <RevenueTrendSection
                loading={statistics.loading}
                gran={statistics.gran}
                revenueData={statistics.revenueData}
                hasRevenueData={statistics.hasRevenueData}
                maxRevenue={statistics.maxRevenue}
                totalRevenue={statistics.totalRevenue}
                totalTrendBookings={statistics.totalTrendBookings}
                nonZeroRevenuePoints={statistics.nonZeroRevenuePoints}
                bestRevenuePoint={statistics.bestRevenuePoint}
            />

            <DestinationRevenueSection
                loading={statistics.loading}
                destRevenue={statistics.destRevenue}
                topDestination={statistics.topDestination}
                topDestinationShare={statistics.topDestinationShare}
            />

            <StatisticsBookingSections
                loading={statistics.loading}
                bookingStatus={statistics.bookingStatus}
                cancellationRate={statistics.cancellationRate}
                trendHasEnoughData={statistics.trendHasEnoughData}
            />

            <StatisticsTopSections
                loading={statistics.loading}
                topTours={statistics.topTours}
                topCustomers={statistics.topCustomers}
                voucherOverview={statistics.voucherOverview}
                topVouchers={statistics.topVouchers}
            />
        </main>
    );
}

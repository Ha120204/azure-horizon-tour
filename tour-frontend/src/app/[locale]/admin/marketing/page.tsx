'use client';

import { MarketingCampaignOverview } from './_components/MarketingCampaignOverview';
import { MarketingKpiGrid } from './_components/MarketingKpiGrid';
import { MarketingOverlays } from './_components/MarketingOverlays';
import { MarketingPageHeader } from './_components/MarketingPageHeader';
import { SubscriberSection } from './_components/SubscriberSection';
import { useMarketingManagement } from './_hooks/useMarketingManagement';

export default function MarketingPage() {
  const marketing = useMarketingManagement();

  return (
    <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto">
      <MarketingPageHeader
        onExportCsv={marketing.exportCsv}
        onCreateCampaign={marketing.openCreateCampaign}
      />

      <MarketingKpiGrid
        stats={marketing.stats}
        status={marketing.status}
        onFilterChange={marketing.toggleStatusFilter}
      />

      <MarketingCampaignOverview
        drafts={marketing.campaignDrafts}
        filter={marketing.campaignFilter}
        counts={marketing.campaignCounts}
        meta={marketing.campaignMeta}
        page={marketing.campaignPage}
        onFilterChange={marketing.changeCampaignFilter}
        onPageChange={marketing.setCampaignPage}
        onCreateCampaign={marketing.openCreateCampaign}
        onEditCampaign={marketing.openEditCampaign}
        onScheduleCampaign={marketing.openScheduleCampaign}
        onDeleteDraft={marketing.deleteCampaignDraft}
        onCancelCampaign={marketing.setCancelCampaignTarget}
      />

      <SubscriberSection
        search={marketing.search}
        status={marketing.status}
        filteredSummary={marketing.filteredSummary}
        subscribers={marketing.subscribers}
        isLoading={marketing.isLoading}
        loadingId={marketing.loadingId}
        meta={marketing.meta}
        page={marketing.page}
        limit={marketing.limit}
        onSearchChange={marketing.setSearch}
        onStatusChange={marketing.changeStatus}
        onToggleActive={marketing.handleToggleActive}
        onDelete={marketing.setDeleteTarget}
        onPageChange={marketing.setPage}
        onPageSizeChange={marketing.changePageSize}
      />

      <MarketingOverlays
        composerOpen={marketing.composerOpen}
        isEditingCampaign={Boolean(marketing.editingCampaignId)}
        campaignForm={marketing.campaignForm}
        setCampaignForm={marketing.setCampaignForm}
        campaignErrors={marketing.campaignErrors}
        setCampaignErrors={marketing.setCampaignErrors}
        stats={marketing.stats}
        recipientEstimate={marketing.recipientEstimate}
        currentFilterSummary={marketing.filteredSummary}
        currentSearch={marketing.search}
        currentStatus={marketing.status}
        testEmail={marketing.testEmail}
        setTestEmail={marketing.setTestEmail}
        isSendingTest={marketing.isSendingTest}
        onCloseComposer={() => marketing.setComposerOpen(false)}
        onSendTest={marketing.sendTestCampaign}
        onSaveCampaign={marketing.saveCampaignDraft}
        scheduleTarget={marketing.scheduleTarget}
        scheduleDate={marketing.scheduleDate}
        setScheduleDate={marketing.setScheduleDate}
        scheduleHour={marketing.scheduleHour}
        setScheduleHour={marketing.setScheduleHour}
        scheduleMinute={marketing.scheduleMinute}
        setScheduleMinute={marketing.setScheduleMinute}
        scheduleError={marketing.scheduleError}
        setScheduleError={marketing.setScheduleError}
        isScheduling={marketing.isScheduling}
        onCancelSchedule={() => marketing.setScheduleTarget(null)}
        onConfirmSchedule={marketing.scheduleCampaign}
        cancelCampaignTarget={marketing.cancelCampaignTarget}
        isCancellingCampaign={marketing.isCancellingCampaign}
        onCloseCancelCampaign={() => marketing.setCancelCampaignTarget(null)}
        onConfirmCancelCampaign={marketing.cancelScheduledCampaign}
        deleteTarget={marketing.deleteTarget}
        isDeleting={marketing.isDeleting}
        onCancelDelete={() => marketing.setDeleteTarget(null)}
        onConfirmDelete={marketing.confirmDelete}
      />
    </main>
  );
}

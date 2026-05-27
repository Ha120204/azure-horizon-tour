'use client';

import type { Dispatch, SetStateAction } from 'react';
import { CampaignComposerDialog } from './CampaignComposerDialog';
import { DeleteSubscriberDialog } from './DeleteSubscriberDialog';
import { MarketingToast } from './MarketingToast';
import { ScheduleCampaignDialog } from './ScheduleCampaignDialog';
import type {
  CampaignDraft,
  CampaignErrors,
  CampaignForm,
  Subscriber,
  SubscriberStats,
  SubscriberStatus,
  ToastState,
} from '../_lib/types';

interface MarketingOverlaysProps {
  composerOpen: boolean;
  isEditingCampaign: boolean;
  campaignForm: CampaignForm;
  setCampaignForm: Dispatch<SetStateAction<CampaignForm>>;
  campaignErrors: CampaignErrors;
  setCampaignErrors: Dispatch<SetStateAction<CampaignErrors>>;
  stats: SubscriberStats;
  recipientEstimate: number;
  currentFilterSummary: string;
  currentSearch: string;
  currentStatus: SubscriberStatus;
  testEmail: string;
  setTestEmail: Dispatch<SetStateAction<string>>;
  isSendingTest: boolean;
  onCloseComposer: () => void;
  onSendTest: () => void;
  onSaveCampaign: () => void;
  scheduleTarget: CampaignDraft | null;
  scheduleDate: string;
  setScheduleDate: Dispatch<SetStateAction<string>>;
  scheduleHour: string;
  setScheduleHour: Dispatch<SetStateAction<string>>;
  scheduleMinute: string;
  setScheduleMinute: Dispatch<SetStateAction<string>>;
  scheduleError: string;
  setScheduleError: Dispatch<SetStateAction<string>>;
  isScheduling: boolean;
  onCancelSchedule: () => void;
  onConfirmSchedule: () => void;
  deleteTarget: Subscriber | null;
  isDeleting: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  toast: ToastState | null;
}

export function MarketingOverlays({
  composerOpen,
  isEditingCampaign,
  campaignForm,
  setCampaignForm,
  campaignErrors,
  setCampaignErrors,
  stats,
  recipientEstimate,
  currentFilterSummary,
  currentSearch,
  currentStatus,
  testEmail,
  setTestEmail,
  isSendingTest,
  onCloseComposer,
  onSendTest,
  onSaveCampaign,
  scheduleTarget,
  scheduleDate,
  setScheduleDate,
  scheduleHour,
  setScheduleHour,
  scheduleMinute,
  setScheduleMinute,
  scheduleError,
  setScheduleError,
  isScheduling,
  onCancelSchedule,
  onConfirmSchedule,
  deleteTarget,
  isDeleting,
  onCancelDelete,
  onConfirmDelete,
  toast,
}: MarketingOverlaysProps) {
  return (
    <>
      {composerOpen && (
        <CampaignComposerDialog
          isEditing={isEditingCampaign}
          campaignForm={campaignForm}
          setCampaignForm={setCampaignForm}
          campaignErrors={campaignErrors}
          setCampaignErrors={setCampaignErrors}
          stats={stats}
          recipientEstimate={recipientEstimate}
          currentFilterSummary={currentFilterSummary}
          currentSearch={currentSearch}
          currentStatus={currentStatus}
          testEmail={testEmail}
          setTestEmail={setTestEmail}
          isSendingTest={isSendingTest}
          onClose={onCloseComposer}
          onSendTest={onSendTest}
          onSave={onSaveCampaign}
        />
      )}

      {scheduleTarget && (
        <ScheduleCampaignDialog
          campaign={scheduleTarget}
          scheduleDate={scheduleDate}
          setScheduleDate={setScheduleDate}
          scheduleHour={scheduleHour}
          setScheduleHour={setScheduleHour}
          scheduleMinute={scheduleMinute}
          setScheduleMinute={setScheduleMinute}
          scheduleError={scheduleError}
          setScheduleError={setScheduleError}
          isScheduling={isScheduling}
          onCancel={onCancelSchedule}
          onConfirm={onConfirmSchedule}
        />
      )}

      {deleteTarget && (
        <DeleteSubscriberDialog
          subscriber={deleteTarget}
          isDeleting={isDeleting}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      )}

      <MarketingToast toast={toast} />
    </>
  );
}

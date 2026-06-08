import Dialog from '@/components/ui/Dialog';
import { formatDate } from '../_lib/helpers';
import type { CampaignDraft } from '../_lib/types';

interface CancelCampaignDialogProps {
  campaign: CampaignDraft;
  isCancelling: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CancelCampaignDialog({
  campaign,
  isCancelling,
  onCancel,
  onConfirm,
}: CancelCampaignDialogProps) {
  return (
    <Dialog
      open
      onClose={onCancel}
      variant="warning"
      icon="event_busy"
      title="Hủy lịch gửi chiến dịch?"
      description={
        <>
          Chiến dịch <strong className="text-on-surface">{campaign.name}</strong>
          {campaign.scheduledAt && <> dự kiến gửi lúc <strong className="text-on-surface">{formatDate(campaign.scheduledAt)}</strong></>}
          . Nội dung và lịch sử chiến dịch vẫn được giữ lại.
        </>
      }
      confirmLabel="Hủy lịch gửi"
      onConfirm={onConfirm}
      loading={isCancelling}
    />
  );
}

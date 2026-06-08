import Dialog from '@/components/ui/Dialog';
import type { Subscriber } from '../_lib/types';

interface DeleteSubscriberDialogProps {
  subscriber: Subscriber;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteSubscriberDialog({
  subscriber,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteSubscriberDialogProps) {
  return (
    <Dialog
      open
      onClose={onCancel}
      variant="danger"
      icon="delete"
      title="Xóa người đăng ký?"
      description={
        <>Email <strong className="text-on-surface">{subscriber.email}</strong> sẽ bị xóa khỏi danh sách nhận tin.</>
      }
      confirmLabel="Xóa"
      onConfirm={onConfirm}
      loading={isDeleting}
    />
  );
}

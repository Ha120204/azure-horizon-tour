import Dialog from '@/components/ui/Dialog';
import type { User } from '../_lib/types';

interface ToggleStatusDialogProps {
    user: User;
    isToggling: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export function ToggleStatusDialog({ user, isToggling, onCancel, onConfirm }: ToggleStatusDialogProps) {
    const isActive = user.status === 'Active';

    return (
        <Dialog
            open
            onClose={onCancel}
            zIndex={60}
            variant={isActive ? 'danger' : 'success'}
            icon={isActive ? 'block' : 'lock_open'}
            title={isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
            description={
                isActive ? (
                    <>Tài khoản <strong className="text-on-surface">&quot;{user.fullName}&quot;</strong> sẽ bị khóa và không thể đăng nhập cho đến khi được mở khóa lại.</>
                ) : (
                    <>Tài khoản <strong className="text-on-surface">&quot;{user.fullName}&quot;</strong> sẽ được mở khóa và có thể đăng nhập bình thường.</>
                )
            }
            confirmLabel={isActive ? 'Khóa tài khoản' : 'Mở khóa'}
            onConfirm={onConfirm}
            loading={isToggling}
        />
    );
}

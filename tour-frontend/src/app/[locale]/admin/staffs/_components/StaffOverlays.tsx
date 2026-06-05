'use client';

import { CreateStaffModal } from './CreateStaffModal';
import { StaffDetailModal } from './StaffDetailModal';
import { StaffBulkStatusDialog, StaffRoleDialog, StaffToggleStatusDialog } from './StaffDialogs';
import { StaffToast } from './StaffPageSections';
import type { useStaffManagement } from '../_hooks/useStaffManagement';

interface StaffOverlaysProps {
    model: ReturnType<typeof useStaffManagement>;
}

export function StaffOverlays({ model }: StaffOverlaysProps) {
    const bulkTargetCount = model.bulkActionStatus === 'active'
        ? model.selectedDeactivatedCount
        : model.selectedActiveCount;
    const itemLabel = model.isSuperAdminView ? 'quản trị viên' : 'nhân viên';

    return (
        <>
            {(model.detailUser || model.isLoadingDetail) && (
                <StaffDetailModal
                    user={model.detailUser}
                    isLoading={model.isLoadingDetail}
                    isEditing={model.isEditing}
                    editForm={model.editForm}
                    isSaving={model.isSaving}
                    canEditRoles={model.canEditRoles}
                    onClose={model.closeDetail}
                    onStartEditing={model.startEditing}
                    onCancelEditing={() => model.setIsEditing(false)}
                    onEditFormChange={model.updateEditForm}
                    onSaveInfo={model.handleSaveInfo}
                    onChangeRole={model.requestRoleChange}
                    onToggleStatus={model.setToggleTarget}
                />
            )}

            {model.canEditRoles && model.roleEditUser && (
                <StaffRoleDialog
                    user={model.roleEditUser}
                    newRole={model.newRole}
                    isUpdating={model.isUpdatingRole}
                    onRoleChange={model.setNewRole}
                    onCancel={() => model.setRoleEditUser(null)}
                    onConfirm={model.handleUpdateRole}
                />
            )}

            {model.toggleTarget && (
                <StaffToggleStatusDialog
                    user={model.toggleTarget}
                    isToggling={model.isToggling}
                    onCancel={() => model.setToggleTarget(null)}
                    onConfirm={model.handleToggleStatus}
                />
            )}

            {model.bulkActionStatus && (
                <StaffBulkStatusDialog
                    status={model.bulkActionStatus}
                    count={bulkTargetCount}
                    itemLabel={itemLabel}
                    isUpdating={model.isBulkUpdating}
                    onCancel={() => model.setBulkActionStatus(null)}
                    onConfirm={model.handleBulkStatusChange}
                />
            )}

            {model.showCreateModal && (
                <CreateStaffModal
                    createTitle={model.createTitle}
                    createDescription={model.createDescription}
                    createButtonLabel={model.createButtonLabel}
                    createForm={model.createForm}
                    confirmPassword={model.confirmPassword}
                    showPassword={model.showPassword}
                    showConfirmPassword={model.showConfirmPassword}
                    isCreating={model.isCreating}
                    createErrors={model.createErrors}
                    onClose={() => model.setShowCreateModal(false)}
                    onCreate={model.handleCreateUser}
                    setCreateForm={model.setCreateForm}
                    setConfirmPassword={model.setConfirmPassword}
                    setShowPassword={model.setShowPassword}
                    setShowConfirmPassword={model.setShowConfirmPassword}
                    setCreateErrors={model.setCreateErrors}
                />
            )}

            <StaffToast toast={model.toast} />
        </>
    );
}

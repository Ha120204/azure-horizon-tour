'use client';

import TourContentDrawer from './TourContentDrawer';
import TourFormModal from './TourFormModal';
import ReviewTourModal from './ReviewTourModal';
import type { TourFormModalProps } from './tourForm/types';
import { TourReferenceDrawer } from './TourReferenceDrawer';
import {
    BulkHideConfirmDialog,
    BulkPermanentDeleteDialog,
    DeleteTourDialog,
    PermanentDeleteDialog,
} from './TourConfirmDialogs';
import { SubmitTourReviewDialog } from './SubmitTourReviewDialog';
import { TourToast } from './TourToast';
import type { Destination, ModalMode, ToastState, Tour, TourReviewAction, TrashedTour } from '../_lib/types';

interface TourOverlaysProps {
    showBulkConfirm: boolean;
    selectedCount: number;
    isBulkDeleting: boolean;
    onCancelBulkConfirm: () => void;
    onConfirmBulkHide: () => void | Promise<void>;
    showTrashBulkDeleteConfirm: boolean;
    trashSelectedCount: number;
    isTrashBulkDeleting: boolean;
    onCancelTrashBulkDelete: () => void;
    onConfirmTrashBulkDelete: () => void | Promise<void>;
    permDeleteTarget: TrashedTour | null;
    isPermDeleting: boolean;
    onCancelPermanentDelete: () => void;
    onConfirmPermanentDelete: () => void | Promise<void>;
    contentDrawerTour: Tour | null;
    onCloseContentDrawer: () => void;
    onContentSuccess: (message: string) => void;
    detailDrawerTour: Tour | null;
    isDetailLoading: boolean;
    onCloseDetailDrawer: () => void;
    onCreateDraftFromReference: () => void;
    submitTarget: Tour | null;
    submittingTourId: number | null;
    onConfirmSubmit: (tourId: number) => void | Promise<void>;
    onCancelSubmit: () => void;
    modalMode: ModalMode;
    selectedTour: Tour | null;
    destinations: Destination[];
    userRole: string;
    onFormSuccess: TourFormModalProps['onSuccess'];
    onCloseForm: () => void;
    onDestinationCreated: TourFormModalProps['onDestinationCreated'];
    reviewTarget: { tour: Tour; action: TourReviewAction } | null;
    onConfirmReview: (action: TourReviewAction, note?: string) => Promise<void>;
    onCloseReview: () => void;
    deleteTarget: Tour | null;
    isStaff: boolean;
    isDeleting: boolean;
    onCancelDelete: () => void;
    onConfirmDelete: () => void | Promise<void>;
    toast: ToastState | null;
}

export function TourOverlays({
    showBulkConfirm,
    selectedCount,
    isBulkDeleting,
    onCancelBulkConfirm,
    onConfirmBulkHide,
    showTrashBulkDeleteConfirm,
    trashSelectedCount,
    isTrashBulkDeleting,
    onCancelTrashBulkDelete,
    onConfirmTrashBulkDelete,
    permDeleteTarget,
    isPermDeleting,
    onCancelPermanentDelete,
    onConfirmPermanentDelete,
    contentDrawerTour,
    onCloseContentDrawer,
    onContentSuccess,
    detailDrawerTour,
    isDetailLoading,
    onCloseDetailDrawer,
    onCreateDraftFromReference,
    submitTarget,
    submittingTourId,
    onConfirmSubmit,
    onCancelSubmit,
    modalMode,
    selectedTour,
    destinations,
    userRole,
    onFormSuccess,
    onCloseForm,
    onDestinationCreated,
    reviewTarget,
    onConfirmReview,
    onCloseReview,
    deleteTarget,
    isStaff,
    isDeleting,
    onCancelDelete,
    onConfirmDelete,
    toast,
}: TourOverlaysProps) {
    return (
        <>
            {showBulkConfirm && (
                <BulkHideConfirmDialog
                    selectedCount={selectedCount}
                    isBulkDeleting={isBulkDeleting}
                    onCancel={onCancelBulkConfirm}
                    onConfirm={onConfirmBulkHide}
                />
            )}

            {showTrashBulkDeleteConfirm && (
                <BulkPermanentDeleteDialog
                    selectedCount={trashSelectedCount}
                    isDeleting={isTrashBulkDeleting}
                    onCancel={onCancelTrashBulkDelete}
                    onConfirm={onConfirmTrashBulkDelete}
                />
            )}

            {permDeleteTarget && (
                <PermanentDeleteDialog
                    tour={permDeleteTarget}
                    isDeleting={isPermDeleting}
                    onCancel={onCancelPermanentDelete}
                    onConfirm={onConfirmPermanentDelete}
                />
            )}

            {contentDrawerTour && (
                <TourContentDrawer
                    tour={contentDrawerTour}
                    onClose={onCloseContentDrawer}
                    onSuccess={onContentSuccess}
                />
            )}

            {detailDrawerTour && (
                <TourReferenceDrawer
                    tour={detailDrawerTour}
                    isStaff={isStaff}
                    isLoading={isDetailLoading}
                    onClose={onCloseDetailDrawer}
                    onCreateDraft={onCreateDraftFromReference}
                />
            )}

            {submitTarget && (
                <SubmitTourReviewDialog
                    tour={submitTarget}
                    onConfirm={() => onConfirmSubmit(submitTarget.id)}
                    onCancel={onCancelSubmit}
                    isSubmitting={submittingTourId === submitTarget.id}
                />
            )}

            {modalMode && (
                <TourFormModal
                    mode={modalMode}
                    initialData={selectedTour ?? undefined}
                    destinations={destinations}
                    userRole={userRole}
                    onSuccess={onFormSuccess}
                    onClose={onCloseForm}
                    onDestinationCreated={onDestinationCreated}
                />
            )}

            {reviewTarget && (
                <ReviewTourModal
                    tour={reviewTarget.tour}
                    action={reviewTarget.action}
                    onConfirm={onConfirmReview}
                    onClose={onCloseReview}
                />
            )}

            {deleteTarget && (
                <DeleteTourDialog
                    tour={deleteTarget}
                    isStaff={isStaff}
                    isDeleting={isDeleting}
                    onCancel={onCancelDelete}
                    onConfirm={onConfirmDelete}
                />
            )}

            <TourToast toast={toast} />
        </>
    );
}

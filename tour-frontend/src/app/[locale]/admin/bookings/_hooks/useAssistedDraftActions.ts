'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { getApiErrorMessage, getErrorMessage } from '../_lib/helpers';
import { validateDraftForApproval } from '../_lib/assistedBookingUtils';
import type {
  AssistedDraft,
  AssistedDraftAction,
  AssistedDraftForm,
  DraftPassenger,
  TourOption,
} from '../_lib/types';

interface UseAssistedDraftActionsParams {
  form: AssistedDraftForm;
  editingDraft: AssistedDraft | null;
  tours: TourOption[];
  isAdmin: boolean;
  hasResolvedRole: boolean;
  completionActionText: string;
  effectivePassengerDrafts: DraftPassenger[];
  validateForApproval: () => boolean;
  resetDraftForm: () => void;
  setDraftFormError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setViewingDraft: React.Dispatch<React.SetStateAction<AssistedDraft | null>>;
  setDrafts: React.Dispatch<React.SetStateAction<AssistedDraft[]>>;
  onChanged: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export function useAssistedDraftActions({
  form,
  editingDraft,
  tours,
  isAdmin,
  hasResolvedRole,
  completionActionText,
  effectivePassengerDrafts,
  validateForApproval,
  resetDraftForm,
  setDraftFormError,
  setIsDrawerOpen,
  setViewingDraft,
  setDrafts,
  onChanged,
  showToast,
}: UseAssistedDraftActionsParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [draftActionDialog, setDraftActionDialog] = useState<{
    draft: AssistedDraft;
    action: AssistedDraftAction;
    reason: string;
    validationIssues?: string[];
    error?: string;
    isSubmitting: boolean;
  } | null>(null);
  const [draftDeleteDialog, setDraftDeleteDialog] = useState<{
    draft: AssistedDraft;
    error?: string;
    isSubmitting: boolean;
  } | null>(null);

  const executeDraftAction = async (draft: AssistedDraft, action: AssistedDraftAction, reason = '') => {
    try {
      const body =
        action === 'approve'
          ? { note: reason || 'Admin duyệt từ màn hình quản lý đặt tour' }
          : action === 'reject' || action === 'request-revision'
            ? { reason }
            : {};
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/assisted-drafts/${draft.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(getApiErrorMessage(json, 'Thao tác thất bại'));
      const payload = json?.data ?? json;
      const updated = payload?.draft ?? payload;
      setDrafts(prev => prev.map(item => item.id === draft.id ? updated : item));
      if (action === 'approve') onChanged();
      const successMessage =
        action === 'approve' ? 'Đã duyệt bản nháp và tạo booking thật.'
        : action === 'submit' ? 'Đã gửi bản nháp sang admin chờ duyệt.'
        : action === 'request-revision' ? 'Đã gửi yêu cầu chỉnh sửa cho staff.'
        : action === 'reject' ? 'Đã từ chối bản nháp đặt hộ.'
        : 'Đã cập nhật bản nháp.';
      showToast(successMessage);
      return { ok: true as const };
    } catch (e: unknown) {
      const message = getErrorMessage(e, 'Thao tác thất bại');
      showToast(message, false);
      return { ok: false as const, error: message };
    }
  };

  const createDraft = async (submitAfterCreate: boolean) => {
    setDraftFormError(null);
    if (submitAfterCreate && !hasResolvedRole) {
      showToast('Đang xác thực quyền thao tác, vui lòng thử lại sau giây lát', false);
      return;
    }
    if (submitAfterCreate && !validateForApproval()) {
      const msg = 'Vui lòng kiểm tra các trường bắt buộc được đánh dấu bên dưới.';
      setDraftFormError(msg);
      showToast(`Vui lòng hoàn tất các trường bắt buộc trước khi ${completionActionText}`, false);
      return;
    }

    setIsSaving(true);
    try {
      const passengers = effectivePassengerDrafts;
      const body = {
        customerName: form.customerName.trim() || undefined,
        customerEmail: form.customerEmail.trim() || undefined,
        customerPhone: form.customerPhone.trim() || undefined,
        customerIdentityNo: form.customerIdentityNo.trim() || undefined,
        sourceChannel: form.sourceChannel,
        confirmationChannel: form.confirmationChannel,
        emailForTicket: form.emailForTicket.trim() || form.customerEmail.trim() || undefined,
        tourId: form.tourId ? Number(form.tourId) : undefined,
        departureId: form.departureId ? Number(form.departureId) : undefined,
        packageId: form.packageId ? Number(form.packageId) : undefined,
        numberOfPeople: passengers.length,
        passengers,
        voucherCode: form.voucherCode.trim() || undefined,
        specialRequests: form.specialRequests.trim() || undefined,
        internalNote: form.internalNote.trim() || undefined,
      };

      if (submitAfterCreate && (!body.customerName || !body.customerEmail || !body.tourId)) {
        const msg = 'Vui lòng nhập người đại diện và chọn tour';
        setDraftFormError(msg);
        showToast(msg, false);
        return;
      }

      const res = await fetchWithAuth(
        editingDraft
          ? `${API_BASE_URL}/booking/admin/assisted-drafts/${editingDraft.id}`
          : `${API_BASE_URL}/booking/admin/assisted-drafts`,
        {
          method: editingDraft ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(getApiErrorMessage(json, editingDraft ? 'Cập nhật bản nháp thất bại' : 'Tạo bản nháp thất bại'));
      let draft: AssistedDraft = json?.data ?? json;

      if (submitAfterCreate) {
        const action = isAdmin ? 'approve' : 'submit';
        const submitRes = await fetchWithAuth(`${API_BASE_URL}/booking/admin/assisted-drafts/${draft.id}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: isAdmin ? JSON.stringify({ note: 'Admin duyệt trực tiếp từ màn hình đặt hộ' }) : undefined,
        });
        const submitJson = await submitRes.json();
        if (!submitRes.ok) throw new Error(getApiErrorMessage(submitJson, isAdmin ? 'Duyệt bản nháp thất bại' : 'Gửi duyệt thất bại'));
        const actionPayload = submitJson?.data ?? submitJson;
        draft = actionPayload?.draft ?? actionPayload;
        onChanged();
      }

      setDrafts(prev => editingDraft
        ? prev.map(item => item.id === draft.id ? draft : item)
        : [draft, ...prev]);
      setIsDrawerOpen(false);
      resetDraftForm();
      showToast(submitAfterCreate
        ? (isAdmin ? 'Đã lưu, duyệt và tạo booking thật' : 'Đã lưu và gửi duyệt bản nháp')
        : (editingDraft ? 'Đã cập nhật bản nháp' : 'Đã lưu bản nháp đặt hộ'));
    } catch (e: unknown) {
      const msg = getErrorMessage(e, 'Thao tác thất bại');
      setDraftFormError(msg);
      showToast(msg, false);
    } finally {
      setIsSaving(false);
    }
  };

  const runDraftAction = (draft: AssistedDraft, action: AssistedDraftAction) => {
    if (action === 'submit' || action === 'approve' || action === 'reject' || action === 'request-revision') {
      const validationIssues = action === 'submit' || action === 'approve' ? validateDraftForApproval(draft, tours) : [];
      setDraftActionDialog({ draft, action, reason: '', validationIssues, isSubmitting: false });
      return;
    }
    void executeDraftAction(draft, action);
  };

  const closeDraftActionDialog = () => {
    setDraftActionDialog(current => current?.isSubmitting ? current : null);
  };

  const canDeleteDraft = (draft: AssistedDraft) =>
    ['DRAFT', 'NEEDS_REVISION', 'REJECTED'].includes(draft.status) && !draft.convertedBooking;

  const openDeleteDraft = (draft: AssistedDraft) => {
    setDraftDeleteDialog({ draft, isSubmitting: false });
  };

  const closeDeleteDraftDialog = () => {
    setDraftDeleteDialog(current => current?.isSubmitting ? current : null);
  };

  const submitDraftActionDialog = async () => {
    if (!draftActionDialog) return;
    const reason = draftActionDialog.reason.trim();
    if (draftActionDialog.action === 'submit' || draftActionDialog.action === 'approve') {
      const validationIssues = validateDraftForApproval(draftActionDialog.draft, tours);
      if (validationIssues.length > 0) {
        setDraftActionDialog(current => current ? { ...current, validationIssues, error: undefined } : current);
        return;
      }
    }
    if ((draftActionDialog.action === 'reject' || draftActionDialog.action === 'request-revision') && !reason) {
      setDraftActionDialog(current => current ? { ...current, error: 'Vui lòng nhập nội dung phản hồi trước khi gửi.' } : current);
      return;
    }
    setDraftActionDialog(current => current ? { ...current, reason, error: undefined, isSubmitting: true } : current);
    const result = await executeDraftAction(draftActionDialog.draft, draftActionDialog.action, reason);
    if (result.ok) {
      setDraftActionDialog(null);
    } else {
      setDraftActionDialog(current => current ? { ...current, error: result.error, isSubmitting: false } : current);
    }
  };

  const confirmDeleteDraft = async () => {
    if (!draftDeleteDialog) return;
    const { draft } = draftDeleteDialog;
    setDraftDeleteDialog(current => current ? { ...current, error: undefined, isSubmitting: true } : current);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/assisted-drafts/${draft.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(getApiErrorMessage(json, 'Xóa bản nháp thất bại'));
      setDrafts(prev => prev.filter(item => item.id !== draft.id));
      setViewingDraft(current => current?.id === draft.id ? null : current);
      setDraftDeleteDialog(null);
      onChanged();
      showToast(`Đã xóa bản nháp ${draft.draftCode}`);
    } catch (error: unknown) {
      setDraftDeleteDialog(current => current
        ? { ...current, error: getErrorMessage(error, 'Xóa bản nháp thất bại'), isSubmitting: false }
        : current);
    }
  };

  return {
    isSaving,
    draftActionDialog,
    setDraftActionDialog,
    draftDeleteDialog,
    createDraft,
    runDraftAction,
    closeDraftActionDialog,
    canDeleteDraft,
    openDeleteDraft,
    closeDeleteDraftDialog,
    submitDraftActionDialog,
    confirmDeleteDraft,
  };
}

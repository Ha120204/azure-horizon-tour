'use client';

import { getPassengerAgeLabel, hasPassengerDetails } from '@/lib/passengerDetails';
import { ASSISTED_STATUS_CFG, PASSENGER_PRICING, SOURCE_CHANNEL_OPTIONS, getSelectOptionLabel } from '../_lib/config';
import { fmt, formatPassengerBreakdown, normalizePassengerTypeLabel } from '../_lib/helpers';
import type { AssistedDraft, AssistedDraftAction, DraftPassenger, PassengerType } from '../_lib/types';

type DraftDialogState = {
  draft: AssistedDraft;
  action: AssistedDraftAction;
  reason: string;
  error?: string;
  isSubmitting: boolean;
};

type DraftDialogConfig = {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  iconClass: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  submitClass: string;
  hint: string;
  requiresReason: boolean;
  showReason: boolean;
};

type DraftDeleteState = {
  draft: AssistedDraft;
  isSubmitting: boolean;
  error?: string;
};

function DraftPassengerList({
  passengers,
  fallbackPeople,
}: {
  passengers?: DraftPassenger[] | null;
  fallbackPeople: number;
}) {
  const displayPassengers: DraftPassenger[] = Array.isArray(passengers) && passengers.length > 0
    ? passengers
    : Array.from({ length: Math.max(1, fallbackPeople || 1) }, () => ({ type: 'Adult (12+)' as PassengerType }));
  const typeCounters: Record<PassengerType, number> = {
    'Adult (12+)': 0,
    'Child (4-11)': 0,
    'Infant (<4)': 0,
  };

  return (
    <div className="space-y-2">
      {displayPassengers.map((passenger, index) => {
        const type = normalizePassengerTypeLabel(String(passenger.type ?? 'Adult (12+)'));
        typeCounters[type] += 1;
        const typeIndex = typeCounters[type];
        const cfg = PASSENGER_PRICING[type];
        const fullName = typeof passenger.fullName === 'string' && passenger.fullName.trim()
          ? passenger.fullName.trim()
          : `${cfg.label} ${typeIndex}`;
        const dob = typeof passenger.dob === 'string' ? passenger.dob.trim() : '';
        const ageLabel = dob ? getPassengerAgeLabel(dob) : `${cfg.age} tuổi`;
        const gender = typeof passenger.gender === 'string' && passenger.gender.trim() ? passenger.gender.trim() : '';
        const identityType = typeof passenger.identityType === 'string' && passenger.identityType.trim() ? passenger.identityType.trim() : '';
        const identityNo = typeof passenger.identityNo === 'string' && passenger.identityNo.trim() ? passenger.identityNo.trim() : '';
        const notes = typeof passenger.notes === 'string' && passenger.notes.trim() ? passenger.notes.trim() : '';
        const hasDetails = hasPassengerDetails(passenger);

        return (
          <div key={`${type}-${typeIndex}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <span className="material-symbols-outlined text-[20px]">{cfg.icon}</span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{fullName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {cfg.label} {typeIndex} · {ageLabel}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                hasDetails
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
              }`}>
                {hasDetails ? 'Có thông tin' : 'Chưa chi tiết'}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
              <p>Ngày sinh: <span className="font-black text-slate-800">{dob || 'Chưa nhập'}</span></p>
              <p>Giới tính: <span className="font-black text-slate-800">{gender || 'Chưa nhập'}</span></p>
              <p className="sm:col-span-2">
                Giấy tờ: <span className="font-black text-slate-800">{identityNo ? `${identityType || 'Giấy tờ'} ${identityNo}` : 'Chưa nhập'}</span>
              </p>
              {notes && (
                <p className="sm:col-span-2">
                  Ghi chú: <span className="font-black text-slate-800">{notes}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AssistedBookingActionsProps {
  draftActionDialog: DraftDialogState | null;
  draftActionDialogConfig: DraftDialogConfig | null | undefined;
  needsApprovalValidation: boolean;
  hasBlockingApprovalIssues: boolean;
  approvalValidationIssues: string[];
  setDraftActionDialog: (v: DraftDialogState | null | ((prev: DraftDialogState | null) => DraftDialogState | null)) => void;
  closeDraftActionDialog: () => void;
  openEditDraft: (draft: AssistedDraft) => void;
  submitDraftActionDialog: () => void;
  draftDeleteDialog: DraftDeleteState | null;
  closeDeleteDraftDialog: () => void;
  confirmDeleteDraft: () => void;
  viewingDraft: AssistedDraft | null;
  setViewingDraft: (v: AssistedDraft | null) => void;
  canDeleteDraft: (draft: AssistedDraft) => boolean;
  openDeleteDraft: (draft: AssistedDraft) => void;
}

export function AssistedBookingActions({
  draftActionDialog,
  draftActionDialogConfig,
  needsApprovalValidation,
  hasBlockingApprovalIssues,
  approvalValidationIssues,
  setDraftActionDialog,
  closeDraftActionDialog,
  openEditDraft,
  submitDraftActionDialog,
  draftDeleteDialog,
  closeDeleteDraftDialog,
  confirmDeleteDraft,
  viewingDraft,
  setViewingDraft,
  canDeleteDraft,
  openDeleteDraft,
}: AssistedBookingActionsProps) {
  return (
    <>
      {draftActionDialog && draftActionDialogConfig && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="draft-review-dialog-title"
          onMouseDown={closeDraftActionDialog}
        >
          <aside
            className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-white/60"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="px-6 pb-5 pt-6 sm:px-7">
              <div className="flex items-start justify-between gap-5">
                <div className="flex min-w-0 items-start gap-4">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${draftActionDialogConfig.iconClass}`}>
                    <span className="material-symbols-outlined text-[24px]">{draftActionDialogConfig.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                      {draftActionDialogConfig.eyebrow}
                    </p>
                    <h3 id="draft-review-dialog-title" className="mt-1 text-xl font-black leading-tight text-slate-950">
                      {draftActionDialogConfig.title}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      {draftActionDialogConfig.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDraftActionDialog}
                  disabled={draftActionDialog.isSubmitting}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Đóng hộp thoại"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-black text-blue-800">{draftActionDialog.draft.draftCode}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">
                    {draftActionDialog.draft.customerName || 'Chưa nhập tên người đại diện'}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                    {draftActionDialog.draft.tour?.name ?? (draftActionDialog.draft.tourId ? `Tour #${draftActionDialog.draft.tourId}` : 'Chưa chọn tour')}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 text-right ring-1 ring-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tạm tính</p>
                  <p className="text-sm font-black text-slate-950">{fmt(draftActionDialog.draft.quotedPrice)}</p>
                </div>
              </div>

              {needsApprovalValidation && (
                <div className={`mt-5 grid gap-3 rounded-2xl border p-4 text-sm ${
                  hasBlockingApprovalIssues
                    ? 'border-red-200 bg-red-50 text-red-950'
                    : 'border-emerald-100 bg-emerald-50 text-emerald-950'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined mt-0.5 text-[18px] ${hasBlockingApprovalIssues ? 'text-red-700' : 'text-emerald-700'}`}>
                      {hasBlockingApprovalIssues ? 'error' : 'fact_check'}
                    </span>
                    <div className="min-w-0">
                      {hasBlockingApprovalIssues ? (
                        <>
                          <p className="font-black">
                            {draftActionDialog.action === 'submit'
                              ? 'Chưa thể gửi duyệt vì còn thiếu hoặc sai thông tin:'
                              : 'Chưa thể duyệt tạo booking vì còn thiếu hoặc sai thông tin:'}
                          </p>
                          <ul className="mt-3 space-y-2 text-sm font-semibold text-red-900">
                            {approvalValidationIssues.map(issue => (
                              <li key={issue} className="flex items-start gap-2">
                                <span className="material-symbols-outlined mt-0.5 text-[15px] text-red-700">cancel</span>
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <>
                          <p className="font-black">
                            {draftActionDialog.action === 'submit'
                              ? 'Đủ điều kiện gửi admin duyệt:'
                              : 'Đủ điều kiện duyệt tạo booking:'}
                          </p>
                          <div className="mt-3 grid gap-2 text-sm font-semibold text-emerald-900 sm:grid-cols-2">
                            <span className="inline-flex items-center gap-2">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              Thông tin người đại diện hợp lệ
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              Tour và lịch khởi hành đã chọn
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              Số khách hợp lệ
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              Kênh gửi thanh toán đã chọn
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {draftActionDialogConfig.showReason ? (
                <label className="mt-5 block space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {draftActionDialogConfig.label}
                    {draftActionDialogConfig.requiresReason ? <span className="text-red-500"> *</span> : null}
                  </span>
                  <textarea
                    autoFocus
                    value={draftActionDialog.reason}
                    onChange={event => setDraftActionDialog(current => current ? { ...current, reason: event.target.value, error: undefined } : current)}
                    placeholder={draftActionDialogConfig.placeholder}
                    disabled={draftActionDialog.isSubmitting}
                    rows={draftActionDialog.action === 'approve' ? 3 : 6}
                    className={`${draftActionDialog.action === 'approve' ? 'min-h-24' : 'min-h-36'} w-full resize-y rounded-2xl border bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition-all placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                      draftActionDialog.error
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                  />
                </label>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-h-5">
                  {draftActionDialog.error ? (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {draftActionDialog.error}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-slate-500">{draftActionDialogConfig.hint}</p>
                  )}
                </div>
                {draftActionDialogConfig.showReason ? (
                  <p className="text-xs font-bold text-slate-400">{draftActionDialog.reason.trim().length} ký tự</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-7">
              {hasBlockingApprovalIssues && (
                <button
                  type="button"
                  onClick={() => {
                    const draft = draftActionDialog.draft;
                    setDraftActionDialog(null);
                    openEditDraft(draft);
                  }}
                  disabled={draftActionDialog.isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Chỉnh sửa để bổ sung
                </button>
              )}
              <button
                type="button"
                onClick={closeDraftActionDialog}
                disabled={draftActionDialog.isSubmitting}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitDraftActionDialog}
                disabled={draftActionDialog.isSubmitting || hasBlockingApprovalIssues}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black shadow-sm outline-none transition-colors focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${draftActionDialogConfig.submitClass}`}
              >
                {draftActionDialog.isSubmitting ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">{draftActionDialogConfig.icon}</span>
                )}
                {draftActionDialogConfig.submitLabel}
              </button>
            </div>
          </aside>
        </div>
      )}

      {draftDeleteDialog && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="draft-delete-dialog-title"
          onMouseDown={closeDeleteDraftDialog}
        >
          <aside
            className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-white/60"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="px-6 pb-5 pt-6">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
                  <span className="material-symbols-outlined text-[24px]">delete</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600">Xóa bản nháp</p>
                  <h3 id="draft-delete-dialog-title" className="mt-1 text-xl font-black text-slate-950">
                    Xóa {draftDeleteDialog.draft.draftCode}?
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    Thao tác này sẽ xóa bản nháp đặt hộ khỏi danh sách và không thể hoàn tác. Chỉ nên xóa khi đây là bản nháp tạo nhầm hoặc không còn nhu cầu xử lý.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm">
                <p className="font-black text-red-950">{draftDeleteDialog.draft.customerName || 'Chưa nhập tên người đại diện'}</p>
                <p className="mt-1 text-red-800/75">{draftDeleteDialog.draft.customerEmail || 'Chưa nhập email'}</p>
                <p className="mt-1 font-semibold text-red-900">{draftDeleteDialog.draft.tour?.name ?? (draftDeleteDialog.draft.tourId ? `Tour #${draftDeleteDialog.draft.tourId}` : 'Chưa chọn tour')}</p>
              </div>

              {draftDeleteDialog.error && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{draftDeleteDialog.error}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteDraftDialog}
                disabled={draftDeleteDialog.isSubmitting}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteDraft}
                disabled={draftDeleteDialog.isSubmitting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:ring-4 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {draftDeleteDialog.isSubmitting && <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>}
                Xóa bản nháp
              </button>
            </div>
          </aside>
        </div>
      )}

      {viewingDraft && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6" onMouseDown={() => setViewingDraft(null)}>
          <aside className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-white/50" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Chi tiết booking draft</p>
                <h3 className="mt-1 font-mono text-2xl font-black text-slate-950">{viewingDraft.draftCode}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">Thông tin bản nháp đặt hộ trước khi duyệt thành đơn thật.</p>
              </div>
              <button onClick={() => setViewingDraft(null)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Trạng thái</p>
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${(ASSISTED_STATUS_CFG[viewingDraft.status] ?? ASSISTED_STATUS_CFG.DRAFT).badge}`}>
                    <span className="material-symbols-outlined text-[14px]">{(ASSISTED_STATUS_CFG[viewingDraft.status] ?? ASSISTED_STATUS_CFG.DRAFT).icon}</span>
                    {(ASSISTED_STATUS_CFG[viewingDraft.status] ?? ASSISTED_STATUS_CFG.DRAFT).label}
                  </span>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-700">Tạm tính</p>
                  <p className="mt-2 text-2xl font-black text-blue-950">{fmt(viewingDraft.quotedPrice)}</p>
                  <p className="mt-1 text-xs font-semibold text-blue-700">{formatPassengerBreakdown(viewingDraft.passengers, viewingDraft.numberOfPeople)} · giảm {fmt(viewingDraft.discountAmount)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="space-y-3">
                  <h4 className="text-sm font-black text-slate-950">Người đại diện</h4>
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="font-black text-slate-950">{viewingDraft.customerName || 'Chưa nhập tên người đại diện'}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.customerEmail || 'Chưa nhập email'}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.customerPhone || 'Chưa nhập số điện thoại'}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.customerIdentityNo ? `CCCD: ${viewingDraft.customerIdentityNo}` : 'Chưa nhập CCCD'}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Nguồn</p>
                    <p className="mt-1 font-bold text-slate-800">{getSelectOptionLabel(SOURCE_CHANNEL_OPTIONS, viewingDraft.sourceChannel, viewingDraft.sourceChannel)}</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-sm font-black text-slate-950">Tour đặt hộ</h4>
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="font-black text-slate-950">{viewingDraft.tour?.name ?? (viewingDraft.tourId ? `Tour #${viewingDraft.tourId}` : 'Chưa chọn tour')}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.tour?.destination?.name ?? 'Chưa có điểm đến'}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Số khách</p>
                        <p className="mt-1 font-black text-slate-900">{formatPassengerBreakdown(viewingDraft.passengers, viewingDraft.numberOfPeople)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Voucher</p>
                        <p className="mt-1 font-black text-slate-900">{viewingDraft.voucherCode || 'Không có'}</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section className="mt-5 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-950">Danh sách khách đi tour</h4>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Hiển thị theo dữ liệu passengers của bản nháp để admin kiểm tra trước khi duyệt.
                    </p>
                  </div>
                  <span className="w-max rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                    {formatPassengerBreakdown(viewingDraft.passengers, viewingDraft.numberOfPeople)}
                  </span>
                </div>
                <DraftPassengerList passengers={viewingDraft.passengers} fallbackPeople={viewingDraft.numberOfPeople} />
              </section>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Yêu cầu của khách</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{viewingDraft.specialRequests || 'Không có'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Ghi chú nội bộ</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{viewingDraft.internalNote || 'Không có'}</p>
                </div>
              </div>

              {(viewingDraft.rejectionReason || viewingDraft.convertedBooking) && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  {viewingDraft.rejectionReason && (
                    <>
                      <p className="text-xs font-black uppercase tracking-wider text-orange-700">Phản hồi duyệt</p>
                      <p className="mt-2 font-semibold text-orange-800">{viewingDraft.rejectionReason}</p>
                    </>
                  )}
                  {viewingDraft.convertedBooking && (
                    <p className="font-bold text-emerald-700">Đã tạo đơn: {viewingDraft.convertedBooking.bookingCode}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
              {canDeleteDraft(viewingDraft) && (
                <button onClick={() => openDeleteDraft(viewingDraft)} className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-black text-red-700 hover:bg-red-100">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Xóa bản nháp
                </button>
              )}
              {['DRAFT', 'NEEDS_REVISION'].includes(viewingDraft.status) && (
                <button onClick={() => { const draft = viewingDraft; setViewingDraft(null); openEditDraft(draft); }} className="rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-800">
                  Chỉnh sửa bản nháp
                </button>
              )}
              <button onClick={() => setViewingDraft(null)} className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Đóng
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

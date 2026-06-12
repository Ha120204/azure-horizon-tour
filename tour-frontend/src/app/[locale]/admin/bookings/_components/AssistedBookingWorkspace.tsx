'use client';

import {
  getPassengerMaxDate,
  getPassengerMinDate,
} from '@/lib/booking/passengerDetails';
import {
  CONFIRMATION_CHANNEL_OPTIONS,
  PASSENGER_PRICING,
  SOURCE_CHANNEL_OPTIONS,
  passengerTypeOrder,
} from '../_lib/config';
import {
  fmt,
  parsePassengerCount,
} from '../_lib/helpers';
import type {
  AssistedDraftForm,
  DraftSelectOption,
} from '../_lib/types';
import { useAssistedBookingWorkspace } from '../_hooks/useAssistedBookingWorkspace';
import { AssistedBookingGrid } from './AssistedBookingGrid';
import { AssistedBookingSidebar } from './AssistedBookingSidebar';
import { DraftSelect } from './DraftSelect';
import { AssistedBookingActions } from './AssistedBookingActions';




const PASSENGER_GENDER_OPTIONS: DraftSelectOption[] = [
  { value: '', label: 'Chưa chọn', description: 'Có thể bổ sung sau', icon: 'person' },
  { value: 'Male', label: 'Nam', icon: 'male' },
  { value: 'Female', label: 'Nữ', icon: 'female' },
  { value: 'Other', label: 'Khác', icon: 'diversity_3' },
];

const ADULT_IDENTITY_OPTIONS: DraftSelectOption[] = [
  { value: 'CCCD', label: 'CCCD', description: 'Căn cước công dân 12 chữ số', icon: 'badge' },
  { value: 'PASSPORT', label: 'Hộ chiếu', description: 'Dùng khi khách đi bằng hộ chiếu', icon: 'public' },
];

const INFANT_IDENTITY_OPTIONS: DraftSelectOption[] = [
  { value: 'BIRTH_CERT', label: 'Giấy khai sinh', description: 'Phù hợp cho em bé/trẻ nhỏ', icon: 'article' },
  { value: 'PASSPORT', label: 'Hộ chiếu', description: 'Dùng khi khách đi bằng hộ chiếu', icon: 'public' },
];

const DRAFT_FIELD_LABELS: Record<keyof AssistedDraftForm, string> = {
  customerName: 'Tên người đại diện',
  customerEmail: 'Email',
  customerPhone: 'Số điện thoại',
  customerIdentityNo: 'CCCD',
  sourceChannel: 'Nguồn',
  confirmationChannel: 'Kênh gửi xác nhận',
  emailForTicket: 'Email nhận vé điện tử',
  tourId: 'Tour',
  departureId: 'Lịch khởi hành',
  packageId: 'Gói tour',
  adultCount: 'Người lớn',
  childCount: 'Trẻ em',
  infantCount: 'Em bé',
  voucherCode: 'Voucher',
  specialRequests: 'Yêu cầu của khách',
  internalNote: 'Ghi chú nội bộ',
};



export function AssistedBookingWorkspace({
  onChanged,
  showToast,
}: {
  onChanged: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const {
    drafts, isLoading,
    isDrawerOpen, setIsDrawerOpen,
    isWorkspaceOpen, setIsWorkspaceOpen,
    editingDraft, viewingDraft, setViewingDraft,
    isSaving, statusFilter, setStatusFilter,
    search, setSearch,
    isTourPickerOpen, setIsTourPickerOpen,
    tourQuery, setTourQuery, tourPickerRef,
    submitErrors, draftFormError,
    setUseRepresentativeAsFirstPassenger,
    editingPassengerIndex, setEditingPassengerIndex,
    draftActionDialog, setDraftActionDialog,
    draftDeleteDialog, form,
    isAdmin, isStaff, hasResolvedRole,
    completionActionText, completionButtonLabel,
    selectedTour, selectedTourDepartures,
    departureOptions, packageOptions,
    baseTourPrice, packageSurcharge, estimatedUnitPrice,
    adultCount, totalPassengerCount, estimatedTotal,
    generatedPassengerRows,
    voucherStatus,
    summaryChecklistItems, missingSummaryCount,
    filteredTours, submitErrorEntries, draftActionDialogConfig,
    pendingCount, needsApprovalValidation, approvalValidationIssues, hasBlockingApprovalIssues,
    fetchDrafts, updateForm, updatePassengerCount,
    getDefaultPassengerIdentityType, openPassengerEditor,
    updatePassengerDetail, clearPassengerDetail, scrollToDraftField,
    resetDraftForm, openCreateDraft, openEditDraft, openDraftDetail,
    createDraft, runDraftAction, closeDraftActionDialog,
    canDeleteDraft, openDeleteDraft, closeDeleteDraftDialog,
    submitDraftActionDialog, confirmDeleteDraft,
  } = useAssistedBookingWorkspace({ onChanged, showToast });

  const draftListId = 'assisted-booking-drafts';
  const draftInputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
  const draftErrorInputClass = 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-100';
  const draftLabelClass = 'text-[11px] font-black uppercase tracking-[0.14em] text-slate-500';
  const fieldClass = (key: keyof AssistedDraftForm) =>
    `${draftInputClass} ${submitErrors[key] ? draftErrorInputClass : ''}`;
  const requiredMark = <span className="text-red-500">*</span>;
  const fieldError = (key: keyof AssistedDraftForm) =>
    submitErrors[key] ? (
      <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
        <span className="material-symbols-outlined text-[14px]">error</span>
        {submitErrors[key]}
      </p>
    ) : null;
  return (
    <section id="assisted-booking-workspace" className="mb-8 overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <span className="material-symbols-outlined text-[22px]">support_agent</span>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-slate-950">Đặt tour hộ khách</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {drafts.length.toLocaleString('vi-VN')} bản nháp
              </span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-100">
                  {pendingCount.toLocaleString('vi-VN')} chờ duyệt
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs font-medium text-slate-500">
              Tạo nhanh đơn hộ từ chat, Zalo, Facebook hoặc điện thoại.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWorkspaceOpen(open => !open)}
            aria-expanded={isWorkspaceOpen}
            aria-controls={draftListId}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="material-symbols-outlined text-[18px]">{isWorkspaceOpen ? 'expand_less' : 'draft'}</span>
            {isWorkspaceOpen ? 'Ẩn bản nháp' : 'Xem bản nháp'}
          </button>
          <button
            type="button"
            onClick={openCreateDraft}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-700/15 transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Tạo đơn hộ
          </button>
        </div>
      </div>

      {isWorkspaceOpen && (
        <div id={draftListId}>
          <AssistedBookingGrid
            drafts={drafts}
            isLoading={isLoading}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onRefresh={fetchDrafts}
            isAdmin={isAdmin}
            isStaff={isStaff}
            onEditDraft={openEditDraft}
            onRunAction={runDraftAction}
            canDeleteDraft={canDeleteDraft}
            onDeleteDraft={openDeleteDraft}
            onViewDraft={openDraftDetail}
          />
        </div>
      )}

      <AssistedBookingActions
        draftActionDialog={draftActionDialog}
        draftActionDialogConfig={draftActionDialogConfig}
        needsApprovalValidation={needsApprovalValidation}
        hasBlockingApprovalIssues={hasBlockingApprovalIssues}
        approvalValidationIssues={approvalValidationIssues}
        setDraftActionDialog={setDraftActionDialog}
        closeDraftActionDialog={closeDraftActionDialog}
        openEditDraft={openEditDraft}
        submitDraftActionDialog={submitDraftActionDialog}
        draftDeleteDialog={draftDeleteDialog}
        closeDeleteDraftDialog={closeDeleteDraftDialog}
        confirmDeleteDraft={confirmDeleteDraft}
        viewingDraft={viewingDraft}
        setViewingDraft={setViewingDraft}
        canDeleteDraft={canDeleteDraft}
        openDeleteDraft={openDeleteDraft}
      />

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6" onMouseDown={() => { setIsDrawerOpen(false); resetDraftForm(); }}>
          <aside
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-slate-50 shadow-2xl ring-1 ring-white/50"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20 sm:flex">
                    <span className="material-symbols-outlined text-[24px]">edit_calendar</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">{editingDraft ? 'Chỉnh sửa booking draft' : 'Tạo booking draft'}</p>
                    <h3 className="mt-1 text-2xl font-black leading-tight text-slate-950">{editingDraft ? 'Cập nhật bản nháp đặt hộ' : 'Đặt tour hộ khách'}</h3>
                    <p className="mt-1 max-w-xl text-sm font-medium text-slate-500">{editingDraft ? `Đang chỉnh ${editingDraft.draftCode}. Cập nhật thông tin rồi lưu lại hoặc ${completionActionText} khi đã đủ dữ liệu.` : `Tạo bản nháp từ thông tin tư vấn, kiểm tra tạm tính rồi ${completionActionText} khi đã sẵn sàng.`}</p>
                  </div>
                </div>
                <button onClick={() => { setIsDrawerOpen(false); resetDraftForm(); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {draftFormError && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-red-600">error</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-black">Không thể thực hiện thao tác</p>
                    <p className="mt-0.5 whitespace-pre-line font-semibold">{draftFormError}</p>
                    {submitErrorEntries.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {submitErrorEntries.map(([key, message]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => scrollToDraftField(key)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100"
                            title={message}
                          >
                            <span className="material-symbols-outlined text-[14px]">report</span>
                            {DRAFT_FIELD_LABELS[key]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="mb-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="material-symbols-outlined mt-0.5 text-[18px] text-amber-600">info</span>
                <p>
                  Các trường có dấu <span className="font-black text-red-500">*</span> chỉ bắt buộc khi bấm <span className="font-bold">{completionButtonLabel}</span>. Khi chỉ lưu nháp, nhân sự có thể lưu lại trước rồi bổ sung sau.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
                <div className="space-y-6">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-700">person</span>
                      <h4 className="text-sm font-black text-slate-950">Thông tin người đại diện</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="space-y-2" data-draft-field="customerName">
                        <span className={draftLabelClass}>Tên người đại diện {requiredMark}</span>
                        <input value={form.customerName} onChange={e => updateForm('customerName', e.target.value)} placeholder="VD: Nguyễn Minh An" className={fieldClass('customerName')} aria-invalid={Boolean(submitErrors.customerName)} />
                        {fieldError('customerName')}
                      </label>
                      <label className="space-y-2" data-draft-field="customerEmail">
                        <span className={draftLabelClass}>Email {requiredMark}</span>
                        <input type="email" value={form.customerEmail} onChange={e => updateForm('customerEmail', e.target.value)} placeholder="email@domain.com" className={fieldClass('customerEmail')} aria-invalid={Boolean(submitErrors.customerEmail)} />
                        {fieldError('customerEmail')}
                      </label>
                      <label className="space-y-2" data-draft-field="customerPhone">
                        <span className={draftLabelClass}>Số điện thoại {requiredMark}</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={11}
                          value={form.customerPhone}
                          onChange={e => updateForm('customerPhone', e.target.value)}
                          placeholder="09xx xxx xxx"
                          className={fieldClass('customerPhone')}
                          aria-invalid={Boolean(submitErrors.customerPhone)}
                        />
                        {fieldError('customerPhone')}
                      </label>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-700">travel_explore</span>
                      <h4 className="text-sm font-black text-slate-950">Tour và lịch trình</h4>
                    </div>
                    <div className="block space-y-2" ref={tourPickerRef} data-draft-field="tourId">
                      <span className={draftLabelClass}>Tour {requiredMark}</span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsTourPickerOpen(open => !open)}
                          className={`flex min-h-[72px] w-full items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-3 text-left shadow-sm outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${submitErrors.tourId ? 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-100' : 'border-slate-200'}`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {selectedTour?.imageUrl ? (
                              <span
                                className="h-12 w-12 shrink-0 rounded-2xl bg-cover bg-center"
                                style={{ backgroundImage: `url(${selectedTour.imageUrl})` }}
                                aria-hidden="true"
                              />
                            ) : (
                              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                                <span className="material-symbols-outlined text-[22px]">travel_explore</span>
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-black text-slate-950">
                                {selectedTour?.name ?? 'Chọn tour cần đặt hộ'}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">
                                {selectedTour ? (
                                  <>
                                    <span>{selectedTour.destination?.name ?? 'Chưa có điểm đến'}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{fmt(selectedTour.price)}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{selectedTour.availableSeats ?? 0} ghế</span>
                                  </>
                                ) : (
                                  <span>Tìm theo tên tour, điểm đến hoặc giá</span>
                                )}
                              </span>
                            </span>
                          </span>
                          <span className={`material-symbols-outlined shrink-0 text-slate-500 transition-transform ${isTourPickerOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>

                        {isTourPickerOpen && (
                          <div className="absolute z-[90] mt-3 w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
                            <div className="border-b border-slate-100 p-3">
                              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-blue-200">
                                <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
                                <input
                                  value={tourQuery}
                                  onChange={e => setTourQuery(e.target.value)}
                                  placeholder="Tìm tour hoặc điểm đến..."
                                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto p-2">
                              {filteredTours.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                  <p className="text-sm font-bold text-slate-800">Không tìm thấy tour phù hợp</p>
                                  <p className="mt-1 text-xs text-slate-500">Thử tìm theo điểm đến hoặc rút gọn từ khóa.</p>
                                </div>
                              ) : (
                                filteredTours.map((tour, index) => {
                                  const isSelected = String(tour.id) === form.tourId;
                                  return (
                                    <button
                                      key={`tour-card-${tour.id ?? 'missing'}-${index}`}
                                      type="button"
                                      onClick={() => {
                                        updateForm('tourId', String(tour.id));
                                        setTourQuery('');
                                        setIsTourPickerOpen(false);
                                      }}
                                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
                                    >
                                      {tour.imageUrl ? (
                                        <span
                                          className="h-14 w-14 shrink-0 rounded-2xl bg-cover bg-center"
                                          style={{ backgroundImage: `url(${tour.imageUrl})` }}
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                                          <span className="material-symbols-outlined text-[22px]">image</span>
                                        </span>
                                      )}
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black text-slate-950">{tour.name}</span>
                                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">
                                          <span>{tour.destination?.name ?? 'Chưa có điểm đến'}</span>
                                          <span className="text-slate-300">•</span>
                                          <span>{tour.availableSeats ?? 0} ghế</span>
                                        </span>
                                      </span>
                                      <span className="shrink-0 text-right">
                                        <span className="block text-sm font-black text-blue-800">{fmt(tour.price)}</span>
                                        {isSelected && <span className="mt-1 block text-xs font-bold text-blue-700">Đang chọn</span>}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {fieldError('tourId')}
                    </div>

                    <div className="space-y-2">
                      <span className={draftLabelClass}>Cơ cấu khách đi tour {requiredMark}</span>
                      <p className="text-xs font-semibold leading-5 text-slate-500">
                        Dùng để tính giá, kiểm tra số ghế và phân loại người lớn/trẻ em/em bé. Thông tin chi tiết từng người sẽ nhập ở danh sách khách đi tour.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {passengerTypeOrder.map(type => {
                          const key = type === 'Adult (12+)' ? 'adultCount' : type === 'Child (4-11)' ? 'childCount' : 'infantCount';
                          const value = parsePassengerCount(form[key], key === 'adultCount' ? 1 : 0);
                          const cfg = PASSENGER_PRICING[type];
                          return (
                            <div key={type} data-draft-field={key} className={`rounded-2xl border bg-white p-3 ${submitErrors[key] ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
                              <div className="flex items-center gap-2">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                                  <span className="material-symbols-outlined text-[20px]">{cfg.icon}</span>
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-950">{cfg.label}</p>
                                  <p className="text-xs font-semibold text-slate-500">{cfg.age} tuổi · {Math.round(cfg.multiplier * 100)}%</p>
                                </div>
                              </div>
                              <div className="mt-3 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => updatePassengerCount(key, String(value - 1))}
                                  aria-label={`Giảm số lượng ${cfg.label.toLowerCase()}`}
                                  className="grid h-full w-11 place-items-center text-slate-500 transition-colors hover:text-blue-700 disabled:opacity-35"
                                  disabled={key === 'adultCount' ? value <= 1 : value <= 0}
                                >
                                  <span className="material-symbols-outlined text-[18px]">remove</span>
                                </button>
                                <input
                                  value={form[key]}
                                  onChange={e => updatePassengerCount(key, e.target.value)}
                                  inputMode="numeric"
                                  className="h-full min-w-0 flex-1 bg-transparent text-center text-sm font-black text-slate-950 outline-none"
                                  aria-invalid={Boolean(submitErrors[key])}
                                />
                                <button
                                  type="button"
                                  onClick={() => updatePassengerCount(key, String(value + 1))}
                                  aria-label={`Tăng số lượng ${cfg.label.toLowerCase()}`}
                                  className="grid h-full w-11 place-items-center text-slate-500 transition-colors hover:text-blue-700 disabled:opacity-35"
                                  disabled={key === 'infantCount' && value >= adultCount}
                                >
                                  <span className="material-symbols-outlined text-[18px]">add</span>
                                </button>
                              </div>
                              {fieldError(key)}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <section className="space-y-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <span className={draftLabelClass}>Danh sách khách đi tour</span>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                            Tự sinh theo cơ cấu khách. Giai đoạn này dùng để kiểm tra đủ số người trước khi nhập chi tiết từng khách.
                          </p>
                        </div>
                        <span className="w-max rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                          {generatedPassengerRows.length}/{totalPassengerCount} khách
                        </span>
                      </div>
                      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                        {generatedPassengerRows.map(row => {
                          const passenger = row.passenger;
                          const identityType = typeof passenger.identityType === 'string' && passenger.identityType
                            ? passenger.identityType
                            : getDefaultPassengerIdentityType(row.type);
                          const identityOptions = row.type === 'Infant (<4)' ? INFANT_IDENTITY_OPTIONS : ADULT_IDENTITY_OPTIONS;
                          const isEditingPassenger = editingPassengerIndex === row.index;

                          return (
                            <div key={row.id} className={`rounded-xl ${isEditingPassenger ? 'bg-blue-50/60 ring-1 ring-blue-100' : 'bg-slate-50'}`}>
                              <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                                    <span className="material-symbols-outlined text-[20px]">{row.icon}</span>
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-black text-slate-950">{row.label}</span>
                                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">{row.ageLabel}</span>
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {row.canUseRepresentative && (
                                    <label className="flex w-max items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-black text-blue-800">
                                      <input
                                        type="checkbox"
                                        checked={row.usesRepresentative}
                                        onChange={event => {
                                          setUseRepresentativeAsFirstPassenger(event.target.checked);
                                          if (event.target.checked && editingPassengerIndex === row.index) {
                                            setEditingPassengerIndex(null);
                                          }
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                                      />
                                      Dùng thông tin người đại diện
                                    </label>
                                  )}
                                  <span className={`w-max rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
                                    row.hasDetails
                                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                                      : 'bg-white text-slate-500 ring-slate-200'
                                  }`}>
                                    {row.detailLabel}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => isEditingPassenger ? setEditingPassengerIndex(null) : openPassengerEditor(row)}
                                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition-colors ${
                                      isEditingPassenger
                                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                                        : 'bg-blue-700 text-white hover:bg-blue-800'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[15px]">{isEditingPassenger ? 'close' : row.hasDetails ? 'edit' : 'add'}</span>
                                    {isEditingPassenger ? 'Đóng' : row.usesRepresentative ? 'Tách để sửa' : row.hasDetails ? 'Sửa' : 'Nhập chi tiết'}
                                  </button>
                                </div>
                              </div>

                              {isEditingPassenger && (
                                <div className="border-t border-blue-100 px-3 pb-3 pt-3">
                                  <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-blue-100 sm:grid-cols-2">
                                    <label className="space-y-1.5 sm:col-span-2">
                                      <span className={draftLabelClass}>Họ tên khách</span>
                                      <input
                                        value={typeof passenger.fullName === 'string' ? passenger.fullName : ''}
                                        onChange={event => updatePassengerDetail(row.index, { fullName: event.target.value })}
                                        placeholder={`VD: ${row.label}`}
                                        className={draftInputClass}
                                      />
                                    </label>

                                    <label className="space-y-1.5">
                                      <span className={draftLabelClass}>Ngày sinh</span>
                                      <input
                                        type="date"
                                        value={typeof passenger.dob === 'string' ? passenger.dob : ''}
                                        min={getPassengerMinDate(row.type)}
                                        max={getPassengerMaxDate(row.type)}
                                        onChange={event => updatePassengerDetail(row.index, { dob: event.target.value })}
                                        className={draftInputClass}
                                      />
                                    </label>

                                    <div className="space-y-1.5">
                                      <span className={draftLabelClass}>Giới tính</span>
                                      <DraftSelect
                                        value={typeof passenger.gender === 'string' ? passenger.gender : ''}
                                        options={PASSENGER_GENDER_OPTIONS}
                                        onChange={value => updatePassengerDetail(row.index, { gender: value })}
                                        ariaLabel={`Chọn giới tính cho ${row.label}`}
                                        className={draftInputClass}
                                        menuClassName="z-[120]"
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <span className={draftLabelClass}>Loại giấy tờ</span>
                                      <DraftSelect
                                        value={identityType}
                                        options={identityOptions}
                                        onChange={value => updatePassengerDetail(row.index, { identityType: value, identityNo: '' })}
                                        ariaLabel={`Chọn loại giấy tờ cho ${row.label}`}
                                        className={draftInputClass}
                                        menuClassName="z-[120]"
                                      />
                                    </div>

                                    <label className="space-y-1.5">
                                      <span className={draftLabelClass}>Số giấy tờ</span>
                                      <input
                                        value={typeof passenger.identityNo === 'string' ? passenger.identityNo : ''}
                                        onChange={event => {
                                          const raw = event.target.value;
                                          const nextValue = identityType === 'CCCD'
                                            ? raw.replace(/\D/g, '').slice(0, 12)
                                            : identityType === 'PASSPORT'
                                              ? raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15)
                                              : raw.slice(0, 24);
                                          updatePassengerDetail(row.index, { identityType, identityNo: nextValue });
                                        }}
                                        inputMode={identityType === 'CCCD' ? 'numeric' : 'text'}
                                        placeholder={identityType === 'CCCD' ? '12 chữ số' : identityType === 'PASSPORT' ? '6-15 ký tự' : 'Số giấy khai sinh'}
                                        className={draftInputClass}
                                      />
                                    </label>

                                    <label className="space-y-1.5 sm:col-span-2">
                                      <span className={draftLabelClass}>Ghi chú riêng</span>
                                      <textarea
                                        value={typeof passenger.notes === 'string' ? passenger.notes : ''}
                                        onChange={event => updatePassengerDetail(row.index, { notes: event.target.value })}
                                        placeholder="Ăn chay, dị ứng, cần hỗ trợ, ngồi gần người đại diện..."
                                        rows={2}
                                        className={`${draftInputClass} resize-y`}
                                      />
                                    </label>

                                    <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                                      <button
                                        type="button"
                                        onClick={() => clearPassengerDetail(row)}
                                        className="min-h-10 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50"
                                      >
                                        Xóa chi tiết
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingPassengerIndex(null)}
                                        className="min-h-10 rounded-2xl bg-blue-700 px-5 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-blue-800"
                                      >
                                        Lưu khách này
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Tổng khách đi tour</span>
                        <input type="number" min={1} value={totalPassengerCount} readOnly className={fieldClass('adultCount')} aria-invalid={Boolean(submitErrors.adultCount || submitErrors.infantCount)} />
                        {fieldError('adultCount')}
                        {fieldError('infantCount')}
                      </label>
                      <div className="space-y-2 sm:col-span-2" data-draft-field="departureId">
                        <span className={draftLabelClass}>Lịch khởi hành {selectedTourDepartures.length > 0 ? requiredMark : null}</span>
                        <DraftSelect
                          value={form.departureId}
                          options={departureOptions}
                          onChange={value => updateForm('departureId', value)}
                          ariaLabel="Chọn lịch khởi hành"
                          className={fieldClass('departureId')}
                          hasError={Boolean(submitErrors.departureId)}
                        />
                        {fieldError('departureId')}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2" data-draft-field="packageId">
                        <span className={draftLabelClass}>Gói tour</span>
                        <DraftSelect
                          value={form.packageId}
                          options={packageOptions}
                          onChange={value => updateForm('packageId', value)}
                          ariaLabel="Chọn gói tour"
                          className={fieldClass('packageId')}
                          hasError={Boolean(submitErrors.packageId)}
                        />
                      </div>
                      <label className="space-y-2" data-draft-field="voucherCode">
                        <span className={draftLabelClass}>Voucher</span>
                        <input value={form.voucherCode} onChange={e => updateForm('voucherCode', e.target.value)} placeholder="Nhập mã nếu có" className={fieldClass('voucherCode')} />
                      </label>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-700">verified_user</span>
                      <h4 className="text-sm font-black text-slate-950">Thông tin xác nhận</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="space-y-2" data-draft-field="customerIdentityNo">
                        <span className={draftLabelClass}>CCCD người đại diện</span>
                        <input
                          value={form.customerIdentityNo}
                          onChange={e => updateForm('customerIdentityNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                          inputMode="numeric"
                          maxLength={12}
                          placeholder="12 chữ số"
                          className={fieldClass('customerIdentityNo')}
                          aria-invalid={Boolean(submitErrors.customerIdentityNo)}
                        />
                        <p className="text-[11px] font-semibold text-slate-500">Không bắt buộc khi lưu hoặc gửi duyệt. Nếu nhập, cần đủ 12 chữ số.</p>
                        {fieldError('customerIdentityNo')}
                      </label>
                      <div className="space-y-2" data-draft-field="sourceChannel">
                        <span className={draftLabelClass}>Nguồn</span>
                        <DraftSelect
                          value={form.sourceChannel}
                          options={SOURCE_CHANNEL_OPTIONS}
                          onChange={value => updateForm('sourceChannel', value)}
                          ariaLabel="Chọn nguồn booking"
                          className={fieldClass('sourceChannel')}
                          hasError={Boolean(submitErrors.sourceChannel)}
                        />
                      </div>
                      <div className="space-y-2" data-draft-field="confirmationChannel">
                        <span className={draftLabelClass}>Kênh gửi xác nhận</span>
                        <DraftSelect
                          value={form.confirmationChannel}
                          options={CONFIRMATION_CHANNEL_OPTIONS}
                          onChange={value => updateForm('confirmationChannel', value)}
                          ariaLabel="Chọn kênh gửi xác nhận"
                          className={fieldClass('confirmationChannel')}
                          hasError={Boolean(submitErrors.confirmationChannel)}
                        />
                      </div>
                      <label className="space-y-2" data-draft-field="emailForTicket">
                        <span className={draftLabelClass}>Email nhận vé điện tử</span>
                        <input type="email" value={form.emailForTicket} onChange={e => updateForm('emailForTicket', e.target.value)} placeholder="Mặc định dùng email người đại diện" className={fieldClass('emailForTicket')} aria-invalid={Boolean(submitErrors.emailForTicket)} />
                        {fieldError('emailForTicket')}
                      </label>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block space-y-2" data-draft-field="specialRequests">
                      <span className={draftLabelClass}>Yêu cầu của khách</span>
                      <textarea value={form.specialRequests} onChange={e => updateForm('specialRequests', e.target.value)} rows={4} placeholder="Ghế trẻ em, ăn chay, phòng gần nhau..." className={`${fieldClass('specialRequests')} min-h-28 resize-y`} />
                    </label>
                    <label className="block space-y-2" data-draft-field="internalNote">
                      <span className={draftLabelClass}>Ghi chú nội bộ</span>
                      <textarea value={form.internalNote} onChange={e => updateForm('internalNote', e.target.value)} rows={4} placeholder="Thông tin chỉ dành cho staff/admin" className={`${fieldClass('internalNote')} min-h-28 resize-y`} />
                    </label>
                  </section>
                </div>

                <AssistedBookingSidebar
                  estimatedTotal={estimatedTotal}
                  totalPassengerCount={totalPassengerCount}
                  baseTourPrice={baseTourPrice}
                  packageSurcharge={packageSurcharge}
                  estimatedUnitPrice={estimatedUnitPrice}
                  voucherStatus={voucherStatus}
                  hasVoucher={!!form.voucherCode.trim()}
                  missingSummaryCount={missingSummaryCount}
                  summaryChecklistItems={summaryChecklistItems}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
              <button onClick={() => { setIsDrawerOpen(false); resetDraftForm(); }} className="min-h-11 rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
                Hủy
              </button>
              <button disabled={isSaving} onClick={() => createDraft(false)} className="min-h-11 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-800 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
                {editingDraft ? 'Cập nhật nháp' : 'Lưu nháp'}
              </button>
              <button disabled={isSaving || !hasResolvedRole} onClick={() => createDraft(true)} className="min-h-11 rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                {completionButtonLabel}
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

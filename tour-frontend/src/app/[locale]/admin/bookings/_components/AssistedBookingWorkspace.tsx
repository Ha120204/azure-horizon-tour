'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { API_BASE_URL } from '@/lib/constants';
import { ASSISTED_STATUS_CFG, PASSENGER_PRICING, passengerTypeOrder } from '../_lib/config';
import {
  buildPassengerDraftPayload,
  fmt,
  fmtDate,
  formatPassengerBreakdown,
  getApiErrorMessage,
  getErrorMessage,
  getPassengerCounts,
  hasDetailedDeparture,
  hasLoadedBookingOptions,
  isValidCccd,
  isValidEmail,
  isValidVietnamPhone,
  parsePassengerCount,
} from '../_lib/helpers';
import type {
  AssistedDraft,
  AssistedDraftAction,
  AssistedDraftForm,
  AssistedDraftFormErrors,
  AssistedDraftReviewAction,
  TourOption,
} from '../_lib/types';

export function AssistedBookingWorkspace({
  onChanged,
  showToast,
}: {
  onChanged: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const [drafts, setDrafts] = useState<AssistedDraft[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [role, setRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<AssistedDraft | null>(null);
  const [viewingDraft, setViewingDraft] = useState<AssistedDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isTourPickerOpen, setIsTourPickerOpen] = useState(false);
  const [tourQuery, setTourQuery] = useState('');
  const tourPickerRef = useRef<HTMLDivElement | null>(null);
  const [submitErrors, setSubmitErrors] = useState<AssistedDraftFormErrors>({});
  const [draftFormError, setDraftFormError] = useState<string | null>(null);
  const [draftActionDialog, setDraftActionDialog] = useState<{
    draft: AssistedDraft;
    action: AssistedDraftReviewAction;
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
  const [form, setForm] = useState<AssistedDraftForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerIdentityNo: '',
    sourceChannel: 'LIVE_CHAT',
    confirmationChannel: 'ZALO',
    emailForTicket: '',
    tourId: '',
    departureId: '',
    packageId: '',
    adultCount: '1',
    childCount: '0',
    infantCount: '0',
    voucherCode: '',
    specialRequests: '',
    internalNote: '',
  });

  const normalizedRole = role.toUpperCase();
  const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';
  const isStaff = normalizedRole === 'STAFF';
  const hasResolvedRole = normalizedRole.length > 0;
  const completionActionText = isAdmin ? 'duyệt tạo đơn' : isStaff ? 'gửi duyệt' : 'hoàn tất';
  const completionButtonLabel = isAdmin ? 'Lưu & duyệt tạo đơn' : isStaff ? 'Lưu & gửi duyệt' : 'Đang tải quyền...';
  const selectedTour = tours.find(t => String(t.id) === form.tourId);
  const selectedTourDepartures = (selectedTour?.departures ?? []).filter(hasDetailedDeparture);
  const selectedDeparture = selectedTourDepartures.find(d => String(d.id) === form.departureId);
  const selectedPackage = selectedTour?.packages?.find(p => String(p.id) === form.packageId);
  const estimatedUnitPrice = (selectedDeparture?.price ?? selectedTour?.price ?? 0) + (selectedPackage?.price ?? 0);
  const adultCount = Math.max(1, parsePassengerCount(form.adultCount, 1));
  const childCount = parsePassengerCount(form.childCount);
  const infantCount = parsePassengerCount(form.infantCount);
  const totalPassengerCount = adultCount + childCount + infantCount;
  const estimatedTotal =
    adultCount * estimatedUnitPrice * PASSENGER_PRICING['Adult (12+)'].multiplier +
    childCount * estimatedUnitPrice * PASSENGER_PRICING['Child (4-11)'].multiplier +
    infantCount * estimatedUnitPrice * PASSENGER_PRICING['Infant (<4)'].multiplier;
  const filteredTours = useMemo(() => {
    const query = tourQuery.trim().toLowerCase();
    if (!query) return tours;
    return tours.filter(t => {
      const haystack = `${t.name} ${t.destination?.name ?? ''} ${t.price}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [tourQuery, tours]);
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
  const draftActionDialogConfig = draftActionDialog?.action === 'reject'
    ? {
        eyebrow: 'Từ chối duyệt',
        title: 'Từ chối bản nháp đặt hộ',
        description: 'Bản nháp sẽ chuyển sang trạng thái từ chối. Staff vẫn xem được lý do để trao đổi lại với khách.',
        icon: 'block',
        iconClass: 'bg-red-50 text-red-700 ring-red-100',
        label: 'Lý do từ chối',
        placeholder: 'Ví dụ: Không đủ thông tin khách hàng, tour đã hết chỗ, giá/voucher không hợp lệ...',
        submitLabel: 'Từ chối bản nháp',
        submitClass: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        hint: 'Viết rõ nguyên nhân nghiệp vụ để staff không phải hỏi lại admin.',
        requiresReason: true,
      }
    : draftActionDialog?.action === 'request-revision'
      ? {
          eyebrow: 'Yêu cầu chỉnh sửa',
          title: 'Gửi yêu cầu sửa cho staff',
          description: 'Bản nháp sẽ quay về trạng thái cần sửa. Staff sẽ dùng nội dung này làm checklist trước khi gửi duyệt lại.',
          icon: 'rate_review',
          iconClass: 'bg-amber-50 text-amber-700 ring-amber-100',
          label: 'Nội dung cần chỉnh sửa',
          placeholder: 'Ví dụ: Bổ sung CCCD khách chính, chọn ngày khởi hành 18/06, xác nhận lại email nhận vé...',
          submitLabel: 'Gửi yêu cầu sửa',
          submitClass: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500',
          hint: 'Ưu tiên gạch đầu dòng các việc cần sửa để staff xử lý nhanh.',
          requiresReason: true,
        }
      : draftActionDialog?.action === 'approve'
        ? {
            eyebrow: 'Xác nhận duyệt',
            title: 'Duyệt bản nháp và tạo booking',
            description: 'Sau khi duyệt, hệ thống sẽ tạo booking thật, giữ chỗ tour và gửi yêu cầu thanh toán cho khách theo kênh đã chọn.',
            icon: 'task_alt',
            iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
            label: 'Ghi chú duyệt',
            placeholder: 'Ví dụ: Đã kiểm tra thông tin khách, lịch khởi hành và giá tour.',
            submitLabel: 'Duyệt và tạo booking',
            submitClass: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
            hint: 'Ghi chú là tùy chọn. Kiểm tra kỹ thông tin trước khi xác nhận vì thao tác này tạo đơn thật.',
            requiresReason: false,
          }
        : null;

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (search) qs.set('search', search);
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/assisted-drafts?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Load failed');
      const payload = json?.data ?? json;
      setDrafts(Array.isArray(payload) ? payload : []);
    } catch {
      showToast('Không tải được danh sách bản nháp đặt hộ', false);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/auth/profile`)
      .then(r => r.json())
      .then(json => {
        const data = json?.data ?? json;
        setRole(String(data?.role ?? ''));
      })
      .catch(() => setRole(''));
  }, []);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/tour?limit=100&sortBy=recommended`)
      .then(r => r.json())
      .then(json => {
        const payload = json?.data ?? json;
        setTours(Array.isArray(payload) ? payload : (payload?.data ?? []));
      })
      .catch(() => showToast('Không tải được danh sách tour', false));
  }, [showToast]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  useEffect(() => {
    if (!isTourPickerOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!tourPickerRef.current?.contains(event.target as Node)) {
        setIsTourPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isTourPickerOpen]);

  useEffect(() => {
    const tourId = Number(form.tourId);
    if (!tourId) return;
    const current = tours.find(t => t.id === tourId);
    if (hasLoadedBookingOptions(current)) return;

    fetchWithAuth(`${API_BASE_URL}/tour/${tourId}`)
      .then(r => r.json())
      .then(json => {
        const detail = json?.data ?? json;
        setTours(prev => prev.map(t => t.id === tourId ? { ...t, ...detail } : t));
      })
      .catch(() => {});
  }, [form.tourId, tours]);

  const validateForApproval = () => {
    const errors: AssistedDraftFormErrors = {};
    const currentAdultCount = parsePassengerCount(form.adultCount, 1);
    const currentChildCount = parsePassengerCount(form.childCount);
    const currentInfantCount = parsePassengerCount(form.infantCount);
    const currentTotalPassengerCount = currentAdultCount + currentChildCount + currentInfantCount;

    if (!form.customerName.trim()) errors.customerName = `Nhập tên khách trước khi ${completionActionText}`;
    if (!form.customerEmail.trim()) errors.customerEmail = 'Nhập email để tạo hồ sơ khách';
    else if (!isValidEmail(form.customerEmail)) errors.customerEmail = 'Email chưa đúng định dạng';
    if (form.emailForTicket.trim() && !isValidEmail(form.emailForTicket)) errors.emailForTicket = 'Email nhận vé chưa đúng định dạng';
    if (!form.customerPhone.trim()) errors.customerPhone = 'Nhập số điện thoại để staff/admin liên hệ';
    else if (!isValidVietnamPhone(form.customerPhone)) errors.customerPhone = 'Số điện thoại chưa đúng định dạng Việt Nam';
    if (!form.customerIdentityNo.trim()) errors.customerIdentityNo = 'Nhập CCCD của khách';
    else if (!isValidCccd(form.customerIdentityNo)) errors.customerIdentityNo = 'CCCD phải gồm đúng 12 chữ số';
    if (!form.tourId) errors.tourId = 'Chọn tour cần đặt hộ';
    if (form.confirmationChannel === 'EMAIL' && !form.emailForTicket.trim() && !form.customerEmail.trim()) {
      errors.emailForTicket = 'Cần email để gửi xác nhận thanh toán';
    }
    if (currentAdultCount < 1) errors.adultCount = 'Cần ít nhất 1 người lớn đại diện';
    if (currentInfantCount > currentAdultCount) errors.infantCount = 'Số em bé không vượt quá số người lớn';
    if (currentTotalPassengerCount < 1) errors.adultCount = 'Số khách phải từ 1 trở lên';
    if (selectedTourDepartures.length > 0 && !form.departureId) {
      errors.departureId = 'Chọn lịch khởi hành cụ thể';
    }

    setSubmitErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateDraftForApproval = (draft: AssistedDraft) => {
    const issues: string[] = [];
    const customerEmail = draft.customerEmail?.trim() ?? '';
    const customerPhone = draft.customerPhone?.trim() ?? '';
    const customerIdentityNo = draft.customerIdentityNo?.trim() ?? '';
    const emailForTicket = draft.emailForTicket?.trim() ?? '';
    const confirmationChannel = String(draft.confirmationChannel || 'ZALO').toUpperCase();
    const passengerCount = Number(draft.numberOfPeople) || 0;
    const passengerCounts = getPassengerCounts(draft.passengers, passengerCount || 1);
    const draftTour = tours.find(tour => tour.id === draft.tourId);
    const activeDepartures = (draftTour?.departures ?? []).filter(departure => departure.isActive !== false).filter(hasDetailedDeparture);
    const draftDeparture = activeDepartures.find(departure => departure.id === draft.departureId);

    if (!draft.customerName?.trim()) issues.push('Thiếu tên khách hàng.');
    if (!customerEmail) issues.push('Thiếu email khách hàng để tạo hồ sơ.');
    else if (!isValidEmail(customerEmail)) issues.push(`Email khách hàng không hợp lệ: ${customerEmail}.`);
    if (!customerPhone) issues.push('Thiếu số điện thoại khách hàng.');
    else if (!isValidVietnamPhone(customerPhone)) issues.push(`Số điện thoại không đúng định dạng Việt Nam: ${customerPhone}.`);
    if (!customerIdentityNo) issues.push('Thiếu CCCD khách hàng.');
    else if (!isValidCccd(customerIdentityNo)) issues.push('CCCD phải gồm đúng 12 chữ số.');
    if (emailForTicket && !isValidEmail(emailForTicket)) issues.push(`Email nhận vé không hợp lệ: ${emailForTicket}.`);
    if (!['ZALO', 'EMAIL', 'PHONE', 'MANUAL'].includes(confirmationChannel)) issues.push('Kênh gửi xác nhận không hợp lệ.');
    if (confirmationChannel === 'EMAIL' && !emailForTicket && !customerEmail) issues.push('Kênh email cần email nhận vé hoặc email khách hàng.');
    if (!draft.tourId) issues.push('Chưa chọn tour cần đặt hộ.');
    if (passengerCount < 1) issues.push('Số khách phải từ 1 trở lên.');
    if (passengerCounts['Adult (12+)'] < 1) issues.push('Cần ít nhất 1 người lớn đại diện.');
    if (passengerCounts['Infant (<4)'] > passengerCounts['Adult (12+)']) issues.push('Số em bé không được vượt quá số người lớn.');
    if (activeDepartures.length > 0 && !draft.departureId) issues.push('Tour có lịch khởi hành cụ thể, cần chọn lịch trước khi duyệt.');
    if (draft.departureId && draftDeparture?.availableSeats !== undefined && draftDeparture.availableSeats < passengerCount) {
      issues.push(`Lịch khởi hành chỉ còn ${draftDeparture.availableSeats} ghế, không đủ cho ${passengerCount} khách.`);
    } else if (!draft.departureId && draftTour?.availableSeats !== undefined && draftTour.availableSeats < passengerCount) {
      issues.push(`Tour chỉ còn ${draftTour.availableSeats} ghế, không đủ cho ${passengerCount} khách.`);
    }

    return issues;
  };

  const updateForm = (key: keyof AssistedDraftForm, value: string) => {
    if (draftFormError) setDraftFormError(null);
    if (submitErrors[key]) {
      setSubmitErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setForm(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'tourId' ? { departureId: '', packageId: '' } : {}),
    }));
  };

  const updatePassengerCount = (key: 'adultCount' | 'childCount' | 'infantCount', value: string) => {
    if (draftFormError) setDraftFormError(null);
    if (submitErrors[key]) {
      setSubmitErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    setForm(prev => {
      const next = { ...prev };
      const min = key === 'adultCount' ? 1 : 0;
      const cleaned = value.replace(/\D/g, '');
      const parsed = cleaned === '' ? min : Math.max(min, Number(cleaned));
      next[key] = String(parsed);

      if (key === 'adultCount') {
        const adults = Math.max(1, parsed);
        const infants = parsePassengerCount(prev.infantCount);
        if (infants > adults) next.infantCount = String(adults);
      }

      if (key === 'infantCount') {
        const adults = Math.max(1, parsePassengerCount(prev.adultCount, 1));
        next.infantCount = String(Math.min(parsed, adults));
      }

      return next;
    });
  };

  const resetDraftForm = () => {
    setEditingDraft(null);
    setSubmitErrors({});
    setDraftFormError(null);
    setTourQuery('');
    setIsTourPickerOpen(false);
    setForm({
      customerName: '', customerEmail: '', customerPhone: '', customerIdentityNo: '', sourceChannel: 'LIVE_CHAT', confirmationChannel: 'ZALO', emailForTicket: '',
      tourId: '', departureId: '', packageId: '', adultCount: '1', childCount: '0', infantCount: '0',
      voucherCode: '', specialRequests: '', internalNote: '',
    });
  };

  const openCreateDraft = () => {
    resetDraftForm();
    setIsDrawerOpen(true);
  };

  const openEditDraft = (draft: AssistedDraft) => {
    const counts = getPassengerCounts(draft.passengers, draft.numberOfPeople || 1);
    setEditingDraft(draft);
    setSubmitErrors({});
    setDraftFormError(null);
    setTourQuery('');
    setIsTourPickerOpen(false);
    setForm({
      customerName: draft.customerName ?? '',
      customerEmail: draft.customerEmail ?? '',
      customerPhone: draft.customerPhone ?? '',
      customerIdentityNo: draft.customerIdentityNo ?? '',
      sourceChannel: draft.sourceChannel || 'LIVE_CHAT',
      confirmationChannel: draft.confirmationChannel || 'ZALO',
      emailForTicket: draft.emailForTicket ?? draft.customerEmail ?? '',
      tourId: draft.tourId ? String(draft.tourId) : '',
      departureId: draft.departureId ? String(draft.departureId) : '',
      packageId: draft.packageId ? String(draft.packageId) : '',
      adultCount: String(counts['Adult (12+)']),
      childCount: String(counts['Child (4-11)']),
      infantCount: String(counts['Infant (<4)']),
      voucherCode: draft.voucherCode ?? '',
      specialRequests: draft.specialRequests ?? '',
      internalNote: draft.internalNote ?? '',
    });
    setIsDrawerOpen(true);
  };

  const openDraftDetail = (draft: AssistedDraft) => {
    setViewingDraft(draft);
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
      const passengers = buildPassengerDraftPayload(form);
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
        const msg = 'Vui lòng nhập khách hàng và chọn tour';
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
      });
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

  const executeDraftAction = async (draft: AssistedDraft, action: AssistedDraftAction, reason = '') => {
    try {
      const body =
        action === 'approve'
          ? { note: reason || 'Approved from admin booking console' }
          : action === 'reject' || action === 'request-revision'
            ? { reason }
            : {};
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/assisted-drafts/${draft.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(String(json?.message ?? 'Thao tác thất bại'));
      const payload = json?.data ?? json;
      const updated = payload?.draft ?? payload;
      setDrafts(prev => prev.map(item => item.id === draft.id ? updated : item));
      if (action === 'approve') onChanged();
      showToast(action === 'approve' ? 'Đã duyệt và tạo booking thật' : 'Đã cập nhật bản nháp');
      return { ok: true as const };
    } catch (e: unknown) {
      const message = getErrorMessage(e, 'Thao tác thất bại');
      showToast(message, false);
      return { ok: false as const, error: message };
    }
  };

  const runDraftAction = (draft: AssistedDraft, action: AssistedDraftAction) => {
    if (action === 'approve' || action === 'reject' || action === 'request-revision') {
      const validationIssues = action === 'approve' ? validateDraftForApproval(draft) : [];
      setDraftActionDialog({
        draft,
        action,
        reason: '',
        validationIssues,
        isSubmitting: false,
      });
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
    if (draftActionDialog.action === 'approve') {
      const validationIssues = validateDraftForApproval(draftActionDialog.draft);
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

  const pendingCount = drafts.filter(d => d.status === 'PENDING_APPROVAL').length;
  const approvalValidationIssues = draftActionDialog?.action === 'approve'
    ? draftActionDialog.validationIssues ?? []
    : [];
  const hasBlockingApprovalIssues = approvalValidationIssues.length > 0;

  return (
    <section className="mb-8 rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-950 via-blue-800 to-sky-700 px-5 py-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[15px]">support_agent</span>
              Assisted booking
            </div>
            <h2 className="mt-3 text-xl font-extrabold">Đặt tour hộ khách</h2>
            <p className="mt-1 max-w-2xl text-sm text-blue-50/85">
              {isAdmin
                ? 'Admin và super admin có thể kiểm tra tiêu chuẩn rồi duyệt trực tiếp để tạo đơn thật.'
                : 'Staff lưu bản nháp từ chat/Zalo/Facebook, gửi admin hoặc super admin duyệt trước khi tạo đơn thật.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/12 px-4 py-2 text-sm">
              <span className="block text-[11px] uppercase tracking-wider text-blue-100">Chờ duyệt</span>
              <span className="text-lg font-black">{pendingCount}</span>
            </div>
            <button
              onClick={openCreateDraft}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-900 shadow-sm hover:bg-blue-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Tạo bản nháp
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-slate-50/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm draft, khách hàng, email, tên tour..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PENDING_APPROVAL">Chờ duyệt</option>
            <option value="NEEDS_REVISION">Cần sửa</option>
            <option value="REJECTED">Từ chối</option>
            <option value="CONVERTED">Đã tạo đơn</option>
          </select>
          <button onClick={fetchDrafts} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Làm mới
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Đang tải bản nháp...</div>
        ) : drafts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <span className="material-symbols-outlined">edit_document</span>
            </div>
            <p className="font-bold text-slate-800">Chưa có bản nháp đặt hộ</p>
            <p className="mt-1 text-sm text-slate-500">Tạo bản nháp đầu tiên khi khách đặt qua đội hỗ trợ.</p>
          </div>
        ) : drafts.slice(0, 6).map(draft => {
          const cfg = ASSISTED_STATUS_CFG[draft.status] ?? ASSISTED_STATUS_CFG.DRAFT;
          return (
            <div key={draft.id} className="grid gap-4 p-4 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-black text-blue-800">{draft.draftCode}</span>
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${cfg.badge}`}>
                    <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                    {cfg.label}
                  </span>
                  {draft.convertedBooking && <span className="text-xs font-semibold text-emerald-700">{draft.convertedBooking.bookingCode}</span>}
                </div>
                <p className="mt-2 truncate text-sm font-bold text-slate-900">{draft.customerName || 'Chưa nhập tên khách'}</p>
                <p className="truncate text-xs text-slate-500">
                  {draft.customerEmail || 'Chưa nhập email'}{draft.customerPhone ? ` · ${draft.customerPhone}` : ''}{draft.customerIdentityNo ? ` · CCCD ${draft.customerIdentityNo}` : ''}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{draft.tour?.name ?? `Tour #${draft.tourId}`}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatPassengerBreakdown(draft.passengers, draft.numberOfPeople)} · {fmt(draft.quotedPrice)} · {draft.sourceChannel.replace('_', ' ')}
                </p>
                {draft.rejectionReason && <p className="mt-1 line-clamp-1 text-xs font-medium text-orange-700">{draft.rejectionReason}</p>}
              </div>
              <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                {['DRAFT', 'NEEDS_REVISION'].includes(draft.status) && (
                  <>
                    <button onClick={() => openEditDraft(draft)} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      Chỉnh sửa
                    </button>
                    {isStaff && (
                      <button onClick={() => runDraftAction(draft, 'submit')} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
                        Gửi duyệt
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => runDraftAction(draft, 'approve')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                        Duyệt tạo đơn
                      </button>
                    )}
                  </>
                )}
                {canDeleteDraft(draft) && (
                  <button onClick={() => openDeleteDraft(draft)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    Xóa
                  </button>
                )}
                <button onClick={() => openDraftDetail(draft)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50">
                  <span className="material-symbols-outlined text-[15px]">visibility</span>
                  Chi tiết
                </button>
                {isAdmin && draft.status === 'PENDING_APPROVAL' && (
                  <>
                    <button onClick={() => runDraftAction(draft, 'approve')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                      Duyệt
                    </button>
                    <button onClick={() => runDraftAction(draft, 'request-revision')} className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100">
                      Yêu cầu sửa
                    </button>
                    <button onClick={() => runDraftAction(draft, 'reject')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
                    {draftActionDialog.draft.customerName || 'Chưa nhập tên khách'}
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

              {draftActionDialog.action === 'approve' && (
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
                          <p className="font-black">Chưa thể duyệt tạo booking vì còn thiếu hoặc sai thông tin:</p>
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
                          <p className="font-black">Đủ điều kiện duyệt tạo booking:</p>
                          <div className="mt-3 grid gap-2 text-sm font-semibold text-emerald-900 sm:grid-cols-2">
                            <span className="inline-flex items-center gap-2">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              Thông tin khách hợp lệ
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
                <p className="text-xs font-bold text-slate-400">{draftActionDialog.reason.trim().length} ký tự</p>
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
                <p className="font-black text-red-950">{draftDeleteDialog.draft.customerName || 'Chưa nhập tên khách'}</p>
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
                  <h4 className="text-sm font-black text-slate-950">Khách hàng</h4>
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="font-black text-slate-950">{viewingDraft.customerName || 'Chưa nhập tên khách'}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.customerEmail || 'Chưa nhập email'}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.customerPhone || 'Chưa nhập số điện thoại'}</p>
                    <p className="mt-1 text-slate-500">{viewingDraft.customerIdentityNo ? `CCCD: ${viewingDraft.customerIdentityNo}` : 'Chưa nhập CCCD'}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Nguồn</p>
                    <p className="mt-1 font-bold text-slate-800">{viewingDraft.sourceChannel.replace('_', ' ')}</p>
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
                  <div>
                    <p className="font-black">Không thể thực hiện thao tác</p>
                    <p className="mt-0.5 whitespace-pre-line font-semibold">{draftFormError}</p>
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
                      <h4 className="text-sm font-black text-slate-950">Thông tin khách</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Tên khách {requiredMark}</span>
                        <input value={form.customerName} onChange={e => updateForm('customerName', e.target.value)} placeholder="VD: Nguyễn Minh An" className={fieldClass('customerName')} aria-invalid={Boolean(submitErrors.customerName)} />
                        {fieldError('customerName')}
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Email {requiredMark}</span>
                        <input type="email" value={form.customerEmail} onChange={e => updateForm('customerEmail', e.target.value)} placeholder="email@domain.com" className={fieldClass('customerEmail')} aria-invalid={Boolean(submitErrors.customerEmail)} />
                        {fieldError('customerEmail')}
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Số điện thoại {requiredMark}</span>
                        <input value={form.customerPhone} onChange={e => updateForm('customerPhone', e.target.value)} placeholder="09xx xxx xxx" className={fieldClass('customerPhone')} aria-invalid={Boolean(submitErrors.customerPhone)} />
                        {fieldError('customerPhone')}
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>CCCD {requiredMark}</span>
                        <input
                          value={form.customerIdentityNo}
                          onChange={e => updateForm('customerIdentityNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                          inputMode="numeric"
                          maxLength={12}
                          placeholder="12 chữ số"
                          className={fieldClass('customerIdentityNo')}
                          aria-invalid={Boolean(submitErrors.customerIdentityNo)}
                        />
                        {fieldError('customerIdentityNo')}
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Nguồn</span>
                        <select value={form.sourceChannel} onChange={e => updateForm('sourceChannel', e.target.value)} className={fieldClass('sourceChannel')}>
                          <option value="LIVE_CHAT">Live chat</option>
                          <option value="ZALO">Zalo</option>
                          <option value="FACEBOOK">Facebook</option>
                          <option value="PHONE">Điện thoại</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Kênh gửi xác nhận</span>
                        <select value={form.confirmationChannel} onChange={e => updateForm('confirmationChannel', e.target.value)} className={fieldClass('confirmationChannel')}>
                          <option value="ZALO">Zalo / copy thủ công</option>
                          <option value="EMAIL">Email tự động</option>
                          <option value="PHONE">Gọi điện</option>
                          <option value="MANUAL">Gửi thủ công</option>
                        </select>
                      </label>
                      <label className="space-y-2 sm:col-span-2">
                        <span className={draftLabelClass}>Email nhận vé điện tử</span>
                        <input type="email" value={form.emailForTicket} onChange={e => updateForm('emailForTicket', e.target.value)} placeholder="Mặc định dùng email khách hàng" className={fieldClass('emailForTicket')} aria-invalid={Boolean(submitErrors.emailForTicket)} />
                        {fieldError('emailForTicket')}
                      </label>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-700">travel_explore</span>
                      <h4 className="text-sm font-black text-slate-950">Tour và lịch trình</h4>
                    </div>
                    <div className="block space-y-2" ref={tourPickerRef}>
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
                      <span className={draftLabelClass}>Cơ cấu khách {requiredMark}</span>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {passengerTypeOrder.map(type => {
                          const key = type === 'Adult (12+)' ? 'adultCount' : type === 'Child (4-11)' ? 'childCount' : 'infantCount';
                          const value = parsePassengerCount(form[key], key === 'adultCount' ? 1 : 0);
                          const cfg = PASSENGER_PRICING[type];
                          return (
                            <div key={type} className={`rounded-2xl border bg-white p-3 ${submitErrors[key] ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Tổng khách</span>
                        <input type="number" min={1} value={totalPassengerCount} readOnly className={fieldClass('adultCount')} aria-invalid={Boolean(submitErrors.adultCount || submitErrors.infantCount)} />
                        {fieldError('adultCount')}
                        {fieldError('infantCount')}
                      </label>
                      <label className="space-y-2 sm:col-span-2">
                        <span className={draftLabelClass}>Lịch khởi hành {selectedTourDepartures.length > 0 ? requiredMark : null}</span>
                        <select value={form.departureId} onChange={e => updateForm('departureId', e.target.value)} className={fieldClass('departureId')} aria-invalid={Boolean(submitErrors.departureId)}>
                          <option value="">Theo ngày mặc định của tour</option>
                          {selectedTour && selectedTourDepartures.length === 0 && (
                            <option value="" disabled>Tour này chưa có lịch khởi hành cụ thể</option>
                          )}
                          {selectedTourDepartures.map((d, index) => (
                            <option key={`departure-${d.id ?? 'missing'}-${index}`} value={d.id}>
                              {fmtDate(d.departureDate)} · {fmt(d.price ?? selectedTour?.price ?? 0)} · còn {d.availableSeats ?? 0} ghế
                            </option>
                          ))}
                        </select>
                        {fieldError('departureId')}
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Gói tour</span>
                        <select value={form.packageId} onChange={e => updateForm('packageId', e.target.value)} className={fieldClass('packageId')}>
                          <option value="">Không chọn gói phụ thu</option>
                          {(selectedTour?.packages ?? []).map((p, index) => <option key={`package-${p.id ?? 'missing'}-${index}`} value={p.id}>{p.name} · +{fmt(p.price)}</option>)}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className={draftLabelClass}>Voucher</span>
                        <input value={form.voucherCode} onChange={e => updateForm('voucherCode', e.target.value)} placeholder="Nhập mã nếu có" className={fieldClass('voucherCode')} />
                      </label>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block space-y-2">
                      <span className={draftLabelClass}>Yêu cầu của khách</span>
                      <textarea value={form.specialRequests} onChange={e => updateForm('specialRequests', e.target.value)} rows={4} placeholder="Ghế trẻ em, ăn chay, phòng gần nhau..." className={`${fieldClass('specialRequests')} min-h-28 resize-y`} />
                    </label>
                    <label className="block space-y-2">
                      <span className={draftLabelClass}>Ghi chú nội bộ</span>
                      <textarea value={form.internalNote} onChange={e => updateForm('internalNote', e.target.value)} rows={4} placeholder="Thông tin chỉ dành cho staff/admin" className={`${fieldClass('internalNote')} min-h-28 resize-y`} />
                    </label>
                  </section>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
                  <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Tạm tính</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-blue-950">{fmt(estimatedTotal)}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white/75 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700/70">Số khách</p>
                        <p className="mt-1 font-black text-blue-950">{totalPassengerCount}</p>
                      </div>
                      <div className="rounded-2xl bg-white/75 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700/70">Đơn giá</p>
                        <p className="mt-1 font-black text-blue-950">{fmt(estimatedUnitPrice)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-black text-slate-950">Tóm tắt lựa chọn</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Tour</span>
                        <span className="max-w-[180px] text-right font-bold text-slate-900">{selectedTour?.name ?? 'Chưa chọn'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Khởi hành</span>
                        <span className="text-right font-bold text-slate-900">{selectedDeparture ? fmtDate(selectedDeparture.departureDate) : 'Mặc định'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Gói</span>
                        <span className="max-w-[180px] text-right font-bold text-slate-900">{selectedPackage?.name ?? 'Không phụ thu'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Khách</span>
                        <span className="max-w-[180px] text-right font-bold text-slate-900">{adultCount} người lớn{childCount ? ` · ${childCount} trẻ em` : ''}{infantCount ? ` · ${infantCount} em bé` : ''}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Nguồn</span>
                        <span className="text-right font-bold text-slate-900">{form.sourceChannel.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </aside>
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

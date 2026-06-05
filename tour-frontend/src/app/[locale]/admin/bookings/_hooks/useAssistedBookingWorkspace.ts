'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { API_BASE_URL } from '@/lib/constants';
import {
  getPassengerAgeLabel,
  getPassengerMaxDate,
  getPassengerMinDate,
  hasPassengerDetails,
} from '@/lib/passengerDetails';
import { PASSENGER_PRICING, passengerTypeOrder } from '../_lib/config';
import {
  CONFIRMATION_CHANNEL_OPTIONS,
  DRAFT_FIELD_ORDER,
  SOURCE_CHANNEL_OPTIONS,
  getSelectOptionLabel,
} from '../_lib/config';
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
  normalizePassengerTypeLabel,
  parsePassengerCount,
} from '../_lib/helpers';
import type {
  AssistedDraft,
  AssistedDraftAction,
  AssistedDraftForm,
  AssistedDraftFormErrors,
  DraftPassenger,
  DraftSelectOption,
  PassengerType,
  TourOption,
} from '../_lib/types';

// re-export so the component doesn't need to import from types directly
export type { DraftSelectOption };

type GeneratedPassengerRow = {
  id: string;
  index: number;
  type: PassengerType;
  label: string;
  ageLabel: string;
  icon: string;
  canUseRepresentative: boolean;
  usesRepresentative: boolean;
  hasDetails: boolean;
  detailLabel: string;
  passenger: DraftPassenger;
};

type CreateAssistedDraftEventDetail = {
  bookingCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tourId?: number;
  numberOfPeople?: number;
  voucherCode?: string;
  internalNote?: string;
};

const PACKAGE_NAME_LABELS: Record<string, string> = {
  'Goi Tieu Chuan': 'Gói Tiêu Chuẩn',
  'Goi Cao Cap': 'Gói Cao Cấp',
  'Goi Rieng Tu': 'Gói Riêng Tư',
};

function getPackageDisplayName(name: string | null | undefined) {
  if (!name) return '';
  return PACKAGE_NAME_LABELS[name.trim()] ?? name;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

const EMPTY_FORM: AssistedDraftForm = {
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
};

export interface UseAssistedBookingWorkspaceReturn {
  // state
  drafts: AssistedDraft[];
  tours: TourOption[];
  role: string;
  isLoading: boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isWorkspaceOpen: boolean;
  setIsWorkspaceOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  editingDraft: AssistedDraft | null;
  viewingDraft: AssistedDraft | null;
  setViewingDraft: (draft: AssistedDraft | null) => void;
  isSaving: boolean;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  isTourPickerOpen: boolean;
  setIsTourPickerOpen: (open: boolean) => void;
  tourQuery: string;
  setTourQuery: (q: string) => void;
  tourPickerRef: React.RefObject<HTMLDivElement | null>;
  submitErrors: AssistedDraftFormErrors;
  draftFormError: string | null;
  passengerDrafts: DraftPassenger[];
  useRepresentativeAsFirstPassenger: boolean;
  setUseRepresentativeAsFirstPassenger: (v: boolean) => void;
  editingPassengerIndex: number | null;
  setEditingPassengerIndex: (i: number | null) => void;
  draftActionDialog: {
    draft: AssistedDraft;
    action: AssistedDraftAction;
    reason: string;
    validationIssues?: string[];
    error?: string;
    isSubmitting: boolean;
  } | null;
  setDraftActionDialog: React.Dispatch<React.SetStateAction<UseAssistedBookingWorkspaceReturn['draftActionDialog']>>;
  draftDeleteDialog: {
    draft: AssistedDraft;
    error?: string;
    isSubmitting: boolean;
  } | null;
  form: AssistedDraftForm;

  // derived
  normalizedRole: string;
  isAdmin: boolean;
  isStaff: boolean;
  hasResolvedRole: boolean;
  completionActionText: string;
  completionButtonLabel: string;
  selectedTour: TourOption | undefined;
  selectedTourDepartures: ReturnType<typeof hasDetailedDeparture extends (d: unknown) => d is infer D ? never : never>[];
  selectedDeparture: TourOption['departures'] extends (infer D)[] | undefined ? D | undefined : never;
  selectedPackage: { id: number; name: string; price: number; isActive?: boolean } | undefined;
  departureOptions: DraftSelectOption[];
  packageOptions: DraftSelectOption[];
  baseTourPrice: number;
  packageSurcharge: number;
  estimatedUnitPrice: number;
  adultCount: number;
  childCount: number;
  infantCount: number;
  totalPassengerCount: number;
  estimatedTotal: number;
  effectivePassengerDrafts: DraftPassenger[];
  generatedPassengerRows: GeneratedPassengerRow[];
  voucherStatus: string;
  hasRequiredDeparture: boolean;
  passengerChecklistStatus: { value: string; done: boolean; required: boolean };
  summaryChecklistItems: { label: string; value: string; done: boolean; required?: boolean }[];
  missingSummaryCount: number;
  filteredTours: TourOption[];
  submitErrorEntries: readonly [keyof AssistedDraftFormErrors, string][];
  draftActionDialogConfig: {
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
  } | null;
  pendingCount: number;
  needsApprovalValidation: boolean;
  approvalValidationIssues: string[];
  hasBlockingApprovalIssues: boolean;

  // handlers
  fetchDrafts: () => Promise<void>;
  updateForm: (key: keyof AssistedDraftForm, value: string) => void;
  updatePassengerCount: (key: 'adultCount' | 'childCount' | 'infantCount', value: string) => void;
  getDefaultPassengerIdentityType: (type: PassengerType) => string;
  openPassengerEditor: (row: GeneratedPassengerRow) => void;
  updatePassengerDetail: (index: number, patch: Partial<DraftPassenger>) => void;
  clearPassengerDetail: (row: GeneratedPassengerRow) => void;
  scrollToDraftField: (key: keyof AssistedDraftForm) => void;
  resetDraftForm: () => void;
  openCreateDraft: () => void;
  openEditDraft: (draft: AssistedDraft) => void;
  openDraftDetail: (draft: AssistedDraft) => void;
  createDraft: (submitAfterCreate: boolean) => Promise<void>;
  runDraftAction: (draft: AssistedDraft, action: AssistedDraftAction) => void;
  closeDraftActionDialog: () => void;
  canDeleteDraft: (draft: AssistedDraft) => boolean;
  openDeleteDraft: (draft: AssistedDraft) => void;
  closeDeleteDraftDialog: () => void;
  submitDraftActionDialog: () => Promise<void>;
  confirmDeleteDraft: () => Promise<void>;

  // helper re-exports needed in JSX
  getPackageDisplayName: typeof getPackageDisplayName;
  getSelectOptionLabel: typeof getSelectOptionLabel;
  fmt: typeof fmt;
  fmtDate: typeof fmtDate;
  formatPassengerBreakdown: typeof formatPassengerBreakdown;
  getPassengerAgeLabel: typeof getPassengerAgeLabel;
  getPassengerMaxDate: typeof getPassengerMaxDate;
  getPassengerMinDate: typeof getPassengerMinDate;
}

export function useAssistedBookingWorkspace({
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
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
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
  const [passengerDrafts, setPassengerDrafts] = useState<DraftPassenger[]>([{ type: 'Adult (12+)' }]);
  const [useRepresentativeAsFirstPassenger, setUseRepresentativeAsFirstPassenger] = useState(true);
  const [editingPassengerIndex, setEditingPassengerIndex] = useState<number | null>(null);
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
  const [form, setForm] = useState<AssistedDraftForm>({ ...EMPTY_FORM });

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

  const departureOptions = useMemo<DraftSelectOption[]>(() => [
    {
      value: '',
      label: 'Theo ngày mặc định của tour',
      description: selectedTour && selectedTourDepartures.length === 0
        ? 'Tour này chưa có lịch khởi hành cụ thể'
        : 'Dùng lịch mặc định nếu tour không có ngày riêng',
      icon: 'event_available',
    },
    ...selectedTourDepartures.map((departure, index) => ({
      value: String(departure.id ?? ''),
      label: `${fmtDate(departure.departureDate)} · còn ${departure.availableSeats ?? 0} ghế`,
      description: `${fmt(departure.price ?? selectedTour?.price ?? 0)} · Lịch #${index + 1}`,
      icon: 'calendar_month',
    })),
  ], [selectedTour, selectedTourDepartures]);

  const packageOptions = useMemo<DraftSelectOption[]>(() => [
    {
      value: '',
      label: 'Không chọn gói phụ thu',
      description: 'Dùng cấu hình giá mặc định của tour',
      icon: 'inventory_2',
    },
    ...(selectedTour?.packages ?? []).map(pkg => ({
      value: String(pkg.id),
      label: getPackageDisplayName(pkg.name),
      description: `Phụ thu +${fmt(pkg.price)}`,
      icon: 'package_2',
    })),
  ], [selectedTour?.packages]);

  const baseTourPrice = selectedDeparture?.price ?? selectedTour?.price ?? 0;
  const packageSurcharge = selectedPackage?.price ?? 0;
  const estimatedUnitPrice = baseTourPrice + packageSurcharge;
  const adultCount = Math.max(1, parsePassengerCount(form.adultCount, 1));
  const childCount = parsePassengerCount(form.childCount);
  const infantCount = parsePassengerCount(form.infantCount);
  const totalPassengerCount = adultCount + childCount + infantCount;
  const estimatedTotal =
    adultCount * estimatedUnitPrice * PASSENGER_PRICING['Adult (12+)'].multiplier +
    childCount * estimatedUnitPrice * PASSENGER_PRICING['Child (4-11)'].multiplier +
    infantCount * estimatedUnitPrice * PASSENGER_PRICING['Infant (<4)'].multiplier;

  const effectivePassengerDrafts = useMemo(
    () => buildPassengerDraftPayload(form, passengerDrafts, { useRepresentativeAsFirstPassenger }),
    [form, passengerDrafts, useRepresentativeAsFirstPassenger],
  );

  const generatedPassengerRows = useMemo<GeneratedPassengerRow[]>(() => {
    const typeCounters: Record<PassengerType, number> = {
      'Adult (12+)': 0,
      'Child (4-11)': 0,
      'Infant (<4)': 0,
    };

    return effectivePassengerDrafts.map((passenger, index) => {
      const type = normalizePassengerTypeLabel(String(passenger.type ?? 'Adult (12+)'));
      typeCounters[type] += 1;
      const typeIndex = typeCounters[type];
      const cfg = PASSENGER_PRICING[type];
      const fullName = typeof passenger.fullName === 'string' ? passenger.fullName.trim() : '';
      const dob = typeof passenger.dob === 'string' ? passenger.dob.trim() : '';
      const ageFromDob = getPassengerAgeLabel(dob);
      const hasDetails = hasPassengerDetails(passenger);
      const canUseRepresentative = type === 'Adult (12+)' && typeIndex === 1;
      const usesRepresentative = canUseRepresentative && useRepresentativeAsFirstPassenger;

      return {
        id: `${type}-${typeIndex}-${index}`,
        index,
        type,
        label: `${cfg.label} ${typeIndex}`,
        ageLabel: dob ? `${ageFromDob} · ${Math.round(cfg.multiplier * 100)}%` : `${cfg.age} tuổi · ${Math.round(cfg.multiplier * 100)}%`,
        icon: cfg.icon,
        canUseRepresentative,
        usesRepresentative,
        hasDetails,
        detailLabel: usesRepresentative
          ? (fullName || 'Dùng thông tin người đại diện')
          : fullName || (hasDetails ? 'Đã có một phần thông tin' : 'Chưa nhập chi tiết'),
        passenger,
      };
    });
  }, [effectivePassengerDrafts, useRepresentativeAsFirstPassenger]);

  const voucherStatus = form.voucherCode.trim() ? 'Chưa kiểm tra' : 'Chưa nhập';
  const hasRequiredDeparture = selectedTourDepartures.length === 0 || Boolean(form.departureId);

  const passengerChecklistStatus = (() => {
    const actualCount = effectivePassengerDrafts.length;
    const missingRows = Math.max(0, totalPassengerCount - actualCount);
    const extraRows = Math.max(0, actualCount - totalPassengerCount);
    const passengersMissingDetails = effectivePassengerDrafts.filter(p => !hasPassengerDetails(p)).length;
    const childOrInfantMissingDob = effectivePassengerDrafts.filter(p => {
      const type = normalizePassengerTypeLabel(String(p.type ?? 'Adult (12+)'));
      return type !== 'Adult (12+)' && !p.dob?.trim();
    }).length;

    if (missingRows > 0) return { value: `Còn thiếu ${missingRows} khách`, done: false, required: true };
    if (extraRows > 0) return { value: `Dư ${extraRows} khách`, done: false, required: true };
    if (childOrInfantMissingDob > 0) return { value: `${childOrInfantMissingDob} trẻ/em bé thiếu ngày sinh`, done: false, required: false };
    if (passengersMissingDetails > 0) return { value: `${passengersMissingDetails} khách chưa nhập chi tiết`, done: false, required: false };
    return { value: `Đủ ${actualCount}/${totalPassengerCount} khách`, done: actualCount === totalPassengerCount, required: true };
  })();

  const summaryChecklistItems = [
    {
      label: 'Người đại diện',
      value: form.customerName.trim() || 'Chưa nhập',
      done: Boolean(form.customerName.trim() && form.customerEmail.trim() && form.customerPhone.trim()),
    },
    { label: 'Tour', value: selectedTour?.name ?? 'Chưa chọn', done: Boolean(selectedTour) },
    {
      label: 'Khởi hành',
      value: selectedDeparture ? fmtDate(selectedDeparture.departureDate) : selectedTourDepartures.length > 0 ? 'Chưa chọn' : 'Mặc định',
      done: hasRequiredDeparture,
    },
    {
      label: 'Gói tour',
      value: selectedPackage ? getPackageDisplayName(selectedPackage.name) : 'Không phụ thu',
      done: true,
      required: false,
    },
    {
      label: 'Số khách',
      value: `${adultCount} người lớn${childCount ? ` · ${childCount} trẻ em` : ''}${infantCount ? ` · ${infantCount} em bé` : ''}`,
      done: totalPassengerCount > 0 && adultCount > 0 && infantCount <= adultCount,
    },
    {
      label: 'Khách đi tour',
      value: passengerChecklistStatus.value,
      done: passengerChecklistStatus.done,
      required: passengerChecklistStatus.required,
    },
    {
      label: 'Nguồn',
      value: getSelectOptionLabel(SOURCE_CHANNEL_OPTIONS, form.sourceChannel),
      done: Boolean(form.sourceChannel),
    },
    {
      label: 'Kênh xác nhận',
      value: getSelectOptionLabel(CONFIRMATION_CHANNEL_OPTIONS, form.confirmationChannel),
      done: Boolean(form.confirmationChannel),
    },
  ];

  const missingSummaryCount = summaryChecklistItems.filter(item => item.required !== false && !item.done).length;

  const filteredTours = useMemo(() => {
    const query = tourQuery.trim().toLowerCase();
    if (!query) return tours;
    return tours.filter(t => {
      const haystack = `${t.name} ${t.destination?.name ?? ''} ${t.price}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [tourQuery, tours]);

  const submitErrorEntries = DRAFT_FIELD_ORDER
    .filter(key => Boolean(submitErrors[key]))
    .map(key => [key, submitErrors[key] as string] as const);

  const draftActionDialogConfig = draftActionDialog?.action === 'submit'
    ? {
        eyebrow: 'Gửi duyệt',
        title: 'Rà soát trước khi gửi admin duyệt',
        description: 'Kiểm tra lại thông tin người đại diện, tour, lịch khởi hành, số khách và kênh xác nhận trước khi chuyển bản nháp sang trạng thái chờ duyệt.',
        icon: 'approval_delegation',
        iconClass: 'bg-blue-50 text-blue-700 ring-blue-100',
        label: '',
        placeholder: '',
        submitLabel: 'Xác nhận gửi duyệt',
        submitClass: 'bg-blue-700 text-white hover:bg-blue-800 focus-visible:ring-blue-500',
        hint: 'Sau khi gửi, admin sẽ kiểm tra và duyệt tạo booking thật. Staff vẫn xem được bản nháp trong danh sách chờ duyệt.',
        requiresReason: false,
        showReason: false,
      }
    : draftActionDialog?.action === 'reject'
    ? {
        eyebrow: 'Từ chối duyệt',
        title: 'Từ chối bản nháp đặt hộ',
        description: 'Bản nháp sẽ chuyển sang trạng thái từ chối. Staff vẫn xem được lý do để trao đổi lại với khách.',
        icon: 'block',
        iconClass: 'bg-red-50 text-red-700 ring-red-100',
        label: 'Lý do từ chối',
        placeholder: 'Ví dụ: Không đủ thông tin người đại diện, tour đã hết chỗ, giá/voucher không hợp lệ...',
        submitLabel: 'Từ chối bản nháp',
        submitClass: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        hint: 'Viết rõ nguyên nhân nghiệp vụ để staff không phải hỏi lại admin.',
        requiresReason: true,
        showReason: true,
      }
    : draftActionDialog?.action === 'request-revision'
      ? {
          eyebrow: 'Yêu cầu chỉnh sửa',
          title: 'Gửi yêu cầu sửa cho staff',
          description: 'Bản nháp sẽ quay về trạng thái cần sửa. Staff sẽ dùng nội dung này làm checklist trước khi gửi duyệt lại.',
          icon: 'rate_review',
          iconClass: 'bg-amber-50 text-amber-700 ring-amber-100',
          label: 'Nội dung cần chỉnh sửa',
          placeholder: 'Ví dụ: Bổ sung CCCD người đại diện, chọn ngày khởi hành 18/06, xác nhận lại email nhận vé...',
          submitLabel: 'Gửi yêu cầu sửa',
          submitClass: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500',
          hint: 'Ưu tiên gạch đầu dòng các việc cần sửa để staff xử lý nhanh.',
          requiresReason: true,
          showReason: true,
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
            showReason: true,
          }
        : null;

  const pendingCount = drafts.filter(d => d.status === 'PENDING_APPROVAL').length;
  const needsApprovalValidation = draftActionDialog?.action === 'submit' || draftActionDialog?.action === 'approve';
  const approvalValidationIssues = needsApprovalValidation ? (draftActionDialog.validationIssues ?? []) : [];
  const hasBlockingApprovalIssues = approvalValidationIssues.length > 0;

  // ─── data fetching ────────────────────────────────────────────────────────

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
      if (!tourPickerRef.current?.contains(event.target as Node)) setIsTourPickerOpen(false);
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

  // ─── validation ───────────────────────────────────────────────────────────

  const scrollToDraftField = (key: keyof AssistedDraftForm) => {
    const target = document.querySelector<HTMLElement>(`[data-draft-field="${key}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      const focusable = target.querySelector<HTMLElement>('input, textarea, button');
      focusable?.focus({ preventScroll: true });
    }, 250);
  };

  const validateForApproval = () => {
    const errors: AssistedDraftFormErrors = {};
    const currentAdultCount = parsePassengerCount(form.adultCount, 1);
    const currentChildCount = parsePassengerCount(form.childCount);
    const currentInfantCount = parsePassengerCount(form.infantCount);
    const currentTotalPassengerCount = currentAdultCount + currentChildCount + currentInfantCount;

    if (!form.customerName.trim()) errors.customerName = `Nhập tên người đại diện trước khi ${completionActionText}`;
    if (!form.customerEmail.trim()) errors.customerEmail = 'Nhập email người đại diện để tạo hồ sơ';
    else if (!isValidEmail(form.customerEmail)) errors.customerEmail = 'Email chưa đúng định dạng';
    if (form.emailForTicket.trim() && !isValidEmail(form.emailForTicket)) errors.emailForTicket = 'Email nhận vé chưa đúng định dạng';
    if (!form.customerPhone.trim()) errors.customerPhone = 'Nhập số điện thoại để staff/admin liên hệ';
    else if (!isValidVietnamPhone(form.customerPhone)) errors.customerPhone = 'Số điện thoại chưa đúng định dạng Việt Nam';
    if (form.customerIdentityNo.trim() && !isValidCccd(form.customerIdentityNo)) errors.customerIdentityNo = 'CCCD phải gồm đúng 12 chữ số';
    if (!form.tourId) errors.tourId = 'Chọn tour cần đặt hộ';
    if (form.confirmationChannel === 'EMAIL' && !form.emailForTicket.trim() && !form.customerEmail.trim()) {
      errors.emailForTicket = 'Cần email để gửi xác nhận thanh toán';
    }
    if (currentAdultCount < 1) errors.adultCount = 'Cần ít nhất 1 người lớn trong đoàn';
    if (currentInfantCount > currentAdultCount) errors.infantCount = 'Số em bé không vượt quá số người lớn';
    if (currentTotalPassengerCount < 1) errors.adultCount = 'Số khách phải từ 1 trở lên';
    if (selectedTourDepartures.length > 0 && !form.departureId) {
      errors.departureId = 'Chọn lịch khởi hành cụ thể';
    }

    setSubmitErrors(errors);
    const firstErrorKey = DRAFT_FIELD_ORDER.find(key => errors[key]);
    if (firstErrorKey) window.setTimeout(() => scrollToDraftField(firstErrorKey), 50);
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
    const draftPassengerList = Array.isArray(draft.passengers) ? draft.passengers : [];
    const passengerCounts = getPassengerCounts(draft.passengers, passengerCount || 1);
    const countedPassengerTotal = passengerTypeOrder.reduce((total, type) => total + passengerCounts[type], 0);
    const draftTour = tours.find(tour => tour.id === draft.tourId);
    const activeDepartures = (draftTour?.departures ?? []).filter(d => d.isActive !== false).filter(hasDetailedDeparture);
    const draftDeparture = activeDepartures.find(d => d.id === draft.departureId);

    if (!draft.customerName?.trim()) issues.push('Thiếu tên người đại diện.');
    if (!customerEmail) issues.push('Thiếu email người đại diện để tạo hồ sơ.');
    else if (!isValidEmail(customerEmail)) issues.push(`Email người đại diện không hợp lệ: ${customerEmail}.`);
    if (!customerPhone) issues.push('Thiếu số điện thoại người đại diện.');
    else if (!isValidVietnamPhone(customerPhone)) issues.push(`Số điện thoại không đúng định dạng Việt Nam: ${customerPhone}.`);
    if (customerIdentityNo && !isValidCccd(customerIdentityNo)) issues.push('CCCD phải gồm đúng 12 chữ số.');
    if (emailForTicket && !isValidEmail(emailForTicket)) issues.push(`Email nhận vé không hợp lệ: ${emailForTicket}.`);
    if (!CONFIRMATION_CHANNEL_OPTIONS.some(o => o.value === confirmationChannel)) issues.push('Kênh gửi xác nhận không hợp lệ.');
    if (confirmationChannel === 'EMAIL' && !emailForTicket && !customerEmail) issues.push('Kênh email cần email nhận vé hoặc email người đại diện.');
    if (!draft.tourId) issues.push('Chưa chọn tour cần đặt hộ.');
    if (passengerCount < 1) issues.push('Số khách phải từ 1 trở lên.');
    if (draftPassengerList.length !== passengerCount) issues.push('Danh sách khách đi tour chưa khớp tổng số khách.');
    if (countedPassengerTotal !== passengerCount) issues.push('Cơ cấu khách chưa khớp tổng số khách.');
    if (passengerCounts['Adult (12+)'] < 1) issues.push('Cần ít nhất 1 người lớn trong đoàn.');
    if (passengerCounts['Infant (<4)'] > passengerCounts['Adult (12+)']) issues.push('Số em bé không được vượt quá số người lớn.');
    if (activeDepartures.length > 0 && !draft.departureId) issues.push('Tour có lịch khởi hành cụ thể, cần chọn lịch trước khi duyệt.');
    if (draft.departureId && draftDeparture?.availableSeats !== undefined && draftDeparture.availableSeats < passengerCount) {
      issues.push(`Lịch khởi hành chỉ còn ${draftDeparture.availableSeats} ghế, không đủ cho ${passengerCount} khách.`);
    } else if (!draft.departureId && draftTour?.availableSeats !== undefined && draftTour.availableSeats < passengerCount) {
      issues.push(`Tour chỉ còn ${draftTour.availableSeats} ghế, không đủ cho ${passengerCount} khách.`);
    }

    return issues;
  };

  // ─── form handlers ────────────────────────────────────────────────────────

  const updateForm = (key: keyof AssistedDraftForm, value: string) => {
    const nextValue = key === 'customerPhone' ? digitsOnly(value) : value;
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
      [key]: nextValue,
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

  const getDefaultPassengerIdentityType = (type: PassengerType) =>
    type === 'Infant (<4)' ? 'BIRTH_CERT' : 'CCCD';

  const openPassengerEditor = (row: GeneratedPassengerRow) => {
    if (row.usesRepresentative) setUseRepresentativeAsFirstPassenger(false);
    setPassengerDrafts(current =>
      buildPassengerDraftPayload(form, current, { useRepresentativeAsFirstPassenger: row.usesRepresentative ? false : useRepresentativeAsFirstPassenger })
    );
    setEditingPassengerIndex(row.index);
  };

  const updatePassengerDetail = (index: number, patch: Partial<DraftPassenger>) => {
    if (draftFormError) setDraftFormError(null);
    setPassengerDrafts(() => {
      const next = effectivePassengerDrafts.map(p => ({ ...p }));
      const current = next[index] ?? { type: 'Adult (12+)' as PassengerType };
      const nextType = normalizePassengerTypeLabel(String((patch.type ?? current.type) || 'Adult (12+)'));
      next[index] = { ...current, ...patch, type: nextType };
      return next;
    });
  };

  const clearPassengerDetail = (row: GeneratedPassengerRow) => {
    updatePassengerDetail(row.index, {
      fullName: '',
      dob: '',
      gender: '',
      identityType: getDefaultPassengerIdentityType(row.type),
      identityNo: '',
      notes: '',
    });
  };

  const resetDraftForm = () => {
    const nextForm: AssistedDraftForm = { ...EMPTY_FORM };
    setEditingDraft(null);
    setSubmitErrors({});
    setDraftFormError(null);
    setTourQuery('');
    setIsTourPickerOpen(false);
    setUseRepresentativeAsFirstPassenger(true);
    setEditingPassengerIndex(null);
    setPassengerDrafts(buildPassengerDraftPayload(nextForm));
    setForm(nextForm);
  };

  const openCreateDraft = () => {
    resetDraftForm();
    setIsDrawerOpen(true);
  };

  const openCreateDraftFromBooking = useCallback((detail: CreateAssistedDraftEventDetail) => {
    const people = Math.max(1, Math.floor(Number(detail.numberOfPeople) || 1));
    const nextForm: AssistedDraftForm = {
      customerName: detail.customerName ?? '',
      customerEmail: detail.customerEmail ?? '',
      customerPhone: digitsOnly(detail.customerPhone ?? ''),
      customerIdentityNo: '',
      sourceChannel: 'WEBSITE',
      confirmationChannel: 'ZALO',
      emailForTicket: detail.customerEmail ?? '',
      tourId: detail.tourId ? String(detail.tourId) : '',
      departureId: '',
      packageId: '',
      adultCount: String(people),
      childCount: '0',
      infantCount: '0',
      voucherCode: detail.voucherCode ?? '',
      specialRequests: '',
      internalNote: detail.internalNote ?? (detail.bookingCode ? `Tạo lại từ đơn ${detail.bookingCode}` : ''),
    };
    setEditingDraft(null);
    setSubmitErrors({});
    setDraftFormError(null);
    setTourQuery('');
    setIsTourPickerOpen(false);
    setUseRepresentativeAsFirstPassenger(true);
    setEditingPassengerIndex(null);
    setPassengerDrafts(buildPassengerDraftPayload(nextForm));
    setForm(nextForm);
    setIsWorkspaceOpen(true);
    setIsDrawerOpen(true);
    window.setTimeout(() => {
      document.getElementById('assisted-booking-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      openCreateDraftFromBooking((event as CustomEvent<CreateAssistedDraftEventDetail>).detail ?? {});
    };
    window.addEventListener('booking:create-assisted-draft', handler);
    return () => window.removeEventListener('booking:create-assisted-draft', handler);
  }, [openCreateDraftFromBooking]);

  const openEditDraft = (draft: AssistedDraft) => {
    const counts = getPassengerCounts(draft.passengers, draft.numberOfPeople || 1);
    const existingPassengers = Array.isArray(draft.passengers) ? draft.passengers : [];
    const firstAdultPassenger = Array.isArray(draft.passengers)
      ? draft.passengers.find(p => normalizePassengerTypeLabel(String(p?.type ?? 'Adult (12+)')) === 'Adult (12+)')
      : undefined;
    const firstAdultName = typeof firstAdultPassenger?.fullName === 'string' ? firstAdultPassenger.fullName.trim() : '';
    const firstAdultIdentityNo = typeof firstAdultPassenger?.identityNo === 'string' ? firstAdultPassenger.identityNo.trim() : '';
    const draftCustomerName = (draft.customerName ?? '').trim();
    const draftIdentityNo = (draft.customerIdentityNo ?? '').trim();
    const firstAdultUsesRepresentative = Boolean(
      !firstAdultPassenger ||
      (firstAdultName && draftCustomerName && firstAdultName === draftCustomerName) ||
      (firstAdultIdentityNo && draftIdentityNo && firstAdultIdentityNo === draftIdentityNo),
    );
    setEditingDraft(draft);
    setSubmitErrors({});
    setDraftFormError(null);
    setTourQuery('');
    setIsTourPickerOpen(false);
    setUseRepresentativeAsFirstPassenger(firstAdultUsesRepresentative);
    setEditingPassengerIndex(null);
    const nextForm: AssistedDraftForm = {
      customerName: draft.customerName ?? '',
      customerEmail: draft.customerEmail ?? '',
      customerPhone: digitsOnly(draft.customerPhone ?? ''),
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
    };
    setPassengerDrafts(buildPassengerDraftPayload(nextForm, existingPassengers, { useRepresentativeAsFirstPassenger: firstAdultUsesRepresentative }));
    setForm(nextForm);
    setIsDrawerOpen(true);
  };

  const openDraftDetail = (draft: AssistedDraft) => {
    setViewingDraft(draft);
  };

  // ─── API mutations ────────────────────────────────────────────────────────

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

  const runDraftAction = (draft: AssistedDraft, action: AssistedDraftAction) => {
    if (action === 'submit' || action === 'approve' || action === 'reject' || action === 'request-revision') {
      const validationIssues = action === 'submit' || action === 'approve' ? validateDraftForApproval(draft) : [];
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

  return {
    // state
    drafts,
    tours,
    role,
    isLoading,
    isDrawerOpen,
    setIsDrawerOpen,
    isWorkspaceOpen,
    setIsWorkspaceOpen,
    editingDraft,
    viewingDraft,
    setViewingDraft,
    isSaving,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    isTourPickerOpen,
    setIsTourPickerOpen,
    tourQuery,
    setTourQuery,
    tourPickerRef,
    submitErrors,
    draftFormError,
    passengerDrafts,
    useRepresentativeAsFirstPassenger,
    setUseRepresentativeAsFirstPassenger,
    editingPassengerIndex,
    setEditingPassengerIndex,
    draftActionDialog,
    setDraftActionDialog,
    draftDeleteDialog,
    form,
    // derived
    normalizedRole,
    isAdmin,
    isStaff,
    hasResolvedRole,
    completionActionText,
    completionButtonLabel,
    selectedTour,
    selectedTourDepartures,
    selectedDeparture,
    selectedPackage,
    departureOptions,
    packageOptions,
    baseTourPrice,
    packageSurcharge,
    estimatedUnitPrice,
    adultCount,
    childCount,
    infantCount,
    totalPassengerCount,
    estimatedTotal,
    effectivePassengerDrafts,
    generatedPassengerRows,
    voucherStatus,
    hasRequiredDeparture,
    passengerChecklistStatus,
    summaryChecklistItems,
    missingSummaryCount,
    filteredTours,
    submitErrorEntries,
    draftActionDialogConfig,
    pendingCount,
    needsApprovalValidation,
    approvalValidationIssues,
    hasBlockingApprovalIssues,
    // handlers
    fetchDrafts,
    updateForm,
    updatePassengerCount,
    getDefaultPassengerIdentityType,
    openPassengerEditor,
    updatePassengerDetail,
    clearPassengerDetail,
    scrollToDraftField,
    resetDraftForm,
    openCreateDraft,
    openEditDraft,
    openDraftDetail,
    createDraft,
    runDraftAction,
    closeDraftActionDialog,
    canDeleteDraft,
    openDeleteDraft,
    closeDeleteDraftDialog,
    submitDraftActionDialog,
    confirmDeleteDraft,
    // helper re-exports
    getPackageDisplayName,
    getSelectOptionLabel,
    fmt,
    fmtDate,
    formatPassengerBreakdown,
    getPassengerAgeLabel,
    getPassengerMaxDate,
    getPassengerMinDate,
  };
}

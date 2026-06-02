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
  normalizePassengerTypeLabel,
  parsePassengerCount,
} from '../_lib/helpers';
import type {
  AssistedDraft,
  AssistedDraftAction,
  AssistedDraftForm,
  AssistedDraftFormErrors,
  DraftPassenger,
  PassengerType,
  TourOption,
} from '../_lib/types';

type DraftSelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
};

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

const SOURCE_CHANNEL_OPTIONS: DraftSelectOption[] = [
  { value: 'LIVE_CHAT', label: 'Live chat', description: 'Khách nhắn qua widget chat', icon: 'forum' },
  { value: 'ZALO', label: 'Zalo', description: 'Tư vấn qua Zalo OA hoặc cá nhân', icon: 'chat' },
  { value: 'FACEBOOK', label: 'Facebook', description: 'Inbox fanpage hoặc comment', icon: 'public' },
  { value: 'PHONE', label: 'Điện thoại', description: 'Khách gọi trực tiếp', icon: 'call' },
  { value: 'WEBSITE', label: 'Website', description: 'Khách để lại thông tin trên website', icon: 'language' },
  { value: 'WALK_IN', label: 'Khách trực tiếp', description: 'Khách đến văn phòng/quầy tư vấn', icon: 'storefront' },
  { value: 'PARTNER', label: 'Đối tác / CTV', description: 'Booking được chuyển từ đối tác bán hàng', icon: 'handshake' },
];

const CONFIRMATION_CHANNEL_OPTIONS: DraftSelectOption[] = [
  { value: 'ZALO', label: 'Zalo / copy thủ công', description: 'Phù hợp khi đang tư vấn qua Zalo', icon: 'chat' },
  { value: 'EMAIL', label: 'Email tự động', description: 'Gửi xác nhận qua email khách', icon: 'mail' },
  { value: 'SMS', label: 'SMS', description: 'Gửi hoặc ghi nhận qua tin nhắn SMS', icon: 'sms' },
  { value: 'PHONE', label: 'Gọi điện', description: 'Xác nhận trực tiếp qua cuộc gọi', icon: 'call' },
  { value: 'MANUAL', label: 'Gửi thủ công', description: 'Nhân sự tự gửi qua kênh khác', icon: 'edit_note' },
  { value: 'NO_SEND', label: 'Không gửi ngay', description: 'Chỉ tạo booking, chưa gửi yêu cầu thanh toán', icon: 'notifications_off' },
];

const DRAFT_STATUS_FILTER_OPTIONS: DraftSelectOption[] = [
  { value: '', label: 'Tất cả trạng thái', icon: 'filter_list' },
  { value: 'DRAFT', label: 'Bản nháp', icon: 'draft' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt', icon: 'hourglass_top' },
  { value: 'NEEDS_REVISION', label: 'Cần sửa', icon: 'rate_review' },
  { value: 'REJECTED', label: 'Từ chối', icon: 'block' },
  { value: 'CONVERTED', label: 'Đã tạo đơn', icon: 'task_alt' },
];

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

const DRAFT_FIELD_ORDER: (keyof AssistedDraftForm)[] = [
  'customerName',
  'customerEmail',
  'customerPhone',
  'tourId',
  'adultCount',
  'childCount',
  'infantCount',
  'departureId',
  'customerIdentityNo',
  'sourceChannel',
  'confirmationChannel',
  'emailForTicket',
  'packageId',
  'voucherCode',
  'specialRequests',
  'internalNote',
];

function getSelectOptionLabel(options: DraftSelectOption[], value: string, fallback = 'Chưa chọn') {
  return options.find(option => option.value === value)?.label ?? fallback;
}

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

function SummaryChecklistRow({
  label,
  value,
  done,
  required = true,
}: {
  label: string;
  value: string;
  done: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl px-3 py-2.5 ring-1 ring-slate-100">
      <span className="flex min-w-0 items-start gap-2">
        <span className={`material-symbols-outlined mt-0.5 text-[17px] ${done ? 'text-emerald-600' : required ? 'text-amber-600' : 'text-slate-400'}`}>
          {done ? 'check_circle' : required ? 'radio_button_unchecked' : 'remove_circle'}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold text-slate-500">{label}</span>
          {!done && required && <span className="mt-0.5 block text-[11px] font-semibold text-amber-700">Cần bổ sung</span>}
        </span>
      </span>
      <span className={`max-w-[180px] text-right text-sm font-black ${done ? 'text-slate-900' : required ? 'text-amber-800' : 'text-slate-500'}`}>
        {value}
      </span>
    </div>
  );
}

function DraftSelect({
  value,
  options,
  onChange,
  placeholder = 'Chọn...',
  className = '',
  menuClassName = '',
  ariaLabel,
  hasError = false,
}: {
  value: string;
  options: DraftSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  ariaLabel?: string;
  hasError?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  return (
    <div ref={selectRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        data-invalid={hasError ? 'true' : undefined}
        onClick={() => setIsOpen(open => !open)}
        onKeyDown={event => {
          if (event.key === 'Escape') setIsOpen(false);
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`flex min-h-[48px] w-full items-center justify-between gap-3 text-left ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selectedOption?.icon && (
            <span className="material-symbols-outlined text-[18px] text-blue-600">{selectedOption.icon}</span>
          )}
          <span className={`truncate ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <span className={`material-symbols-outlined shrink-0 text-[18px] text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 z-[95] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/12 ${menuClassName}`}
        >
          <div className="max-h-72 overflow-y-auto">
            {options.map(option => {
              const active = option.value === value;
              return (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-100'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`material-symbols-outlined mt-0.5 text-[18px] ${active ? 'text-blue-700' : 'text-slate-400'}`}>
                    {option.icon ?? (active ? 'check_circle' : 'radio_button_unchecked')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{option.label}</span>
                    {option.description && (
                      <span className={`mt-0.5 block text-xs font-semibold ${active ? 'text-blue-700/70' : 'text-slate-500'}`}>
                        {option.description}
                      </span>
                    )}
                  </span>
                  {active && <span className="material-symbols-outlined text-[18px] text-blue-700">done</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
    const passengersMissingDetails = effectivePassengerDrafts.filter(passenger => !hasPassengerDetails(passenger)).length;
    const childOrInfantMissingDob = effectivePassengerDrafts.filter(passenger => {
      const type = normalizePassengerTypeLabel(String(passenger.type ?? 'Adult (12+)'));
      return type !== 'Adult (12+)' && !passenger.dob?.trim();
    }).length;

    if (missingRows > 0) {
      return { value: `Còn thiếu ${missingRows} khách`, done: false, required: true };
    }
    if (extraRows > 0) {
      return { value: `Dư ${extraRows} khách`, done: false, required: true };
    }
    if (childOrInfantMissingDob > 0) {
      return { value: `${childOrInfantMissingDob} trẻ/em bé thiếu ngày sinh`, done: false, required: false };
    }
    if (passengersMissingDetails > 0) {
      return { value: `${passengersMissingDetails} khách chưa nhập chi tiết`, done: false, required: false };
    }
    return { value: `Đủ ${actualCount}/${totalPassengerCount} khách`, done: actualCount === totalPassengerCount, required: true };
  })();
  const summaryChecklistItems = [
    {
      label: 'Người đại diện',
      value: form.customerName.trim() || 'Chưa nhập',
      done: Boolean(form.customerName.trim() && form.customerEmail.trim() && form.customerPhone.trim()),
    },
    {
      label: 'Tour',
      value: selectedTour?.name ?? 'Chưa chọn',
      done: Boolean(selectedTour),
    },
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
  const submitErrorEntries = DRAFT_FIELD_ORDER
    .filter(key => Boolean(submitErrors[key]))
    .map(key => [key, submitErrors[key] as string] as const);
  const scrollToDraftField = (key: keyof AssistedDraftForm) => {
    const target = document.querySelector<HTMLElement>(`[data-draft-field="${key}"]`);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      const focusable = target.querySelector<HTMLElement>('input, textarea, button');
      focusable?.focus({ preventScroll: true });
    }, 250);
  };
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
    if (firstErrorKey) {
      window.setTimeout(() => scrollToDraftField(firstErrorKey), 50);
    }
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
    const activeDepartures = (draftTour?.departures ?? []).filter(departure => departure.isActive !== false).filter(hasDetailedDeparture);
    const draftDeparture = activeDepartures.find(departure => departure.id === draft.departureId);

    if (!draft.customerName?.trim()) issues.push('Thiếu tên người đại diện.');
    if (!customerEmail) issues.push('Thiếu email người đại diện để tạo hồ sơ.');
    else if (!isValidEmail(customerEmail)) issues.push(`Email người đại diện không hợp lệ: ${customerEmail}.`);
    if (!customerPhone) issues.push('Thiếu số điện thoại người đại diện.');
    else if (!isValidVietnamPhone(customerPhone)) issues.push(`Số điện thoại không đúng định dạng Việt Nam: ${customerPhone}.`);
    if (customerIdentityNo && !isValidCccd(customerIdentityNo)) issues.push('CCCD phải gồm đúng 12 chữ số.');
    if (emailForTicket && !isValidEmail(emailForTicket)) issues.push(`Email nhận vé không hợp lệ: ${emailForTicket}.`);
    if (!CONFIRMATION_CHANNEL_OPTIONS.some(option => option.value === confirmationChannel)) issues.push('Kênh gửi xác nhận không hợp lệ.');
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
      const next = effectivePassengerDrafts.map(passenger => ({ ...passenger }));
      const current = next[index] ?? { type: 'Adult (12+)' as PassengerType };
      const nextType = normalizePassengerTypeLabel(String((patch.type ?? current.type) || 'Adult (12+)'));
      next[index] = {
        ...current,
        ...patch,
        type: nextType,
      };
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
    const nextForm: AssistedDraftForm = {
      customerName: '', customerEmail: '', customerPhone: '', customerIdentityNo: '', sourceChannel: 'LIVE_CHAT', confirmationChannel: 'ZALO', emailForTicket: '',
      tourId: '', departureId: '', packageId: '', adultCount: '1', childCount: '0', infantCount: '0',
      voucherCode: '', specialRequests: '', internalNote: '',
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
      ? draft.passengers.find(passenger => normalizePassengerTypeLabel(String(passenger?.type ?? 'Adult (12+)')) === 'Adult (12+)')
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
        action === 'approve'
          ? 'Đã duyệt bản nháp và tạo booking thật.'
          : action === 'submit'
            ? 'Đã gửi bản nháp sang admin chờ duyệt.'
            : action === 'request-revision'
              ? 'Đã gửi yêu cầu chỉnh sửa cho staff.'
              : action === 'reject'
                ? 'Đã từ chối bản nháp đặt hộ.'
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

  const pendingCount = drafts.filter(d => d.status === 'PENDING_APPROVAL').length;
  const draftListId = 'assisted-booking-drafts';
  const needsApprovalValidation = draftActionDialog?.action === 'submit' || draftActionDialog?.action === 'approve';
  const approvalValidationIssues = needsApprovalValidation
    ? draftActionDialog.validationIssues ?? []
    : [];
  const hasBlockingApprovalIssues = approvalValidationIssues.length > 0;

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
          <div className="border-y border-slate-100 bg-slate-50/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm draft, người đại diện, email, tên tour..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full sm:w-56">
            <DraftSelect
              value={statusFilter}
              options={DRAFT_STATUS_FILTER_OPTIONS}
              onChange={setStatusFilter}
              ariaLabel="Lọc trạng thái booking draft"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
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
                <p className="mt-2 truncate text-sm font-bold text-slate-900">{draft.customerName || 'Chưa nhập tên người đại diện'}</p>
                <p className="truncate text-xs text-slate-500">
                  {draft.customerEmail || 'Chưa nhập email'}{draft.customerPhone ? ` · ${draft.customerPhone}` : ''}{draft.customerIdentityNo ? ` · CCCD ${draft.customerIdentityNo}` : ''}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{draft.tour?.name ?? `Tour #${draft.tourId}`}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatPassengerBreakdown(draft.passengers, draft.numberOfPeople)} · {fmt(draft.quotedPrice)} · {getSelectOptionLabel(SOURCE_CHANNEL_OPTIONS, draft.sourceChannel, draft.sourceChannel)}
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
        </div>
      )}

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

                <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
                  <div className="rounded-[22px] border border-blue-100 bg-blue-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Tạm tính</p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-blue-950">{fmt(estimatedTotal)}</p>
                      </div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/80 text-blue-700 ring-1 ring-blue-100">
                        <span className="material-symbols-outlined text-[20px]">payments</span>
                      </span>
                    </div>
                    <div className="mt-4 space-y-2 rounded-2xl bg-white/75 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-blue-900/60">Số khách</span>
                        <span className="font-black text-blue-950">{totalPassengerCount}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-blue-900/60">Giá tour/người</span>
                        <span className="font-black text-blue-950">{fmt(baseTourPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-blue-900/60">Phụ thu gói</span>
                        <span className="font-black text-blue-950">{packageSurcharge > 0 ? `+${fmt(packageSurcharge)}` : fmt(0)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-blue-100 pt-2">
                        <span className="font-semibold text-blue-900/60">Đơn giá sau phụ thu</span>
                        <span className="font-black text-blue-950">{fmt(estimatedUnitPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-blue-900/60">Voucher</span>
                        <span className={`font-black ${form.voucherCode.trim() ? 'text-amber-700' : 'text-blue-950'}`}>{voucherStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">Tóm tắt lựa chọn</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Kiểm tra nhanh trước khi lưu hoặc gửi duyệt.</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${missingSummaryCount ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'}`}>
                        {missingSummaryCount ? `${missingSummaryCount} mục thiếu` : 'Đủ cơ bản'}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {summaryChecklistItems.map(item => (
                        <SummaryChecklistRow
                          key={item.label}
                          label={item.label}
                          value={item.value}
                          done={item.done}
                          required={item.required}
                        />
                      ))}
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

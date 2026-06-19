'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { UNLIMITED_USES } from '../_lib/config';

export interface VoucherFormData {
  id?: number;
  code: string;
  label: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number | string;
  maxDiscountAmount: number | string;
  minOrderValue: number | string;
  maxUses: number | string;
  unlimitedUses: boolean;
  usageLimitPerUser: number | string;
  startsAt: string;
  expiresAt: string;
  neverExpires: boolean;
  isActive: boolean;
  isStackable: boolean;
  eligibleTourIds: string;
  eligibleDestinationIds: string;
  eligibleCustomerSegments: string[];
}

export interface VoucherInitialData extends Partial<Omit<
  VoucherFormData,
  'eligibleTourIds' | 'eligibleDestinationIds' | 'eligibleCustomerSegments' | 'maxDiscountAmount' | 'usageLimitPerUser'
>> {
  computedStatus?: string;
  usedCount?: number;
  maxDiscountAmount?: number | null;
  usageLimitPerUser?: number | null;
  eligibleTourIds?: number[];
  eligibleDestinationIds?: number[];
  eligibleCustomerSegments?: string[];
}

export interface ReferenceOption {
  id: number;
  label: string;
  meta?: string;
}

interface TourReference {
  id: number;
  name?: string | null;
  nameEn?: string | null;
  status?: string | null;
  destination?: { name?: string | null; nameEn?: string | null } | null;
}

interface DestinationReference {
  id: number;
  name?: string | null;
  nameEn?: string | null;
  region?: string | null;
  regionEn?: string | null;
  travelScope?: string | null;
}

const NEVER_EXPIRES_THRESHOLD = '2099-01-01';

export const CUSTOMER_SEGMENT_OPTIONS = [
  { value: 'FIRST_TIME', label: 'Khách mới' },
  { value: 'RETURNING', label: 'Khách quay lại' },
  { value: 'SAVED_TO_WALLET', label: 'Đã lưu ví' },
];

export const formatCurrencyInput = (value: string) =>
  value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const parseCurrencyInput = (value: string) => Number(value.replace(/[^\d]/g, '')) || 0;

export const normalizePercentageInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return String(Math.min(100, Math.max(1, Number(digits))));
};

export const parseIdList = (value: string) =>
  Array.from(new Set(value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)));

export const formatIdList = (value?: number[] | null) => (value ?? []).join(', ');

export const normalizeReferenceSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();

const toArrayPayload = <T,>(payload: unknown): T[] => {
  const root = payload as { data?: unknown } | unknown[];
  const data = Array.isArray(root) ? root : root?.data;
  if (Array.isArray(data)) return data as T[];
  const nested = data as { data?: unknown } | undefined;
  return Array.isArray(nested?.data) ? nested.data as T[] : [];
};

const toDateInputValue = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export const toLocalYMD = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const addDaysToYMD = (ymd: string, days: number) => {
  if (!ymd) return '';
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toLocalYMD(date);
};

export function useVoucherForm(
  mode: 'create' | 'edit',
  initialData: VoucherInitialData | undefined,
  onSuccess: (message: string) => void,
  onClose: () => void,
) {
  const isEdit = mode === 'edit';
  const initNeverExpires = !initialData?.expiresAt || initialData.expiresAt > NEVER_EXPIRES_THRESHOLD;
  const initUnlimited = !initialData?.maxUses || Number(initialData.maxUses) >= UNLIMITED_USES;
  const todayYMD = toLocalYMD();

  const [form, setForm] = useState<VoucherFormData>({
    code: initialData?.code ?? '',
    label: initialData?.label ?? '',
    description: initialData?.description ?? '',
    discountType: initialData?.discountType ?? 'PERCENTAGE',
    discountValue: initialData?.discountValue ?? '',
    maxDiscountAmount: initialData?.maxDiscountAmount
      ? formatCurrencyInput(String(initialData.maxDiscountAmount))
      : '',
    minOrderValue: initialData?.minOrderValue
      ? formatCurrencyInput(String(initialData.minOrderValue))
      : '',
    maxUses: initialData?.maxUses && !initUnlimited ? String(initialData.maxUses) : '',
    unlimitedUses: initUnlimited,
    usageLimitPerUser: initialData?.usageLimitPerUser ? String(initialData.usageLimitPerUser) : '',
    startsAt: toDateInputValue(initialData?.startsAt as string) || todayYMD,
    expiresAt: initNeverExpires ? '' : toDateInputValue(initialData?.expiresAt as string),
    neverExpires: initNeverExpires,
    isActive: initialData?.isActive ?? true,
    isStackable: initialData?.isStackable ?? false,
    eligibleTourIds: formatIdList(initialData?.eligibleTourIds),
    eligibleDestinationIds: formatIdList(initialData?.eligibleDestinationIds),
    eligibleCustomerSegments: initialData?.eligibleCustomerSegments ?? [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof VoucherFormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [tourOptions, setTourOptions] = useState<ReferenceOption[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<ReferenceOption[]>([]);
  const [isLoadingReferences, setIsLoadingReferences] = useState(true);
  const [referenceError, setReferenceError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadReferences() {
      setIsLoadingReferences(true);
      setReferenceError('');

      try {
        const [tourResponse, destinationResponse] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/tour?limit=9999&sortBy=recommended&locale=vi`),
          fetch(`${API_BASE_URL}/search/destinations?locale=vi`),
        ]);

        if (!tourResponse.ok || !destinationResponse.ok) {
          throw new Error('Không thể tải danh sách tour hoặc điểm đến');
        }

        const [tourJson, destinationJson] = await Promise.all([
          tourResponse.json(),
          destinationResponse.json(),
        ]);

        if (ignore) return;

        const nextTourOptions = toArrayPayload<TourReference>(tourJson)
          .map((tour) => ({
            id: tour.id,
            label: tour.name || tour.nameEn || `Tour #${tour.id}`,
            meta: [tour.destination?.name || tour.destination?.nameEn, tour.status]
              .filter(Boolean)
              .join(' · '),
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

        const nextDestinationOptions = toArrayPayload<DestinationReference>(destinationJson)
          .map((destination) => ({
            id: destination.id,
            label: destination.name || destination.nameEn || `Điểm đến #${destination.id}`,
            meta: [destination.region || destination.regionEn, destination.travelScope]
              .filter(Boolean)
              .join(' · '),
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

        setTourOptions(nextTourOptions);
        setDestinationOptions(nextDestinationOptions);
      } catch {
        if (!ignore) {
          setReferenceError('Không tải được danh sách tour/điểm đến. Vui lòng đóng form và thử lại.');
        }
      } finally {
        if (!ignore) setIsLoadingReferences(false);
      }
    }

    void loadReferences();

    return () => {
      ignore = true;
    };
  }, []);

  const set = (key: keyof VoucherFormData, value: VoucherFormData[keyof VoucherFormData]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof VoucherFormData, string>> = {};
    const discountValue = Number(form.discountValue);

    if (!form.code.trim()) nextErrors.code = 'Mã voucher không được để trống';
    else if (!/^[A-Z0-9_-]{3,20}$/i.test(form.code.trim())) {
      nextErrors.code = 'Mã chỉ chứa chữ hoa, số, _ hoặc - (3-20 ký tự)';
    }

    if (!form.label.trim()) nextErrors.label = 'Tên chiến dịch không được để trống';

    if (!form.discountValue || Number.isNaN(discountValue) || discountValue <= 0) {
      nextErrors.discountValue = form.discountType === 'PERCENTAGE'
        ? 'Phần trăm giảm phải từ 1 đến 100'
        : 'Giá trị giảm phải lớn hơn 0';
    } else if (form.discountType === 'PERCENTAGE' && discountValue > 100) {
      nextErrors.discountValue = 'Phần trăm giảm phải từ 1 đến 100';
    }

    if (form.discountType === 'PERCENTAGE' && form.maxDiscountAmount && parseCurrencyInput(String(form.maxDiscountAmount)) < 1) {
      nextErrors.maxDiscountAmount = 'Trần giảm phải lớn hơn 0';
    }

    if (!form.unlimitedUses) {
      const maxUses = Number(form.maxUses);
      if (!form.maxUses || Number.isNaN(maxUses) || maxUses < 1) {
        nextErrors.maxUses = 'Số lượt dùng phải ít nhất là 1';
      }
    }

    if (form.usageLimitPerUser) {
      const limit = Number(form.usageLimitPerUser);
      if (!Number.isInteger(limit) || limit < 1) {
        nextErrors.usageLimitPerUser = 'Giới hạn mỗi khách phải lớn hơn 0';
      }
    }

    if (!form.neverExpires && !form.expiresAt) {
      nextErrors.expiresAt = 'Vui lòng chọn ngày hết hạn';
    } else if (!form.neverExpires && form.expiresAt && new Date(form.expiresAt) <= new Date()) {
      nextErrors.expiresAt = 'Ngày hết hạn phải ở tương lai';
    } else if (!form.neverExpires && form.startsAt && form.expiresAt && new Date(form.startsAt) >= new Date(form.expiresAt)) {
      nextErrors.expiresAt = 'Ngày hết hạn phải sau ngày bắt đầu';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountAmount: form.discountType === 'PERCENTAGE' && form.maxDiscountAmount
        ? parseCurrencyInput(String(form.maxDiscountAmount))
        : null,
      minOrderValue: parseCurrencyInput(String(form.minOrderValue)),
      maxUses: form.unlimitedUses ? null : Number(form.maxUses),
      usageLimitPerUser: form.usageLimitPerUser ? Number(form.usageLimitPerUser) : null,
      startsAt: form.startsAt || null,
      expiresAt: form.neverExpires ? null : form.expiresAt,
      isActive: form.isActive,
      isStackable: form.isStackable,
      eligibleTourIds: parseIdList(form.eligibleTourIds),
      eligibleDestinationIds: parseIdList(form.eligibleDestinationIds),
      eligibleCustomerSegments: form.eligibleCustomerSegments,
    };

    try {
      const response = await fetchWithAuth(
        isEdit && initialData?.id
          ? `${API_BASE_URL}/voucher/admin/${initialData.id}`
          : `${API_BASE_URL}/voucher/admin`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      const json = await response.json();
      const voucherData = json?.data ?? json;

      if (!response.ok) {
        const message = json?.message ?? (isEdit ? 'Lỗi cập nhật voucher' : 'Lỗi tạo voucher');
        throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
      }

      onSuccess(isEdit ? `Đã cập nhật voucher "${voucherData.code}"` : `Tạo voucher "${voucherData.code}" thành công!`);
      onClose();
    } catch (err) {
      setErrors({ code: err instanceof Error ? err.message : 'Lỗi không xác định' });
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass = (key: keyof VoucherFormData) =>
    `w-full bg-surface-container-low border rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none transition-[border-color,box-shadow,background-color] focus-visible:ring-2 focus-visible:ring-primary ${
      errors[key]
        ? 'border-error ring-1 ring-error/30'
        : 'border-outline-variant/15 focus-visible:border-primary'
    }`;

  return {
    form,
    errors,
    isSaving,
    tourOptions,
    destinationOptions,
    isLoadingReferences,
    referenceError,
    todayYMD,
    set,
    handleSubmit,
    fieldClass,
  };
}

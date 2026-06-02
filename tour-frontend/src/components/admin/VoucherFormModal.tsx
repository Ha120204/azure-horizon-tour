'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import DatePickerDropdown from '@/components/search/DatePickerDropdown';

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

interface VoucherInitialData extends Partial<Omit<
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

interface VoucherFormModalProps {
  mode: 'create' | 'edit';
  initialData?: VoucherInitialData;
  onSuccess: (message: string) => void;
  onClose: () => void;
}

interface ReferenceOption {
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

const CUSTOMER_SEGMENT_OPTIONS = [
  { value: 'FIRST_TIME', label: 'Khách mới' },
  { value: 'RETURNING', label: 'Khách quay lại' },
  { value: 'SAVED_TO_WALLET', label: 'Đã lưu ví' },
];

const formatCurrencyInput = (value: string) =>
  value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const parseCurrencyInput = (value: string) => Number(value.replace(/\./g, '')) || 0;

const normalizePercentageInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return String(Math.min(100, Math.max(1, Number(digits))));
};

const parseIdList = (value: string) =>
  Array.from(new Set(value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)));

const formatIdList = (value?: number[] | null) => (value ?? []).join(', ');

const normalizeReferenceSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

const toLocalYMD = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDaysToYMD = (ymd: string, days: number) => {
  if (!ymd) return '';
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toLocalYMD(date);
};

export default function VoucherFormModal({
  mode,
  initialData,
  onSuccess,
  onClose,
}: VoucherFormModalProps) {
  const isEdit = mode === 'edit';
  const initNeverExpires = !initialData?.expiresAt || initialData.expiresAt > NEVER_EXPIRES_THRESHOLD;
  const initUnlimited = !initialData?.maxUses || Number(initialData.maxUses) >= 999_999_999;
  const firstInputRef = useRef<HTMLInputElement>(null);
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
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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

  const codeLocked = isEdit && (initialData?.usedCount ?? 0) > 0;
  const expiresMinDate = form.startsAt ? addDaysToYMD(form.startsAt, 1) : todayYMD;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voucher-form-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">
                {isEdit ? 'edit' : 'local_activity'}
              </span>
            </div>
            <div>
              <h2 id="voucher-form-title" className="font-bold text-on-surface text-base">
                {isEdit ? 'Chỉnh sửa Voucher' : 'Tạo Voucher Mới'}
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {isEdit ? `Đang sửa: ${initialData?.code}` : 'Điền đầy đủ thông tin bên dưới'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="v-code" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Mã Voucher <span className="text-error">*</span>
              </label>
              <input
                id="v-code"
                ref={firstInputRef}
                type="text"
                value={form.code}
                onChange={(event) => set('code', event.target.value.toUpperCase())}
                placeholder="VD: AZURE2026"
                disabled={codeLocked}
                className={fieldClass('code')}
                autoComplete="off"
                maxLength={20}
              />
              {errors.code && <FieldError message={errors.code} />}
              {codeLocked && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">lock</span>
                  Mã đã được dùng, không thể thay đổi
                </p>
              )}
            </div>

            <div>
              <label htmlFor="v-label" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Tên Chiến Dịch <span className="text-error">*</span>
              </label>
              <input
                id="v-label"
                type="text"
                value={form.label}
                onChange={(event) => set('label', event.target.value)}
                placeholder="VD: Early Bird Special"
                className={fieldClass('label')}
                autoComplete="off"
                maxLength={60}
              />
              {errors.label && <FieldError message={errors.label} />}
            </div>
          </div>

          <div>
            <label htmlFor="v-description" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Mô tả điều kiện
            </label>
            <textarea
              id="v-description"
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              placeholder="Áp dụng cho khách đặt tour lần đầu, tối thiểu 2 người, không áp dụng cùng khuyến mãi khác..."
              rows={2}
              className={`${fieldClass('description')} resize-none`}
            />
          </div>

          <section className="bg-surface-container-low/50 rounded-2xl p-4 border border-outline-variant/10">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
              Loại & Giá Trị Giảm
            </p>
            <div className="flex gap-3 mb-4">
              {(['PERCENTAGE', 'FIXED_AMOUNT'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('discountType', type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-[background-color,border-color,color,box-shadow] ${
                    form.discountType === type
                      ? type === 'PERCENTAGE'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-secondary bg-secondary/10 text-secondary'
                      : 'border-outline-variant/15 text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    {type === 'PERCENTAGE' ? 'percent' : 'payments'}
                  </span>
                  {type === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Số tiền cố định (VND)'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="v-discount-value" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  {form.discountType === 'PERCENTAGE' ? 'Phần Trăm Giảm (%)' : 'Số Tiền Giảm (VND)'}
                  <span className="text-error ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    id="v-discount-value"
                    type={form.discountType === 'PERCENTAGE' ? 'number' : 'text'}
                    value={form.discountType === 'PERCENTAGE' ? form.discountValue : formatCurrencyInput(String(form.discountValue))}
                    onChange={(event) => {
                      if (form.discountType === 'PERCENTAGE') {
                        set('discountValue', normalizePercentageInput(event.target.value));
                      } else {
                        set('discountValue', parseCurrencyInput(event.target.value));
                      }
                    }}
                    placeholder={form.discountType === 'PERCENTAGE' ? '20' : '500.000'}
                    min={form.discountType === 'PERCENTAGE' ? 1 : 0}
                    max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                    step={form.discountType === 'PERCENTAGE' ? 1 : undefined}
                    inputMode={form.discountType === 'PERCENTAGE' ? 'numeric' : undefined}
                    className={`${fieldClass('discountValue')} pr-14`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-bold">
                    {form.discountType === 'PERCENTAGE' ? '%' : 'VND'}
                  </span>
                </div>
                {errors.discountValue && <FieldError message={errors.discountValue} />}
              </div>

              <div>
                <label htmlFor="v-min-order" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Đơn Hàng Tối Thiểu (VND)
                </label>
                <input
                  id="v-min-order"
                  type="text"
                  value={form.minOrderValue}
                  onChange={(event) => set('minOrderValue', formatCurrencyInput(event.target.value))}
                  placeholder="0 (không yêu cầu)"
                  className={fieldClass('minOrderValue')}
                />
              </div>
            </div>
          </section>

          <section className="bg-surface-container-low/50 rounded-2xl p-4 border border-outline-variant/10 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Quy tắc nâng cao
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Dùng để giới hạn voucher theo thời gian, khách hàng, tour và điểm đến.
                </p>
              </div>
              <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">rule_settings</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="v-starts-at" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Ngày bắt đầu
                </label>
                <DatePickerDropdown
                  value={form.startsAt}
                  onChange={(value) => set('startsAt', value)}
                  minDate={todayYMD}
                  language="vi"
                  placeholder="dd/mm/yyyy"
                  triggerId="v-starts-at"
                  variant="field"
                  dropdownClassName="w-full"
                />
              </div>

              {form.discountType === 'PERCENTAGE' && (
                <div>
                  <label htmlFor="v-max-discount" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Trần giảm tối đa (VND)
                  </label>
                  <input
                    id="v-max-discount"
                    type="text"
                    value={form.maxDiscountAmount}
                    onChange={(event) => set('maxDiscountAmount', formatCurrencyInput(event.target.value))}
                    placeholder="VD: 500.000"
                    className={fieldClass('maxDiscountAmount')}
                  />
                  {errors.maxDiscountAmount && <FieldError message={errors.maxDiscountAmount} />}
                </div>
              )}

              <div>
                <label htmlFor="v-usage-per-user" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Giới hạn mỗi khách
                </label>
                <input
                  id="v-usage-per-user"
                  type="number"
                  value={form.usageLimitPerUser}
                  onChange={(event) => set('usageLimitPerUser', event.target.value)}
                  placeholder="VD: 1"
                  min={1}
                  className={fieldClass('usageLimitPerUser')}
                />
                {errors.usageLimitPerUser && <FieldError message={errors.usageLimitPerUser} />}
              </div>

              <SwitchField
                label="Cho phép cộng dồn"
                description="Bật nếu mã được dùng cùng ưu đãi khác."
                checked={form.isStackable}
                onChange={() => set('isStackable', !form.isStackable)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReferenceMultiSelect
                id="v-tour-ids"
                label="Tour áp dụng"
                value={form.eligibleTourIds}
                onChange={(value) => set('eligibleTourIds', value)}
                options={tourOptions}
                placeholder="Tìm và chọn tour..."
                hint="Không chọn tour nào = áp dụng cho tất cả tour."
                emptyText="Không tìm thấy tour phù hợp"
                loading={isLoadingReferences}
                error={referenceError}
              />
              <ReferenceMultiSelect
                id="v-destination-ids"
                label="Điểm đến áp dụng"
                value={form.eligibleDestinationIds}
                onChange={(value) => set('eligibleDestinationIds', value)}
                options={destinationOptions}
                placeholder="Tìm và chọn điểm đến..."
                hint="Không chọn điểm đến nào = áp dụng cho tất cả điểm đến."
                emptyText="Không tìm thấy điểm đến phù hợp"
                loading={isLoadingReferences}
                error={referenceError}
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Nhóm khách áp dụng
              </p>
              <div className="flex flex-wrap gap-2">
                {CUSTOMER_SEGMENT_OPTIONS.map((option) => {
                  const selected = form.eligibleCustomerSegments.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => set(
                        'eligibleCustomerSegments',
                        selected
                          ? form.eligibleCustomerSegments.filter((value) => value !== option.value)
                          : [...form.eligibleCustomerSegments, option.value],
                      )}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none ${
                        selected
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                          : 'bg-surface-container-lowest text-on-surface-variant ring-1 ring-outline-variant/15 hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                        {selected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2">Không chọn nhóm nào = tất cả khách hàng.</p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="v-max-uses" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Tổng Lượt Sử Dụng
              </label>
              <div className="space-y-2">
                <SwitchField
                  label="Không giới hạn"
                  checked={form.unlimitedUses}
                  onChange={() => set('unlimitedUses', !form.unlimitedUses)}
                  compact
                />
                {!form.unlimitedUses && (
                  <input
                    id="v-max-uses"
                    type="number"
                    value={form.maxUses}
                    onChange={(event) => set('maxUses', event.target.value)}
                    placeholder="VD: 100"
                    min={1}
                    className={fieldClass('maxUses')}
                  />
                )}
                {errors.maxUses && <FieldError message={errors.maxUses} />}
              </div>
            </div>

            <div>
              <label htmlFor="v-expires" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Ngày Hết Hạn
              </label>
              <div className="space-y-2">
                <SwitchField
                  label="Hiệu lực vĩnh viễn"
                  checked={form.neverExpires}
                  onChange={() => set('neverExpires', !form.neverExpires)}
                  compact
                />
                {!form.neverExpires && (
                  <DatePickerDropdown
                    value={form.expiresAt}
                    onChange={(value) => set('expiresAt', value)}
                    minDate={expiresMinDate}
                    language="vi"
                    placeholder="dd/mm/yyyy"
                    triggerId="v-expires"
                    variant="field"
                    dropdownClassName="w-full"
                  />
                )}
                {errors.expiresAt && <FieldError message={errors.expiresAt} />}
              </div>
            </div>
          </div>

          <SwitchField
            label="Kích hoạt ngay"
            description={form.isActive ? 'Voucher sẽ hiển thị và cho phép sử dụng ngay' : 'Voucher ở trạng thái nháp, chưa có hiệu lực'}
            checked={form.isActive}
            onChange={() => set('isActive', !form.isActive)}
          />
        </div>

        <div className="px-7 py-5 border-t border-outline-variant/10 flex justify-end gap-3 shrink-0 bg-surface-container-lowest/40">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-7 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                Đang lưu…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base" aria-hidden="true">{isEdit ? 'save' : 'add_circle'}</span>
                {isEdit ? 'Lưu Thay Đổi' : 'Tạo Voucher'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="text-error text-xs mt-1 flex items-center gap-1">
      <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
      {message}
    </p>
  );
}

function SwitchField({
  label,
  description,
  checked,
  onChange,
  compact = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/10'}>
      <div>
        <p className={compact ? 'text-sm text-on-surface-variant' : 'text-sm font-semibold text-on-surface'}>{label}</p>
        {description && <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className="relative rounded-full transition-colors shrink-0 ml-4 focus-visible:ring-2 focus-visible:ring-primary outline-none"
        style={{ height: '24px', width: '44px', backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-surface-container-highest)' }}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-[left] duration-200 ${checked ? 'left-[calc(100%-22px)]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

function ReferenceMultiSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  emptyText,
  loading,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReferenceOption[];
  placeholder: string;
  hint: string;
  emptyText: string;
  loading: boolean;
  error: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listboxId = `${id}-listbox`;
  const selectedIds = useMemo(() => parseIdList(value), [value]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOptions = useMemo(
    () => selectedIds.map((selectedId) => options.find((option) => option.id === selectedId) ?? {
      id: selectedId,
      label: `ID #${selectedId}`,
    }),
    [options, selectedIds],
  );
  const normalizedQuery = normalizeReferenceSearch(query);
  const filteredOptions = useMemo(
    () => options
      .filter((option) => {
        if (!normalizedQuery) return true;
        return normalizeReferenceSearch(`${option.label} ${option.meta ?? ''} ${option.id}`).includes(normalizedQuery);
      })
      .slice(0, 80),
    [normalizedQuery, options],
  );

  const syncIds = (ids: number[]) => onChange(formatIdList(ids));
  const toggleOption = (optionId: number) => {
    syncIds(selectedSet.has(optionId)
      ? selectedIds.filter((idValue) => idValue !== optionId)
      : [...selectedIds, optionId]);
  };
  const removeOption = (optionId: number) => syncIds(selectedIds.filter((idValue) => idValue !== optionId));

  return (
    <div className="relative" onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}>
      <label htmlFor={id} className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-2 text-left text-sm text-on-surface outline-none transition-[border-color,box-shadow,background-color] hover:bg-surface-container focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className={`min-w-0 flex-1 truncate ${selectedOptions.length ? 'font-semibold text-on-surface' : 'text-on-surface-variant/55'}`}>
          {selectedOptions.length
            ? `${selectedOptions.length} mục đã chọn`
            : loading ? 'Đang tải danh sách...' : placeholder}
        </span>
        <span className={`material-symbols-outlined shrink-0 text-[18px] text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
          expand_more
        </span>
      </button>

      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span key={option.id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary ring-1 ring-primary/15">
              <span className="truncate">{option.label}</span>
              <button
                type="button"
                onClick={() => removeOption(option.id)}
                className="rounded-full p-0.5 hover:bg-primary/10"
                aria-label={`Bỏ chọn ${option.label}`}
              >
                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">close</span>
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[320] w-full overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl shadow-slate-950/15">
          <div className="border-b border-outline-variant/10 p-2">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant" aria-hidden="true">
                search
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onMouseDown={(event) => event.stopPropagation()}
                placeholder={placeholder}
                className="w-full rounded-xl border border-outline-variant/15 bg-surface-container-low px-9 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              />
              {query && (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">close</span>
                </button>
              )}
            </div>
          </div>

          <div id={listboxId} role="listbox" className="max-h-64 overflow-y-auto p-2">
            {error ? (
              <p className="px-3 py-2 text-xs font-semibold text-error">{error}</p>
            ) : loading ? (
              <p className="px-3 py-2 text-xs font-semibold text-on-surface-variant">Đang tải danh sách...</p>
            ) : filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-xs font-semibold text-on-surface-variant">{emptyText}</p>
            ) : (
              filteredOptions.map((option) => {
                const selected = selectedSet.has(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => toggleOption(option.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      selected ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                      {selected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{option.label}</span>
                      <span className="block truncate text-[11px] text-on-surface-variant">
                        ID {option.id}{option.meta ? ` · ${option.meta}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-on-surface-variant mt-1">{hint}</p>
    </div>
  );
}

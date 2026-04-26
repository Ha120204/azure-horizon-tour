'use client';

import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VoucherFormData {
  id?: number;
  code: string;
  label: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number | string;
  minOrderValue: number | string;
  maxUses: number | string;
  unlimitedUses: boolean;
  expiresAt: string;
  neverExpires: boolean;
  isActive: boolean;
}

interface VoucherFormModalProps {
  mode: 'create' | 'edit';
  initialData?: Partial<VoucherFormData & { computedStatus?: string }>;
  onSuccess: (message: string) => void;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrencyInput = (val: string) =>
  val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const parseCurrencyInput = (val: string) => Number(val.replace(/\./g, '')) || 0;

const toDateInputValue = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const NEVER_EXPIRES_THRESHOLD = '2099-01-01';

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoucherFormModal({
  mode,
  initialData,
  onSuccess,
  onClose,
}: VoucherFormModalProps) {
  const isEdit = mode === 'edit';

  // Detect neverExpires from initialData
  const initNeverExpires = !initialData?.expiresAt || initialData.expiresAt > NEVER_EXPIRES_THRESHOLD;
  const initUnlimited = !initialData?.maxUses || (initialData.maxUses as number) >= 999_999_999;

  const [form, setForm] = useState<VoucherFormData>({
    code: initialData?.code ?? '',
    label: initialData?.label ?? '',
    description: initialData?.description ?? '',
    discountType: initialData?.discountType ?? 'PERCENTAGE',
    discountValue: initialData?.discountValue ?? '',
    minOrderValue: initialData?.minOrderValue
      ? formatCurrencyInput(String(initialData.minOrderValue))
      : '',
    maxUses: initialData?.maxUses && !initUnlimited ? String(initialData.maxUses) : '',
    unlimitedUses: initUnlimited,
    expiresAt: initNeverExpires ? '' : toDateInputValue(initialData?.expiresAt as string),
    neverExpires: initNeverExpires,
    isActive: initialData?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof VoucherFormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus đầu tiên khi mở
  useEffect(() => {
    const t = setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Khoá scroll body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────

  const set = (key: keyof VoucherFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof VoucherFormData, string>> = {};

    if (!form.code.trim()) e.code = 'Mã voucher không được để trống';
    else if (!/^[A-Z0-9_-]{3,20}$/i.test(form.code.trim()))
      e.code = 'Mã chỉ chứa chữ hoa, số, _ hoặc - (3–20 ký tự)';

    if (!form.label.trim()) e.label = 'Tên chiến dịch không được để trống';

    const dv = Number(form.discountValue);
    if (!form.discountValue || isNaN(dv) || dv <= 0) e.discountValue = 'Giá trị giảm phải lớn hơn 0';
    else if (form.discountType === 'PERCENTAGE' && dv > 100) e.discountValue = 'Giảm % không được vượt quá 100';

    if (!form.unlimitedUses) {
      const mu = Number(form.maxUses);
      if (!form.maxUses || isNaN(mu) || mu < 1) e.maxUses = 'Số lượt dùng phải ít nhất là 1';
    }

    if (!form.neverExpires && !form.expiresAt) e.expiresAt = 'Vui lòng chọn ngày hết hạn';
    if (!form.neverExpires && form.expiresAt && new Date(form.expiresAt) <= new Date())
      e.expiresAt = 'Ngày hết hạn phải ở tương lai';

    setErrors(e);
    return Object.keys(e).length === 0;
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
      minOrderValue: parseCurrencyInput(String(form.minOrderValue)),
      maxUses: form.unlimitedUses ? null : Number(form.maxUses),
      expiresAt: form.neverExpires ? null : form.expiresAt,
      isActive: form.isActive,
    };

    try {
      let res: Response;
      if (isEdit && initialData?.id) {
        res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/${initialData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth(`${API_BASE_URL}/voucher/admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      // TransformInterceptor wraps: { statusCode, message, data: Voucher, timestamp }
      const voucherData = json?.data ?? json;

      if (!res.ok) {
        const msg = json?.message ?? (isEdit ? 'Lỗi cập nhật voucher' : 'Lỗi tạo voucher');
        throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
      }

      onSuccess(isEdit ? `Đã cập nhật voucher "${voucherData.code}"` : `Tạo voucher "${voucherData.code}" thành công!`);
      onClose();
    } catch (err: any) {
      setErrors({ code: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Keyboard ────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Field helpers ────────────────────────────────────────────────────────

  const fieldClass = (key: keyof VoucherFormData) =>
    `w-full bg-surface-container-low border rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary ${
      errors[key]
        ? 'border-error ring-1 ring-error/30'
        : 'border-outline-variant/15 focus-visible:border-primary'
    }`;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voucher-form-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">

          {/* ── Mã & Tên chiến dịch ── */}
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
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="VD: AZURE2026"
                disabled={isEdit && (initialData as any)?.usedCount > 0}
                className={fieldClass('code')}
                autoComplete="off"
                maxLength={20}
              />
              {errors.code && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{errors.code}</p>}
              {isEdit && (initialData as any)?.usedCount > 0 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">lock</span>
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
                onChange={(e) => set('label', e.target.value)}
                placeholder="VD: Early Bird Special"
                className={fieldClass('label')}
                autoComplete="off"
                maxLength={60}
              />
              {errors.label && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{errors.label}</p>}
            </div>
          </div>

          {/* ── Mô tả ── */}
          <div>
            <label htmlFor="v-description" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Mô tả Điều Kiện
            </label>
            <textarea
              id="v-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Áp dụng cho khách đặt tour lần đầu, tối thiểu 2 người, không áp dụng cùng khuyến mãi khác..."
              rows={2}
              className={`${fieldClass('description')} resize-none`}
            />
          </div>

          {/* ── Loại & Giá trị giảm ── */}
          <div className="bg-surface-container-low/50 rounded-2xl p-4 border border-outline-variant/10">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
              Loại & Giá Trị Giảm
            </p>
            <div className="flex gap-3 mb-4">
              {(['PERCENTAGE', 'FIXED_AMOUNT'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('discountType', type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
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
                  {type === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Số tiền cố định (₫)'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="v-discount-value" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  {form.discountType === 'PERCENTAGE' ? 'Phần Trăm Giảm (%)' : 'Số Tiền Giảm (₫)'}
                  <span className="text-error ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    id="v-discount-value"
                    type={form.discountType === 'PERCENTAGE' ? 'number' : 'text'}
                    value={
                      form.discountType === 'PERCENTAGE'
                        ? form.discountValue
                        : formatCurrencyInput(String(form.discountValue))
                    }
                    onChange={(e) => {
                      if (form.discountType === 'PERCENTAGE') {
                        set('discountValue', e.target.value);
                      } else {
                        set('discountValue', parseCurrencyInput(e.target.value));
                      }
                    }}
                    placeholder={form.discountType === 'PERCENTAGE' ? '20' : '500.000'}
                    min={0}
                    max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                    className={`${fieldClass('discountValue')} pr-10`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-bold">
                    {form.discountType === 'PERCENTAGE' ? '%' : '₫'}
                  </span>
                </div>
                {errors.discountValue && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{errors.discountValue}</p>}
              </div>

              <div>
                <label htmlFor="v-min-order" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Đơn Hàng Tối Thiểu (₫)
                </label>
                <div className="relative">
                  <input
                    id="v-min-order"
                    type="text"
                    value={form.minOrderValue}
                    onChange={(e) => set('minOrderValue', formatCurrencyInput(e.target.value))}
                    placeholder="0 (không yêu cầu)"
                    className={`${fieldClass('minOrderValue')} pr-6`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">₫</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Giới hạn & Hạn dùng ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Số lượt dùng */}
            <div>
              <label htmlFor="v-max-uses" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Tổng Lượt Sử Dụng
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.unlimitedUses}
                    onClick={() => set('unlimitedUses', !form.unlimitedUses)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors ${form.unlimitedUses ? 'bg-primary' : 'bg-surface-container-highest'}`}
                    style={{ height: '22px', width: '40px' }}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${form.unlimitedUses ? 'left-[calc(100%-18px)]' : 'left-0.5'}`}
                    />
                  </button>
                  <span className="text-sm text-on-surface-variant">Không giới hạn</span>
                </label>
                {!form.unlimitedUses && (
                  <input
                    id="v-max-uses"
                    type="number"
                    value={form.maxUses}
                    onChange={(e) => set('maxUses', e.target.value)}
                    placeholder="VD: 100"
                    min={1}
                    className={fieldClass('maxUses')}
                  />
                )}
                {errors.maxUses && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{errors.maxUses}</p>}
              </div>
            </div>

            {/* Hạn sử dụng */}
            <div>
              <label htmlFor="v-expires" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Ngày Hết Hạn
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.neverExpires}
                    onClick={() => set('neverExpires', !form.neverExpires)}
                    className="relative rounded-full transition-colors"
                    style={{ height: '22px', width: '40px', backgroundColor: form.neverExpires ? 'var(--color-primary)' : 'var(--color-surface-container-highest)' }}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${form.neverExpires ? 'left-[calc(100%-18px)]' : 'left-0.5'}`}
                    />
                  </button>
                  <span className="text-sm text-on-surface-variant">Hiệu lực vĩnh viễn</span>
                </label>
                {!form.neverExpires && (
                  <input
                    id="v-expires"
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => set('expiresAt', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={fieldClass('expiresAt')}
                  />
                )}
                {errors.expiresAt && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{errors.expiresAt}</p>}
              </div>
            </div>
          </div>

          {/* ── Trạng thái Active ── */}
          <div className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/10">
            <div>
              <p className="text-sm font-semibold text-on-surface">Kích hoạt ngay</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {form.isActive ? 'Voucher sẽ hiển thị và cho phép sử dụng ngay' : 'Voucher ở trạng thái nháp, chưa có hiệu lực'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => set('isActive', !form.isActive)}
              className="relative rounded-full transition-colors shrink-0 ml-4 focus-visible:ring-2 focus-visible:ring-primary outline-none"
              style={{ height: '26px', width: '48px', backgroundColor: form.isActive ? 'var(--color-primary)' : 'var(--color-surface-container-highest)' }}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${form.isActive ? 'left-[calc(100%-22px)]' : 'left-0.5'}`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
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

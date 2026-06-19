'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import DatePickerDropdown from '@/components/search/DatePickerDropdown';
import Modal, { ModalBody } from '@/components/ui/Modal';
import IconButton from '@/components/ui/IconButton';
import { UnsavedChangesDialog } from '@/components/admin/UnsavedChangesDialog';
import {
  useVoucherForm,
  addDaysToYMD,
  formatCurrencyInput,
  formatIdList,
  normalizePercentageInput,
  normalizeReferenceSearch,
  parseIdList,
  parseCurrencyInput,
  CUSTOMER_SEGMENT_OPTIONS,
} from '@/app/[locale]/admin/vouchers/_hooks/useVoucherForm';
import type { VoucherFormData, VoucherInitialData, ReferenceOption } from '@/app/[locale]/admin/vouchers/_hooks/useVoucherForm';

export type { VoucherFormData };

interface VoucherFormModalProps {
  mode: 'create' | 'edit';
  initialData?: VoucherInitialData;
  onSuccess: (message: string) => void;
  onClose: () => void;
}

export default function VoucherFormModal({
  mode,
  initialData,
  onSuccess,
  onClose,
}: VoucherFormModalProps) {
  const isEdit = mode === 'edit';
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const {
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
  } = useVoucherForm(mode, initialData, onSuccess, onClose);

  useEffect(() => {
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const codeLocked = isEdit && (initialData?.usedCount ?? 0) > 0;
  const expiresMinDate = form.startsAt ? addDaysToYMD(form.startsAt, 1) : todayYMD;

  const isDirty = isEdit
    ? (form.code !== (initialData?.code ?? '') ||
       form.label !== (initialData?.label ?? '') ||
       form.description !== (initialData?.description ?? ''))
    : Boolean(form.code || form.label || form.description || (form.discountValue !== '' && form.discountValue !== 0));

  const handleClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
      return;
    }
    onClose();
  };

  return (
    <Modal open onClose={handleClose} closeOnBackdrop={false} size="md" labelledBy="voucher-form-title">
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
          <IconButton icon="close" onClick={handleClose} aria-label="Đóng" />
        </div>

        <ModalBody className="px-7 py-6 space-y-6">
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
        </ModalBody>

        <div className="px-7 py-5 border-t border-outline-variant/10 flex justify-end gap-3 shrink-0 bg-surface-container-lowest/40">
          <button
            onClick={handleClose}
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

        {showConfirmClose && (
          <UnsavedChangesDialog
            onContinue={() => setShowConfirmClose(false)}
            onLeave={() => {
              setShowConfirmClose(false);
              onClose();
            }}
          />
        )}
    </Modal>
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

'use client';

import { useState } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { CheckoutSelect, type CheckoutSelectOption } from '@/components/checkout/CheckoutSelect';
import { api } from '@/lib/http/fetchWithAuth';
import {
    getPassengerNameError,
    getPassengerIdentityDocTypes,
    validatePassengerIdentityNo,
    parsePastedPassengers,
    downloadPassengerTemplate,
    type PassengerType,
} from '@/lib/booking/passengerDetails';
import type { BookingPassenger } from '../_lib/types';

type Props = {
    bookingId: number;
    passengers: BookingPassenger[];
    departureDate?: string;
    onClose: () => void;
    onUpdated: () => void;
    /** Endpoint cập nhật — mặc định khách (chủ đơn); admin truyền endpoint điền hộ. */
    endpoint?: string;
};

function toPassengerType(type?: string | null): PassengerType {
    const value = type?.trim().toUpperCase() ?? '';
    if (value.startsWith('CHILD')) return 'Child (4-11)';
    if (value.startsWith('INFANT')) return 'Infant (<4)';
    return 'Adult (12+)';
}

function pad(value: number) {
    return String(value).padStart(2, '0');
}

// Giới hạn ngày sinh theo loại hành khách, tính tại ngày khởi hành để khớp validate backend.
function dobBounds(type: PassengerType, ref: Date) {
    const y = ref.getFullYear();
    const tail = `${pad(ref.getMonth() + 1)}-${pad(ref.getDate())}`;
    if (type === 'Adult (12+)') return { min: `${y - 120}-${tail}`, max: `${y - 12}-${tail}` };
    if (type === 'Child (4-11)') return { min: `${y - 11}-${tail}`, max: `${y - 2}-${tail}` };
    return { min: `${y - 2}-${tail}`, max: `${y}-${tail}` };
}

function getIdentityIcon(value: string) {
    if (value === 'CCCD') return 'badge';
    if (value === 'PASSPORT') return 'id_card';
    if (value === 'BIRTH_CERT') return 'history_edu';
    return 'assignment_ind';
}

export function CompletePassengersModal({ bookingId, passengers, departureDate, onClose, onUpdated, endpoint }: Props) {
    const { t, language } = useLocale();
    const isVietnamese = language === 'vi';
    const referenceDate = departureDate && !Number.isNaN(new Date(departureDate).getTime())
        ? new Date(departureDate)
        : new Date();

    const [draft, setDraft] = useState<BookingPassenger[]>(() => passengers.map(p => ({ ...p })));
    const [errors, setErrors] = useState<Record<number, string>>({});
    const [submitError, setSubmitError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isPasteOpen, setIsPasteOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [pasteInfo, setPasteInfo] = useState('');

    // Cho sửa tất cả hành khách đi cùng (#2 trở đi), kể cả người đã có thông tin.
    // Người đại diện (#1) được giữ nguyên, không sửa ở đây.
    const editableIndexes = passengers
        .map((_, idx) => idx)
        .filter(idx => idx >= 1);

    const update = (index: number, patch: Partial<BookingPassenger>) => {
        setDraft(prev => prev.map((p, idx) => (idx === index ? { ...p, ...patch } : p)));
        setErrors(prev => {
            if (!prev[index]) return prev;
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const applyPaste = () => {
        const rows = parsePastedPassengers(pasteText);
        if (rows.length === 0) {
            setPasteInfo(isVietnamese ? 'Không đọc được dòng nào — hãy copy các hàng từ Excel rồi dán.' : 'No rows detected — copy rows from Excel and paste.');
            return;
        }
        setDraft(prev => prev.map((p, idx) => {
            const pos = editableIndexes.indexOf(idx);
            if (pos < 0 || pos >= rows.length) return p;
            const r = rows[pos];
            return {
                ...p,
                fullName: r.fullName || p.fullName || '',
                dob: r.dob || p.dob || '',
                gender: r.gender || p.gender || '',
                identityType: r.identityType || p.identityType || '',
                identityNo: r.identityNo || p.identityNo || '',
            };
        }));
        setErrors({});
        const filled = Math.min(rows.length, editableIndexes.length);
        const extraNote = rows.length > editableIndexes.length
            ? (isVietnamese ? ` (dán ${rows.length} dòng nhưng chỉ có ${editableIndexes.length} chỗ — đã bỏ phần dư)` : ` (${rows.length} rows pasted, only ${editableIndexes.length} slots — extras ignored)`)
            : '';
        setPasteInfo((isVietnamese ? `Đã điền ${filled} hành khách — vui lòng kiểm tra lại.` : `Filled ${filled} travelers — please review.`) + extraNote);
        setPasteText('');
        setIsPasteOpen(false);
    };

    const genderOptions: CheckoutSelectOption[] = [
        { value: '', label: isVietnamese ? 'Chọn giới tính' : 'Select gender', icon: 'person' },
        { value: 'Male', label: isVietnamese ? 'Nam' : 'Male', icon: 'male' },
        { value: 'Female', label: isVietnamese ? 'Nữ' : 'Female', icon: 'female' },
        { value: 'Other', label: isVietnamese ? 'Khác' : 'Other', icon: 'diversity_1' },
    ];

    const handleSave = async () => {
        const nextErrors: Record<number, string> = {};
        // Cho phép lưu dở dang — chỉ kiểm định dạng các trường đã nhập (không bắt điền đủ).
        for (const idx of editableIndexes) {
            const p = draft[idx];
            const type = toPassengerType(p.type);
            if (p.fullName?.trim()) {
                const nameErr = getPassengerNameError(p.fullName);
                if (nameErr) { nextErrors[idx] = nameErr; continue; }
            }
            if (p.dob?.trim()) {
                const bounds = dobBounds(type, referenceDate);
                if (p.dob < bounds.min || p.dob > bounds.max) {
                    nextErrors[idx] = isVietnamese ? 'Ngày sinh không khớp loại hành khách tại ngày khởi hành.' : 'Date of birth does not match the passenger type at departure.';
                    continue;
                }
            }
            if (p.identityNo?.trim()) {
                const idErr = validatePassengerIdentityNo(p.identityType || 'CCCD', p.identityNo.trim(), t);
                if (idErr) { nextErrors[idx] = idErr; continue; }
            }
        }
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setIsSaving(true);
        setSubmitError('');
        try {
            const result = await api.patch(endpoint ?? `/booking/my/${bookingId}/passengers`, { passengers: draft }, { silent: true });
            if (!result.ok) {
                setSubmitError(result.error || (isVietnamese ? 'Cập nhật không thành công, vui lòng thử lại.' : 'Update failed, please try again.'));
                return;
            }
            onUpdated();
            onClose();
        } catch {
            setSubmitError(isVietnamese ? 'Có lỗi xảy ra, vui lòng thử lại.' : 'Something went wrong, please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
                <div className="flex items-start justify-between gap-4 border-b border-outline-variant/15 p-5 sm:p-6">
                    <div>
                        <h2 className="font-headline text-lg font-extrabold text-on-surface sm:text-xl">
                            {isVietnamese ? 'Bổ sung thông tin hành khách' : 'Complete passenger details'}
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                            {isVietnamese
                                ? 'Vui lòng hoàn tất thông tin cho các hành khách còn thiếu trước ngày khởi hành.'
                                : 'Please complete the details for the remaining travelers before departure.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={isVietnamese ? 'Đóng' : 'Close'}
                        className="shrink-0 rounded-lg p-1.5 text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
                    {/* Dán từ Excel — đổ nhanh thông tin nhiều hành khách */}
                    {editableIndexes.length > 0 && (
                        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/40">
                            <button
                                type="button"
                                onClick={() => setIsPasteOpen(open => !open)}
                                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                            >
                                <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                                    <span className="material-symbols-outlined text-[18px] text-primary">content_paste</span>
                                    {isVietnamese ? 'Dán danh sách từ Excel' : 'Paste list from Excel'}
                                </span>
                                <span className={`material-symbols-outlined text-outline transition-transform duration-200 ${isPasteOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>
                            {isPasteOpen && (
                                <div className="space-y-2 border-t border-outline-variant/15 p-4">
                                    <p className="text-xs leading-relaxed text-on-surface-variant">
                                        {isVietnamese
                                            ? 'Mỗi dòng một hành khách (KHÔNG gồm người đại diện). Thứ tự cột: Họ tên → Ngày sinh (dd/mm/yyyy) → Giới tính → [Loại giấy tờ] → [Số giấy tờ].'
                                            : 'One traveler per line (excluding the lead traveler). Column order: Full name → DOB (dd/mm/yyyy) → Gender → [ID type] → [ID number].'}
                                    </p>
                                    <p className="text-[11px] leading-relaxed text-on-surface-variant/70">
                                        {isVietnamese
                                            ? 'Copy thẳng các ô từ Excel rồi dán — các cột tự tách bằng Tab, không cần gõ tay. Nếu gõ tay, ngăn cách các cột bằng dấu phẩy ","'
                                            : 'Copy cells straight from Excel and paste — columns split by Tab automatically. If typing manually, separate columns with a comma ","'}
                                    </p>
                                    <textarea
                                        value={pasteText}
                                        onChange={e => setPasteText(e.target.value)}
                                        rows={4}
                                        placeholder={'Nguyễn Văn A, 01/02/1990, Nam, CCCD, 012345678901'}
                                        className="w-full rounded-lg border border-outline-variant/30 bg-white p-3 font-mono text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                    />
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={downloadPassengerTemplate}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                        >
                                            <span className="material-symbols-outlined text-[15px]">download</span>
                                            {isVietnamese ? 'Tải file mẫu' : 'Download template'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={applyPaste}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">playlist_add</span>
                                            {isVietnamese ? 'Điền vào danh sách' : 'Fill the list'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {pasteInfo && (
                        <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                            <span className="material-symbols-outlined text-[15px]">check_circle</span>
                            {pasteInfo}
                        </p>
                    )}

                    {editableIndexes.map(idx => {
                        const p = draft[idx];
                        const type = toPassengerType(p.type);
                        const bounds = dobBounds(type, referenceDate);
                        const typeLabel = type === 'Child (4-11)'
                            ? (isVietnamese ? 'Trẻ em' : 'Child')
                            : type === 'Infant (<4)'
                                ? (isVietnamese ? 'Em bé' : 'Infant')
                                : (isVietnamese ? 'Người lớn' : 'Adult');
                        const identityOptions: CheckoutSelectOption[] = getPassengerIdentityDocTypes(type, t).map(opt => ({
                            ...opt,
                            icon: getIdentityIcon(opt.value),
                        }));
                        return (
                            <div key={idx} className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/40 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">{idx + 1}</span>
                                    <span className="text-sm font-bold text-on-surface">
                                        {isVietnamese ? `Hành khách ${idx + 1}` : `Passenger ${idx + 1}`}
                                    </span>
                                    <span className="rounded-md border border-outline-variant/30 bg-white px-2 py-0.5 text-[11px] font-bold text-on-surface-variant">{typeLabel}</span>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                                            {isVietnamese ? 'Họ và tên' : 'Full name'} <span className="text-error">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={p.fullName ?? ''}
                                            onChange={e => update(idx, { fullName: e.target.value })}
                                            className="w-full rounded-lg border border-outline-variant/30 bg-white p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                            placeholder={isVietnamese ? 'Nguyễn Văn A' : 'Full name'}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                                            {isVietnamese ? 'Ngày sinh' : 'Date of birth'} <span className="text-error">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={p.dob ?? ''}
                                            min={bounds.min}
                                            max={bounds.max}
                                            onChange={e => update(idx, { dob: e.target.value })}
                                            className="w-full rounded-lg border border-outline-variant/30 bg-white p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                                            {isVietnamese ? 'Giới tính' : 'Gender'} <span className="text-error">*</span>
                                        </label>
                                        <CheckoutSelect
                                            ariaLabel={isVietnamese ? `Chọn giới tính cho hành khách ${idx + 1}` : `Select gender for passenger ${idx + 1}`}
                                            value={p.gender ?? ''}
                                            options={genderOptions}
                                            onChange={value => update(idx, { gender: value })}
                                            buttonClassName="!min-h-[44px] !border-outline-variant/30 !p-3 !shadow-none focus-visible:!ring-1"
                                            menuClassName="max-w-none"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                                            {isVietnamese ? 'Giấy tờ tuỳ thân (không bắt buộc)' : 'Identity document (optional)'}
                                        </label>
                                        <div className="flex gap-2">
                                            <CheckoutSelect
                                                className="w-36 shrink-0"
                                                menuClassName="w-56 max-w-none"
                                                ariaLabel={isVietnamese ? `Chọn loại giấy tờ cho hành khách ${idx + 1}` : `Select document type for passenger ${idx + 1}`}
                                                value={p.identityType || identityOptions[0]?.value || ''}
                                                options={identityOptions}
                                                onChange={value => update(idx, { identityType: value, identityNo: '' })}
                                                buttonClassName="!min-h-[44px] !border-outline-variant/30 !p-3 !shadow-none focus-visible:!ring-1"
                                            />
                                            <input
                                                type="text"
                                                value={p.identityNo ?? ''}
                                                onChange={e => update(idx, { identityNo: e.target.value })}
                                                className="min-w-0 flex-1 rounded-lg border border-outline-variant/30 bg-white p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder={isVietnamese ? 'Số giấy tờ' : 'Document number'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {errors[idx] && (
                                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-error">
                                        <span className="material-symbols-outlined text-[14px]">error</span>
                                        {errors[idx]}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="border-t border-outline-variant/15 p-5 sm:p-6">
                    {submitError && (
                        <p className="mb-3 flex items-center gap-1 text-sm font-medium text-error">
                            <span className="material-symbols-outlined text-[16px]">error</span>
                            {submitError}
                        </p>
                    )}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-11 rounded-xl px-5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
                        >
                            {isVietnamese ? 'Huỷ' : 'Cancel'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-md transition-colors hover:bg-primary-container disabled:opacity-60"
                        >
                            {isSaving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                            {isVietnamese ? 'Lưu thông tin' : 'Save details'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

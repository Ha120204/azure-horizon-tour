'use client';

import { useEffect, useState } from 'react';
import {
    getPassengerAgeLabel,
    getPassengerIdentityDocTypes,
    validatePassengerIdentityNo,
    type PassengerType,
} from '@/lib/booking/passengerDetails';
import { CheckoutSelect } from './CheckoutSelect';

interface Passenger {
    type: PassengerType;
    fullName: string;
    dob: string;
    gender: string;
    identityType: string;  // 'CCCD' | 'PASSPORT' | 'BIRTH_CERT'
    identityNo: string;
}

interface LeadTraveler {
    fullName: string;
    dob: string;
    gender: string;
    identityType: string;
    identityNo: string;
    notes: string;
}

interface PassengerSectionProps {
    leadTraveler: LeadTraveler;
    setLeadTraveler: React.Dispatch<React.SetStateAction<LeadTraveler>>;
    passengers: Passenger[];
    activeFormType: PassengerType | null;
    tempFormData: { fullName: string; dob: string; gender: string; identityType: string; identityNo: string };
    setTempFormData: React.Dispatch<React.SetStateAction<{ fullName: string; dob: string; gender: string; identityType: string; identityNo: string }>>;
    onOpenForm: (type: PassengerType | null) => void;
    onSavePassenger: () => void;
    onEditPassenger: (index: number) => void;
    onRemovePassenger: (index: number) => void;
    editingPassengerIndex: number | null;
    t: (key: string) => string;
    /** Số ghế tối đa còn lại (availableSeats của departure/tour). Infant (<4) không tính ghế. */
    maxPassengers?: number;
    /**
     * Thành phần đoàn đã chốt ở trang chi tiết tour (slot tạo sẵn).
     * Khi true: ẩn nút thêm/bớt loại hành khách, khách chỉ điền thông tin từng slot.
     */
    lockComposition?: boolean;
    /** Hoãn điền thông tin các khách còn lại (chỉ người đại diện là bắt buộc). */
    deferPassengers?: boolean;
    onToggleDefer?: (checked: boolean) => void;
    /** Sát ngày khởi hành → ẩn lựa chọn hoãn, buộc điền đủ ngay. */
    disableDefer?: boolean;
    /** Đoàn đông → cho khách nhờ nhân viên nhập hộ. */
    showStaffAssist?: boolean;
    staffAssist?: boolean;
    onToggleStaffAssist?: (checked: boolean) => void;
    /** Lưu một lần toàn bộ hành khách đi cùng (modal gộp). */
    onUpdateAllPassengers?: (list: Passenger[]) => void;
    /**
     * Ngày khởi hành (ISO string). Dùng làm mốc tính tuổi chính xác.
     * Nếu không có, fallback về ngày hiện tại.
     */
    departureDate?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Tính tuổi tại một mốc thời gian cụ thể.
 * @param dob Ngày sinh (YYYY-MM-DD)
 * @param referenceDate Mốc tính tuổi — mặc định là ngày hiện tại,
 *   nên truyền vào ngày khởi hành để tính đúng nhóm giá.
 */
function calcAge(dob: string, referenceDate?: Date): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const ref = referenceDate ?? new Date();
    let age = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
    return age;
}

function getAgeError(type: PassengerType, dob: string, referenceDate?: Date): string | null {
    if (!dob) return null;
    const age = calcAge(dob, referenceDate);
    if (age === null) return 'Ngày sinh không hợp lệ.';
    if (age < 0) return 'Ngày sinh không được là ngày trong tương lai.';
    if (type === 'Adult (12+)' && age < 12) return `Người lớn phải từ 12 tuổi trở lên tại ngày khởi hành. Tuổi lúc đi: ${age} tuổi.`;
    if (type === 'Child (4-11)' && (age < 4 || age > 11)) return `Trẻ em phải từ 4–11 tuổi tại ngày khởi hành. Tuổi lúc đi: ${age} tuổi.`;
    if (type === 'Infant (<4)' && age >= 4) return `Em bé phải dưới 4 tuổi tại ngày khởi hành. Tuổi lúc đi: ${age} tuổi.`;
    return null;
}

/**
 * Ngày sinh tối thiểu hợp lệ theo loại hành khách, tính tại referenceDate.
 * referenceDate nên là ngày khởi hành để date-picker giới hạn đúng.
 */
function getMinDate(type: PassengerType, referenceDate?: Date): string {
    const ref = referenceDate ?? new Date();
    const y = ref.getFullYear();
    const mm = String(ref.getMonth() + 1).padStart(2, '0');
    const dd = String(ref.getDate()).padStart(2, '0');
    if (type === 'Adult (12+)') {
        return `${y - 120}-${mm}-${dd}`;
    }
    if (type === 'Child (4-11)') {
        return `${y - 11}-${mm}-${dd}`;
    }
    // Infant
    return `${y - 3}-${mm}-${dd}`;
}

function getMaxDate(type: PassengerType, referenceDate?: Date): string {
    const ref = referenceDate ?? new Date();
    const y = ref.getFullYear();
    const mm = String(ref.getMonth() + 1).padStart(2, '0');
    const dd = String(ref.getDate()).padStart(2, '0');
    if (type === 'Adult (12+)') {
        // Phải >= 12 tuổi tại ngày khởi hành → max DOB = referenceDate - 12 năm
        return `${y - 12}-${mm}-${dd}`;
    }
    if (type === 'Child (4-11)') {
        // 4 đến 11 tuổi tại ngày khởi hành → max DOB = referenceDate - 4 năm
        return `${y - 4}-${mm}-${dd}`;
    }
    // Infant <4 tại ngày khởi hành → max DOB = referenceDate
    return `${y}-${mm}-${dd}`;
}

// Name validator: at least 2 words, no numbers/special chars
function getNameError(name: string): string | null {
    if (!name.trim()) return null;
    if (name.trim().split(/\s+/).length < 2) return 'Vui lòng nhập đầy đủ họ và tên (ít nhất 2 từ).';
    if (/[0-9!@#$%^&*()_+=[\]{};':"\\|,.<>/?]/.test(name)) return 'Họ tên không được chứa số hoặc ký tự đặc biệt.';
    return null;
}

export default function PassengerSection({
    leadTraveler,
    setLeadTraveler,
    passengers,
    activeFormType,
    tempFormData,
    setTempFormData,
    onOpenForm,
    onSavePassenger,
    onEditPassenger,
    onRemovePassenger,
    editingPassengerIndex,
    t,
    maxPassengers,
    departureDate,
    lockComposition = false,
    deferPassengers = false,
    onToggleDefer,
    disableDefer = false,
    showStaffAssist = false,
    staffAssist = false,
    onToggleStaffAssist,
    onUpdateAllPassengers,
}: PassengerSectionProps) {
    // Hoãn tự làm HOẶC nhờ nhân viên → đều chưa cần điền thông tin các khách đi cùng.
    const isDeferred = deferPassengers || staffAssist;
    const deferredLabel = staffAssist ? t('checkout.staffAssistBadge') : t('checkout.deferLater');
    const isEditingPassenger = editingPassengerIndex !== null;
    const [isAllModalOpen, setIsAllModalOpen] = useState(false);
    const [draft, setDraft] = useState<Passenger[]>([]);
    const [draftErrors, setDraftErrors] = useState<Record<number, { fullName?: string; dob?: string; identityNo?: string }>>({});

    // Mốc tính tuổi = ngày khởi hành (nếu có), fallback về today.
    // Việc dùng ngày khởi hành đảm bảo trẻ 11 tuổi hôm nay nhưng 12 tuổi ngày đi
    // được tính đúng là Adult, không bị charge sai giá Child.
    const referenceDate: Date = (() => {
        if (!departureDate) return new Date();
        const d = new Date(departureDate);
        return isNaN(d.getTime()) ? new Date() : d;
    })();

    // ── Seat capacity logic ──────────────────────────────────────────────────────
    // Infant (<4) không chiếm ghế theo chuẩn du lịch (ngồi lòng người lớn)
    const seatConsumingPassengers = passengers.filter(p => p.type !== 'Infant (<4)');
    // Lead traveler luôn chiếm 1 ghế
    const seatsTaken = 1 + seatConsumingPassengers.length;
    const seatsLeft = maxPassengers !== undefined ? maxPassengers - seatsTaken : Infinity;
    const isSeatFull = seatsLeft <= 0;
    // Infant không giới hạn theo ghế, nhưng tối đa bằng số người lớn (nghiệp vụ thực tế)
    const adultCount = 1 + passengers.filter(p => p.type === 'Adult (12+)').length;
    const infantCount = passengers.filter(p => p.type === 'Infant (<4)').length;
    const isInfantFull = infantCount >= adultCount;
    // Local validation errors — only "required" errors shown on save attempt
    const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; dob?: string }>({});

    // Khoá cuộn nền khi modal nhập thông tin đang mở.
    useEffect(() => {
        if (!activeFormType && !isAllModalOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [activeFormType, isAllModalOpen]);

    const openAllModal = () => {
        setDraft(passengers.map(passenger => ({ ...passenger })));
        setDraftErrors({});
        setIsAllModalOpen(true);
    };

    const updateDraft = (index: number, patch: Partial<Passenger>) => {
        setDraft(prev => prev.map((passenger, idx) => (idx === index ? { ...passenger, ...patch } : passenger)));
        setDraftErrors(prev => {
            if (!prev[index]) return prev;
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const handleSaveAll = () => {
        const errors: Record<number, { fullName?: string; dob?: string; identityNo?: string }> = {};
        draft.forEach((passenger, idx) => {
            const type = passenger.type as PassengerType;
            const fieldError: { fullName?: string; dob?: string; identityNo?: string } = {};
            // Cho phép lưu dở dang — chỉ kiểm định dạng các trường đã nhập.
            if (passenger.fullName) {
                const nameErr = getNameError(passenger.fullName);
                if (nameErr) fieldError.fullName = nameErr;
            }
            if (passenger.dob) {
                const ageErr = getAgeError(type, passenger.dob, referenceDate);
                if (ageErr) fieldError.dob = ageErr;
            }
            if (passenger.identityNo) {
                const idErr = validateIdentityNo(passenger.identityType || 'CCCD', passenger.identityNo);
                if (idErr) fieldError.identityNo = idErr;
            }
            if (Object.keys(fieldError).length > 0) errors[idx] = fieldError;
        });
        if (Object.keys(errors).length > 0) {
            setDraftErrors(errors);
            return;
        }
        onUpdateAllPassengers?.(draft);
        setIsAllModalOpen(false);
    };

    // Identity document validation
    function getIdentityDocTypes(type: PassengerType) {
        return getPassengerIdentityDocTypes(type, t);
    }

    function validateIdentityNo(idType: string, idNo: string): string | null {
        return validatePassengerIdentityNo(idType, idNo, t);
    }

    // Computed errors — shown in real-time as user types (same pattern as ContactInfoForm)
    const leadNameError = getNameError(leadTraveler.fullName);
    // Người đại diện luôn là người lớn (Adult 12+) → validate tuổi theo loại đó tại ngày khởi hành.
    const leadDobError = leadTraveler.dob ? getAgeError('Adult (12+)', leadTraveler.dob, referenceDate) : null;
    const leadIdentityError = validateIdentityNo(leadTraveler.identityType || 'CCCD', leadTraveler.identityNo);
    const tempNameError = tempFormData.fullName ? getNameError(tempFormData.fullName) : null;
    const tempIdentityError = validateIdentityNo(
        tempFormData.identityType || (activeFormType === 'Infant (<4)' ? 'BIRTH_CERT' : 'CCCD'),
        tempFormData.identityNo || ''
    );

    // Trigger validation on save attempt
    const handleValidatedSave = () => {
        const ageErr = activeFormType ? getAgeError(activeFormType, tempFormData.dob, referenceDate) : null;
        const errors: { fullName?: string; dob?: string } = {};
        if (!tempFormData.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên.';
        if (!tempFormData.dob) errors.dob = 'Vui lòng chọn ngày sinh.';
        else if (ageErr) errors.dob = ageErr;
        if (Object.keys(errors).length > 0 || tempNameError || tempIdentityError) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        onSavePassenger();
    };

    const handleOpenForm = (type: PassengerType | null) => {
        setFieldErrors({});
        onOpenForm(type);
    };

    const handleEditPassenger = (index: number) => {
        setFieldErrors({});
        onEditPassenger(index);
    };

    const ageLabel = (p: Passenger) => {
        return getPassengerAgeLabel(p.dob, t('checkout.yearsOld'));
    };
    const genderOptions = [
        { value: '', label: t('checkout.selectGender'), icon: 'person' },
        { value: 'Male', label: t('checkout.male'), icon: 'male' },
        { value: 'Female', label: t('checkout.female'), icon: 'female' },
        { value: 'Other', label: t('checkout.other'), icon: 'diversity_1' },
    ];
    const leadIdentityOptions = [
        { value: 'CCCD', label: t('checkout.citizenId'), icon: 'badge' },
        { value: 'PASSPORT', label: t('checkout.passport'), icon: 'id_card' },
    ];

    return (
        <section className="bg-white rounded-xl p-6 md:p-8 ambient-shadow ghost-border">
            <div className="flex items-center gap-4 mb-6 md:mb-8">
                <span className="material-symbols-outlined text-primary text-3xl">group</span>
                <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight">{t('checkout.passengerInfoTitle')}</h2>
            </div>

            <div className="space-y-8">
                {/* Lead Traveler */}
                <div className="bg-surface-container-low/50 p-5 md:p-6 rounded-xl border border-outline-variant/20">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
                        <h3 className="font-headline font-semibold text-base md:text-lg text-primary">{t('checkout.leadTraveler')}</h3>
                        <span className="bg-tertiary-container text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest w-max shadow-sm">{t('checkout.required')}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                            <input
                                className={`w-full bg-white border rounded-lg p-3 md:p-4 focus:ring-1 outline-none shadow-sm ${leadNameError ? 'border-error/60 bg-error/5 focus:ring-error' : 'border-outline-variant/20 focus:ring-primary'}`}
                                type="text"
                                placeholder={t('checkout.enterFullName')}
                                value={leadTraveler.fullName}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, fullName: e.target.value })}
                            />
                            {leadNameError && (
                                <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">error</span>
                                    {leadNameError}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.dob')} <span className="text-error">*</span></label>
                            <input
                                className={`w-full bg-white border rounded-lg p-3 md:p-4 focus:ring-1 outline-none shadow-sm ${leadDobError ? 'border-error/60 bg-error/5 focus:ring-error' : 'border-outline-variant/20 focus:ring-primary'}`}
                                type="date"
                                value={leadTraveler.dob}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, dob: e.target.value })}
                            />
                            {leadDobError && (
                                <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">error</span>
                                    {leadDobError}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.gender')} <span className="text-error">*</span></label>
                            <CheckoutSelect
                                ariaLabel={t('checkout.gender')}
                                value={leadTraveler.gender}
                                options={genderOptions}
                                onChange={(value) => setLeadTraveler({ ...leadTraveler, gender: value })}
                            />
                        </div>

                        {/* Identity Document (Lead Traveler — Required) */}
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                                {t('checkout.identityDocument')} <span className="text-error">*</span>
                            </label>
                            <div className="flex gap-2">
                                <CheckoutSelect
                                    className="w-36 flex-shrink-0"
                                    menuClassName="right-auto w-56"
                                    ariaLabel={t('checkout.identityDocument')}
                                    value={leadTraveler.identityType || 'CCCD'}
                                    options={leadIdentityOptions}
                                    onChange={(value) => setLeadTraveler({ ...leadTraveler, identityType: value, identityNo: '' })}
                                />
                                <input
                                    className={`min-w-0 flex-1 bg-white border rounded-lg p-3 md:p-4 focus:ring-1 outline-none shadow-sm ${leadIdentityError ? 'border-error/60 bg-error/5 focus:ring-error' : 'border-outline-variant/20 focus:ring-primary'}`}
                                    type="text"
                                    placeholder={(leadTraveler.identityType || 'CCCD') === 'CCCD' ? t('checkout.enterCitizenId') : t('checkout.enterPassport')}
                                    value={leadTraveler.identityNo || ''}
                                    maxLength={(leadTraveler.identityType || 'CCCD') === 'CCCD' ? 12 : 15}
                                    onChange={(e) => {
                                        const v = (leadTraveler.identityType || 'CCCD') === 'CCCD'
                                            ? e.target.value.replace(/\D/g, '')
                                            : e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                                        setLeadTraveler({ ...leadTraveler, identityNo: v });
                                    }}
                                />
                            </div>
                            {leadIdentityError && (
                                <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">error</span>
                                    {leadIdentityError}
                                </p>
                            )}
                            {leadTraveler.identityNo && !leadIdentityError && (
                                <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>{t('checkout.valid')}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">{t('checkout.specialReq')}</label>
                            <p className="mb-2 text-[11px] leading-relaxed text-on-surface-variant/70">{t('checkout.specialReqHint')}</p>
                            <textarea
                                className="w-full bg-white border border-outline-variant/20 rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm resize-none"
                                placeholder={t('checkout.specialReqPlaceholder')}
                                rows={2}
                                value={leadTraveler.notes}
                                onChange={(e) => setLeadTraveler({ ...leadTraveler, notes: e.target.value })}
                            ></textarea>
                            <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-relaxed text-on-surface-variant/60">
                                <span className="material-symbols-outlined text-[13px] mt-px">info</span>
                                {t('checkout.specialReqNote')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tùy chọn hoãn / nhờ nhân viên cho các khách đi cùng */}
                {lockComposition && passengers.length > 0 && (
                    <div className="space-y-2">
                        {/* Đoàn đông → cho khách nhờ nhân viên nhập hộ */}
                        {showStaffAssist && onToggleStaffAssist && (
                            <label className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={staffAssist}
                                    onChange={(e) => onToggleStaffAssist(e.target.checked)}
                                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                                />
                                <span className="min-w-0">
                                    <span className="block font-semibold text-sm text-on-surface">{t('checkout.staffAssistTitle')}</span>
                                    <span className="block text-xs text-on-surface-variant mt-0.5 leading-relaxed">{t('checkout.staffAssistDesc')}</span>
                                </span>
                            </label>
                        )}

                        {staffAssist ? (
                            <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
                                <span className="material-symbols-outlined shrink-0 text-primary">support_agent</span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold text-primary">{t('checkout.staffAssistNoticeTitle')}</span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-variant">{t('checkout.staffAssistNoticeDesc')}</span>
                                </span>
                            </div>
                        ) : (
                            <>
                                {/* Tự bổ sung sau — ẩn khi sát ngày khởi hành */}
                                {onToggleDefer && !disableDefer && (
                                    <label className="flex items-start gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 p-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={deferPassengers}
                                            onChange={(e) => onToggleDefer(e.target.checked)}
                                            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                                        />
                                        <span className="min-w-0">
                                            <span className="block font-semibold text-sm text-on-surface">{t('checkout.deferPassengersTitle')}</span>
                                            <span className="block text-xs text-on-surface-variant mt-0.5 leading-relaxed">{t('checkout.deferPassengersDesc')}</span>
                                        </span>
                                    </label>
                                )}

                                {/* Sát ngày đi mà không có lựa chọn nhờ nhân viên → buộc điền đủ */}
                                {onToggleDefer && disableDefer && !showStaffAssist && (
                                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                        <span className="material-symbols-outlined shrink-0 text-amber-600">schedule</span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-bold text-amber-800">{t('checkout.deferDisabledTitle')}</span>
                                            <span className="mt-0.5 block text-xs leading-relaxed text-amber-700">{t('checkout.deferDisabledDesc')}</span>
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Added Passengers List */}
                {passengers.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-bold text-sm text-on-surface-variant">{lockComposition ? t('checkout.otherPassengers') : t('checkout.addedPassengers')}</h4>
                        {passengers.map((p, idx) => {
                            const editing = editingPassengerIndex === idx;
                            const incomplete = !p.fullName;
                            const inner = (
                                <>
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                            editing ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                                        }`}>
                                            <span className="text-sm font-extrabold">{idx + 2}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <p className={`truncate font-bold ${p.fullName ? 'text-on-surface' : 'text-outline italic'}`}>{p.fullName || (isDeferred ? deferredLabel : t('checkout.passengerNeedsInfo'))}</p>
                                                {editing && (
                                                    <span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary sm:inline-flex">
                                                        {t('checkout.editingPassenger')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-xs font-medium text-outline">
                                                {t(p.type === 'Adult (12+)' ? 'checkout.adult' : p.type === 'Child (4-11)' ? 'checkout.child' : 'checkout.infant')}
                                                {p.dob && <>{' '}•{' '}{ageLabel(p)}{' '}•{' '}{p.dob}</>}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            );
                            return (
                                <div
                                    key={idx}
                                    className={`flex items-stretch gap-1 overflow-hidden rounded-xl border shadow-sm transition-all ${
                                        editing
                                            ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                                            : 'border-primary/20 bg-white hover:border-primary/40'
                                    }`}
                                >
                                    {isDeferred ? (
                                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4">
                                            {inner}
                                            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                                {deferredLabel}
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => lockComposition ? openAllModal() : handleEditPassenger(idx)}
                                            aria-label={`${incomplete ? t('checkout.fillInfo') : t('checkout.edit')} — ${t('checkout.otherPassengers')} ${idx + 2}`}
                                            className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-primary/5"
                                        >
                                            {inner}
                                            <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-bold ${incomplete ? 'text-primary' : 'text-on-surface-variant'}`}>
                                                <span className="material-symbols-outlined text-[18px]">{incomplete ? 'edit_note' : 'edit'}</span>
                                                <span className="hidden sm:inline">{incomplete ? t('checkout.fillInfo') : t('checkout.edit')}</span>
                                            </span>
                                        </button>
                                    )}
                                    {!lockComposition && !isDeferred && (
                                        <button
                                            type="button"
                                            onClick={() => onRemovePassenger(idx)}
                                            aria-label={`${t('checkout.deletePassenger')} ${p.fullName}`}
                                            title={t('checkout.deletePassenger')}
                                            className="flex shrink-0 items-center px-3 text-error transition-colors hover:bg-error/10"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add Passenger Buttons + Form */}
                <div className={lockComposition ? 'space-y-4' : 'space-y-4 pt-4 border-t border-outline-variant/20'}>
                    {/* Header: tiêu đề + seat counter badge */}
                    {!lockComposition && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="font-headline font-bold text-lg">
                            {isEditingPassenger ? t('checkout.editPassenger') : t('checkout.addPassenger')}
                        </h3>
                        {maxPassengers !== undefined && !isEditingPassenger && (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                                isSeatFull
                                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                                    : seatsLeft === 1
                                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            }`}>
                                <span className="material-symbols-outlined text-[14px]">
                                    {isSeatFull ? 'event_seat' : 'airline_seat_recline_normal'}
                                </span>
                                {isSeatFull
                                    ? `Đã đặt đủ ${maxPassengers} ghế`
                                    : `Còn ${seatsLeft} ghế trống`
                                }
                            </div>
                        )}
                    </div>
                    )}

                    {/* Banner cảnh báo khi đầy ghế */}
                    {isSeatFull && !isEditingPassenger && !lockComposition && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5 flex-shrink-0">info</span>
                            <div>
                                <p className="font-semibold text-amber-800 text-sm">
                                    Đã đạt giới hạn số ghế
                                </p>
                                <p className="text-amber-700 text-xs mt-0.5">
                                    Tour này chỉ còn <strong>{maxPassengers} ghế</strong> và bạn đã đặt đủ.
                                    Hãy xoá bớt hành khách nếu muốn đổi thành phần đoàn.
                                    {` `}Em bé (&lt;4 tuổi) không tính ghế.
                                </p>
                            </div>
                        </div>
                    )}

                    {!isEditingPassenger && !lockComposition && (
                        <div className="grid grid-cols-3 gap-2 md:gap-4">
                            {(['Adult (12+)', 'Child (4-11)', 'Infant (<4)'] as PassengerType[]).map((type) => {
                                const isActive = activeFormType === type;
                                const icon = type.includes('Child') ? 'child_care' : type.includes('Infant') ? 'baby_changing_station' : 'person';
                                const translatedType = type === 'Adult (12+)' ? t('checkout.adult') : type === 'Child (4-11)' ? t('checkout.child') : t('checkout.infant');
                                const ageRange = type === 'Adult (12+)' ? '12+' : type === 'Child (4-11)' ? '4–11' : '<4';

                                // Infant không tính ghế nhưng không được vượt quá số người lớn
                                const isDisabled = type === 'Infant (<4)' ? isInfantFull : isSeatFull;

                                // Tooltip giải thích khi bị disabled
                                const disabledReason = type === 'Infant (<4)'
                                    ? (isInfantFull ? `Tối đa ${adultCount} em bé (= số người lớn)` : '')
                                    : (isSeatFull ? 'Đã hết ghế trống' : '');

                                return (
                                    <div key={type} className="relative group">
                                        <button
                                            type="button"
                                            disabled={isDisabled && !isActive}
                                            onClick={() => {
                                                if (isDisabled && !isActive) return;
                                                handleOpenForm(isActive ? null : type);
                                            }}
                                            aria-disabled={isDisabled && !isActive}
                                            className={`relative flex w-full min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none md:p-4 ${
                                                isDisabled && !isActive
                                                    ? 'border-outline-variant/20 bg-surface-container-low/50 cursor-not-allowed opacity-50'
                                                    : isActive
                                                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                                                    : 'border-outline-variant/30 bg-white hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10'
                                            }`}
                                        >
                                            {isActive && (
                                                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/20">
                                                    <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                                                </div>
                                            )}
                                            {isDisabled && !isActive && (
                                                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
                                                    <span className="material-symbols-outlined text-[12px]">block</span>
                                                </div>
                                            )}
                                            <span className={`material-symbols-outlined transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 motion-reduce:transform-none ${
                                                isDisabled && !isActive ? 'text-outline-variant' : isActive ? 'text-primary' : 'text-on-surface-variant'
                                            }`}>{icon}</span>
                                            <span className={`text-[10px] md:text-xs font-bold uppercase tracking-tight ${
                                                isDisabled && !isActive ? 'text-outline-variant' : isActive ? 'text-primary' : 'text-on-surface-variant'
                                            }`}>{translatedType}</span>
                                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                                                isDisabled && !isActive ? 'bg-slate-100 text-slate-400' : isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                                            }`}>{ageRange} {t('checkout.yearsOld')}</span>
                                        </button>
                                        {/* Tooltip giải thích khi disabled */}
                                        {isDisabled && !isActive && disabledReason && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[160px] bg-gray-800 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg z-10
                                                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center leading-relaxed">
                                                {disabledReason}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeFormType && (
                        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
                            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
                                <div className="flex items-start justify-between gap-4 border-b border-outline-variant/15 px-6 py-4">
                                    <h4 className="font-headline font-bold text-lg text-primary">
                                        {isEditingPassenger ? t('checkout.editPassenger') : t('checkout.enterInfoFor')} {activeFormType === 'Adult (12+)' ? t('checkout.adult') : activeFormType === 'Child (4-11)' ? t('checkout.child') : t('checkout.infant')}
                                        <span className="ml-2 text-sm font-normal text-on-surface-variant">
                                            ({activeFormType === 'Adult (12+)' ? '>=12' : activeFormType === 'Child (4-11)' ? '4-11' : '<4'} {t('checkout.yearsOld')})
                                        </span>
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenForm(null)}
                                        aria-label={t('checkout.cancel')}
                                        className="shrink-0 rounded-lg p-1.5 text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 py-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                                {/* Full Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.fullName')} <span className="text-error">*</span></label>
                                    <input
                                        className={`w-full bg-white border rounded-lg p-3 md:p-4 focus:ring-1 outline-none shadow-sm ${(fieldErrors.fullName || tempNameError) ? 'border-error/60 bg-error/5 focus:ring-error' : 'border-outline-variant/20 focus:ring-primary'}`}
                                        placeholder={t('checkout.enterFullName')}
                                        type="text"
                                        value={tempFormData.fullName}
                                        onChange={(e) => {
                                            setTempFormData({ ...tempFormData, fullName: e.target.value });
                                            if (fieldErrors.fullName) setFieldErrors(prev => ({ ...prev, fullName: undefined }));
                                        }}
                                    />
                                    {(fieldErrors.fullName || tempNameError) && (
                                        <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrors.fullName || tempNameError}
                                        </p>
                                    )}
                                </div>

                                {/* Date of Birth */}
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.dob')} <span className="text-error">*</span></label>
                                    <input
                                        className={`w-full bg-white border rounded-lg p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none shadow-sm ${fieldErrors.dob ? 'border-error/60 bg-error/5' : 'border-outline-variant/20'}`}
                                        type="date"
                                        min={getMinDate(activeFormType, referenceDate)}
                                        max={getMaxDate(activeFormType, referenceDate)}
                                        value={tempFormData.dob}
                                        onChange={(e) => {
                                            setTempFormData({ ...tempFormData, dob: e.target.value });
                                            if (fieldErrors.dob) setFieldErrors(prev => ({ ...prev, dob: undefined }));
                                        }}
                                        onBlur={(e) => {
                                            const err = getAgeError(activeFormType, e.target.value, referenceDate);
                                            if (err) setFieldErrors(prev => ({ ...prev, dob: err }));
                                        }}
                                    />
                                    {/* Hiển thị tuổi real-time tại ngày khởi hành */}
                                    {tempFormData.dob && !fieldErrors.dob && (() => {
                                        const age = calcAge(tempFormData.dob, referenceDate);
                                        return age !== null ? (
                                            <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                {age} {t('checkout.yearsOld')} lúc khởi hành
                                            </p>
                                        ) : null;
                                    })()}
                                    {fieldErrors.dob && (
                                        <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrors.dob}
                                        </p>
                                    )}
                                    {!tempFormData.dob && (
                                        <p className="mt-1.5 text-[11px] text-primary/70 font-medium italic">
                                            {activeFormType === 'Child (4-11)' ? t('checkout.age4to11') : activeFormType === 'Infant (<4)' ? t('checkout.under4') : t('checkout.over12')}
                                        </p>
                                    )}
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t('checkout.gender')} <span className="text-error">*</span></label>
                                    <CheckoutSelect
                                        ariaLabel={t('checkout.gender')}
                                        value={tempFormData.gender}
                                        options={genderOptions}
                                        onChange={(value) => setTempFormData({ ...tempFormData, gender: value })}
                                    />
                                </div>

                                {/* Identity Document (Passenger — Optional) */}
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                                        {t('checkout.identityDocumentOptional')}
                                        <span className="ml-2 normal-case text-[10px] font-normal text-on-surface-variant/60 bg-surface-container px-1.5 py-0.5 rounded">
                                            {t('checkout.identityOptionalNote')}
                                        </span>
                                    </label>
                                    <div className="flex gap-2">
                                        <CheckoutSelect
                                            className="w-36 flex-shrink-0"
                                            menuClassName="right-auto w-64"
                                            ariaLabel={t('checkout.identityDocumentOptional')}
                                            value={tempFormData.identityType || (activeFormType === 'Infant (<4)' ? 'BIRTH_CERT' : 'CCCD')}
                                            options={(activeFormType ? getIdentityDocTypes(activeFormType) : []).map(opt => ({
                                                value: opt.value,
                                                label: opt.label,
                                                icon: opt.value === 'CCCD' ? 'badge' : opt.value === 'PASSPORT' ? 'id_card' : 'history_edu',
                                            }))}
                                            onChange={(value) => setTempFormData({ ...tempFormData, identityType: value, identityNo: '' })}
                                        />
                                        <input
                                            className={`min-w-0 flex-1 bg-white border rounded-lg p-3 md:p-4 focus:ring-1 outline-none shadow-sm ${
                                                tempIdentityError ? 'border-error/60 bg-error/5 focus:ring-error' : 'border-outline-variant/20 focus:ring-primary'
                                            }`}
                                            type="text"
                                            placeholder={
                                                (tempFormData.identityType || 'CCCD') === 'CCCD' ? t('checkout.enterCitizenId')
                                                : (tempFormData.identityType || 'CCCD') === 'PASSPORT' ? t('checkout.enterPassport')
                                                : t('checkout.enterBirthCertificate')
                                            }
                                            value={tempFormData.identityNo || ''}
                                            maxLength={(tempFormData.identityType || 'CCCD') === 'CCCD' ? 12 : 20}
                                            onChange={(e) => {
                                                const idType = tempFormData.identityType || 'CCCD';
                                                const v = idType === 'CCCD'
                                                    ? e.target.value.replace(/\D/g, '')
                                                    : idType === 'PASSPORT'
                                                        ? e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
                                                        : e.target.value;
                                                setTempFormData({ ...tempFormData, identityNo: v });
                                            }}
                                        />
                                    </div>
                                    {tempIdentityError && (
                                        <p className="mt-1.5 text-xs text-error font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {tempIdentityError}
                                        </p>
                                    )}
                                    {tempFormData.identityNo && !tempIdentityError && (
                                        <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">check_circle</span>{t('checkout.valid')}
                                        </p>
                                    )}
                                </div>
                            </div>
                                </div>
                                <div className="flex justify-end gap-3 border-t border-outline-variant/15 px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenForm(null)}
                                        className="min-h-[44px] rounded-full px-6 py-3 text-sm font-bold text-outline transition-[transform,background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-surface-container hover:text-on-surface hover:shadow-sm active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
                                    >
                                        {t('checkout.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleValidatedSave}
                                        className="group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
                                    >
                                        {isEditingPassenger ? t('checkout.updatePassenger') : t('checkout.savePassenger')}
                                        <span className="material-symbols-outlined text-[18px] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 motion-reduce:transform-none">
                                            person_add
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal gộp: điền tất cả hành khách đi cùng một lần ── */}
            {isAllModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
                    <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
                        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/15 px-6 py-4">
                            <div>
                                <h4 className="font-headline font-bold text-lg text-primary">{t('checkout.passengerInfoTitle')}</h4>
                                <p className="mt-0.5 text-xs text-on-surface-variant">{t('checkout.fillAllTravelers')}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAllModalOpen(false)}
                                aria-label={t('checkout.cancel')}
                                className="shrink-0 rounded-lg p-1.5 text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                            {draft.map((passenger, idx) => {
                                const type = passenger.type as PassengerType;
                                const typeLabel = type === 'Adult (12+)' ? t('checkout.adult') : type === 'Child (4-11)' ? t('checkout.child') : t('checkout.infant');
                                const ageRange = type === 'Adult (12+)' ? '>=12' : type === 'Child (4-11)' ? '4-11' : '<4';
                                const rowErr = draftErrors[idx] ?? {};
                                const age = passenger.dob ? calcAge(passenger.dob, referenceDate) : null;
                                return (
                                    <div key={idx} className="rounded-2xl border border-outline-variant/20 p-4 sm:p-5">
                                        <div className="mb-3 flex items-center gap-2.5">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">{idx + 2}</span>
                                            <span className="text-sm font-bold text-on-surface">{typeLabel}</span>
                                            <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">{ageRange} {t('checkout.yearsOld')}</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                                            <div className="md:col-span-2">
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">{t('checkout.fullName')} <span className="text-error">*</span></label>
                                                <input
                                                    type="text"
                                                    value={passenger.fullName}
                                                    placeholder={t('checkout.enterFullName')}
                                                    onChange={(e) => updateDraft(idx, { fullName: e.target.value })}
                                                    className={`w-full rounded-lg border bg-white p-3 text-sm shadow-sm outline-none focus:ring-1 ${rowErr.fullName ? 'border-error/60 bg-error/5 focus:ring-error' : 'border-outline-variant/20 focus:ring-primary'}`}
                                                />
                                                {rowErr.fullName && <p className="mt-1 text-xs font-medium text-error">{rowErr.fullName}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">{t('checkout.dob')} <span className="text-error">*</span></label>
                                                <input
                                                    type="date"
                                                    value={passenger.dob}
                                                    min={getMinDate(type, referenceDate)}
                                                    max={getMaxDate(type, referenceDate)}
                                                    onChange={(e) => updateDraft(idx, { dob: e.target.value })}
                                                    className={`w-full rounded-lg border bg-white p-3 text-sm shadow-sm outline-none focus:ring-1 ${rowErr.dob ? 'border-error/60 bg-error/5 focus:ring-error' : 'border-outline-variant/20 focus:ring-primary'}`}
                                                />
                                                {rowErr.dob ? (
                                                    <p className="mt-1 text-xs font-medium text-error">{rowErr.dob}</p>
                                                ) : age !== null ? (
                                                    <p className="mt-1 text-[11px] font-semibold text-emerald-600">{age} {t('checkout.yearsOld')}</p>
                                                ) : null}
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">{t('checkout.gender')} <span className="text-error">*</span></label>
                                                <CheckoutSelect
                                                    ariaLabel={t('checkout.gender')}
                                                    value={passenger.gender}
                                                    options={genderOptions}
                                                    onChange={(value) => updateDraft(idx, { gender: value })}
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                    {t('checkout.identityDocumentOptional')}
                                                </label>
                                                <div className="flex gap-2">
                                                    <CheckoutSelect
                                                        className="w-36 flex-shrink-0"
                                                        menuClassName="w-64"
                                                        ariaLabel={t('checkout.identityDocumentOptional')}
                                                        value={passenger.identityType || (type === 'Infant (<4)' ? 'BIRTH_CERT' : 'CCCD')}
                                                        options={getIdentityDocTypes(type).map(opt => ({
                                                            value: opt.value,
                                                            label: opt.label,
                                                            icon: opt.value === 'CCCD' ? 'badge' : opt.value === 'PASSPORT' ? 'id_card' : 'history_edu',
                                                        }))}
                                                        onChange={(value) => updateDraft(idx, { identityType: value, identityNo: '' })}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={passenger.identityNo || ''}
                                                        placeholder={(passenger.identityType || 'CCCD') === 'CCCD' ? t('checkout.enterCitizenId') : (passenger.identityType || 'CCCD') === 'PASSPORT' ? t('checkout.enterPassport') : t('checkout.enterBirthCertificate')}
                                                        maxLength={(passenger.identityType || 'CCCD') === 'CCCD' ? 12 : 20}
                                                        onChange={(e) => {
                                                            const idType = passenger.identityType || 'CCCD';
                                                            const v = idType === 'CCCD'
                                                                ? e.target.value.replace(/\D/g, '')
                                                                : idType === 'PASSPORT'
                                                                    ? e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
                                                                    : e.target.value;
                                                            updateDraft(idx, { identityNo: v });
                                                        }}
                                                        className={`min-w-0 flex-1 rounded-lg border bg-white p-3 text-sm shadow-sm outline-none focus:ring-1 ${rowErr.identityNo ? 'border-error/60 bg-error/5 focus:ring-error' : 'border-outline-variant/20 focus:ring-primary'}`}
                                                    />
                                                </div>
                                                {rowErr.identityNo && <p className="mt-1 text-xs font-medium text-error">{rowErr.identityNo}</p>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-outline-variant/15 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setIsAllModalOpen(false)}
                                className="min-h-[44px] rounded-full px-6 py-3 text-sm font-bold text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
                            >
                                {t('checkout.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAll}
                                className="group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-container"
                            >
                                {t('checkout.confirmPassengers')}
                                <span className="material-symbols-outlined text-[18px]">group_add</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

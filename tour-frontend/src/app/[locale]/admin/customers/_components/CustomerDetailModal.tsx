import Image from 'next/image';
import { useAccessibleDialog } from '../../staffs/_hooks/useAccessibleDialog';
import { bookingStatusStyle, statusConfig } from '../_lib/config';
import { formatCurrency, formatDate, formatRelativeDate, getAvatarGradient, getInitials } from '../_lib/helpers';
import type { CustomerEditForm, User } from '../_lib/types';
import { CustomerSelect, type CustomerSelectOption } from './CustomerSelect';
import { DetailInfoCard } from './DetailInfoCard';

const GENDER_OPTIONS: CustomerSelectOption[] = [
    { value: '', label: 'Chưa cập nhật', description: 'Chưa có thông tin giới tính', icon: 'wc' },
    { value: 'Nam', label: 'Nam', icon: 'male' },
    { value: 'Nữ', label: 'Nữ', icon: 'female' },
    { value: 'Khác', label: 'Khác', icon: 'diversity_3' },
];

function digitsOnly(value: string) {
    return value.replace(/\D/g, '');
}

interface CustomerDetailModalProps {
    user: User | null;
    isLoading: boolean;
    isEditing: boolean;
    editForm: CustomerEditForm;
    isSaving: boolean;
    canManage: boolean;
    onClose: () => void;
    onStartEditing: (user: User) => void;
    onCancelEditing: () => void;
    onEditFormChange: (patch: Partial<CustomerEditForm>) => void;
    onSaveInfo: () => void;
    onToggleStatus: (user: User) => void;
}

export function CustomerDetailModal({
    user,
    isLoading,
    isEditing,
    editForm,
    isSaving,
    canManage,
    onClose,
    onStartEditing,
    onCancelEditing,
    onEditFormChange,
    onSaveInfo,
    onToggleStatus,
}: CustomerDetailModalProps) {
    const dialogRef = useAccessibleDialog({ onClose, canClose: !isSaving });

    return (
        <div
            ref={dialogRef}
            data-accessible-dialog="true"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-detail-title"
        >
            <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" onClick={isSaving ? undefined : onClose} />

            <section className="relative flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-2xl animate-fade-slide-up">
                {isLoading && !user ? (
                    <div className="flex min-h-[420px] items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-primary animate-spin" aria-hidden="true">progress_activity</span>
                    </div>
                ) : user ? (
                    <>
                        <CustomerDetailHeader
                            user={user}
                            isEditing={isEditing}
                            canManage={canManage}
                            onStartEditing={onStartEditing}
                            onCancelEditing={onCancelEditing}
                            onClose={onClose}
                        />

                        <div className="flex-1 overflow-y-auto px-5 py-5">
                            {!isEditing ? (
                                <CustomerReadonlyPanel user={user} canManage={canManage} onToggleStatus={onToggleStatus} />
                            ) : (
                                <CustomerEditPanel
                                    user={user}
                                    editForm={editForm}
                                    isSaving={isSaving}
                                    onCancelEditing={onCancelEditing}
                                    onEditFormChange={onEditFormChange}
                                    onSaveInfo={onSaveInfo}
                                />
                            )}
                        </div>
                    </>
                ) : null}
            </section>
        </div>
    );
}

function CustomerDetailHeader({
    user,
    isEditing,
    canManage,
    onStartEditing,
    onCancelEditing,
    onClose,
}: {
    user: User;
    isEditing: boolean;
    canManage: boolean;
    onStartEditing: (user: User) => void;
    onCancelEditing: () => void;
    onClose: () => void;
}) {
    const status = statusConfig[user.status] || statusConfig.Active;
    const isActive = user.status === 'Active';

    return (
        <div className="border-b border-outline-variant/15 bg-surface-container-lowest px-5 py-4">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Hồ sơ khách hàng</p>
                    <h2 id="customer-detail-title" className="mt-1 truncate text-xl font-bold text-on-surface">
                        {user.fullName || 'Chưa cập nhật'}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {!isEditing && canManage ? (
                        <button
                            type="button"
                            onClick={() => onStartEditing(user)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant/20 px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">edit</span>
                            Sửa
                        </button>
                    ) : isEditing ? (
                        <button
                            type="button"
                            onClick={onCancelEditing}
                            className="inline-flex h-9 items-center rounded-lg border border-outline-variant/20 px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            Hủy sửa
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="Đóng chi tiết khách hàng"
                    >
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                    <Image
                        src={user.avatarUrl}
                        alt={user.fullName || 'Avatar khách hàng'}
                        width={72}
                        height={72}
                        sizes="72px"
                        className={`h-[72px] w-[72px] shrink-0 rounded-full object-cover ring-2 ring-outline-variant/15 ${user.status === 'Deactivated' ? 'grayscale' : ''}`}
                    />
                ) : (
                    <div className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(user.id)} text-xl font-bold text-white shadow-sm`}>
                        {getInitials(user.fullName)}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface" title={user.email}>{user.email}</p>
                    <p className="mt-1 text-sm text-on-surface-variant">{user.phone || 'Chưa cập nhật SĐT'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${status.bg} ${status.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {status.label}
                        </span>
                        <span className="rounded-lg bg-surface-container px-2.5 py-1 font-mono text-[11px] font-semibold text-on-surface-variant">
                            ID #{user.id}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CustomerReadonlyPanel({ user, canManage, onToggleStatus }: { user: User; canManage: boolean; onToggleStatus: (user: User) => void }) {
    return (
        <div className="space-y-5">
            <CustomerActivityStats user={user} />
            <CustomerProfileInfo user={user} />
            <CustomerRecentBookings user={user} />
            {canManage && <CustomerQuickActions user={user} onToggleStatus={onToggleStatus} />}
        </div>
    );
}

function CustomerProfileInfo({ user }: { user: User }) {
    return (
        <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <span className="material-symbols-outlined text-[17px] text-primary" aria-hidden="true">account_box</span>
                Thông tin cá nhân
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailInfoCard icon="badge" label="Họ và tên" value={user.fullName || '—'} />
                <DetailInfoCard icon="call" label="Điện thoại" value={user.phone || '—'} />
                <DetailInfoCard icon="cake" label="Ngày sinh" value={user.dob ? formatDate(user.dob) : '—'} />
                <DetailInfoCard icon="wc" label="Giới tính" value={user.gender || '—'} />
                <DetailInfoCard icon="calendar_month" label="Ngày tham gia" value={formatDate(user.createdAt)} />
                {user.deletedAt && (
                    <DetailInfoCard icon="event_busy" label="Bị khóa vào ngày" value={formatDate(user.deletedAt)} isWarning />
                )}
            </div>
        </section>
    );
}

function CustomerRecentBookings({ user }: { user: User }) {
    return (
        <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <span className="material-symbols-outlined text-[17px] text-primary" aria-hidden="true">receipt_long</span>
                Booking gần đây
            </h3>
            {user.recentBookings && user.recentBookings.length > 0 ? (
                <div className="space-y-2.5">
                    {user.recentBookings.map(booking => {
                        const status = bookingStatusStyle[booking.status] || { bg: 'bg-surface-container', text: 'text-on-surface-variant', label: booking.status };
                        return (
                            <div key={booking.id} className="rounded-lg border border-outline-variant/15 bg-surface-container-lowest p-3 transition-colors hover:bg-surface-container-low">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-on-surface">{booking.tour.name}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                                            <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-on-surface">{booking.bookingCode.substring(0, 14)}</span>
                                            <span>{formatDate(booking.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${status.bg} ${status.text}`}>
                                            {status.label}
                                        </span>
                                        <p className="mt-1.5 text-sm font-bold text-primary">{formatCurrency(booking.totalPrice)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low/30 py-7 text-center">
                    <span className="material-symbols-outlined mb-2 text-3xl text-outline" aria-hidden="true">luggage</span>
                    <p className="text-sm font-semibold text-on-surface-variant">Chưa có dữ liệu đặt tour</p>
                </div>
            )}
        </section>
    );
}

function CustomerActivityStats({ user }: { user: User }) {
    const totalSpent = user.totalSpent ?? user.recentBookings?.reduce((sum, booking) => sum + booking.totalPrice, 0) ?? 0;
    const lastBookingAt = user.lastBookingAt ?? user.recentBookings?.[0]?.createdAt ?? null;

    return (
        <section className="grid grid-cols-2 gap-3">
            <MetricCard icon="luggage" label="Đơn đặt" value={user.bookingCount.toLocaleString('vi-VN')} />
            <MetricCard icon="rate_review" label="Đánh giá" value={user.reviewCount.toLocaleString('vi-VN')} />
            <MetricCard icon="payments" label="Chi tiêu" value={totalSpent > 0 ? formatCurrency(totalSpent) : '—'} />
            <MetricCard icon="history" label="Đặt gần nhất" value={lastBookingAt ? formatRelativeDate(lastBookingAt) : '—'} />
        </section>
    );
}

function MetricCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="rounded-lg border border-outline-variant/15 bg-surface-container-low p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{icon}</span>
                {label}
            </div>
            <p className="truncate text-base font-bold text-on-surface" title={value}>{value}</p>
        </div>
    );
}

function CustomerQuickActions({ user, onToggleStatus }: { user: User; onToggleStatus: (user: User) => void }) {
    const isActive = user.status === 'Active';

    return (
        <section className="rounded-lg border border-outline-variant/15 bg-surface-container-low p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">settings</span>
                Thao tác nhanh
            </h3>
            <button
                type="button"
                onClick={() => onToggleStatus(user)}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                    isActive
                        ? 'border-red-500/20 bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-500'
                        : 'border-emerald-500/20 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-500'
                }`}
            >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    {isActive ? 'block' : 'lock_open'}
                </span>
                {isActive ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
            </button>
        </section>
    );
}

function CustomerEditPanel({
    user,
    editForm,
    isSaving,
    onCancelEditing,
    onEditFormChange,
    onSaveInfo,
}: {
    user: User;
    editForm: CustomerEditForm;
    isSaving: boolean;
    onCancelEditing: () => void;
    onEditFormChange: (patch: Partial<CustomerEditForm>) => void;
    onSaveInfo: () => void;
}) {
    return (
        <section className="space-y-5">
            <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-on-surface">
                    <span className="material-symbols-outlined text-[21px] text-primary" aria-hidden="true">manage_accounts</span>
                    Chỉnh sửa thông tin cơ bản
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">ID #{user.id}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-lg border border-outline-variant/15 bg-surface-container-low p-4 sm:grid-cols-2">
                <CustomerTextField
                    id="edit-fullname"
                    icon="person"
                    label="Họ và tên"
                    type="text"
                    value={editForm.fullName}
                    placeholder="Nhập họ và tên..."
                    onChange={value => onEditFormChange({ fullName: value })}
                />
                <CustomerTextField
                    id="edit-phone"
                    icon="call"
                    label="Số điện thoại"
                    type="tel"
                    value={editForm.phone}
                    placeholder="Nhập số điện thoại..."
                    onChange={value => onEditFormChange({ phone: digitsOnly(value) })}
                    inputMode="numeric"
                    maxLength={11}
                />

                <div className="space-y-2">
                    <span className="block text-sm font-bold text-on-surface-variant">Giới tính</span>
                    <CustomerSelect
                        value={editForm.gender}
                        options={GENDER_OPTIONS}
                        onChange={value => onEditFormChange({ gender: value })}
                        ariaLabel="Chọn giới tính khách hàng"
                        active={Boolean(editForm.gender)}
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="edit-dob" className="block text-sm font-bold text-on-surface-variant">Ngày sinh</label>
                    <input
                        id="edit-dob"
                        type="date"
                        value={editForm.dob}
                        onChange={event => onEditFormChange({ dob: event.target.value })}
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    />
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancelEditing}
                    className="rounded-lg px-4 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    Hủy bỏ
                </button>
                <button
                    type="button"
                    onClick={onSaveInfo}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60"
                >
                    {isSaving ? (
                        <>
                            <span className="material-symbols-outlined text-[18px] animate-spin" aria-hidden="true">progress_activity</span>
                            Đang lưu...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>
                            Lưu thay đổi
                        </>
                    )}
                </button>
            </div>
        </section>
    );
}

function CustomerTextField({
    id,
    icon,
    label,
    type,
    value,
    placeholder,
    onChange,
    inputMode,
    maxLength,
}: {
    id: string;
    icon: string;
    label: string;
    type: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
    inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
    maxLength?: number;
}) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm font-bold text-on-surface-variant">{label}</label>
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline" aria-hidden="true">{icon}</span>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={event => onChange(event.target.value)}
                    inputMode={inputMode}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/45 focus-visible:ring-2 focus-visible:ring-primary"
                />
            </div>
        </div>
    );
}

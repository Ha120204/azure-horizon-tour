'use client';

import Image from 'next/image';
import { roleConfig, statusConfig } from '../_lib/config';
import { formatDate, getInitials } from '../_lib/helpers';
import type { StaffEditForm, User } from '../_lib/types';
import { StaffSelect } from './StaffSelect';
import { useAccessibleDialog } from '../_hooks/useAccessibleDialog';

const genderOptions = [
    { value: '', label: 'Chọn giới tính' },
    { value: 'Nam', label: 'Nam' },
    { value: 'Nữ', label: 'Nữ' },
    { value: 'Khác', label: 'Khác' },
];

interface StaffDetailModalProps {
    user: User | null;
    isLoading: boolean;
    isEditing: boolean;
    editForm: StaffEditForm;
    isSaving: boolean;
    canEditRoles: boolean;
    onClose: () => void;
    onStartEditing: (user: User) => void;
    onCancelEditing: () => void;
    onEditFormChange: (patch: Partial<StaffEditForm>) => void;
    onSaveInfo: () => void;
    onChangeRole: (user: User) => void;
    onToggleStatus: (user: User) => void;
}

export function StaffDetailModal({
    user,
    isLoading,
    isEditing,
    editForm,
    isSaving,
    canEditRoles,
    onClose,
    onStartEditing,
    onCancelEditing,
    onEditFormChange,
    onSaveInfo,
    onChangeRole,
    onToggleStatus,
}: StaffDetailModalProps) {
    const isDirty = isEditing && !!user && (
        editForm.fullName !== (user.fullName ?? '') ||
        editForm.phone !== (user.phone ?? '') ||
        editForm.gender !== (user.gender ?? '') ||
        editForm.dob !== (user.dob ?? '')
    );

    const handleClose = () => {
        if (isDirty && !window.confirm('Bạn có chắc muốn thoát? Dữ liệu đã nhập sẽ bị mất.')) return;
        onClose();
    };

    const dialogRef = useAccessibleDialog({ onClose: handleClose, canClose: !isSaving });

    return (
        <div
            ref={dialogRef}
            data-accessible-dialog="true"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            aria-describedby={user ? 'detail-description' : undefined}
            aria-busy={isLoading || isSaving}
            onMouseDown={event => {
                if (event.target === event.currentTarget && !isSaving) handleClose();
            }}
        >
            <div className="pointer-events-none absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

            <div className="relative flex max-h-[calc(100dvh-0.75rem)] w-full max-w-4xl flex-col overflow-hidden overscroll-contain rounded-t-3xl bg-surface-container-lowest shadow-2xl animate-fade-slide-up sm:max-h-[90vh] sm:rounded-3xl">
                {isLoading && !user ? (
                    <div className="flex items-center justify-center py-32">
                        <h2 id="detail-title" className="sr-only">Đang tải chi tiết tài khoản</h2>
                        <span className="material-symbols-outlined text-5xl text-primary animate-spin" aria-hidden="true">progress_activity</span>
                        <span className="sr-only" role="status">Đang tải chi tiết tài khoản…</span>
                    </div>
                ) : user && (
                    <>
                        <StaffDetailHero
                            user={user}
                            isEditing={isEditing}
                            onStartEditing={onStartEditing}
                            onCancelEditing={onCancelEditing}
                            onClose={handleClose}
                            canClose={!isSaving}
                        />
                        {!isEditing && <StaffDetailStats user={user} />}
                        <div className={`flex-1 overflow-y-auto ${isEditing ? 'px-4 py-5 sm:px-8 sm:py-7 lg:px-10' : 'space-y-6 px-4 py-5 sm:px-8 sm:py-6'}`}>
                            {isEditing ? (
                                <StaffEditPanel
                                    user={user}
                                    editForm={editForm}
                                    isSaving={isSaving}
                                    onEditFormChange={onEditFormChange}
                                    onCancelEditing={onCancelEditing}
                                    onSaveInfo={onSaveInfo}
                                />
                            ) : (
                                <StaffReadonlyPanel
                                    user={user}
                                    canEditRoles={canEditRoles}
                                    onStartEditing={onStartEditing}
                                    onChangeRole={onChangeRole}
                                    onToggleStatus={onToggleStatus}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

interface StaffDetailHeroProps {
    user: User;
    isEditing: boolean;
    onStartEditing: (user: User) => void;
    onCancelEditing: () => void;
    onClose: () => void;
    canClose: boolean;
}

function StaffDetailHero({ user, isEditing, onStartEditing, onCancelEditing, onClose, canClose }: StaffDetailHeroProps) {
    const role = roleConfig[user.role] || roleConfig.CUSTOMER;
    const status = statusConfig[user.status] || statusConfig.Active;
    const heroContentClass = isEditing
        ? 'relative z-[1] flex items-center gap-4 px-5 py-5 pr-28 text-left sm:px-8 sm:py-6'
        : 'relative z-[1] px-4 pb-12 pt-6 text-center sm:px-8 sm:pb-14 sm:pt-8';
    const avatarImageClass = isEditing
        ? 'h-14 w-14 flex-shrink-0 rounded-2xl object-cover ring-4 ring-white/25 shadow-lg sm:h-16 sm:w-16'
        : 'h-20 w-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg mx-auto';
    const avatarFallbackClass = isEditing
        ? 'h-14 w-14 flex-shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl ring-4 ring-white/20 shadow-lg sm:h-16 sm:w-16'
        : 'w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/20 shadow-lg mx-auto';
    const titleClass = isEditing
        ? 'font-headline text-lg font-bold text-white sm:text-xl'
        : 'font-headline text-xl font-bold text-white mt-4';
    const badgeRowClass = isEditing
        ? 'mt-2 flex flex-wrap items-center gap-2'
        : 'flex items-center justify-center gap-2 mt-3';

    return (
        <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px, 40px 40px' }} />

            <div className="absolute right-3 top-3 z-10 flex gap-2 sm:right-4 sm:top-4">
                {!isEditing ? (
                    <button
                        type="button"
                        onClick={() => onStartEditing(user)}
                        aria-label="Sửa thông tin tài khoản"
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        title="Sửa thông tin"
                    >
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onCancelEditing}
                        className="px-4 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        Hủy sửa
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={!canClose}
                    aria-label="Đóng chi tiết tài khoản"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    title="Đóng"
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
                </button>
            </div>

            <div className={heroContentClass}>
                {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={user.fullName || ''} width={80} height={80} sizes="80px" className={avatarImageClass} />
                ) : (
                    <div className={avatarFallbackClass}>
                        {getInitials(user.fullName)}
                    </div>
                )}
                <div className="min-w-0">
                    <h2 id="detail-title" className={titleClass}>
                        {user.fullName || 'Chưa cập nhật'}
                    </h2>
                    <p id="detail-description" className="mt-1 truncate text-sm text-white/70">{user.email}</p>

                    <div className={badgeRowClass}>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-sm text-white">
                            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{role.icon}</span>
                            {role.label}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${user.status === 'Active'
                            ? 'bg-emerald-400/20 text-emerald-200'
                            : 'bg-red-400/20 text-red-200'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                            {status.label}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StaffDetailStats({ user }: { user: User }) {
    return (
        <div className="relative z-[2] -mt-7 px-3 sm:px-8">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-2.5 text-center shadow-md sm:p-4">
                    <span className="material-symbols-outlined text-amber-500 text-xl mb-1 block" aria-hidden="true">star</span>
                    <p className="text-xl font-bold text-on-surface sm:text-2xl">{user.reviewCount ?? 0}</p>
                    <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Đánh giá</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-2.5 text-center shadow-md sm:p-4">
                    <span className="material-symbols-outlined text-violet-500 text-xl mb-1 block" aria-hidden="true">calendar_month</span>
                    <p className="text-xs font-bold text-on-surface sm:text-sm">{formatDate(user.createdAt)}</p>
                    <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Ngày tạo</p>
                </div>
            </div>
        </div>
    );
}

interface StaffEditPanelProps {
    user: User;
    editForm: StaffEditForm;
    isSaving: boolean;
    onEditFormChange: (patch: Partial<StaffEditForm>) => void;
    onCancelEditing: () => void;
    onSaveInfo: () => void;
}

function StaffEditPanel({
    user,
    editForm,
    isSaving,
    onEditFormChange,
    onCancelEditing,
    onSaveInfo,
}: StaffEditPanelProps) {
    return (
        <div className="mx-auto w-full max-w-3xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">edit_note</span>
                        Chỉnh sửa thông tin cơ bản
                    </h4>
                    <p className="mt-1 text-sm text-on-surface-variant">Cập nhật nhanh các thông tin nhận diện chính của nhân viên.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-1 rounded-lg bg-primary/8 px-2.5 py-1 text-[11px] font-bold text-primary">
                    <span className="material-symbols-outlined text-[13px]" aria-hidden="true">badge</span>
                    ID #{user.id}
                </span>
            </div>

            <StaffEditSummaryStrip user={user} />

            <div className="mt-5 space-y-6 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-5 shadow-sm sm:p-6 lg:p-7">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="staff-edit-name" className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Họ và tên</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none" aria-hidden="true">person</span>
                            <input
                                id="staff-edit-name"
                                name="fullName"
                                type="text"
                                autoComplete="off"
                                value={editForm.fullName}
                                onChange={e => onEditFormChange({ fullName: e.target.value })}
                                className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest py-3.5 pl-11 pr-4 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
                                placeholder="Nhập họ và tên"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="staff-edit-phone" className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Số điện thoại</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none" aria-hidden="true">call</span>
                            <input
                                id="staff-edit-phone"
                                name="phone"
                                type="tel"
                                autoComplete="off"
                                value={editForm.phone}
                                onChange={e => onEditFormChange({ phone: e.target.value })}
                                className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest py-3.5 pl-11 pr-4 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
                                placeholder="0901234567"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="staff-edit-gender" className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Giới tính</label>
                        <div className="relative">
                            <StaffSelect
                                id="staff-edit-gender"
                                label="Chọn giới tính"
                                value={editForm.gender}
                                options={genderOptions}
                                onChange={gender => onEditFormChange({ gender })}
                                icon="wc"
                                placement="top"
                                size="comfortable"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="staff-edit-dob" className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Ngày sinh</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none" aria-hidden="true">cake</span>
                            <input
                                id="staff-edit-dob"
                                name="dob"
                                type="date"
                                value={editForm.dob}
                                onChange={e => onEditFormChange({ dob: e.target.value })}
                                className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest py-3.5 pl-11 pr-4 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 border-t border-outline-variant/10 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                    type="button"
                    onClick={onCancelEditing}
                    disabled={isSaving}
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-5"
                >
                    Hủy bỏ
                </button>
                <button
                    type="button"
                    onClick={onSaveInfo}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-6"
                >
                    {isSaving ? (
                        <>
                            <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                            Đang lưu…
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-base" aria-hidden="true">save</span>
                            Lưu thay đổi
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function StaffEditSummaryStrip({ user }: { user: User }) {
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <StaffEditSummaryItem
                icon="calendar_month"
                label="Ngày tạo"
                value={formatDate(user.createdAt)}
                tone="bg-violet-500/8 text-violet-600"
            />
            <StaffEditSummaryItem
                icon="star"
                label="Đánh giá"
                value={`${user.reviewCount ?? 0}`}
                tone="bg-amber-500/8 text-amber-600"
            />
            <StaffEditSummaryItem
                icon="mail"
                label="Email"
                value={user.email}
                tone="bg-primary/8 text-primary"
            />
        </div>
    );
}

interface StaffEditSummaryItemProps {
    icon: string;
    label: string;
    value: string;
    tone: string;
}

function StaffEditSummaryItem({ icon, label, value, tone }: StaffEditSummaryItemProps) {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-3">
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-on-surface">{value}</p>
            </div>
        </div>
    );
}

interface StaffReadonlyPanelProps {
    user: User;
    canEditRoles: boolean;
    onStartEditing: (user: User) => void;
    onChangeRole: (user: User) => void;
    onToggleStatus: (user: User) => void;
}

function StaffReadonlyPanel({
    user,
    canEditRoles,
    onStartEditing,
    onChangeRole,
    onToggleStatus,
}: StaffReadonlyPanelProps) {
    return (
        <>
            <StaffPersonalInfo user={user} />
            <StaffQuickActions
                user={user}
                canEditRoles={canEditRoles}
                onStartEditing={onStartEditing}
                onChangeRole={onChangeRole}
                onToggleStatus={onToggleStatus}
            />
        </>
    );
}

function StaffPersonalInfo({ user }: { user: User }) {
    return (
        <div>
            <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">person</span>
                Thông tin cá nhân
            </h4>
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:gap-3">
                <InfoTile icon="call" label="Điện thoại" value={user.phone || '—'} tone="bg-primary/8 text-primary" />
                <InfoTile icon="cake" label="Ngày sinh" value={user.dob ? formatDate(user.dob) : '—'} tone="bg-amber-500/8 text-amber-600" />
                <InfoTile icon="wc" label="Giới tính" value={user.gender || '—'} tone="bg-violet-500/8 text-violet-600" />
                <InfoTile icon="tag" label="Mã ID" value={`#${user.id}`} tone="bg-emerald-500/8 text-emerald-600" monospace />
            </div>
        </div>
    );
}

interface InfoTileProps {
    icon: string;
    label: string;
    value: string;
    tone: string;
    monospace?: boolean;
}

function InfoTile({ icon, label, value, tone, monospace = false }: InfoTileProps) {
    return (
        <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tone}`}>
                <span className="material-symbols-outlined text-base" aria-hidden="true">{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">{label}</p>
                <p className={`text-sm text-on-surface font-medium mt-0.5 truncate ${monospace ? 'font-mono' : ''}`}>{value}</p>
            </div>
        </div>
    );
}

interface StaffQuickActionsProps {
    user: User;
    canEditRoles: boolean;
    onStartEditing: (user: User) => void;
    onChangeRole: (user: User) => void;
    onToggleStatus: (user: User) => void;
}

function StaffQuickActions({
    user,
    canEditRoles,
    onStartEditing,
    onChangeRole,
    onToggleStatus,
}: StaffQuickActionsProps) {
    return (
        <div>
            <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">tune</span>
                Thao tác nhanh
            </h4>
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:flex sm:flex-wrap">
                <button
                    type="button"
                    onClick={() => onStartEditing(user)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant/20 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:border-amber-500/30 hover:bg-amber-500/8 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
                    Sửa thông tin
                </button>
                {canEditRoles && (
                    <button
                        type="button"
                        onClick={() => onChangeRole(user)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant/20 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:border-violet-500/30 hover:bg-violet-500/8 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">shield</span>
                        Đổi quyền
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onToggleStatus(user)}
                    aria-label={user.status === 'Active' ? `Vô hiệu hóa tài khoản ${user.fullName}` : `Kích hoạt tài khoản ${user.fullName}`}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant/20 px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                        user.status === 'Active'
                            ? 'text-on-surface-variant hover:bg-red-500/8 hover:text-red-600 hover:border-red-500/30 focus-visible:ring-red-500'
                            : 'text-on-surface-variant hover:bg-emerald-500/8 hover:text-emerald-600 hover:border-emerald-500/30 focus-visible:ring-emerald-500'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        {user.status === 'Active' ? 'block' : 'lock_open'}
                    </span>
                    {user.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                </button>
            </div>
        </div>
    );
}

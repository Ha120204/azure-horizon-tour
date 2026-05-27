'use client';

import Image from 'next/image';
import { bookingStatusStyle, roleConfig, statusConfig } from '../_lib/config';
import { formatCurrency, formatDate, getInitials } from '../_lib/helpers';
import type { StaffEditForm, User } from '../_lib/types';

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
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-slide-up">
                {isLoading && !user ? (
                    <div className="flex items-center justify-center py-32">
                        <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
                    </div>
                ) : user && (
                    <>
                        <StaffDetailHero
                            user={user}
                            isEditing={isEditing}
                            onStartEditing={onStartEditing}
                            onCancelEditing={onCancelEditing}
                            onClose={onClose}
                        />
                        <StaffDetailStats user={user} />
                        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
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
}

function StaffDetailHero({ user, isEditing, onStartEditing, onCancelEditing, onClose }: StaffDetailHeroProps) {
    const role = roleConfig[user.role] || roleConfig.CUSTOMER;
    const status = statusConfig[user.status] || statusConfig.Active;

    return (
        <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px, 40px 40px' }} />

            <div className="absolute top-4 right-4 z-10 flex gap-2">
                {!isEditing ? (
                    <button
                        onClick={() => onStartEditing(user)}
                        aria-label="Sửa thông tin người dùng"
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                        title="Sửa thông tin"
                    >
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>
                    </button>
                ) : (
                    <button
                        onClick={onCancelEditing}
                        className="px-4 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors text-sm font-semibold"
                    >
                        Hủy sửa
                    </button>
                )}
                <button
                    onClick={onClose}
                    aria-label="Đóng chi tiết người dùng"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 transition-colors"
                    title="Đóng"
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
                </button>
            </div>

            <div className="relative z-[1] px-8 pt-8 pb-14 text-center">
                {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={user.fullName || ''} width={80} height={80} sizes="80px" className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg mx-auto" />
                ) : (
                    <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/20 shadow-lg mx-auto">
                        {getInitials(user.fullName)}
                    </div>
                )}
                <h2 id="detail-title" className="font-headline text-xl font-bold text-white mt-4">
                    {user.fullName || 'Chưa cập nhật'}
                </h2>
                <p className="text-white/70 text-sm mt-1">{user.email}</p>

                <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-sm text-white">
                        <span className="material-symbols-outlined text-[13px]">{role.icon}</span>
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
    );
}

function StaffDetailStats({ user }: { user: User }) {
    return (
        <div className="px-8 -mt-7 relative z-[2]">
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-container-lowest rounded-2xl p-4 text-center shadow-md border border-outline-variant/10">
                    <span className="material-symbols-outlined text-primary text-xl mb-1 block">confirmation_number</span>
                    <p className="text-2xl font-bold text-on-surface">{user.bookingCount ?? 0}</p>
                    <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Bookings</p>
                </div>
                <div className="bg-surface-container-lowest rounded-2xl p-4 text-center shadow-md border border-outline-variant/10">
                    <span className="material-symbols-outlined text-amber-500 text-xl mb-1 block">star</span>
                    <p className="text-2xl font-bold text-on-surface">{user.reviewCount ?? 0}</p>
                    <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Reviews</p>
                </div>
                <div className="bg-surface-container-lowest rounded-2xl p-4 text-center shadow-md border border-outline-variant/10">
                    <span className="material-symbols-outlined text-violet-500 text-xl mb-1 block">calendar_month</span>
                    <p className="text-sm font-bold text-on-surface">{formatDate(user.createdAt)}</p>
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
        <div>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">edit_note</span>
                    Chỉnh sửa thông tin cơ bản
                </h4>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/8 text-primary text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[13px]">badge</span>
                    ID #{user.id}
                </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Họ và tên</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">person</span>
                            <input
                                type="text"
                                value={editForm.fullName}
                                onChange={e => onEditFormChange({ fullName: e.target.value })}
                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/30 outline-none transition-all"
                                placeholder="Nhập họ và tên"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Số điện thoại</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">call</span>
                            <input
                                type="tel"
                                value={editForm.phone}
                                onChange={e => onEditFormChange({ phone: e.target.value })}
                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/30 outline-none transition-all"
                                placeholder="0901234567"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Giới tính</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">wc</span>
                            <select
                                value={editForm.gender}
                                onChange={e => onEditFormChange({ gender: e.target.value })}
                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-9 py-3 text-sm font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/30 outline-none appearance-none cursor-pointer transition-all"
                            >
                                <option value="">Chọn giới tính</option>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base pointer-events-none">expand_more</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Ngày sinh</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">cake</span>
                            <input
                                type="date"
                                value={editForm.dob}
                                onChange={e => onEditFormChange({ dob: e.target.value })}
                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/30 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-outline-variant/10">
                <button
                    onClick={onCancelEditing}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                    Hủy bỏ
                </button>
                <button
                    onClick={onSaveInfo}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 shadow-sm"
                >
                    {isSaving ? (
                        <>
                            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                            Đang lưu…
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-base">save</span>
                            Lưu thay đổi
                        </>
                    )}
                </button>
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
            <StaffRecentBookings user={user} />
        </>
    );
}

function StaffPersonalInfo({ user }: { user: User }) {
    return (
        <div>
            <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">person</span>
                Thông tin cá nhân
            </h4>
            <div className="grid grid-cols-2 gap-3">
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
                <span className="material-symbols-outlined text-base">{icon}</span>
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
                <span className="material-symbols-outlined text-sm text-primary">tune</span>
                Thao tác nhanh
            </h4>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => onStartEditing(user)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant/20 text-on-surface-variant hover:bg-amber-500/8 hover:text-amber-700 hover:border-amber-500/30 transition-all"
                >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Sửa thông tin
                </button>
                {canEditRoles && (
                    <button
                        onClick={() => onChangeRole(user)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant/20 text-on-surface-variant hover:bg-violet-500/8 hover:text-violet-700 hover:border-violet-500/30 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">shield</span>
                        Đổi quyền
                    </button>
                )}
                <button
                    onClick={() => onToggleStatus(user)}
                    aria-label={user.status === 'Active' ? `Khóa tài khoản ${user.fullName}` : `Mở khóa tài khoản ${user.fullName}`}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant/20 transition-all ${
                        user.status === 'Active'
                            ? 'text-on-surface-variant hover:bg-red-500/8 hover:text-red-600 hover:border-red-500/30'
                            : 'text-on-surface-variant hover:bg-emerald-500/8 hover:text-emerald-600 hover:border-emerald-500/30'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        {user.status === 'Active' ? 'block' : 'lock_open'}
                    </span>
                    {user.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa'}
                </button>
            </div>
        </div>
    );
}

function StaffRecentBookings({ user }: { user: User }) {
    if (!user.recentBookings || user.recentBookings.length === 0) {
        return (
            <div className="text-center py-6 bg-surface-container-low rounded-2xl">
                <span className="material-symbols-outlined text-3xl text-outline mb-2 block">luggage</span>
                <p className="text-sm font-semibold text-on-surface-variant">Chưa có booking nào</p>
                <p className="text-xs text-outline mt-1">Người dùng này chưa thực hiện đặt tour.</p>
            </div>
        );
    }

    return (
        <div>
            <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">receipt_long</span>
                Booking gần đây
            </h4>
            <div className="space-y-2">
                {user.recentBookings.map(booking => {
                    const bookingStatus = bookingStatusStyle[booking.status];
                    return (
                        <div key={booking.id} className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary text-base">flight_takeoff</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-on-surface truncate">{booking.tour.name}</p>
                                    <p className="text-xs text-on-surface-variant mt-0.5">
                                        <span className="font-mono">{booking.bookingCode.substring(0, 14)}</span>
                                        {' · '}
                                        {formatDate(booking.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <span className="text-sm font-bold text-on-surface">{formatCurrency(booking.totalPrice)}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${bookingStatus?.className ?? 'bg-surface-container text-on-surface-variant'}`}>
                                    {bookingStatus?.label ?? booking.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

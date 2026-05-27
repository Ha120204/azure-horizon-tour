import Image from 'next/image';
import { bookingStatusStyle, statusConfig } from '../_lib/config';
import { formatCurrency, formatDate, getAvatarGradient, getInitials } from '../_lib/helpers';
import type { CustomerEditForm, User } from '../_lib/types';
import { DetailInfoCard } from './DetailInfoCard';

interface CustomerDetailModalProps {
    user: User | null;
    isLoading: boolean;
    isEditing: boolean;
    editForm: CustomerEditForm;
    isSaving: boolean;
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
    onClose,
    onStartEditing,
    onCancelEditing,
    onEditFormChange,
    onSaveInfo,
    onToggleStatus,
}: CustomerDetailModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-surface-container-lowest rounded-[24px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-slide-up overflow-hidden">
                {isLoading && !user ? (
                    <div className="flex-1 flex items-center justify-center py-32">
                        <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
                    </div>
                ) : user ? (
                    <>
                        <CustomerDetailHero
                            user={user}
                            isEditing={isEditing}
                            onStartEditing={onStartEditing}
                            onCancelEditing={onCancelEditing}
                            onClose={onClose}
                        />

                        <div className="flex-1 overflow-y-auto bg-surface-container-lowest -mt-4 relative rounded-t-[20px] z-[2]">
                            {!isEditing ? (
                                <CustomerReadonlyPanel user={user} onToggleStatus={onToggleStatus} />
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
            </div>
        </div>
    );
}

function CustomerDetailHero({
    user,
    isEditing,
    onStartEditing,
    onCancelEditing,
    onClose,
}: {
    user: User;
    isEditing: boolean;
    onStartEditing: (user: User) => void;
    onCancelEditing: () => void;
    onClose: () => void;
}) {
    const status = statusConfig[user.status] || statusConfig.Active;
    const isActive = user.status === 'Active';

    return (
        <div className="relative flex-shrink-0 min-h-[140px]">
            <div className={`absolute inset-0 bg-gradient-to-br ${getAvatarGradient(user.id)} opacity-90`} />
            <div
                className="absolute inset-0 opacity-[0.1]"
                style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                    backgroundSize: '60px 60px, 40px 40px',
                }}
            />

            <div className="absolute top-4 right-4 z-10 flex gap-2">
                {!isEditing ? (
                    <button
                        onClick={() => onStartEditing(user)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                        title="Sửa thông tin"
                    >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
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
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 transition-colors"
                    title="Đóng"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>

            <div className="relative z-[1] px-8 pt-8 pb-12 flex items-center gap-5">
                {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={user.fullName || ''} width={96} height={96} sizes="96px" className="h-24 w-24 rounded-full object-cover ring-4 ring-white/30 shadow-lg flex-shrink-0 bg-white" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-3xl ring-4 ring-white/30 shadow-lg flex-shrink-0">
                        {getInitials(user.fullName)}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h2 id="detail-title" className="font-headline text-2xl font-bold text-white drop-shadow-sm truncate">
                        {user.fullName || 'Chưa cập nhật'}
                    </h2>
                    <p className="text-white/90 font-medium text-sm mt-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                        {user.email}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isActive
                                ? 'bg-emerald-400/20 text-white border border-emerald-300/30'
                                : 'bg-red-500/30 text-white border border-red-300/30'
                        } backdrop-blur-sm shadow-sm`}>
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {status.label}
                        </span>
                        <span className="text-white/70 text-xs font-mono bg-black/10 px-2 py-1 rounded-md backdrop-blur-sm">ID #{user.id}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CustomerReadonlyPanel({ user, onToggleStatus }: { user: User; onToggleStatus: (user: User) => void }) {
    return (
        <div className="px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <div className="space-y-8">
                <CustomerProfileInfo user={user} />
                <CustomerRecentBookings user={user} />
            </div>

            <div className="space-y-6">
                <CustomerActivityStats user={user} />
                <CustomerQuickActions user={user} onToggleStatus={onToggleStatus} />
            </div>
        </div>
    );
}

function CustomerProfileInfo({ user }: { user: User }) {
    return (
        <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[18px]">account_box</span>
                Hồ sơ cá nhân
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <DetailInfoCard icon="badge" label="Họ và tên" value={user.fullName || '—'} />
                <DetailInfoCard icon="call" label="Điện thoại" value={user.phone || '—'} />
                <DetailInfoCard icon="cake" label="Ngày sinh" value={user.dob ? formatDate(user.dob) : '—'} />
                <DetailInfoCard icon="wc" label="Giới tính" value={user.gender || '—'} />
                <DetailInfoCard icon="calendar_month" label="Ngày tham gia" value={formatDate(user.createdAt)} />
                {user.deletedAt && (
                    <DetailInfoCard icon="event_busy" label="Bị khóa vào ngày" value={formatDate(user.deletedAt)} isWarning />
                )}
            </div>
        </div>
    );
}

function CustomerRecentBookings({ user }: { user: User }) {
    return (
        <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
                Lịch sử đặt tour gần đây
            </h3>
            {user.recentBookings && user.recentBookings.length > 0 ? (
                <div className="space-y-3">
                    {user.recentBookings.map(booking => {
                        const status = bookingStatusStyle[booking.status] || { bg: 'bg-surface-container', text: 'text-on-surface-variant', label: booking.status };
                        return (
                            <div key={booking.id} className="p-4 border border-outline-variant/20 rounded-2xl hover:bg-surface-container-lowest transition-colors flex items-center justify-between shadow-sm">
                                <div className="min-w-0 flex-1 mr-4">
                                    <p className="text-sm font-bold text-on-surface truncate mb-1">{booking.tour.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                                        <span className="font-mono bg-surface-container-low px-1.5 py-0.5 rounded text-[11px] text-on-surface">{booking.bookingCode.substring(0, 14)}</span>
                                        <span>•</span>
                                        <span>{formatDate(booking.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${status.bg} ${status.text}`}>
                                        {status.label}
                                    </span>
                                    <span className="text-sm font-bold text-primary">{formatCurrency(booking.totalPrice)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8 border border-dashed border-outline-variant/40 rounded-2xl bg-surface-container-low/30">
                    <span className="material-symbols-outlined text-3xl text-outline mb-2" aria-hidden="true">luggage</span>
                    <p className="text-sm font-semibold text-on-surface-variant">Chưa có dữ liệu đặt tour</p>
                </div>
            )}
        </div>
    );
}

function CustomerActivityStats({ user }: { user: User }) {
    return (
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">Hoạt động</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-outline-variant/10">
                    <span className="text-sm text-on-surface-variant">Tổng đơn đặt</span>
                    <span className="text-lg font-bold text-on-surface">{user.bookingCount}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-on-surface-variant">Lượt đánh giá</span>
                    <span className="text-lg font-bold text-on-surface">{user.reviewCount}</span>
                </div>
            </div>
        </div>
    );
}

function CustomerQuickActions({ user, onToggleStatus }: { user: User; onToggleStatus: (user: User) => void }) {
    const isActive = user.status === 'Active';

    return (
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">settings</span>
                Thao tác nhanh
            </h3>
            <button
                onClick={() => onToggleStatus(user)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 border ${
                    isActive
                        ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
            >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    {isActive ? 'block' : 'lock_open'}
                </span>
                {isActive ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
            </button>
        </div>
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
        <div className="px-8 py-8 animate-fade-slide-up">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">manage_accounts</span>
                        Chỉnh sửa thông tin cơ bản
                    </h3>
                    <span className="text-xs font-medium bg-surface-container px-3 py-1 rounded-full text-on-surface-variant">ID #{user.id}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
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
                        onChange={value => onEditFormChange({ phone: value })}
                    />

                    <div className="space-y-2">
                        <label htmlFor="edit-gender" className="text-sm font-bold text-on-surface-variant block">Giới tính</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] z-10 pointer-events-none">wc</span>
                            <select
                                id="edit-gender"
                                value={editForm.gender}
                                onChange={event => onEditFormChange({ gender: event.target.value })}
                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl pl-10 pr-10 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors text-on-surface font-medium appearance-none cursor-pointer"
                            >
                                <option value="">Chưa cập nhật</option>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="edit-dob" className="text-sm font-bold text-on-surface-variant block">Ngày sinh</label>
                        <div className="relative">
                            <input
                                id="edit-dob"
                                type="date"
                                value={editForm.dob}
                                onChange={event => onEditFormChange({ dob: event.target.value })}
                                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors text-on-surface font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-4 justify-end">
                    <button
                        type="button"
                        onClick={onCancelEditing}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        type="button"
                        onClick={onSaveInfo}
                        disabled={isSaving}
                        className="px-8 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20 transition-all flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                Lưu thay đổi
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
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
}: {
    id: string;
    icon: string;
    label: string;
    type: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-bold text-on-surface-variant block">{label}</label>
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">{icon}</span>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={event => onChange(event.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl pl-10 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors text-on-surface font-medium"
                />
            </div>
        </div>
    );
}

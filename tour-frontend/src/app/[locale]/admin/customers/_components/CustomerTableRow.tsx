import Image from 'next/image';
import { statusConfig } from '../_lib/config';
import { formatCurrency, formatDate, formatRelativeDate, getAvatarGradient, getInitials } from '../_lib/helpers';
import type { User } from '../_lib/types';

interface CustomerTableRowProps {
    user: User;
    currentUserRole: string;
    isSelected: boolean;
    onToggleSelected: (userId: number) => void;
    onOpenDetail: (userId: number, editMode?: boolean) => void;
    onToggleStatus: (user: User) => void;
}

export function CustomerTableRow({
    user,
    currentUserRole,
    isSelected,
    onToggleSelected,
    onOpenDetail,
    onToggleStatus,
}: CustomerTableRowProps) {
    const sc = statusConfig[user.status] || statusConfig.Active;
    const canManage = currentUserRole === 'ADMIN';
    const totalSpent = user.totalSpent ?? 0;
    const hasBookings = user.bookingCount > 0;

    return (
        <tr
            className={`group cursor-pointer transition-colors hover:bg-primary/[0.03] ${isSelected ? 'bg-primary/[0.04]' : ''} ${user.status === 'Deactivated' ? 'opacity-60' : ''}`}
            onClick={() => onOpenDetail(user.id)}
        >
            <td className="py-3.5 px-5" onClick={event => event.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelected(user.id)}
                    aria-label={`Chọn ${user.fullName || user.email}`}
                    className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                />
            </td>
            <td className="py-3.5 px-5">
                <div className="flex items-center gap-3 min-w-0">
                    {user.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt={user.fullName || 'Avatar khách hàng'}
                            width={40}
                            height={40}
                            sizes="40px"
                            className={`h-10 w-10 rounded-full object-cover flex-shrink-0 ring-2 ring-outline-variant/10 ${user.status === 'Deactivated' ? 'grayscale' : ''}`}
                        />
                    ) : (
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(user.id)} flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-sm`}>
                            {getInitials(user.fullName)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-on-surface truncate max-w-[190px] group-hover:text-primary transition-colors">{user.fullName || 'Chưa cập nhật'}</p>
                        <p className="text-xs text-on-surface-variant/60 mt-0.5 font-mono">
                            ID #{user.id}
                        </p>
                    </div>
                </div>
            </td>
            <td className="py-3.5 px-5">
                <div className="min-w-0">
                    <p className="text-sm text-on-surface truncate max-w-[220px]" title={user.email}>{user.email}</p>
                    <p className="text-xs text-on-surface-variant/60 mt-0.5">{user.phone || 'Chưa cập nhật SĐT'}</p>
                </div>
            </td>
            <td className="py-3.5 px-5">
                <p className="text-sm text-on-surface whitespace-nowrap">{formatDate(user.createdAt)}</p>
                <p className="text-xs text-on-surface-variant/60 mt-0.5">{formatRelativeDate(user.createdAt)}</p>
            </td>
            <td className="py-3.5 px-5 text-center">
                <span className={`inline-flex items-center justify-center min-w-[36px] px-2.5 py-1 rounded-lg text-sm font-bold ${
                    hasBookings
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant/50'
                }`}>
                    {user.bookingCount}
                </span>
            </td>
            <td className="py-3.5 px-5 text-right">
                <p className={`text-sm font-semibold tabular-nums ${totalSpent > 0 ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
                    {totalSpent > 0 ? formatCurrency(totalSpent) : '—'}
                </p>
                {totalSpent > 0 && (
                    <p className="mt-0.5 text-[11px] text-on-surface-variant/60">Đã thanh toán</p>
                )}
            </td>
            <td className="py-3.5 px-5">
                {user.lastBookingAt ? (
                    <>
                        <p className="text-sm text-on-surface whitespace-nowrap">{formatDate(user.lastBookingAt)}</p>
                        <p className="text-xs text-on-surface-variant/60 mt-0.5">{formatRelativeDate(user.lastBookingAt)}</p>
                    </>
                ) : (
                    <span className="inline-flex items-center rounded-lg bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant/70">
                        Chưa đặt tour
                    </span>
                )}
            </td>
            <td className="py-3.5 px-5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                </span>
            </td>
            <td className="py-3.5 px-5 text-center whitespace-nowrap" onClick={event => event.stopPropagation()}>
                <div className="flex items-center justify-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onOpenDetail(user.id)}
                        aria-label={`Xem chi tiết ${user.fullName || user.email}`}
                        title="Xem chi tiết"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant/20 px-2.5 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    >
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">visibility</span>
                        Xem
                    </button>
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => onOpenDetail(user.id, true)}
                            aria-label={`Sửa ${user.fullName || user.email}`}
                            title="Sửa thông tin"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">edit</span>
                        </button>
                    )}
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => onToggleStatus(user)}
                            aria-label={user.status === 'Active' ? `Khóa ${user.fullName || user.email}` : `Mở khóa ${user.fullName || user.email}`}
                            title={user.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 outline-none ${
                                user.status === 'Active'
                                    ? 'border-outline-variant/20 text-on-surface-variant hover:border-error/25 hover:bg-error/10 hover:text-error focus-visible:ring-error'
                                    : 'border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 focus-visible:ring-emerald-500'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                                {user.status === 'Active' ? 'block' : 'lock_open'}
                            </span>
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

import Image from 'next/image';
import { statusConfig } from '../_lib/config';
import { formatDate, formatRelativeDate, getAvatarGradient, getInitials } from '../_lib/helpers';
import type { User } from '../_lib/types';

interface CustomerTableRowProps {
    user: User;
    currentUserRole: string;
    onOpenDetail: (userId: number, editMode?: boolean) => void;
    onToggleStatus: (user: User) => void;
}

export function CustomerTableRow({
    user,
    currentUserRole,
    onOpenDetail,
    onToggleStatus,
}: CustomerTableRowProps) {
    const sc = statusConfig[user.status] || statusConfig.Active;
    const canManage = currentUserRole !== 'STAFF';

    return (
        <tr
            className={`hover:bg-primary/[0.03] transition-colors group cursor-pointer ${user.status === 'Deactivated' ? 'opacity-60' : ''}`}
            onClick={() => onOpenDetail(user.id)}
        >
            <td className="py-3.5 px-5">
                <div className="flex items-center gap-3 min-w-0">
                    {user.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt={user.fullName}
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
                        <p className="font-semibold text-sm text-on-surface truncate max-w-[180px] group-hover:text-primary transition-colors">{user.fullName || 'Chưa cập nhật'}</p>
                        <p className="text-xs text-on-surface-variant/60 mt-0.5 font-mono">
                            ID #{user.id}
                        </p>
                    </div>
                </div>
            </td>
            <td className="py-3.5 px-5">
                <div className="min-w-0">
                    <p className="text-sm text-on-surface truncate max-w-[200px]">{user.email}</p>
                    <p className="text-xs text-on-surface-variant/60 mt-0.5">{user.phone || 'Chưa cập nhật SĐT'}</p>
                </div>
            </td>
            <td className="py-3.5 px-5">
                <p className="text-sm text-on-surface whitespace-nowrap">{formatDate(user.createdAt)}</p>
                <p className="text-xs text-on-surface-variant/60 mt-0.5">{formatRelativeDate(user.createdAt)}</p>
            </td>
            <td className="py-3.5 px-5 text-center">
                <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg text-sm font-bold ${
                    user.bookingCount > 0
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant/50'
                }`}>
                    {user.bookingCount}
                </span>
            </td>
            <td className="py-3.5 px-5 text-center">
                <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg text-sm font-bold ${
                    user.reviewCount > 0
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'text-on-surface-variant/50'
                }`}>
                    {user.reviewCount}
                </span>
            </td>
            <td className="py-3.5 px-5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                </span>
            </td>
            <td className="py-3.5 px-5 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-1">
                    <div className="relative group/tip">
                        <button
                            onClick={() => onOpenDetail(user.id)}
                            aria-label="Xem chi tiết"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>visibility</span>
                        </button>
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                            Xem chi tiết
                            <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                        </span>
                    </div>
                    {canManage && (
                        <div className="relative group/tip">
                            <button
                                onClick={() => onOpenDetail(user.id, true)}
                                aria-label="Chỉnh sửa"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-blue-500/10 hover:text-blue-500 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                            >
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>edit</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
                                Chỉnh sửa
                                <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" />
                            </span>
                        </div>
                    )}
                    {canManage && (
                        <div className="relative group/tip">
                            <button
                                onClick={() => onToggleStatus(user)}
                                aria-label="Đổi trạng thái"
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant transition-colors focus-visible:ring-2 outline-none ${
                                    user.status === 'Active'
                                        ? 'hover:bg-error/10 hover:text-error focus-visible:ring-error'
                                        : 'text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 focus-visible:ring-emerald-500'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>
                                    {user.status === 'Active' ? 'block' : 'lock_open'}
                                </span>
                            </button>
                            <span className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20 ${
                                user.status === 'Active' ? 'bg-error text-on-error' : 'bg-emerald-500 text-white'
                            }`}>
                                {user.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa'}
                                <span className={`absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent ${
                                    user.status === 'Active' ? 'border-t-error' : 'border-t-emerald-500'
                                }`} />
                            </span>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

'use client';

import Image from 'next/image';
import { actionTooltipClass, roleConfig, statusConfig } from '../_lib/config';
import { formatDate, getInitials } from '../_lib/helpers';
import type { User } from '../_lib/types';

interface StaffTableRowProps {
    user: User;
    currentUserRole: string;
    canEditRoles: boolean;
    onOpenDetail: (id: number, edit?: boolean) => void;
    onChangeRole: (user: User) => void;
    onToggleStatus: (user: User) => void;
}

export function StaffTableRow({
    user,
    currentUserRole,
    canEditRoles,
    onOpenDetail,
    onChangeRole,
    onToggleStatus,
}: StaffTableRowProps) {
    const rc = roleConfig[user.role] || roleConfig.CUSTOMER;
    const sc = statusConfig[user.status] || statusConfig.Active;

    return (
        <tr className={`hover:bg-surface-container-low/40 transition-colors group ${user.status === 'Deactivated' ? 'opacity-60' : ''}`}>
            <td className="py-3 px-4 align-middle xl:px-5">
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs ring-2 ring-outline-variant/10">
                            {getInitials(user.fullName)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-on-surface truncate">{user.fullName || 'Chưa cập nhật'}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            <span translate="no" className="font-mono">#{user.id}</span>
                        </p>
                    </div>
                </div>
            </td>
            <td className="py-3 px-4 align-middle xl:px-5">
                <p className="text-sm text-on-surface-variant truncate">{user.email}</p>
                <p className="text-xs text-outline mt-0.5">{user.phone || '—'}</p>
            </td>
            <td className="py-3 px-4 align-middle xl:px-5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${rc.bg} ${rc.text}`}>
                    <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{rc.icon}</span>
                    {rc.label}
                </span>
            </td>
            <td className="py-3 px-4 align-middle text-sm text-on-surface-variant whitespace-nowrap xl:px-5">
                {formatDate(user.createdAt)}
            </td>
            <td className="py-3 px-4 align-middle text-right text-sm font-semibold text-on-surface xl:px-5">
                {user.bookingCount}
            </td>
            <td className="py-3 px-4 align-middle xl:px-5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} aria-hidden="true" />
                    {sc.label}
                </span>
            </td>
            <td className="py-3 px-4 align-middle text-right whitespace-nowrap xl:px-5">
                <div className="flex justify-end gap-1">
                    <div className="relative group/tip">
                        <button
                            onClick={() => onOpenDetail(user.id)}
                            aria-label={`Xem chi tiết ${user.fullName}`}
                            title="Xem chi tiết"
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>visibility</span>
                        </button>
                        <span className={actionTooltipClass} aria-hidden="true">Xem chi tiết</span>
                    </div>
                    {currentUserRole !== 'STAFF' && (
                        <div className="relative group/tip">
                            <button
                                onClick={() => onOpenDetail(user.id, true)}
                                aria-label={`Sửa thông tin ${user.fullName}`}
                                title="Sửa thông tin"
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 outline-none"
                            >
                                <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>edit</span>
                            </button>
                            <span className={actionTooltipClass} aria-hidden="true">Sửa thông tin</span>
                        </div>
                    )}
                    {canEditRoles && (
                        <div className="relative group/tip">
                            <button
                                onClick={() => onChangeRole(user)}
                                aria-label={`Đổi role ${user.fullName}`}
                                title="Đổi quyền"
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/30 transition-all focus-visible:ring-2 focus-visible:ring-violet-500 outline-none"
                            >
                                <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>shield</span>
                            </button>
                            <span className={actionTooltipClass} aria-hidden="true">Đổi quyền</span>
                        </div>
                    )}
                    {currentUserRole !== 'STAFF' && (
                        <div className="relative group/tip">
                            <button
                                onClick={() => onToggleStatus(user)}
                                aria-label={user.status === 'Active' ? `Vô hiệu hóa ${user.fullName}` : `Kích hoạt ${user.fullName}`}
                                title={user.status === 'Active' ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/20 transition-all focus-visible:ring-2 outline-none ${user.status === 'Active'
                                        ? 'text-on-surface-variant hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 focus-visible:ring-red-500'
                                        : 'text-on-surface-variant hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 focus-visible:ring-emerald-500'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'wght' 300" }}>
                                    {user.status === 'Active' ? 'block' : 'lock_open'}
                                </span>
                            </button>
                            <span className={actionTooltipClass} aria-hidden="true">{user.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt'}</span>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

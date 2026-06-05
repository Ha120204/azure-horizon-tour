'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { roleConfig, statusConfig } from '../_lib/config';
import { formatDate, getInitials } from '../_lib/helpers';
import type { User } from '../_lib/types';

interface StaffTableRowProps {
    user: User;
    currentUserRole: string;
    canEditRoles: boolean;
    canSelect?: boolean;
    isSelected?: boolean;
    onOpenDetail: (id: number, edit?: boolean) => void;
    onChangeRole: (user: User) => void;
    onToggleStatus: (user: User) => void;
    onToggleSelected?: (id: number) => void;
}

export function StaffTableRow({
    user,
    currentUserRole,
    canEditRoles,
    canSelect = false,
    isSelected = false,
    onOpenDetail,
    onChangeRole,
    onToggleStatus,
    onToggleSelected,
}: StaffTableRowProps) {
    const rc = roleConfig[user.role] || roleConfig.CUSTOMER;
    const sc = statusConfig[user.status] || statusConfig.Active;
    const canManageUser = currentUserRole !== 'STAFF';

    return (
        <tr className={`hover:bg-surface-container-low/40 transition-colors group ${user.status === 'Deactivated' ? 'opacity-60' : ''}`}>
            {canSelect && (
                <td className="py-3 pl-4 pr-2 align-middle xl:pl-5">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelected?.(user.id)}
                        aria-label={isSelected ? `Bỏ chọn ${user.fullName}` : `Chọn ${user.fullName}`}
                        className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                    />
                </td>
            )}
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
            <td className="py-3 px-4 align-middle xl:px-5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} aria-hidden="true" />
                    {sc.label}
                </span>
            </td>
            <td className="py-3 px-4 align-middle text-right whitespace-nowrap xl:px-5">
                <RowActions
                    user={user}
                    canManageUser={canManageUser}
                    canEditRoles={canEditRoles}
                    onOpenDetail={onOpenDetail}
                    onChangeRole={onChangeRole}
                    onToggleStatus={onToggleStatus}
                />
            </td>
        </tr>
    );
}

export function StaffMobileCard({
    user,
    currentUserRole,
    canEditRoles,
    canSelect = false,
    isSelected = false,
    onOpenDetail,
    onChangeRole,
    onToggleStatus,
    onToggleSelected,
}: StaffTableRowProps) {
    const role = roleConfig[user.role] || roleConfig.CUSTOMER;
    const status = statusConfig[user.status] || statusConfig.Active;

    return (
        <article className={`rounded-2xl border bg-surface-container-lowest p-4 shadow-sm ${isSelected ? 'border-primary/40 ring-2 ring-primary/10' : 'border-outline-variant/15'} ${user.status === 'Deactivated' ? 'opacity-70' : ''}`}>
            {canSelect && (
                <label className="mb-3 flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelected?.(user.id)}
                        aria-label={isSelected ? `Bỏ chọn ${user.fullName}` : `Chọn ${user.fullName}`}
                        className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                    />
                    {isSelected ? 'Đã chọn' : 'Chọn tài khoản'}
                </label>
            )}
            <div className="flex items-start gap-3">
                {user.avatarUrl ? (
                    <Image
                        src={user.avatarUrl}
                        alt={user.fullName}
                        width={44}
                        height={44}
                        sizes="44px"
                        className={`h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-outline-variant/10 ${user.status === 'Deactivated' ? 'grayscale' : ''}`}
                    />
                ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary ring-2 ring-outline-variant/10">
                        {getInitials(user.fullName)}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-on-surface">{user.fullName || 'Chưa cập nhật'}</h3>
                            <p className="mt-0.5 truncate text-xs text-on-surface-variant">{user.email}</p>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold ${status.bg} ${status.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                            {status.label}
                        </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${role.bg} ${role.text}`}>
                            <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{role.icon}</span>
                            {role.label}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                            ID <span translate="no" className="font-mono">#{user.id}</span>
                        </span>
                    </div>
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 border-y border-outline-variant/10 py-3 text-xs">
                <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Điện thoại</dt>
                    <dd className="mt-1 truncate font-medium text-on-surface">{user.phone || '—'}</dd>
                </div>
                <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Ngày tạo</dt>
                    <dd className="mt-1 font-medium text-on-surface">{formatDate(user.createdAt)}</dd>
                </div>
            </dl>

            <div className="mt-3 flex justify-end">
                <RowActions
                    user={user}
                    canManageUser={currentUserRole !== 'STAFF'}
                    canEditRoles={canEditRoles}
                    onOpenDetail={onOpenDetail}
                    onChangeRole={onChangeRole}
                    onToggleStatus={onToggleStatus}
                    showDetailLabel
                />
            </div>
        </article>
    );
}

interface RowActionsProps {
    user: User;
    canManageUser: boolean;
    canEditRoles: boolean;
    onOpenDetail: (id: number, edit?: boolean) => void;
    onChangeRole: (user: User) => void;
    onToggleStatus: (user: User) => void;
    showDetailLabel?: boolean;
}

function RowActions({
    user,
    canManageUser,
    canEditRoles,
    onOpenDetail,
    onChangeRole,
    onToggleStatus,
    showDetailLabel = false,
}: RowActionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const hasMoreActions = canManageUser || canEditRoles;
    const menuId = `staff-actions-${user.id}`;

    useEffect(() => {
        if (!isOpen) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setIsOpen(false);
            triggerRef.current?.focus();
        };
        const closeOnViewportChange = () => setIsOpen(false);

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        window.addEventListener('resize', closeOnViewportChange);
        window.addEventListener('scroll', closeOnViewportChange, true);
        requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus());

        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
            window.removeEventListener('resize', closeOnViewportChange);
            window.removeEventListener('scroll', closeOnViewportChange, true);
        };
    }, [isOpen]);

    const toggleMenu = () => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        const triggerRect = triggerRef.current?.getBoundingClientRect();
        if (triggerRect) {
            const menuWidth = 208;
            const menuHeight = canEditRoles ? 164 : 116;
            const openAbove = window.innerHeight - triggerRect.bottom < menuHeight && triggerRect.top > menuHeight;
            setMenuPosition({
                top: openAbove ? triggerRect.top - menuHeight - 6 : triggerRect.bottom + 6,
                left: Math.max(8, triggerRect.right - menuWidth),
            });
        }
        setIsOpen(true);
    };

    const runAction = (action: () => void) => {
        setIsOpen(false);
        action();
    };

    const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
        const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
        let nextIndex = currentIndex;

        if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
        else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = items.length - 1;
        else return;

        event.preventDefault();
        items[nextIndex]?.focus();
    };

    return (
        <div ref={containerRef} className="relative inline-flex items-center justify-end gap-1.5">
            <button
                type="button"
                onClick={() => onOpenDetail(user.id)}
                aria-label={`Xem chi tiết ${user.fullName}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-outline-variant/20 px-2.5 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">visibility</span>
                <span className={showDetailLabel ? '' : 'hidden 2xl:inline'}>Chi tiết</span>
            </button>

            {hasMoreActions && (
                <>
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={toggleMenu}
                        aria-label={`Mở thao tác cho ${user.fullName}`}
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? menuId : undefined}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            isOpen
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-outline-variant/20 text-on-surface-variant hover:border-primary/30 hover:bg-surface-container hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[19px]" aria-hidden="true">more_horiz</span>
                    </button>

                    {isOpen && typeof document !== 'undefined' && createPortal(
                        <div
                            ref={menuRef}
                            id={menuId}
                            role="menu"
                            aria-label={`Thao tác cho ${user.fullName}`}
                            onKeyDown={handleMenuKeyDown}
                            style={{ top: menuPosition.top, left: menuPosition.left }}
                            className="fixed z-[70] w-52 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1.5 text-left shadow-xl"
                        >
                            {canManageUser && (
                                <ActionMenuItem
                                    icon="edit"
                                    label="Chỉnh sửa thông tin"
                                    onClick={() => runAction(() => onOpenDetail(user.id, true))}
                                />
                            )}
                            {canEditRoles && (
                                <ActionMenuItem
                                    icon="shield"
                                    label="Đổi quyền tài khoản"
                                    onClick={() => runAction(() => onChangeRole(user))}
                                />
                            )}
                            {canManageUser && (
                                <>
                                    <div className="my-1 border-t border-outline-variant/15" aria-hidden="true" />
                                    <ActionMenuItem
                                        icon={user.status === 'Active' ? 'person_off' : 'person_check'}
                                        label={user.status === 'Active' ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
                                        tone={user.status === 'Active' ? 'danger' : 'success'}
                                        onClick={() => runAction(() => onToggleStatus(user))}
                                    />
                                </>
                            )}
                        </div>,
                        document.body,
                    )}
                </>
            )}
        </div>
    );
}

function ActionMenuItem({
    icon,
    label,
    tone = 'default',
    onClick,
}: {
    icon: string;
    label: string;
    tone?: 'default' | 'danger' | 'success';
    onClick: () => void;
}) {
    const toneClass = {
        default: 'text-on-surface hover:bg-surface-container',
        danger: 'text-red-600 hover:bg-red-500/10',
        success: 'text-emerald-700 hover:bg-emerald-500/10',
    }[tone];

    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${toneClass}`}
        >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icon}</span>
            <span>{label}</span>
        </button>
    );
}

'use client';

import type React from 'react';
import AdminPagination from '@/components/admin/AdminPagination';
import { StaffTableRow } from './StaffTableRow';
import type { Meta, StaffKpiItem, ToastState, User } from '../_lib/types';

interface StaffPageHeaderProps {
    title: string;
    description: string;
    createButtonLabel: string;
    canCreate: boolean;
    onCreate: () => void;
}

export function StaffPageHeader({ title, description, createButtonLabel, canCreate, onCreate }: StaffPageHeaderProps) {
    return (
        <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
            <div>
                <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface" style={{ textWrap: 'balance' } as React.CSSProperties}>
                    {title}
                </h1>
                <p className="text-on-surface-variant text-sm mt-1">{description}</p>
            </div>
            {canCreate && (
                <button
                    onClick={onCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">person_add</span>
                    {createButtonLabel}
                </button>
            )}
        </div>
    );
}

interface StaffKpiGridProps {
    kpis: StaffKpiItem[];
}

export function StaffKpiGrid({ kpis }: StaffKpiGridProps) {
    return (
        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map(kpi => (
                <div key={kpi.label} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                            <span className="material-symbols-outlined text-xl" aria-hidden="true">{kpi.icon}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-on-surface-variant font-medium truncate">{kpi.label}</p>
                            <p className="text-xl font-bold text-on-surface leading-tight mt-0.5 truncate">{kpi.value}</p>
                            <p className="mt-1 text-xs leading-5 text-on-surface-variant/75">{kpi.helper}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

interface StaffFiltersProps {
    search: string;
    filterStatus: string;
    isSuperAdminView: boolean;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
}

export function StaffFilters({ search, filterStatus, isSuperAdminView, onSearchChange, onStatusChange }: StaffFiltersProps) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 border border-outline-variant/10 shadow-sm flex flex-wrap gap-3 items-stretch sm:items-center">
            <div className="flex-1 min-w-[220px] relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none" aria-hidden="true">search</span>
                <label htmlFor="search-users" className="sr-only">{isSuperAdminView ? 'Tìm kiếm admin' : 'Tìm kiếm nhân sự'}</label>
                <input
                    id="search-users"
                    type="search"
                    autoComplete="off"
                    name="staff-search"
                    placeholder={isSuperAdminView ? 'Tìm admin theo tên hoặc email…' : 'Tìm nhân sự theo tên hoặc email…'}
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl pl-11 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                />
            </div>
            <div className="flex gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface-variant">
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                        {isSuperAdminView ? 'admin_panel_settings' : 'badge'}
                    </span>
                    {isSuperAdminView ? 'Phạm vi: Admin' : 'Phạm vi: Staff'}
                </div>
                <label htmlFor="filter-status" className="sr-only">Lọc theo trạng thái</label>
                <select
                    id="filter-status"
                    value={filterStatus}
                    onChange={e => onStatusChange(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant/15 rounded-xl py-2.5 pl-4 pr-9 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface appearance-none cursor-pointer outline-none transition-colors"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Hoạt động</option>
                    <option value="deactivated">Đã vô hiệu hóa</option>
                </select>
            </div>
        </div>
    );
}

interface StaffUsersTableProps {
    users: User[];
    isLoading: boolean;
    meta: Meta;
    pageSize: number;
    currentUserRole: string;
    canEditRoles: boolean;
    itemLabel: string;
    onOpenDetail: (id: number, edit?: boolean) => void;
    onChangeRole: (user: User) => void;
    onToggleStatus: (user: User) => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}

export function StaffUsersTable({
    users,
    isLoading,
    meta,
    pageSize,
    currentUserRole,
    canEditRoles,
    itemLabel,
    onOpenDetail,
    onChangeRole,
    onToggleStatus,
    onPageChange,
    onPageSizeChange,
}: StaffUsersTableProps) {
    return (
        <div id="users-table" className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto lg:overflow-x-visible">
                <table className="w-full min-w-[900px] table-fixed text-left border-collapse lg:min-w-0">
                    <colgroup>
                        <col className="w-[20%]" />
                        <col className="w-[22%]" />
                        <col className="w-[12%]" />
                        <col className="w-[12%]" />
                        <col className="w-[8%]" />
                        <col className="w-[13%]" />
                        <col className="w-[13%]" />
                    </colgroup>
                    <thead>
                        <tr className="border-b border-outline-variant/15 bg-surface-container/40">
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Người dùng</th>
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Liên hệ</th>
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Role</th>
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Ngày tạo</th>
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-right">Booking</th>
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
                            <th scope="col" className="py-3.5 px-4 xl:px-5 font-semibold text-xs text-on-surface-variant uppercase tracking-wider text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={`skel-${i}`} className="animate-pulse">
                                    <td className="py-4 px-4 xl:px-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-surface-container-high" /><div className="space-y-2"><div className="h-3.5 w-28 bg-surface-container-high rounded" /><div className="h-2.5 w-20 bg-surface-container rounded" /></div></div></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="space-y-2"><div className="h-3 w-36 bg-surface-container-high rounded" /><div className="h-2.5 w-24 bg-surface-container rounded" /></div></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="h-6 w-20 bg-surface-container-high rounded-lg" /></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="h-3 w-20 bg-surface-container-high rounded" /></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="ml-auto h-3 w-8 bg-surface-container-high rounded" /></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="h-6 w-20 bg-surface-container-high rounded-lg" /></td>
                                    <td className="py-4 px-4 xl:px-5"><div className="h-6 w-20 bg-surface-container-high rounded ml-auto" /></td>
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-20 text-center">
                                    <span className="material-symbols-outlined text-4xl text-outline mb-2 block" aria-hidden="true">person_search</span>
                                    <p className="font-bold text-on-surface">Không tìm thấy người dùng nào</p>
                                    <p className="text-on-surface-variant text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <StaffTableRow
                                    key={user.id}
                                    user={user}
                                    currentUserRole={currentUserRole}
                                    canEditRoles={canEditRoles}
                                    onOpenDetail={onOpenDetail}
                                    onChangeRole={onChangeRole}
                                    onToggleStatus={onToggleStatus}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="py-3 px-6 border-t border-outline-variant/10 bg-surface-container-lowest">
                <AdminPagination
                    currentPage={meta.currentPage}
                    totalPages={meta.totalPages}
                    totalItems={meta.totalItems}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                    itemLabel={itemLabel}
                />
            </div>
        </div>
    );
}

interface StaffToastProps {
    toast: ToastState | null;
}

export function StaffToast({ toast }: StaffToastProps) {
    return (
        <>
            <div aria-live="polite" aria-atomic="true" className="sr-only">{toast?.message}</div>
            {toast && (
                <div
                    role="status"
                    className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-fade-slide-up ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                    {toast.message}
                </div>
            )}
        </>
    );
}

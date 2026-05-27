'use client';

import type React from 'react';
import type { KpiFilter, LogStats } from '../_lib/types';

interface LogsPageHeaderProps {
    isExporting: boolean;
    onExport: () => void;
}

export function LogsPageHeader({ isExporting, onExport }: LogsPageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-outline-variant/20 pb-6">
            <div>
                <h1 className="font-headline text-3xl font-bold text-primary tracking-tight leading-none mb-2">Nhật Ký Hành Động</h1>
                <p className="font-body text-on-surface-variant text-sm">Theo dõi toàn bộ thao tác quản trị trên hệ thống</p>
            </div>
            <button
                onClick={onExport}
                disabled={isExporting}
                className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
                <span className="material-symbols-outlined text-[18px]">download</span>
                {isExporting ? 'Đang xuất…' : 'Xuất CSV'}
            </button>
        </div>
    );
}

interface LogsKpiGridProps {
    stats: LogStats | null;
    search: string;
    actionFilter: string;
    dateFrom: string;
    dateTo: string;
    activeShortcut: string;
    onApplyFilter: (filter: KpiFilter) => void;
}

export function LogsKpiGrid({
    stats,
    search,
    actionFilter,
    dateFrom,
    dateTo,
    activeShortcut,
    onApplyFilter,
}: LogsKpiGridProps) {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, filter: KpiFilter) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onApplyFilter(filter);
    };

    const isAllActive = !search && !actionFilter && !dateFrom && !dateTo;
    const cards = [
        {
            filter: 'all' as KpiFilter,
            label: 'Tổng cộng',
            value: stats?.total?.toLocaleString() || 0,
            icon: 'analytics',
            valueClassName: '',
            iconClassName: 'text-outline',
            active: isAllActive,
            baseClassName: 'bg-surface-container-lowest',
            activeClassName: 'border-primary/40 bg-primary/5 ring-2 ring-primary/10',
            inactiveClassName: 'border-outline-variant/20 hover:border-primary/30 hover:bg-primary/5',
            focusClassName: 'focus:ring-primary/25',
        },
        {
            filter: 'today' as KpiFilter,
            label: 'Hôm nay',
            value: `+${stats?.todayCount?.toLocaleString() || 0}`,
            icon: 'today',
            valueClassName: 'text-emerald-700',
            iconClassName: 'text-emerald-400',
            active: activeShortcut === 'today' && !actionFilter,
            baseClassName: 'bg-emerald-50',
            activeClassName: 'border-emerald-300 ring-2 ring-emerald-100',
            inactiveClassName: 'border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100/50',
            focusClassName: 'focus:ring-emerald-300/60',
        },
        {
            filter: 'CREATE' as KpiFilter,
            label: 'Tạo mới',
            value: stats?.create?.toLocaleString() || 0,
            icon: 'add_circle',
            valueClassName: '',
            iconClassName: 'text-emerald-500',
            active: actionFilter === 'CREATE',
            baseClassName: 'bg-surface-container-lowest',
            activeClassName: 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100',
            inactiveClassName: 'border-outline-variant/20 hover:border-emerald-300 hover:bg-emerald-50',
            focusClassName: 'focus:ring-emerald-300/50',
        },
        {
            filter: 'UPDATE' as KpiFilter,
            label: 'Cập nhật',
            value: stats?.update?.toLocaleString() || 0,
            icon: 'edit',
            valueClassName: '',
            iconClassName: 'text-blue-500',
            active: actionFilter === 'UPDATE',
            baseClassName: 'bg-surface-container-lowest',
            activeClassName: 'border-blue-300 bg-blue-50 ring-2 ring-blue-100',
            inactiveClassName: 'border-outline-variant/20 hover:border-blue-300 hover:bg-blue-50',
            focusClassName: 'focus:ring-blue-300/50',
        },
        {
            filter: 'DELETE' as KpiFilter,
            label: 'Xóa',
            value: stats?.delete?.toLocaleString() || 0,
            icon: 'delete',
            valueClassName: 'text-red-600',
            iconClassName: 'text-red-500',
            active: actionFilter === 'DELETE',
            baseClassName: 'bg-surface-container-lowest',
            activeClassName: 'border-red-300 bg-red-50 ring-2 ring-red-100',
            inactiveClassName: 'border-outline-variant/20 hover:border-red-300 hover:bg-red-50',
            focusClassName: 'focus:ring-red-300/50',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {cards.map(card => (
                <div
                    key={card.filter}
                    role="button"
                    tabIndex={0}
                    aria-pressed={card.active}
                    onClick={() => onApplyFilter(card.filter)}
                    onKeyDown={event => handleKeyDown(event, card.filter)}
                    className={`${card.baseClassName} border p-4 rounded-xl shadow-sm cursor-pointer text-left transition-all focus:outline-none focus:ring-2 ${card.focusClassName} ${card.active ? card.activeClassName : card.inactiveClassName}`}
                >
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${card.filter === 'today' ? 'text-emerald-600' : 'text-on-surface-variant'}`}>{card.label}</p>
                    <div className="flex items-end justify-between">
                        <span className={`text-2xl font-bold font-headline ${card.valueClassName}`}>{card.value}</span>
                        <span className={`material-symbols-outlined ${card.iconClassName}`}>{card.icon}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

interface LogsFilterBarProps {
    search: string;
    actionFilter: string;
    onSearchChange: (value: string) => void;
    onActionFilterChange: (value: string) => void;
}

export function LogsFilterBar({
    search,
    actionFilter,
    onSearchChange,
    onActionFilterChange,
}: LogsFilterBarProps) {
    return (
        <div className="bg-surface-container-lowest rounded-xl p-3 mb-3 flex flex-col md:flex-row gap-3 border border-outline-variant/20 shadow-sm" role="search" aria-label="Tìm kiếm và lọc nhật ký hệ thống">
            <div className="relative flex-1">
                <label htmlFor="audit-search" className="sr-only">Tìm nhật ký hệ thống</label>
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" aria-hidden="true">search</span>
                <input
                    id="audit-search"
                    name="audit-search"
                    type="text"
                    value={search}
                    onChange={event => onSearchChange(event.target.value)}
                    autoComplete="off"
                    className="w-full bg-surface border border-outline-variant/25 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-outline"
                    placeholder="Tìm mã log, người thực hiện, email, IP, đối tượng…"
                />
            </div>
            <div className="w-px bg-outline-variant/20 hidden md:block" />
            <div className="relative min-w-[190px]">
                <label htmlFor="audit-action-filter" className="sr-only">Lọc theo hành động</label>
                <select
                    id="audit-action-filter"
                    name="audit-action-filter"
                    aria-label="Lọc nhật ký theo hành động"
                    value={actionFilter}
                    onChange={event => onActionFilterChange(event.target.value)}
                    className="w-full bg-surface border border-outline-variant/25 rounded-lg pl-4 pr-10 py-2 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                >
                    <option value="">Tất cả hành động</option>
                    <option value="CREATE">Tạo mới (CREATE)</option>
                    <option value="UPDATE">Cập nhật (UPDATE)</option>
                    <option value="DELETE">Xóa (DELETE)</option>
                    <option value="LOGIN">Đăng nhập (LOGIN)</option>
                    <option value="LOGOUT">Đăng xuất (LOGOUT)</option>
                    <option value="ROLE_CHANGE">Đổi quyền (ROLE_CHANGE)</option>
                    <option value="CANCEL_BOOKING">Hủy đơn (CANCEL_BOOKING)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none" aria-hidden="true">expand_more</span>
            </div>
        </div>
    );
}

interface LogsDateFilterBarProps {
    activeShortcut: string;
    dateFrom: string;
    dateTo: string;
    onShortcut: (key: string) => void;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onClearDateFilter: () => void;
}

export function LogsDateFilterBar({
    activeShortcut,
    dateFrom,
    dateTo,
    onShortcut,
    onDateFromChange,
    onDateToChange,
    onClearDateFilter,
}: LogsDateFilterBarProps) {
    const today = new Date().toISOString().split('T')[0];
    const shortcuts = [
        { key: 'today', label: 'Hôm nay' },
        { key: '7d', label: '7 ngày' },
        { key: '30d', label: '30 ngày' },
        { key: 'month', label: 'Tháng này' },
    ];

    return (
        <div className="bg-surface-container-lowest rounded-xl px-3 py-2.5 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 border border-outline-variant/20 shadow-sm">
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="material-symbols-outlined text-outline text-[17px]">calendar_month</span>
                {shortcuts.map(shortcut => (
                    <button
                        key={shortcut.key}
                        onClick={() => onShortcut(shortcut.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                            activeShortcut === shortcut.key
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-surface text-on-surface-variant border-outline-variant/30 hover:border-primary/40 hover:text-primary'
                        }`}
                    >
                        {shortcut.label}
                    </button>
                ))}
            </div>

            <div className="w-px bg-outline-variant/20 hidden sm:block h-6" />

            <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-outline absolute -top-2 left-3 bg-surface-container-lowest px-1">Từ ngày</label>
                    <input
                        type="date"
                        value={dateFrom}
                        max={dateTo || today}
                        onChange={event => onDateFromChange(event.target.value)}
                        className="w-full bg-surface border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
                    />
                </div>
                <span className="text-outline text-sm font-medium flex-shrink-0">—</span>
                <div className="relative flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-outline absolute -top-2 left-3 bg-surface-container-lowest px-1">Đến ngày</label>
                    <input
                        type="date"
                        value={dateTo}
                        min={dateFrom}
                        max={today}
                        onChange={event => onDateToChange(event.target.value)}
                        className="w-full bg-surface border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
                    />
                </div>

                {(dateFrom || dateTo) && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-1 rounded-full border border-primary/20 whitespace-nowrap">
                            {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom ? `Từ ${dateFrom}` : `Đến ${dateTo}`}
                        </span>
                        <button
                            onClick={onClearDateFilter}
                            title="Xóa lọc thời gian"
                            aria-label="Xóa lọc thời gian"
                            className="w-6 h-6 rounded-full bg-outline-variant/20 hover:bg-error/10 hover:text-error text-outline flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

interface LinkedLogAlertProps {
    error: string | null;
}

export function LinkedLogAlert({ error }: LinkedLogAlertProps) {
    if (!error) return null;

    return (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800" role="alert">
            <span className="material-symbols-outlined mt-0.5 text-[18px]">warning</span>
            <span>{error}</span>
        </div>
    );
}

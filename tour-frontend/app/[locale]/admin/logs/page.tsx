'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';
import { useRouter } from 'next/navigation';

interface UserInfo {
    id: number;
    fullName: string;
    email: string;
    role: string;
    avatarUrl: string | null;
}

interface ActivityLog {
    id: number;
    action: string;
    resource: string;
    resourceId: string | null;
    targetName: string | null;
    description: string;
    oldData: any;
    newData: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: UserInfo | null;
}

interface LogStats {
    total: number;
    todayCount: number;
    create: number;
    update: number;
    delete: number;
    login: number;
}

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
    LOGIN: 'bg-slate-100 text-slate-600 border-slate-200',
    LOGOUT: 'bg-slate-100 text-slate-500 border-slate-200',
    ROLE_CHANGE: 'bg-amber-100 text-amber-700 border-amber-200',
    CANCEL_BOOKING: 'bg-orange-100 text-orange-700 border-orange-200',
    EXPORT: 'bg-violet-100 text-violet-700 border-violet-200',
};

const ACTION_LABELS: Record<string, string> = {
    CREATE: 'TẠO MỚI',
    UPDATE: 'CẬP NHẬT',
    DELETE: 'XÓA',
    LOGIN: 'ĐĂNG NHẬP',
    LOGOUT: 'ĐĂNG XUẤT',
    ROLE_CHANGE: 'ĐỔI QUYỀN',
    CANCEL_BOOKING: 'HỦY ĐƠN',
    EXPORT: 'XUẤT DỮ LIỆU',
};

export default function SystemLogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [stats, setStats] = useState<LogStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    
    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeShortcut, setActiveShortcut] = useState<string>('');
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    // ── Quick date shortcuts ────────────────────────────────────────────────
    const applyShortcut = (key: string) => {
        const now = new Date();
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        const today = fmt(now);

        if (key === activeShortcut) {
            // Toggle off
            setDateFrom(''); setDateTo(''); setActiveShortcut('');
            setPage(1); return;
        }

        setActiveShortcut(key);
        setPage(1);

        if (key === 'today') {
            setDateFrom(today); setDateTo(today);
        } else if (key === '7d') {
            const from = new Date(now); from.setDate(from.getDate() - 6);
            setDateFrom(fmt(from)); setDateTo(today);
        } else if (key === '30d') {
            const from = new Date(now); from.setDate(from.getDate() - 29);
            setDateFrom(fmt(from)); setDateTo(today);
        } else if (key === 'month') {
            const from = new Date(now.getFullYear(), now.getMonth(), 1);
            setDateFrom(fmt(from)); setDateTo(today);
        }
    };

    const clearDateFilter = () => {
        setDateFrom(''); setDateTo(''); setActiveShortcut(''); setPage(1);
    };

    const fetchLogs = async (currentPage: number, currentSearch: string, currentAction: string, from: string, to: string) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: '15',
            });
            if (currentSearch) queryParams.append('search', currentSearch);
            if (currentAction) queryParams.append('action', currentAction);
            if (from) queryParams.append('dateFrom', from);
            if (to)   queryParams.append('dateTo', to);

            const [logsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/logs?${queryParams.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/admin/logs/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (logsRes.ok) {
                const logsJson = await logsRes.json();
                // TransformInterceptor: { statusCode, message, data:[...], meta:{...}, timestamp }
                // data là array logs, meta là pagination - đều ở TOP LEVEL
                setLogs(Array.isArray(logsJson?.data) ? logsJson.data : []);
                setTotalPages(logsJson?.meta?.totalPages ?? 1);
                setTotalRecords(logsJson?.meta?.total ?? 0);
            }
            
            if (statsRes.ok) {
                const statsJson = await statsRes.json();
                // TransformInterceptor: { statusCode, message, data: statsObject, timestamp }
                setStats(statsJson?.data ?? null);
            }

        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce effect — re-fetch khi bất kỳ filter nào thay đổi
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs(page, search, actionFilter, dateFrom, dateTo);
        }, 400);
        return () => clearTimeout(timer);
    }, [page, search, actionFilter, dateFrom, dateTo]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); // Reset page on new search
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const queryParams = new URLSearchParams();
            if (search)       queryParams.append('search', search);
            if (actionFilter) queryParams.append('action', actionFilter);
            if (dateFrom)     queryParams.append('dateFrom', dateFrom);
            if (dateTo)       queryParams.append('dateTo', dateTo);

            const res = await fetch(`${API_BASE_URL}/admin/logs/export?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Export failed');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nhat-ky-he-thong-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Có lỗi xảy ra khi xuất dữ liệu!');
        } finally {
            setIsExporting(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return 'A';
        const parts = name.trim().split(' ');
        return parts.length >= 2 
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
    };

    return (
        <main className="flex-1 p-6 md:p-8 lg:p-10 w-full max-w-[1600px] mx-auto overflow-y-auto font-body bg-surface min-h-screen text-on-surface">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-outline-variant/20 pb-6">
                <div>
                    <h1 className="font-headline text-3xl font-bold text-primary tracking-tight leading-none mb-2">Nhật Ký Hành Động</h1>
                    <p className="font-body text-on-surface-variant text-sm">Theo dõi toàn bộ thao tác quản trị trên hệ thống</p>
                </div>
                <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {isExporting ? 'Đang xuất...' : 'Xuất CSV'}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-surface-container-lowest border border-outline-variant/20 p-4 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tổng cộng</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline">{stats?.total?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-outline">analytics</span>
                    </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Hôm nay</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline text-emerald-700">+{stats?.todayCount?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-emerald-400">today</span>
                    </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant/20 p-4 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tạo mới</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline">{stats?.create?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-emerald-500">add_circle</span>
                    </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant/20 p-4 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Cập nhật</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline">{stats?.update?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-blue-500">edit</span>
                    </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant/20 p-4 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Xóa</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline text-red-600">{stats?.delete?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-red-500">delete</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-surface-container-lowest rounded-xl p-3 mb-3 flex flex-col md:flex-row gap-3 border border-outline-variant/20 shadow-sm">
                {/* Search */}
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={handleSearchChange}
                        className="w-full bg-surface border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-outline"
                        placeholder="Tìm theo nội dung, tên đối tượng..."
                    />
                </div>
                <div className="w-px bg-outline-variant/20 hidden md:block" />
                {/* Action filter */}
                <div className="relative min-w-[190px]">
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        className="w-full bg-surface border-none rounded-lg pl-4 pr-10 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
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
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="bg-surface-container-lowest rounded-xl px-3 py-2.5 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 border border-outline-variant/20 shadow-sm">
                {/* Quick shortcuts */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="material-symbols-outlined text-outline text-[17px]">calendar_month</span>
                    {[
                        { key: 'today', label: 'Hôm nay' },
                        { key: '7d',   label: '7 ngày' },
                        { key: '30d',  label: '30 ngày' },
                        { key: 'month',label: 'Tháng này' },
                    ].map(s => (
                        <button
                            key={s.key}
                            onClick={() => applyShortcut(s.key)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                activeShortcut === s.key
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-surface text-on-surface-variant border-outline-variant/30 hover:border-primary/40 hover:text-primary'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="w-px bg-outline-variant/20 hidden sm:block h-6" />

                {/* Custom date range */}
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-outline absolute -top-2 left-3 bg-surface-container-lowest px-1">Từ ngày</label>
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo || new Date().toISOString().split('T')[0]}
                            onChange={e => { setDateFrom(e.target.value); setActiveShortcut(''); setPage(1); }}
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
                            max={new Date().toISOString().split('T')[0]}
                            onChange={e => { setDateTo(e.target.value); setActiveShortcut(''); setPage(1); }}
                            className="w-full bg-surface border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
                        />
                    </div>

                    {/* Active filter chip + clear */}
                    {(dateFrom || dateTo) && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-1 rounded-full border border-primary/20 whitespace-nowrap">
                                {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom ? `Từ ${dateFrom}` : `Đến ${dateTo}`}
                            </span>
                            <button
                                onClick={clearDateFilter}
                                title="Xóa lọc thời gian"
                                className="w-6 h-6 rounded-full bg-outline-variant/20 hover:bg-error/10 hover:text-error text-outline flex items-center justify-center transition-colors"
                            >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface-variant font-label text-[11px] uppercase tracking-wider">
                                <th className="py-3 px-4 w-10"></th>
                                <th className="py-3 px-4 font-semibold">Thời Gian</th>
                                <th className="py-3 px-4 font-semibold">Người Thực Hiện</th>
                                <th className="py-3 px-4 font-semibold">Hành Động</th>
                                <th className="py-3 px-4 font-semibold">Đối Tượng</th>
                                <th className="py-3 px-4 font-semibold hidden lg:table-cell">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-4"><div className="w-4 h-4 bg-outline-variant/20 rounded"></div></td>
                                        <td className="py-4 px-4"><div className="w-24 h-4 bg-outline-variant/20 rounded"></div></td>
                                        <td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-outline-variant/20"></div><div className="w-32 h-4 bg-outline-variant/20 rounded"></div></div></td>
                                        <td className="py-4 px-4"><div className="w-20 h-5 bg-outline-variant/20 rounded-full"></div></td>
                                        <td className="py-4 px-4"><div className="w-48 h-4 bg-outline-variant/20 rounded"></div></td>
                                        <td className="py-4 px-4 hidden lg:table-cell"><div className="w-24 h-4 bg-outline-variant/20 rounded"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-outline">
                                        <span className="material-symbols-outlined text-[48px] mb-3 opacity-50">search_off</span>
                                        <p className="text-sm font-medium">Không tìm thấy nhật ký nào phù hợp</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr 
                                            onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                                            className="hover:bg-surface-container-low/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="py-3 px-4 text-outline group-hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedRow === log.id ? 'rotate(90deg)' : 'rotate(0)' }}>
                                                    chevron_right
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-xs font-semibold text-on-surface whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString('vi-VN')}</div>
                                                <div className="text-[11px] text-outline mt-0.5 whitespace-nowrap">{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    {log.user ? (
                                                        log.user.avatarUrl ? (
                                                            <img src={log.user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-outline-variant/20" />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                                                {getInitials(log.user.fullName)}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                            <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-on-surface leading-tight">{log.user?.fullName || 'System Automated'}</span>
                                                        <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">{log.user?.role || 'SYSTEM'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${ACTION_COLORS[log.action] || ACTION_COLORS['LOGIN']}`}>
                                                    {ACTION_LABELS[log.action] || log.action}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-sm text-on-surface line-clamp-1 max-w-md" title={log.description}>
                                                    <span className="font-semibold text-primary mr-1">[{log.resource}]</span>
                                                    {log.targetName || `ID: ${log.resourceId}`}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 hidden lg:table-cell">
                                                <span className="text-xs font-mono text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{log.ipAddress || '—'}</span>
                                            </td>
                                        </tr>
                                        
                                        {/* Expanded Row Content */}
                                        {expandedRow === log.id && (
                                            <tr className="bg-surface-container-low/30 border-b border-outline-variant/20">
                                                <td colSpan={6} className="p-0">
                                                    <div className="px-14 py-5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                            <div>
                                                                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[16px]">info</span> Thông tin chi tiết
                                                                </h4>
                                                                <table className="w-full text-sm">
                                                                    <tbody className="divide-y divide-outline-variant/10">
                                                                        <tr><td className="py-2 text-outline w-32">Mô tả đầy đủ:</td><td className="py-2 font-medium">{log.description}</td></tr>
                                                                        <tr><td className="py-2 text-outline">Resource ID:</td><td className="py-2 font-mono">{log.resourceId || '—'}</td></tr>
                                                                        <tr><td className="py-2 text-outline">User Agent:</td><td className="py-2 text-xs text-on-surface-variant line-clamp-2">{log.userAgent || '—'}</td></tr>
                                                                        <tr><td className="py-2 text-outline">Email thực hiện:</td><td className="py-2">{log.user?.email || '—'}</td></tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            
                                                            <div>
                                                                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[16px]">data_object</span> Dữ liệu thay đổi
                                                                </h4>
                                                                <div className="bg-surface border border-outline-variant/20 rounded-lg overflow-hidden flex flex-col gap-px">
                                                                    {log.action !== 'CREATE' && log.oldData && (
                                                                        <div className="bg-[#fff1f2] p-3 overflow-x-auto">
                                                                            <span className="text-[10px] font-bold text-red-600 uppercase mb-1 block">Dữ liệu cũ (Old Data)</span>
                                                                            <pre className="text-[11px] font-mono text-red-900 m-0">{JSON.stringify(log.oldData, null, 2)}</pre>
                                                                        </div>
                                                                    )}
                                                                    {log.action !== 'DELETE' && log.newData && (
                                                                        <div className="bg-[#ecfdf5] p-3 overflow-x-auto">
                                                                            <span className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Dữ liệu mới (New Data)</span>
                                                                            <pre className="text-[11px] font-mono text-emerald-900 m-0">{JSON.stringify(log.newData, null, 2)}</pre>
                                                                        </div>
                                                                    )}
                                                                    {!log.oldData && !log.newData && (
                                                                        <div className="p-4 text-center text-sm text-outline italic">Không có payload data được ghi lại</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Footer */}
                <div className="bg-surface-container-lowest border-t border-outline-variant/20 px-4 py-3 flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">
                        Hiển thị <span className="font-semibold text-on-surface">{logs.length}</span> / <span className="font-semibold text-on-surface">{totalRecords}</span> bản ghi
                    </span>
                    <div className="flex items-center gap-1">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container text-on-surface disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <span className="px-3 font-semibold text-primary">Trang {page} / {totalPages || 1}</span>
                        <button 
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container text-on-surface disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
